import os
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.config import settings
from app.models.user import User, UserRole
from app.models.document import Document, DocumentChunk
from app.schemas.document import (
    DocumentResponse,
    DocumentDetailResponse,
    RAGQueryRequest,
    RAGQueryResponse
)
from app.services.rag_service import RAGService
from app.api.deps import get_current_user, require_roles, log_audit_event

router = APIRouter(prefix="/documents", tags=["Knowledge Base & RAG"])

ALLOWED_EXTENSIONS = {"pdf", "txt", "md"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB limit

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    category: str = Form("Safety Manual"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.SAFETY_OFFICER]))
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename")

    extension = file.filename.split(".")[-1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{extension}'. Supported formats: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Sanitize filename
    clean_filename = os.path.basename(file.filename).replace(" ", "_")
    target_path = os.path.join(settings.DOCUMENTS_DIR, clean_filename)

    # Save to disk with size verification
    file_size = 0
    with open(target_path, "wb") as buffer:
        while chunk := await file.read(1024 * 64):
            file_size += len(chunk)
            if file_size > MAX_FILE_SIZE:
                buffer.close()
                if os.path.exists(target_path):
                    os.remove(target_path)
                raise HTTPException(status_code=413, detail="File exceeds maximum allowed size of 10MB")
            buffer.write(chunk)

    doc_title = title.strip() if title and title.strip() else file.filename

    doc = await RAGService.ingest_document(
        db=db,
        title=doc_title,
        filename=clean_filename,
        file_path=target_path,
        file_type=extension,
        file_size=file_size,
        uploaded_by=current_user.username,
        category=category
    )

    await log_audit_event(
        db=db,
        user_id=current_user.username,
        action="UPLOAD_DOCUMENT",
        resource_type="DOCUMENT",
        resource_id=str(doc.id),
        details=f"Uploaded and indexed '{doc.title}' ({doc.chunk_count} chunks, {file_size} bytes)"
    )

    return doc

@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Document).order_by(Document.created_at.desc()))
    return result.scalars().all()

@router.get("/{document_id}", response_model=DocumentDetailResponse)
async def get_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = (
        select(Document)
        .options(selectinload(Document.chunks))
        .where(Document.id == document_id)
    )
    result = await db.execute(query)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.SAFETY_OFFICER]))
):
    query = select(Document).where(Document.id == document_id)
    result = await db.execute(query)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove physical file if exists
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except OSError:
            pass

    # Cascade delete chunks and document
    await db.delete(doc)
    await db.commit()

    await log_audit_event(
        db=db,
        user_id=current_user.username,
        action="DELETE_DOCUMENT",
        resource_type="DOCUMENT",
        resource_id=str(document_id),
        details=f"Permanently purged document '{doc.title}' and associated vector indexes."
    )
    return None

@router.post("/query", response_model=RAGQueryResponse)
async def query_knowledge_base(
    rag_request: RAGQueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not rag_request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    result = await RAGService.generate_grounded_answer(
        db=db,
        query=rag_request.question,
        user_role=current_user.role.value
    )

    return RAGQueryResponse(
        question=rag_request.question,
        answer=result["answer"],
        citations=result["citations"],
        confidence=result["confidence"],
        evidence_found=result["evidence_found"],
        insufficient_evidence=result["insufficient_evidence"],
        security_flag=result["security_flag"]
    )
