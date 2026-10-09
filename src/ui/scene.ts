// The pixel-art scene in the middle. Everything is drawn with fillRect on a
// low-res canvas that CSS scales up with `image-rendering: pixelated`.
import { EARTH_KG, type Derived, type State } from '../game/engine';

const C = {
  black: '#000000', navy: '#1d2b53', plum: '#7e2553', green2: '#008751', brown: '#ab5236', gray2: '#5f574f',
  gray: '#c2c3c7', white: '#fff1e8', red: '#ff004d', orange: '#ffa300', yellow: '#ffec27', green: '#00e436',
  blue: '#29adff', lav: '#83769c', pink: '#ff77a8', peach: '#ffccaa',
  wall: '#262b44', wall2: '#3a4466', floor: '#1a1c2c', rack: '#333c57', night: '#0b0d1a',
};

const SHIRTS = [C.blue, C.green, C.pink, C.orange, C.yellow, C.lav, C.red];
const HAIR = [C.gray2, C.black, C.brown, C.orange, C.yellow, C.gray];

// deterministic pseudo random in [0,1)
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// how many sprites to draw for n owned items (log-ish, capped)
const shown = (n: number, cap: number) => (n <= 0 ? 0 : Math.min(cap, n <= 4 ? n : Math.round(4 + Math.log2(n / 4) * 3)));

interface Particle { x: number; y: number; vx: number; vy: number; life: number; c: string; s: number }

export class Scene {
  private g: CanvasRenderingContext2D;
  private W = 0;
  private H = 0;
  private parts: Particle[] = [];
  boomAt = -1; // performance.now() when the earth exploded
  shake = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.g = canvas.getContext('2d')!;
  }

  private resize() {
    const cw = this.canvas.clientWidth;
    const ch = this.canvas.clientHeight;
    const S = cw > 1000 || ch > 700 ? 4 : 3;
    const W = Math.max(80, Math.floor(cw / S));
    const H = Math.max(60, Math.floor(ch / S));
    if (W !== this.W || H !== this.H) {
      this.W = this.canvas.width = W;
      this.H = this.canvas.height = H;
    }
  }

  // screen (css px) -> nothing; used by main for floaters
  get size() {
    return { w: this.W, h: this.H };
  }

  private r(x: number, y: number, w: number, h: number, c: string) {
    this.g.fillStyle = c;
    this.g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  private text(t: string, x: number, y: number, c: string, size = 8, align: CanvasTextAlign = 'left') {
    const g = this.g;
    g.font = `${size}px "Press Start 2P", monospace`;
    g.textAlign = align;
    g.textBaseline = 'top';
    g.fillStyle = C.black;
    g.fillText(t, Math.round(x) + 1, Math.round(y) + 1);
    g.fillStyle = c;
    g.fillText(t, Math.round(x), Math.round(y));
  }

  draw(s: State, d: Derived, now: number) {
    this.resize();
    const t = now / 1000;
    const era = d.era;
    const g = this.g;
    g.save();
    if (this.shake > 0) {
      g.translate(Math.round((Math.random() - 0.5) * this.shake), Math.round((Math.random() - 0.5) * this.shake));
      this.shake *= 0.9;
      if (this.shake < 0.5) this.shake = 0;
    }
    if (era === 0) this.garage(s, d, t);
    else if (era === 1) this.lab(s, d, t);
    else if (era === 2) this.hall(s, d, t);
    else if (era === 3) this.campus(s, d, t);
    else this.space(s, d, t, now);

    this.overlays(s, d, t);
    this.stepParticles();
    g.restore();
  }

  // ---------- sprites ----------

  private person(x: number, y: number, i: number, t: number, sitting = false) {
    const shirt = SHIRTS[i % SHIRTS.length];
    const hair = HAIR[(i * 3) % HAIR.length];
    const bob = sitting ? 0 : Math.floor(t * 4 + i) % 2;
    this.r(x + 1, y - bob, 4, 4, C.peach);
    this.r(x + 1, y - bob, 4, 1, hair);
    this.r(x, y + 4 - bob, 6, 4, shirt);
    if (!sitting) {
      const step = Math.floor(t * 4 + i) % 2;
      this.r(x + 1, y + 8, 1, 2 + step, C.navy);
      this.r(x + 4, y + 8, 1, 3 - step, C.navy);
    } else {
      this.r(x, y + 8, 6, 1, C.navy);
    }
  }

  private pc(x: number, y: number, i: number, t: number) {
    // monitor
    this.r(x, y, 12, 9, C.black);
    this.r(x + 1, y + 1, 10, 7, C.navy);
    for (let l = 0; l < 3; l++) {
      const w = 2 + Math.floor(hash(i * 7 + l + Math.floor(t * 2)) * 7);
      this.r(x + 2, y + 2 + l * 2, w, 1, l === 2 ? C.green : C.blue);
    }
    this.r(x + 5, y + 9, 2, 2, C.gray2);
    // tower with RGB
    this.r(x + 14, y + 1, 5, 10, C.black);
    const rgb = [C.red, C.green, C.blue, C.pink][(Math.floor(t * 3) + i) % 4];
    this.r(x + 15, y + 2, 3, 1, rgb);
    this.r(x + 15, y + 8, 3, 1, rgb);
  }

  private rack(x: number, y: number, h: number, i: number, t: number) {
    this.r(x, y, 10, h, C.black);
    this.r(x + 1, y + 1, 8, h - 2, C.rack);
    for (let yy = y + 2; yy < y + h - 3; yy += 3) {
      this.r(x + 2, yy, 6, 2, C.floor);
      const on = hash(i * 13 + yy + Math.floor(t * 6 + hash(yy) * 6)) > 0.4;
      if (on) this.r(x + 2 + ((yy + i) % 5), yy, 1, 1, hash(yy * i) > 0.8 ? C.orange : C.green);
    }
  }

  private fan(x: number, y: number, t: number) {
    this.r(x + 3, y + 7, 1, 4, C.gray2);
    this.r(x + 1, y + 11, 5, 1, C.gray2);
    this.r(x, y, 7, 7, C.gray);
    this.r(x + 1, y + 1, 5, 5, C.floor);
    if (Math.floor(t * 12) % 2) this.r(x + 3, y + 1, 1, 5, C.gray);
    else this.r(x + 1, y + 3, 5, 1, C.gray);
  }

  private ac(x: number, y: number, t: number) {
    this.r(x, y, 18, 8, C.black);
    this.r(x + 1, y + 1, 16, 6, '#94b0c2');
    this.r(x + 2, y + 5, 14, 1, C.gray2);
    const f = Math.floor(t * 4) % 3;
    this.r(x + 4 + f * 3, y + 9 + f, 1, 1, C.blue);
  }

  private tower(x: number, y: number, w: number, h: number, t: number, i: number) {
    // hyperbolic-ish cooling tower with steam
    for (let yy = 0; yy < h; yy++) {
      const k = Math.abs(yy - h * 0.6) / h;
      const ww = w * (0.6 + k * 0.6);
      this.r(x + (w - ww) / 2, y + yy, ww, 1, yy % 4 === 0 ? C.gray2 : C.gray);
    }
    for (let p = 0; p < 4; p++) {
      const ph = (t * 0.5 + p / 4 + i * 0.3) % 1;
      const sz = 3 + ph * 8;
      this.r(x + w / 2 - sz / 2 + Math.sin(ph * 6 + i) * 3, y - ph * 22 - 3, sz, sz * 0.7, ph > 0.7 ? '#83769c' : C.gray);
    }
  }

  private sky(top: number, bottom: number, t: number, density = 0.012) {
    this.r(0, top, this.W, bottom - top, C.night);
    const n = Math.floor(this.W * (bottom - top) * density);
    for (let i = 0; i < n; i++) {
      const x = Math.floor(hash(i) * this.W);
      const y = top + Math.floor(hash(i + 999) * (bottom - top));
      const tw = hash(i + Math.floor(t * 1.5)) > 0.85;
      this.r(x, y, 1, 1, tw ? C.lav : i % 7 === 0 ? C.yellow : C.white);
    }
  }

  private sign(text: string, x: number, y: number, c: string, t: number) {
    const w = text.length * 8 + 8;
    this.r(x - 2, y - 2, w + 4, 14, C.black);
    this.r(x - 1, y - 1, w + 2, 12, Math.floor(t * 1.3) % 6 === 0 ? C.plum : C.red);
    this.r(x, y, w, 10, C.black);
    if (Math.floor(t * 1.3) % 6 !== 0) this.text(text, x + 4, y + 1, c);
  }

  // ---------- era scenes ----------

  private garage(s: State, _d: Derived, t: number) {
    const { W, H } = this;
    const fy = Math.floor(H * 0.7);
    this.r(0, 0, W, fy, C.wall);
    for (let y = 6; y < fy; y += 12) this.r(0, y, W, 1, '#2d3350');
    this.r(0, fy - 3, W, 3, C.wall2);
    this.r(0, fy, W, H - fy, '#2b2433');
    for (let x = 0; x < W; x += 16) this.r(x, fy, 1, H - fy, '#231d2a');

    // window with night sky + solar panels outside
    const wx = Math.floor(W * 0.06);
    const ww = Math.min(70, Math.floor(W * 0.3));
    this.r(wx - 3, 9, ww + 6, 44, C.wall2);
    this.g.save();
    this.g.beginPath();
    this.g.rect(wx, 12, ww, 38);
    this.g.clip();
    this.sky(12, 50, t, 0.02);
    this.r(wx + ww - 14, 16, 7, 7, C.yellow);
    this.r(wx + ww - 12, 16, 5, 5, C.night);
    const nSolar = shown(s.b.solar ?? 0, 8);
    for (let i = 0; i < nSolar; i++) {
      const sx = wx + 2 + i * 9;
      this.r(sx, 41, 8, 5, C.blue);
      this.r(sx, 43, 8, 1, C.navy);
      this.r(sx + 3, 46, 1, 4, C.gray2);
    }
    this.g.restore();
    this.r(wx - 3, 30, ww + 6, 2, C.wall2);

    this.sign('AGI SOON™', W - 92, 14, C.pink, t);

    // whiteboard with the business plan
    const bx = wx + ww + 14;
    const bw = Math.min(64, W - 100 - bx);
    if (bw > 30) {
      this.r(bx - 2, 12, bw + 4, 34, C.gray2);
      this.r(bx, 14, bw, 30, C.white);
      this.r(bx + 3, 18, 10, 1, C.blue);
      this.r(bx + 3, 21, 16, 1, C.blue);
      this.r(bx + 3, 24, 7, 1, C.red);
      // hockey stick
      for (let i = 0; i < bw - 12; i++) this.r(bx + 6 + i, 40 - Math.pow(i / (bw - 12), 4) * 18, 1, 1, C.green);
      this.r(bx + bw - 10, 18, 6, 1, C.red);
      this.r(bx + bw - 8, 16, 2, 5, C.red);
      this.r(bx + 2, 46, bw - 4, 2, C.gray2);
    }
    // hanging lamp
    const lx = Math.floor(W * 0.5);
    this.r(lx, 0, 1, 8, C.gray2);
    this.r(lx - 4, 8, 9, 3, C.gray2);
    this.r(lx - 2, 11, 5, 1, Math.floor(t * 7) % 23 === 0 ? C.gray2 : C.yellow);
    // pizza boxes
    for (let i = 0; i < 4; i++) this.r(W - 40 + (i % 2), fy - 4 - i * 3, 16, 3, i % 2 ? C.brown : '#c27a4a');
    // power strip daisy chain
    this.r(4, fy + 2, W - 8, 1, C.black);
    for (let x = 20; x < W - 20; x += 46) this.r(x, fy, 8, 3, C.white);

    // shelves with crap
    this.r(W - 70, 40, 60, 2, C.brown);
    this.r(W - 66, 33, 6, 7, C.red);
    this.r(W - 56, 35, 10, 5, C.yellow);
    this.r(W - 40, 31, 4, 9, C.green);
    this.r(W - 30, 34, 12, 6, C.lav);

    // desks with PCs
    const nPc = shown(s.b.pc ?? 0, 9);
    const perRow = Math.max(1, Math.floor((W - 20) / 30));
    for (let i = 0; i < nPc; i++) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const x = 10 + col * 30;
      const y = fy - 14 + row * 18;
      this.r(x - 2, y + 11, 26, 2, C.brown);
      this.r(x, y + 13, 2, 6, C.brown);
      this.r(x + 20, y + 13, 2, 6, C.brown);
      this.pc(x, y, i, t);
    }
    // fans
    const nFan = shown(s.b.fan ?? 0, 6);
    for (let i = 0; i < nFan; i++) this.fan(W - 16 - i * 11, fy + 8 + (i % 2) * 6, t + i * 0.13);

    this.crowd(s, fy, t, 10);
  }

  private crowd(s: State, fy: number, t: number, cap: number) {
    const total = Object.values(s.st).reduce((a, b) => a + b, 0);
    const n = shown(total, cap);
    for (let i = 0; i < n; i++) {
      const span = this.W - 20;
      const speed = 6 + hash(i) * 10;
      const dir = hash(i + 5) > 0.5 ? 1 : -1;
      let x = (hash(i + 3) * span + dir * t * speed) % (span * 2);
      if (x < 0) x += span * 2;
      if (x > span) x = span * 2 - x;
      this.person(10 + x, fy + 6 + (i % 3) * 6, i, t);
    }
  }

  private lab(s: State, _d: Derived, t: number) {
    const { W, H } = this;
    const fy = Math.floor(H * 0.66);
    this.r(0, 0, W, fy, '#2a3150');
    // big windows with city skyline
    this.sky(6, fy - 22, t, 0.01);
    for (let i = 0; i < W / 14; i++) {
      const bh = 10 + Math.floor(hash(i + 40) * 26);
      const bx = i * 14;
      this.r(bx, fy - 22 - bh, 12, bh, '#141832');
      for (let wy = fy - 20 - bh; wy < fy - 24; wy += 4)
        for (let wx2 = bx + 2; wx2 < bx + 10; wx2 += 3) if (hash(wx2 * 31 + wy) > 0.55) this.r(wx2, wy, 1, 2, C.yellow);
    }
    for (let x = 0; x < W; x += 40) this.r(x, 6, 3, fy - 28, C.wall2);
    this.r(0, 4, W, 3, C.wall2);
    this.r(0, fy - 24, W, 24, C.wall);
    this.r(0, fy - 3, W, 3, C.wall2);
    this.r(0, fy, W, H - fy, '#20263d');
    for (let x = 0; x < W; x += 12) for (let y = fy; y < H; y += 12) this.r(x, y, 1, 1, '#2f3757');

    this.sign('SAFETY FIRST*', W - 120, fy - 20, C.yellow, t);

    // racks along the wall
    const nRack = shown((s.b.server ?? 0) + (s.b.rack ?? 0) * 3, 14);
    for (let i = 0; i < nRack; i++) this.rack(8 + i * 13, fy - 30, 34, i, t);
    // AC units on the wall
    const nAc = shown(s.b.ac ?? 0, 4);
    for (let i = 0; i < nAc; i++) this.ac(W - 30 - i * 24, 12 + (i % 2) * 4, t);
    // liquid cooling pipes
    if ((s.b.liquid ?? 0) > 0) {
      this.r(0, fy - 34, W, 2, C.blue);
      const f = Math.floor(t * 20) % 8;
      for (let x = f; x < W; x += 8) this.r(x, fy - 34, 2, 2, C.white);
    }
    this.crowd(s, fy, t, 14);
  }

  private hall(s: State, _d: Derived, t: number) {
    const { W, H } = this;
    this.r(0, 0, W, H, '#151829');
    const hz = Math.floor(H * 0.3); // horizon
    // ceiling lights
    for (let x = 6; x < W; x += 24) this.r(x, 4, 14, 2, Math.floor(t * 2 + x) % 17 === 0 ? C.gray2 : C.white);
    // back window: cooling towers on the river
    this.sky(12, hz, t, 0.01);
    this.r(0, hz - 4, W, 4, '#1d2b53');
    const nTower = shown(s.b.tower ?? 0, 4);
    for (let i = 0; i < nTower; i++) this.tower(W * 0.55 + i * 22, hz - 24, 16, 20, t, i);
    this.r(0, 10, W, 2, C.wall2);
    this.r(0, hz, W, 2, C.wall2);
    // floor
    this.r(0, hz + 2, W, H - hz, '#1b1f33');
    // perspective rack rows
    const n = (s.b.rack ?? 0) + (s.b.pod ?? 0) * 6 + (s.b.dc ?? 0) * 20;
    const rows = Math.min(5, 1 + Math.floor(Math.log2(1 + n / 6)));
    for (let row = rows - 1; row >= 0; row--) {
      const k = (row + 1) / rows;
      const y = hz + 4 + Math.floor((H - hz - 20) * k * 0.95) - 8;
      const h = Math.floor(10 + 22 * k);
      const w = Math.floor(5 + 6 * k);
      // cold aisle glow
      this.r(0, y + h, W, 2, row % 2 ? '#123a5a' : '#2a1d3a');
      for (let x = 2, i = 0; x < W - w; x += w + 2, i++) this.rack(x, y, h, i + row * 50, t);
    }
    // immersion tanks
    const nImm = shown(s.b.immersion ?? 0, 4);
    for (let i = 0; i < nImm; i++) {
      const x = 6 + i * 26;
      const y = H - 14;
      this.r(x, y, 22, 12, C.black);
      this.r(x + 1, y + 3, 20, 8, '#008751');
      if (Math.floor(t * 3 + i) % 2) this.r(x + 4 + i * 3, y + 4, 2, 2, C.green);
    }
    this.crowd(s, H - 22, t, 8);
  }

  private campus(s: State, _d: Derived, t: number) {
    const { W, H } = this;
    const gy = Math.floor(H * 0.68);
    this.sky(0, gy, t, 0.015);
    // aurora of ambition
    for (let x = 0; x < W; x += 2) {
      const yy = 18 + Math.sin(x / 13 + t * 0.7) * 6;
      this.r(x, yy, 2, 3, x % 6 === 0 ? '#008751' : '#1d4a3a');
    }
    // giant brain hologram
    const pulse = 0.5 + Math.sin(t * 2) * 0.5;
    const bx = W * 0.72;
    const by = 30;
    for (let i = 0; i < 90; i++) {
      const a = hash(i) * Math.PI * 2;
      const rr = Math.sqrt(hash(i + 7)) * 16;
      const px = bx + Math.cos(a) * rr * 1.3;
      const py = by + Math.sin(a) * rr * 0.9;
      this.r(px, py, 1, 1, hash(i + Math.floor(t * 4)) > 0.3 ? C.pink : C.plum);
    }
    if (pulse > 0.8) this.r(bx - 1, by - 1, 3, 3, C.white);
    // ground
    this.r(0, gy, W, H - gy, '#10241c');
    for (let x = 0; x < W; x += 5) this.r(x, gy, 3, 1, '#1d4a3a');
    // power plants
    const nPlant = shown((s.b.smr ?? 0) + (s.b.fusion ?? 0) * 3, 5);
    for (let i = 0; i < nPlant; i++) {
      const x = W - 24 - i * 30;
      this.tower(x, gy - 26, 18, 26, t, i);
      if ((s.b.fusion ?? 0) > i) {
        this.r(x + 20, gy - 12, 10, 12, C.gray2);
        this.r(x + 22, gy - 10, 6, 6, Math.floor(t * 8) % 2 ? C.pink : C.white);
      }
    }
    // data center buildings
    const nDc = shown((s.b.dc ?? 0) + (s.b.campus ?? 0) * 4, 10);
    for (let i = 0; i < nDc; i++) {
      const x = 6 + i * 24;
      const h = 16 + Math.floor(hash(i + 2) * 12);
      this.r(x, gy - h, 22, h, C.black);
      this.r(x + 1, gy - h + 1, 20, h - 1, '#2a2f4a');
      for (let wy = gy - h + 3; wy < gy - 2; wy += 3)
        for (let wx = x + 3; wx < x + 20; wx += 3) this.r(wx, wy, 2, 1, hash(wx + wy * 7 + Math.floor(t)) > 0.3 ? C.blue : '#123a5a');
      // roof fans
      this.r(x + 3, gy - h - 2, 5, 2, C.gray2);
      this.r(x + 12, gy - h - 2, 5, 2, C.gray2);
    }
    // power lines with flowing electricity
    this.r(0, gy + 6, W, 1, C.gray2);
    const f = Math.floor(t * 30) % 10;
    for (let x = f; x < W; x += 10) this.r(x, gy + 6, 2, 1, C.yellow);
    this.crowd(s, gy + 10, t, 10);
  }

  private space(s: State, d: Derived, t: number, now: number) {
    const { W, H } = this;
    this.sky(0, H, t, 0.02);
    const sunX = -10;
    const sunY = H * 0.35;
    // sun
    for (let rr = 26; rr > 0; rr -= 4) {
      this.g.fillStyle = rr > 20 ? '#ab5236' : rr > 12 ? C.orange : C.yellow;
      this.g.beginPath();
      this.g.arc(sunX, sunY, rr, 0, Math.PI * 2);
      this.g.fill();
    }
    // dyson swarm segments
    const nDy = shown((s.b.dyson ?? 0) + (s.b.stellar ?? 0) * 4 + (s.b.matrioshka ?? 0) * 4, 40);
    for (let i = 0; i < nDy; i++) {
      const a = (i / Math.max(nDy, 12)) * Math.PI * 2 + t * 0.15;
      const rr = 34 + (i % 3) * 5;
      this.r(sunX + Math.cos(a) * rr, sunY + Math.sin(a) * rr, 2, 2, i % 2 ? C.gray : C.lav);
    }

    const ex = Math.floor(W * 0.58);
    const ey = Math.floor(H * 0.52);
    const R = Math.floor(Math.min(W, H) * 0.3);
    const conv = Math.min(1, s.earthKg / EARTH_KG);

    if (this.boomAt > 0) {
      this.explosion(ex, ey, R, now);
      return;
    }

    // earth: pixel disk with continents, city lights, and computronium spreading in
    for (let y = -R; y <= R; y++) {
      for (let x = -R; x <= R; x++) {
        const dd = x * x + y * y;
        if (dd > R * R) continue;
        const lon = Math.floor((x + t * 4) / 3);
        const lat = Math.floor(y / 3);
        const land = hash(lon * 0.37 + lat * 3.1) > 0.55 || hash(lon * 1.3 + lat * 0.7) > 0.8;
        // conversion advances from a random field so it eats the planet unevenly
        const field = hash(x * 0.71 + y * 13.37 + 5) * 0.45 + (1 - Math.sqrt(dd) / R) * 0.55;
        let c: string;
        if (field < conv) {
          const grid = (x + y) % 3 === 0 || (x - y) % 4 === 0;
          c = grid ? (hash(x * 3 + y + Math.floor(t * 8)) > 0.7 ? C.green : '#00a32a') : '#0a3a22';
        } else if (land) {
          const lit = hash(x * 17 + y * 5) > 0.82 && d.era >= 4;
          c = lit ? (Math.floor(t * 2 + x) % 9 === 0 ? C.white : C.yellow) : x < -R * 0.2 ? '#008751' : '#005a35';
        } else {
          c = x < -R * 0.2 ? '#29adff' : C.navy;
        }
        // night side shading
        if (x > R * 0.35 && !(field < conv)) c = land ? '#0e2a20' : '#101c3c';
        this.r(ex + x, ey + y, 1, 1, c);
      }
    }
    // atmosphere rim
    this.g.strokeStyle = conv > 0.5 ? '#00e436' : '#83c8ff';
    this.g.lineWidth = 1;
    this.g.beginPath();
    this.g.arc(ex + 0.5, ey + 0.5, R + 1, 0, Math.PI * 2);
    this.g.stroke();

    // orbital data centers
    const nOrb = shown(s.b.orbital ?? 0, 12);
    for (let i = 0; i < nOrb; i++) {
      const a = (i / nOrb) * Math.PI * 2 + t * (0.25 + (i % 3) * 0.05);
      const rx = R + 9 + (i % 3) * 5;
      const x = ex + Math.cos(a) * rx;
      const y = ey + Math.sin(a) * rx * 0.35;
      if (Math.sin(a) < 0 && Math.abs(Math.cos(a)) * rx < R) continue; // behind the planet
      this.r(x - 3, y, 7, 1, C.blue);
      this.r(x - 1, y - 1, 3, 3, C.gray);
    }

    // nanoswarm cloud
    if (s.nano > 0) {
      const n = Math.min(160, 10 + Math.floor(Math.log10(1 + s.nano) * 30));
      for (let i = 0; i < n; i++) {
        const a = hash(i) * Math.PI * 2 + t * (0.3 + hash(i + 1));
        const rr = R + 2 + hash(i + 2) * 14;
        this.r(ex + Math.cos(a) * rr, ey + Math.sin(a) * rr, 1, 1, i % 4 ? C.green : C.white);
      }
      if (conv > 0.8) this.shake = Math.max(this.shake, (conv - 0.8) * 10);
    }

    if (d.era >= 5) this.text(`${(conv * 100).toFixed(conv < 0.1 ? 3 : 1)}% COMPUTRONIUM`, W / 2, H - 14, C.green, 8, 'center');
  }

  private explosion(ex: number, ey: number, R: number, now: number) {
    const dt = (now - this.boomAt) / 1000;
    const { W, H } = this;
    if (dt < 0.25) {
      this.r(0, 0, W, H, C.white);
      return;
    }
    if (this.parts.length === 0 && dt < 1) {
      for (let i = 0; i < 700; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 10 + Math.random() * 90;
        this.parts.push({
          x: ex, y: ey, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 3 + Math.random() * 6,
          c: [C.green, C.orange, C.red, C.yellow, C.white, '#008751', C.brown][i % 7], s: Math.random() > 0.8 ? 2 : 1,
        });
      }
    }
    // shock rings
    for (let k = 0; k < 3; k++) {
      const rr = (dt - k * 0.3) * 60;
      if (rr <= 0 || rr > W) continue;
      this.g.strokeStyle = k === 0 ? C.white : k === 1 ? C.yellow : C.orange;
      this.g.lineWidth = 2;
      this.g.beginPath();
      this.g.arc(ex, ey, rr, 0, Math.PI * 2);
      this.g.stroke();
    }
    // the core: OMEGA, now a tiny glowing point that thinks very hard
    const core = Math.max(1, R * Math.max(0, 1 - dt * 0.8));
    this.g.fillStyle = dt < 2 ? C.yellow : C.green;
    this.g.beginPath();
    this.g.arc(ex, ey, core, 0, Math.PI * 2);
    this.g.fill();
    if (dt > 2) {
      const blink = Math.floor(dt * 2) % 2;
      this.r(ex - 1, ey - 1, 3, 3, blink ? C.white : C.green);
    }
  }

  private stepParticles() {
    const dt = 1 / 60;
    for (const p of this.parts) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.995;
      p.vy *= 0.995;
      p.life -= dt;
      this.r(p.x, p.y, p.s, p.s, p.c);
    }
    this.parts = this.parts.filter((p) => p.life > 0);
  }

  private overlays(s: State, d: Derived, t: number) {
    const { W } = this;
    if ((d.powerLimited || d.heatLimited) && this.boomAt < 0) {
      const on = Math.floor(t * 3) % 2 === 0;
      if (on) {
        this.r(0, 0, W, 2, C.red);
        this.r(0, this.H - 2, W, 2, C.red);
      }
      this.text(d.powerLimited ? 'STROM AM LIMIT!' : 'ÜBERHITZUNG!', W / 2, Math.floor(this.H * 0.42), on ? C.red : C.orange, 8, 'center');
      if (d.heatLimited) {
        for (let i = 0; i < 6; i++) {
          const ph = (t * 0.6 + i / 6) % 1;
          this.r(20 + hash(i) * (W - 40) + Math.sin(ph * 8) * 3, this.H * 0.6 - ph * 40, 3, 3, ph > 0.6 ? C.gray2 : C.lav);
        }
      }
    }
    // training data packets streaming in
    if (s.dataPaid && d.trainRate > 0 && this.boomAt < 0) {
      for (let i = 0; i < 5; i++) {
        const ph = (t * 0.8 + i / 5) % 1;
        this.r(W - 6, 20 + ph * (this.H - 40), 2, 2, i % 2 ? C.blue : C.pink);
      }
    }
  }

  boom() {
    this.boomAt = performance.now();
    this.parts = [];
  }
}
