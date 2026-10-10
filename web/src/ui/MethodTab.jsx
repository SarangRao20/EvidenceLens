import { SOURCE_TYPE, STATUS } from "../lib/colors";
import { StatusBadge } from "./primitives";

const BASE_LIMITS = [
  "Assessments are based on search snippets, not full articles.",
  "Source quality is estimated, not formally evaluated.",
  "Results depend on search engine ranking and availability.",
  "The counter-evidence search may miss relevant sources.",
  "Not a substitute for expert review or systematic analysis.",
];

export default function MethodTab({ report }) {
  const limits = [...new Set([...BASE_LIMITS, ...report.limitations])];
  return (
    <div className="stack">
      <section className="card">
        <h2>How to read this report</h2>
        <dl className="defs">
          {Object.entries(STATUS).map(([k, m]) => (
            <div key={k}><dt><StatusBadge status={k} /></dt><dd>{m.blurb}</dd></div>
          ))}
          <div><dt><span className="tag warn">Fragile origin</span></dt><dd>Several outlets repeat what is really one underlying report, so apparent agreement may rest on a single source.</dd></div>
        </dl>
      </section>

      <section className="card">
        <h2>Method</h2>
        <p className="body-text">
          EvidenceLens searched Google Web, News and Scholar through SerpApi, extracted individual claims, then ran a
          separate search for counter-evidence. Each claim's status is bound to the source IDs it cites. Assessments
          reflect retrieved evidence only and do not represent objective truth.
        </p>
        <h3>Source types</h3>
        <ul className="plain">{Object.values(SOURCE_TYPE).map((t) => <li key={t.label}><strong style={{ color: t.color }}>{t.label}</strong> — {t.blurb}</li>)}</ul>
        <h3>Search queries</h3>
        <ul className="plain">{report.search_queries_used.map((q) => <li key={q} className="mono">{q}</li>)}</ul>
      </section>

      <section className="card">
        <h2>Limitations</h2>
        <ul className="plain">{limits.map((l) => <li key={l}>{l}</li>)}</ul>
      </section>
    </div>
  );
}
