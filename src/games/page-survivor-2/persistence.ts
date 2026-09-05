import type { AudioSettings } from './audio';
export type Records = { wins: number; bestKills: number; bestTime: number; runs: number };
const KEY = 'page-survivor-2-astra';
function read(): Record<string, unknown> {
  try { const data: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}'); return data && typeof data === 'object' ? data as Record<string, unknown> : {}; }
  catch { return {}; }
}
const number = (v: unknown, fallback: number): number => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback;
export function loadRecords(): Records {
  const r = read(); return { wins: number(r.wins, 0), bestKills: number(r.bestKills, 0), bestTime: number(r.bestTime, 0), runs: number(r.runs, 0) };
}
export function loadAudio(): AudioSettings {
  const r = read(); return { music: Math.min(1, number(r.music, .45)), effects: Math.min(1, number(r.effects, .65)), muted: r.muted === true };
}
export function save(values: Partial<Records & AudioSettings>): void {
  try { localStorage.setItem(KEY, JSON.stringify({ ...read(), ...values })); } catch { /* Storage may be disabled; the run remains playable. */ }
}
