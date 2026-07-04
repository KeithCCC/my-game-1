# GameBlocks Usage

## Selected Modules

- `modules/math/ScalarUtils` was copied and converted to TypeScript for clamp, interpolation, and smoothing helpers used by the 2D simulation.
- `modules/math/RandomUtils` was copied and converted to TypeScript for deterministic enemy spawn placement in tests and runtime.
- `modules/gameplay/WaveSpawnDirector` was copied, converted to TypeScript, and kept generic so Space Fighter can use exact spawn budgets without bringing in 3D dependencies.

## Integration Notes

Space Fighter is a Phaser 2D side-scrolling shooter, so the Three.js and Rapier-based GameBlocks modules were intentionally not copied. The reused modules live under `src/gameblocks/modules/` with their relative module structure preserved.

The Space Fighter simulation uses the deterministic random helper and spawn-director pattern for level enemy budgets, while rendering, input, and HUD remain native Phaser/DOM code consistent with the existing project.

