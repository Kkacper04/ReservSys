from fastapi import APIRouter, Depends, HTTPException
import api_schemas
from routers.users import get_current_user
import rag

router = APIRouter(prefix="/api/chat", tags=["Chat"])

@router.post("/", response_model=api_schemas.ChatResponse)
def chat_with_assistant(request: api_schemas.ChatRequest, current_user = Depends(get_current_user)):
    try:
        reply = rag.get_answer(request.message)
        return api_schemas.ChatResponse(reply=reply)
    except Exception as e:
        print(f"RAG Error: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Knowledge Base is currently unavailable. Ensure the LM Studio server is running."
        )
