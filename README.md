# ⚡ NEON RUSH


## Run locally
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
```
Requires Node 18+. (Fonts load from Google Fonts when online and fall back to system fonts offline.)

## How to play
Move with **WASD / arrows**, or **drag** on touch/mouse. Dodge red obstacles (a pulsing arrow warns you 0.75s before each one appears). Grab gold coins to build a **chain**, since every 3 coins in a row (within 2.2s) raises the multiplier up to x8. You have 3 hearts; a hit breaks your chain. Power-ups: **S** shield, **T** slow-mo, **M** coin magnet. `P`/`Esc` pauses (it also auto-pauses when the tab loses focus).

## Viral / replay features
Daily Challenge (seeded: same obstacle pattern for everyone on a given date), personal-best leaderboard (top 50 stored, top 10 shown, all-time and today's daily), 6 unlockable skins, 10 achievements, combo multiplier, funny game-over messages, one-click restart (Enter / Space / R), and a **Share** button that generates a 1080×1080 score card PNG (native share sheet with image on mobile; copies text on desktop; **Save card** downloads it).

## Architecture
```
src/
  main.tsx, index.css        entry + Tailwind + theme CSS (glass panels, perspective grid)
  App.tsx                    screen state machine, save state, run completion
  game/
    engine.ts                Game class: loop, input, spawning, collisions, particles, rendering (framework-free)
    data.ts                  Save schema + localStorage, skins, achievements, messages, daily seed, applyRun()
    card.ts                  Share-card renderer
  components/
    GameCanvas.tsx           mounts the engine, HUD + pause overlay (HUD updates at 10 Hz, not per frame)
    screens.tsx              Landing, Menu, Leaderboard, Skins/Achievements, GameOver
    ui.tsx                   Backdrop, Logo, NeonButton, SoundToggles
```
The engine is plain TypeScript and talks to React only through two callbacks (`onHud`, `onEnd`), so React never re-renders at 60 FPS. Obstacle/coin/power-up spawning uses a seeded RNG (`mulberry`); cosmetic effects use `Math.random`, so Daily runs stay deterministic.

## Deploy to Vercel
1. Push this folder to a GitHub repo.
2. On vercel.com choose **Add New → Project**, import the repo. Vercel detects Vite automatically (build `npm run build`, output `dist`).
3. Click **Deploy**.

Or with the CLI: `npm i -g vercel && vercel --prod`.

## Adding features
- **New skin**: add an entry to `SKINS` in `game/data.ts` (colors + an `unlock(save)` rule).
- **New achievement**: add to `ACH` in `game/data.ts`; `check(save, run)` runs after every run.
- **New obstacle type**: extend `Ob.kind` in `engine.ts`, create it in `spawnWarn()`, add a case to `hits()` and the obstacle draw loop.
- **New power-up**: add to `PowType`, `PCOL`, `PLET`; handle it in `takePow()` and the HUD chips in `GameCanvas.tsx`.
- **Tuning difficulty**: speed and spawn-rate curves live in `spawnWarn()` and `update()` (`spawnT`).
- **Global leaderboard**: keep the Daily seed, and post `RunResult` from `finish()` in `App.tsx` to any backend (Supabase, Vercel KV, etc.).
