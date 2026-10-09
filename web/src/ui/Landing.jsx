import { useState } from "react";
import { motion } from "framer-motion";

const EXAMPLES = [
  "Is intermittent fasting proven to extend human lifespan?",
  "Has India's GDP growth slowed in 2026?",
  "Is Rust replacing C++ in production systems?",
  "Are lab-grown diamonds as durable as natural diamonds?",
];

const TITLE = "EvidenceLens".split("");

export default function Landing({ onAnalyze, apiUp, demo, setDemo, error }) {
  const [q, setQ] = useState("");
  const submit = (text) => text.trim() && onAnalyze(text.trim());

  return (
    <motion.div className="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.5 }}>
      <h1 className="brand" aria-label="EvidenceLens">
        {TITLE.map((ch, i) => (
          <motion.span key={i} initial={{ opacity: 0, y: 24, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ delay: 0.15 + i * 0.045, type: "spring", stiffness: 120, damping: 14 }}>
            {ch}
          </motion.span>
        ))}
      </h1>
      <motion.p className="tagline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
        Don’t just find answers.<br />Show what the evidence supports.
      </motion.p>

      <motion.form
        className="ask glass"
        onSubmit={(e) => { e.preventDefault(); submit(q); }}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, type: "spring", stiffness: 90, damping: 16 }}
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Enter a disputed or current question…" maxLength={300} autoFocus />
        <motion.button type="submit" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} disabled={!q.trim()}>
          Analyze
        </motion.button>
      </motion.form>

      {error && <div className="error-banner">{error}</div>}

      <div className="chips">
        {EXAMPLES.map((ex, i) => (
          <motion.button key={ex} className="chip glass" onClick={() => submit(ex)}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3 + i * 0.1 }}
            whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            {ex}
          </motion.button>
        ))}
      </div>

      <motion.div className="mode" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}>
        <label className="toggle">
          <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
          <span className="track"><span className="thumb" /></span>
          Demo data
        </label>
        <span className={`api-dot ${apiUp ? "up" : ""}`} />
        {apiUp ? "Live API connected" : "API offline — demo data only"}
      </motion.div>
      <div className="powered">Powered by SerpApi · Built for SerpApi India Hackathon 2026</div>
    </motion.div>
  );
}
