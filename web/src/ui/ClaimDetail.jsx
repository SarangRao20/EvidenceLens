import { motion } from "framer-motion";
import { SOURCE_TYPE, STATUS } from "../lib/colors";
import { StatusBadge, TypeTag } from "./primitives";

const card = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

function SourceCard({ s, tone }) {
  return (
    <motion.li variants={item} className={`src ${tone}`}>
      <div className="src-top"><span className="mono sid">{s.source_id}</span><TypeTag type={s.source_type} /></div>
      <a href={s.url} target="_blank" rel="noopener noreferrer" className="src-title">{s.title} <span aria-hidden="true">↗</span></a>
      <div className="src-meta">{s.domain}{s.published_at ? ` · ${s.published_at}` : ""}</div>
      {s.snippet && <blockquote>{s.snippet}</blockquote>}
    </motion.li>
  );
}

function Group({ title, ids, byId, tone }) {
  const items = ids.map((i) => byId[i]).filter(Boolean);
  return (
    <section className="ev-group">
      <h4 className={tone}>{title} <span className="count">{items.length}</span></h4>
      {items.length === 0
        ? <p className="muted small">None identified.</p>
        : <motion.ul variants={card} initial="hidden" animate="show">{items.map((s) => <SourceCard key={s.source_id} s={s} tone={tone} />)}</motion.ul>}
    </section>
  );
}

// Detail for one claim. `order` is the list prev/next moves through (the list the user is browsing).
export default function ClaimDetail({ data, claimId, order, onSelect, onClose }) {
  const claim = data.claimById[claimId];
  if (!claim) return null;
  const row = data.matrixById[claimId];
  const idx = order.indexOf(claimId);
  const prev = idx > 0 ? order[idx - 1] : null;
  const next = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
  const cited = [...new Set([...claim.supporting_source_ids, ...claim.contradicting_source_ids])].map((i) => data.byId[i]).filter(Boolean);
  const domains = new Set(cited.map((s) => s.domain)).size;
  const mix = cited.reduce((a, s) => ({ ...a, [s.source_type]: (a[s.source_type] || 0) + 1 }), {});

  return (
    <motion.article
      key={claimId}
      className="detail"
      initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
      aria-label={`Claim ${claimId}`}
    >
      <div className="detail-nav">
        <button className="icon-btn" disabled={!prev} onClick={() => onSelect(prev)} aria-label="Previous claim">‹</button>
        <span className="detail-pos mono">{claimId}{idx >= 0 && <span className="muted"> · {idx + 1} of {order.length}</span>}</span>
        <button className="icon-btn" disabled={!next} onClick={() => onSelect(next)} aria-label="Next claim">›</button>
        {onClose && <button className="icon-btn close" onClick={onClose} aria-label="Close claim">✕</button>}
      </div>

      <StatusBadge status={claim.status} />
      <h3>{claim.text}</h3>
      <p className="status-blurb">{STATUS[claim.status].blurb}</p>

      {row?.is_fragile && (
        <div className="alert warn">
          <strong>Fragile origin.</strong> The apparent agreement may trace back to one underlying source repeated by several outlets.
        </div>
      )}
      {claim.rationale && <section className="block"><h4>Why this status</h4><p>{claim.rationale}</p></section>}
      {claim.uncertainty && <section className="block caveat"><h4>Caveats</h4><p>{claim.uncertainty}</p></section>}

      <Group title="Supporting sources" ids={claim.supporting_source_ids} byId={data.byId} tone="for" />
      <Group title="Contradicting sources" ids={claim.contradicting_source_ids} byId={data.byId} tone="against" />

      <p className="muted small quality">
        {cited.length
          ? `${domains} unique domain${domains === 1 ? "" : "s"} across ${cited.length} source${cited.length === 1 ? "" : "s"} · ${Object.entries(mix).map(([t, n]) => `${n} ${SOURCE_TYPE[t].label.toLowerCase()}`).join(", ")}`
          : "No sources were cited for this claim."}
      </p>
    </motion.article>
  );
}
