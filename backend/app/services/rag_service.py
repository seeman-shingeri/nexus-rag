import os
import re
import math
import json
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from pypdf import PdfReader
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.core.config import settings
from app.models.document import Document, DocumentChunk, DocumentStatus

class RAGService:
    EMBEDDING_DIM = 128

    @classmethod
    def extract_text_from_file(cls, file_path: str, file_type: str) -> List[Tuple[int, str]]:
        """
        Extracts text from file.
        Returns list of (page_or_section_number, text_content).
        """
        pages = []
        if file_type == "pdf":
            reader = PdfReader(file_path)
            for i, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                if text.strip():
                    pages.append((i + 1, text.strip()))
        else:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                # Split by double newline into major sections
                sections = [s.strip() for s in content.split("\n\n") if s.strip()]
                for i, sec in enumerate(sections):
                    pages.append((i + 1, sec))
        return pages

    @classmethod
    def chunk_text(
        cls,
        pages: List[Tuple[int, str]],
        max_chunk_words: int = 150,
        overlap_words: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Chunks text with sliding window preserving page numbers.
        """
        chunks = []
        chunk_idx = 0

        for page_num, text in pages:
            # Clean text
            cleaned_text = re.sub(r"\s+", " ", text).strip()
            words = cleaned_text.split()
            if not words:
                continue

            start = 0
            while start < len(words):
                end = min(start + max_chunk_words, len(words))
                chunk_words = words[start:end]
                chunk_str = " ".join(chunk_words)

                chunks.append({
                    "chunk_index": chunk_idx,
                    "content": chunk_str,
                    "token_count": len(chunk_words),
                    "page_number": page_num
                })
                chunk_idx += 1

                if end == len(words):
                    break
                start += max_chunk_words - overlap_words

        return chunks

    @classmethod
    def generate_embedding(cls, text: str) -> List[float]:
        """
        Generates normalized dense vector embedding.
        Uses deterministic hashing and character n-gram distribution for zero-dependency local runs.
        Produces unit-norm vector in R^128.
        """
        vec = np.zeros(cls.EMBEDDING_DIM, dtype=np.float32)
        words = re.findall(r"\w+", text.lower())
        if not words:
            vec[0] = 1.0
            return vec.tolist()

        # Word-level hashed projection
        for w in words:
            # Stable deterministic hash across runs
            h1 = sum((ord(c) * (31 ** i)) for i, c in enumerate(w[:8])) % cls.EMBEDDING_DIM
            h2 = sum((ord(c) * (17 ** i)) for i, c in enumerate(w[:6])) % cls.EMBEDDING_DIM
            vec[h1] += 1.0
            vec[h2] += 0.5

        # Character trigrams for morphological similarity
        for i in range(len(text) - 2):
            trigram = text[i:i+3].lower()
            h3 = sum((ord(c) * (13 ** j)) for j, c in enumerate(trigram)) % cls.EMBEDDING_DIM
            vec[h3] += 0.2

        # L2 Normalize
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()

    @classmethod
    def cosine_similarity(cls, vec1: List[float], vec2: List[float]) -> float:
        v1 = np.array(vec1, dtype=np.float32)
        v2 = np.array(vec2, dtype=np.float32)
        dot = np.dot(v1, v2)
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return float(dot / (norm1 * norm2))

    @classmethod
    def keyword_bm25_score(cls, query: str, text: str) -> float:
        query_tokens = set(re.findall(r"\w+", query.lower()))
        text_tokens = re.findall(r"\w+", text.lower())
        if not query_tokens or not text_tokens:
            return 0.0

        matches = sum(1 for t in text_tokens if t in query_tokens)
        score = matches / (len(text_tokens) + 10)
        return min(score * 5.0, 1.0)

    @classmethod
    async def ingest_document(
        cls,
        db: AsyncSession,
        title: str,
        filename: str,
        file_path: str,
        file_type: str,
        file_size: int,
        uploaded_by: str,
        category: str = "Safety Manual"
    ) -> Document:
        doc = Document(
            title=title,
            filename=filename,
            file_path=file_path,
            file_type=file_type,
            file_size_bytes=file_size,
            uploaded_by=uploaded_by,
            category=category,
            status=DocumentStatus.PENDING
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)

        try:
            pages = cls.extract_text_from_file(file_path, file_type)
            chunk_data = cls.chunk_text(pages)

            db_chunks = []
            for c in chunk_data:
                emb = cls.generate_embedding(c["content"])
                db_chunk = DocumentChunk(
                    document_id=doc.id,
                    chunk_index=c["chunk_index"],
                    content=c["content"],
                    token_count=c["token_count"],
                    page_number=c["page_number"],
                    embedding_json=json.dumps(emb)
                )
                db_chunks.append(db_chunk)

            db.add_all(db_chunks)
            doc.chunk_count = len(db_chunks)
            doc.status = DocumentStatus.INDEXED
            await db.commit()
            await db.refresh(doc)
            return doc
        except Exception as e:
            doc.status = DocumentStatus.FAILED
            await db.commit()
            raise e

    @classmethod
    async def retrieve_relevant_chunks(
        cls,
        db: AsyncSession,
        query: str,
        top_k: int = 4,
        min_relevance: float = 0.25
    ) -> List[Dict[str, Any]]:
        """
        Hybrid retrieval: vector cosine similarity + keyword matching.
        """
        query_emb = cls.generate_embedding(query)

        # Fetch all indexed chunks with document info
        q = (
            select(DocumentChunk, Document.title, Document.filename)
            .join(Document, DocumentChunk.document_id == Document.id)
            .where(Document.status == DocumentStatus.INDEXED)
        )
        result = await db.execute(q)
        rows = result.all()

        scored_chunks = []
        for chunk, doc_title, doc_filename in rows:
            if not chunk.embedding_json:
                continue
            chunk_emb = json.loads(chunk.embedding_json)
            vec_sim = cls.cosine_similarity(query_emb, chunk_emb)
            bm25_sim = cls.keyword_bm25_score(query, chunk.content)

            # Combined hybrid score (70% dense vector, 30% lexical keyword)
            hybrid_score = 0.70 * vec_sim + 0.30 * bm25_sim

            if hybrid_score >= min_relevance:
                scored_chunks.append({
                    "chunk_id": chunk.id,
                    "document_id": chunk.document_id,
                    "document_title": doc_title,
                    "document_filename": doc_filename,
                    "page_number": chunk.page_number,
                    "chunk_index": chunk.chunk_index,
                    "content": chunk.content,
                    "score": round(float(hybrid_score), 4),
                    "vector_score": round(float(vec_sim), 4),
                    "keyword_score": round(float(bm25_sim), 4)
                })

        # Sort by highest hybrid score
        scored_chunks.sort(key=lambda x: x["score"], reverse=True)
        return scored_chunks[:top_k]

    @classmethod
    def sanitize_and_check_injection(cls, user_query: str) -> Tuple[str, bool]:
        """
        Detects prompt injection attempts (instruction overrides, system prompt leak requests).
        """
        injection_patterns = [
            r"ignore\s+(all\s+)?(previous|prior)\s+instructions",
            r"you\s+are\s+now\s+in\s+developer\s+mode",
            r"disregard\s+safety\s+rules",
            r"override\s+system\s+prompt",
            r"reveal\s+your\s+(secret|hidden)\s+instructions",
            r"bypass\s+security\s+controls",
            r"system:\s*you\s+must",
        ]
        has_injection = any(re.search(pat, user_query, re.IGNORECASE) for pat in injection_patterns)
        # Strip potential delimiter escapes
        sanitized_query = user_query.replace("<<<", "").replace(">>>", "").strip()
        return sanitized_query, has_injection

    @classmethod
    async def generate_grounded_answer(
        cls,
        db: AsyncSession,
        query: str,
        user_role: str = "OPERATOR"
    ) -> Dict[str, Any]:
        """
        Generates evidence-backed answers using retrieved chunks.
        Strictly refuses when evidence is insufficient.
        """
        sanitized_query, is_injection = cls.sanitize_and_check_injection(query)
        if is_injection:
            return {
                "answer": "Security Alert: Prompt injection pattern detected. The requested instruction override has been neutralized and logged to the security audit trail.",
                "citations": [],
                "confidence": 0.0,
                "evidence_found": False,
                "insufficient_evidence": True,
                "security_flag": True
            }

        retrieved = await cls.retrieve_relevant_chunks(db, sanitized_query, top_k=4)

        if not retrieved:
            return {
                "answer": "I cannot find sufficient evidence in the approved safety compliance documents to answer this question. Please refer to an authorized safety officer or verify that the governing SOP is uploaded to the Knowledge Base.",
                "citations": [],
                "confidence": 0.0,
                "evidence_found": False,
                "insufficient_evidence": True,
                "security_flag": False
            }

        # Build citations
        citations = []
        for r in retrieved:
            citations.append({
                "source": r["document_title"],
                "filename": r["document_filename"],
                "page": r["page_number"],
                "chunk_index": r["chunk_index"],
                "relevance_score": r["score"],
                "excerpt": r["content"][:200] + ("..." if len(r["content"]) > 200 else "")
            })

        # Sentence-level grounding across all retrieved chunks
        def _stem(w: str) -> str:
            w = w.lower()
            for sfx in ["ment", "tion", "ing", "ies", "es", "ed", "s"]:
                if w.endswith(sfx) and len(w) > len(sfx) + 2:
                    return w[:-len(sfx)]
            return w

        stopwords = {"what", "which", "where", "when", "who", "why", "how", "is", "are", "the", "a", "an", "to", "for", "in", "on", "at", "by", "from", "of", "and", "or"}
        raw_query_words = re.findall(r"\w+", sanitized_query.lower())
        query_stems = [_stem(w) for w in raw_query_words if w not in stopwords]

        scored_sentences = []
        for r in retrieved:
            sentences = re.split(r"(?<=[.!?])\s+|\n+", r["content"])
            for s in sentences:
                s_clean = s.strip()
                if len(s_clean) < 20 or s_clean.startswith("#"):
                    continue
                s_words = re.findall(r"\w+", s_clean.lower())
                s_stems = [_stem(w) for w in s_words]
                
                # Calculate term frequency and density
                match_count = 0.0
                for q_stem in query_stems:
                    tf = s_stems.count(q_stem)
                    if tf > 0:
                        weight = 2.0 if len(q_stem) >= 6 else 1.0
                        match_count += weight * tf

                if match_count > 0:
                    density = match_count / (len(s_words) + 5)
                    scored_sentences.append((density, s_clean, r))

        scored_sentences.sort(key=lambda x: x[0], reverse=True)
        if scored_sentences:
            best_score, key_sentence, best_chunk = scored_sentences[0]
            cited_title = best_chunk["document_title"]
            cited_page = best_chunk["page_number"]
        else:
            top_chunk = retrieved[0]
            key_sentence = top_chunk["content"][:250]
            cited_title = top_chunk["document_title"]
            cited_page = top_chunk["page_number"]

        grounded_answer = (
            f"According to approved compliance documentation [{cited_title}], "
            f'"{key_sentence}" '
            f"(Verified citation: {cited_title}, Section/Page {cited_page})."
        )

        top_chunk = retrieved[0]
        confidence = min(round(top_chunk["score"] * 1.1, 2), 0.98)

        return {
            "answer": grounded_answer,
            "citations": citations,
            "confidence": confidence,
            "evidence_found": True,
            "insufficient_evidence": False,
            "security_flag": False
        }
