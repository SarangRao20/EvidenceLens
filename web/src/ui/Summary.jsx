import { motion } from "framer-motion";
import { STATUS, fmtDate } from "../lib/colors";
import { StatusBadge } from "./primitives";

export default function Summary({ report, onNavigate }) {
  const counts = report.claims.reduce((a, c) => ({ ...a, [c.status]: (a[c.status] || 0) + 1 }), {});
  const fragile = report.evidence_matrix.filter((r) => r.is_fragile).length;
  const contested = report.claims.filter((c) => c.status === "contradicted" || c.status === "mixed").length;

  const readFirst = [
    contested ? `${contested} claim${contested === 1 ? " is" : "s are"} contested. Check both sides before relying on ${contested === 1 ? "it" : "them"}.` : null,
    fragile ? `${fragile} claim${fragile === 1 ? " may" : "s may"} rest on a single underlying source.` : null,
    counts.insufficient_evidence ? "Some claims lacked enough retrieved evidence to judge." : null,
    "Assessments use search snippets, not full articles.",
  ].filter(Boolean);

  return (
    <div className="summary-page">
      <section className="hero-card">
        <span className="eyebrow">Summary</span>
        <h1>{report.question}</h1>
        <p className="lede">{report.executive_summary}</p>
        <p className="note">This describes what the retrieved sources say. It is not a verdict on what is true.</p>
        <div className="hero-actions">
          <button className="btn primary" onClick={() => onNavigate("map", { sel: null })}>Explore the evidence map</button>
          <button className="btn" onClick={() => onNavigate("claims", { filter: null })}>Review all {report.claims.length} claims</button>
        </div>
      </section>

      <section className="stat-grid" aria-label="Claims by status">
        {Object.entries(STATUS).map(([k, m], i) => (
          <motion.button
            key={k}
            className="stat-card"
            style={{ "--c": m.color }}
            disabled={!counts[k]}
            onClick={() => onNavigate("claims", { filter: k })}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.07, duration: 0.4 }}
          >
            <span className="stat-n">{counts[k] || 0}</span>
            <span className="stat-l">{m.label}</span>
            <span className="stat-go">{counts[k] ? "View claims →" : "None"}</span>
          </motion.button>
        ))}
      </section>

      <div className="two-col">
        <section className="card">
          <h2>Claims</h2>
          <ul className="glance">
            {report.evidence_matrix.map((r) => (
              <li key={r.claim_id}>
                <button onClick={() => onNavigate("claims", { sel: r.claim_id, filter: null })}>
                  <span className="mono cid">{r.claim_id}</span>
                  <span className="glance-text">{r.text}</span>
                  <StatusBadge status={r.status} />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2>Read this first</h2>
          <ul className="plain">
            {readFirst.map((t) => <li key={t}>{t}</li>)}
          </ul>
          <dl className="meta-list">
            <div><dt>Generated</dt><dd>{fmtDate(report.generated_at)}</dd></div>
            <div><dt>Sources</dt><dd>{report.sources.length}</dd></div>
            <div><dt>Search queries</dt><dd>{report.search_queries_used.length}</dd></div>
          </dl>
        </section>
      </div>
    </div>
  );
}
