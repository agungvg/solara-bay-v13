# Solara Bay v13

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/agungvg/solara-bay-v13/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/agungvg/solara-bay-v13/reward.svg)](https://make.fun/bounty/gta6-01)

An open-world crime game in the spirit of GTA 6, built for the
[make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01) — a fresh
rebuild from zero. v13's whole point is **smoothness**: higher-resolution
procedural textures, rounded geometry everywhere, soft shading and
anti-aliasing, so nothing reads blocky or pixelated at a glance.

## The game

Kumala Bay: eight districts, one orange Rukan Pelo GT, and the KPD on
your tail. Steal the car, lose the tail, wreck Oru's Regent before it
reaches Kumala Pier — then keep going through eight story missions
across the Strand, the Lantern Market, the Marina and the Golden Mile.

- **Smoothness first** — 1024×1024 canvas textures with gradients and
  soft noise (facades, road, beach, ocean), rounded building corners,
  a bevelled rounded hero car shown in 3/4 rear view, curved drooping
  palm fronds, soft white clouds with no grey undersides, antialiasing
  on, pixel ratio up to 2, smooth shading on every organic shape.
- **Daytime beachfront** — bright noon sky with big fluffy clouds,
  a 39 m superyacht anchored off the sand, a Ferris wheel on the
  beach, fanned palms, umbrellas and crowds.
- **Golden-hour chase** — the sunset roadblock on the Malecon, neon
  reflections on wet asphalt, a police heli overhead.
- **Six KPD units** with named roles (marksman, shore watch, ramming,
  flanking), a wanted state machine (patrol → pursue → search →
  recover), heat and escape.
- **Six weapons** (fists, .38, SMG, 12G, AR-9, RPG), a crew with
  abilities (swap plates, quick fix, eyes out), a workshop with
  upgrades, and a real eight-district city map with a 66.1%
  completion ring, mission ratings and three save slots.
- **Jointed pedestrians** — arms and legs that bend at the elbow and
  knee, five body builds, varied proportions — no doll silhouettes.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Play with WASD to drive / walk, E to enter and exit cars, SPACE for
the handbrake, 1–6 to switch weapons, Z/X/C for crew abilities, M for
the map & stats screen, F5 for a quick save, N to cycle noon / golden
hour / night. `?shot=cover|foot|chase|meta&freeze=1` stages the four
screenshots; `?playtest=1` runs mission 1 end to end.

## Build it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `game/` and
`screenshots/` into the output directory and writes `dossier.json`
with the vendored make.fun library.

## Tech

- three.js r160 (vendored as `game/three.module.min.js`), WebGL, ACES
  tone mapping, PCFSoftShadowMap, procedural canvas textures — no
  network requests, no external assets.
- 13 hand-written ES modules under `game/src/`: config, random,
  textures, sky, city, vehicles, peds, missions, hud, input, audio,
  shots, plus the main bootstrap — each with one clear job.
