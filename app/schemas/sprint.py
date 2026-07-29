from pydantic import BaseModel


class SprintBase(BaseModel):
    name: str
