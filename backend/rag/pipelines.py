"""
RAG pipelines discovered in aegis-command.

Sources:
  - backend/services/chroma_db.py   → ChromaDB vector retrieval
  - backend/routers/case_router.py → GET /api/search
  - src/components/aegis/Copilot.tsx → copilot uses /api/search
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

PipelineKind = Literal["chromadb", "chromadb_hybrid"]


@dataclass(frozen=True)
class RAGPipeline:
    id: str
    name: str
    description: str
    kind: PipelineKind
    top_k: int
    use_metadata_rerank: bool
    confidentiality_base: float
    source_files: tuple[str, ...]


# All RAG-style retrieval paths in this repo (variants of the same Chroma store)
RAG_PIPELINES: list[RAGPipeline] = [
    RAGPipeline(
        id="evidence_rag_k3",
        name="Evidence RAG (Top-3)",
        description="ChromaDB semantic search, n_results=3 — Copilot default slice",
        kind="chromadb",
        top_k=3,
        use_metadata_rerank=False,
        confidentiality_base=62.0,
        source_files=("backend/services/chroma_db.py", "backend/routers/case_router.py"),
    ),
    RAGPipeline(
        id="evidence_rag_k5",
        name="Evidence RAG (Top-5)",
        description="ChromaDB semantic search, n_results=5 — /api/search default",
        kind="chromadb",
        top_k=5,
        use_metadata_rerank=False,
        confidentiality_base=62.0,
        source_files=("backend/routers/case_router.py",),
    ),
    RAGPipeline(
        id="evidence_rag_k10",
        name="Evidence RAG (Top-10)",
        description="ChromaDB wide retrieval for recall-heavy queries",
        kind="chromadb",
        top_k=10,
        use_metadata_rerank=False,
        confidentiality_base=58.0,
        source_files=("backend/services/chroma_db.py",),
    ),
    RAGPipeline(
        id="evidence_rag_hybrid",
        name="Evidence RAG (Hybrid Rerank)",
        description="ChromaDB + metadata confidence rerank",
        kind="chromadb_hybrid",
        top_k=8,
        use_metadata_rerank=True,
        confidentiality_base=65.0,
        source_files=("backend/services/chroma_db.py", "src/components/aegis/Copilot.tsx"),
    ),
]


def get_pipeline(pipeline_id: str) -> RAGPipeline:
    for p in RAG_PIPELINES:
        if p.id == pipeline_id:
            return p
    raise KeyError(f"Unknown pipeline: {pipeline_id}")
