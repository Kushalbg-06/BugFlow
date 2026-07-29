from fastapi import APIRouter


router = APIRouter()


@router.get("/")
def analytics_summary() -> dict[str, str]:
    return {"message": "analytics router"}
