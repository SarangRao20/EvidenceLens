import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { STATUS, SOURCE_TYPE } from "../lib/colors";
import ClaimDetail from "./ClaimDetail";

// Overlay for the 3D scene: the scene itself is the background. The navigator lists every claim
// (hover highlights its node, click focuses it) and the drawer shows the selected claim.
export default function MapHud({ report, data, order, selectedId, onSelect, onHover, onResetView, autoRotate, onToggleRotate }) {
  // Keep the highlighted claim visible when keyboard navigation moves past the end of the list.
  useEffect(() => {
    document.querySelector(".hud-item.active")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  return (
    <div className="map-hud">
      <aside className="hud-nav glass" aria-label="Claim navigator">
        <div className="hud-head">
          <span className="eyebrow">Claims</span>
          <span className="muted small">{report.claims.length}</span>
        </div>
        <ul>
          {report.claims.map((c, i) => {
            const m = STATUS[c.status];
            const active = selectedId === c.claim_id;
            return (
              <motion.li key={c.claim_id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.07 }}>
                <button
                  className={`hud-item ${active ? "active" : ""}`}
                  style={{ "--c": m.color }}
                  aria-pressed={active}
                  onClick={() => onSelect(active ? null : c.claim_id)}
                  onMouseEnter={() => onHover(c.claim_id)}
                  onMouseLeave={() => onHover(null)}
                >
                  <span className="mono cid">{c.claim_id}</span>
                  <span className="hud-text">{c.text}</span>
                  <span className="hud-status">{m.label}</span>
                </button>
              </motion.li>
            );
          })}
        </ul>
        <div className="legend">
          {Object.values(STATUS).map((m) => <span key={m.label}><i style={{ background: m.color }} />{m.label}</span>)}
          <span><i style={{ background: "#e2e8f0" }} />Sources</span>
          {Object.values(SOURCE_TYPE).map((t) => <span key={t.label}><i style={{ background: t.color }} />{t.label}</span>)}
          <span><u className="l-for" />Supports</span>
          <span><u className="l-against" />Contradicts</span>
        </div>
      </aside>

      <AnimatePresence>
        {selectedId && data.claimById[selectedId] && (
          <motion.aside
            key="drawer"
            className="drawer glass"
            initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          >
            <ClaimDetail data={data} claimId={selectedId} order={order} onSelect={onSelect} onClose={() => onSelect(null)} />
          </motion.aside>
        )}
      </AnimatePresence>

      <div className="hud-hint glass">
        <span>Drag to orbit · scroll to zoom · click a node to inspect · ← → browse claims</span>
        <button className="hud-btn" onClick={onResetView}>Reset view</button>
        <button className="hud-btn" aria-pressed={autoRotate} onClick={onToggleRotate}>Auto-rotate {autoRotate ? "on" : "off"}</button>
      </div>
    </div>
  );
}
