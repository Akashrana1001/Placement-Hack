"""
Cosine-similarity retrieval over per-user FAISS indices.
Returns empty list when no index exists (first-time users, RAG service cold).
"""
import numpy as np

from .embedder import _get_model, load_index


def retrieve(user_id: str, query: str, doc_type: str = "resume", top_k: int = 3) -> list[str]:
    """
    Embed query and return the top-k most relevant chunks for this user.
    Safe to call before any index has been built — returns [] in that case.
    """
    import faiss

    try:
        index, chunks = load_index(user_id, doc_type)
    except FileNotFoundError:
        return []

    if index.ntotal == 0:
        return []

    model = _get_model()
    q_vec = model.encode([query], convert_to_numpy=True, show_progress_bar=False).astype("float32")
    faiss.normalize_L2(q_vec)

    k = min(top_k, index.ntotal)
    _, indices = index.search(q_vec, k)

    return [chunks[i] for i in indices[0] if 0 <= i < len(chunks)]
