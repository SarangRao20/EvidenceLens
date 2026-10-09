// Live analysis over SSE, or a scripted run of the demo dataset.
const DEMO_STEPS = [
  ["Formulating research queries across web, news, and scholar…", 0.1, 900],
  ["Retrieving live web, news, and academic sources via SerpApi…", 0.25, 1500],
  ["Canonicalizing URLs and indexing sources…", 0.4, 900],
  ["Extracting atomic claims from verified sources…", 0.55, 1300],
  ["Formulating adversarial queries to search for counter-evidence…", 0.7, 1500],
  ["Computing epistemic consensus and source independence…", 0.85, 1100],
  ["Finalizing Evidence Matrix and Executive Summary…", 0.95, 800],
];

export async function checkApi() {
  try {
    const r = await fetch("/api/health", { signal: AbortSignal.timeout(1500) });
    return r.ok;
  } catch {
    return false;
  }
}

export async function loadDemo() {
  const r = await fetch("/demo_report.json");
  return r.json();
}

export function analyzeDemo(onProgress) {
  let cancelled = false;
  const promise = (async () => {
    for (const [msg, frac, ms] of DEMO_STEPS) {
      if (cancelled) return null;
      onProgress(msg, frac);
      await new Promise((r) => setTimeout(r, ms));
    }
    onProgress("Analysis complete!", 1);
    return loadDemo();
  })();
  return { promise, cancel: () => (cancelled = true) };
}

export function analyzeLive(question, onProgress) {
  let es;
  const promise = new Promise((resolve, reject) => {
    es = new EventSource(`/api/analyze?q=${encodeURIComponent(question)}`);
    es.addEventListener("progress", (e) => {
      const d = JSON.parse(e.data);
      onProgress(d.message, d.fraction);
    });
    es.addEventListener("result", (e) => {
      es.close();
      resolve(JSON.parse(e.data).report);
    });
    es.addEventListener("error", (e) => {
      es.close();
      // server-sent "error" events carry data; connection failures do not
      let msg = "Lost connection to the EvidenceLens API.";
      try { msg = JSON.parse(e.data).message; } catch { /* connection error */ }
      reject(new Error(msg));
    });
  });
  return { promise, cancel: () => es && es.close() };
}
