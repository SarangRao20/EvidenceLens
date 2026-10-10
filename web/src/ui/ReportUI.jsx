import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SOURCE_TYPE, STATUS } from "../lib/colors";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const rise = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function StatusChip({ status }) {
  const m = STATUS[status];
  return <span className="chip-status" style={{ color: m.color, background: m.bg }}>{m.icon} {m.short}</span>;
}

function domainRatio(claim, byId) {
  const ids = [...new Set([...claim.supporting_source_ids, ...claim.contradicting_source_ids])];
  const srcs = ids.map((i) => byId[i]).filter(Boolean);
  return `${new Set(srcs.map((s) => s.domain)).size}/${srcs.length}`;
}

/* ---- top bar ---- */
export function TopBar({ report, onBack, isDemo, onToggleGuide, showGuide }) {
  const download = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "evidencelens_report.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <motion.header className="topbar glass" initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 100, damping: 16 }}>
      <button className="ghost" onClick={onBack}>← New question</button>
      <div className="tb-q">
        <span className="eyebrow">Research report{isDemo && <span className="demo-tag">DEMO DATA</span>}</span>
        <span className="q">“{report.question}”</span>
      </div>
      <div className="tb-meta">
        {new Date(report.generated_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · {report.sources.length} sources · {report.claims.length} claims
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button className="ghost" onClick={onToggleGuide} style={{ borderColor: showGuide ? "var(--accent)" : "var(--line)" }}>
          {showGuide ? "✕ Close Guide" : "💡 How to Read"}
        </button>
        <button className="ghost" onClick={download}>Export JSON</button>
      </div>
    </motion.header>
  );
}

/* ---- matrix dock ---- */
export function Dock({ report, selectedId, hoveredId, onSelect, onHover }) {
  const [openSummary, setOpenSummary] = useState(true);
  const byId = useMemo(() => Object.fromEntries(report.sources.map((s) => [s.source_id, s])), [report]);
  const claims = useMemo(() => Object.fromEntries(report.claims.map((c) => [c.claim_id, c])), [report]);
  const counts = report.claims.reduce((a, c) => ({ ...a, [c.status]: (a[c.status] || 0) + 1 }), {});

  return (
    <motion.aside className="dock glass" initial={{ x: -80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5, type: "spring", stiffness: 80, damping: 16 }}>
      <div className="stat-row">
        {Object.entries(STATUS).map(([k, m], i) => (
          <motion.div key={k} className="stat" style={{ borderColor: m.color + "55" }} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.7 + i * 0.08, type: "spring" }}>
            <span style={{ color: m.color }}>{counts[k] || 0}</span>
            <small>{m.label}</small>
          </motion.div>
        ))}
      </div>

      <button className="sec-head" onClick={() => setOpenSummary((o) => !o)}>
        Executive summary <span>{openSummary ? "−" : "+"}</span>
      </button>
      <AnimatePresence initial={false}>
        {openSummary && (
          <motion.div className="summary" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <p>{report.executive_summary}</p>
            <small>A summary of what retrieved sources say — not a verdict on what is true.</small>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sec-head static">Evidence matrix</div>
      <div className="matrix">
        <div className="mx-head">
          <span>ID</span><span>Claim</span><span>Status</span><span title="Supporting sources">For</span><span title="Contradicting sources">Against</span><span title="Unique domains / sources cited">Dom.</span>
        </div>
        {report.evidence_matrix.map((row, i) => {
          const m = STATUS[row.status];
          const claim = claims[row.claim_id];
          const active = selectedId === row.claim_id;
          return (
            <motion.button
              key={row.claim_id}
              className={`mx-row ${active ? "active" : ""} ${hoveredId === row.claim_id ? "hover" : ""}`}
              style={{ "--c": m.color }}
              initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 + i * 0.14, type: "spring", stiffness: 120, damping: 18 }}
              onClick={() => onSelect(active ? null : row.claim_id)}
              onMouseEnter={() => onHover(row.claim_id)} onMouseLeave={() => onHover(null)}
            >
              <span className="mono id">{row.claim_id}</span>
              <span className="ctext">{row.text}</span>
              <span className="scell">
                <motion.span className="fill" style={{ background: m.bg }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1.1 + i * 0.14, duration: 0.5, ease: "easeOut" }} />
                <span className="lbl" style={{ color: m.color }}>{m.icon} {m.short}</span>
              </span>
              <span className="num for">{row.supporting_count}</span>
              <span className="num against">{row.contradicting_count}</span>
              <span className="mono dom">{claim ? domainRatio(claim, byId) : "—"}</span>
              {row.is_fragile && <span className="frag">⚠ Fragile origin — apparent consensus may trace to one source</span>}
            </motion.button>
          );
        })}
      </div>
      <div className="legend">
        {Object.values(STATUS).map((m) => <span key={m.label}><i style={{ background: m.color }} />{m.label}</span>)}
      </div>
      <div className="hint">Click a row — or a glowing node — to fly into its evidence. Drag to orbit, scroll to zoom.</div>
    </motion.aside>
  );
}

/* ---- claim detail panel ---- */
function EvidenceList({ title, ids, byId, tone }) {
  return (
    <div className={`ev ${tone}`}>
      <h4>{title}</h4>
      {ids.length === 0 && <div className="none">None identified</div>}
      {ids.map((id) => {
        const s = byId[id];
        if (!s) return null;
        return (
          <motion.a key={id} variants={rise} className="src" href={s.url} target="_blank" rel="noopener noreferrer">
            <span className="mono sid">{s.source_id}</span>
            <span className="stype" style={{ color: SOURCE_TYPE[s.source_type].color }}>● {SOURCE_TYPE[s.source_type].label}</span>
            <strong>{s.title}</strong>
            <em>{s.domain}{s.published_at ? ` · ${s.published_at}` : ""}</em>
            {s.snippet && <p>“{s.snippet}”</p>}
          </motion.a>
        );
      })}
    </div>
  );
}

export function ClaimPanel({ report, claimId, onClose }) {
  const byId = useMemo(() => Object.fromEntries(report.sources.map((s) => [s.source_id, s])), [report]);
  const claim = report.claims.find((c) => c.claim_id === claimId);
  const row = report.evidence_matrix.find((r) => r.claim_id === claimId);
  return (
    <AnimatePresence mode="wait">
      {claim && (
        <motion.aside key={claim.claim_id} className="panel glass" initial={{ x: 120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 120, opacity: 0 }} transition={{ type: "spring", stiffness: 110, damping: 17 }}>
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.div variants={rise} className="p-head">
              <span className="mono">{claim.claim_id}</span>
              <StatusChip status={claim.status} />
              <button className="x" onClick={onClose} aria-label="Close">✕</button>
            </motion.div>
            <motion.h3 variants={rise}>{claim.text}</motion.h3>
            {row?.is_fragile && <motion.div variants={rise} className="fragile">⚠ Fragile origin: support may trace to a single underlying source.</motion.div>}
            {claim.rationale && <motion.div variants={rise} className="block"><h4>Rationale</h4><p>{claim.rationale}</p></motion.div>}
            {claim.uncertainty && <motion.div variants={rise} className="uncertainty"><h4>⚠ Uncertainty</h4><p>{claim.uncertainty}</p></motion.div>}
            <motion.div variants={stagger} className="ev-grid">
              <EvidenceList title="Supporting" ids={claim.supporting_source_ids} byId={byId} tone="for" />
              <EvidenceList title="Contradicting" ids={claim.contradicting_source_ids} byId={byId} tone="against" />
            </motion.div>
            <motion.div variants={rise} className="quality">
              {(() => {
                const ids = [...new Set([...claim.supporting_source_ids, ...claim.contradicting_source_ids])].map((i) => byId[i]).filter(Boolean);
                if (!ids.length) return "No sources cited for this claim.";
                const doms = new Set(ids.map((s) => s.domain)).size;
                const mix = ids.reduce((a, s) => ({ ...a, [s.source_type]: (a[s.source_type] || 0) + 1 }), {});
                return `${doms} unique domain(s) across ${ids.length} source(s) · ${Object.entries(mix).map(([t, n]) => `${n} ${t}`).join(" · ")}`;
              })()}
            </motion.div>
          </motion.div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

/* ---- ledger drawer ---- */
export function Ledger({ report, selectedId }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("sources");
  const sel = report.claims.find((c) => c.claim_id === selectedId);
  const hi = new Set(sel ? [...sel.supporting_source_ids, ...sel.contradicting_source_ids] : []);
  const limitations = [
    "Assessments are based on search snippets, not full articles",
    "Source quality is estimated, not formally evaluated",
    "Results depend on search engine ranking and availability",
    "Counter-evidence search may miss relevant sources",
    "Not a substitute for expert review or systematic analysis",
    ...report.limitations,
  ];
  return (
    <motion.div className="ledger glass" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.2, type: "spring", stiffness: 90, damping: 16 }}>
      <button className="l-toggle" onClick={() => setOpen((o) => !o)}>
        <span>Ledger · {report.sources.length} sources · limitations · queries</span><span>{open ? "▾" : "▴"}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "min(42vh, 360px)" }} exit={{ height: 0 }} className="l-body">
            <div className="tabs">
              {["sources", "limitations", "methodology"].map((t) => (
                <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t}</button>
              ))}
            </div>
            <div className="l-scroll">
              {tab === "sources" && (
                <table>
                  <thead><tr><th>ID</th><th>Title</th><th>Domain</th><th>Type</th><th>Date</th></tr></thead>
                  <tbody>
                    {report.sources.map((s) => (
                      <tr key={s.source_id} className={hi.has(s.source_id) ? "hi" : ""}>
                        <td className="mono">{s.source_id}</td>
                        <td><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a></td>
                        <td>{s.domain}</td>
                        <td style={{ color: SOURCE_TYPE[s.source_type].color }}>● {SOURCE_TYPE[s.source_type].label}</td>
                        <td>{s.published_at || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {tab === "limitations" && <ul>{[...new Set(limitations)].map((l) => <li key={l}>{l}</li>)}</ul>}
              {tab === "methodology" && (
                <div>
                  <p>EvidenceLens searched web, news, and Google Scholar via SerpApi, extracted atomic claims, then searched for counter-evidence. Assessments are based on retrieved evidence only and do not represent objective truth.</p>
                  <h4>Search queries used</h4>
                  <ul>{report.search_queries_used.map((q) => <li key={q} className="mono">{q}</li>)}</ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ---- guide overlay modal ---- */
export function GuideModal({ onClose }) {
  return (
    <motion.div
      className="guide-modal-wrap"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="guide-modal glass"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>🔍 How EvidenceLens Works</h3>
          <button className="ghost" onClick={onClose} style={{ padding: "4px 10px" }}>✕</button>
        </div>
        <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginTop: "8px" }}>
          EvidenceLens breaks free of black-box summaries by structuring research into an adversarial epistemic graph:
        </p>

        <div className="guide-grid">
          <div className="guide-card">
            <h4>🌐 1. Multi-Engine SerpApi Retrieval</h4>
            <p>We query <strong>Google Web</strong> (broad context), <strong>Google News</strong> (fresh reporting), and <strong>Google Scholar</strong> (peer-reviewed research) to avoid blog bias.</p>
          </div>
          <div className="guide-card">
            <h4>⚡ 2. 3D Observatory Visuals</h4>
            <p>
              • <strong>Glowing Center:</strong> Your research question.<br />
              • <strong>Orbiting Nodes:</strong> Atomic claims (Green=Supported, Red=Contradicted, Yellow=Mixed).<br />
              • <strong>Satellites & Beams:</strong> Green beams indicate support; dashed red beams indicate counter-evidence.
            </p>
          </div>
          <div className="guide-card">
            <h4>🛡️ 3. "Fragile Origin" (Echo Detection)</h4>
            <p>When multiple blog posts repeat the same syndicated news dispatch with zero new proof, EvidenceLens flags it as a <strong>Fragile Origin (Single Point of Failure)</strong>.</p>
          </div>
          <div className="guide-card">
            <h4>🎯 4. Interactive Navigation</h4>
            <p>
              • Click any claim node or matrix row to <strong>fly the camera into that claim</strong>.<br />
              • Drag to orbit in 3D, scroll to zoom in/out, press <kbd>Esc</kbd> to reset view.
            </p>
          </div>
        </div>

        <button className="ask-btn-demo" onClick={onClose} style={{ marginTop: "16px", width: "100%", padding: "10px", borderRadius: "10px", background: "var(--accent)", color: "#000", fontWeight: 600, border: 0 }}>
          Got it, explore the evidence!
        </button>
      </motion.div>
    </motion.div>
  );
}
