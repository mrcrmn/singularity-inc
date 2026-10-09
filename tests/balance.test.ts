import { describe, expect, it } from 'vitest';
// The bot plays near-optimally at 2 Hz; humans take roughly 1.5x as long.
import { simulate, report } from './sim';

describe('balance', () => {
  it('a greedy bot reaches the singularity in a reasonable time', () => {
    const r = simulate();
    console.log(report(r));
    expect(r.state.ended).toBe(true);
    expect(r.state.time / 60).toBeGreaterThan(25);
    expect(r.state.time / 60).toBeLessThan(90);
  });
});
