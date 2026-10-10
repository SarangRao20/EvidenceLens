import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { SOURCE_TYPE } from "../lib/colors";
import { TypeTag } from "./primitives";

export default function SourcesTab({ report, onOpenClaim }) {
  const [type, setType] = useState(null);
  const citedBy = useMemo(() => {
    const m = {};
    report.claims.forEach((c) => {
      c.supporting_source_ids.forEach((s) => ((m[s] ??= []).push({ id: c.claim_id, role: "for" })));
      c.contradicting_source_ids.forEach((s) => ((m[s] ??= []).push({ id: c.claim_id, role: "against" })));
    });
    return m;
  }, [report]);
  const rows = report.sources.filter((s) => !type || s.source_type === type);

  return (
    <section className="card">
      <div className="section-head">
        <h2>Sources <span className="count">{rows.length}</span></h2>
        <div className="chips-row" role="group" aria-label="Filter sources by type">
          <button className={`fchip ${!type ? "on" : ""}`} aria-pressed={!type} onClick={() => setType(null)}>All</button>
          {Object.entries(SOURCE_TYPE).map(([k, t]) => (
            <button key={k} className={`fchip ${type === k ? "on" : ""}`} aria-pressed={type === k} onClick={() => setType(type === k ? null : k)}>
              <i style={{ background: t.color }} />{t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Title</th><th>Publisher</th><th>Type</th><th>Date</th><th>Used in</th></tr></thead>
          <tbody>
            {rows.map((s, i) => (
              <motion.tr key={s.source_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 12) * 0.03 }}>
                <td className="mono sid">{s.source_id}</td>
                <td><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a></td>
                <td className="muted">{s.domain}</td>
                <td><TypeTag type={s.source_type} /></td>
                <td className="nowrap muted">{s.published_at || "—"}</td>
                <td>
                  {(citedBy[s.source_id] || []).map((c, j) => (
                    <button key={j} className={`cite ${c.role}`} title={c.role === "for" ? "Supports this claim" : "Contradicts this claim"} onClick={() => onOpenClaim(c.id)}>
                      {c.id} {c.role === "for" ? "+" : "−"}
                    </button>
                  ))}
                  {!citedBy[s.source_id] && <span className="muted small">Not cited</span>}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
