// Solara Bay v13 — vehicles. The hero car is the smoothness showcase: a
// bevelled extruded side profile with a curved roof arch and sloped rear —
// a rounded sports coupe, never a flat orange slab. Every wheel is a
// 32-segment cylinder with a torus tyre; every body uses smooth shading.
import * as THREE from 'three';
import { mulberry32, range, pick } from './random.js';
import { policeDoorTexture } from './textures.js';

function smoothMaterial(opts) {
  return new THREE.MeshStandardMaterial({ ...opts, flatShading: false });
}

// Sports-coupe side profile: long curved hood, arched roof, sloped fastback
// rear. Extruded across the width with a bevel so every edge is rounded.
function carBodyGeometry(length = 4.6, height = 1.05, width = 1.9) {
  const s = new THREE.Shape();
  const L = length / 2;
  s.moveTo(-L + 0.15, 0.32);
  s.quadraticCurveTo(-L + 0.9, 0.28, -L + 1.55, 0.55); // rear deck rising
  s.quadraticCurveTo(-L + 2.1, 0.92, -L + 2.75, 0.98); // roof arch
  s.quadraticCurveTo(-L + 3.4, 1.0, -L + 3.9, 0.72);   // windshield slope
  s.quadraticCurveTo(L - 0.25, 0.5, L, 0.42);          // hood curve
  s.quadraticCurveTo(L + 0.08, 0.3, L - 0.05, 0.22);   // nose
  s.lineTo(-L + 0.2, 0.2);
  s.quadraticCurveTo(-L - 0.02, 0.26, -L + 0.15, 0.32);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: width - 0.36, bevelEnabled: true,
    bevelThickness: 0.18, bevelSize: 0.18, bevelSegments: 4,
    curveSegments: 24, steps: 1,
  });
  geo.translate(0, 0, -(width - 0.36) / 2);
  geo.scale(1, height / 1.05, 1);
  return geo;
}

function makeWheel(radius = 0.36) {
  const wheel = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.09, 0.1, 16, 32),
    smoothMaterial({ color: 0x14161a, roughness: 0.9 }));
  wheel.add(tyre);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius - 0.1, radius - 0.1, 0.16, 32),
    smoothMaterial({ color: 0xd8dde2, roughness: 0.25, metalness: 0.85 }));
  rim.rotation.x = Math.PI / 2;
  wheel.add(rim);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.2, 16),
    smoothMaterial({ color: 0x333a42, roughness: 0.4, metalness: 0.7 }));
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);
  wheel.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return wheel;
}

export function makeCar(color, opts = {}) {
  const { length = 4.6, dented = 0, police = false } = opts;
  const car = new THREE.Group();
  const body = new THREE.Mesh(carBodyGeometry(length), smoothMaterial({
    color, roughness: 0.28, metalness: 0.55,
  }));
  body.castShadow = true;
  car.add(body);
  // glasshouse: dark glossy canopy following the roof arch
  const glass = new THREE.Mesh(carBodyGeometry(length * 0.62, 0.5, 1.7),
    smoothMaterial({ color: 0x101c28, roughness: 0.08, metalness: 0.9 }));
  glass.position.set(-0.15, 0.62, 0);
  glass.scale.set(1, 0.9, 1);
  car.add(glass);
  // headlights: soft emissive lenses
  const lightMat = new THREE.MeshStandardMaterial({
    color: 0xfff6d8, emissive: 0xffe9a8, emissiveIntensity: 1.4, roughness: 0.2,
  });
  for (const side of [-0.62, 0.62]) {
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), lightMat);
    hl.scale.set(1, 0.7, 0.5);
    hl.position.set(length / 2 - 0.05, 0.42, side);
    car.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x881111, emissive: 0xcc2222, emissiveIntensity: 0.8 }));
    tl.position.set(-length / 2 + 0.1, 0.45, side);
    car.add(tl);
  }
  // wheels, tucked under the arches
  for (const [x, z] of [[1.45, -0.95], [1.45, 0.95], [-1.45, -0.95], [-1.45, 0.95]]) {
    const w = makeWheel();
    w.position.set(x, 0.36, z);
    car.add(w);
  }
  // spoiler: thin curved blade on the rear deck
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 1.7),
    smoothMaterial({ color: 0x1a1d22, roughness: 0.35, metalness: 0.5 }));
  spoiler.position.set(-length / 2 + 0.35, 0.78, 0);
  spoiler.rotation.z = 0.12;
  car.add(spoiler);
  if (dented > 0) {
    // dent story: a dark crumpled panel + a bent fender, never a clean car
    const dent = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12),
      smoothMaterial({ color: 0x2a2a2e, roughness: 0.85 }));
    dent.scale.set(1.4, 0.5, 0.9);
    dent.position.set(-0.6, 0.55, 0.99);
    car.add(dent);
    const scrape = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.02),
      smoothMaterial({ color: 0x666a70, roughness: 0.6, metalness: 0.7 }));
    scrape.position.set(0.7, 0.38, 0.99);
    scrape.rotation.z = 0.06;
    car.add(scrape);
  }
  if (police) {
    // full POLICE door decal on BOTH sides — wide panel, whole word legible
    const doorTex = policeDoorTexture();
    for (const side of [-1, 1]) {
      const door = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.75),
        new THREE.MeshBasicMaterial({ map: doorTex }));
      door.position.set(0.1, 0.52, side * 0.99);
      if (side < 0) door.rotation.y = Math.PI;
      car.add(door);
    }
    // light bar: red + blue beacons
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.09, 1.2),
      smoothMaterial({ color: 0x22262c, roughness: 0.4 }));
    barBase.position.set(-0.15, 1.08, 0);
    car.add(barBase);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.55),
      new THREE.MeshStandardMaterial({ color: 0xcc1122, emissive: 0xff2233, emissiveIntensity: 2.2 }));
    red.position.set(-0.15, 1.18, -0.3);
    car.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x1133cc, emissive: 0x2244ff, emissiveIntensity: 2.2 }));
    blue.position.set(-0.15, 1.18, 0.3);
    car.add(blue);
  }
  car.userData.wheels = [];
  car.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return car;
}

export function makeScooter(color = 0xff5f8f) {
  const s = new THREE.Group();
  const bodyMat = smoothMaterial({ color, roughness: 0.35, metalness: 0.4 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 0.4), bodyMat);
  deck.position.y = 0.45;
  s.add(deck);
  const front = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.9, 12), bodyMat);
  front.position.set(0.62, 0.75, 0);
  front.rotation.z = -0.35;
  s.add(front);
  for (const x of [-0.55, 0.62]) {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.08, 12, 28),
      smoothMaterial({ color: 0x14161a, roughness: 0.9 }));
    w.position.set(x, 0.26, 0);
    w.rotation.y = Math.PI / 2;
    s.add(w);
  }
  s.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return s;
}

export function makeHelicopter() {
  const heli = new THREE.Group();
  const bodyMat = smoothMaterial({ color: 0x1c2733, roughness: 0.4, metalness: 0.5 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 24), bodyMat);
  body.scale.set(1.7, 1.05, 1.05);
  body.castShadow = true;
  heli.add(body);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(1.05, 24, 16),
    smoothMaterial({ color: 0x9fd8ef, roughness: 0.1, metalness: 0.7 }));
  glass.scale.set(1, 0.8, 0.95);
  glass.position.set(1.5, 0.25, 0);
  heli.add(glass);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.5, 4.4, 16), bodyMat);
  tail.rotation.z = Math.PI / 2 - 0.12;
  tail.position.set(-3.4, 0.5, 0);
  tail.castShadow = true;
  heli.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.5, 0.14), bodyMat);
  fin.position.set(-5.4, 1.1, 0);
  heli.add(fin);
  // main rotor: two long thin blades, smooth, spinning
  const rotor = new THREE.Group();
  const bladeMat = smoothMaterial({ color: 0x2a2f36, roughness: 0.4, metalness: 0.6 });
  for (const a of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.06, 0.42), bladeMat);
    blade.rotation.y = a;
    rotor.add(blade);
  }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.7, 12), bladeMat);
  mast.position.y = 0.5;
  rotor.add(mast);
  rotor.position.y = 1.6;
  heli.add(rotor);
  heli.userData.rotor = rotor;
  // skids
  for (const z of [-0.9, 0.9]) {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.4, 10), bladeMat);
    skid.rotation.z = Math.PI / 2;
    skid.position.set(0.2, -1.45, z);
    heli.add(skid);
  }
  // searchlight cone: soft translucent beam pointing down-forward
  const coneGeo = new THREE.ConeGeometry(4.5, 26, 24, 1, true);
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfff2b8, transparent: true, opacity: 0.16,
    side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.position.set(4, -13, 0);
  cone.rotation.z = Math.PI + 0.35;
  heli.add(cone);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xffe9a8, emissiveIntensity: 3 }));
  lamp.position.set(1.9, -1.2, 0);
  heli.add(lamp);
  heli.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return heli;
}

export function makeTank() {
  const tank = new THREE.Group();
  const hullMat = smoothMaterial({ color: 0x4a5a3a, roughness: 0.8, metalness: 0.3 });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.1, 2.6), hullMat);
  hull.position.y = 0.95;
  hull.castShadow = true;
  tank.add(hull);
  for (const z of [-1.35, 1.35]) {
    const track = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.8, 0.7),
      smoothMaterial({ color: 0x22241f, roughness: 0.95 }));
    track.position.set(0, 0.45, z);
    track.castShadow = true;
    tank.add(track);
  }
  const turret = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.2, 0.8, 32), hullMat);
  turret.position.y = 1.9;
  turret.castShadow = true;
  tank.add(turret);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.2, 16),
    smoothMaterial({ color: 0x33392c, roughness: 0.6, metalness: 0.5 }));
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(2.4, 1.95, 0);
  tank.add(barrel);
  return tank;
}

export function buildVehicles(scene) {
  const rng = mulberry32(777);
  const group = new THREE.Group();
  group.name = 'vehicles';

  // hero: rounded orange Rukan Pelo GT, 62% dented in the chase shots
  const hero = makeCar(0xff5a1e, { dented: 1 });
  hero.name = 'heroCar';
  hero.position.set(-1.5, 0, 4);
  hero.rotation.y = Math.PI - 0.32; // 3/4 rear view, shape reads
  group.add(hero);

  // Oru's black Regent — the mission-6 target ahead of the hero
  const regent = makeCar(0x14181d, { length: 4.9 });
  regent.name = 'regentCar';
  regent.position.set(0.5, 0, -14);
  regent.rotation.y = 0.08;
  group.add(regent);

  // police: white KPD interceptors with full POLICE doors
  const police = [];
  const policeSpots = [
    { x: -4.5, z: -2, ry: Math.PI - 0.15 },
    { x: 4.2, z: -8, ry: Math.PI + 0.5 },
    { x: -3.8, z: 14, ry: Math.PI - 0.3 },
  ];
  for (const spot of policeSpots) {
    const p = makeCar(0xf2f4f6, { police: true });
    p.position.set(spot.x, 0, spot.z);
    p.rotation.y = spot.ry;
    group.add(p); police.push(p);
  }

  // traffic: smooth rounded cars in varied colours, parked + moving lanes
  const traffic = [];
  const trafficColors = [0xd83c2e, 0x2e7ad8, 0xe8e4da, 0x3a3f46, 0x7ac74f, 0xc9a227, 0x8a5fd0];
  const trafficSpots = [
    { x: -4.2, z: -24, ry: Math.PI - 0.05 }, { x: 4.4, z: -30, ry: 0.05 }, { x: -4.4, z: -44, ry: Math.PI + 0.04 },
    { x: 4.2, z: 8, ry: -0.06 }, { x: -4.3, z: 38, ry: Math.PI - 0.02 }, { x: 4.5, z: 52, ry: 0.02 },
    { x: -4.1, z: -62, ry: Math.PI - 0.1 }, { x: 4.3, z: -76, ry: 0.05 },
  ];
  for (let i = 0; i < trafficSpots.length; i++) {
    const s = trafficSpots[i];
    const t = makeCar(pick(rng, trafficColors), { length: range(rng, 4.2, 4.8) });
    t.position.set(s.x, 0, s.z);
    t.rotation.y = s.ry;
    t.userData.lane = s.x < 0 ? -1 : 1;
    t.userData.speed = range(rng, 7, 12);
    group.add(t); traffic.push(t);
  }

  // scooter with a rider, weaving the boulevard
  const scooter = makeScooter();
  scooter.position.set(2.6, 0, -4);
  scooter.rotation.y = 0.2;
  group.add(scooter);

  // police helicopter, BIG in the sky with its searchlight
  const heli = makeHelicopter();
  heli.position.set(6, 28, -40);
  heli.rotation.y = -0.4;
  group.add(heli);

  // KPD tank at the sunset roadblock
  const tank = makeTank();
  tank.position.set(-5.5, 0, -96);
  tank.rotation.y = 0.4;
  group.add(tank);

  scene.add(group);
  return { group, hero, regent, police, traffic, scooter, heli, tank };
}
