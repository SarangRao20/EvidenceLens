import { useEffect } from "react";
import { motion } from "framer-motion";
import { STATUS } from "../lib/colors";
import { EvidenceBar, StatusBadge } from "./primitives";
import ClaimDetail from "./ClaimDetail";

export default function Claims({ report, data, selectedId, onSelect, filter, onFilter }) {
  const counts = report.claims.reduce((a, c) => ({ ...a, [c.status]: (a[c.status] || 0) + 1 }), {});
  const rows = report.evidence_matrix.filter((r) => !filter || r.status === filter);
  const order = rows.map((r) => r.claim_id);
  const activeId = order.includes(selectedId) ? selectedId : order[0];

  useEffect(() => {
    document.querySelector(".claim-row.active")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeId]);

  return (
    <div className="claims-layout">
      <section>
        <div className="section-head">
          <h2>Claims <span className="count">{rows.length}</span></h2>
          <div className="chips-row" role="group" aria-label="Filter claims by status">
            <button className={`fchip ${!filter ? "on" : ""}`} aria-pressed={!filter} onClick={() => onFilter(null)}>All</button>
            {Object.entries(STATUS).map(([k, m]) => (
              <button key={k} className={`fchip ${filter === k ? "on" : ""}`} aria-pressed={filter === k} disabled={!counts[k]} onClick={() => onFilter(filter === k ? null : k)}>
                <i style={{ background: m.color }} />{m.label}<span className="count">{counts[k] || 0}</span>
              </button>
            ))}
          </div>
        </div>

        <ul className="claim-list">
          {rows.map((r, i) => {
            const active = activeId === r.claim_id;
            const m = STATUS[r.status];
            return (
              <motion.li key={r.claim_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.3 }}>
                <button className={`claim-row ${active ? "active" : ""}`} style={{ "--c": m.color }} aria-pressed={active} onClick={() => onSelect(r.claim_id)}>
                  <span className="mono cid">{r.claim_id}</span>
                  <span className="cr-body">
                    <span className="cr-text">{r.text}</span>
                    <span className="cr-meta">
                      <EvidenceBar supporting={r.supporting_count} contradicting={r.contradicting_count} />
                      {r.is_fragile && <span className="tag warn">Fragile origin</span>}
                    </span>
                  </span>
                  <StatusBadge status={r.status} />
                </button>
              </motion.li>
            );
          })}
        </ul>
        {rows.length === 0 && <p className="muted">No claims match this filter.</p>}
        <p className="kbd-hint"><kbd>←</kbd> <kbd>→</kbd> move between claims · <kbd>Esc</kbd> clear selection</p>
      </section>

      <aside className="side">
        {activeId && <ClaimDetail data={data} claimId={activeId} order={order} onSelect={onSelect} />}
      </aside>
    </div>
  );
}
