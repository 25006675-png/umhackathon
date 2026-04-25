from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Any
import re

import chromadb

try:
    from rag.embedding_function import EMBEDDING_FUNCTION
except ModuleNotFoundError:
    sys.path.append(str(Path(__file__).resolve().parent))
    from embedding_function import EMBEDDING_FUNCTION


DB_PATH = str(Path(__file__).resolve().parent / "vector_db")
COLLECTION_NAME = "poultry_knowledge"
KNOWLEDGE_BASE_DIR = Path(__file__).resolve().parent / "knowledge_base"
TOKEN_RE = re.compile(r"[a-zA-Z0-9_]+")


def _get_collection():
    client = chromadb.PersistentClient(path=DB_PATH)
    return client.get_collection(
        name=COLLECTION_NAME,
        embedding_function=EMBEDDING_FUNCTION,
    )


def rag_status() -> dict[str, Any]:
    client = chromadb.PersistentClient(path=DB_PATH)
    try:
        collection = client.get_collection(name=COLLECTION_NAME)
        count = collection.count()
        return {
            "ready": count > 0,
            "collection": COLLECTION_NAME,
            "count": count,
            "db_path": DB_PATH,
        }
    except Exception:
        return {
            "ready": False,
            "collection": COLLECTION_NAME,
            "count": 0,
            "db_path": DB_PATH,
        }


def retrieve_knowledge_chunks(
    query: str,
    top_k: int = 3,
    source_hints: list[str] | None = None,
) -> list[dict[str, Any]]:
    """
    Return structured knowledge-base chunks with source metadata.
    Falls back to an empty list when the vector store is unavailable.
    """
    if not query.strip():
        return []

    vector_chunks: list[dict[str, Any]] = []
    # chromadb vector query skipped — lexical search covers retrieval on this environment

    return _hybrid_rerank(query, vector_chunks, top_k, source_hints=source_hints or [])


def format_retrieved_context(chunks: list[dict[str, Any]]) -> str:
    if not chunks:
        return ""

    lines = ["--- RELEVANT KNOWLEDGE BASE CONTEXT ---", ""]
    for index, chunk in enumerate(chunks, start=1):
        lines.append(
            f"[{index}] Source: {chunk['source']} | Section: {chunk['section']} | Page: {chunk.get('page') or 'n/a'}"
        )
        lines.append(str(chunk["text"]))
        lines.append("")
    return "\n".join(lines).strip()


def search_knowledge_base(symptom_query: str, top_k: int = 3) -> str:
    """
    Backward-compatible helper returning a formatted context block.
    """
    return format_retrieved_context(retrieve_knowledge_chunks(symptom_query, top_k=top_k))


def _to_int(value: Any) -> int | None:
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def _hybrid_rerank(
    query: str,
    vector_chunks: list[dict[str, Any]],
    top_k: int,
    source_hints: list[str],
) -> list[dict[str, Any]]:
    query_tokens = set(_tokenize(query))
    all_chunks = _load_all_chunks()
    scored: dict[tuple[str, str, int | None], dict[str, Any]] = {}

    for chunk in all_chunks:
        lexical_score = _lexical_score(query_tokens, chunk, source_hints)
        if lexical_score <= 0:
            continue
        key = (chunk["source"], chunk["section"], chunk.get("page"))
        scored[key] = {
            **chunk,
            "_score": lexical_score,
        }

    for chunk in vector_chunks:
        key = (chunk["source"], chunk["section"], chunk.get("page"))
        entry = scored.get(
            key,
            {
                **chunk,
                "_score": 0.0,
            },
        )
        entry["_score"] += 0.35 + float(chunk.get("relevance_score") or 0.0)
        entry["relevance_score"] = max(
            float(entry.get("relevance_score") or 0.0),
            float(chunk.get("relevance_score") or 0.0),
        )
        scored[key] = entry

    ranked = sorted(scored.values(), key=lambda item: item["_score"], reverse=True)
    return [
        {
            "text": item["text"],
            "source": item["source"],
            "section": item["section"],
            "page": item.get("page"),
            "relevance_score": item.get("relevance_score"),
        }
        for item in ranked[:top_k]
    ]


def _load_all_chunks() -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []
    for file_path in KNOWLEDGE_BASE_DIR.glob("*.json"):
        try:
            items = json.loads(file_path.read_text(encoding="utf-8"))
        except Exception:
            continue
        for item in items:
            metadata = item.get("metadata") or {}
            chunks.append(
                {
                    "text": str(item.get("cited_text") or item.get("text") or ""),
                    "source": str(metadata.get("source") or "Knowledge Base"),
                    "section": str(metadata.get("section") or "Unknown section"),
                    "page": _to_int(metadata.get("page_number")),
                    "relevance_score": None,
                }
            )
    return chunks


def _tokenize(text: str) -> list[str]:
    return TOKEN_RE.findall((text or "").lower())


def _lexical_score(query_tokens: set[str], chunk: dict[str, Any], source_hints: list[str]) -> float:
    haystack = " ".join(
        [
            str(chunk.get("text") or ""),
            str(chunk.get("source") or ""),
            str(chunk.get("section") or ""),
        ]
    ).lower()
    chunk_tokens = set(_tokenize(haystack))
    overlap = query_tokens & chunk_tokens
    if not overlap:
        return 0.0

    score = float(len(overlap))
    for phrase, boost in (
        ("newcastle", 3.0),
        ("respiratory", 2.5),
        ("bronchitis", 2.5),
        ("gumboro", 2.5),
        ("heat", 2.0),
        ("panting", 2.0),
        ("mortality", 1.5),
        ("feed", 1.0),
        ("temperature", 1.0),
    ):
        if phrase in haystack and phrase in query_tokens:
            score += boost

    if any(noisy in haystack for noisy in ("tel:", "fax", "email", "copyright", "references")):
        score -= 2.0

    source_name = str(chunk.get("source") or "").lower()
    for hint in source_hints:
        if hint.lower() in source_name:
            score += 3.0

    return score


if __name__ == "__main__":
    test_query = "Feed intake dropped 18%, mortality 3 birds, temperature 3C above baseline, ayam senyap sikit"
    print(search_knowledge_base(test_query, top_k=3))
