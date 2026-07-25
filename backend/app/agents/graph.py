from langgraph.graph import StateGraph, END

from app.agents.nodes import (
    ComplaintState,
    extract_details,
    check_completeness,
    classify_risk,
    summarize_complaint,
    check_duplicate,
)


def build_complaint_graph():
    graph = StateGraph(ComplaintState)

    graph.add_node("extract_details", extract_details)
    graph.add_node("check_completeness", check_completeness)
    graph.add_node("classify_risk", classify_risk)
    graph.add_node("summarize_complaint", summarize_complaint)
    graph.add_node("check_duplicate", check_duplicate)

    graph.set_entry_point("extract_details")
    graph.add_edge("extract_details", "check_completeness")
    graph.add_edge("check_completeness", "classify_risk")
    graph.add_edge("classify_risk", "summarize_complaint")
    graph.add_edge("summarize_complaint", "check_duplicate")
    graph.add_edge("check_duplicate", END)

    return graph.compile()


# Compiled once at import time, reused across requests
complaint_graph = build_complaint_graph()
