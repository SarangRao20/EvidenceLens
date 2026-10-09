import { motion, AnimatePresence } from "framer-motion";

export const STEPS = [
  ["Planning search queries", 0.1],
  ["Searching web, news & Scholar via SerpApi", 0.25],
  ["Normalizing & deduplicating sources", 0.4],
  ["Extracting atomic claims", 0.55],
  ["Searching for counter-evidence", 0.7],
  ["Assessing evidence", 0.85],
  ["Building report", 0.95],
];

export default function Processing({ question, progress, message, onCancel }) {
  const activeIdx = STEPS.reduce((acc, [, start], i) => (progress >= start ? i : acc), -1);
  return (
    <motion.div className="processing glass" initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ type: "spring", stiffness: 90, damping: 16 }}>
      <div className="eyebrow">Analyzing</div>
      <div className="proc-q">“{question}”</div>
      <ul className="steps">
        {STEPS.map(([label], i) => {
          const done = progress >= 1 || i < activeIdx;
          const active = i === activeIdx && progress < 1;
          return (
            <motion.li key={label} className={done ? "done" : active ? "active" : ""} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
              <span className="ico">
                <AnimatePresence mode="wait">
                  <motion.span key={done ? "d" : active ? "a" : "p"} initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.3, opacity: 0 }}>
                    {done ? "✓" : active ? <span className="spinner" /> : "○"}
                  </motion.span>
                </AnimatePresence>
              </span>
              {label}
            </motion.li>
          );
        })}
      </ul>
      <div className="bar"><motion.div className="fill" animate={{ width: `${Math.round(progress * 100)}%` }} transition={{ ease: "easeOut", duration: 0.6 }} /></div>
      <div className="proc-msg">{message}</div>
      <button className="ghost" onClick={onCancel}>Cancel</button>
    </motion.div>
  );
}
