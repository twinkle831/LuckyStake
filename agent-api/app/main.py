"""
LuckyStake AI Agent API — FastAPI backend for conversational strategy and profit assessment.
Agent asks: lock time, gas tolerance, preference (sure_shot vs high_prize), amount.
Stores conversation per user; returns allocation for contract execution.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.agent import chat_turn, get_strategy_for_execution
from app.conversation import load_messages

# Optional: load env for AWS
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    # shutdown if needed
    pass


app = FastAPI(
    title="LuckyStake AI Agent API",
    description="Set-and-forget staking strategy: lock time, gas tolerance, pool preference, allocation",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    public_key: str
    message: str


class ChatResponse(BaseModel):
    reply: str


class HistoryResponse(BaseModel):
    messages: list[dict]


class StrategyResponse(BaseModel):
    allocation: list[dict] | None


@app.get("/health")
def health():
    return {"status": "ok", "service": "agent-api"}


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Send a message to the agent; returns reply and persists conversation."""
    if not (req.public_key and req.public_key.strip()):
        raise HTTPException(status_code=400, detail="public_key required")
    if not (req.message and req.message.strip()):
        raise HTTPException(status_code=400, detail="message required")
    try:
        reply = await chat_turn(req.public_key.strip(), req.message.strip())
        return ChatResponse(reply=reply)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/history", response_model=HistoryResponse)
def get_history(public_key: str = Query(..., description="Wallet public key")):
    """Get stored conversation for the user (previous info they fed)."""
    if not public_key or not public_key.strip():
        raise HTTPException(status_code=400, detail="public_key required")
    messages = load_messages(public_key.strip())
    return HistoryResponse(messages=messages)


@app.get("/strategy", response_model=StrategyResponse)
def get_strategy(public_key: str = Query(..., description="Wallet public key")):
    """Get last recommended allocation for contract execution (pool_type, amount per pool)."""
    if not public_key or not public_key.strip():
        raise HTTPException(status_code=400, detail="public_key required")
    allocation = get_strategy_for_execution(public_key.strip())
    return StrategyResponse(allocation=allocation)
