# Chromatic Clusters (Expo / React Native)

Original tap-to-clear puzzle game inspired by the same general mechanics as Popstar-style games.
This project intentionally uses original UI, palette, wording, and effects.

## Tech Stack

- Expo SDK 55
- React Native + TypeScript
- expo-router
- @shopify/react-native-skia
- useReducer + Context
- AsyncStorage
- Jest (core logic unit tests)

## Install

```bash
npm install
```

## Run

```bash
npm run start
npm run android
npm run ios
npm run web
```

## Test

```bash
npm test
```

## Project Structure

- `src/core/*`: pure TypeScript game logic
- `src/components/BoardCanvasSkia.tsx`: board renderer + tap mapping
- `app/*`: screens and routing
- `data/config.json`: gameplay constants, scoring, animation timing, palette
- `data/levels.json`: stage target scores
- `__tests__/core/*.test.ts`: unit tests for board logic

## Configurable Parameters

`data/config.json`
- board size (`rows`, `cols`)
- color count (`colorCount`)
- regeneration attempts (`boardRegenerateLimit`)
- scoring coefficients (`baseMultiplier`, `bonusPerRemovedRemainder`, `minGroupSize`)
- animation timing (`clearMs`, `moveMs`)
- default input mode (`inputModeDefault`)
- palette colors (`palette`)

`data/levels.json`
- stage id / name / target score

## Gameplay Notes

- Valid tap: connected group of at least 2 cells (4-direction adjacency).
- Clear flow: clear group -> gravity drop -> empty-column shift-left.
- Game end: no valid group remains.
- Clear bonus: `max(0, maxCells - remainder) * bonusPerRemovedRemainder`.
- Input mode can be switched in Settings (`oneTap` or `confirmTap`).

## Dependencies Added

- `expo-router`
- `react-native-safe-area-context`
- `react-native-screens`
- `@react-native-async-storage/async-storage`
- `@shopify/react-native-skia`
- `jest`, `jest-expo`, `@types/jest`, `ts-jest`
