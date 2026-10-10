import { SOURCE_TYPE, STATUS } from "../lib/colors";

export function StatusBadge({ status }) {
  const m = STATUS[status];
  return <span className="badge" style={{ color: m.color, background: m.bg }}><i style={{ background: m.color }} />{m.label}</span>;
}

export function TypeTag({ type }) {
  const t = SOURCE_TYPE[type];
  return <span className="type-tag" style={{ color: t.color }}><i style={{ background: t.color }} />{t.label}</span>;
}

// Stacked supporting-vs-contradicting bar, always paired with explicit counts.
export function EvidenceBar({ supporting, contradicting }) {
  const total = supporting + contradicting;
  if (!total) return <span className="ev-counts">No sources cited</span>;
  return (
    <span className="ev-bar-wrap">
      <span className="ev-bar" aria-hidden="true">
        <span style={{ width: `${(supporting / total) * 100}%`, background: "#22c55e" }} />
        <span style={{ width: `${(contradicting / total) * 100}%`, background: "#ef4444" }} />
      </span>
      <span className="ev-counts">{supporting} for · {contradicting} against</span>
    </span>
  );
}
