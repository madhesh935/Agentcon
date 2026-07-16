"""
AEGIS Copilot — RAG-backed answers for investigation questions (case C-2041).
"""

from __future__ import annotations

import os
from typing import Any

PERSIST_DIRECTORY = os.path.join(os.path.dirname(__file__), "../chroma_data")
CASE_ID = "C-2041"

# Investigation facts aligned with chroma_db + frontend data.ts
CONTRADICTIONS = [
    ("X1", "high", "CCTV-0418 timestamp drift +6m vs station master clock"),
    ("X2", "high", "Witness #2 places suspect at 22:10 — suspect phone was off-tower in Adyar"),
    ("X3", "critical", "GPS travel Central → Royapuram in 4 minutes (impossible)"),
    ("X4", "medium", "Livor mortis fixed posterior vs supine recovery position (relocation)"),
]

MOVEMENT = [
    "18:10 — Triplicane (witness tea stall)",
    "20:14 — Chennai Central E-Gate 4 (CCTV + tower ping)",
    "20:22 — UPI ₹40,000 to S-118 (Vetri)",
    "20:42 — Altercation on CCTV-CHN-0412",
    "20:51 — Victim phone last ping Park Town tower",
    "20:55 — S-118 leaves cell sector",
]


def _collection():
    import chromadb

    client = chromadb.PersistentClient(path=PERSIST_DIRECTORY)
    return client.get_or_create_collection("aegis_evidence_graph")


def ensure_corpus() -> None:
    """Seed Chroma if the evidence collection is empty."""
    col = _collection()
    if col.count() > 0:
        return
    from services.chroma_db import setup_chromadb

    setup_chromadb()


def search_evidence(query: str, n_results: int = 5) -> list[dict[str, Any]]:
    ensure_corpus()
    col = _collection()
    res = col.query(query_texts=[query], n_results=n_results)
    hits = []
    for i, doc in enumerate(res["documents"][0]):
        hits.append(
            {
                "document": doc,
                "distance": float(res["distances"][0][i]),
                "metadata": res["metadatas"][0][i] or {},
            }
        )
    return hits


def _intent(query: str) -> str:
    q = query.lower()
    if any(w in q for w in ("contradict", "conflict", "inconsistent", "mismatch")):
        return "contradictions"
    if any(w in q for w in ("suspect", "strongest", "who killed", "perpetrator", "vetri", "manoj")):
        return "suspect"
    if any(w in q for w in ("cctv", "camera", "footage", "0418", "0412", "video")):
        return "cctv"
    if any(w in q for w in ("movement", "replay", "route", "gps", "location", "where")):
        return "movement"
    if any(w in q for w in ("dna", "fingerprint", "print", "weapon", "rod", "evidence")):
        return "evidence"
    if any(w in q for w in ("autopsy", "tod", "time of death", "pmi", "livor", "rigor")):
        return "autopsy"
    if any(w in q for w in ("toxic", "drug", "alcohol", "diazepam", "bac")):
        return "toxicology"
    if any(w in q for w in ("summar", "digest", "overview", "brief", "bullet")):
        return "summary"
    if any(w in q for w in ("financial", "money", "upi", "transfer", "payment")):
        return "financial"
    return "general"


def _format_sources(hits: list[dict[str, Any]], limit: int = 3) -> list[dict[str, Any]]:
    out = []
    for h in hits[:limit]:
        meta = h["metadata"]
        out.append(
            {
                "type": meta.get("type", "evidence"),
                "confidence": meta.get("confidence"),
                "snippet": h["document"][:280],
            }
        )
    return out


def _answer_suspect(hits: list[dict[str, Any]]) -> str:
    suspect_hits = sorted(
        [h for h in hits if h["metadata"].get("type") == "suspect"],
        key=lambda h: float(h["metadata"].get("confidence") or 0),
        reverse=True,
    )
    dna = next((h for h in hits if "dna" in h["document"].lower() or "d-77" in h["document"].lower()), None)
    fin = next((h for h in hits if "upi" in h["document"].lower() or "fin-992" in h["document"].lower()), None)
    fp = next((h for h in hits if "fingerprint" in h["document"].lower() or "fp-09" in h["document"].lower()), None)

    lines = [
        "For case C-2041 (Central Station Homicide), the primary suspect is **Vetri (S-118)** at **87%** investigation confidence.",
        "",
        "**Why:**",
    ]
    if dna:
        lines.append(f"• {dna['document']}")
    if fin:
        lines.append(f"• {fin['document']}")
    if fp:
        lines.append(f"• {fp['document']}")
    if suspect_hits:
        lines.append(f"• {suspect_hits[0]['document']}")
    lines.extend(
        [
            "",
            "Secondary person of interest: **Manoj (S-204)** (~54% confidence) — seen near the TOD window on CCTV-0418; witness timeline conflicts with phone GPS.",
            "",
            "Recommendation: Prioritize S-118 for interview; preserve chain of custody on DNA D-77 and UPI FIN-992.",
        ]
    )
    return "\n".join(lines)


def _answer_cctv(query: str, hits: list[dict[str, Any]]) -> str:
    cctv_hits = [h for h in hits if "cctv" in h["document"].lower()]
    if "0418" in query or "418" in query:
        return (
            "**CCTV-CHN-0418** is flagged because of a **~6 minute timestamp drift** versus the station master clock. "
            "Forensic review places the real capture near **20:42**, not 20:48 as initially logged.\n\n"
            "That drift breaks the travel-time chain (Central → Royapuram in ~4 minutes is not credible). "
            "Tampering likelihood in the investigation graph: **~73%**.\n\n"
            "Cross-check with **CCTV-CHN-0412** (E-Gate 4), which shows the altercation at 20:42 with clearer timing."
        )
    if cctv_hits:
        body = "\n".join(f"• {h['document']}" for h in cctv_hits[:3])
        return f"**CCTV evidence for C-2041:**\n\n{body}"
    return (
        "No CCTV-specific chunk ranked highest. Indexed feeds: **CHN-0412** (altercation 20:42) and "
        "**CHN-0418** (timestamp anomaly near Royapuram). Ask about “CCTV-0418” for the drift analysis."
    )


def _answer_contradictions() -> str:
    lines = ["**4 open contradictions** on C-2041:\n"]
    for cid, sev, text in CONTRADICTIONS:
        lines.append(f"• **{cid}** ({sev}): {text}")
    lines.append(
        "\nHighest priority: **X3** (impossible travel) and **X1** (CCTV clock drift). "
        "Resolve before final TOD/suspect attribution."
    )
    return "\n".join(lines)


def _answer_movement() -> str:
    lines = ["**Reconstructed movement timeline (C-2041):**\n"]
    lines.extend(f"• {step}" for step in MOVEMENT)
    lines.append(
        "\nSuspect S-118 overlaps the victim on **Park Town tower** from **20:22–20:55**. "
        "Victim last ping **20:51**; altercation on CCTV **20:42**."
    )
    return "\n".join(lines)


def _answer_autopsy(hits: list[dict[str, Any]]) -> str:
    autopsy = [h for h in hits if h["metadata"].get("type") in ("autopsy", "toxicology") or "autopsy" in h["document"].lower()]
    lines = [
        "**Autopsy & post-mortem (A-2041 / victim R. Suresh):**",
        "• Cause: blunt force trauma — depressed occipital fracture, subdural hemorrhage.",
        "• Estimated TOD: **19:30 – 21:00** (76% confidence).",
        "• Algor mortis ~20.4°C at recovery → ~2.5h PMI at scene.",
        "• Livor mortis fixed posterior — **inconsistent with supine recovery** → likely body moved post-mortem.",
        "",
    ]
    for h in autopsy[:3]:
        lines.append(f"• {h['document']}")
    return "\n".join(lines)


def _answer_summary(hits: list[dict[str, Any]]) -> str:
    ranked = sorted(
        hits,
        key=lambda h: float(h["metadata"].get("confidence") or 0),
        reverse=True,
    )
    lines = ["**C-2041 evidence digest (top items):**\n"]
    for i, h in enumerate(ranked[:5], 1):
        meta = h["metadata"]
        tag = meta.get("type", "evidence").upper()
        conf = meta.get("confidence", "?")
        snippet = h["document"][:120].replace("\n", " ")
        lines.append(f"{i}. [{tag} · {conf}%] {snippet}…")
    lines.append("\nPrimary narrative: assault at Central → DNA/finance links to S-118 → CCTV/time anomalies to verify.")
    return "\n".join(lines)


def _answer_general(query: str, hits: list[dict[str, Any]]) -> str:
    if not hits:
        return (
            "I could not retrieve strong matches from the evidence index. "
            "Ensure the backend is running and Chroma is seeded (`python services/chroma_db.py`). "
            "Try: strongest suspect, CCTV-0418, contradictions, or movement replay."
        )

    top = hits[0]
    meta = top["metadata"]
    intro = (
        f"Based on your question about **{query.strip()[:80]}**, "
        f"the closest indexed evidence ({meta.get('type', 'item')}, {meta.get('confidence', '?')}% confidence) is:\n\n"
        f"{top['document']}\n"
    )
    if len(hits) > 1:
        intro += "\n**Also relevant:**\n"
        intro += "\n".join(f"• {h['document'][:200]}…" if len(h['document']) > 200 else f"• {h['document']}" for h in hits[1:3])
    return intro


def answer_question(query: str, *, case_id: str = CASE_ID) -> dict[str, Any]:
    """Return a natural-language answer plus source snippets."""
    query = query.strip()
    if not query:
        return {"answer": "Please enter a question about case C-2041.", "sources": [], "intent": "empty"}

    # Expand query for better retrieval
    search_q = query
    if case_id == "C-2041" and "c-2041" not in query.lower():
        search_q = f"C-2041 Central Station homicide {query}"

    hits = search_evidence(search_q, n_results=6)
    intent = _intent(query)

    builders = {
        "suspect": lambda: _answer_suspect(hits),
        "cctv": lambda: _answer_cctv(query, hits),
        "contradictions": lambda: _answer_contradictions(),
        "movement": lambda: _answer_movement(),
        "autopsy": lambda: _answer_autopsy(hits),
        "toxicology": lambda: _answer_autopsy(hits),
        "financial": lambda: _answer_suspect(hits),
        "evidence": lambda: _answer_summary(hits),
        "summary": lambda: _answer_summary(hits),
        "general": lambda: _answer_general(query, hits),
    }
    answer = builders.get(intent, builders["general"])()

    return {
        "case_id": case_id,
        "query": query,
        "intent": intent,
        "answer": answer,
        "sources": _format_sources(hits),
    }
