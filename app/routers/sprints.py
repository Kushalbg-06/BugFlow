from fastapi import APIRouter


router = APIRouter()


@router.get("/")
def list_sprints() -> dict[str, list]:
    return {"items": []}
