// Solara Bay v13 — bootstrap, fixed-timestep loop, third-person camera,
// arcade driving, on-foot movement, enter/exit, mission waypoints, shot
// staging and playtest hooks. Built from scratch for the gta6-01 bounty.
import * as THREE from 'three';
import { SKY_PRESETS, SEED } from './config.js';
import { GameState } from './missions.js';
import { SkySystem } from './sky.js';
import { buildCity } from './city.js';
import { buildVehicles } from './vehicles.js';
import { buildCrowd, makePlayer, makeDownedEnemy } from './peds.js';
import { Hud } from './hud.js';
import { InputSystem } from './input.js';
import { AudioSystem } from './audio.js';
import { applyStaging } from './shots.js';

const params = new URLSearchParams(location.search);
const SHOT = params.get('shot');
const FREEZE = params.get('freeze') === '1';
const PLAYTEST = params.get('playtest') === '1';

window.__errors = [];
window.addEventListener('error', (e) => window.__errors.push(String(e.message || e.error)));
window.addEventListener('unhandledrejection', (e) => window.__errors.push(`rejection: ${e.reason}`));

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // soft shadows (r160)
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(4, 4.5, 26);

// One shadow-casting sun; the hemisphere fill carries the ambient.
const sun = new THREE.DirectionalLight(0xfff6e0, 2.9);
sun.castShadow = true;
sun.shadow.mapSize.set(SHOT ? 1024 : 2048, SHOT ? 1024 : 2048);
sun.shadow.camera.left = -90; sun.shadow.camera.right = 90;
sun.shadow.camera.top = 90; sun.shadow.camera.bottom = -90;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 320;
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun);
scene.add(sun.target);
const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x8a7a5a, 0.85);
scene.add(hemi);

const state = new GameState();
const sky = new SkySystem(scene, renderer);
const audio = new AudioSystem();
const input = new InputSystem();
const hud = new Hud(document.body);

let presetName = 'noon';
function applyPreset(name) {
  presetName = name;
  const p = SKY_PRESETS[name];
  sky.applyPreset(p);
  sun.color.setHex(p.sunColor);
  sun.intensity = p.sunIntensity;
  const el = (p.sunElevation * Math.PI) / 180;
  const az = (p.sunAzimuth * Math.PI) / 180;
  sun.position.set(Math.cos(el) * Math.sin(az) * 140, Math.sin(el) * 140, Math.cos(el) * Math.cos(az) * 140);
  hemi.color.setHex(p.hemiSky);
  hemi.groundColor.setHex(p.hemiGround);
  hemi.intensity = p.hemiIntensity;
}

applyPreset('noon');
const city = buildCity(scene, 'noon');
const vehicles = buildVehicles(scene);
const crowd = buildCrowd(scene, 26);
const player = makePlayer();
player.position.set(-6.5, 0, 22);
player.visible = false;
scene.add(player);
const downed = makeDownedEnemy();
downed.position.set(-2.6, 0, 14);
downed.rotation.y = 0.7;
scene.add(downed);
sky.buildEnvironment();

// --- driving state (arcade handling, one authority at a time)
const drive = {
  speed: 0, heading: Math.PI - 0.32, pos: new THREE.Vector3(-1.5, 0, 4),
  steer: 0, maxSpeed: 38, accel: 16, brake: 30,
};
const onFoot = { pos: new THREE.Vector3(-6.5, 0, 22), heading: Math.PI - 0.35, speed: 0 };
let metaOpen = false;
let started = false;

// Mission waypoint for mission 1: the pier at the end of the boulevard.
const WAYPOINT = new THREE.Vector3(0, 0, -62);
let waypointReached = false;

function enterCar() {
  if (!state.onFoot) return;
  state.onFoot = false;
  drive.pos.copy(onFoot.pos);
  drive.pos.x = Math.max(-6, Math.min(6, drive.pos.x));
  player.visible = false;
  vehicles.hero.visible = true;
  audio.startEngine();
  audio.blip(660);
}

function exitCar() {
  if (state.onFoot) return;
  state.onFoot = true;
  onFoot.pos.copy(drive.pos);
  onFoot.pos.x -= 3.5;
  onFoot.heading = drive.heading;
  player.visible = true;
  vehicles.hero.visible = true; // the parked car stays in the world
  audio.stopEngine();
  audio.blip(440);
}

function tick(dt) {
  // traffic follows its lane, wraps at the ends
  for (const t of vehicles.traffic) {
    // west lane faces -Z and drives -Z; east lane faces +Z and drives +Z
    const dir = t.userData.lane < 0 ? -1 : 1;
    t.position.z += dir * t.userData.speed * dt;
    if (t.position.z > 130) t.position.z = -130;
    if (t.position.z < -130) t.position.z = 130;
  }
  vehicles.heli.userData.rotor.rotation.y += dt * 18;
  vehicles.heli.position.y = 28 + Math.sin(performance.now() / 1400) * 1.2;
  city.ferris.rotation.z += dt * 0.05;
  city.yacht.position.y = 0.1 + Math.sin(performance.now() / 1800) * 0.25;
  city.yacht.rotation.z = Math.sin(performance.now() / 2400) * 0.015;
  sky.update(dt, performance.now() / 1000);

  // wanted decay: escaping far from the last known position cools the heat
  if (state.wanted > 0 && Math.abs(drive.pos.z) > 120) {
    state.setWanted(state.wanted - 1, 'escaped the search area');
  }

  if (state.onFoot) {
    const a = input.actions;
    const move = (a.forward ? 1 : 0) - (a.back ? 1 : 0);
    const turn = (a.left ? 1 : 0) - (a.right ? 1 : 0);
    onFoot.heading += turn * 2.4 * dt;
    onFoot.speed = move * 4.2;
    onFoot.pos.x += Math.sin(onFoot.heading) * onFoot.speed * dt;
    onFoot.pos.z += Math.cos(onFoot.heading) * onFoot.speed * dt;
    onFoot.pos.x = Math.max(-16, Math.min(46, onFoot.pos.x));
    onFoot.pos.z = Math.max(-130, Math.min(130, onFoot.pos.z));
    player.position.copy(onFoot.pos);
    player.rotation.y = onFoot.heading;
    // walk cycle: gentle leg swing
    const j = player.userData.joints;
    const swing = Math.sin(performance.now() / 130) * 0.45 * (move !== 0 ? 1 : 0);
    j.legs.left.hip.rotation.x = swing;
    j.legs.right.hip.rotation.x = -swing;
    j.arms.left.shoulder.rotation.x = -swing * 0.8;
    j.arms.right.shoulder.rotation.x = swing * 0.8;
    state.speedKmh = Math.abs(onFoot.speed) * 3.6;
  } else {
    const a = input.actions;
    const throttle = (a.forward ? 1 : 0) - (a.back ? 0.55 : 0);
    const steerIn = (a.left ? 1 : 0) - (a.right ? 1 : 0);
    if (throttle > 0) drive.speed += drive.accel * dt;
    else if (throttle < 0) drive.speed += drive.accel * throttle * dt;
    else drive.speed -= Math.sign(drive.speed) * Math.min(Math.abs(drive.speed), 8 * dt);
    if (a.brake) drive.speed -= Math.sign(drive.speed) * Math.min(Math.abs(drive.speed), drive.brake * dt);
    drive.speed = Math.max(-12, Math.min(drive.maxSpeed, drive.speed));
    const steer = steerIn * 0.55 * Math.min(1, Math.abs(drive.speed) / 10);
    drive.heading += steer * dt * (drive.speed >= 0 ? 1 : -1);
    drive.pos.x += Math.sin(drive.heading) * drive.speed * dt;
    drive.pos.z += Math.cos(drive.heading) * drive.speed * dt;
    drive.pos.x = Math.max(-7, Math.min(7, drive.pos.x));
    drive.pos.z = Math.max(-130, Math.min(130, drive.pos.z));
    vehicles.hero.position.copy(drive.pos);
    vehicles.hero.rotation.y = drive.heading;
    state.speedKmh = Math.abs(drive.speed) * 3.6;
    audio.setEngineSpeed(state.speedKmh);
    // mission 1 waypoint: reach the pier
    if (state.mission.id === 1 && !waypointReached && drive.pos.distanceTo(WAYPOINT) < 7) {
      waypointReached = true;
      state.advanceStage();
      audio.blip(990, 0.15);
    }
    // ramming a police unit raises the heat
    for (const p of vehicles.police) {
      if (p.position.distanceTo(drive.pos) < 3.2 && Math.abs(drive.speed) > 5) {
        state.commitCrime('ram');
        state.health = Math.max(0, state.health - 2);
        p.position.x += Math.sign(p.position.x - drive.pos.x || 1) * 1.5;
      }
    }
  }

  // edge-triggered actions
  if (input.consume('KeyE')) { if (state.onFoot) enterCar(); else exitCar(); }
  if (input.consume('KeyM')) {
    metaOpen = !metaOpen;
    if (metaOpen) hud.showMeta(state); else hud.hideMeta();
  }
  if (input.consume('F5')) { state.saveToSlot(1); audio.blip(1200, 0.1); }
  for (let n = 1; n <= 6; n++) {
    if (input.consumeDigit(n)) { state.selectWeapon(n); audio.blip(700 + n * 60, 0.05); }
  }
  for (const key of ['KeyZ', 'KeyX', 'KeyC']) {
    if (input.consume(key)) {
      const r = state.useCrewAbility(key.replace('Key', ''));
      if (!r.ok) state.policeFeed = r.reason;
      else audio.blip(880, 0.1);
    }
  }
  if (input.consume('KeyN')) {
    const names = Object.keys(SKY_PRESETS);
    const next = names[(names.indexOf(presetName) + 1) % names.length];
    applyPreset(next);
    state.radio = next === 'golden' ? '♪ Radio Mango 98.6 — "Guava Sunrise"' : state.radio;
  }
  if (state.timer > 0) state.timer -= dt;
  for (const c of state.crew) if (c.cooldown > 0) c.cooldown = Math.max(0, c.cooldown - dt);
}

// --- camera: third-person chase, with a staged override for screenshots
const camTarget = new THREE.Vector3();
let stagedCamera = null;
function updateCamera(dt) {
  if (stagedCamera) {
    camera.position.set(...stagedCamera.pos);
    camera.lookAt(...stagedCamera.look);
    return;
  }
  const anchor = state.onFoot ? onFoot.pos : drive.pos;
  const heading = state.onFoot ? onFoot.heading : drive.heading;
  const back = new THREE.Vector3(-Math.sin(heading), 0, -Math.cos(heading));
  const desired = anchor.clone().addScaledVector(back, state.onFoot ? 4.5 : 8.5);
  desired.y = anchor.y + (state.onFoot ? 2.6 : 3.6);
  desired.x += Math.cos(heading) * 1.2;
  camera.position.lerp(desired, 1 - Math.pow(0.001, dt));
  camTarget.copy(anchor).add(new THREE.Vector3(Math.sin(heading) * 4, 1.4, Math.cos(heading) * 4));
  camera.lookAt(camTarget);
}

function renderFrame() {
  const policePos = vehicles.police.map((p) => ({ x: p.position.x, z: p.position.z }));
  const playerPos = state.onFoot ? onFoot.pos : drive.pos;
  hud.update(state, playerPos, policePos);
  renderer.render(scene, camera);
}

// --- fixed-timestep loop: simulation at 60 Hz, render is presentation
let last = performance.now();
let acc = 0;
let frames = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!FREEZE) {
    acc += dt;
    while (acc >= 1 / 60) { tick(1 / 60); acc -= 1 / 60; }
  }
  updateCamera(dt);
  renderFrame();
  frames += 1;
  if (frames === 3 && (SHOT || PLAYTEST)) window.__ready = true;
}

// --- shot staging
if (SHOT) {
  const staging = applyStaging(state, SHOT);
  if (staging) {
    applyPreset(staging.preset);
    // golden hour gets the wet sunset road: warm gradient + neon streaks
    if (staging.preset === 'golden') {
      const { sunsetRoadTexture } = await import('./textures.js');
      const tex = sunsetRoadTexture();
      tex.repeat.set(1, 10);
      city.road.material.map = tex;
      city.road.material.needsUpdate = true;
    }
    stagedCamera = staging.camera;
    if (staging.hero) {
      vehicles.hero.position.set(...staging.hero.pos);
      vehicles.hero.rotation.y = staging.hero.ry;
      drive.pos.set(...staging.hero.pos);
      drive.heading = staging.hero.ry;
    }
    if (staging.player) {
      onFoot.pos.set(...staging.player.pos);
      onFoot.heading = staging.player.ry;
      player.position.copy(onFoot.pos);
      player.rotation.y = onFoot.heading;
      player.visible = true;
    }
    if (staging.downed) {
      downed.position.set(...staging.downed.pos);
      downed.rotation.y = staging.downed.ry;
    }
    if (SHOT === 'meta') {
      hud.showMeta(state);
      document.getElementById('hud').style.display = 'none';
    }
    if (SHOT === 'chase') {
      // police interceptor alongside the hero, tank at the roadblock ahead
      vehicles.police[0].position.set(-4.6, 0, 8);
      vehicles.police[0].rotation.y = Math.PI - 0.12;
      vehicles.police[1].position.set(4.4, 0, 2);
      vehicles.police[1].rotation.y = Math.PI + 0.3;
      vehicles.scooter.position.set(3.4, 0, 4);
    }
    if (SHOT === 'cover') {
      // keep the third interceptor down the road so it never crowds the camera
      vehicles.police[2].position.set(-4.5, 0, -10);
      vehicles.police[2].rotation.y = Math.PI - 0.3;
      // the downed enemy belongs to the foot mission, not the cover chase
      downed.visible = false;
    }
    if (SHOT === 'foot') {
      vehicles.hero.position.set(6.5, 0, 14);
      vehicles.hero.rotation.y = 0.2;
      vehicles.hero.visible = true;
      vehicles.police[0].position.set(-4.5, 0, -30);
      vehicles.police[1].position.set(4.2, 0, -38);
      vehicles.police[2].position.set(-3.8, 0, -20);
    }
    state.onFoot = staging.onFoot;
    if (!staging.onFoot) player.visible = false;
  }
}

// --- start screen (skipped for shots / playtest)
if (!SHOT && !PLAYTEST) {
  hud.showStart(() => {
    hud.hideStart();
    started = true;
    audio.ensure();
    audio.startEngine();
    if (state.wanted >= 2) audio.startSiren();
  });
} else {
  started = true;
}

// --- playtest hooks: the real game state, exposed for the harness
window.__game = {
  state,
  drive,
  onFoot,
  waypoint: WAYPOINT,
  waypointReached: () => waypointReached,
  enterCar,
  exitCar,
  applyPreset,
  startMission(missionId) {
    const m = state.missions.find((x) => x.id === missionId);
    if (!m) return false;
    state.missionIndex = state.missions.indexOf(m);
    state.mission = m;
    state.stage = 1;
    state.stages = m.stages;
    state.next = m.next;
    waypointReached = false;
    return true;
  },
};
window.__ready = false;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

requestAnimationFrame(loop);
