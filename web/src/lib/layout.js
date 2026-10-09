// Deterministic 3D layout: claims on an inner shell, each source pulled toward the
// claims that cite it, uncited sources parked on an outer shell.
import * as THREE from "three";

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

function fibSphere(i, n, r) {
  if (n === 1) return new THREE.Vector3(r, 0, 0);
  const y = 1 - (i / (n - 1)) * 2;
  const rad = Math.sqrt(1 - y * y);
  const theta = Math.PI * (3 - Math.sqrt(5)) * i;
  return new THREE.Vector3(Math.cos(theta) * rad * r, y * r * 0.8, Math.sin(theta) * rad * r);
}

export function computeLayout(report) {
  const claimPos = {};
  // A tilted ring reads as a wide ellipse from the default camera, filling the screen
  // horizontally instead of stacking claims in a vertical stripe.
  const n = report.claims.length;
  report.claims.forEach((c, i) => {
    if (n === 1) { claimPos[c.claim_id] = new THREE.Vector3(5, 0, 0); return; }
    const a = (i / n) * Math.PI * 2 + 0.5;
    claimPos[c.claim_id] = new THREE.Vector3(Math.cos(a) * 5.4, (i % 2 ? 1 : -1) * 1.4, Math.sin(a) * 5.4);
  });

  const cited = {}; // source_id -> [{claim, role}]
  report.claims.forEach((c) => {
    c.supporting_source_ids.forEach((s) => (cited[s] ??= []).push({ claim: c.claim_id, role: "for" }));
    c.contradicting_source_ids.forEach((s) => (cited[s] ??= []).push({ claim: c.claim_id, role: "against" }));
  });

  const uncited = report.sources.filter((s) => !cited[s.source_id]);
  const sourcePos = {};
  report.sources.forEach((s) => {
    const refs = cited[s.source_id];
    const j = new THREE.Vector3(hash(s.source_id + "x") - 0.5, hash(s.source_id + "y") - 0.5, hash(s.source_id + "z") - 0.5);
    if (refs) {
      const centroid = new THREE.Vector3();
      refs.forEach((r) => centroid.add(claimPos[r.claim]));
      centroid.divideScalar(refs.length);
      const dir = centroid.lengthSq() > 0.01 ? centroid.clone().normalize() : new THREE.Vector3(0, 1, 0);
      sourcePos[s.source_id] = dir.multiplyScalar(9 + hash(s.source_id) * 3.5).add(j.multiplyScalar(3.4));
    } else {
      const i = uncited.indexOf(s);
      sourcePos[s.source_id] = fibSphere(i, Math.max(uncited.length, 2), 13.5).add(j.multiplyScalar(1.5));
    }
  });
  return { claimPos, sourcePos, cited };
}
