// Headless bot that plays the game greedily; used to tune balance.
import { BUILDINGS, STAFF, UPGRADES, ERAS } from '../src/game/data';
import {
  newState, derive, tick, buyBuilding, hire, buyUpgrade, buildingCost, staffCost, isUnlocked,
  doClickMoney, doClickTrain, eraOf, type State,
} from '../src/game/engine';

export interface SimResult { state: State; eraTimes: number[]; genTimes: number[]; snaps: string[] }

export function simulate(maxSec = 4 * 3600, clicksPerSec = 3, dt = 0.5): SimResult {
  const s = newState();
  const eraTimes = [0];
  const snaps: string[] = [];
  let waitData = 0;
  let t = 0;
  while (t < maxSec && !s.ended) {
    // clicking in the early game
    if (s.gen < 8) {
      for (let i = 0; i < clicksPerSec * dt; i++) {
        if (i % 2) doClickMoney(s);
        else doClickTrain(s);
      }
    }
    act(s);
    const ev = tick(s, dt);
    t += dt;
    if (!s.dataPaid) waitData += dt;
    if (ev.newGens.length) {
      const d = derive(s);
      snaps.push(`g${s.gen} t=${(t/60).toFixed(1)} rev=${d.revenue.toExponential(1)} users=${s.users.toExponential(1)} dem=${d.demand.toExponential(1)} cap=${d.capacity.toExponential(1)} train=${d.trainRate.toExponential(1)} need=${d.need.toExponential(1)} rp=${d.rpRate.toExponential(1)} waitData=${waitData.toFixed(0)} thr=${d.throttle.toFixed(2)} money=${s.money.toExponential(1)} rsi=${s.rsi.toExponential(1)} nano=${s.nano.toFixed(0)}`);
      waitData = 0;
      const e = eraOf(s.gen);
      while (eraTimes.length <= e) eraTimes.push(t);
    }
  }
  return { state: s, eraTimes, genTimes: s.genTimes, snaps };
}

function act(s: State) {
  // research & projects: buy everything affordable
  for (const u of UPGRADES) if (!s.up[u.id] && isUnlocked(s, u)) buyUpgrade(s, u.id);

  for (let guard = 0; guard < 30; guard++) {
    const d = derive(s);
    const m = d.mults;
    const unlocked = BUILDINGS.filter((b) => isUnlocked(s, b));
    const best = (cat: string) =>
      unlocked.filter((b) => b.cat === cat).sort((a, b) => valuePer(b) - valuePer(a))[0];
    const valuePer = (b: (typeof BUILDINGS)[number]) =>
      ((b.flops ?? b.supply ?? b.cool ?? b.nano ?? 0) / buildingCost(s, b, m));

    let pick: { kind: 'b' | 's'; id: string; cost: number } | null = null;
    const consider = (kind: 'b' | 's', id: string, cost: number) => {
      if (!pick || cost < pick.cost) pick = { kind, id, cost };
    };

    if (d.powerUse > d.powerCap * 0.85) {
      const b = best('power');
      if (b) consider('b', b.id, buildingCost(s, b, m));
    } else if (d.heat > d.coolCap * 0.85) {
      const b = best('cooling');
      if (b) consider('b', b.id, buildingCost(s, b, m));
    } else {
      const b = best('compute');
      if (b) consider('b', b.id, buildingCost(s, b, m));
    }
    const nano = BUILDINGS.find((b) => b.id === 'nano')!;
    if (isUnlocked(s, nano)) consider('b', 'nano', buildingCost(s, nano, m) * 0.5);

    for (const st of STAFF) {
      if (!isUnlocked(s, st)) continue;
      let c = staffCost(s, st, m);
      if (st.id === 'labeler' && s.data > d.dataNeed * 2) c *= 4;
      consider('s', st.id, c * 1.5);
    }
    const p = pick as { kind: 'b' | 's'; id: string; cost: number } | null;
    if (!p) break;
    const ok = p.kind === 'b' ? buyBuilding(s, p.id) : hire(s, p.id);
    if (!ok) break;
  }
}

export function report(r: SimResult) {
  const s = r.state;
  const lines = r.eraTimes.map((t, i) => `${ERAS[i].short.padEnd(14)} ab ${(t / 60).toFixed(1)} min`);
  lines.push(`gen ${s.gen}, ended=${s.ended}, t=${(s.time / 60).toFixed(1)} min, earth=${(s.earthKg / 5.97e24 * 100).toFixed(1)}%`);
  const gt = r.genTimes.map((t, i) => `${i + 1}:${(t / 60).toFixed(1)}`).join(' ');
  lines.push(gt);
  lines.push(...r.snaps);
  return lines.join('\n');
}
