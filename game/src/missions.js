// Solara Bay v13 — game state: missions with staged objectives, the wanted
// state machine (patrol -> pursue -> search -> recover), crew abilities,
// weapons, saves and career progress. The HUD only presents this state;
// it never owns it.
import {
  MISSIONS, WEAPONS, CREW, POLICE_UNITS, WANTED_LEVELS,
  DISTRICTS, SAVE_SLOTS, CAREER, PROGRESS_TRACKS, WORKSHOP, PLAYER,
} from './config.js';

export class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.missionIndex = 5; // mission 6, "ORU'S FALL", the cover mission
    this.mission = MISSIONS[this.missionIndex];
    this.stage = this.mission.stage;
    this.stages = this.mission.stages;
    this.next = this.mission.next;
    this.timer = 2 * 60 + 23;
    this.wanted = 4;
    this.cash = PLAYER.cash;
    this.health = PLAYER.health;
    this.armour = PLAYER.armour;
    this.rank = PLAYER.rank;
    this.rankLabel = PLAYER.rankLabel;
    this.rp = PLAYER.rp;
    this.rpMax = PLAYER.rpMax;
    this.speedKmh = PLAYER.speedKmh;
    this.condition = PLAYER.condition;
    this.carName = PLAYER.carName;
    this.onFoot = false;
    this.weaponSlot = 3;
    this.weapons = WEAPONS;
    this.crew = CREW;
    this.units = POLICE_UNITS.map((u) => ({ ...u }));
    this.district = DISTRICTS[0];
    this.districts = DISTRICTS;
    this.saves = SAVE_SLOTS;
    this.career = CAREER;
    this.tracks = PROGRESS_TRACKS;
    this.workshop = WORKSHOP;
    this.missions = MISSIONS;
    this.inSight = true;
    this.airUnit = true;
    this.radio = '♪ OMBO 98.4 — Island Pop';
    this.clock = '12:00';
    this.hint = '';
    this.policeFeed = '';
    this.dialogue = null;
    this.completedMissions = new Set([1, 2, 3, 4, 5]);
    this.log = [];
  }

  wantedLabel() {
    return WANTED_LEVELS[this.wanted]?.label ?? 'CLEAN';
  }

  // Wanted state machine: each police unit has one mode at a time and a
  // published reason for every transition.
  setWanted(level, reason) {
    const prev = this.wanted;
    this.wanted = Math.max(0, Math.min(6, level));
    for (const u of this.units) {
      if (this.wanted >= 3) u.state = 'pursue';
      else if (this.wanted === 2) u.state = u.state === 'pursue' ? 'search' : 'patrol';
      else if (this.wanted === 0) u.state = 'recover';
      else u.state = 'patrol';
    }
    this.log.push(`wanted ${prev} -> ${this.wanted} (${reason})`);
  }

  commitCrime(kind) {
    if (kind === 'ram') this.setWanted(this.wanted + 1, 'ramming a police unit');
    else if (kind === 'shoot') this.setWanted(Math.min(6, this.wanted + 2), 'shots fired');
    else if (kind === 'steal') this.setWanted(Math.max(1, this.wanted), 'car stolen');
  }

  // Mission stage advance: returns true when the mission completes.
  advanceStage() {
    if (this.stage < this.stages) {
      this.stage += 1;
      this.log.push(`mission ${this.mission.id} stage ${this.stage}/${this.stages}`);
      return false;
    }
    this.completeMission();
    return true;
  }

  completeMission() {
    this.cash += this.mission.cash;
    this.completedMissions.add(this.mission.id);
    this.log.push(`mission ${this.mission.id} complete +$${this.mission.cash}`);
    const next = this.missions.find((m) => !this.completedMissions.has(m.id));
    if (next) {
      this.missionIndex = this.missions.indexOf(next);
      this.mission = next;
      this.stage = 1;
      this.stages = next.stages;
      this.next = next.next;
    }
  }

  useCrewAbility(key) {
    const member = this.crew.find((c) => c.key === key);
    if (!member) return { ok: false, reason: 'no crew member on that key' };
    if (member.cooldown > 0) return { ok: false, reason: `${member.name} is on cooldown (${member.cooldown}s)` };
    if (member.ability === 'SWAP PLATES') this.setWanted(Math.max(0, this.wanted - 2), 'plates swapped');
    if (member.ability === 'QUICK FIX') this.condition = Math.min(100, this.condition + 25);
    member.cooldown = 30;
    this.log.push(`crew ability: ${member.ability}`);
    return { ok: true, ability: member.ability };
  }

  selectWeapon(slot) {
    const w = this.weapons.find((x) => x.slot === slot);
    if (!w) return { ok: false, reason: 'no weapon in that slot' };
    if (w.ammo === '—') return { ok: false, reason: `${w.name} is LOCKED — buy it at the workshop` };
    this.weaponSlot = slot;
    return { ok: true, weapon: w.name };
  }

  saveToSlot(slot) {
    const s = this.saves.find((x) => x.slot === slot);
    if (!s) return false;
    s.filled = true;
    s.label = `${this.cash.toLocaleString('en-US')} $ · ${this.completedMissions.size}/8 missions · 22/11/2026`;
    try { localStorage.setItem(`solara-bay-v13-save-${slot}`, JSON.stringify(this.snapshot())); } catch { /* offline play */ }
    return true;
  }

  snapshot() {
    return {
      mission: this.mission.id, stage: this.stage, cash: this.cash,
      health: this.health, armour: this.armour, wanted: this.wanted,
      completed: [...this.completedMissions],
    };
  }

  loadFromSlot(slot) {
    try {
      const raw = localStorage.getItem(`solara-bay-v13-save-${slot}`);
      if (!raw) return false;
      const snap = JSON.parse(raw);
      this.cash = snap.cash; this.health = snap.health; this.armour = snap.armour;
      this.wanted = snap.wanted;
      this.completedMissions = new Set(snap.completed);
      return true;
    } catch { return false; }
  }
}
