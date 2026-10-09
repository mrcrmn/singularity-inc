import { newState, tick, recordHistory, type State } from './engine';

const KEY = 'singularity-inc-save-v1';
const MAX_OFFLINE = 8 * 3600;

export interface SavedGame { state: State; savedAt: number }

export function save(s: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ state: s, savedAt: Date.now() } satisfies SavedGame));
  } catch {
    // storage full or blocked: the game still works, it just won't persist
  }
}

export function load(): SavedGame | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedGame;
    // fill fields added after the save was written
    parsed.state = { ...newState(parsed.state.universe ?? 1), ...parsed.state };
    return parsed;
  } catch {
    return null;
  }
}

export function wipe() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export interface OfflineReport { seconds: number; money: number; gens: number }

// Fast-forward the simulation for the time the tab was closed.
export function applyOffline(s: State, savedAt: number): OfflineReport | null {
  const seconds = Math.min(MAX_OFFLINE, (Date.now() - savedAt) / 1000);
  if (seconds < 30 || s.ended) return null;
  const money0 = s.totalMoney;
  const gen0 = s.gen;
  const step = seconds > 3600 ? 5 : 1;
  let left = seconds;
  while (left > 0 && !s.ended) {
    const dt = Math.min(step, left);
    tick(s, dt);
    recordHistory(s);
    left -= dt;
  }
  return { seconds, money: s.totalMoney - money0, gens: s.gen - gen0 };
}
