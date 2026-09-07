"""Shared state schema for the revenue-advisor LangGraph agent (see graph.py).

Kept as a single TypedDict (not per-node dataclasses) because LangGraph
passes and merges partial dict updates between nodes -- every node reads
whatever fields it needs and returns only the fields it adds/changes.
"""
from typing import Literal, Optional, TypedDict


class AdvisorState(TypedDict, total=False):
    # --- input, set once before graph.invoke() ---
    user: object  # core.models.Staff instance -- server-internal only, never in `output`
    role: Literal['store_manager', 'chain_manager']
    store_id: Optional[int]  # None only valid for chain_manager (chain-wide)
    store_location: Optional[str]
    period: Literal['week', 'month', 'quarter']

    # --- populated by fetch_context / fetch_market_context ---
    raw_data: dict
    market_context: str

    # --- populated by compute_metrics / detect_anomalies ---
    metrics: dict
    anomalies: list

    # --- populated by generate_insights / verify_insights ---
    recommendations: list
    verification_passed: bool
    verification_notes: str
    retry_count: int

    # --- final, set by format_output ---
    output: dict
