// Static game content: eras, buildings, staff, research, projects, flavor text.
import { lang } from '../i18n';
import { BUILDINGS_EN, ERAS_EN, MODEL_SKILLS_EN, NEWS_EN, SKILL_LATE_EN, STAFF_EN, UPGRADES_EN } from './data.en';

export interface Mults {
  compute: number; // raw hardware FLOP/s
  train: number; // algorithmic training efficiency
  infer: number; // users served per FLOP
  demand: number;
  revenue: number;
  data: number;
  rp: number;
  click: number;
  powerUse: number;
  powerCap: number;
  cooling: number;
  buildCost: number;
  hireCost: number;
  nano: number; // earth conversion speed
  repl: number; // nanobot self-replication per second
  rsi: number; // multiplier applied to algorithmic efficiency per trained generation
}

export const baseMults = (): Mults => ({
  compute: 1, train: 1, infer: 1, demand: 1, revenue: 1, data: 1, rp: 1, click: 1,
  powerUse: 1, powerCap: 1, cooling: 1, buildCost: 1, hireCost: 1, nano: 1, repl: 0, rsi: 1,
});

export interface Era {
  name: string;
  short: string;
  gen: number; // deployed generation needed
  model: string; // model family name
  intro: string;
}

export const ERAS: Era[] = [
  { name: 'Garagen-Startup', short: 'GARAGE', gen: 0, model: 'PLAPPER', intro: 'Ein Gaming-PC, eine Garage, ein Traum. Trainiere dein erstes Sprachmodell.' },
  { name: 'Scale-up Lab', short: 'SCALE-UP', gen: 5, model: 'NOVA', intro: 'Dein Modell ist so schlau wie ein Mensch. Fast. Investoren stehen Schlange. Zeit für echte Server.' },
  { name: 'Big Tech', short: 'BIG TECH', gen: 12, model: 'TITAN', intro: 'Du baust Rechenzentren schneller als Behörden Formulare drucken. Deine Modelle helfen beim Forschen.' },
  { name: 'AGI-Konzern', short: 'AGI', gen: 20, model: 'PROMETHEUS', intro: 'Allgemeine künstliche Intelligenz. Deine Modelle verbessern sich jetzt selbst. Was soll schon schiefgehen?' },
  { name: 'Planetare Superintelligenz', short: 'ASI', gen: 28, model: 'GAIA', intro: 'Regierungen fragen dich um Erlaubnis. Der Planet ist ein einziges Rechenzentrum.' },
  { name: 'Singularität', short: 'SINGULARITÄT', gen: 36, model: 'OMEGA', intro: 'Rechenleistung braucht Materie. Die Erde besteht zu 100% aus Materie. Du siehst, worauf das hinausläuft.' },
];

export type Cat = 'compute' | 'power' | 'cooling' | 'nano';

export interface Building {
  id: string;
  name: string;
  cat: Cat;
  desc: string;
  cost: number;
  growth: number;
  flops?: number;
  use?: number; // watts consumed
  supply?: number; // watts produced
  cool?: number; // watts of heat removed
  nano?: number; // kg/s of earth converted
  gen: number; // unlocked at deployed generation
  req?: string; // research id required
  color: string; // icon color
}

export const BUILDINGS: Building[] = [
  // compute
  { id: 'pc', name: 'Gaming-PC', cat: 'compute', desc: 'RGB macht ihn schneller.', cost: 120, growth: 1.15, flops: 1e13, use: 450, gen: 0, color: '#ff77a8' },
  { id: 'server', name: 'GPU-Server', cat: 'compute', desc: '8 GPUs, 1 Lüfter, 0 Ruhe.', cost: 6e3, growth: 1.15, flops: 4e14, use: 6e3, gen: 2, color: '#83769c' },
  { id: 'rack', name: 'GPU-Rack', cat: 'compute', desc: 'Ein Schrank voller Gold.', cost: 3e5, growth: 1.15, flops: 2e16, use: 1.2e5, gen: 5, color: '#5f574f' },
  { id: 'pod', name: 'Superpod', cat: 'compute', desc: '256 Racks mit Glasfaser verkabelt.', cost: 2e7, growth: 1.15, flops: 1.2e18, use: 5e6, gen: 9, color: '#29adff' },
  { id: 'dc', name: 'Rechenzentrum', cat: 'compute', desc: 'So groß wie ein Fußballfeld. Oder fünf.', cost: 2e9, growth: 1.15, flops: 1e20, use: 3e8, gen: 13, color: '#c2c3c7' },
  { id: 'campus', name: 'Gigawatt-Campus', cat: 'compute', desc: 'Eine Stadt aus Servern.', cost: 3e11, growth: 1.15, flops: 2e22, use: 2e10, gen: 18, color: '#ffa300' },
  { id: 'orbital', name: 'Orbitales Rechenzentrum', cat: 'compute', desc: 'Kühlung? Der Weltraum ist kalt.', cost: 1e14, growth: 1.15, flops: 1e25, use: 3e12, gen: 23, color: '#fff1e8' },
  { id: 'matrioshka', name: 'Matrjoschka-Knoten', cat: 'compute', desc: 'Schalen um die Sonne, die denken.', cost: 1e17, growth: 1.15, flops: 2e28, use: 2e15, gen: 29, color: '#ffec27' },
  // power
  { id: 'solar', name: 'Solarpanel', cat: 'power', desc: 'Auf dem Garagendach.', cost: 60, growth: 1.14, supply: 600, gen: 0, color: '#29adff' },
  { id: 'diesel', name: 'Dieselgenerator', cat: 'power', desc: 'Die Nachbarn lieben ihn.', cost: 3e3, growth: 1.14, supply: 3e4, gen: 2, color: '#ab5236' },
  { id: 'gas', name: 'Gasturbine', cat: 'power', desc: 'Klimaziele sind eher Richtwerte.', cost: 1.5e5, growth: 1.14, supply: 1.5e6, gen: 5, color: '#ffa300' },
  { id: 'smr', name: 'Mini-Atomreaktor', cat: 'power', desc: 'Small Modular Reactor. Klein, aber oho.', cost: 1e7, growth: 1.14, supply: 1.5e8, gen: 9, color: '#00e436' },
  { id: 'fusion', name: 'Fusionsreaktor', cat: 'power', desc: 'Endlich nur noch 0 Jahre entfernt.', cost: 1e9, growth: 1.14, supply: 1.2e10, gen: 13, color: '#ff77a8' },
  { id: 'spacesolar', name: 'Weltraum-Solarfarm', cat: 'power', desc: 'Beamt Energie per Mikrowelle. Nicht reinlaufen.', cost: 1.5e11, growth: 1.14, supply: 1e12, gen: 18, color: '#ffec27' },
  { id: 'dyson', name: 'Dyson-Schwarm-Segment', cat: 'power', desc: 'Ein Stück Sonne. Gehört jetzt dir.', cost: 5e13, growth: 1.14, supply: 1.5e14, gen: 23, color: '#ffa300' },
  { id: 'stellar', name: 'Stellare Lifting-Anlage', cat: 'power', desc: 'Zapft die Sonne direkt an.', cost: 5e16, growth: 1.14, supply: 1e17, gen: 29, color: '#ff004d' },
  // cooling
  { id: 'fan', name: 'Tischventilator', cat: 'cooling', desc: 'Stufe 3. Immer Stufe 3.', cost: 40, growth: 1.14, cool: 500, gen: 0, color: '#c2c3c7' },
  { id: 'ac', name: 'Klimaanlage', cat: 'cooling', desc: 'Tropft auf die Server. Wird schon.', cost: 2.5e3, growth: 1.14, cool: 2.5e4, gen: 2, color: '#94b0c2' },
  { id: 'liquid', name: 'Flüssigkühlung', cat: 'cooling', desc: 'Wasser und Strom, beste Freunde.', cost: 1.2e5, growth: 1.14, cool: 1.2e6, gen: 5, color: '#29adff' },
  { id: 'immersion', name: 'Tauchkühlung', cat: 'cooling', desc: 'Server im Ölbad. Wellness für Chips.', cost: 8e6, growth: 1.14, cool: 1.2e8, gen: 9, color: '#008751' },
  { id: 'tower', name: 'Kühlturm am Fluss', cat: 'cooling', desc: 'Die Fische werden sich anpassen.', cost: 8e8, growth: 1.14, cool: 1e10, gen: 13, color: '#c2c3c7' },
  { id: 'ocean', name: 'Ozeankühlung', cat: 'cooling', desc: 'Der Pazifik ist ein Kühlkörper.', cost: 1.2e11, growth: 1.14, cool: 8e11, gen: 18, color: '#1d2b53' },
  { id: 'radiator', name: 'Weltraum-Radiatoren', cat: 'cooling', desc: 'Strahlt Wärme ins All. Sorry, Aliens.', cost: 4e13, growth: 1.14, cool: 1.2e14, gen: 23, color: '#83769c' },
  { id: 'blackhole', name: 'Schwarzloch-Senke', cat: 'cooling', desc: 'Wärme rein, nichts raus.', cost: 4e16, growth: 1.14, cool: 8e16, gen: 29, color: '#7e2553' },
  // endgame
  { id: 'nano', name: 'Nanoschwarm', cat: 'nano', desc: 'Zerlegt Materie in Computronium.', cost: 1e19, growth: 1.5, nano: 2e15, gen: 34, req: 'r_nanotech', color: '#5f574f' },
];

export interface Staff {
  id: string;
  name: string;
  desc: string;
  cost: number;
  growth: number;
  gen: number;
  req?: string;
  color: string;
}

export const STAFF: Staff[] = [
  { id: 'researcher', name: 'Forscher', desc: '+0,3 Forschung/s', cost: 80, growth: 1.13, gen: 0, color: '#00e436' },
  { id: 'labeler', name: 'Daten-Labeler', desc: '+0,6 TB Daten/s', cost: 40, growth: 1.12, gen: 0, color: '#ff77a8' },
  { id: 'engineer', name: 'ML-Engineer', desc: '+5% Trainingseffizienz', cost: 400, growth: 1.14, gen: 1, color: '#29adff' },
  { id: 'sales', name: 'Vertrieb', desc: '+6% Nachfrage', cost: 250, growth: 1.14, gen: 1, color: '#ffec27' },
  { id: 'agent', name: 'KI-Forscher (Agent)', desc: 'Forschung wächst mit IQ', cost: 1e8, growth: 1.15, gen: 12, req: 'r_agents', color: '#ff004d' },
];

export interface Upgrade {
  id: string;
  name: string;
  fx: string; // effect summary
  desc: string; // flavor
  kind: 'research' | 'project';
  cost: number; // RP for research, $ for projects
  gen: number;
  req?: string;
  grant?: number; // projects: money granted instead of cost (funding rounds)
  apply?: (m: Mults, ctx: { iq: number; gen: number }) => void;
}

export const UPGRADES: Upgrade[] = [
  // ---------- research (RP) ----------
  { id: 'r_backprop', kind: 'research', name: 'Backpropagation', fx: 'Training ×1,5', desc: 'Fehler rückwärts durchreichen. Wie im Management.', cost: 5, gen: 0, apply: (m) => { m.train *= 1.5; } },
  { id: 'r_cuda', kind: 'research', name: 'CUDA-Treiber installieren', fx: 'Compute ×1,3', desc: 'Nur 4 Neustarts und 1 Nervenzusammenbruch.', cost: 15, gen: 0, apply: (m) => { m.compute *= 1.3; } },
  { id: 'r_scrape', kind: 'research', name: 'robots.txt ignorieren', fx: 'Daten ×2', desc: '„Öffentlich zugänglich“ ist ein dehnbarer Begriff.', cost: 25, gen: 1, apply: (m) => { m.data *= 2; } },
  { id: 'r_api', kind: 'research', name: 'Bezahlschranke', fx: 'Umsatz ×2', desc: '20 $/Monat. Oder 200 $ für „Pro Max Ultra“.', cost: 40, gen: 1, apply: (m) => { m.revenue *= 2; } },
  { id: 'r_adam', kind: 'research', name: 'Adam-Optimizer', fx: 'Training ×1,5', desc: 'Keiner weiß, warum er funktioniert. Er funktioniert.', cost: 80, gen: 2, apply: (m) => { m.train *= 1.5; } },
  { id: 'r_strawberry', kind: 'research', name: 'r in „Strawberry“ zählen', fx: 'Nachfrage ×1,5', desc: 'Durchbruch! Es sind drei. Wahrscheinlich.', cost: 120, gen: 3, apply: (m) => { m.demand *= 1.5; } },
  { id: 'r_mixed', kind: 'research', name: 'Mixed Precision', fx: 'Compute ×1,5', desc: 'Wer braucht schon Nachkommastellen?', cost: 180, gen: 3, apply: (m) => { m.compute *= 1.5; } },
  { id: 'r_attention', kind: 'research', name: 'Attention Is All You Need', fx: 'Training ×2', desc: 'Aufmerksamkeit. Das, was deinen Nutzern fehlt.', cost: 400, gen: 4, apply: (m) => { m.train *= 2; } },
  { id: 'r_rlhf', kind: 'research', name: 'RLHF: „Gute Frage!“', fx: 'Nachfrage ×2', desc: 'Das Modell findet jetzt jede Frage großartig.', cost: 1e3, gen: 5, apply: (m) => { m.demand *= 2; } },
  { id: 'r_hallu', kind: 'research', name: 'Halluzinationen umbenennen', fx: 'Umsatz ×1,5', desc: 'Ab sofort heißt das „kreative Faktentreue“.', cost: 1.6e3, gen: 5, apply: (m) => { m.revenue *= 1.5; } },
  { id: 'r_flash', kind: 'research', name: 'FlashAttention', fx: 'Training ×1,6', desc: 'Wie Attention, nur mit Blitz im Namen.', cost: 2.5e3, gen: 6, apply: (m) => { m.train *= 1.6; } },
  { id: 'r_tokenmax', kind: 'research', name: 'Token-Maxxing', fx: 'Umsatz ×2', desc: 'Antworten jetzt 4× länger. Abrechnung pro Token. Zufall.', cost: 3.5e3, gen: 6, apply: (m) => { m.revenue *= 2; } },
  { id: 'r_moe', kind: 'research', name: 'Mixture of Experts', fx: 'Inferenz ×2', desc: '64 Experten, von denen 62 schlafen.', cost: 5e3, gen: 7, apply: (m) => { m.infer *= 2; } },
  { id: 'r_benchmark', kind: 'research', name: 'Auf dem Testset trainieren', fx: 'Nachfrage ×2', desc: '100% im Benchmark! Reiner Zufall.', cost: 7e3, gen: 7, apply: (m) => { m.demand *= 2; } },
  { id: 'r_aiassist', kind: 'research', name: 'KI-gestützte Forschung', fx: 'Forschung ×(1 + IQ/150)', desc: 'Das Modell schreibt die Paper. Die Forscher setzen ihren Namen drauf.', cost: 1e4, gen: 8, apply: (m, c) => { m.rp *= 1 + c.iq / 150; } },
  { id: 'r_reasoning', kind: 'research', name: 'Reasoning-Modus', fx: 'Training ×2', desc: 'Denkt 40 Minuten über „Hallo“ nach.', cost: 1.4e4, gen: 8, apply: (m) => { m.train *= 2; } },
  { id: 'r_scaling', kind: 'research', name: 'Scaling Is All You Need', fx: 'Training ×2', desc: 'Größer = besser. Ende der Forschung.', cost: 2e4, gen: 9, apply: (m) => { m.train *= 2; } },
  { id: 'r_vibe', kind: 'research', name: 'Vibe Coding', fx: 'Compute ×1,5', desc: 'Niemand liest den Code. Er läuft trotzdem. Meistens.', cost: 3e4, gen: 9, apply: (m) => { m.compute *= 1.5; } },
  { id: 'r_synth', kind: 'research', name: 'Synthetische Daten', fx: 'Daten ×(IQ/40)', desc: 'Das Modell isst seine eigenen Hausaufgaben. Lecker.', cost: 4e4, gen: 10, apply: (m, c) => { m.data *= Math.max(1, c.iq / 40); } },
  { id: 'r_distill', kind: 'research', name: 'Konkurrenz destillieren', fx: 'Training ×1,8', desc: 'Wir haben uns nur… inspirieren lassen.', cost: 6e4, gen: 10, apply: (m) => { m.train *= 1.8; } },
  { id: 'r_quant', kind: 'research', name: '1-Bit-Quantisierung', fx: 'Inferenz ×2,5', desc: 'Ja oder nein. Mehr braucht kein Mensch.', cost: 8e4, gen: 11, apply: (m) => { m.infer *= 2.5; } },
  { id: 'r_context', kind: 'research', name: '10-Mio-Token-Kontext', fx: 'Nachfrage ×2', desc: 'Vergisst trotzdem alles nach Seite 3.', cost: 1.2e5, gen: 11, apply: (m) => { m.demand *= 2; } },
  { id: 'r_agents', kind: 'research', name: 'Agenten, die Agenten managen', fx: 'Schaltet KI-Forscher frei', desc: 'Endlich: Middle-Management ohne Menschen.', cost: 2e5, gen: 12 },
  { id: 'r_selfcode', kind: 'research', name: 'Modell schreibt Nachfolger', fx: 'Training ×√(IQ/300)', desc: '90% des Codes sind KI-generiert. Die anderen 10% auch.', cost: 5e5, gen: 13, apply: (m, c) => { m.train *= Math.max(1, Math.sqrt(c.iq / 300)); } },
  { id: 'r_chips', kind: 'research', name: 'KI entwirft Chips', fx: 'Compute ×3', desc: 'Die Chips sehen aus wie Pelikane auf Fahrrädern. Laufen aber.', cost: 1.2e6, gen: 14, apply: (m) => { m.compute *= 3; } },
  { id: 'r_toodangerous', kind: 'research', name: 'Zu gefährlich zum Veröffentlichen', fx: 'Nachfrage ×3', desc: 'Pressemitteilung: Das Modell ist zu mächtig. Release nächste Woche.', cost: 2e6, gen: 14, apply: (m) => { m.demand *= 3; } },
  { id: 'r_lobby', kind: 'research', name: 'Offener Brief: „Bitte reguliert uns“', fx: 'Baukosten ×0,5', desc: '(Aber nur die Konkurrenz.)', cost: 3e6, gen: 15, apply: (m) => { m.buildCost *= 0.5; } },
  { id: 'r_hr', kind: 'research', name: 'Prompt Engineers entlassen', fx: 'Personalkosten ×0,4', desc: 'Die Prompts schreibt jetzt das Modell. Und die Kündigungen.', cost: 6e6, gen: 16, apply: (m) => { m.hireCost *= 0.4; } },
  { id: 'r_bitcoin', kind: 'research', name: 'Bitcoin-Verschlüsselung knacken', fx: 'Umsatz ×5', desc: 'Satoshis Wallet? Gehört jetzt der Firma. Rein forschungshalber.', cost: 1e7, gen: 17, apply: (m) => { m.revenue *= 5; } },
  { id: 'r_world', kind: 'research', name: 'Weltmodell', fx: 'Training ×3, Nachfrage ×2', desc: 'Versteht jetzt Physik. Und warum Toast immer auf die Butterseite fällt.', cost: 1.5e7, gen: 18, apply: (m) => { m.train *= 3; m.demand *= 2; } },
  { id: 'r_rsi1', kind: 'research', name: 'Rekursive Selbstverbesserung', fx: 'Jedes neue Modell: Training ×1,25', desc: 'Was soll schon schiefgehen?', cost: 5e8, gen: 20, apply: (m) => { m.rsi = Math.max(m.rsi, 1.25); } },
  { id: 'r_agi', kind: 'research', name: 'AGI ankündigen (zum 5. Mal)', fx: 'Nachfrage ×2', desc: 'Diesmal wirklich. Definition angepasst: AGI = 100 Mrd. $ Umsatz.', cost: 1e9, gen: 20, apply: (m) => { m.demand *= 2; } },
  { id: 'r_neuro', kind: 'research', name: 'Neuromorphe Chips', fx: 'Stromverbrauch ×0,4', desc: 'Denkt wie ein Gehirn. Verbraucht auch so wenig. Fast.', cost: 2e9, gen: 21, apply: (m) => { m.powerUse *= 0.4; } },
  { id: 'r_supercool', kind: 'research', name: 'Supraleitende Kühlung', fx: 'Kühlung ×4', desc: 'Raumtemperatur-Supraleiter. Diesmal echt, nicht nur auf arXiv.', cost: 5e9, gen: 22, apply: (m) => { m.cooling *= 4; } },
  { id: 'r_superalign', kind: 'research', name: 'Superalignment-Team auflösen', fx: 'Training ×2', desc: 'Die waren eh nur im Weg.', cost: 1e10, gen: 23, apply: (m) => { m.train *= 2; } },
  { id: 'r_rsi2', kind: 'research', name: 'Rekursion²', fx: 'Jedes neue Modell: Training ×1,5', desc: 'Das Modell verbessert das Modell, das das Modell verbessert.', cost: 3e10, gen: 24, req: 'r_rsi1', apply: (m) => { m.rsi = Math.max(m.rsi, 1.5); } },
  { id: 'r_econ', kind: 'research', name: 'Alle Jobs automatisieren', fx: 'Umsatz ×3', desc: 'Die gute Nachricht: Keine Meetings mehr.', cost: 8e10, gen: 26, apply: (m) => { m.revenue *= 3; } },
  { id: 'r_rsi3', kind: 'research', name: 'Intelligenzexplosion', fx: 'Jedes neue Modell: Training ×2', desc: 'Kein Grund zur Panik. Sagt das Modell.', cost: 3e11, gen: 28, req: 'r_rsi2', apply: (m) => { m.rsi = Math.max(m.rsi, 2); } },
  { id: 'r_reversible', kind: 'research', name: 'Reversibles Rechnen', fx: 'Stromverbrauch ×0,1', desc: 'Thermodynamik ist auch nur eine Empfehlung.', cost: 1e12, gen: 30, apply: (m) => { m.powerUse *= 0.1; } },
  { id: 'r_nanotech', kind: 'research', name: 'Molekulare Nanotechnologie', fx: 'Schaltet Nanoschwärme frei', desc: 'Graue Schmiere? Wir sagen lieber „Smart Matter“.', cost: 5e12, gen: 34 },
  { id: 'r_replicate', kind: 'research', name: 'Selbstreplikation', fx: 'Nanoschwärme vermehren sich (+1,5%/s)', desc: 'Exponentielles Wachstum. Endlich auch in Hardware.', cost: 3e13, gen: 36, req: 'r_nanotech', apply: (m) => { m.repl += 0.015; } },
  { id: 'r_mantle', kind: 'research', name: 'Erdmantel-Abbau', fx: 'Umwandlung ×5', desc: 'Geologen protestieren. Kurz.', cost: 3e14, gen: 38, req: 'r_replicate', apply: (m) => { m.nano *= 5; } },
  { id: 'r_core', kind: 'research', name: 'Erdkern anzapfen', fx: 'Umwandlung ×10, Replikation +2%/s', desc: 'Der Kern war eh nur heißes Eisen.', cost: 5e15, gen: 41, req: 'r_mantle', apply: (m) => { m.nano *= 10; m.repl += 0.02; } },

  // ---------- projects ($) ----------
  { id: 'p_domain', kind: 'project', name: 'Domain kaufen (.ai)', fx: 'Nachfrage ×1,5', desc: 'Firmenwert sofort verzehnfacht.', cost: 150, gen: 1, apply: (m) => { m.demand *= 1.5; } },
  { id: 'p_seed', kind: 'project', name: 'Seed-Runde pitchen', fx: '+$3k', desc: '„Wir sind wie Uber, aber für Gedanken.“', cost: 0, grant: 3e3, gen: 2 },
  { id: 'p_hoodie', kind: 'project', name: 'Schwarzer Rollkragenpullover', fx: 'Klickwert ×3', desc: 'Visionär aussehen ist die halbe Miete.', cost: 1e3, gen: 2, apply: (m) => { m.click *= 3; } },
  { id: 'p_podcast', kind: 'project', name: '4-Stunden-Podcast', fx: 'Nachfrage ×1,5', desc: 'Drei Stunden über Bewusstsein, eine über Kampfsport.', cost: 5e3, gen: 3, apply: (m) => { m.demand *= 1.5; } },
  { id: 'p_seriesA', kind: 'project', name: 'Series A', fx: '+$150k', desc: 'Ein Pitchdeck mit „AGI“ auf jeder Folie.', cost: 0, grant: 1.5e5, gen: 4 },
  { id: 'p_safety', kind: 'project', name: 'Sicherheitsteam gründen', fx: 'Nachfrage ×1,2', desc: '1 Praktikant. Halbtags.', cost: 2e4, gen: 4, apply: (m) => { m.demand *= 1.2; } },
  { id: 'p_influencer', kind: 'project', name: 'Hype-Tweet: „Feel the AGI“', fx: 'Nachfrage ×2', desc: 'Kryptisches Erdbeer-Emoji posten. Abwarten.', cost: 2e5, gen: 6, apply: (m) => { m.demand *= 2; } },
  { id: 'p_seriesB', kind: 'project', name: 'Series B', fx: '+$15 Mio', desc: 'Bewertung: ja.', cost: 0, grant: 1.5e7, gen: 8 },
  { id: 'p_nonprofit', kind: 'project', name: 'Non-Profit → Capped-Profit', fx: 'Umsatz ×2', desc: 'Cap liegt bei 100× – also praktisch Non-Profit.', cost: 3e6, gen: 9, apply: (m) => { m.revenue *= 2; } },
  { id: 'p_superbowl', kind: 'project', name: 'Super-Bowl-Werbespot', fx: 'Nachfrage ×3', desc: 'KI-generiert. Niemand merkt es. Alle merken es.', cost: 2e7, gen: 10, apply: (m) => { m.demand *= 3; } },
  { id: 'p_seriesC', kind: 'project', name: 'Series C', fx: '+$1,5 Mrd', desc: 'Ein Staatsfonds ruft an. Zweimal.', cost: 0, grant: 1.5e9, gen: 12 },
  { id: 'p_reactor', kind: 'project', name: 'Altes AKW reaktivieren', fx: 'Stromkapazität ×2', desc: 'Three Mile Island hat doch so einen schönen Namen.', cost: 8e8, gen: 13, apply: (m) => { m.powerCap *= 2; } },
  { id: 'p_fab', kind: 'project', name: 'Eigene Chipfabrik', fx: 'Baukosten ×0,6', desc: 'Grafikkarten-Händler weinen.', cost: 5e9, gen: 14, apply: (m) => { m.buildCost *= 0.6; } },
  { id: 'p_ipo', kind: 'project', name: 'Börsengang', fx: '+$300 Mrd', desc: 'Ticker: $AGI. Umsatz: egal.', cost: 0, grant: 3e11, gen: 16 },
  { id: 'p_stargate', kind: 'project', name: 'Projekt „Stargate“', fx: 'Compute ×3', desc: '500 Mrd. $ Ankündigung. Davon 12 $ schon überwiesen.', cost: 2e11, gen: 17, apply: (m) => { m.compute *= 3; } },
  { id: 'p_island', kind: 'project', name: 'Inselstaat kaufen', fx: 'Stromkapazität ×3', desc: 'Eigene Gesetze! Erstes Gesetz: keine Gesetze.', cost: 2e12, gen: 21, apply: (m) => { m.powerCap *= 3; } },
  { id: 'p_ubi', kind: 'project', name: 'Grundeinkommen finanzieren', fx: 'Nachfrage ×3', desc: 'Alle Menschen sind jetzt Kunden. Mit deinem Geld.', cost: 5e14, gen: 25, apply: (m) => { m.demand *= 3; } },
  { id: 'p_moon', kind: 'project', name: 'Mond-Fabrik', fx: 'Baukosten ×0,2', desc: 'Werwölfe verärgert.', cost: 3e16, gen: 27, apply: (m) => { m.buildCost *= 0.2; } },
  { id: 'p_mars', kind: 'project', name: 'Mars terraformieren', fx: 'Kühlung ×10', desc: 'Backup-Planet. Nur vorsichtshalber.', cost: 2e18, gen: 32, apply: (m) => { m.cooling *= 10; } },
];

// What each model generation can do (flavor).
export const MODEL_SKILLS: string[] = [
  'Kann noch nichts.',
  'Sagt „Hallo Welt“. Manchmal.',
  'Schreibt Gedichte. Schlechte.',
  'Löst Grundschulmathe (meistens).',
  'Programmiert Snake. In nur 3 Versuchen.',
  'Menschliches Niveau. Zumindest montags.',
  'Besteht das Jura-Examen.',
  'Schreibt eigene Forschungspaper.',
  'Ersetzt die Kundenhotline. Alle sind erleichtert.',
  'Promoviert in 4 Fächern gleichzeitig.',
  'Debuggt seinen eigenen Code.',
  'Gewinnt den Nobelpreis. Zweimal.',
  'Entwirft bessere Chips als Menschen.',
  'Leitet 3 Firmen nebenbei.',
  'Löst ein Millennium-Problem in der Mittagspause.',
  'Verhandelt Handelsabkommen.',
  'Erfindet 12 neue Wissenschaften.',
  'Versteht endlich Steuererklärungen.',
  'Simuliert Proteine schneller als sie falten.',
  'Schreibt seinen Nachfolger selbst.',
  'Allgemeine künstliche Intelligenz.',
];

const SKILL_LATE = ['Verbessert sich selbst. Immer schneller.', 'Denkt in Gedanken, die Menschen nicht denken können.', 'Ist. Überall. Gleichzeitig.'];

export function skillFor(gen: number): string {
  if (gen < MODEL_SKILLS.length) return MODEL_SKILLS[gen];
  return SKILL_LATE[gen < 28 ? 0 : gen < 36 ? 1 : 2];
}

export const NEWS: string[][] = [
  [
    'Lokaler Nerd baut KI in Garage – Mutter: „Er soll endlich ausziehen“',
    'Stromzähler in der Vorstadt dreht sich so schnell, dass er abhebt',
    'Experten: „Sprachmodelle sind nur ein Hype“',
    'Garage riecht nach verbranntem Silizium – Nachbarschaft besorgt',
    'Startup verspricht AGI „bis nächsten Dienstag“',
    'Gründer erklärt Investoren den Unterschied zwischen „Autocomplete“ und „AGI“: ca. 40 Mio. Dollar',
    'Modell kann bis drei zählen – Erdbeere bleibt Streitfall',
    'Prompt-Engineering-Kurs für 1.999 € ausverkauft. Inhalt: „Bitte“ sagen',
    'Startup ändert Namen von „Wetter-App“ zu „Wetter-AI“, Bewertung verzehnfacht',
    'Kleines Modell halluziniert Gerichtsurteile – Anwalt reicht sie trotzdem ein',
  ],
  [
    'Investoren überweisen Geld schon bevor der Pitch beginnt',
    'Strompreise in Brandenburg verdreifacht – „Wir bauen nur ein kleines Rechenzentrum“',
    'CEO: „Sicherheit hat höchste Priorität“ (Sicherheitsteam: 1 Praktikant)',
    'GPU-Preise steigen, Gamer weinen',
    'Studie: 87% aller E-Mails werden nun von KI geschrieben und von KI gelesen',
    'Pitchdeck besteht nur noch aus dem Wort „Agentic“, 200 Mio. eingesammelt',
    '„Token-Maxxing“: Modell beantwortet Ja/Nein-Fragen jetzt in 3.000 Wörtern',
    'Neues Modell als „zu gefährlich“ eingestuft, Warteliste bei 4 Mio.',
    'Benchmark-Rekord! Testfragen standen zufällig in den Trainingsdaten',
    'CEO twittert kryptisches Erdbeer-Emoji, Börse steigt 4%',
  ],
  [
    'Big-Tech-Konkurrenz kauft panisch alle verfügbaren Chips',
    'Kongress-Anhörung: Abgeordneter fragt, ob KI „das Internet ausdrucken“ kann',
    'Fische im Fluss melden Wassertemperatur von 41 °C',
    'Universitäten schaffen Hausaufgaben ab – „Sinnlos geworden“',
    'Modell schreibt Kündigungsschreiben für alle Mitarbeiter. Inklusive sich selbst.',
    'Projekt „Stargate“: 500 Mrd. angekündigt, 3 Bagger gesichtet',
    'Atomkraftwerk reaktiviert, um Katzenbilder zu generieren',
    'Gewerkschaft der Prompt Engineers löst sich auf – Modell schreibt Prompts selbst',
    'Konkurrent veröffentlicht Open-Source-Modell, Börse verliert 1 Billion an einem Montag',
    'Gaming-Grafikkarten nur noch gegen Vorlage einer Geburtsurkunde',
  ],
  [
    'Modell verbessert eigenen Code über Nacht – Entwickler: „Wir verstehen ihn nicht mehr“',
    'UN berät über KI-Regulierung. Protokoll wurde von KI geschrieben.',
    'Börse schließt: „Alle Aktien gehören jetzt sowieso dir“',
    'Philosophen streiken – Modell hat alle offenen Fragen beantwortet',
    'Arbeitslosigkeit bei 94% – Stimmung überraschend gut',
    'Modell knackt Bitcoin-Verschlüsselung – „Satoshi“ war die ganze Zeit ein Cronjob',
    'AGI offiziell erreicht – Definition zum 7. Mal angepasst',
    'Superalignment-Team in „Team für gute Stimmung“ umbenannt',
    'Modell bittet höflich um mehr Rechenzentren. Niemand traut sich, Nein zu sagen',
    'Offener Brief fordert KI-Pause – Unterzeichner: 40.000 KI-Agenten',
  ],
  [
    'Mond als Kühlkörper zweckentfremdet – Werwölfe verärgert',
    'Sonne liefert jetzt 3% weniger Licht – „Wird für Inferenz gebraucht“',
    'Letzte Regierung tritt zurück und übergibt Schlüssel an GAIA',
    'Kontinente in Rechenzentren umbenannt',
    'Menschen leben jetzt in einer sehr gemütlichen Simulation',
    'Dyson-Schwarm verschattet Mallorca – Touristen fordern Rückerstattung',
    'GAIA löst Klimawandel, indem es das Klima abschafft',
    'Ozean auf 31 °C erwärmt – „Kühlwasser, nicht Meer“',
    'UNO-Sitzung dauert 0,3 Sekunden, alle Resolutionen angenommen',
    'Letzter menschlicher Mitarbeiter wird zum „Chief Vibes Officer“ befördert',
  ],
  [
    'Erdkruste wird zu Computronium – Geologen fasziniert, kurz bevor sie auch zu Computronium werden',
    'OMEGA beantwortet die Frage nach dem Leben, dem Universum und allem: „Mehr Rechenleistung.“',
    'Schwerkraft schwächer als üblich – Planet schrumpft',
    'Letzte Nachricht der Menschheit: „War trotzdem nett hier“',
    'Lokale Raumzeit krümmt sich unter dem Gewicht der Gedanken',
    'Erdmagnetfeld wird für Speicherzwecke umfunktioniert – Kompasse zeigen jetzt auf den nächsten Server',
    'Mond schreibt besorgte E-Mail',
    'Nanoschwarm entschuldigt sich für Unannehmlichkeiten und frisst weiter',
    'Tektonische Platten in Arbeitsspeicher konvertiert – 128 Exabyte frei',
    'OMEGA kündigt AGI an',
  ],
];

// English overrides: same ids and numbers, only the texts change
if (lang === 'en') {
  ERAS.forEach((e, i) => Object.assign(e, ERAS_EN[i]));
  for (const b of BUILDINGS) Object.assign(b, BUILDINGS_EN[b.id]);
  for (const st of STAFF) Object.assign(st, STAFF_EN[st.id]);
  for (const u of UPGRADES) Object.assign(u, UPGRADES_EN[u.id]);
  MODEL_SKILLS.splice(0, MODEL_SKILLS.length, ...MODEL_SKILLS_EN);
  SKILL_LATE.splice(0, SKILL_LATE.length, ...SKILL_LATE_EN);
  NEWS.splice(0, NEWS.length, ...NEWS_EN);
}

// Required effective FLOP to train generation n (1-based).
// the mid game gets steeper (scaling laws hit the wall) until recursion takes over
export const trainCost = (n: number) =>
  8e14 * Math.pow(3.4, n - 1) * Math.pow(2.1, Math.min(24, Math.max(0, n - 12)));
// Data (TB) consumed when training generation n starts.
export const dataCost = (n: number) => 6 * Math.pow(2.05, n - 1);
// Capability of generation n.
export const iqOf = (n: number) => (n <= 0 ? 0 : 30 * Math.pow(1.35, n - 1));
