// Single source of truth for status / source-type presentation (UI and 3D scene).
export const STATUS = {
  supported: {
    label: "Supported", short: "SUPPORTED", color: "#22c55e", bg: "rgba(34,197,94,.14)", icon: "✓",
    blurb: "Retrieved sources agree with the claim.",
  },
  contradicted: {
    label: "Contradicted", short: "CONTRADICTED", color: "#ef4444", bg: "rgba(239,68,68,.14)", icon: "✕",
    blurb: "Retrieved sources dispute the claim.",
  },
  mixed: {
    label: "Mixed", short: "MIXED", color: "#eab308", bg: "rgba(234,179,8,.14)", icon: "±",
    blurb: "Sources disagree: some support the claim, some contradict it.",
  },
  insufficient_evidence: {
    label: "Insufficient evidence", short: "INSUFFICIENT", color: "#9ca3af", bg: "rgba(156,163,175,.14)", icon: "?",
    blurb: "Not enough relevant evidence was found to judge the claim.",
  },
};

export const SOURCE_TYPE = {
  web:     { label: "Web",     color: "#3b82f6", blurb: "General Google web results" },
  news:    { label: "News",    color: "#f59e0b", blurb: "Google News reporting" },
  scholar: { label: "Scholar", color: "#a855f7", blurb: "Academic papers via Google Scholar" },
};

export const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
