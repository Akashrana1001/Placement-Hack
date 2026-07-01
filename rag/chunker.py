"""
Text chunking for resume and placement report embedding.
Sliding word-count window with overlap to preserve cross-sentence context.
"""


def chunk_text(text: str, chunk_size: int = 200, overlap: int = 40) -> list[str]:
    """
    Split text into overlapping word-count chunks.
    200 words ≈ 1 400 chars — fits comfortably within embedding model limits.
    40-word overlap keeps skill phrases that straddle chunk boundaries intact.
    """
    words = text.split()
    if not words:
        return []

    chunks: list[str] = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i : i + chunk_size]).strip()
        if chunk:
            chunks.append(chunk)
        i += chunk_size - overlap

    return chunks
