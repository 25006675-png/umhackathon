from __future__ import annotations

import json
from pathlib import Path
import sys

import chromadb

try:
    from rag.embedding_function import EMBEDDING_FUNCTION
except ModuleNotFoundError:
    sys.path.append(str(Path(__file__).resolve().parent))
    from embedding_function import EMBEDDING_FUNCTION


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "vector_db"
KNOWLEDGE_BASE_DIR = BASE_DIR / "knowledge_base"
COLLECTION_NAME = "poultry_knowledge"


def create_embeddings(reset: bool = True) -> int:
    print("Starting the embedding process...")

    client = chromadb.PersistentClient(path=str(DB_PATH))
    if reset:
        try:
            client.delete_collection(name=COLLECTION_NAME)
            print(f"Deleted existing collection '{COLLECTION_NAME}'.")
        except Exception:
            pass

    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=EMBEDDING_FUNCTION,
    )
    total_chunks = 0

    for file_path in sorted(KNOWLEDGE_BASE_DIR.glob("*.json")):
        print(f"Embedding {file_path.name}...")

        with file_path.open("r", encoding="utf-8") as handle:
            chunks = json.load(handle)

        texts: list[str] = []
        metadatas: list[dict] = []
        ids: list[str] = []

        for index, chunk in enumerate(chunks):
            text = chunk.get("cited_text") or chunk.get("text")
            metadata = chunk.get("metadata") or {}
            if not text:
                continue
            texts.append(text)
            metadatas.append(metadata)
            ids.append(f"{file_path.stem}_chunk_{index}")

        if texts:
            collection.add(
                documents=texts,
                metadatas=metadatas,
                ids=ids,
            )
            total_chunks += len(texts)

    print(f"Indexed {total_chunks} chunks into '{COLLECTION_NAME}' at '{DB_PATH}'.")
    return total_chunks


if __name__ == "__main__":
    create_embeddings()
