# EvidenceLens Observatory (3D frontend)

React + Framer Motion, with an optional Three.js evidence map. The report is a conventional,
document-style interface: summary, claims with evidence counts, a per-claim evidence panel, a sources table,
and a method/limitations page. The 3D "Evidence map" is a secondary tab (lazy-loaded) that shows how claims
connect to sources: green solid = supports, red dashed = contradicts.

## Run
```bash
# terminal 1: API (stdlib only; needs .env keys for live runs)
cd evidencelens && .venv/bin/python server.py        # http://127.0.0.1:8000

# terminal 2: frontend
cd evidencelens/web && npm install && npm run dev    # http://localhost:5173
```
With no API running (or "demo data" toggled on) the UI plays the bundled demo report
(`public/demo_report.json`, placeholder `*.example` domains, labeled DEMO DATA).

Deep link: `/?view=report&tab=summary|claims|map|sources|method&sel=C2`.

## Layout
- `src/App.jsx`: stage flow (landing → processing → report) and the shared 3D background
- `src/ui/Report.jsx`: report shell (top bar, tabs, keyboard navigation)
- `src/ui/Summary.jsx`, `Claims.jsx`, `SourcesTab.jsx`, `MethodTab.jsx`: report pages
- `src/ui/MapHud.jsx`: claim navigator and detail drawer over the 3D map
- `src/ui/ClaimDetail.jsx`: single-claim view with prev/next, shared by the Claims page and the map
- `src/scene/Observatory.jsx`: the 3D scene (animated core, claim and source nodes, beams, bloom)
- `src/lib/colors.js`: status / source-type labels and colors; `layout.js`: deterministic 3D positions; `api.js`: SSE client + demo player

Keyboard: `←` / `→` move between claims, `Esc` clears the selection.
