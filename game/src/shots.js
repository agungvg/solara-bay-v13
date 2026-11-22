// Solara Bay v13 — shot staging: each dossier shot is a deterministic
// staging of the same live game (camera, preset, mission, HUD state).
// Nothing here is a mock: the staged scene is the real game, frozen.
import { MISSIONS, DISTRICTS, RADIO_LINES } from './config.js';

// Camera: [position xyz, lookAt xyz]
export const SHOT_STAGING = {
  cover: {
    preset: 'noon',
    missionId: 6, stage: 3, wanted: 4, cash: 18450, clock: '12:00',
    health: 72, armour: 55, speedKmh: 111, condition: 62, onFoot: false,
    districtId: 'kumala', radio: RADIO_LINES.noon,
    camera: { pos: [4, 4.5, 26], look: [0, 4.5, -42] },
    hero: { pos: [-1.5, 0, 4], ry: Math.PI - 0.32 },
    dialogue: { initials: 'MK', name: 'MIRA KESANG', role: 'FIXER', text: "He's making for Kumala Pier! Ram the Regent before it reaches the water!" },
    hint: '', policeFeed: '',
  },
  foot: {
    preset: 'noon',
    missionId: 2, stage: 2, wanted: 2, cash: 7270, clock: '14:30',
    health: 95, armour: 27, speedKmh: 0, condition: 62, onFoot: true,
    districtId: 'pasaru', radio: RADIO_LINES.night,
    camera: { pos: [-2.0, 3.2, 33], look: [-11.5, 1.2, 0] },
    player: { pos: [-6.5, 0, 22], ry: Math.PI - 0.35 },
    downed: { pos: [-2.6, 0, 14], ry: 0.7 },
    dialogue: { initials: 'DO', name: 'DEE OKONKWO', role: 'CREW', text: 'Stall 12, under the pink awning. Take it slow — the market is watching.' },
    hint: 'DUCK BY A STALL TO HIDE',
    policeFeed: 'CORAL-48: shots fired in the Pasaru night market',
  },
  chase: {
    preset: 'golden',
    missionId: 3, stage: 3, wanted: 3, cash: 12860, clock: '17:45',
    health: 81, armour: 40, speedKmh: 111, condition: 58, onFoot: false,
    districtId: 'malecon', radio: RADIO_LINES.golden,
    camera: { pos: [2.5, 4.2, 40], look: [0, 3.5, -30] },
    hero: { pos: [-0.8, 0, 16], ry: Math.PI + 0.06 },
    dialogue: { initials: 'JP', name: 'JUNO PARK', role: 'DRIVER', text: 'Sunset roadblock on the Malecon! Thread it — the pier is past the lights.' },
    hint: '', policeFeed: '',
  },
  meta: {
    preset: 'noon',
    missionId: 6, stage: 3, wanted: 4, cash: 21340, clock: '12:00',
    health: 72, armour: 55, speedKmh: 0, condition: 62, onFoot: false,
    districtId: 'kumala', radio: RADIO_LINES.noon,
    camera: { pos: [4, 4.5, 26], look: [0, 4.5, -42] },
    hero: { pos: [-1.5, 0, 4], ry: Math.PI - 0.32 },
    dialogue: null, hint: '', policeFeed: '',
  },
};

export function applyStaging(state, shot) {
  const s = SHOT_STAGING[shot];
  if (!s) return null;
  const mission = MISSIONS.find((m) => m.id === s.missionId);
  state.missionIndex = MISSIONS.indexOf(mission);
  state.mission = mission;
  state.stage = s.stage;
  state.stages = mission.stages;
  state.next = mission.next;
  state.wanted = s.wanted;
  state.cash = s.cash;
  state.clock = s.clock;
  state.health = s.health;
  state.armour = s.armour;
  state.speedKmh = s.speedKmh;
  state.condition = s.condition;
  state.onFoot = s.onFoot;
  state.district = DISTRICTS.find((d) => d.id === s.districtId) || DISTRICTS[0];
  state.radio = s.radio;
  state.dialogue = s.dialogue;
  state.hint = s.hint;
  state.policeFeed = s.policeFeed;
  state.timer = shot === 'cover' ? 143 : shot === 'foot' ? 318 : shot === 'chase' ? 107 : 143;
  state.setWanted(s.wanted, `shot ${shot} staging`);
  return s;
}
