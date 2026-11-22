// Solara Bay v13 — pedestrians. Jointed figures: shoulders, elbows, hips and
// knees are real pivot spheres, so limbs bend instead of being one stiff
// slab. Five body builds (slim, average, heavy, tall, short) with varied
// skin, shirts and trousers. The downed enemy is unmistakably a body: red
// shirt, splayed limbs, red ring on the ground.
import * as THREE from 'three';
import { mulberry32, range, pick } from './random.js';

function smoothMaterial(opts) {
  return new THREE.MeshStandardMaterial({ ...opts, flatShading: false });
}

const SKINS = [0x8a5a3b, 0xc98d64, 0xe8b98a, 0x6b4226, 0xf0c8a0];
const SHIRTS = [0x2e7ad8, 0xd83c2e, 0x7ac74f, 0xffc93c, 0x8a5fd0, 0xe8e4da, 0x35c4e8, 0xff5f8f];
const PANTS = [0x2a2f36, 0x3a4a6b, 0x5a4632, 0x1c2733, 0x6b6f75];

export const PED_BUILDS = {
  slim: { height: 1.78, shoulder: 0.38, torso: 0.2, leg: 0.85 },
  average: { height: 1.74, shoulder: 0.46, torso: 0.26, leg: 0.82 },
  heavy: { height: 1.7, shoulder: 0.56, torso: 0.36, leg: 0.78 },
  tall: { height: 1.92, shoulder: 0.48, torso: 0.27, leg: 0.95 },
  short: { height: 1.58, shoulder: 0.42, torso: 0.24, leg: 0.72 },
};

function limbSegment(radius, length, mat) {
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.85, radius, length, 12), mat);
  mesh.position.y = -length / 2;
  mesh.castShadow = true;
  g.add(mesh);
  const joint = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.05, 12, 10), mat);
  g.add(joint);
  return g;
}

export function makePed(buildName, rng, opts = {}) {
  const build = PED_BUILDS[buildName] || PED_BUILDS.average;
  const shirt = opts.shirt ?? pick(rng, SHIRTS);
  const pants = opts.pants ?? pick(rng, PANTS);
  const skin = opts.skin ?? pick(rng, SKINS);
  const shirtMat = smoothMaterial({ color: shirt, roughness: 0.85 });
  const pantsMat = smoothMaterial({ color: pants, roughness: 0.9 });
  const skinMat = smoothMaterial({ color: skin, roughness: 0.7 });

  const ped = new THREE.Group();
  ped.name = 'ped';
  const legLen = build.leg;
  const hipY = legLen + 0.08;

  // torso: rounded box (scaled sphere-ish box with bevel look via a capsule)
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(build.torso / 2 + 0.06, 0.42, 6, 16), shirtMat);
  torso.position.y = hipY + 0.34;
  torso.scale.set(build.shoulder / 0.46, 1, 1);
  torso.castShadow = true;
  ped.add(torso);

  // head: smooth sphere + hair cap
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 20, 16), skinMat);
  head.position.y = hipY + 0.78;
  head.castShadow = true;
  ped.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.118, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    smoothMaterial({ color: opts.hair ?? 0x1c1410, roughness: 0.9 }));
  hair.position.y = hipY + 0.8;
  ped.add(hair);

  // arms: shoulder pivot -> upper arm -> elbow joint -> forearm -> hand
  const arms = {};
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * build.shoulder * 0.55, hipY + 0.58, 0);
    const upper = limbSegment(0.05, 0.3, shirtMat);
    shoulder.add(upper);
    const elbow = new THREE.Group();
    elbow.position.y = -0.3;
    const fore = limbSegment(0.045, 0.28, skinMat);
    elbow.add(fore);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), skinMat);
    hand.position.y = -0.3;
    elbow.add(hand);
    upper.add(elbow);
    shoulder.rotation.z = side * 0.12;
    ped.add(shoulder);
    arms[side < 0 ? 'left' : 'right'] = { shoulder, elbow };
  }

  // legs: hip pivot -> thigh -> knee joint -> shin -> shoe
  const legs = {};
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.11, hipY, 0);
    const thigh = limbSegment(0.07, legLen * 0.52, pantsMat);
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -legLen * 0.52;
    const shin = limbSegment(0.06, legLen * 0.48, pantsMat);
    knee.add(shin);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.24),
      smoothMaterial({ color: 0x22262c, roughness: 0.7 }));
    shoe.position.set(0, -legLen * 0.48 - 0.03, 0.04);
    knee.add(shoe);
    thigh.add(knee);
    ped.add(hip);
    legs[side < 0 ? 'left' : 'right'] = { hip, knee };
  }

  ped.userData.joints = { arms, legs, head, torso };
  ped.userData.build = buildName;
  // gentle idle sway pose so the crowd never reads as mannequins
  const sway = range(rng, -0.08, 0.08);
  arms.left.shoulder.rotation.x = sway;
  arms.right.shoulder.rotation.x = -sway;
  return ped;
}

// The player character on foot: teal shirt, cap, backpack.
export function makePlayer(rng = mulberry32(99)) {
  const player = makePed('average', rng, { shirt: 0x2a9d8f, pants: 0x2a2f36 });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
    smoothMaterial({ color: 0xe8e4da, roughness: 0.85 }));
  cap.position.y = 1.72;
  player.add(cap);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.14),
    smoothMaterial({ color: 0x8a5fd0, roughness: 0.85 }));
  pack.position.set(0, 1.28, -0.22);
  player.add(pack);
  return player;
}

// Downed enemy: clearly a body — red shirt, limbs splayed, red ring marker.
export function makeDownedEnemy(rng = mulberry32(98)) {
  const g = new THREE.Group();
  g.name = 'downedEnemy';
  const enemy = makePed('heavy', rng, { shirt: 0xd83c2e, pants: 0x2a2f36 });
  enemy.rotation.x = -Math.PI / 2 + 0.12; // lying on the back
  enemy.rotation.z = 0.35;
  enemy.position.y = 0.16;
  // splay the limbs
  const j = enemy.userData.joints;
  j.arms.left.shoulder.rotation.z = 1.2;
  j.arms.right.shoulder.rotation.z = -1.1;
  j.arms.left.elbow.rotation.x = -0.5;
  j.arms.right.elbow.rotation.x = -0.4;
  j.legs.left.hip.rotation.x = 0.5;
  j.legs.right.hip.rotation.x = -0.35;
  j.legs.left.knee.rotation.x = 0.7;
  j.legs.right.knee.rotation.x = 0.4;
  g.add(enemy);
  // red ring on the ground around the body
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.07, 12, 40),
    new THREE.MeshStandardMaterial({
      color: 0xdd2233, emissive: 0xff2233, emissiveIntensity: 1.2, roughness: 0.5,
    }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  g.add(ring);
  // dropped pistol beside the body
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.08),
    smoothMaterial({ color: 0x1c1f24, roughness: 0.4, metalness: 0.7 }));
  gun.position.set(0.9, 0.08, 0.7);
  gun.rotation.y = 0.7;
  g.add(gun);
  return g;
}

export function buildCrowd(scene, count = 26) {
  const rng = mulberry32(5150);
  const group = new THREE.Group();
  group.name = 'crowd';
  const builds = Object.keys(PED_BUILDS);
  // dense market crowd on the west sidewalk, z -10..30
  for (let i = 0; i < count; i++) {
    const ped = makePed(pick(rng, builds), rng);
    ped.position.set(range(rng, -14.5, -9.5), 0, range(rng, -12, 32));
    ped.rotation.y = range(rng, 0, Math.PI * 2);
    group.add(ped);
  }
  // beachgoers on the sand
  for (let i = 0; i < 8; i++) {
    const ped = makePed(pick(rng, builds), rng, { shirt: pick(rng, [0xff5f8f, 0x35c4e8, 0xffc93c]) });
    ped.position.set(range(rng, 20, 42), 0, range(rng, -20, 100));
    ped.rotation.y = range(rng, 0, Math.PI * 2);
    group.add(ped);
  }
  // a few walkers on the east sidewalk
  for (let i = 0; i < 5; i++) {
    const ped = makePed(pick(rng, builds), rng);
    ped.position.set(range(rng, 9.5, 13.5), 0, range(rng, -40, 60));
    ped.rotation.y = range(rng, 0, Math.PI * 2);
    group.add(ped);
  }
  scene.add(group);
  return group;
}
