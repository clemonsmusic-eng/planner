# Band Quest: Symphonica

An educational band-class RPG. Students pick a concert-band instrument, and
practicing real musical skills — scales, rhythms, sight-reading, ear-training,
prepared performances — powers a Final Fantasy VI-style adventure to free ten
captured maestros and mend a world shattered by dissonance.

> **Design direction:** the long-term goal is a fully animated, FF6-style
> presentation (walkable tile maps, sprite characters, animated battles). The
> current build is screen/menu-driven; the gameplay systems below are the
> engine-agnostic foundation that a later animated layer will render.

## Tech stack

- **React 18 + TypeScript + Vite** — SPA, `npm run build` = `tsc && vite build`
- **Tailwind CSS** — styling
- **Zustand** — state (`src/store/`)
- **Supabase** — accounts, characters, leaderboards (optional; **Guest Mode**
  bypasses it entirely and persists to `localStorage`)

## Getting started

```bash
npm install
npm run dev        # dev server (Vite)
npm run build      # typecheck + production build
npm run preview    # serve the built app
```

### Environment

Supabase is optional. Copy `.env.example` to `.env` and fill in your project
values to enable accounts/leaderboards; leave the defaults to develop against
**Guest Mode**, which needs no backend.

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

`.env` is gitignored.

## What's in the game

- **Instruments & classes** — 11 concert-band instruments, each a class with
  its own base stats and per-level growth (`src/lib/instruments.ts`).
- **Party battles** — FF6/FF7-style, up to 5 user-controlled members vs. multiple
  enemies (`src/components/BattleScreen.tsx`, `src/lib/party.ts`).
- **Zones & Acts** — a 12-zone campaign across three acts, from the Academy
  through the Shattering to the Hall of Discord (`src/lib/zones.ts`).
- **Classmates & maestros** — recruit student party members; free ten maestros
  who return as summons (`src/lib/students.ts`, `src/lib/allies.ts`).
- **Side quests** — NPC favors, post-graduation town jobs, and unlock-gated
  errands (`src/lib/sidequests.ts`).
- **Demo Mode** — a silent tap-timing mini-game replaces microphone challenges,
  so the whole game is playable with no audible input.
- **Guest Mode** — play instantly with no account.

## Project layout

```
src/
  components/   battle, challenge modal, scenes, portraits
  pages/        landing, hub, zones/, party, quests, shop, …
  lib/          instruments, zones, enemies, party, students, sidequests, gear
  store/        Zustand stores (game, ui, auth)
  types/        shared game types
docs/           NARRATIVE.md (story canon), MAP.md, assets
scripts/        portrait-generation pipelines (Python + Pillow)
public/         static assets incl. generated portraits
supabase/       schema / backend
```

## Documentation

- **`docs/NARRATIVE.md`** — the canonical story bible (premise, cast, the ten
  maestros, the three acts, geography).
- **`docs/MAP.md`** — world map blueprint and scale-accurate generation prompt.
