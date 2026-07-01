# PlacementPilot

> Autonomous agentic career coach that flags at-risk students to placement officers.

## Problem

Universities place thousands of students with a handful of placement officers. Officers can't manually review every resume or refresh dashboards all day, so at-risk students surface too late to fix gaps before recruiters arrive — and a missed placement is real lost income for that student.

## What it does

- Reads a student's resume and produces a grounded gap report (strong areas, weak areas, critical gaps, per-company match scores).
- Turns that report into a personalized 4-week prep plan with daily tasks, persisted automatically.
- Watches for at-risk students on a schedule and pushes live alerts to the placement cell with no officer action.
- Runs strict mock interviews that drill the exact weak areas the analysis found.

## How it works

`resume upload → chunk + embed to per-user FAISS → ReAct agent retrieves context → reasons with LLM → streams each step over WebSocket → persists gap report + auto-chains prep plan`

Key choice: a **hand-written ReAct loop** (no LangChain) so malformed-JSON parsing, tool-envelope unwrapping, and a forced-answer-on-timeout fallback are all under direct control. Retrieval is **RAG-first** — analysis is grounded in the resume's actual chunks before the LLM reasons, not LLM guesswork. A separate cron-driven Sentinel agent runs the same loop with no user in the loop.

## Stack

- Node.js (ESM), Express 5 — API + WebSocket server
- Python, FastAPI — RAG microservice
- LLM: Groq `llama-3.1-8b-instant` (prod) / local Ollama `qwen2.5:3b` (dev), auto-routed on `GROQ_API_KEY`
- FAISS (`IndexFlatIP`) + sentence-transformers `all-MiniLM-L6-v2` (384-dim) — per-user flat indices on local disk, no external vector DB
- BullMQ + Redis (queue), Redis Pub/Sub + Socket.io (live stream)
- MongoDB / Mongoose
- React + Vite + Tailwind frontend
- RAGAS (faithfulness, context_precision) for RAG evaluation

## Results

These are verifiable from the code; performance and accuracy have **not** been formally benchmarked yet — the harnesses to do so are included (see Notes).

- 4 specialized agents (Recon, Strategy, Sentinel, Arena) on one ReAct engine, across 8 tool modules.
- ReAct loop bounded to **8 iterations/job** with a guaranteed final answer; tool calls never throw (registry returns a `{success}` envelope), so a bad LLM step degrades instead of crashing.
- Retrieval: **200-word chunks / 40-word overlap**, **top-k = 3** over L2-normalized 384-dim embeddings (inner-product = cosine).
- Recon → Strategy auto-chains; risk score is recomputed deterministically (`criticalGaps×20 + weakAreas×10`, capped at 100) and Sentinel scans for `riskScore > 60` every **30 min**.
- Ships seed data for **10 students + 10 companies** so the full pipeline is demoable in one command.

> RAGAS scores are not published: they require real recon traces in MongoDB plus a judge-LLM key. Run `python -m rag.eval_ragas` to generate your own — no invented numbers here.

## Run it

Requires Redis, MongoDB, Node 18+, Python 3.10+, and either a `GROQ_API_KEY` or Ollama with `qwen2.5:3b` pulled.

```bash
git clone <your-repo-url> && cd Placement-Hack-main

# Env: copy and fill MONGODB_URI, REDIS_URL, JWT_SECRET, and GROQ_API_KEY
#      (omit GROQ_API_KEY to fall back to local Ollama)
cp server/.env.example server/.env

# Terminal 1 — Python RAG service (run from repo root)
cd rag && pip install -r requirements.txt && cd ..
uvicorn rag.main:app --host 0.0.0.0 --port 8001 --reload

# Terminal 2 — API + WebSocket server (port 5000)
cd server && npm install && npm run seed && npm run dev

# Terminal 3 — AI background worker
cd server && npm run worker

# Terminal 4 — Frontend (http://localhost:5173)
cd client && npm install && npm run dev
```

## Notes

Worker runs at `concurrency: 1` and Sentinel scans every 30 min — both deliberate, to stay inside Groq's free-tier token-per-minute limits rather than for throughput. To benchmark: `server/src/stress-test.js` floods 5 concurrent resume jobs and logs dispatch latency; `python -m rag.eval_ragas` produces RAG quality scores once traces exist. RAG calls degrade gracefully to `[]` when the Python service is cold, so the API never blocks on it.
