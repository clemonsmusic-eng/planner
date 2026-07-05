# Band Quest: Symphonica — Design Bible

The single source of truth for **gameplay and design**. Story canon lives in
[`NARRATIVE.md`](./NARRATIVE.md); the world map lives in [`MAP.md`](./MAP.md).
This document describes (a) what the game *is*, (b) the systems as they exist in
code today — with exact numbers — and (c) the design direction and open
questions we're driving toward.

> **Status legend**
> **[BUILT]** — implemented and in the code today (numbers here match source).
> **[TARGET]** — the intended end state; not built yet.
> **[OPEN]** — an unresolved design decision (see §12).

---

## 1. Vision & Pillars

Band Quest is an **educational band-class RPG**. A student picks a real
concert-band instrument and, by practicing genuine musical skills — scales,
rhythms, sight-reading, ear-training, prepared performances — powers a
Final Fantasy VI-style adventure to free ten captured maestros and mend a world
shattered by dissonance.

Design pillars:

1. **Practice is power.** Every stat gain and battle win is earned by doing a
   real musical task. The RPG is the reward layer on top of deliberate practice.
2. **A real JRPG, not a quiz with a skin.** Party building, class identity,
   status-effect combat, summons, exploration, side quests, a three-act story.
3. **FF6 as the north star.** [TARGET] A hand-pixeled, animated, walkable world —
   sprite characters, tile-mapped towns and dungeons, animated battles.
4. **Playable by everyone.** Demo Mode (silent tap-timing) and Guest Mode
   (no account) mean anyone can play instantly, mic or no mic, login or not.

---

## 2. Target Presentation — "animated à la FF6" [TARGET]

The long-term goal is to move from today's **screen/menu-driven** presentation
to an **animated, explorable** one. This section is the north star; §4 systems
are deliberately engine-agnostic so they survive the switch.

- **Zones become maps, not menus.** Today a "zone" is a page listing challenges.
  [TARGET] A zone becomes a walkable tile map (town + dungeon) where the player
  moves a sprite, and challenges/NPCs/battles are things you *walk up to and
  trigger* — exactly the FF6 town-then-dungeon rhythm.
- **Sprite characters.** The hero, classmates, NPCs, and enemies are animated
  sprites (walk cycles, idle, battle poses). We already have a demake pipeline
  producing FF6-flavored character sprites (§11).
- **Animated battles.** [TARGET] Characters step forward to attack, abilities
  play a short animation, damage floaters and screen FX punctuate hits. The
  current battle screen already has the *framing* (FF windows, cursor, floaters,
  hit flashes) — the missing piece is sprite motion.
- **Menus stay menus.** Party select, gear, quest log, fingering charts, the
  library — these remain UI screens even in the animated version.

Engine decision is [OPEN] (§12): a 2D tile engine (Phaser/PixiJS) vs. staying in
React with a sprite/canvas layer. This is decided at the vertical-slice step of
the roadmap (§13), not now.

---

## 3. Core Loop [BUILT]

```
   Practice a musical challenge  ──►  Earn XP · Resonance Points · Coins
            ▲                                   │
            │                                   ▼
   Explore zones, meet NPCs        Level up (stats grow) · buy gear · learn abilities
   take side quests                          │
            ▲                                 ▼
            └────  Win party battles  ◄── Free maestros (summons) · recruit classmates
```

The spine: **do a real musical task → get stronger → advance the story**.
Everything else (party, gear, quests, summons) hangs off that loop.

---

## 4. Instruments & Classes [BUILT]

Eleven concert-band instruments, each a **class** with distinct base stats and
per-level growth. Source: `src/lib/instruments.ts`.

| Instrument | Class | POW | ACC | TEC | END | Growth (P/A/T/E per level) |
|---|---|--:|--:|--:|--:|---|
| Flute | Wind Dancer | 8 | 18 | 14 | 8 | 0.5 / 2.0 / 1.5 / 0.5 |
| Clarinet | Chromatic Monk | 14 | 16 | 16 | 12 | 1.5 / 1.5 / 1.5 / 1.5 |
| Alto Sax | Shadow Spectre | 14 | 12 | 16 | 12 | 2.0 / 1.0 / 2.0 / 1.0 |
| Trumpet | Vanguard | 18 | 16 | 12 | 16 | 2.5 / 1.5 / 1.0 / 1.5 |
| Trombone | Slide Knight | 16 | 10 | 10 | 16 | 2.0 / 1.0 / 1.0 / 2.0 |
| Euphonium | Resonant | 12 | 16 | 10 | 20 | 1.5 / 2.0 / 1.0 / 2.5 |
| Percussion | Stryking Artificer | 12 | 12 | 16 | 12 | 1.2 / 1.2 / 2.0 / 1.2 |
| French Horn | Forest Caller | 12 | 16 | 12 | 12 | 1.5 / 2.0 / 1.5 / 1.5 |
| Tuba | Brass Bastion | 20 | 8 | 10 | 20 | 3.0 / 0.5 / 1.0 / 2.5 |
| Oboe | Crystal Mystic | 16 | 20 | 16 | 12 | 2.0 / 2.5 / 2.0 / 1.0 |
| Bassoon | Sage | 8 | 16 | 12 | 16 | 1.0 / 2.0 / 1.5 / 2.0 |

**The four stats and what they do:**

- **Power (POW)** — damage output. `ability damage = POW × abilityMultiplier × (score/100)`.
- **Accuracy (ACC)** — tightens the pitch-judging window in performance
  challenges: `pitchTolerance` = 30¢ (ACC ≤10) → 25 (≤20) → 20 (≤30) → 15 (≤40) → 10¢ (>40).
- **Technique (TEC)** — tightens the rhythm-timing window: `rhythmTolerance` =
  150ms (TEC ≤10) → 120 → 100 → 75 → 50ms (>40).
- **Endurance (END)** — survivability. **Max HP = END × 5**, and END mitigates
  incoming damage (§7).

Stat at a level = `round(base + growth × (level − 1))`.

---

## 5. Progression & Economy [BUILT]

**XP curve:** `xpToNextLevel(level) = 100 + 50 × level`. Level cap 100. On
level-up, stats recompute and HP rescales (ratio preserved).

**Three reward currencies**, all earned from rated tasks:

| Rating | XP multiplier | Resonance Points | Coins |
|---|--:|--:|--:|
| Superior | ×1.0 | 20 | 5 |
| Excellent | ×0.8 | 15 | 4 |
| Good | ×0.6 | 10 | 3 |
| Fair | ×0.3 | 5 | 2 |
| Poor | ×0.1 | 0 | 1 |

**Base XP by task type:** performance 150 · aural 75 · mini-boss 600 ·
zone-boss 1500 · side-quest (short) 500 · side-quest (long) 1000.
`XP awarded = baseXP × ratingMultiplier`. Bosses also grant coin bonuses
(mini-boss +15, zone-boss +40).

- **XP** → levels → stat growth.
- **Resonance Points (RP)** → [OPEN] currently accrued; intended sink/role to be
  finalized (§12).
- **Coins** → the **Gear Shop** (`src/pages/ShopPage.tsx`), unlocked at Zone 3 /
  Concerta.
- **Summon Points (SP)** → spent to call freed maestros in battle (§8).

---

## 6. Challenges [BUILT]

The playable musical tasks, routed by `ChallengeModal`. Ten types across three
input methods (microphone / tap / button):

- **Performance (mic or Demo tap):** `prepared_performance`, `sight_reading`,
  `technique_scale`
- **Rhythm (tap):** `rhythm_performance`
- **Aural (button/tap):** `aural_pitch_spy`, `aural_rhythm_echo`,
  `aural_melody_mapper`, `aural_interval_quest`, `aural_chord_oracle`,
  `aural_progression_master`

**Demo Mode** replaces every microphone performance with a silent tap-timing
mini-game, so the whole game is playable with no audible input. Aural/rhythm
challenges are unaffected (already silent-input). Toggle persisted per client.

Each challenge returns a **Rating** (Superior→Poor) which drives all rewards
(§5) and, in battle, ability effectiveness.

---

## 7. Battle Model [BUILT]

FF6/FF7-style party combat. Source: `src/components/BattleScreen.tsx`,
`src/lib/enemies.ts`, `src/lib/statusEffects.ts`.

- **Party:** up to **5** user-controlled members (§9) vs. **multiple** enemy
  units. Each member and enemy has its own HP bar and target picker.
- **Turn structure:** the party acts, then enemies take a sequential round.
  (ATB vs. strict turns is [OPEN] for the animated version — today it's turn-based.)
- **Acting = performing.** A member's attack is a short `prepared_performance`
  (beat count scales by act: zones 1–4 / 5–8 / 9–12). The **Rating** you earn
  scales the ability: `base damage = POW × ability.damageMultiplier × (score/100)`.
- **Abilities** (`src/lib/abilities.ts`) carry: `levelGate`, `tier`,
  `damageMultiplier`, healing/revive/AoE flags, status infliction
  (`inflicts` / `inflictsMany` on a Good-or-better hit), self-buffs, debuff/buff
  strips, and cooldowns.
- **Enemy damage formula:** `round( max( atkPower × 0.4, atkPower − targetEND × 0.5 ) )`.
  The **`ENEMY_DAMAGE_FLOOR = 0.4`** guarantees tanks can't become invincible
  (a balance fix — without it, high-END builds trivialized fights).
- **Type effectiveness:** each enemy has `vulnerableTo: InstrumentId[]`; a
  matching attacker deals **×1.5** (`EFFECTIVENESS_MULT`), surfaced with a UI
  badge. Vexus (final boss) has no weakness by design.
- **Status effects:** eight debuffs, each paired with its opposite buff —
  sleep↔alert, slow↔haste, manic↔calm, confusion↔clarity, poison↔regen,
  blind↔focus, vulnerable↔deflect, cramped↔limber. `cramped` is a hard 1-turn
  stun not cleared by damage; `sleep` breaks on damage. **Defend** persists
  through the enemy round.

---

## 8. Maestros & Summons [BUILT]

The ten captured maestros are **summons (GF/Esper-style), never party members**.
Freeing one (a zone-boss liberation) adds it as a summon you pay **Summon
Points** to call. Source: `src/lib/allies.ts`.

- SP costs range ~50–110 per maestro; **The Grand Symphony** (all ten freed)
  costs 300 and is the capstone summon.
- Freed maestros appear on the **Symphony Allies** page (`x/10 freed`).
- Restored maestro identities, liberation order, and the brothers subplot are
  canon in `NARRATIVE.md`.

---

## 9. Party & Co-op [BUILT]

Source: `src/lib/party.ts`, `src/pages/PartyPage.tsx`.

- **Up to `MAX_PARTY_SIZE = 5`** on stage, **including the hero**.
- **One instrument per party.** The hero's instrument is covered; a classmate
  of the same instrument can't also join (they wish you well and go their own
  way — a farewell variant).
- **Co-op [BUILT hook, not yet live]:** real players occupy slots and exclude
  their instruments too, via `buildParty(character, realPlayerInstruments)`.
  E.g. a clarinet hero + a flute friend ⇒ 3 NPC slots, none of them flute or
  clarinet. The rule is designed; live multiplayer sessions plug into this hook.
- Selection persists per character; an explicit empty save = a solo run.

---

## 10. Classmates, Side Quests & NPCs [BUILT]

**Classmates** (`src/lib/students.ts`) are recruitable student party members,
staggered across zones with in-zone recruitment scenes and same-instrument
farewell variants. Roster: Piper (flute, Z2) · Reed (bassoon, Z2) · Tommy
(trombone, Z3) · Benny (clarinet, Z3) · Miles (trumpet, Z3) · Gene (percussion,
Z3, the indifferent second-gen drummer who buys in at the trophy) · Otto (tuba,
Z4) · Zoot (alto sax, Z4) · Obie (oboe, Z5) · Cora (french horn, Z5).

**Side quests** (`src/lib/sidequests.ts`) are optional, source-gated errands —
they do **not** all appear at once:

- **🗣️ Favors (`npc`)** — offered when you meet the giver in their zone. A
  zone-entry encounter scene adds the quest to your log.
- **📋 Town Jobs (`job`)** — "help wanted" postings that appear on town job
  boards **after graduation** (Act 2+, i.e. Zone 5+).
- **✨ Unlocks (`unlock`)** — revealed by deeds: freeing a maestro, clearing a
  zone boss, finishing a prior quest (chains), or a level gate.

Quests reuse the challenge types (so Demo Mode works), reward side-quest XP +
coins, and are tracked in `completedQuests`. The **Quest Board** groups them
into Active / Completed / Leads & Rumors.

---

## 11. Art & Animation Direction [TARGET]

**Reference:** Final Fantasy VI (SNES) — 16-bit hand-pixeled sprites, warm
palettes, side-view battles, tile-mapped towns.

**Sprite pipeline [BUILT]:** two Python/Pillow "demake" scripts turn concept art
into game sprites:

- `scripts/make_portraits.py` — crops the original maestro lineup.
- `scripts/make_character_portraits.py` — processes per-character renders
  (flood-fills the backdrop to alpha, keeps natural proportions, pins the head
  to the top edge, quantizes to a 28-color palette, 288px tall).

Output lands in `public/portraits/` and is wired via `src/lib/portraits.ts`
(`MAESTRO_PORTRAITS`, `STUDENT_PORTRAITS`) with an emoji fallback. Portraits show
in battle, the Allies page, the party picker, and recruitment scenes.

**What "FF6-style" means concretely** [OPEN — to pin down in §12]: sprite
resolution and canvas, walk-cycle frame counts, palette size per sprite, tile
size for maps, battle-animation timing. These are decided before we scale
production so we don't redo art.

---

## 12. Open Design Questions

The collaboration surface — decisions to make together, most driving real
implementation. Add, reorder, and answer these inline.

**Presentation & engine**
1. Engine for the animated version: 2D tile engine (Phaser/PixiJS) vs. React +
   canvas/sprite layer?
2. Do zones become one contiguous overworld, or separate town/dungeon maps
   reached from a map screen (current model)?
3. How do challenges trigger in a walkable map — talk to an NPC, step on a
   music stand, enter a room?

**Combat**
4. ATB (FF6 real-time gauge) vs. strict turn-based (current)?
5. Encounters: fixed/visible on the map vs. random?
6. Should "acting = performing a mini-challenge" stay for every attack, or only
   for special abilities (basic attacks auto-resolve)? (Pacing question.)

**Systems & economy**
7. Resonance Points: finalize their role/sink (currently accrued, under-used).
8. Difficulty curve & mic-vs-Demo default for a first-time player.
9. Co-op: when/how live multiplayer sessions plug into `realPlayerInstruments`.

**Content**
10. Extend side quests / NPCs into Act 3 (Zones 9–12)?
11. Surface quest-giver NPCs *in* the zone maps (once walkable) vs. the central
    board.
12. Student portrait art for the remaining classmates (same pipeline).

---

## 13. Roadmap

The agreed sequencing (design cheap-and-first, animation expensive-and-last):

1. **Concept/design bible** — *this document.* Lock the vision, systems, and art
   direction; answer §12.
2. **Lock gameplay systems** to the depth animation needs, tuning on the current
   cheap screens.
3. **Animated vertical slice** — one town + one battle, end-to-end, to prove the
   engine and validate the FF6 feel. (Optionally a throwaway feasibility spike
   first.)
4. **Scale** the animated presentation across the game.

---

## 14. Zones & Acts [BUILT]

Twelve zones, three acts. Full story in `NARRATIVE.md`; geography in `MAP.md`.

| # | Zone | Act | Quarter | Boss / Climax |
|--:|---|:--:|---|---|
| 1 | The Rehearsal Halls | 1 | Q1 (Fall) | — |
| 2 | The Theory Wing | 1 | Q2 (Winter) | The Winter Concert |
| 3 | The City of Concerta | 1 | Q3 (Spring) | The Concerta Invitational |
| 4 | The Grand Auditorium | 1 | Q4 (Year-End) | Graduation → the Shattering |
| 5 | Melodious Meadows | 2 | Q5 | (maestro liberation) |
| 6 | Sands of Time | 2 | Q6 | (maestro liberation) |
| 7 | Clef Cliffs | 2 | Q7 | (maestro liberation) |
| 8 | Forgotten Forest | 2 | Q8 | (maestro liberation) |
| 9 | Chromatic Coasts | 3 | Q9 | (assault) |
| 10 | Syncopated Seas | 3 | Q10 | (assault) |
| 11 | Dissonant Dunes | 3 | Q11 | (assault) |
| 12 | The Hall of Discord | 3 | Q12 | Vexus (finale) |

Acts: **1** = the Academy school year (world whole) · **2** = liberation across a
Shattered world · **3** = the assault on the Hall of Discord and the Renewal.
