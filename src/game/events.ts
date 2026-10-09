// Random "golden" events the player can click for a short boost.
import { derive, type State } from './engine';
import { money as fmtMoney, fmt } from './format';
import { L } from '../i18n';

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
    label: L('STAATSFONDS RUFT AN', 'SOVEREIGN FUND CALLING'),
    apply: (s) => {
      const d = derive(s);
      const v = Math.max(100, d.revenue * 90, s.money * 0.15);
      s.money += v;
      s.totalMoney += v;
      return L(`Ein Staatsfonds überweist ${fmtMoney(v)}. Due Diligence: „Klingt nach AGI.“`, `A sovereign wealth fund wires ${fmtMoney(v)}. Due diligence: “Sounds like AGI.”`);
    },
  },
  {
    id: 'viral',
    icon: '!!',
    label: L('PELIKAN AUF FAHRRAD', 'PELICAN ON A BICYCLE'),
    apply: (s) => {
      s.buffs.push({ kind: 'demand', mult: 3, until: s.time + 45, label: 'Viral' });
      return L('Dein Modell zeichnet einen Pelikan auf einem Fahrrad. Das Internet dreht durch: Nachfrage ×3 für 45 s.', 'Your model draws a pelican riding a bicycle. The internet loses it: demand ×3 for 45 s.');
    },
  },
  {
    id: 'leak',
    icon: 'DB',
    label: L('FORUM-ARCHIV GELEAKT', 'FORUM ARCHIVE LEAKED'),
    apply: (s) => {
      s.buffs.push({ kind: 'data', mult: 8, until: s.time + 30, label: 'Leak' });
      return L('20 Jahre Forenbeiträge, frei verfügbar. Rechtsabteilung schaut weg: Daten ×8 für 30 s.', '20 years of forum posts, freely available. Legal looks away: data ×8 for 30 s.');
    },
  },
  {
    id: 'gpu',
    icon: 'GPU',
    label: L('GPU-LIEFERUNG', 'GPU DELIVERY'),
    apply: (s) => {
      s.buffs.push({ kind: 'train', mult: 4, until: s.time + 30, label: 'GPUs' });
      return L('Ein Container voller GPUs, „vom Laster gefallen“. Training ×4 für 30 s.', 'A container full of GPUs that “fell off a truck”. Training ×4 for 30 s.');
    },
  },
  {
    id: 'bench',
    icon: '#1',
    label: L('BENCHMARK-REKORD', 'BENCHMARK RECORD'),
    apply: (s) => {
      const d = derive(s);
      const v = Math.max(20, d.rpRate * 120);
      s.rp += v;
      return L(`Neuer Rekord auf einem Benchmark, den du selbst erfunden hast. +${fmt(v)} Forschung.`, `New record on a benchmark you invented yourself. +${fmt(v)} research.`);
    },
  },
];

export function pickGolden(rand = Math.random): GoldenDef {
  return GOLDEN[Math.floor(rand() * GOLDEN.length)];
}
