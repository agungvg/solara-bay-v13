// Solara Bay v13 — the city: rounded-corner buildings with high-res smooth
// facades, a gradient road with soft lane markings, curved palm fronds,
// market stalls, the pier, the Ferris wheel and the 39 m superyacht.
// Everything is procedural geometry + canvas textures; nothing is a flat box.
import * as THREE from 'three';
import { mulberry32, range, pick } from './random.js';
import {
  facadeTexture, FACADE_PALETTES, roadTexture, sunsetRoadTexture,
  beachTexture, oceanTexture, sidewalkTexture, neonSignTexture,
  awningTexture, billboardTexture,
} from './textures.js';

function smoothMaterial(opts) {
  return new THREE.MeshStandardMaterial({ ...opts, flatShading: false });
}

// Rounded-corner building: a box with the high-res facade texture (UVs are
// 0..1 per face, so the window size is predictable: one tile per ~12 m wide
// and ~24 m tall) plus genuinely rounded corner columns, a plinth and a
// roof cap, so the silhouette corners are round, not hard 90-degree edges.
export function roundedBuilding(width, height, depth, palette, seed) {
  const tex = facadeTexture(palette, seed);
  tex.repeat.set(Math.max(1, Math.round(width / 12)), Math.max(1, Math.round(height / 24)));
  const mat = smoothMaterial({ map: tex, roughness: 0.85, metalness: 0.02 });
  const trimMat = smoothMaterial({
    color: new THREE.Color(palette.mid).multiplyScalar(0.72), roughness: 0.9,
  });
  const group = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
  box.position.y = height / 2;
  box.castShadow = true; box.receiveShadow = true;
  group.add(box);
  // rounded corner columns (16-segment cylinders) soften the silhouette
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, height, 16), trimMat);
      col.position.set(sx * (width / 2 - 0.1), height / 2, sz * (depth / 2 - 0.1));
      col.castShadow = true;
      group.add(col);
    }
  }
  // plinth + roof cap
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(width + 0.7, 0.9, depth + 0.7), trimMat);
  plinth.position.y = 0.45;
  plinth.castShadow = true;
  group.add(plinth);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(width + 0.5, 0.5, depth + 0.5),
    smoothMaterial({ color: 0x8a7a68, roughness: 0.95 }));
  cap.position.y = height + 0.25;
  cap.castShadow = true;
  group.add(cap);
  return group;
}

function groundPlane(w, d, tex, rx, rz, opts = {}) {
  const mat = smoothMaterial({ map: tex, roughness: 0.92, metalness: 0, ...opts });
  tex.repeat.set(rx, rz);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}

// Curved palm: a gently bending trunk (TubeGeometry, 24 radial segments)
// and drooping fronds — each frond is a tapered plane bent along a smooth
// parabola, never a straight triangle.
export function makePalm(rng, height = 9) {
  const palm = new THREE.Group();
  const lean = range(rng, -0.35, 0.35);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(lean * 0.3, height * 0.5, 0),
    new THREE.Vector3(lean * 0.8, height * 0.85, 0),
    new THREE.Vector3(lean, height, 0),
  ]);
  const trunkMat = smoothMaterial({ color: 0x8a6a48, roughness: 0.95 });
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.22, 12, false), trunkMat);
  trunk.castShadow = true;
  palm.add(trunk);
  const top = curve.getPoint(1);
  const frondMat = smoothMaterial({ color: 0x3fae5a, roughness: 0.8, side: THREE.DoubleSide });
  const frondMat2 = smoothMaterial({ color: 0x57c46e, roughness: 0.8, side: THREE.DoubleSide });
  const fronds = 9;
  for (let i = 0; i < fronds; i++) {
    const len = range(rng, 2.6, 3.4);
    const geo = new THREE.PlaneGeometry(len, 0.85, 10, 2);
    const pos = geo.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const x = pos.getX(v); // 0..len along the frond, centred
      const u = (x + len / 2) / len; // 0 at base, 1 at tip
      const taper = 1 - u * 0.82;
      pos.setZ(v, pos.getZ(v) * taper);
      pos.setY(v, pos.getY(v) - u * u * 1.5); // smooth droop
    }
    geo.computeVertexNormals();
    const frond = new THREE.Mesh(geo, i % 2 ? frondMat : frondMat2);
    frond.position.copy(top);
    frond.rotation.y = (i / fronds) * Math.PI * 2 + rng() * 0.3;
    frond.rotation.z = 0; // droop is baked into the geometry
    frond.translateX(len / 2 - 0.15);
    frond.rotation.x = range(rng, -0.15, 0.15);
    frond.castShadow = true;
    palm.add(frond);
  }
  // coconut cluster: small smooth spheres at the crown
  const nutMat = smoothMaterial({ color: 0x6b4a2a, roughness: 0.9 });
  for (let i = 0; i < 3; i++) {
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), nutMat);
    nut.position.set(top.x + range(rng, -0.25, 0.25), top.y - 0.25, range(rng, -0.25, 0.25));
    nut.castShadow = true;
    palm.add(nut);
  }
  return palm;
}

export function makeFerrisWheel() {
  const wheel = new THREE.Group();
  const rimMat = smoothMaterial({ color: 0xf5ead2, roughness: 0.5, metalness: 0.35 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(16, 0.55, 16, 48), rimMat);
  rim.castShadow = true;
  wheel.add(rim);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(11, 0.35, 12, 40), rimMat);
  wheel.add(inner);
  const spokeMat = smoothMaterial({ color: 0xd8c9a8, roughness: 0.5, metalness: 0.4 });
  for (let i = 0; i < 8; i++) {
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 32, 12), spokeMat);
    spoke.rotation.z = (i / 8) * Math.PI;
    wheel.add(spoke);
  }
  const hub = new THREE.Mesh(new THREE.SphereGeometry(1.4, 24, 16),
    smoothMaterial({ color: 0xffb020, roughness: 0.4, metalness: 0.3, emissive: 0x442200 }));
  wheel.add(hub);
  // gondolas: small rounded cabins hanging from the rim
  const cabMat = smoothMaterial({ color: 0xff5f8f, roughness: 0.5 });
  const cabMat2 = smoothMaterial({ color: 0x35c4e8, roughness: 0.5 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.5, 1.5), i % 2 ? cabMat : cabMat2);
    cab.position.set(Math.cos(a) * 16, Math.sin(a) * 16 - 1.2, 0);
    cab.castShadow = true;
    wheel.add(cab);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.1, 8), spokeMat);
    arm.position.set(Math.cos(a) * 16, Math.sin(a) * 16 - 0.5, 0);
    wheel.add(arm);
  }
  // A-frame legs
  const legMat = smoothMaterial({ color: 0xe8e0cc, roughness: 0.6, metalness: 0.3 });
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 17.5, 16), legMat);
    leg.position.set(side * 4.2, -8.5, 0);
    leg.rotation.z = side * 0.24;
    leg.castShadow = true;
    wheel.add(leg);
  }
  return wheel;
}

// 39 m superyacht: rounded hull (bevelled extrude), white superstructure,
// tall mast + big curved mainsail. Big enough to read as a yacht at a glance.
export function makeYacht() {
  const yacht = new THREE.Group();
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-19, 0);
  hullShape.quadraticCurveTo(-19, 2.4, -15, 2.6);
  hullShape.lineTo(12, 2.6);
  hullShape.quadraticCurveTo(19, 2.6, 19, 0.4); // bow taper
  hullShape.lineTo(15, -1.6);
  hullShape.lineTo(-15, -1.6);
  hullShape.quadraticCurveTo(-19, -1.6, -19, 0);
  const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: 7, bevelEnabled: true, bevelThickness: 0.8, bevelSize: 0.8,
    bevelSegments: 4, curveSegments: 24, steps: 1,
  });
  hullGeo.translate(0, 0, -3.5);
  const hull = new THREE.Mesh(hullGeo, smoothMaterial({
    color: 0xf2f5f7, roughness: 0.35, metalness: 0.15,
  }));
  hull.castShadow = true;
  yacht.add(hull);
  // navy waterline stripe
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(36, 0.5, 7.4),
    smoothMaterial({ color: 0x14406e, roughness: 0.5 }));
  stripe.position.set(-0.5, 0.9, 0);
  yacht.add(stripe);
  // superstructure: rounded white cabin
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(14, 2.6, 5.6),
    smoothMaterial({ color: 0xffffff, roughness: 0.4 }));
  cabin.position.set(-4, 3.6, 0);
  cabin.castShadow = true;
  yacht.add(cabin);
  const windows = new THREE.Mesh(new THREE.BoxGeometry(12, 0.9, 5.8),
    smoothMaterial({ color: 0x1a2f44, roughness: 0.15, metalness: 0.6 }));
  windows.position.set(-4, 4.1, 0);
  yacht.add(windows);
  // tall mast + boom
  const mastMat = smoothMaterial({ color: 0xd8dde2, roughness: 0.4, metalness: 0.5 });
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 20, 24), mastMat);
  mast.position.set(2, 13, 0);
  mast.castShadow = true;
  yacht.add(mast);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 11, 16), mastMat);
  boom.rotation.z = Math.PI / 2;
  boom.position.set(-3, 5.4, 0);
  yacht.add(boom);
  // mainsail: big smooth curved triangle, warm white
  const sailShape = new THREE.Shape();
  sailShape.moveTo(0, 0); sailShape.lineTo(0, 17); sailShape.lineTo(-10.5, 0.6); sailShape.closePath();
  const sailGeo = new THREE.ShapeGeometry(sailShape, 24);
  const sp = sailGeo.attributes.position;
  for (let v = 0; v < sp.count; v++) {
    sp.setZ(v, Math.sin((sp.getX(v) / -10.5) * Math.PI) * 1.1); // gentle belly
  }
  sailGeo.computeVertexNormals();
  const sail = new THREE.Mesh(sailGeo, smoothMaterial({
    color: 0xfff8ec, roughness: 0.7, side: THREE.DoubleSide,
  }));
  sail.position.set(2.3, 5.6, 0);
  sail.castShadow = true;
  yacht.add(sail);
  // radar arch + small flag
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.18, 10, 24, Math.PI),
    smoothMaterial({ color: 0xd8dde2, roughness: 0.4, metalness: 0.5 }));
  arch.position.set(-12, 5.2, 0);
  yacht.add(arch);
  return yacht;
}

function makeStall(rng, awningColor, signText) {
  const stall = new THREE.Group();
  const counter = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.0, 1.6),
    smoothMaterial({ color: 0x7a5230, roughness: 0.9 }));
  counter.position.y = 0.5; counter.castShadow = true; counter.receiveShadow = true;
  stall.add(counter);
  // goods: smooth fruit spheres in a row
  const fruitColors = [0xff5a3c, 0xffc93c, 0x7ac74f, 0xff8fb0];
  for (let i = 0; i < 8; i++) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12),
      smoothMaterial({ color: fruitColors[i % 4], roughness: 0.45 }));
    f.position.set(-1.3 + (i % 4) * 0.85, 1.12, (i < 4 ? -0.35 : 0.35));
    f.castShadow = true;
    stall.add(f);
  }
  // striped awning, tilted, soft fabric
  const awn = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 2.0),
    smoothMaterial({ map: awningTexture(awningColor), roughness: 0.85, side: THREE.DoubleSide }));
  awn.position.set(0, 2.5, 0.2);
  awn.rotation.x = -0.5;
  awn.castShadow = true;
  stall.add(awn);
  for (const side of [-1.9, 1.9]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 10),
      smoothMaterial({ color: 0x5a4632, roughness: 0.9 }));
    pole.position.set(side, 1.3, 1.0);
    stall.add(pole);
  }
  if (signText) {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65),
      new THREE.MeshBasicMaterial({ map: neonSignTexture(signText), transparent: true }));
    sign.position.set(0, 3.15, 0.4);
    stall.add(sign);
  }
  return stall;
}

export function buildCity(scene, presetName = 'noon') {
  const rng = mulberry32(1307);
  const group = new THREE.Group();
  group.name = 'city';

  // --- ground: road, sidewalks, beach, ocean
  const roadTex = presetName === 'golden' ? sunsetRoadTexture() : roadTexture();
  const road = groundPlane(16, 300, roadTex, 1, 10);
  road.position.set(0, 0.01, 0);
  group.add(road);
  const walkTex = sidewalkTexture();
  const walkW = groundPlane(7, 300, walkTex, 1, 24);
  walkW.position.set(-11.5, 0.02, 0);
  group.add(walkW);
  const walkE = groundPlane(6, 300, sidewalkTexture(), 1, 24);
  walkE.position.set(11, 0.02, 0);
  group.add(walkE);
  const beach = groundPlane(34, 300, beachTexture(), 3, 10);
  beach.position.set(31, 0.0, 0);
  group.add(beach);
  const ocean = groundPlane(360, 320, oceanTexture(), 6, 6);
  ocean.position.set(228, -0.15, 0);
  group.add(ocean);

  // --- buildings: west row + downtown cluster, all rounded + textured
  const buildings = [];
  const rowZ = [-120, -96, -72, -48, -24, 0, 26, 52, 78, 104, 128];
  for (let i = 0; i < rowZ.length; i++) {
    const w = range(rng, 13, 20), h = range(rng, 14, 38), d = range(rng, 10, 15);
    const b = roundedBuilding(w, h, d, pick(rng, FACADE_PALETTES), 100 + i * 7);
    b.position.set(range(rng, -24, -19), 0, rowZ[i]);
    b.rotation.y = range(rng, -0.04, 0.04);
    group.add(b); buildings.push(b);
  }
  // downtown glass canyon (north, taller)
  for (let i = 0; i < 5; i++) {
    const w = range(rng, 16, 22), h = range(rng, 34, 52), d = range(rng, 12, 16);
    const b = roundedBuilding(w, h, d, FACADE_PALETTES[2], 300 + i * 11);
    b.position.set(-34 - i * 9, 0, -96 - (i % 2) * 18);
    group.add(b); buildings.push(b);
  }
  // beachfront shops east of the road, low and bright
  for (let i = 0; i < 4; i++) {
    const b = roundedBuilding(range(rng, 9, 12), range(rng, 6, 9), 8, FACADE_PALETTES[i % 3], 500 + i * 13);
    b.position.set(13.5, 0, -40 + i * 26);
    group.add(b); buildings.push(b);
  }

  // --- palms: boulevard line west of the road + beach line east.
  // The FRUIT sign stall sits at z = 18 with NO palm in front of it.
  const palms = [];
  const palmZWest = [-110, -88, -64, -42, -20, -2, 30, 46, 66, 88, 112];
  for (const z of palmZWest) {
    const p = makePalm(rng, range(rng, 8, 11));
    p.position.set(-9.2, 0, z);
    group.add(p); palms.push(p);
  }
  const palmZEast = [-96, -70, -48, -26, 58, 82, 104];
  for (const z of palmZEast) {
    const p = makePalm(rng, range(rng, 7, 10));
    p.position.set(16.5, 0, z);
    group.add(p); palms.push(p);
  }

  // --- market stalls on the west sidewalk (Pasaru, z -8..30). The FRUIT
  // stall is at z = 18, clear of palms on both sides.
  const stalls = [];
  const stallDefs = [
    { z: -6, color: '#ff5f8f', sign: 'SPICE' },
    { z: 2, color: '#ff5fa8', sign: 'FRUIT' },
    { z: 10, color: '#ffc93c', sign: 'JUICE' },
    { z: 18, color: '#35c4e8', sign: null },
    { z: 26, color: '#7ac74f', sign: null },
  ];
  for (const def of stallDefs) {
    const stall = makeStall(rng, def.color, def.sign);
    stall.position.set(-13.5, 0, def.z);
    stall.rotation.y = Math.PI / 2; // face the road
    group.add(stall); stalls.push(stall);
  }

  // --- street lamps along both sidewalks
  const lampMat = smoothMaterial({ color: 0x2a2f36, roughness: 0.5, metalness: 0.6 });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff2c8, emissive: 0xffdf8a, emissiveIntensity: 1.6, roughness: 0.4,
  });
  for (let z = -100; z <= 130; z += 25) {
    for (const x of [-8.6, 8.6]) {
      const lamp = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.4, 16), lampMat);
      pole.position.y = 2.7; pole.castShadow = true;
      lamp.add(pole);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 10), lampMat);
      arm.rotation.z = Math.PI / 2;
      arm.position.set(x < 0 ? 0.6 : -0.6, 5.3, 0);
      lamp.add(arm);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), bulbMat);
      bulb.position.set(x < 0 ? 1.25 : -1.25, 5.25, 0);
      lamp.add(bulb);
      lamp.position.set(x, 0, z);
      group.add(lamp);
    }
  }

  // --- beach umbrellas + towels on the sand
  const umbrellaColors = [0xff5f8f, 0x35c4e8, 0xffc93c, 0x7ac74f, 0xff8a3c];
  for (let i = 0; i < 9; i++) {
    const u = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 10),
      smoothMaterial({ color: 0xe8e0cc, roughness: 0.8 }));
    pole.position.y = 1.2;
    u.add(pole);
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.7, 0.7, 24),
      smoothMaterial({ color: umbrellaColors[i % 5], roughness: 0.75 }));
    canopy.position.y = 2.55;
    canopy.castShadow = true;
    u.add(canopy);
    u.position.set(range(rng, 22, 40), 0, range(rng, -40, 110));
    group.add(u);
  }

  // --- pier: wooden deck running east into the ocean at z = 62
  const pier = new THREE.Group();
  const deckMat = smoothMaterial({ color: 0x9a7a52, roughness: 0.95 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(52, 0.5, 5),
    smoothMaterial({ color: 0x9a7a52, roughness: 0.95 }));
  deck.position.set(44 + 26, 0.6, 0);
  deck.castShadow = true; deck.receiveShadow = true;
  pier.add(deck);
  for (let x = 48; x <= 94; x += 7) {
    for (const dz of [-2.2, 2.2]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 2.2, 12), deckMat);
      post.position.set(x, -0.2, dz);
      pier.add(post);
    }
  }
  pier.position.set(0, 0, -62);
  group.add(pier);

  // --- Ferris wheel on the pier head, HUGE on the skyline. It faces the
  // road (no Y rotation) so the full circle reads from the boulevard.
  const ferris = makeFerrisWheel();
  ferris.position.set(24, 19, -26);
  group.add(ferris);

  // --- superyacht anchored off the beach
  const yacht = makeYacht();
  yacht.position.set(78, 0.1, -52);
  yacht.rotation.y = -0.5;
  group.add(yacht);
  const yacht2 = makeYacht();
  yacht2.scale.setScalar(0.6);
  yacht2.position.set(120, 0.1, 30);
  yacht2.rotation.y = 0.8;
  group.add(yacht2);

  // --- billboard over the boulevard
  const board = new THREE.Mesh(new THREE.PlaneGeometry(12, 6),
    new THREE.MeshBasicMaterial({ map: billboardTexture('SOLARA BAY', 'KUMALA STRAND · OPEN NOW') }));
  board.position.set(-18, 17, -58);
  board.rotation.y = 0.5;
  group.add(board);
  const boardPole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 14, 12), lampMat);
  boardPole.position.set(-18, 7, -58);
  group.add(boardPole);

  scene.add(group);
  return { group, buildings, palms, ferris, yacht, pier, stalls, road };
}
