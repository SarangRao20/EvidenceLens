import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, QuadraticBezierLine, Sparkles, Stars } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { SOURCE_TYPE, STATUS } from "../lib/colors";
import { computeLayout } from "../lib/layout";

const HOME = new THREE.Vector3(0, 6, 25);
const NAV_W = 300; // left claim navigator covers this much width
const DRAWER_W = 460; // right detail drawer, when open
const ZERO = new THREE.Vector3();
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeOutBack = (x) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

/* ---------- core: the question ---------- */
function Core({ phase, progress }) {
  const mesh = useRef();
  const rings = useRef([]);
  const light = useRef();
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const busy = phase === "processing";
    const pulse = 1 + Math.sin(t * (busy ? 5 : 1.4)) * (busy ? 0.12 : 0.05);
    mesh.current.scale.setScalar(pulse * (phase === "report" ? 0.8 : 1));
    mesh.current.rotation.y += dt * 0.3;
    light.current.intensity = 6 + Math.sin(t * 2) * 1.5 + (busy ? progress * 6 : 0);
    rings.current.forEach((r, i) => {
      if (!r) return;
      const k = busy ? ((t * 0.55 + i / 3) % 1) : 0;
      r.scale.setScalar(1 + k * 9);
      r.material.opacity = busy ? (1 - k) * 0.5 : 0;
    });
  });
  return (
    <group>
      <pointLight ref={light} color="#7db4ff" distance={40} />
      <mesh ref={mesh}>
        <icosahedronGeometry args={[0.9, 3]} />
        <meshStandardMaterial color="#cfe3ff" emissive="#4f8cff" emissiveIntensity={2.2} roughness={0.2} toneMapped={false} />
      </mesh>
      <mesh scale={1.6}>
        <sphereGeometry args={[0.9, 32, 32]} />
        <meshBasicMaterial color="#4f8cff" transparent opacity={0.08} depthWrite={false} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(el) => (rings.current[i] = el)} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1, 0.012, 8, 96]} />
          <meshBasicMaterial color="#7db4ff" transparent opacity={0} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- decorative satellites shown while idle / searching ---------- */
function GhostField({ phase, progress }) {
  const group = useRef();
  const items = useMemo(
    () => Array.from({ length: 34 }, (_, i) => ({
      r: 5 + ((i * 37) % 100) / 100 * 9,
      speed: 0.08 + ((i * 13) % 10) / 60,
      phase: i * 1.7,
      tilt: ((i * 29) % 100) / 100 * Math.PI,
      color: ["#3b82f6", "#f59e0b", "#a855f7"][i % 3],
    })),
    []
  );
  const meshes = useRef([]);
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const target = phase === "report" ? 0 : 1;
    group.current.scale.setScalar(THREE.MathUtils.lerp(group.current.scale.x, target, 1 - Math.exp(-dt * 3)));
    const boost = phase === "processing" ? 1 + progress * 5 : 1;
    items.forEach((it, i) => {
      const m = meshes.current[i];
      if (!m) return;
      const a = t * it.speed * boost + it.phase;
      m.position.set(Math.cos(a) * it.r, Math.sin(a * 0.7 + it.tilt) * it.r * 0.35, Math.sin(a) * it.r);
      m.material.opacity = phase === "processing" ? 0.35 + progress * 0.65 : 0.35;
    });
  });
  return (
    <group ref={group}>
      {items.map((it, i) => (
        <mesh key={i} ref={(el) => (meshes.current[i] = el)}>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshBasicMaterial color={it.color} transparent toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- claim node ---------- */
function ClaimNode({ claim, matrix, pos, delay, selected, dimmed, hovered, onSelect, onHover }) {
  const group = useRef();
  const mat = useRef();
  const shell = useRef();
  const flicker = useRef();
  const born = useRef(null);
  const hs = useRef(1);
  const meta = STATUS[claim.status];
  const base = useMemo(() => new THREE.Color(meta.color), [meta.color]);
  const bright = useMemo(() => new THREE.Color(meta.color).lerp(new THREE.Color("#ffffff"), 0.45), [meta.color]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (born.current === null) born.current = t;
    const spawn = easeOutBack(clamp01((t - born.current - delay) / 0.9));
    const target = selected ? 1.5 : hovered ? 1.28 : 1;
    hs.current = THREE.MathUtils.lerp(hs.current, target, 1 - Math.exp(-dt * 8));
    group.current.scale.setScalar(Math.max(spawn, 0.0001) * hs.current);
    shell.current.rotation.y -= dt * (claim.status === "mixed" ? 1.4 : 0.35);
    shell.current.rotation.x += dt * 0.2;

    let intensity = 1.6;
    if (claim.status === "contradicted") intensity = 1.5 + Math.sin(t * 4.5) * 0.9;
    if (claim.status === "mixed") {
      intensity = 1.6 + Math.sin(t * 2.2) * 0.6;
      mat.current.color.lerpColors(base, bright, 0.5 + 0.5 * Math.sin(t * 3));
    }
    if (claim.status === "insufficient_evidence") intensity = 0.45;
    if (selected || hovered) intensity += 0.9;
    mat.current.emissiveIntensity = intensity * (dimmed ? 0.25 : 1);
    mat.current.opacity = dimmed ? 0.35 : claim.status === "insufficient_evidence" ? 0.7 : 1;

    if (flicker.current) flicker.current.visible = Math.sin(t * 26) + Math.sin(t * 11.3) > -0.4;
  });

  return (
    <group position={pos} ref={group}>
      <mesh
        onClick={(e) => { e.stopPropagation(); onSelect(claim.claim_id); }}
        onPointerOver={(e) => { e.stopPropagation(); onHover(claim.claim_id); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { onHover(null); document.body.style.cursor = "auto"; }}
      >
        <icosahedronGeometry args={[0.6, 1]} />
        <meshStandardMaterial ref={mat} color={meta.color} emissive={meta.color} flatShading transparent roughness={0.35} metalness={0.2} toneMapped={false} />
      </mesh>
      <mesh ref={shell}>
        <icosahedronGeometry args={[0.95, 1]} />
        <meshBasicMaterial color={meta.color} wireframe transparent opacity={dimmed ? 0.08 : 0.35} toneMapped={false} />
      </mesh>
      {hovered && !selected && (
        <Html center position={[0, -1.7, 0]} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div className="tooltip claim-tip" style={{ borderColor: meta.color }}>
            <b style={{ color: meta.color }}>{claim.claim_id} · {meta.label}</b>
            <div>{claim.text.length > 120 ? claim.text.slice(0, 117) + "…" : claim.text}</div>
          </div>
        </Html>
      )}
      {matrix?.is_fragile && (
        <mesh ref={flicker} rotation={[Math.PI / 2.4, 0, 0]}>
          <torusGeometry args={[1.25, 0.025, 8, 64]} />
          <meshBasicMaterial color="#ff5a5a" toneMapped={false} />
        </mesh>
      )}
      {selected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.5, 0.02, 8, 80]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.7} toneMapped={false} />
        </mesh>
      )}
      <Html zIndexRange={[0, 0]} center position={[0, 1.45, 0]} style={{ pointerEvents: "none" }}>
        <div className={`node-label claim ${selected || hovered ? "on" : ""}`} style={{ color: meta.color }}>
          {claim.claim_id}
        </div>
      </Html>
    </group>
  );
}

/* ---------- source node ---------- */
function SourceNode({ source, pos, delay, related, dimmed, onHoverSource, onPick, showLabel }) {
  const mesh = useRef();
  const mat = useRef();
  const born = useRef(null);
  const color = SOURCE_TYPE[source.source_type].color;
  const target = useMemo(() => pos.clone(), [pos]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (born.current === null) born.current = t;
    const k = clamp01((t - born.current - delay) / 1.1);
    const e = 1 - Math.pow(1 - k, 3); // easeOutCubic: fly out from the core
    mesh.current.position.copy(target).multiplyScalar(e);
    mesh.current.position.y += Math.sin(t * 0.8 + target.x) * 0.08 * e; // gentle drift
    mesh.current.scale.setScalar((k > 0 ? 0.35 + 0.65 * k : 0.0001) * (related ? 1.45 : 1));
    mat.current.emissiveIntensity = (related ? 2.4 : 1.2) * (dimmed ? 0.2 : 1);
    mat.current.opacity = dimmed ? 0.3 : 1;
  });

  return (
    <mesh
      ref={mesh}
      onPointerOver={(e) => { e.stopPropagation(); onHoverSource(source.source_id); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { onHoverSource(null); document.body.style.cursor = "auto"; }}
      onClick={(e) => { e.stopPropagation(); onPick(source.source_id); }}
    >
      <sphereGeometry args={[0.3, 20, 20]} />
      <meshStandardMaterial ref={mat} color={color} emissive={color} transparent roughness={0.4} toneMapped={false} />
      {showLabel && (
        <Html zIndexRange={[0, 0]} center position={[0, 0.62, 0]} style={{ pointerEvents: "none" }}>
          <div className="node-label source on" style={{ color }}>{source.source_id}</div>
        </Html>
      )}
    </mesh>
  );
}

/* ---------- beam + travelling pulses ---------- */
function Beam({ a, b, role, delay, state }) {
  const ref = useRef();
  const born = useRef(null);
  const mid = useMemo(() => a.clone().add(b).multiplyScalar(0.5).multiplyScalar(1.12), [a, b]);
  const color = role === "for" ? "#22c55e" : "#ef4444";

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime;
    if (born.current === null) born.current = t;
    const spawn = clamp01((t - born.current - delay - 0.7) / 0.8);
    const m = ref.current?.material;
    if (!m) return;
    const opacity = state === "selected" ? 0.95 : state === "dim" ? 0.04 : 0.3;
    m.opacity = THREE.MathUtils.lerp(m.opacity, opacity * spawn, 1 - Math.exp(-dt * 6));
    if (role === "against") m.dashOffset -= dt * 1.6;
  });

  return (
    <QuadraticBezierLine
      ref={ref}
      start={a}
      end={b}
      mid={mid}
      color={color}
      lineWidth={state === "selected" ? 3 : 1.4}
      transparent
      opacity={0}
      dashed={role === "against"}
      dashSize={0.35}
      gapSize={0.22}
      toneMapped={false}
    />
  );
}

function Pulse({ a, b, role, offset }) {
  const mesh = useRef();
  const mid = useMemo(() => a.clone().add(b).multiplyScalar(0.5).multiplyScalar(1.12), [a, b]);
  useFrame((s) => {
    const t = ((s.clock.elapsedTime * 0.35 + offset) % 1);
    // flow from the source toward the claim
    const k = 1 - t, u = 1 - k;
    mesh.current.position.set(
      u * u * b.x + 2 * u * k * mid.x + k * k * a.x,
      u * u * b.y + 2 * u * k * mid.y + k * k * a.y,
      u * u * b.z + 2 * u * k * mid.z + k * k * a.z
    );
    mesh.current.scale.setScalar(0.6 + Math.sin(t * Math.PI) * 0.8);
  });
  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[0.1, 10, 10]} />
      <meshBasicMaterial color={role === "for" ? "#86efac" : "#fca5a5"} toneMapped={false} />
    </mesh>
  );
}

/* ---------- camera ---------- */
function CameraRig({ controls, flying, focus, phase, panelOpen, resetNonce }) {
  const { camera, size } = useThree();
  const shift = useRef(0);
  useEffect(() => {
    flying.current = true;
    const id = setTimeout(() => (flying.current = false), 2400);
    return () => clearTimeout(id);
  }, [focus, flying, resetNonce]);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    if (flying.current) {
      const k = 1 - Math.exp(-dt * 2.6);
      camera.position.lerp(focus ? focus.cam : HOME, k);
      c.target.lerp(focus ? focus.target : ZERO, k);
    }
    // Keep the action centred in the space not covered by the navigator / detail drawer.
    const wide = size.width > 900;
    const want = phase === "report" && wide ? (NAV_W - (panelOpen ? DRAWER_W : 0)) / 2 : 0;
    shift.current = THREE.MathUtils.lerp(shift.current, want, 1 - Math.exp(-dt * 4));
    if (Math.abs(shift.current) > 0.5) camera.setViewOffset(size.width, size.height, -shift.current, 0, size.width, size.height);
    else camera.clearViewOffset();
    c.update();
  });
  return null;
}

/* ---------- scene ---------- */
function Scene({ report, layout, phase, progress, selectedId, hoveredId, onSelect, onHover, resetNonce, autoRotate = true }) {
  const controls = useRef();
  const flying = useRef(false);
  const [hoverSource, setHoverSource] = useState(null);
  const [pickedSource, setPickedSource] = useState(null);
  useEffect(() => setPickedSource(null), [selectedId]);

  const matrixById = useMemo(
    () => Object.fromEntries((report?.evidence_matrix || []).map((m) => [m.claim_id, m])),
    [report]
  );

  const selectedClaim = report?.claims.find((c) => c.claim_id === selectedId) || null;
  const related = useMemo(() => {
    if (!selectedClaim) return new Set();
    return new Set([...selectedClaim.supporting_source_ids, ...selectedClaim.contradicting_source_ids]);
  }, [selectedClaim]);

  // Camera view for a selected claim: look at the claim + its sources from the side.
  const focus = useMemo(() => {
    if (!selectedClaim || !layout) return null;
    const cp = layout.claimPos[selectedClaim.claim_id];
    const pts = [cp, ...[...related].map((id) => layout.sourcePos[id])];
    const center = pts.reduce((acc, p) => acc.add(p), new THREE.Vector3()).divideScalar(pts.length);
    const dir = cp.clone().normalize();
    let side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
    if (side.lengthSq() < 0.01) side = new THREE.Vector3(1, 0, 0);
    side.normalize();
    // Pull back far enough that the whole cluster fits the strip left free between dock and panel.
    const radius = Math.max(...pts.map((p) => p.distanceTo(center)));
    const dist = Math.max(17, radius * 3.4);
    return { target: center, cam: center.clone().add(side.multiplyScalar(dist)).add(new THREE.Vector3(0, 3, 0)) };
  }, [selectedClaim, layout, related]);

  const links = useMemo(() => {
    if (!report || !layout) return [];
    const out = [];
    report.claims.forEach((c, ci) => {
      c.supporting_source_ids.forEach((s) => out.push({ claim: c.claim_id, source: s, role: "for", ci }));
      c.contradicting_source_ids.forEach((s) => out.push({ claim: c.claim_id, source: s, role: "against", ci }));
    });
    return out;
  }, [report, layout]);

  const hasSel = !!selectedId;
  return (
    <>
      <color attach="background" args={["#05060b"]} />
      <fog attach="fog" args={["#05060b", 28, 70]} />
      <ambientLight intensity={0.35} />
      <Stars radius={90} depth={50} count={3500} factor={4} saturation={0} fade speed={0.6} />
      <Sparkles count={110} scale={[34, 20, 34]} size={2.2} speed={0.25} opacity={0.5} color="#8fb4ff" />

      <Core phase={phase} progress={progress} />
      <GhostField phase={phase} progress={progress} />

      {report && layout && (
        <group key={report.generated_at}>
          {report.claims.map((c, i) => (
            <group key={c.claim_id}>
              <QuadraticBezierLine
                start={ZERO} end={layout.claimPos[c.claim_id]} mid={layout.claimPos[c.claim_id].clone().multiplyScalar(0.5)}
                color={STATUS[c.status].color} lineWidth={1} transparent opacity={hasSel && selectedId !== c.claim_id ? 0.05 : 0.35}
              />
              <ClaimNode
                claim={c}
                matrix={matrixById[c.claim_id]}
                pos={layout.claimPos[c.claim_id]}
                delay={0.3 + i * 0.22}
                selected={selectedId === c.claim_id}
                hovered={hoveredId === c.claim_id}
                dimmed={hasSel && selectedId !== c.claim_id}
                onSelect={onSelect}
                onHover={onHover}
              />
            </group>
          ))}
          {report.sources.map((s, i) => (
            <SourceNode
              key={s.source_id}
              source={s}
              pos={layout.sourcePos[s.source_id]}
              delay={0.9 + i * 0.07}
              related={related.has(s.source_id)}
              dimmed={hasSel && !related.has(s.source_id)}
              showLabel={related.has(s.source_id) || hoverSource === s.source_id}
              onHoverSource={setHoverSource}
              onPick={setPickedSource}
            />
          ))}
          {links.map((l, i) => {
            const state = !hasSel ? "idle" : selectedId === l.claim ? "selected" : "dim";
            return (
              <Beam
                key={`${l.claim}-${l.source}-${l.role}`}
                a={layout.claimPos[l.claim]}
                b={layout.sourcePos[l.source]}
                role={l.role}
                delay={0.9 + l.ci * 0.22 + i * 0.03}
                state={state}
              />
            );
          })}
          {selectedClaim &&
            links
              .filter((l) => l.claim === selectedId)
              .map((l, i) => (
                <Pulse key={`p-${l.source}-${l.role}`} a={layout.claimPos[l.claim]} b={layout.sourcePos[l.source]} role={l.role} offset={(i * 0.37) % 1} />
              ))}
          {pickedSource && (() => {
            const s = report.sources.find((x) => x.source_id === pickedSource);
            const at = layout.sourcePos[pickedSource].clone().add(new THREE.Vector3(0, 1.1, 0));
            return (
              <Html position={at} center zIndexRange={[30, 0]}>
                <div className="scene-card">
                  <div className="sc-head">
                    <b className="mono">{s.source_id}</b>
                    <span className="tt-dom">{SOURCE_TYPE[s.source_type].label}</span>
                    <button className="sc-x" onClick={() => setPickedSource(null)} aria-label="Dismiss source">✕</button>
                  </div>
                  <div className="sc-title">{s.title}</div>
                  <div className="tt-dom">{s.domain}{s.published_at ? ` · ${s.published_at}` : ""}</div>
                  <a className="sc-open" href={s.url} target="_blank" rel="noopener noreferrer">Open source ↗</a>
                </div>
              </Html>
            );
          })()}
          {hoverSource && (() => {
            const s = report.sources.find((x) => x.source_id === hoverSource);
            return (
              <Html position={layout.sourcePos[hoverSource]} center zIndexRange={[0, 0]} style={{ pointerEvents: "none" }}>
                <div className="tooltip">
                  <b>{s.source_id}</b> · {s.title}
                  <div className="tt-dom">{s.domain} · {s.source_type} — click to open</div>
                </div>
              </Html>
            );
          })()}
        </group>
      )}

      <OrbitControls
        ref={controls}
        enableDamping
        dampingFactor={0.06}
        minDistance={5}
        maxDistance={45}
        autoRotate={autoRotate && !hasSel && phase !== "processing"}
        autoRotateSpeed={0.45}
        onStart={() => (flying.current = false)}
      />
      <CameraRig controls={controls} flying={flying} focus={focus} phase={phase} panelOpen={hasSel} resetNonce={resetNonce} />

      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur luminanceThreshold={0.2} intensity={1.15} radius={0.75} />
        <Vignette eskil={false} offset={0.2} darkness={0.85} />
      </EffectComposer>
    </>
  );
}

export default function Observatory({ report, active = true, ...rest }) {
  const layout = useMemo(() => (report ? computeLayout(report) : null), [report]);
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      camera={{ position: HOME.toArray(), fov: 55, near: 0.1, far: 200 }}
      dpr={[1, 1.5]}
      gl={{ antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: new URLSearchParams(window.location.search).has("capture") }}
      onPointerMissed={() => rest.onSelect?.(null)}
    >
      <Scene {...rest} report={report} layout={layout} />
    </Canvas>
  );
}
