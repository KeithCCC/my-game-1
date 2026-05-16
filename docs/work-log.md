# Work Log

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
