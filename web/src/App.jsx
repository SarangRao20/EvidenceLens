import { Component, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import Observatory from "./scene/Observatory.jsx";
import Landing from "./ui/Landing.jsx";
import Processing from "./ui/Processing.jsx";
import { ClaimPanel, Dock, Ledger, TopBar } from "./ui/ReportUI.jsx";
import { analyzeDemo, analyzeLive, checkApi, loadDemo } from "./lib/api.js";
import { computeLayout } from "./lib/layout.js";

// If WebGL is unavailable the 3D scene fails; keep the 2D interface fully usable.
class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { console.warn("3D scene disabled:", err.message); }
  render() {
    return this.state.failed
      ? <div className="no-webgl">3D view unavailable (WebGL could not start). The evidence interface still works.</div>
      : this.props.children;
  }
}

export default function App() {
  const [stage, setStage] = useState("input"); // input | processing | report
  const [question, setQuestion] = useState("");
  const [report, setReport] = useState(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [apiUp, setApiUp] = useState(false);
  const [demo, setDemo] = useState(true);
  const [isDemoRun, setIsDemoRun] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const job = useRef(null);

  useEffect(() => {
    checkApi().then((up) => { setApiUp(up); if (up) setDemo(false); });
  }, []);

  // Deep link for demos/recordings: /?view=report&sel=C2 opens the demo report directly.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("view") !== "report") return;
    loadDemo().then((r) => {
      setReport(r); setIsDemoRun(true); setStage("report");
      if (p.get("sel")) setTimeout(() => setSelectedId(p.get("sel")), 3500);
    });
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setSelectedId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const layout = useMemo(() => (report ? computeLayout(report) : null), [report]);

  const analyze = useCallback(async (q) => {
    setQuestion(q); setError(""); setProgress(0.02); setMessage("Starting…"); setSelectedId(null);
    setStage("processing");
    const useDemo = demo || !apiUp;
    setIsDemoRun(useDemo);
    job.current = useDemo ? analyzeDemo((m, f) => { setMessage(m); setProgress(f); })
                          : analyzeLive(q, (m, f) => { setMessage(m); setProgress(f); });
    try {
      const r = await job.current.promise;
      if (!r) return; // cancelled
      setReport(r);
      setStage("report");
    } catch (e) {
      setError(e.message || "Analysis failed.");
      setStage("input");
    }
  }, [demo, apiUp]);

  const cancel = () => { job.current?.cancel(); setStage("input"); };
  const reset = () => { setReport(null); setSelectedId(null); setStage("input"); setProgress(0); };

  return (
    <div className="app">
      <div className="canvas-wrap">
        <SceneBoundary>
        <Observatory
          report={stage === "report" ? report : null}
          layout={stage === "report" ? layout : null}
          phase={stage === "report" ? "report" : stage === "processing" ? "processing" : "idle"}
          progress={progress}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={setSelectedId}
          onHover={setHoveredId}
        />
        </SceneBoundary>
      </div>

      <AnimatePresence mode="wait">
        {stage === "input" && (
          <Landing key="landing" onAnalyze={analyze} apiUp={apiUp} demo={demo || !apiUp} setDemo={setDemo} error={error} />
        )}
        {stage === "processing" && (
          <Processing key="proc" question={question} progress={progress} message={message} onCancel={cancel} />
        )}
      </AnimatePresence>

      {stage === "report" && report && (
        <>
          <TopBar report={report} onBack={reset} isDemo={isDemoRun} />
          <Dock report={report} selectedId={selectedId} hoveredId={hoveredId} onSelect={setSelectedId} onHover={setHoveredId} />
          <ClaimPanel report={report} claimId={selectedId} onClose={() => setSelectedId(null)} />
          <Ledger report={report} selectedId={selectedId} />
        </>
      )}
    </div>
  );
}
