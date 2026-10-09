// Random "golden" events the player can click for a short boost.
import { derive, type State } from './engine';
import { money as fmtMoney, fmt } from './format';

export interface GoldenDef {
  id: string;
  icon: string;
  label: string; // shown on the floating pickup
  apply: (s: State) => string; // returns toast text
}

export const GOLDEN: GoldenDef[] = [
  {
    id: 'investor',
    icon: '$',
    label: 'STAATSFONDS RUFT AN',
    apply: (s) => {
      const d = derive(s);
      const v = Math.max(100, d.revenue * 90, s.money * 0.15);
      s.money += v;
      s.totalMoney += v;
      return `Ein Staatsfonds überweist ${fmtMoney(v)}. Due Diligence: „Klingt nach AGI.“`;
    },
  },
  {
    id: 'viral',
    icon: '!!',
    label: 'PELIKAN AUF FAHRRAD',
    apply: (s) => {
      s.buffs.push({ kind: 'demand', mult: 3, until: s.time + 45, label: 'Viral' });
      return 'Dein Modell zeichnet einen Pelikan auf einem Fahrrad. Das Internet dreht durch: Nachfrage ×3 für 45 s.';
    },
  },
  {
    id: 'leak',
    icon: 'DB',
    label: 'FORUM-ARCHIV GELEAKT',
    apply: (s) => {
      s.buffs.push({ kind: 'data', mult: 8, until: s.time + 30, label: 'Leak' });
      return '20 Jahre Forenbeiträge, frei verfügbar. Rechtsabteilung schaut weg: Daten ×8 für 30 s.';
    },
  },
  {
    id: 'gpu',
    icon: 'GPU',
    label: 'GPU-LIEFERUNG',
    apply: (s) => {
      s.buffs.push({ kind: 'train', mult: 4, until: s.time + 30, label: 'GPUs' });
      return 'Ein Container voller GPUs, „vom Laster gefallen“. Training ×4 für 30 s.';
    },
  },
  {
    id: 'bench',
    icon: '#1',
    label: 'BENCHMARK-REKORD',
    apply: (s) => {
      const d = derive(s);
      const v = Math.max(20, d.rpRate * 120);
      s.rp += v;
      return `Neuer Rekord auf einem Benchmark, den du selbst erfunden hast. +${fmt(v)} Forschung.`;
    },
  },
];

export function pickGolden(rand = Math.random): GoldenDef {
  return GOLDEN[Math.floor(rand() * GOLDEN.length)];
}
