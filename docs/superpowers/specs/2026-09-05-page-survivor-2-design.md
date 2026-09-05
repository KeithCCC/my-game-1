# Page Survivor 2 — 定時サバイバー2 / ASTRA

Approved in conversation on 2026-09-05. Implement in the current project alongside all existing games.

## Experience
A five-minute office survivor run followed by the final CEO boss. Movement is manual, attacks automatic, Space dashes with brief invulnerability. Experience offers up to three paused upgrade choices (fewer when nearly maxed). Four weapons and four supporting abilities produce different builds; three weapon slots and three support slots preserve trade-offs. Level-five weapons evolve with their matching level-two support. Coffee heals, magnets collect experience, boss rewards grant upgrades. Two intermediate bosses arrive at 90 and 180 seconds; the CEO arrives at 300 seconds. Boss attacks telegraph circles, charge lanes, and volleys with gaps, and accelerate below half health. Killing the CEO after the five-minute boundary wins; zero health loses.

Use the existing male/female player sheet and five office enemy rows. Draw a dark teal office arena with warm amber signage and readable coral attack warnings. Present Japanese instructions, weapon descriptions, cooldowns, boss health, experience and health bars. Provide keyboard and touch movement, pause, retry, game selection and volume controls. Respect reduced motion. Pause on focus loss/hidden tabs. Record best performance locally with defensive storage access.

## Architecture
`src/games/page-survivor-2/` contains pure simulation and progression, independent Canvas rendering, Web Audio synthesis, persistence and a DOM mount/controller. The existing launcher calls the mount and its cleanup function. Reuse assets without editing them. No new runtime dependencies. Keep other uncommitted work intact.

Audio begins only after a user gesture. Original synthesized BGM has normal and boss arrangements. Separate music/effects gains, bounded simultaneous effects, suspension while paused, full disposal on exit. Audio failure does not prevent play.

## Validation
Jest checks pause/upgrade time freeze, progression choices, evolution, dash immunity/cooldown, warning safety and damage, milestones, final boss victory, bounded entities and deterministic repeatability. Run the complete test suite and TypeScript/Vite build. Browser-check launcher, character choice, live movement/dash, upgrades, pause/resume, audio controls, retry/exit and mobile layout. Simulate full runs with real updates to inspect pacing and bosses. Report automated evidence separately from subjective play quality.
