# Kam's Math All-Stars (v2)

Private, family-only math app. React + TypeScript + Vite, installable PWA, works offline.

This folder is its own app. The `Kailynn's Learning World` scaffold at the repo root is untouched.

## Run it

```bash
cd kam-math-all-stars
npm install
npm run dev        # http://localhost:5173
npm test           # math-engine property tests + data tests
npm run e2e        # builds, then plays the main flows on an iPad-sized screen
npm run build      # tests + typecheck + production build into dist/
```

To try it on the iPad: `npm run build && npx vite preview --host`, open the address it prints in Safari,
then Share → Add to Home Screen. (Offline mode and install need HTTPS, so for real use deploy `dist/`
to a host such as Vercel with this folder as the project root.)

## Phase 1 status

- All prototype features ported: 18 levels, The Climb (with Super Rungs and unlock offer), four problem
  formats, Ways to solve with every strategy and visual, narrated lessons, four themes, mastery rule,
  bonus problems, Coach's Corner.
- Progress: every answer is written to IndexedDB (Dexie) the moment it is given. Stats are computed from
  that attempt log. Settings from the old single-file prototype are picked up on first run.
- Coach's Corner is behind a 4-digit parent PIN, with JSON export/import (import merges, never overwrites).
- Cloud sync (Supabase) is written but **not yet connected to a project**. See below.

## Phase 2 status

- **Ballgame mode** (`src/game/`, `src/screens/Ballgame.tsx`): team setup, pick-your-pitch at-bats, strikes and
  strikeouts, exit-velocity bonus from his own average time, baserunning, pitching (build a problem) and
  fielding (quick decisions) in alternating bottom halves, scoreboard with line score, announcer, sound
  effects with a mute button, 3/6/9 innings, and a player card that shows how each stat is figured.
  A game in progress is saved after every play.
- House rules added to keep games finite: a half inning ends after 5 runs, and a tie gets at most 2 extra innings.
- **Read-along** (`src/lib/speech.ts`, `src/components/ReadAlong.tsx`): word-by-word highlighting from the
  browser's word events, with a timed fallback; tap any word to hear it; three help levels; tapped words
  are listed in Coach's Corner.
- Season mode, standings and collectibles are Phase 5.

## Cloud sync setup (needs a Supabase project)

1. Create a Supabase project for the family and run the files in `supabase/migrations/` in order.
2. Copy `.env.example` to `.env.local` and fill in the project URL and anon (publishable) key.
3. In Coach's Corner → Cloud sync, create the family account once, then sign in on each device.

Merge rules (`src/db/merge.ts`): attempt history is the union of all devices; settings take the most
recent change per field; unlocked level and best climb keep the higher value unless a parent has since
changed or erased them.

## Layout

- `src/engine/` – generators, strategies, formats, visuals. Pure, seedable, no UI.
- `src/content/` – levels, themes and story text, lesson scripts.
- `src/db/` – Dexie storage, attempt log, merge rules, derived stats.
- `src/sync/` – Supabase background sync.
- `src/screens/`, `src/components/` – the UI.
- `tests/` – Vitest. `e2e/` – Playwright flows.
