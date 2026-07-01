"""
FastAPI RAG microservice for PlacementPilot.

Start alongside the Node.js server:
    uvicorn rag.main:app --host 0.0.0.0 --port 8001 --reload

The Node.js rag.service.js calls /embed on resume upload and /query
inside the recon agent's queryVectorStore tool.
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .chunker import chunk_text
from .embedder import embed_and_store
from .retriever import retrieve

app = FastAPI(title="PlacementPilot RAG Service", version="1.0.0")


class EmbedRequest(BaseModel):
    user_id: str
    text: str
    doc_type: str = "resume"


class QueryRequest(BaseModel):
    user_id: str
    query: str
    doc_type: str = "resume"
    top_k: int = 3


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/embed")
def embed(req: EmbedRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="text must not be empty")
    chunks = chunk_text(req.text)
    result = embed_and_store(req.user_id, chunks, req.doc_type)
    return {"success": True, "chunks_indexed": result["indexed"], "dim": result["dim"]}


@app.post("/query")
def query(req: QueryRequest):
    chunks = retrieve(req.user_id, req.query, req.doc_type, req.top_k)
    return {"success": True, "context": chunks, "count": len(chunks)}
