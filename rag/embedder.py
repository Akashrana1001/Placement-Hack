"""
FAISS index management for PlacementPilot RAG.
Each (user_id, doc_type) pair gets its own flat inner-product index.
Vectors are L2-normalised before indexing, so IP = cosine similarity.
"""
import os
import json

import numpy as np

INDEX_DIR = os.path.join(os.path.dirname(__file__), "indices")

_model = None


def _get_model():
    """Lazy-load sentence-transformer so the import cost is paid once."""
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer

        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def _base_path(user_id: str, doc_type: str) -> str:
    return os.path.join(INDEX_DIR, f"{user_id}_{doc_type}")


def embed_and_store(user_id: str, chunks: list[str], doc_type: str = "resume") -> dict:
    """
    Embed chunks and persist to a per-user FAISS flat-IP index.
    Overwrites any previous index for this user + doc_type combination.
    """
    import faiss

    os.makedirs(INDEX_DIR, exist_ok=True)
    model = _get_model()

    vectors = model.encode(chunks, convert_to_numpy=True, show_progress_bar=False).astype("float32")
    faiss.normalize_L2(vectors)

    dim = vectors.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(vectors)

    base = _base_path(user_id, doc_type)
    faiss.write_index(index, f"{base}.faiss")
    with open(f"{base}.meta.json", "w", encoding="utf-8") as f:
        json.dump({"chunks": chunks, "user_id": user_id, "doc_type": doc_type}, f, ensure_ascii=False)

    return {"indexed": len(chunks), "dim": int(dim)}


def load_index(user_id: str, doc_type: str):
    """
    Load the FAISS index and chunk list for a user.
    Raises FileNotFoundError when no index has been built yet.
    """
    import faiss

    base = _base_path(user_id, doc_type)
    index = faiss.read_index(f"{base}.faiss")
    with open(f"{base}.meta.json", "r", encoding="utf-8") as f:
        meta = json.load(f)
    return index, meta["chunks"]
