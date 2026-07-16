#!/usr/bin/env python3
"""
Streamlit: select a case → bar chart with Accuracy and Confidentiality only.

  cd aegis-command
  streamlit run rag_dashboard.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
import streamlit as st

BACKEND = Path(__file__).resolve().parent / "backend"
sys.path.insert(0, str(BACKEND))

from dotenv import load_dotenv

load_dotenv(BACKEND / ".env")

from rag.evaluate import evaluate_all, load_results  # noqa: E402

st.set_page_config(page_title="AEGIS RAG Metrics", layout="centered")

st.title("AEGIS RAG — Case Metrics")

if st.button("Refresh evaluation", type="primary"):
    with st.spinner("Running RAG benchmarks…"):
        data = evaluate_all()
    st.success("Done.")
else:
    data = load_results()

df = pd.DataFrame(data["results"])
if df.empty:
    st.warning("No data. Click **Refresh evaluation**.")
    st.stop()

# Case dropdown — label shows id + title
cases = (
    df[["case_id", "case_title"]]
    .drop_duplicates()
    .sort_values("case_id")
)
case_labels = {
    row.case_id: f"{row.case_id} — {row.case_title}"
    for row in cases.itertuples()
}
selected_id = st.selectbox(
    "Select case",
    options=list(case_labels.keys()),
    format_func=lambda cid: case_labels[cid],
)

row = df[df["case_id"] == selected_id]
# Best RAG pipeline for this case (highest retrieval accuracy)
best = row.loc[row["accuracy"].idxmax()]
accuracy = float(best["accuracy"])
confidentiality = float(best["confidentiality"])
pipeline_name = str(best["pipeline_name"])

st.subheader(case_labels[selected_id])

chart_df = pd.DataFrame(
    {"Score (%)": [accuracy, confidentiality]},
    index=["Accuracy", "Confidentiality"],
)
st.bar_chart(chart_df, height=400)

st.caption(f"Scores from best pipeline for this case: **{pipeline_name}**")

col1, col2 = st.columns(2)
col1.metric("Accuracy", f"{accuracy}%")
col2.metric("Confidentiality", f"{confidentiality}%")

with st.expander("Pipeline breakdown for this case"):
    st.dataframe(
        row[["pipeline_name", "accuracy", "confidentiality", "retrieval_count"]].rename(
            columns={
                "pipeline_name": "Pipeline",
                "accuracy": "Accuracy %",
                "confidentiality": "Confidentiality %",
                "retrieval_count": "Hits",
            }
        ),
        use_container_width=True,
        hide_index=True,
    )
