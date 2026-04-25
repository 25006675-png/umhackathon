from __future__ import annotations

import hashlib
import math
import re
from typing import Sequence


TOKEN_RE = re.compile(r"[a-zA-Z0-9_]+")
VECTOR_DIM = 256


class LocalHashEmbeddingFunction:
    """
    Lightweight deterministic embedding for offline/local hackathon use.
    It is not semantically strong like a transformer model, but it is enough
    to make the local Chroma collection queryable without network/model downloads.
    """

    def __call__(self, input: Sequence[str]) -> list[list[float]]:
        return [self._embed_text(text) for text in input]

    @staticmethod
    def name() -> str:
        return "local-hash-embedding"

    def embed_documents(self, input: Sequence[str]) -> list[list[float]]:
        return self.__call__(input)

    def embed_query(self, input: Sequence[str] | str) -> list[list[float]] | list[float]:
        if isinstance(input, str):
            return self._embed_text(input)
        return self.__call__(input)

    def _embed_text(self, text: str) -> list[float]:
        vector = [0.0] * VECTOR_DIM
        tokens = TOKEN_RE.findall((text or "").lower())
        if not tokens:
            return vector

        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % VECTOR_DIM
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[index] += sign

        norm = math.sqrt(sum(value * value for value in vector))
        if norm:
            vector = [value / norm for value in vector]
        return vector


EMBEDDING_FUNCTION = LocalHashEmbeddingFunction()
