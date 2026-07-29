from pydantic import BaseModel


class CommentBase(BaseModel):
    content: str
