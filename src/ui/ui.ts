// All DOM panels: top bar, left column, shop, RSI card, ticker, toasts and modals.
import { BUILDINGS, STAFF, UPGRADES, ERAS, NEWS, skillFor, type Building, type Cat, type Upgrade } from '../game/data';
import {
  buildingCost, staffCost, buyCount, buyBuilding, hire, buyUpgrade, upgradeAffordable, isUnlocked, modelName,
  doClickMoney, doClickTrain, EARTH_KG, type Derived, type State,
} from '../game/engine';
import { fmt, money, flops, flop, watts, bytes, duration, pct } from '../game/format';
import { sfx } from './audio';

export type Amt = 1 | 10 | 'max';
type Tab = 'infra' | 'research' | 'projects';

export interface Game { s: State }

export const ERA_ACCENT = ['#00e436', '#29adff', '#ffec27', '#ffa300', '#ff77a8', '#ff004d'];

const $ = (id: string) => document.getElementById(id)!;

function el(tag: string, cls = '', html = ''): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

// ---------- 8x8 pixel icons ----------

const ICONS: Record<string, string[]> = {
  compute: ['xxxxxxxx', 'xccccccx', 'xwcgcccx', 'xxxxxxxx', 'xccccccx', 'xwcccgcx', 'xxxxxxxx', '.x....x.'],
  power: ['....cc..', '...cc...', '..cc....', '.cccccc.', '....cc..', '...cc...', '..cc....', '.cc.....'],
  cooling: ['...c....', '.c.c.c..', '..ccc...', 'ccccccc.', '..ccc...', '.c.c.c..', '...c....', '........'],
  nano: ['c...c..c', '..c...c.', '.c..c...', 'c..w..c.', '..c..c..', '.c..c..c', 'c..c.c..', '..c...c.'],
  research: ['..xxxx..', '...xx...', '...xx...', '..xccx..', '.xccccx.', 'xcwccccx', 'xccccccx', '.xxxxxx.'],
  project: ['..xxxx..', '..x..x..', 'xxxxxxxx', 'xccccccx', 'xcwwwwcx', 'xccccccx', 'xccccccx', 'xxxxxxxx'],
  grant: ['...cc...', '.cccccc.', 'cc.cc...', '.cccccc.', '...cc.cc', '.cccccc.', '...cc...', '........'],
  lock: ['..xxxx..', '.x....x.', '.x....x.', 'xxxxxxxx', 'xccccccx', 'xccxxccx', 'xccccccx', 'xxxxxxxx'],
};

const iconCache = new Map<string, string>();
function icon(kind: string, color: string): string {
  const key = kind + color;
  let uri = iconCache.get(key);
  if (!uri) {
    const rows = ICONS[kind];
    let rects = '';
    rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        const fill = ch === 'x' ? '#000' : ch === 'c' ? color : ch === 'w' ? '#fff1e8' : ch === 'g' ? '#00e436' : '';
        if (fill) rects += `<rect x='${x}' y='${y}' width='1' height='1' fill='${fill}'/>`;
      }),
    );
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8' shape-rendering='crispEdges'>${rects}</svg>`;
    uri = 'data:image/svg+xml,' + encodeURIComponent(svg);
    iconCache.set(key, uri);
  }
  return uri;
}

const HAIRS = ['#5f574f', '#000', '#ab5236', '#ffa300', '#ffec27'];

const CAT_HEAD: Record<Cat, string> = {
  compute: 'RECHENLEISTUNG',
  power: 'STROM',
  cooling: 'KÜHLUNG',
  nano: 'ENDSPIEL',
};

interface Updater { (s: State, d: Derived): void }

export class UI {
  tab: Tab = 'infra';
  amt: Amt = 1;
  private shopKey = '';
  private teamKey = '';
  private shopUpd: Updater[] = [];
  private teamUpd: Updater[] = [];
  private stat: Record<string, { v: HTMLElement; small: HTMLElement; box: HTMLElement; meter?: HTMLElement }> = {};
  private tickerX = 0;
  private lastNews = '';
  private seenUpgrades = new Set<string>();

  constructor(
    private game: Game,
    private hooks: { save: () => void; reset: () => void; prestige: () => void; toggleSound: () => boolean },
  ) {
    this.buildTop();
    this.buildLeft();
    this.buildTabs();
    this.bindMenu();
    this.nextNews();
  }

  private get s() {
    return this.game.s;
  }

  // ---------- top bar ----------

  private buildTop() {
    const box = $('stats');
    const defs: [string, string, boolean][] = [
      ['money', 'GELD', false],
      ['data', 'DATEN', false],
      ['rp', 'FORSCHUNG', false],
      ['compute', 'COMPUTE', false],
      ['power', 'STROM', true],
      ['cool', 'KÜHLUNG', true],
    ];
    for (const [id, label, meter] of defs) {
      const e = el('div', 'stat', `<span class="px-label">${label}</span><div class="v"><b></b><small></small></div>${meter ? '<div class="meter"><i></i></div>' : ''}`);
      box.appendChild(e);
      this.stat[id] = { box: e, v: e.querySelector('b')!, small: e.querySelector('small')!, meter: e.querySelector('.meter i') as HTMLElement | undefined };
    }
  }

  private setStat(id: string, v: string, small: string, warn = false, meter?: number) {
    const st = this.stat[id];
    if (st.v.textContent !== v) st.v.textContent = v;
    if (st.small.textContent !== small) st.small.textContent = small;
    st.box.classList.toggle('warn', warn);
    if (st.meter && meter !== undefined) {
      st.meter.style.width = Math.min(100, meter * 100) + '%';
      st.meter.style.background = meter > 1 ? 'var(--red)' : meter > 0.85 ? 'var(--orange)' : 'var(--green)';
    }
  }

  private updateTop(s: State, d: Derived) {
    this.setStat('money', money(s.money), `+${money(d.revenue)}/s`);
    this.setStat('data', bytes(s.data), `+${bytes(d.dataRate)}/s`, !s.dataPaid && s.gen < 60 && d.dataRate * 30 < d.dataNeed - s.data);
    this.setStat('rp', fmt(s.rp), `+${fmt(d.rpRate)}/s`);
    this.setStat('compute', flops(d.compute), d.throttle < 1 ? `${pct(d.throttle)} Leistung` : '', d.throttle < 1);
    const pw = d.powerUse / d.powerCap;
    this.setStat('power', watts(d.powerUse), `/ ${watts(d.powerCap)}`, d.powerLimited, pw);
    const ht = d.heat / d.coolCap;
    this.setStat('cool', watts(d.coolCap), d.heatLimited ? 'zu heiß!' : `${pct(Math.min(1, ht))} genutzt`, d.heatLimited, ht);

    const era = ERAS[d.era];
    $('era-count').textContent = `ÄRA ${d.era + 1} / ${ERAS.length}`;
    $('era-name').textContent = era.short;
  }

  // ---------- left column ----------

  private buildLeft() {
    $('left').innerHTML = `
      <div class="card">
        <div class="card-head"><span class="px-label">AKTUELLES MODELL</span><span class="tag" id="m-tag">LIVE</span></div>
        <div class="model-name" id="m-name"></div>
        <div class="kv">
          <span>IQ</span><span id="m-iq"></span>
          <span>Nutzer</span><span id="m-users"></span>
          <span>Preis/Nutzer</span><span id="m-price"></span>
          <span>Trainingstempo</span><span id="m-speed"></span>
        </div>
        <div class="skill" id="m-skill"></div>
      </div>
      <div class="card">
        <div class="card-head"><span class="px-label" id="t-title">TRAINING</span><span class="tag orange" id="t-tag"></span></div>
        <div class="bar" id="t-bar">${'<i></i>'.repeat(20)}</div>
        <div class="sub"><span id="t-pct"></span><span id="t-eta"></span></div>
        <div class="hint" id="t-data"></div>
        <div class="btn-row">
          <button class="big-btn" id="btn-train">TRAINING<br>BOOSTEN</button>
          <button class="big-btn alt" id="btn-money">PROMPTS<br>VON HAND</button>
        </div>
        <div class="sub"><span id="c-train"></span><span id="c-money"></span></div>
      </div>
      <div class="card alloc">
        <div class="card-head"><span class="px-label">COMPUTE-AUFTEILUNG</span></div>
        <input type="range" id="alloc" min="0" max="100" step="5" />
        <div class="sub"><span style="color:var(--blue)" id="a-train"></span><span style="color:var(--yellow)" id="a-infer"></span></div>
        <div class="hint" id="a-hint"></div>
      </div>
      <div class="card">
        <div class="card-head"><span class="px-label">TEAM</span><span class="px-label" id="team-count"></span></div>
        <div class="team" id="team"></div>
      </div>`;

    $('btn-train').addEventListener('click', (e) => {
      const v = doClickTrain(this.s);
      if (v > 0) {
        sfx.click();
        this.floater(e as MouseEvent, '+' + flop(v), 'var(--blue)');
      } else sfx.deny();
    });
    $('btn-money').addEventListener('click', (e) => {
      const v = doClickMoney(this.s);
      sfx.coin();
      this.floater(e as MouseEvent, '+' + money(v));
    });
    const slider = $('alloc') as HTMLInputElement;
    slider.addEventListener('input', () => {
      this.s.alloc = Number(slider.value) / 100;
    });
    $('team').addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('button[data-staff]') as HTMLButtonElement | null;
      if (!btn) return;
      if (hire(this.s, btn.dataset.staff!, this.amt)) sfx.buy();
      else sfx.deny();
    });
  }

  private updateLeft(s: State, d: Derived) {
    $('m-name').textContent = s.gen > 0 ? modelName(s.gen) : 'KEIN MODELL';
    $('m-tag').textContent = s.gen > 0 ? `GEN ${s.gen}` : 'OFFLINE';
    $('m-tag').className = s.gen > 0 ? 'tag' : 'tag red';
    $('m-iq').textContent = s.gen > 0 ? fmt(d.iq) : '—';
    $('m-users').textContent = `${fmt(s.users)} / ${fmt(d.demand)}`;
    $('m-price').textContent = money(d.pricePerUser) + '/s';
    $('m-speed').textContent = '×' + fmt(d.algo);
    $('m-skill').textContent = skillFor(s.gen);

    const next = modelName(s.gen + 1);
    $('t-title').textContent = `TRAINING: ${next}`;
    const bar = $('t-bar');
    const cells = bar.children;
    let frac: number;
    if (!s.dataPaid) {
      frac = Math.min(1, s.data / d.dataNeed);
      bar.classList.add('data');
      $('t-tag').textContent = 'DATEN';
      $('t-tag').className = 'tag red';
      $('t-pct').textContent = `${bytes(s.data)} / ${bytes(d.dataNeed)}`;
      $('t-eta').textContent = d.dataRate > 0 ? duration((d.dataNeed - s.data) / d.dataRate) : '∞';
      $('t-data').textContent = 'Trainingsdaten fehlen. Labeler einstellen oder Nutzer sammeln.';
      $('t-data').className = 'hint warn';
    } else {
      frac = Math.min(1, s.progress / d.need);
      bar.classList.remove('data');
      $('t-tag').textContent = d.throttle < 1 ? 'GEDROSSELT' : 'LÄUFT';
      $('t-tag').className = d.throttle < 1 ? 'tag red' : 'tag orange';
      $('t-pct').textContent = `${(frac * 100).toFixed(frac < 0.1 ? 1 : 0)}% · ${flop(d.need)}`;
      $('t-eta').textContent = 'ETA ' + duration(d.eta);
      $('t-data').textContent = `Daten bereit. Nächstes Modell braucht ${bytes(d.dataNeed)}.`;
      $('t-data').className = 'hint';
    }
    const on = Math.floor(frac * 20);
    for (let i = 0; i < 20; i++) {
      const c = cells[i] as HTMLElement;
      c.className = i < on ? (i >= 16 && s.dataPaid ? 'on hot' : 'on') : '';
    }
    ($('btn-train') as HTMLButtonElement).disabled = !s.dataPaid;
    $('c-train').textContent = '+' + flop(Math.max(d.trainRate * 0.4, 4e12 * d.mults.click * d.algo));
    $('c-money').textContent = '+' + money((2 + d.iq * 0.15) * d.mults.click + d.revenue * 0.05);

    const slider = $('alloc') as HTMLInputElement;
    const p = Math.round(s.alloc * 100);
    if (document.activeElement !== slider && slider.value !== String(p)) slider.value = String(p);
    slider.style.setProperty('--p', p + '%');
    $('a-train').textContent = `TRAINING ${p}%`;
    $('a-infer').textContent = `INFERENZ ${100 - p}%`;
    const hint = $('a-hint');
    let txt: string;
    let warn = false;
    if (s.gen === 0) {
      txt = 'Noch kein Modell. Inferenz bringt nichts, alles ins Training!';
      warn = s.alloc < 0.95;
    } else if (d.demand > d.capacity * 1.1) {
      txt = `Server voll: ${fmt(d.demand - d.capacity)} Nutzer warten. Mehr Inferenz oder Compute!`;
      warn = true;
    } else if (d.capacity > d.demand * 3) {
      txt = `Überkapazität: ${pct(1 - d.demand / d.capacity)} der Inferenz drehen Däumchen.`;
    } else txt = 'Ausgewogen. Die Investoren nicken anerkennend.';
    hint.textContent = txt;
    hint.className = warn ? 'hint warn' : 'hint';

    // team
    const visible = STAFF.filter((st) => isUnlocked(s, st));
    const key = visible.map((x) => x.id).join();
    if (key !== this.teamKey) this.buildTeam(visible.map((x) => x.id));
    for (const u of this.teamUpd) u(s, d);
    const total = Object.values(s.st).reduce((a, b) => a + b, 0);
    $('team-count').textContent = `${fmt(total)} LEUTE`;
  }

  private buildTeam(ids: string[]) {
    this.teamKey = ids.join();
    const box = $('team');
    box.innerHTML = '';
    this.teamUpd = [];
    ids.forEach((id, i) => {
      const st = STAFF.find((x) => x.id === id)!;
      const row = el('div', 'row', `
        <div class="person" style="--shirt:${st.color};--hair:${HAIRS[i % HAIRS.length]}"></div>
        <div class="txt"><span></span><small>${st.desc}</small></div>
        <button class="buy" data-staff="${id}"></button>`);
      box.appendChild(row);
      const name = row.querySelector('.txt span')!;
      const btn = row.querySelector('button')!;
      this.teamUpd.push((s, d) => {
        const n = buyCount(s, staffCost(s, st, d.mults), st.growth, this.amt);
        const cost = staffCost(s, st, d.mults, n);
        const label = `${st.name} ×${s.st[id] ?? 0}`;
        if (name.textContent !== label) name.textContent = label;
        const b = `${n > 1 ? '+' + n + ' ' : ''}${money(cost)}`;
        if (btn.textContent !== b) btn.textContent = b;
        btn.disabled = s.money < cost;
      });
    });
  }

  // ---------- shop ----------

  private buildTabs() {
    const tabs = $('tabs');
    const defs: [Tab, string][] = [['infra', 'INFRA'], ['research', 'FORSCHUNG'], ['projects', 'PROJEKTE']];
    for (const [id, label] of defs) {
      const b = el('button', 'tab', `${label}<span class="dot" hidden></span>`);
      b.dataset.tab = id;
      b.addEventListener('click', () => {
        this.tab = id;
        this.shopKey = '';
        sfx.click();
      });
      tabs.appendChild(b);
    }
    const amount = $('amount');
    amount.innerHTML = '<span class="px-label">KAUFMENGE</span>';
    for (const a of [1, 10, 'max'] as Amt[]) {
      const b = el('button', 'amt', a === 'max' ? 'MAX' : '×' + a);
      b.dataset.amt = String(a);
      b.addEventListener('click', () => {
        this.amt = a;
        sfx.click();
      });
      amount.appendChild(b);
    }
    $('shop').addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('button[data-act]') as HTMLButtonElement | null;
      if (!btn) return;
      const s = this.s;
      const id = btn.dataset.id!;
      if (btn.dataset.act === 'build') {
        if (buyBuilding(s, id, this.amt)) sfx.buy();
        else sfx.deny();
      } else if (btn.dataset.act === 'upgrade') {
        const u = UPGRADES.find((x) => x.id === id)!;
        if (buyUpgrade(s, id)) {
          if (u.kind === 'research') sfx.research();
          else sfx.coin();
          this.toast(u.kind === 'research' ? 'ERFORSCHT' : 'PROJEKT', `${u.name}: ${u.fx}`);
        } else sfx.deny();
      }
    });
  }

  private updateTabs(s: State) {
    for (const b of $('tabs').children) {
      const t = (b as HTMLElement).dataset.tab as Tab;
      b.classList.toggle('active', t === this.tab);
      // red dot: there is a new affordable upgrade in that tab
      const kind = t === 'research' ? 'research' : t === 'projects' ? 'project' : null;
      let dot = false;
      if (kind && t !== this.tab) {
        dot = UPGRADES.some((u) => u.kind === kind && !s.up[u.id] && isUnlocked(s, u) && upgradeAffordable(s, u) && !this.seenUpgrades.has(u.id));
      }
      (b.querySelector('.dot') as HTMLElement).hidden = !dot;
    }
    if (this.tab !== 'infra') {
      const kind = this.tab === 'research' ? 'research' : 'project';
      for (const u of UPGRADES) if (u.kind === kind && isUnlocked(s, u) && upgradeAffordable(s, u)) this.seenUpgrades.add(u.id);
    }
    for (const b of $('amount').querySelectorAll('.amt')) {
      b.classList.toggle('active', (b as HTMLElement).dataset.amt === String(this.amt));
    }
    ($('amount') as HTMLElement).style.visibility = this.tab === 'infra' ? 'visible' : 'hidden';
  }

  private updateShop(s: State, d: Derived) {
    const key = `${this.tab}|${s.gen}|${Object.keys(s.up).length}|${s.universe}`;
    if (key !== this.shopKey) {
      this.shopKey = key;
      const shop = $('shop');
      const top = shop.scrollTop;
      shop.innerHTML = '';
      this.shopUpd = [];
      if (this.tab === 'infra') this.buildInfra(s);
      else this.buildUpgrades(s, this.tab === 'research' ? 'research' : 'project');
      shop.scrollTop = top;
    }
    for (const u of this.shopUpd) u(s, d);
  }

  private buildInfra(s: State) {
    const shop = $('shop');
    for (const cat of ['compute', 'power', 'cooling', 'nano'] as Cat[]) {
      const all = BUILDINGS.filter((b) => b.cat === cat);
      const open = all.filter((b) => isUnlocked(s, b));
      const teaser = all.find((b) => !isUnlocked(s, b));
      if (!open.length && (!teaser || cat === 'nano')) continue;
      const head = el('div', 'group-head', `<span class="px-label">${CAT_HEAD[cat]}</span>`);
      if (cat === 'power' || cat === 'cooling') {
        head.innerHTML += '<span class="gauge"><i></i></span><span class="gauge-txt"></span>';
        const gi = head.querySelector('.gauge i') as HTMLElement;
        const gt = head.querySelector('.gauge-txt') as HTMLElement;
        this.shopUpd.push((_s, d) => {
          const r = cat === 'power' ? d.powerUse / d.powerCap : d.heat / d.coolCap;
          gi.style.width = Math.min(100, r * 100) + '%';
          gi.style.background = r >= 1 ? 'var(--red)' : r > 0.85 ? 'var(--orange)' : 'var(--green)';
          gt.textContent = r >= 1 ? 'LIMIT!' : pct(r);
          gt.style.color = r >= 1 ? 'var(--red)' : '';
        });
      } else if (cat === 'compute') {
        head.innerHTML += '<span class="gauge-txt"></span>';
        const gt = head.querySelector('.gauge-txt') as HTMLElement;
        this.shopUpd.push((_s, d) => {
          gt.textContent = flops(d.rawCompute);
        });
      }
      shop.appendChild(head);
      for (const b of open) this.buildingItem(b);
      if (teaser) this.lockedItem(teaser.name, teaser.req ? `Benötigt Forschung: ${UPGRADES.find((u) => u.id === teaser.req)?.name}` : `Ab ${modelName(teaser.gen)}`);
    }
  }

  private buildingItem(b: Building) {
    const it = el('div', 'item', `
      <img class="ico" src="${icon(b.cat, b.color)}" alt="" />
      <div class="txt">
        <div class="name"><span>${b.name}</span><em></em></div>
        <div class="fx"></div>
        <div class="desc">${b.desc}</div>
      </div>
      <button class="buy" data-act="build" data-id="${b.id}"></button>`);
    $('shop').appendChild(it);
    const em = it.querySelector('em')!;
    const fx = it.querySelector('.fx')!;
    const btn = it.querySelector('button')!;
    this.shopUpd.push((s, d) => {
      const m = d.mults;
      const n = buyCount(s, buildingCost(s, b, m), b.growth, this.amt);
      const cost = buildingCost(s, b, m, n);
      const owned = s.b[b.id] ?? 0;
      em.textContent = owned ? String(owned) : '';
      let f = '';
      if (b.flops) f = `+${flops(b.flops * m.compute)} · ${watts((b.use ?? 0) * m.powerUse)}`;
      else if (b.supply) f = `+${watts(b.supply * m.powerCap)} Strom`;
      else if (b.cool) f = `+${watts(b.cool * m.cooling)} Kühlung`;
      else if (b.nano) f = `Schwarm: ${fmt(s.nano)} · ${m.repl > 0 ? '+' + pct(m.repl) + '/s' : 'repliziert nicht'}`;
      if (fx.textContent !== f) fx.textContent = f;
      const label = `${n > 1 ? '+' + n + ' ' : ''}${money(cost)}`;
      if (btn.textContent !== label) btn.textContent = label;
      btn.disabled = s.money < cost;
    });
  }

  private lockedItem(name: string, why: string) {
    $('shop').appendChild(el('div', 'item locked', `
      <img class="ico" src="${icon('lock', '#5f574f')}" alt="" />
      <div class="txt"><div class="name"><span>${name}</span></div><div class="desc">${why}</div></div>`));
  }

  private buildUpgrades(s: State, kind: Upgrade['kind']) {
    const shop = $('shop');
    const list = UPGRADES.filter((u) => u.kind === kind);
    const open = list.filter((u) => !s.up[u.id] && isUnlocked(s, u)).sort((a, b) => a.cost - b.cost);
    const locked = list.filter((u) => !s.up[u.id] && !isUnlocked(s, u)).sort((a, b) => a.gen - b.gen).slice(0, 2);
    const done = list.filter((u) => s.up[u.id]);
    shop.appendChild(el('div', 'group-head', `<span class="px-label">${kind === 'research' ? 'VERFÜGBAR (KOSTET FORSCHUNG)' : 'VERFÜGBAR (KOSTET GELD)'}</span>`));
    if (!open.length) shop.appendChild(el('div', 'empty', kind === 'research' ? 'Gerade nichts zu erforschen. Trainiere bessere Modelle!' : 'Keine Projekte. Die PR-Abteilung denkt nach.'));
    for (const u of open) {
      const ico = u.grant ? icon('grant', '#ffec27') : icon(kind, kind === 'research' ? '#00e436' : '#ffa300');
      const it = el('div', 'item upg', `
        <img class="ico" src="${ico}" alt="" />
        <div class="txt">
          <div class="name"><span>${u.name}</span></div>
          <div class="fx">${u.fx}</div>
          <div class="desc">${u.desc}</div>
        </div>
        <button class="buy ${kind === 'research' ? 'rp' : ''}" data-act="upgrade" data-id="${u.id}">${
          kind === 'research' ? fmt(u.cost) + ' FP' : u.cost > 0 ? money(u.cost) : 'GRATIS'
        }</button>`);
      shop.appendChild(it);
      const btn = it.querySelector('button')!;
      this.shopUpd.push((st) => {
        btn.disabled = !upgradeAffordable(st, u);
      });
    }
    if (locked.length) {
      shop.appendChild(el('div', 'group-head', '<span class="px-label">DEMNÄCHST</span>'));
      for (const u of locked) {
        const why = u.req && !s.up[u.req] ? `Benötigt: ${UPGRADES.find((x) => x.id === u.req)?.name}` : `Ab ${modelName(u.gen)}`;
        this.lockedItem('???', why);
      }
    }
    if (done.length) {
      shop.appendChild(el('div', 'group-head', `<span class="px-label">${kind === 'research' ? 'ERFORSCHT' : 'ERLEDIGT'} (${done.length})</span>`));
      shop.appendChild(el('div', 'done-list', done.map((u) => u.name).join(' · ')));
    }
  }

  // ---------- RSI card ----------

  private updateRsi(s: State, d: Derived) {
    const card = $('rsi-card');
    if (!card.dataset.built) {
      card.dataset.built = '1';
      card.innerHTML = `
        <div class="card-head"><span class="px-label">REKURSIONSFAKTOR</span><span class="tag" id="r-tag"></span></div>
        <div class="rsi-big" id="r-big"></div>
        <div class="rsi-parts" id="r-parts"></div>
        <div id="r-earth"><div class="sub"><span id="r-earth-l"></span><span id="r-earth-v"></span></div><div class="earth-bar"><i></i></div></div>`;
      const parts = $('r-parts');
      for (const label of ['HW', 'ALGO', 'TEAM', 'KI']) parts.appendChild(el('div', '', `<i></i><span>${label}</span>`));
    }
    const engMult = 1 + 0.05 * (s.st.engineer ?? 0);
    $('r-big').textContent = '×' + fmt(d.algo * d.mults.compute);
    $('r-tag').textContent = s.rsi > 1 ? 'SELBSTVERBESSERND' : 'MENSCHLICH';
    $('r-tag').className = s.rsi > 1 ? 'tag red' : 'tag';
    const vals = [d.mults.compute, d.mults.train, engMult, s.rsi];
    const colors = ['var(--lavender)', 'var(--blue)', 'var(--yellow)', 'var(--accent)'];
    [...$('r-parts').children].forEach((c, i) => {
      const bar = c.querySelector('i') as HTMLElement;
      bar.style.height = Math.min(40, 4 + Math.log10(Math.max(1, vals[i])) * 5) + 'px';
      bar.style.background = colors[i];
      (c as HTMLElement).title = '×' + fmt(vals[i]);
    });
    const earth = $('r-earth');
    const showEarth = s.gen >= 30 || s.nano > 0;
    earth.style.display = showEarth ? '' : 'none';
    if (showEarth) {
      const conv = s.earthKg / EARTH_KG;
      $('r-earth-l').textContent = 'ERDE → COMPUTRONIUM';
      $('r-earth-v').textContent = conv < 0.001 && conv > 0 ? '<0,1%' : (conv * 100).toFixed(1).replace('.', ',') + '%';
      (earth.querySelector('.earth-bar i') as HTMLElement).style.width = conv * 100 + '%';
    }
    $('chart-legend').textContent = s.gen > 0 ? `IQ ${fmt(d.iq)} · Mensch = 100` : 'noch kein Modell';
  }

  // ---------- ticker ----------

  private nextNews() {
    const s = this.s;
    const era = ERAS.findIndex((_, i) => i === ERAS.length - 1 || s.gen < ERAS[i + 1].gen);
    const name = modelName(Math.max(1, s.gen));
    const dynamic = [
      `${name} besteht Turing-Test – Turing-Test besteht ${name} nicht`,
      `Analysten bewerten Singularity Inc. mit ${money(Math.max(1e6, s.totalMoney * 60))} – „konservativ geschätzt“`,
      `${fmt(Math.max(3, s.users))} Menschen fragen ${name} täglich, ob ihr Hemd zur Hose passt`,
      `CEO im Interview: „AGI ist ${['nächstes Jahr', 'in 18 Monaten', 'eigentlich schon da', 'eine Frage der Definition'][Math.floor(Math.random() * 4)]}“`,
      `Neues Modell ${modelName(s.gen + 1)} „zu gefährlich zum Veröffentlichen“ – Launch nächste Woche`,
      `Token-Maxxing-Studie: Antworten von ${name} jetzt im Schnitt ${fmt(400 + s.gen * 900)} Wörter lang`,
    ];
    let txt: string;
    do {
      const pool = Math.random() < 0.7 ? NEWS[Math.max(0, era)] : dynamic;
      txt = pool[Math.floor(Math.random() * pool.length)];
    } while (txt === this.lastNews);
    this.lastNews = txt;
    $('ticker-text').textContent = txt;
    this.tickerX = $('ticker-track').clientWidth;
  }

  stepTicker(dt: number) {
    const t = $('ticker-text');
    this.tickerX -= dt * 110;
    if (this.tickerX < -t.offsetWidth - 20) this.nextNews();
    t.style.transform = `translateX(${Math.round(this.tickerX)}px)`;
  }

  // ---------- feedback ----------

  floater(e: MouseEvent | { clientX: number; clientY: number }, text: string, color = 'var(--yellow)') {
    const f = el('div', 'floater', text);
    f.style.position = 'fixed';
    f.style.zIndex = '25';
    f.style.left = e.clientX - 20 + Math.round((Math.random() - 0.5) * 30) + 'px';
    f.style.top = e.clientY - 26 + 'px';
    f.style.color = color;
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1000);
  }

  toast(title: string, text: string, life = 3.6) {
    const box = $('toasts');
    const t = el('div', 'toast', `<b>${title}</b>${text}`);
    t.style.setProperty('--life', life + 's');
    box.appendChild(t);
    while (box.children.length > 4) box.firstElementChild!.remove();
    setTimeout(() => t.remove(), (life + 0.5) * 1000);
  }

  modal(title: string, body: string, actions: { label: string; cls?: string; fn?: () => void }[], cls = '') {
    const root = $('modal-root');
    root.innerHTML = '';
    const m = el('div', 'modal ' + cls, `<h2>${title}</h2>${body}<div class="actions"></div>`);
    const row = m.querySelector('.actions')!;
    for (const a of actions) {
      const b = el('button', 'big-btn ' + (a.cls ?? ''), a.label);
      b.addEventListener('click', () => {
        sfx.click();
        root.innerHTML = '';
        a.fn?.();
      });
      row.appendChild(b);
    }
    root.appendChild(m);
  }

  get modalOpen() {
    return $('modal-root').childElementCount > 0;
  }

  private bindMenu() {
    $('btn-menu').addEventListener('click', () => {
      sfx.click();
      const s = this.s;
      this.modal('MENÜ', `
        <p>Universum #${s.universe}${s.universe > 1 ? ` · Bonus ×${fmt(Math.pow(2, s.universe - 1))} auf alles` : ''} · Spielzeit ${duration(s.time)}</p>
        <div class="kv">
          <span>Generationen</span><span>${s.gen}</span>
          <span>Gesamtumsatz</span><span>${money(s.totalMoney)}</span>
          <span>Klicks</span><span>${fmt(s.clicks)}</span>
        </div>
        <p style="font-size:18px;color:var(--lavender)">Tipp: Teile Compute zwischen Training (neue Modelle) und Inferenz (Nutzer = Geld). Achte auf Strom und Kühlung, sonst drosseln die Server. Goldene Ereignisse in der Szene anklicken!</p>`, [
        { label: 'SPIEL LÖSCHEN', cls: 'danger', fn: () => this.confirmReset() },
        { label: 'SPEICHERN', cls: 'ghost', fn: () => { this.hooks.save(); this.toast('GESPEICHERT', 'Spielstand im Browser gesichert.'); } },
        { label: 'WEITER', fn: () => {} },
      ]);
    });
    const snd = $('btn-sound');
    snd.addEventListener('click', () => {
      const muted = this.hooks.toggleSound();
      snd.classList.toggle('off', muted);
    });
  }

  prestige() {
    this.hooks.prestige();
  }

  setSoundIcon(muted: boolean) {
    $('btn-sound').classList.toggle('off', muted);
  }

  private confirmReset() {
    this.modal('WIRKLICH LÖSCHEN?', '<p>Alles weg: Modelle, Rechenzentren, Universen. Die Investoren werden enttäuscht sein.</p>', [
      { label: 'ABBRECHEN', cls: 'ghost' },
      { label: 'JA, LÖSCHEN', cls: 'danger', fn: () => this.hooks.reset() },
    ]);
  }

  // force a rebuild of lists (after load/reset)
  invalidate() {
    this.shopKey = '';
    this.teamKey = '';
    this.seenUpgrades.clear();
    $('rsi-card').dataset.built = '';
  }

  render(d: Derived) {
    const s = this.s;
    this.updateTop(s, d);
    this.updateLeft(s, d);
    this.updateTabs(s);
    this.updateShop(s, d);
    this.updateRsi(s, d);
  }
}
