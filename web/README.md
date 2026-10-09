# EvidenceLens Observatory (3D frontend)

React + Three.js (react-three-fiber) + Framer Motion. The question is a glowing core; claims orbit it
(colored by status), sources fly out and cluster around the claims that cite them, and beams connect
them: solid green = supports, dashed red = contradicts. Click a node or a matrix row to fly the camera in.

## Run
```bash
# terminal 1: API (stdlib only; needs .env keys for live runs)
cd evidencelens && .venv/bin/python server.py        # http://127.0.0.1:8000

# terminal 2: frontend
cd evidencelens/web && npm install && npm run dev    # http://localhost:5173
```
With no API running (or "Demo data" toggled on) the UI plays the bundled demo report
(`public/demo_report.json`, placeholder `*.example` domains, labeled DEMO DATA).

Deep link for recordings: `/?view=report&sel=C2`. Add `&capture` for headless screenshots.

## Layout
- `src/scene/Observatory.jsx`: the 3D scene (core, claim/source nodes, beams, camera rig, bloom)
- `src/lib/layout.js`: deterministic positions; `src/lib/api.js`: SSE client + demo player
- `src/ui/`: Landing, Processing, ReportUI (matrix dock, claim panel, ledger)
