from fastapi import APIRouter, Depends, HTTPException
import api_schemas
import rag
from routers.users import RateLimiter, get_current_user

router = APIRouter(prefix="/api/chat", tags=["Chat"])
chat_rate_limiter = RateLimiter(max_requests=20, window_seconds=60)


@router.post("/", response_model=api_schemas.ChatResponse, dependencies=[Depends(chat_rate_limiter)])
def chat_with_assistant(request: api_schemas.ChatRequest, current_user=Depends(get_current_user)):
    try:
        reply = rag.get_answer(request.message)
        return api_schemas.ChatResponse(reply=reply)
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Knowledge Base is currently unavailable. Ensure the LM Studio server is running.",
        )
