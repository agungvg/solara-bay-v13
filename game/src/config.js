// Solara Bay v13 — game configuration: districts, missions, weapons, crew,
// police units and sky presets. All names, characters and places are original.
export const GAME_TITLE = 'SOLARA BAY';
export const GAME_SUBTITLE = 'Open-world crime on the Kumala coast';
export const SEED = 1307;

export const DISTRICTS = [
  { id: 'kumala', name: 'KUMALA STRAND', label: 'Strand Boulevard', friendly: 58, x: -6, z: 62 },
  { id: 'pasaru', name: 'PASARU MARKET', label: 'Lantern Market', friendly: 74, x: -26, z: 8 },
  { id: 'marina', name: 'MARINA DEL SOL', label: 'Yacht Basin', friendly: 41, x: 34, z: 44 },
  { id: 'downtown', name: 'DOWNTOWN', label: 'Glass Canyon', friendly: 33, x: -38, z: -30 },
  { id: 'brisa', name: 'BRISA SOUND', label: 'Sound Studios', friendly: 62, x: -20, z: -64 },
  { id: 'puerto', name: 'PUERTO VIEJO', label: 'Old Harbour', friendly: 47, x: 16, z: -52 },
  { id: 'malecon', name: 'MALECON CELESTE', label: 'Golden Mile', friendly: 66, x: 4, z: -6 },
  { id: 'alto', name: 'ALTO VISTA', label: 'Hill Mansions', friendly: 29, x: -52, z: 48 },
];

export const MISSIONS = [
  { id: 1, name: 'FIRST LIGHT', title: 'STEAL THE GETAWAY', desc: 'Lift the Rukan Pelo GT from the Kumala car park and lose the patrol.', stage: 2, stages: 3, next: 'Reach the pier', cash: 4200, rating: 'G', district: 'kumala' },
  { id: 2, name: 'LANTERN MARKET', title: 'COLLECT THE DROP', desc: 'Collect the drop in the Pasaru night market. Do not start a war.', stage: 2, stages: 4, next: 'Grab the drop', cash: 7270, rating: 'S', district: 'pasaru' },
  { id: 3, name: 'GOLDEN HOUR', title: 'OUTRUN THE SUNSET ROADBLOCK', desc: 'Outrun the sunset roadblock on the Malecon and reach the pier.', stage: 3, stages: 4, next: 'Reach the pier', cash: 12860, rating: 'G', district: 'malecon' },
  { id: 4, name: 'HIGH TIDE', title: 'SINK THE EVIDENCE', desc: 'Dump the ledger off the marina pier before the tide turns.', stage: 1, stages: 3, next: 'Reach the boat', cash: 9100, rating: 'B', district: 'marina' },
  { id: 5, name: 'GLASS CANYON', title: 'ROOFTOP HANDOFF', desc: 'Climb the downtown tower and hand off the package at dusk.', stage: 2, stages: 5, next: 'Reach the lift', cash: 15400, rating: 'S', district: 'downtown' },
  { id: 6, name: "ORU'S FALL", title: 'WRECK THE REGENT', desc: "Wreck Oru's Regent before it reaches the pier.", stage: 3, stages: 4, next: 'Vanish', cash: 18450, rating: '—', district: 'kumala' },
  { id: 7, name: 'OLD HARBOUR', title: 'GHOST THE CONVOY', desc: 'Shadow the Puerto Viejo convoy without ever being seen.', stage: 1, stages: 4, next: 'Tail the lead van', cash: 11200, rating: '—', district: 'puerto' },
  { id: 8, name: 'ALTO VISTA', title: 'THE HILL JOB', desc: 'One last score above the bay. Everything rides on this.', stage: 1, stages: 5, next: 'Case the mansion', cash: 22000, rating: '—', district: 'alto' },
];

export const WEAPONS = [
  { slot: 1, name: 'FISTS', ammo: '∞', icon: '✊' },
  { slot: 2, name: '.38', ammo: '60', icon: '🔫' },
  { slot: 3, name: 'SMG', ammo: '30/60', icon: '🔫' },
  { slot: 4, name: '12G', ammo: '18', icon: '🔫' },
  { slot: 5, name: 'AR-9', ammo: '—', icon: '🔫' },
  { slot: 6, name: 'RPG', ammo: '—', icon: '🚀' },
];

export const CREW = [
  { key: 'Z', initials: 'MK', name: 'Mira Kesang', role: 'Fixer', ability: 'SWAP PLATES', detail: 'Mira · Driver', cooldown: 0 },
  { key: 'X', initials: 'LO', name: 'Lio', role: 'Mechanic', ability: 'QUICK FIX', detail: 'Lio · Mechanic', cooldown: 21 },
  { key: 'C', initials: 'KK', name: 'Kiki', role: 'Lookout', ability: 'EYES OUT', detail: 'Kiki · Lookout', cooldown: 0 },
  { key: 'V', initials: 'JP', name: 'Juno Park', role: 'Driver', ability: 'PILAR GETAWAY', detail: 'Juno · Driver', cooldown: 30 },
  { key: 'B', initials: 'DO', name: 'Dee Okonkwo', role: 'Crew', ability: 'DEE ON 25S', detail: 'Dee · Crew', cooldown: 25 },
];

export const POLICE_UNITS = [
  { id: 'KITE-1', role: 'MARKSMAN', dist: 15, state: 'patrol' },
  { id: 'MARLIN-3', role: 'SHORE WATCH', dist: 187, state: 'patrol' },
  { id: 'CORAL-48', role: 'RAMMING', dist: 7, state: 'pursue' },
  { id: 'CORAL-85', role: 'FLANKING', dist: 14, state: 'pursue' },
  { id: 'CORAL-43', role: 'RAMMING', dist: 15, state: 'pursue' },
  { id: 'REEF-9', role: 'ROADBLOCK', dist: 240, state: 'search' },
];

// Wanted state machine: patrol -> pursue -> search -> recover, per unit.
export const WANTED_LEVELS = [
  { level: 0, label: 'CLEAN', stars: 0 },
  { level: 1, label: 'NOTICED', stars: 1 },
  { level: 2, label: 'CHASED', stars: 2 },
  { level: 3, label: 'HUNTED', stars: 3 },
  { level: 4, label: 'SWARMED', stars: 4 },
  { level: 5, label: 'LOCKDOWN', stars: 5 },
  { level: 6, label: 'MAXIMUM', stars: 6 },
];

// Sky presets: one sun direction drives sky, fog, light and clouds together.
export const SKY_PRESETS = {
  noon: {
    zenith: 0x2f7fe0, mid: 0x7ec3f2, horizon: 0xcfe9f7,
    sunColor: 0xfff6e0, sunIntensity: 2.9, sunElevation: 62, sunAzimuth: 200,
    hemiSky: 0xbfe3ff, hemiGround: 0x8a7a5a, hemiIntensity: 0.85,
    fog: 0xcfe9f7, fogDensity: 0.0016, exposure: 1.0,
    cloudTint: 0xffffff, cloudOpacity: 0.9, ambient: 0.55,
  },
  golden: {
    zenith: 0x3a2a6e, mid: 0xe06a3a, horizon: 0xffb36b,
    sunColor: 0xffb066, sunIntensity: 2.4, sunElevation: 9, sunAzimuth: 262,
    hemiSky: 0xff9a66, hemiGround: 0x5a3a2a, hemiIntensity: 0.6,
    fog: 0xff9a55, fogDensity: 0.0022, exposure: 1.05,
    cloudTint: 0xffd9b0, cloudOpacity: 0.85, ambient: 0.4,
  },
  night: {
    zenith: 0x060a24, mid: 0x101a44, horizon: 0x2a2a55,
    sunColor: 0x8fa8ff, sunIntensity: 0.35, sunElevation: -18, sunAzimuth: 40,
    hemiSky: 0x223066, hemiGround: 0x0c0a14, hemiIntensity: 0.35,
    fog: 0x141433, fogDensity: 0.003, exposure: 0.9,
    cloudTint: 0x8a8fb8, cloudOpacity: 0.5, ambient: 0.25,
  },
};

export const PLAYER = {
  carName: 'RUKAN PELO GT',
  carColor: 0xff5a1e,
  health: 72, armour: 55, cash: 18450, rank: 'B', rankLabel: 'FIXER', rp: 3900, rpMax: 5200,
  speedKmh: 111, condition: 62,
};

export const SAVE_SLOTS = [
  { slot: 1, label: '21,340 $ · 5/8 missions · 22/11/2026', filled: true },
  { slot: 2, label: 'EMPTY SLOT', filled: false },
  { slot: 3, label: 'EMPTY SLOT', filled: false },
];

export const CAREER = {
  carsStolen: 41, copsEscaped: 17, highestWanted: 4, distanceKm: 312,
  peopleTakenOut: 23, longestJumpM: 48, crewRecruited: 4, hiddenByLocals: 9,
  completion: 66.1,
};

export const PROGRESS_TRACKS = [
  { name: 'Story missions', done: 5, total: 8 },
  { name: 'Street races', done: 3, total: 6 },
  { name: 'Stunt jumps', done: 7, total: 12 },
  { name: 'Collectibles', done: 18, total: 30 },
  { name: 'Export list', done: 4, total: 10 },
  { name: 'District jobs', done: 11, total: 20 },
  { name: 'Districts friendly', done: 5, total: 8 },
  { name: 'Crew recruited', done: 4, total: 6 },
];

export const WORKSHOP = {
  garage: 'DOCK 9 GARAGE',
  mechanicQuote: '"You break it, I bill it." — Lio, Mechanic',
  upgrades: [
    { name: 'NITRO KIT', price: 2400, state: 'OWNED' },
    { name: 'ARMOUR PLATING', price: 3800, state: 'OWNED' },
    { name: 'TURBO TUNE', price: 5200, state: 'LOCKED' },
    { name: 'BULLETPROOF TYRES', price: 1900, state: 'OWNED' },
    { name: 'NEON UNDERGLOW', price: 1200, state: 'LOCKED' },
  ],
};

export const RADIO_LINES = {
  noon: '♪ OMBO 98.4',
  golden: '♪ Mango 98.6',
  night: '♪ KPD 44.1',
};
