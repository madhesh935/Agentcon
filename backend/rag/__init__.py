"""RAG pipeline registry and evaluation for AEGIS."""

from rag.pipelines import RAG_PIPELINES, get_pipeline
from rag.evaluate import evaluate_all, load_results

__all__ = ["RAG_PIPELINES", "get_pipeline", "evaluate_all", "load_results"]
