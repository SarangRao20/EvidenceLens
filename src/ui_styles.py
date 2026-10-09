"""CSS for the EvidenceLens dark UI (kept out of app.py for readability)."""

CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap');
html, body, [class*="css"] { font-family: 'Inter', sans-serif; }
.stApp { background-color: #0a0a0f; }
.mono { font-family: 'JetBrains Mono', monospace; }
#MainMenu {visibility: hidden;} footer {visibility: hidden;} header {visibility: hidden;}
::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0a0a0f; }
::-webkit-scrollbar-thumb { background: #2a2a3e; border-radius: 3px; }

@keyframes fadeUp { from {opacity:0; transform: translateY(8px);} to {opacity:1; transform:none;} }
@media (prefers-reduced-motion: reduce) { .evidence-matrix tr.row { animation:none !important; } }

/* Hero */
.hero { text-align:center; padding: 2.5rem 0 1rem; }
.hero h1 { font-family:'JetBrains Mono',monospace; font-size:2.4rem; margin:0; }
.hero p { color:#94a3b8; font-size:1.1rem; margin-top:.5rem; }
.section-label { color:#94a3b8; font-size:.8rem; letter-spacing:.08em; text-transform:uppercase; font-weight:600; margin:1.6rem 0 .4rem; }
.report-meta { color:#94a3b8; font-size:.9rem; }
.report-q { font-size:1.5rem; font-weight:600; margin:.2rem 0; }

/* Status badges */
.status-supported, .status-contradicted, .status-mixed, .status-insufficient {
  padding:4px 12px; border-radius:12px; font-weight:600; font-size:.8em; white-space:nowrap; display:inline-block; }
.status-supported { background:#0d3d1f; color:#22c55e; }
.status-contradicted { background:#3d0d0d; color:#ef4444; }
.status-mixed { background:#3d3a0d; color:#eab308; }
.status-insufficient { background:#1a1a2e; color:#9ca3af; }

/* Summary */
.summary { background:#12121f; border-left:4px solid #60a5fa; border-radius:8px; padding:16px 20px; color:#e2e8f0; line-height:1.6; }

/* Metric cards */
.metric-card { background:#12121f; border-radius:12px; padding:20px; text-align:center; border:1px solid #2a2a3e; }
.metric-card .number { font-size:2em; font-weight:700; }
.metric-card .label { font-size:.85em; color:#94a3b8; margin-top:4px; }

/* Evidence matrix */
.evidence-matrix { width:100%; border-collapse:collapse; margin:1em 0; }
.evidence-matrix th { background:#1a1a2e; color:#94a3b8; padding:12px 16px; text-align:left; font-size:.8em;
                      text-transform:uppercase; letter-spacing:.05em; border-bottom:2px solid #2a2a3e; }
.evidence-matrix td { padding:12px 16px; border-bottom:1px solid #1a1a2e; color:#e2e8f0; vertical-align:middle; }
.evidence-matrix tr:hover { background:#12121f; }
.evidence-matrix tr.row { animation: fadeUp .45s ease both; }
.evidence-matrix td.cell-supported { background:#0d3d1f; }
.evidence-matrix td.cell-contradicted { background:#3d0d0d; }
.evidence-matrix td.cell-mixed { background:#3d3a0d; }
.evidence-matrix td.cell-insufficient { background:#1a1a2e; }
.legend { color:#94a3b8; font-size:.85rem; }

.tag { display:inline-block; font-size:.72rem; font-weight:600; padding:2px 8px; border-radius:10px; margin:2px 4px 2px 0; }
.tag-fragile { background:#3d0d0d; color:#ef4444; border:1px solid #6b2a2d; }
.tag-resilient { background:#0d3d1f; color:#22c55e; border:1px solid #1f5a38; }

/* Source entries / chips */
.source-entry { background:#0d0d1a; border-radius:6px; padding:10px 14px; margin:6px 0; border:1px solid #1a1a2e; }
.source-entry a, .ledger a { color:#60a5fa; text-decoration:none; }
.source-entry a:hover, .ledger a:hover { text-decoration:underline; }
.source-entry .snip { color:#94a3b8; font-size:.85rem; margin-top:4px; }
.source-entry .dom { color:#6b7280; font-size:.8rem; }
.source-chip { display:inline-block; font-family:'JetBrains Mono',monospace; font-size:.78rem; font-weight:600;
               padding:2px 7px; border-radius:4px; background:#1a2740; color:#9cc4ee; margin-right:6px; }
.badge-web { color:#3b82f6; } .badge-news { color:#f59e0b; } .badge-scholar { color:#a855f7; }
.type-badge { font-size:.75rem; font-weight:600; }

.uncertainty { background:#2a2208; border-left:3px solid #eab308; border-radius:0 6px 6px 0; padding:10px 14px; margin:10px 0;
               color:#e8d9a0; font-size:.9rem; }
.quality { color:#94a3b8; font-size:.85rem; margin-top:10px; }

/* Ledger */
.ledger { width:100%; border-collapse:collapse; }
.ledger th { background:#1a1a2e; color:#94a3b8; padding:10px 14px; text-align:left; font-size:.78em; text-transform:uppercase; letter-spacing:.05em; }
.ledger td { padding:10px 14px; border-bottom:1px solid #1a1a2e; color:#e2e8f0; font-size:.9rem; }
.table-wrap { overflow-x:auto; }

.footer { text-align:center; color:#6b7280; font-size:.85rem; margin:2rem 0 1rem; }
</style>
"""
