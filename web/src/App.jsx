import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig } from "framer-motion";
import Landing from "./ui/Landing.jsx";
import Processing from "./ui/Processing.jsx";
import Report from "./ui/Report.jsx";
import { analyzeDemo, analyzeLive, checkApi, loadDemo } from "./lib/api.js";

// Three.js is code-split: the landing renders immediately and the scene arrives after it.
const Observatory = lazy(() => import("./scene/Observatory.jsx"));

// If WebGL is unavailable the 3D scene fails; the report itself stays fully usable.
class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { console.warn("3D scene disabled:", err.message); }
  render() {
    return this.state.failed
      ? <div className="scene-fallback">3D view unavailable on this device. Every claim is still available in the Claims tab.</div>
      : this.props.children;
  }
}

const TABS = ["summary", "claims", "map", "sources", "method"];
const FILTERS = ["supported", "contradicted", "mixed", "insufficient_evidence"];

// The report's view state lives in the URL, so reloads, shared links and Back/Forward all work.
const readUrl = () => {
  const p = new URLSearchParams(window.location.search);
  const filter = p.get("filter");
  return {
    isReport: p.get("view") === "report",
    tab: TABS.includes(p.get("tab")) ? p.get("tab") : "summary",
    sel: p.get("sel"),
    filter: FILTERS.includes(filter) ? filter : null,
  };
};

const buildUrl = ({ tab, sel, filter }) => {
  const p = new URLSearchParams({ view: "report", tab });
  if (sel) p.set("sel", sel);
  if (filter) p.set("filter", filter);
  return `${window.location.pathname}?${p}`;
};

export default function App() {
  const initial = useRef(readUrl()).current;
  const [stage, setStage] = useState(() => (initial.isReport ? "loading" : "input")); // loading | input | processing | report
  const [question, setQuestion] = useState("");
  const [report, setReport] = useState(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [apiUp, setApiUp] = useState(false);
  const [demo, setDemo] = useState(true);
  const [isDemoRun, setIsDemoRun] = useState(false);
  const [tab, setTab] = useState(initial.tab);
  const [selectedId, setSelectedId] = useState(initial.sel);
  const [claimFilter, setClaimFilter] = useState(initial.filter);
  const [hoveredId, setHoveredId] = useState(null);
  const [viewNonce, setViewNonce] = useState(0); // bump to fly the 3D camera back to the overview
  const [autoRotate, setAutoRotate] = useState(true);
  const job = useRef(null);
  const reportRef = useRef(null);
  reportRef.current = report;
  const lastNav = useRef(null);

  useEffect(() => {
    checkApi().then((up) => { setApiUp(up); if (up) setDemo(false); });
  }, []);

  // Deep link for demos/recordings: /?view=report&tab=map&sel=C2 opens the demo report directly.
  useEffect(() => {
    if (!initial.isReport) return;
    loadDemo().then((r) => { setReport(r); setIsDemoRun(true); setStage("report"); });
  }, [initial.isReport]);

  // Mirror the report view into the URL. A tab change adds a history entry; selection changes replace it.
  useEffect(() => {
    if (stage !== "report") return;
    const url = buildUrl({ tab, sel: selectedId, filter: claimFilter });
    if (url === window.location.pathname + window.location.search) return;
    const prev = lastNav.current;
    const newEntry = !prev || prev.tab !== tab;
    if (newEntry) window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
    lastNav.current = { tab };
  }, [stage, tab, selectedId, claimFilter]);

  // Back/Forward: restore the report view from the URL, or return to the landing page.
  useEffect(() => {
    const onPop = () => {
      const u = readUrl();
      if (!u.isReport) { setStage("input"); lastNav.current = null; return; }
      if (!reportRef.current) return;
      setTab(u.tab); setSelectedId(u.sel); setClaimFilter(u.filter);
      setStage("report");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const analyze = useCallback(async (q) => {
    setQuestion(q); setError(""); setProgress(0.02); setMessage("Starting…");
    setSelectedId(null); setTab("summary"); setClaimFilter(null);
    setStage("processing");
    const useDemo = demo || !apiUp;
    setIsDemoRun(useDemo);
    const onProgress = (m, f) => { setMessage(m); setProgress(f); };
    job.current = useDemo ? analyzeDemo(onProgress) : analyzeLive(q, onProgress);
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
  const reset = () => {
    setStage("input"); setSelectedId(null); setProgress(0);
    lastNav.current = null;
    window.history.pushState(null, "", window.location.pathname);
  };
  const go = (nextTab, opts = {}) => {
    setTab(nextTab);
    if ("sel" in opts) setSelectedId(opts.sel);
    if ("filter" in opts) setClaimFilter(opts.filter);
  };
  const resetView = () => { setSelectedId(null); setViewNonce((n) => n + 1); };

  const sceneOn = stage !== "report" || tab === "map";
  const sceneReport = stage === "report" ? report : null;

  return (
    <MotionConfig reducedMotion="user">
      <div className={`scene-layer ${sceneOn ? "on" : ""}`}>
        <SceneBoundary>
          <Suspense fallback={null}>
            <Observatory
              active={sceneOn}
              report={sceneReport}
              phase={stage === "processing" ? "processing" : sceneReport ? "report" : "idle"}
              progress={progress}
              selectedId={sceneReport ? selectedId : null}
              hoveredId={hoveredId}
              onSelect={setSelectedId}
              onHover={setHoveredId}
              resetNonce={viewNonce}
              autoRotate={autoRotate}
            />
          </Suspense>
        </SceneBoundary>
      </div>

      <AnimatePresence mode="wait">
        {stage === "input" && (
          <Landing key="landing" onAnalyze={analyze} apiUp={apiUp} demo={demo || !apiUp} setDemo={setDemo} error={error} />
        )}
        {stage === "processing" && (
          <Processing key="proc" question={question} progress={progress} message={message} onCancel={cancel} />
        )}
        {stage === "report" && report && (
          <Report
            key={report.generated_at}
            report={report}
            isDemo={isDemoRun}
            onBack={reset}
            tab={tab}
            onNavigate={go}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onHover={setHoveredId}
            claimFilter={claimFilter}
            onFilter={setClaimFilter}
            onResetView={resetView}
            autoRotate={autoRotate}
            onToggleRotate={() => setAutoRotate((v) => !v)}
          />
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
