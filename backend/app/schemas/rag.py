from pydantic import BaseModel
from typing import Literal


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class RagChatRequest(BaseModel):
    issue_id: int
    question: str
    conversation_history: list[ChatTurn] = []


class RetrievedDocument(BaseModel):
    issue_id: int
    document_type: str
    content: str
    similarity: float


class RagChatResponse(BaseModel):
    answer: str
    retrieved: list[RetrievedDocument]
    has_historical_context: bool


class RagSearchRequest(BaseModel):
    issue_id: int
    question: str


class RagSearchResponse(BaseModel):
    retrieved: list[RetrievedDocument]


class RagIndexResponse(BaseModel):
    indexed_issue_ids: list[int]
    documents_created_or_updated: int