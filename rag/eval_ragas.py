#!/usr/bin/env python3
"""
RAGAS evaluation for the PlacementPilot RAG pipeline.

Metrics computed:
  - faithfulness      — does the answer stick to the retrieved context?
  - context_precision — is the retrieved context actually relevant to the question?

Scores are logged to the MongoDB 'ragevals' collection so they appear on
the TPC dashboard alongside other operational metrics.

Usage:
    python -m rag.eval_ragas

Required env vars:
    MONGODB_URI        — MongoDB connection string (same as server/.env)
    GROQ_API_KEY       — preferred; uses llama-3.1-8b-instant via Groq
    OPENAI_API_KEY     — fallback if no Groq key
"""
import os
import sys
import json
import datetime

from pymongo import MongoClient
from datasets import Dataset


# ── LLM backend configuration ─────────────────────────────────────────────────

def _configure_ragas_llm():
    """Wire RAGAS to Groq (preferred, free-tier) or fall back to OpenAI."""
    groq_key = os.getenv("GROQ_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    if groq_key:
        from langchain_groq import ChatGroq
        from ragas.llms import LangchainLLMWrapper

        llm = LangchainLLMWrapper(
            ChatGroq(model="llama-3.1-8b-instant", api_key=groq_key, temperature=0)
        )
        print("ℹ  RAGAS LLM: Groq / llama-3.1-8b-instant")
        return llm

    if openai_key:
        print("ℹ  RAGAS LLM: OpenAI (default)")
        return None  # ragas uses OpenAI automatically when OPENAI_API_KEY is set

    print("✗  No LLM key found. Set GROQ_API_KEY or OPENAI_API_KEY and retry.")
    sys.exit(1)


# ── Trace parsing ──────────────────────────────────────────────────────────────

def _extract_rag_context(steps: list) -> list[str]:
    """
    Find the queryVectorStore step in an agent trace and return its context chunks.
    The observation field is a JSON-encoded tool result: {"context": [...], ...}
    """
    for step in steps:
        if step.get("action") == "queryVectorStore":
            obs = step.get("observation", "")
            try:
                data = json.loads(obs) if isinstance(obs, str) else obs
                ctx = data.get("context", [])
                if isinstance(ctx, list) and ctx:
                    return [str(c) for c in ctx]
            except (json.JSONDecodeError, AttributeError):
                if obs:
                    return [obs]
    return []


# ── Main evaluation routine ────────────────────────────────────────────────────

def main():
    mongo_uri = os.getenv("MONGODB_URI") or os.getenv("MONGO_URI", "mongodb://localhost:27017/placementpilot")
    client = MongoClient(mongo_uri)

    # Derive db name from URI (last path segment, strip query string)
    db_name = mongo_uri.rstrip("/").split("/")[-1].split("?")[0] or "placementpilot"
    db = client[db_name]

    # Only evaluate traces that actually used RAG (have a queryVectorStore step)
    traces = list(
        db.agenttraces.find(
            {"agentType": "recon", "status": "completed"},
            {"steps": 1, "finalOutput": 1, "userId": 1},
        ).limit(100)
    )

    rag_traces = [
        t for t in traces
        if any(s.get("action") == "queryVectorStore" for s in t.get("steps", []))
    ]

    if not rag_traces:
        print("No RAG-augmented recon traces found. Upload a resume first, then re-run.")
        client.close()
        return

    print(f"Found {len(rag_traces)} RAG-augmented trace(s) for evaluation.")

    rows = []
    for t in rag_traces:
        contexts = _extract_rag_context(t.get("steps", []))
        if not contexts:
            continue
        final = t.get("finalOutput") or ""
        answer = json.dumps(final) if not isinstance(final, str) else final
        rows.append(
            {
                "question": "Analyze student resume: identify technical skills, critical gaps, and company match scores.",
                "answer": answer,
                "contexts": contexts,
                "ground_truth": answer,
            }
        )

    if not rows:
        print("All traces had empty RAG contexts after filtering.")
        client.close()
        return

    dataset = Dataset.from_list(rows)

    from ragas.metrics import faithfulness, context_precision
    from ragas import evaluate

    llm_wrapper = _configure_ragas_llm()
    if llm_wrapper:
        faithfulness.llm = llm_wrapper
        context_precision.llm = llm_wrapper

    print(f"Running RAGAS on {len(rows)} sample(s)…")
    results = evaluate(dataset, metrics=[faithfulness, context_precision])

    faith_score = float(results.get("faithfulness", 0.0))
    ctx_prec = float(results.get("context_precision", 0.0))

    score_doc = {
        "timestamp": datetime.datetime.utcnow(),
        "faithfulness": faith_score,
        "context_precision": ctx_prec,
        "sample_count": len(rows),
        "embed_model": "all-MiniLM-L6-v2",
    }
    db.ragevals.insert_one(score_doc)

    print()
    print("=" * 50)
    print("RAGAS Evaluation Results")
    print("=" * 50)
    print(f"  Faithfulness:       {faith_score:.4f}")
    print(f"  Context Precision:  {ctx_prec:.4f}")
    print(f"  Samples evaluated:  {len(rows)}")
    print("  Scores saved to MongoDB → 'ragevals' collection")
    print("=" * 50)

    client.close()


if __name__ == "__main__":
    main()
