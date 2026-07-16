from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.copilot_service import answer_question

router = APIRouter(tags=["Copilot"])


class CopilotAskRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    case_id: str = Field(default="C-2041")


class CopilotAskResponse(BaseModel):
    case_id: str
    query: str
    intent: str
    answer: str
    sources: list[dict]


@router.post("/copilot/ask", response_model=CopilotAskResponse)
def copilot_ask(body: CopilotAskRequest):
    """Answer an investigation question using RAG over the evidence graph."""
    try:
        result = answer_question(body.query, case_id=body.case_id)
        return CopilotAskResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/copilot/ask")
def copilot_ask_get(query: str, case_id: str = "C-2041"):
    """GET alias for simple clients (e.g. fetch from Copilot UI)."""
    try:
        return answer_question(query, case_id=case_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
