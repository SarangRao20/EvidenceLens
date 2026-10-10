import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Summary from "./Summary";
import Claims from "./Claims";
import MapHud from "./MapHud";
import SourcesTab from "./SourcesTab";
import MethodTab from "./MethodTab";

export default function Report({
  report, isDemo, onBack, tab, onNavigate, selectedId, onSelect, onHover,
  claimFilter, onFilter, onResetView, autoRotate, onToggleRotate,
}) {
  const data = useMemo(() => ({
    byId: Object.fromEntries(report.sources.map((s) => [s.source_id, s])),
    claimById: Object.fromEntries(report.claims.map((c) => [c.claim_id, c])),
    matrixById: Object.fromEntries(report.evidence_matrix.map((m) => [m.claim_id, m])),
  }), [report]);

  // The list prev/next and arrow keys move through: filtered on Claims, everything on the map.
  const order = useMemo(
    () => report.evidence_matrix
      .filter((r) => tab !== "claims" || !claimFilter || r.status === claimFilter)
      .map((r) => r.claim_id),
    [report, tab, claimFilter]
  );

  const tabs = [
    ["summary", "Summary"],
    ["claims", "Claims", report.claims.length],
    ["map", "Evidence map"],
    ["sources", "Sources", report.sources.length],
    ["method", "Method & limits"],
  ];

  // Arrow keys move between claims, except when the key press is inside the tab bar (which uses them for tabs).
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.("input, textarea, select, [role='tablist']")) return;
      if (e.key === "Escape") { onSelect(null); return; }
      if (tab !== "claims" && tab !== "map") return;
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const i = order.indexOf(selectedId);
      const next = i === -1
        ? (e.key === "ArrowRight" ? order[0] : order[order.length - 1])
        : order[Math.min(order.length - 1, Math.max(0, i + (e.key === "ArrowRight" ? 1 : -1)))];
      if (next) onSelect(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [order, selectedId, tab, onSelect]);

  // Move focus into the page on tab change so screen readers and keyboard users land on the new content.
  const mainRef = useRef(null);
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    mainRef.current?.focus({ preventScroll: true });
  }, [tab]);

  const tabRefs = useRef({});
  const onTabKey = (e) => {
    const keys = tabs.map(([k]) => k);
    const i = keys.indexOf(tab);
    let j = null;
    if (e.key === "ArrowRight") j = (i + 1) % keys.length;
    if (e.key === "ArrowLeft") j = (i - 1 + keys.length) % keys.length;
    if (e.key === "Home") j = 0;
    if (e.key === "End") j = keys.length - 1;
    if (j === null) return;
    e.preventDefault();
    onNavigate(keys[j]);
    tabRefs.current[keys[j]]?.focus();
  };

  const download = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "evidencelens_report.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className={`report is-${tab}`}>
      <a className="skip" href="#main">Skip to content</a>
      <header className="rpt-head">
        <div className="rpt-top">
          <button className="btn ghost" onClick={onBack}>← New question</button>
          <div className="rpt-center">
            <span className="brand">EvidenceLens</span>
            <span className="rpt-q" title={report.question}>{report.question}</span>
          </div>
          <div className="rpt-actions">
            {isDemo && <span className="demo-pill">Demo data</span>}
            <button className="btn ghost" onClick={download}>Export JSON</button>
          </div>
        </div>
        <nav className="tabs" role="tablist" aria-label="Report sections" onKeyDown={onTabKey}>
          {tabs.map(([k, label, n]) => (
            <button
              key={k}
              role="tab"
              id={`tab-${k}`}
              aria-selected={tab === k}
              aria-controls="main"
              tabIndex={tab === k ? 0 : -1}
              ref={(el) => (tabRefs.current[k] = el)}
              className={tab === k ? "on" : ""}
              onClick={() => onNavigate(k)}
            >
              {label}{n !== undefined && <span className="count">{n}</span>}
              {tab === k && <motion.span layoutId="tab-ink" className="ink" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
            </button>
          ))}
        </nav>
      </header>

      <div className="sr-only" aria-live="polite">{selectedId ? `Claim ${selectedId} selected` : ""}</div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={tab}
          id="main"
          ref={mainRef}
          tabIndex={-1}
          className={`page page-${tab}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab}`}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {tab === "summary" && <Summary report={report} onNavigate={onNavigate} />}
          {tab === "claims" && (
            <Claims report={report} data={data} selectedId={selectedId} onSelect={onSelect} filter={claimFilter} onFilter={onFilter} />
          )}
          {tab === "map" && (
            <MapHud
              report={report} data={data} order={order} selectedId={selectedId}
              onSelect={onSelect} onHover={onHover}
              onResetView={onResetView} autoRotate={autoRotate} onToggleRotate={onToggleRotate}
            />
          )}
          {tab === "sources" && <SourcesTab report={report} onOpenClaim={(id) => onNavigate("claims", { sel: id, filter: null })} />}
          {tab === "method" && <MethodTab report={report} />}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
