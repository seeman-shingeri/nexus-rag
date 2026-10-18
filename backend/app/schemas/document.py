from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.document import DocumentStatus

class DocumentChunkResponse(BaseModel):
    id: int
    chunk_index: int
    content: str
    token_count: int
    page_number: Optional[int] = None

    model_config = {"from_attributes": True}

class DocumentResponse(BaseModel):
    id: int
    title: str
    filename: str
    file_type: str
    file_size_bytes: int
    chunk_count: int
    status: DocumentStatus
    category: str
    uploaded_by: str
    created_at: datetime

    model_config = {"from_attributes": True}

class DocumentDetailResponse(DocumentResponse):
    chunks: List[DocumentChunkResponse] = []

class CitationItem(BaseModel):
    source: str
    filename: str
    page: Optional[int] = None
    chunk_index: int
    relevance_score: float
    excerpt: str

class RAGQueryRequest(BaseModel):
    question: str
    zone_filter: Optional[str] = None

class RAGQueryResponse(BaseModel):
    question: str
    answer: str
    citations: List[CitationItem]
    confidence: float
    evidence_found: bool
    insufficient_evidence: bool
    security_flag: bool = False
