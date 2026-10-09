// Tiny chiptune sound effects via WebAudio. No assets.

let ctx: AudioContext | null = null;
let muted = false;
try {
  muted = localStorage.getItem('singularity-muted') === '1';
} catch {
  /* ignore */
}

function ac(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.06, when = 0, slide = 0) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + when;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.2, when = 0) {
  const a = ac();
  if (!a) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = a.createBufferSource();
  src.buffer = buf;
  const g = a.createGain();
  g.gain.value = vol;
  const f = a.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 900;
  src.connect(f).connect(g).connect(a.destination);
  src.start(a.currentTime + when);
}

export const sfx = {
  click: () => tone(660 + Math.random() * 80, 0.05, 'square', 0.035),
  coin: () => { tone(988, 0.05, 'square', 0.04); tone(1319, 0.09, 'square', 0.04, 0.05); },
  buy: () => tone(440, 0.07, 'triangle', 0.08, 0, 220),
  deny: () => tone(150, 0.12, 'square', 0.04),
  gen: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'square', 0.05, i * 0.08)),
  era: () => [392, 523, 659, 784, 659, 1047].forEach((f, i) => tone(f, 0.18, 'square', 0.05, i * 0.11)),
  golden: () => [1319, 1568, 2093].forEach((f, i) => tone(f, 0.08, 'triangle', 0.06, i * 0.05)),
  research: () => { tone(330, 0.1, 'sawtooth', 0.03, 0, 600); tone(880, 0.12, 'triangle', 0.05, 0.08); },
  boom: () => { noise(2.5, 0.5); tone(80, 2, 'sawtooth', 0.15, 0, -60); },
  rumble: () => noise(0.4, 0.08),
};

export const isMuted = () => muted;
export function toggleMute() {
  muted = !muted;
  try {
    localStorage.setItem('singularity-muted', muted ? '1' : '0');
  } catch {
    /* ignore */
  }
  return muted;
}
