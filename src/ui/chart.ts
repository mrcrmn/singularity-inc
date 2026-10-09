// IQ over time on a log scale, drawn in chunky pixels.
import { ERAS } from '../game/data';
import { iqOf } from '../game/data';
import type { State } from '../game/engine';

const PX = 3; // screen pixels per chart pixel

export function drawChart(canvas: HTMLCanvasElement, s: State, accent: string) {
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  if (!cw || !ch) return;
  const W = Math.floor(cw / PX);
  const H = Math.floor(ch / PX);
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
  }
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#0b0d1a';
  g.fillRect(0, 0, W, H);

  const pts = [...s.history, { t: s.time, iq: iqOf(s.gen) }];
  const tMax = Math.max(60, s.time);
  const maxLog = Math.max(3, Math.log10(Math.max(10, iqOf(s.gen))) + 0.5);
  const x = (t: number) => Math.round((t / tMax) * (W - 2)) + 1;
  const y = (iq: number) => H - 2 - Math.round((Math.log10(Math.max(1, iq)) / maxLog) * (H - 4));

  // grid: decades
  g.fillStyle = '#1d2b53';
  for (let d = 1; d < maxLog; d += Math.max(1, Math.floor(maxLog / 6))) {
    const yy = y(10 ** d);
    for (let xx = 0; xx < W; xx += 3) g.fillRect(xx, yy, 1, 1);
  }
  // human level
  g.fillStyle = '#7e2553';
  const hy = y(100);
  for (let xx = 0; xx < W; xx += 2) g.fillRect(xx, hy, 1, 1);

  // era starts
  g.fillStyle = '#5f574f';
  for (let e = 1; e < ERAS.length; e++) {
    const t = s.genTimes[ERAS[e].gen - 1];
    if (t === undefined) continue;
    const xx = x(t);
    for (let yy = 0; yy < H; yy += 2) g.fillRect(xx, yy, 1, 1);
  }

  // stepped line
  g.fillStyle = accent;
  let px = x(0);
  let py = H - 2;
  for (const p of pts) {
    const nx = x(p.t);
    const ny = y(p.iq);
    g.fillRect(Math.min(px, nx), py, Math.abs(nx - px) + 1, 1);
    g.fillRect(nx, Math.min(py, ny), 1, Math.abs(ny - py) + 1);
    px = nx;
    py = ny;
  }
  // head
  g.fillStyle = '#fff1e8';
  g.fillRect(px - 1, py - 1, 3, 3);
}
