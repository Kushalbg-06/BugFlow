from fastapi import APIRouter


router = APIRouter()


@router.get("/")
def list_comments() -> dict[str, list]:
    return {"items": []}
