# Work Log

## 2026-09-05 - Fix LP document scrolling

- Root cause: the game shell kept `html` at `height: 100%` with `overflow: hidden` even though the landing content was taller. Real wheel input left `scrollY` at0 on the production page.
- Added a synchronized landing class on `html`; the landing document now owns vertical scrolling, with content-sized body/app/game containers. Launching a game restores the original fullscreen overflow rules.
- Browser regression: real wheel input scrolled900px at desktop1280 and mobile390 widths, reached the final card, and scrolling worked after launching Super Star Trek and returning to the selector. Production build passed.

## 2026-09-05 12:55 +09:00 - ASTRA sequel and public release

- Branch: `codex/add-puzzle-games`.
- Added Page Survivor 2 — ASTRA with existing character assets, a furnished office background, weapon evolution, telegraphed bosses, original synthesized audio, touch input and saved records.
- Added a prominent LP feature panel and "ASTRA版で遊ぶ" button that opens the sequel directly from the game selector.
- Included the previously uncommitted Meteor Paint Arena game with explicit user approval.
- Validation: all 80 tests passed; production build passed; desktop/mobile LP entry and Meteor launch/return passed browser checks without page errors. Earlier sequel checks covered movement, upgrades, audio lifecycle and boss progression.
- Deployment: use the existing `keithcccs-projects/my-game-1` Vercel project. Local logs, QA output, environment files and Vercel credentials are excluded from Git/deployment.
- Known advisory: the existing Phaser bundle exceeds Vite's 500 kB warning threshold.

## 2026-06-18 07:01 +09:00 - Mobile landing scroll

- Branch: `codex/add-puzzle-games`
- Summary: Made the game selector landing page scroll reliably in mobile browser viewports.
- Changed areas: Landing body state, app/game scroll behavior, mobile-safe landing min-height, and touch scrolling.
- Validation: Ran `npm test -- --runInBand`, `npm run build`, and browser-checked a 390x844 viewport scrolling to the final game card plus launch/return class transitions.
- Known risks/follow-ups: Vite still reports the existing large bundled JS chunk warning.

## 2026-06-17 00:09 +09:00 - Puzzle collection and Super Star Trek

- Branch: `codex/add-puzzle-games`
- Summary: Expanded the selector with five compact puzzle games and a classic text-based Super Star Trek game.
- Changed areas: Game selector card model, shared DOM puzzle UI, drone/factory/merge/pipe/battle simulations, Super Star Trek simulation and terminal UI, responsive game styling, prompt source docs, and Page Survivor cleanup when returning to the selector.
- Validation: Ran `npm test -- --runInBand` with 11 suites and 57 tests passing, ran `npm run build`, and browser-smoked Super Star Trek launch/commands/helper buttons plus Page Survivor-to-selector cleanup.
- Known risks/follow-ups: Vite still reports the existing large bundled JS chunk warning; several puzzle games may still need playtest-driven UX polish.

## 2026-05-16 16:40 +09:00 - Missile Command mobile firing

- Branch: `master`
- Summary: Added mobile-specific Missile Command controls so tapping aims and fires without requiring keyboard base selection.
- Changed areas: Missile Command mobile detection, tap-to-fire handling, automatic nearest-base launcher selection, mobile help text, and short duplicate-tap firing guard.
- Validation: Ran `npm test -- __tests__/games/missile-command.test.ts`, `npm run build`, and a mobile-width browser smoke check that confirmed tap firing updates ammo.
- Known risks/follow-ups: Mobile mode is detected by viewport width or coarse pointer, so small desktop windows can intentionally use the mobile firing path.

## 2026-05-16 13:38 +09:00 - Missile Command game selector

- Branch: `master`
- Summary: Reworked the app entry into a game selector for Page Survivor and a new classic Missile Command-style game, replacing the prior Pop Star slot.
- Changed areas: Landing page DOM flow, Missile Command canvas runtime, seeded Missile Command simulation module, Jest simulation tests, classic black/neon UI styling, pause/main-menu controls, mouse aiming, explosion effects, and per-base ammo display.
- Validation: Ran `npm test -- __tests__/games/missile-command.test.ts`, `npm run build`, and browser smoke checks for launching Missile Command, mouse-aimed A/S/D firing, pause/resume, main-menu return, and per-base ammo decrement.
- Known risks/follow-ups: The Vite build still reports the existing large chunk warning because Phaser remains bundled in the main client chunk.

## 2026-05-11 22:30 +09:00 - Electron packaging

- Branch: `master`
- Summary: Added Windows Electron packaging for the existing Vite/Phaser game while preserving the browser build used by Vercel.
- Changed areas: Electron main process, Vite relative asset base, package scripts and electron-builder settings, Windows icon asset, generated release output ignore rule, and app title.
- Validation: Ran `npm test -- --runInBand`, `npm run build`, `npm run electron:pack`, `npm run electron:build`, an `electron:dev` startup smoke, and a packaged app launch smoke.
- Known risks/follow-ups: `win.signAndEditExecutable` is disabled because this Windows environment cannot extract electron-builder's winCodeSign symlinks without elevated symlink privileges. Builds are unsigned local distributions.
