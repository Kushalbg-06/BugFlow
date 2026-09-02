import enum
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class RagDocumentType(str, enum.Enum):
    ISSUE = "issue"
    REPORT = "report"
    RESOLUTION = "resolution"
    COMMENT = "comment"
    TEST_CASE = "test_case"


class RagDocument(Base):
    """One embedded chunk of historical BugFlow knowledge, tied to an issue.
    `source_id` disambiguates rows: for issue/report/resolution docs it equals
    issue_id; for comments/test_cases it's the comment/test_case row id, so a
    single issue can contribute many documents (one per comment, per test case)."""
    __tablename__ = "rag_documents"
    __table_args__ = (UniqueConstraint("issue_id", "document_type", "source_id", name="uq_rag_doc_key"),)

    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False, index=True)
    document_type = Column(Enum(RagDocumentType), nullable=False, index=True)
    source_id = Column(Integer, nullable=False)

    content = Column(Text, nullable=False)            # raw text that was embedded
    embedding = Column(Text, nullable=False)           # JSON-encoded list[float]
    doc_metadata = Column(Text, nullable=True)          # JSON-encoded dict (project_id, status, category, component)
    content_hash = Column(String(64), nullable=False, index=True)  # sha256(content) — skips re-embedding unchanged data

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    issue = relationship("Issue")