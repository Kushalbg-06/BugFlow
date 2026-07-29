from fastapi import APIRouter


router = APIRouter()


@router.get("/")
def ai_summary() -> dict[str, str]:
    return {"message": "ai router"}
