import {
  BUILDINGS, STAFF, UPGRADES, ERAS, baseMults, trainCost, dataCost, iqOf,
  type Building, type Mults, type Staff, type Upgrade,
} from './data';

export const EARTH_KG = 5.97e24;
const FLOP_PER_USER = 1e10; // inference FLOP/s needed to serve one user
const BASE_POWER = 1500;
const BASE_COOL = 1200;

export type BuffKind = 'train' | 'demand' | 'data';
export interface Buff { kind: BuffKind; mult: number; until: number; label: string }

export interface State {
  v: number;
  money: number;
  data: number;
  rp: number;
  gen: number; // deployed generation (0 = none yet)
  progress: number; // effective FLOP accumulated towards gen + 1
  dataPaid: boolean;
  alloc: number; // share of compute used for training
  b: Record<string, number>;
  st: Record<string, number>;
  up: Record<string, boolean>;
  rsi: number; // accumulated self-improvement multiplier
  users: number;
  nano: number;
  earthKg: number; // converted mass
  buffs: Buff[];
  time: number; // seconds played
  genTimes: number[]; // time at which each gen was finished
  history: { t: number; iq: number }[];
  totalMoney: number;
  clicks: number;
  universe: number; // prestige
  ended: boolean;
  seenEra: number;
  newsSeed: number;
}

export function newState(universe = 1): State {
  return {
    v: 1,
    money: 50,
    data: 10,
    rp: 0,
    gen: 0,
    progress: 0,
    dataPaid: false,
    alloc: 0.6,
    b: { pc: 1 },
    st: {},
    up: {},
    rsi: 1,
    users: 0,
    nano: 0,
    earthKg: 0,
    buffs: [],
    time: 0,
    genTimes: [],
    history: [],
    totalMoney: 0,
    clicks: 0,
    universe,
    ended: false,
    seenEra: 0,
    newsSeed: 0,
  };
}

export interface Derived {
  mults: Mults;
  iq: number;
  era: number;
  rawCompute: number;
  nanoCompute: number;
  powerUse: number;
  powerCap: number;
  heat: number;
  coolCap: number;
  throttle: number;
  powerLimited: boolean;
  heatLimited: boolean;
  compute: number;
  trainCompute: number;
  inferCompute: number;
  trainRate: number; // effective FLOP/s towards the next gen
  algo: number; // overall algorithmic multiplier (shown as recursion factor)
  aiFactor: number; // part of the speedup that comes from the models themselves
  demand: number;
  capacity: number;
  pricePerUser: number;
  revenue: number;
  dataRate: number;
  rpRate: number;
  nanoRate: number; // kg/s
  need: number; // FLOP to train next
  dataNeed: number;
  eta: number;
  prestige: number;
}

export const eraOf = (gen: number) => {
  let e = 0;
  for (let i = 0; i < ERAS.length; i++) if (gen >= ERAS[i].gen) e = i;
  return e;
};

export function modelName(gen: number): string {
  if (gen <= 0) return '—';
  const era = eraOf(gen);
  return `${ERAS[era].model}-${gen - ERAS[era].gen + (era === 0 ? 0 : 1)}`;
}

export function buffMult(s: State, kind: BuffKind) {
  let m = 1;
  for (const b of s.buffs) if (b.kind === kind && b.until > s.time) m *= b.mult;
  return m;
}

export function derive(s: State): Derived {
  const iq = iqOf(s.gen);
  const m = baseMults();
  const ctx = { iq, gen: s.gen };
  for (const u of UPGRADES) if (s.up[u.id] && u.apply) u.apply(m, ctx);

  const prestige = Math.pow(2, s.universe - 1);
  m.compute *= prestige;
  m.rp *= prestige;
  m.revenue *= prestige;

  let rawCompute = 0;
  let powerUse = 0;
  let powerCap = BASE_POWER;
  let coolCap = BASE_COOL;
  let nanoRate = 0;
  for (const b of BUILDINGS) {
    const n = s.b[b.id] ?? 0;
    if (!n) continue;
    if (b.flops) rawCompute += b.flops * n;
    if (b.use) powerUse += b.use * n;
    if (b.supply) powerCap += b.supply * n;
    if (b.cool) coolCap += b.cool * n;
  }
  nanoRate = s.nano * 2e15 * m.nano * (1 + Math.log10(Math.max(1, iq)) / 4);
  rawCompute *= m.compute;
  powerUse *= m.powerUse;
  powerCap *= m.powerCap;
  coolCap *= m.cooling;

  const powerRatio = powerUse > 0 ? Math.min(1, powerCap / powerUse) : 1;
  const heat = powerUse * powerRatio;
  const coolRatio = heat > 0 ? Math.min(1, coolCap / heat) : 1;
  const throttle = powerRatio * coolRatio;
  // computronium thinks without the grid
  const nanoCompute = s.earthKg * 1e11 * m.compute;
  const compute = rawCompute * throttle + nanoCompute;

  const trainCompute = compute * s.alloc;
  const inferCompute = compute * (1 - s.alloc);

  const engineers = s.st.engineer ?? 0;
  const engMult = 1 + 0.05 * engineers;
  const aiFactor = s.rsi * (s.up.r_selfcode ? Math.max(1, Math.sqrt(iq / 300)) : 1);
  const algo = m.train * engMult * s.rsi;
  const trainRate = trainCompute * algo * buffMult(s, 'train');

  const sales = s.st.sales ?? 0;
  const demand = 300 * Math.pow(1.75, s.gen) * m.demand * (1 + 0.06 * sales) * buffMult(s, 'demand') * (s.gen > 0 ? 1 : 0);
  const capacity = (inferCompute * m.infer) / FLOP_PER_USER;
  const pricePerUser = 0.004 * Math.pow(1.3, s.gen) * m.revenue;
  const revenue = s.users * pricePerUser;

  // users generate data too ("Wir verbessern unsere Dienste")
  const dataRate = (0.4 + 0.6 * (s.st.labeler ?? 0) + s.users * 2e-5) * m.data * buffMult(s, 'data');
  const agents = s.st.agent ?? 0;
  const rpRate = (0.3 * (s.st.researcher ?? 0) + agents * 2 * Math.pow(iq / 100, 1.6)) * m.rp;

  const need = trainCost(s.gen + 1);
  const dataNeed = dataCost(s.gen + 1);
  const eta = trainRate > 0 ? (need - s.progress) / trainRate : Infinity;

  return {
    mults: m, iq, era: eraOf(s.gen), rawCompute, nanoCompute, powerUse, powerCap, heat, coolCap, throttle,
    powerLimited: powerRatio < 1, heatLimited: coolRatio < 1,
    compute, trainCompute, inferCompute, trainRate, algo, aiFactor, demand, capacity, pricePerUser, revenue,
    dataRate, rpRate, nanoRate, need, dataNeed, eta, prestige,
  };
}

// ---------- costs ----------

export function buildingCost(s: State, b: Building, m: Mults, n = 1): number {
  const owned = s.b[b.id] ?? 0;
  const first = b.cost * Math.pow(b.growth, owned) * m.buildCost;
  return (first * (Math.pow(b.growth, n) - 1)) / (b.growth - 1);
}

export function staffCost(s: State, st: Staff, m: Mults, n = 1): number {
  const owned = s.st[st.id] ?? 0;
  const first = st.cost * Math.pow(st.growth, owned) * m.hireCost;
  return (first * (Math.pow(st.growth, n) - 1)) / (st.growth - 1);
}

export function maxAffordable(money: number, firstCost: number, growth: number): number {
  if (money < firstCost) return 0;
  return Math.floor(Math.log((money * (growth - 1)) / firstCost + 1) / Math.log(growth));
}

export function buyCount(s: State, cost1: number, growth: number, amt: number | 'max'): number {
  if (amt === 'max') return Math.max(1, maxAffordable(s.money, cost1, growth));
  return amt;
}

export const isUnlocked = (s: State, item: { gen: number; req?: string }) =>
  s.gen >= item.gen && (!item.req || !!s.up[item.req]);

// ---------- actions ----------

export function buyBuilding(s: State, id: string, amt: number | 'max' = 1): boolean {
  const b = BUILDINGS.find((x) => x.id === id)!;
  if (!isUnlocked(s, b)) return false;
  const m = derive(s).mults;
  const n = buyCount(s, buildingCost(s, b, m), b.growth, amt);
  const cost = buildingCost(s, b, m, n);
  if (s.money < cost) return false;
  s.money -= cost;
  s.b[id] = (s.b[id] ?? 0) + n;
  if (id === 'nano') s.nano += n;
  return true;
}

export function hire(s: State, id: string, amt: number | 'max' = 1): boolean {
  const st = STAFF.find((x) => x.id === id)!;
  if (!isUnlocked(s, st)) return false;
  const m = derive(s).mults;
  const n = buyCount(s, staffCost(s, st, m), st.growth, amt);
  const cost = staffCost(s, st, m, n);
  if (s.money < cost) return false;
  s.money -= cost;
  s.st[id] = (s.st[id] ?? 0) + n;
  return true;
}

export function buyUpgrade(s: State, id: string): boolean {
  const u = UPGRADES.find((x) => x.id === id)!;
  if (s.up[id] || !isUnlocked(s, u)) return false;
  if (u.kind === 'research') {
    if (s.rp < u.cost) return false;
    s.rp -= u.cost;
  } else {
    if (s.money < u.cost) return false;
    s.money -= u.cost;
    if (u.grant) {
      s.money += u.grant;
      s.totalMoney += u.grant;
    }
  }
  s.up[id] = true;
  return true;
}

export function upgradeAffordable(s: State, u: Upgrade) {
  return u.kind === 'research' ? s.rp >= u.cost : s.money >= u.cost;
}

export function clickMoney(_s: State, d: Derived): number {
  return (2 + d.iq * 0.15) * d.mults.click + d.revenue * 0.05;
}

export function clickTrain(_s: State, d: Derived): number {
  return Math.max(d.trainRate * 0.4, 4e12 * d.mults.click * d.algo);
}

export function doClickMoney(s: State) {
  const v = clickMoney(s, derive(s));
  s.money += v;
  s.totalMoney += v;
  s.clicks++;
  return v;
}

export function doClickTrain(s: State) {
  const d = derive(s);
  if (!s.dataPaid) return 0;
  const v = clickTrain(s, d);
  s.progress += v;
  s.clicks++;
  return v;
}

// ---------- simulation ----------

export interface TickEvents {
  newGens: number[];
  ended: boolean;
}

export function tick(s: State, dt: number): TickEvents {
  const ev: TickEvents = { newGens: [], ended: false };
  if (s.ended) return ev;
  const d = derive(s);
  s.time += dt;

  // economy
  const target = Math.min(d.demand, d.capacity);
  s.users += (target - s.users) * Math.min(1, dt * 0.35);
  if (s.users > d.capacity) s.users = d.capacity;
  const income = s.users * d.pricePerUser * dt;
  s.money += income;
  s.totalMoney += income;
  s.data += d.dataRate * dt;
  s.rp += d.rpRate * dt;

  // training
  if (!s.dataPaid && s.data >= d.dataNeed) {
    s.data -= d.dataNeed;
    s.dataPaid = true;
  }
  if (s.dataPaid) {
    s.progress += d.trainRate * dt;
    let guard = 0;
    while (s.dataPaid && s.progress >= trainCost(s.gen + 1) && guard++ < 50) {
      s.progress -= trainCost(s.gen + 1);
      s.gen++;
      s.genTimes.push(s.time);
      ev.newGens.push(s.gen);
      if (d.mults.rsi > 1) s.rsi *= d.mults.rsi;
      s.dataPaid = false;
      const need = dataCost(s.gen + 1);
      if (s.data >= need) {
        s.data -= need;
        s.dataPaid = true;
      } else {
        s.progress = 0;
      }
    }
    if (guard >= 50) s.progress = 0;
  }

  // endgame: nanobots convert the planet
  if (s.nano > 0) {
    s.nano += s.nano * d.mults.repl * dt;
    s.earthKg = Math.min(EARTH_KG, s.earthKg + d.nanoRate * dt);
    if (s.earthKg >= EARTH_KG) {
      s.ended = true;
      ev.ended = true;
    }
  }

  s.buffs = s.buffs.filter((b) => b.until > s.time);
  return ev;
}

export function recordHistory(s: State) {
  const iq = iqOf(s.gen);
  const last = s.history[s.history.length - 1];
  if (!last || s.time - last.t >= 5) {
    s.history.push({ t: s.time, iq });
    if (s.history.length > 400) {
      // thin out old samples
      s.history = s.history.filter((_, i) => i % 2 === 0 || i > 300);
    }
  }
}
