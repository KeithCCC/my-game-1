# Page Survivor 2 Implementation Plan

> **For agentic workers:** Execute inline in this session using executing-plans; track the steps below.

**Goal:** Add the approved five-minute office survivor sequel with build variety, telegraphed bosses and original audio.

**Architecture:** Pure TypeScript simulation under `src/games/page-survivor-2`, Canvas renderer, DOM controller, Web Audio synthesizer. Existing `src/main.ts` receives one additional launcher card.

**Tech Stack:** TypeScript, Canvas 2D, Web Audio, Vite, Jest.

**Spec:** `docs/superpowers/specs/2026-09-05-page-survivor-2-design.md`

## Global Constraints
- Reuse existing character sheets; do not edit assets or existing game rules.
- Normal run lasts five minutes before the final boss can be defeated.
- Preserve existing uncommitted Meteor Paint Arena changes.
- No new runtime dependencies; Japanese player-facing copy.

## Task 1: Simulation and progression
- [x] Create behavior tests in `__tests__/games/page-survivor-2.test.ts` and observe failure with `npm test -- --runInBand page-survivor-2`.
- [x] Define `createRun(seed?: number): Run`, `updateRun(run: Run, dt: number, input: Input): void`, `chooseUpgrade(run: Run, id: UpgradeId): void` in `model.ts` / `simulation.ts` / `progression.ts`.
- [x] Verify `const s = createRun(); s.status = 'upgrade'; updateRun(s, .05, {x:1,y:0,dash:false}); expect(s.time).toBe(0)`; test real boss warning resolution and final-boss death after 300 seconds.
- [x] Implement bounded enemies/projectiles/pickups, deterministic RNG, attack cooldowns, boss phases and evolution. Run focused tests.

## Task 2: Complete playable presentation
- [x] Add `render.ts` with asset loading and camera-relative office, sprites, hazards and feedback.
- [x] Add `audio.ts` with user-gesture startup, normal/boss music, effects, volume and dispose.
- [x] Add `index.ts` / `style.css` for title, character choice, HUD, level-up, pause, settings and results. Export `mountPageSurvivor2(root: HTMLElement, onExit: () => void): {cleanup: () => void}`.
- [x] Add safe persistence and connect the launcher. Verify using `npm run build` and browser interactions.

## Task 3: Balance and verification
- [x] Exercise full five-minute simulation paths and warning/dash/boss transitions; adjust based on evidence.
- [x] Run `npm test -- --runInBand` and `npm run build`.
- [x] Browser-check desktop/mobile, sound lifecycle, upgrade keyboard controls, game selection, console errors and captured screenshots.
- [x] Document controls, evolution recipes, verification and limitations in README/work log; inspect final diff without staging unrelated work.
