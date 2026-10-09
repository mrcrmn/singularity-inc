import './style.css';
import { ERAS, iqOf } from './game/data';
import { derive, modelName, newState, recordHistory, tick, eraOf, type State } from './game/engine';
import { pickGolden } from './game/events';
import { fmt, money, duration } from './game/format';
import { applyOffline, load, save, wipe } from './game/save';
import { isMuted, sfx, toggleMute } from './ui/audio';
import { drawChart } from './ui/chart';
import { Scene } from './ui/scene';
import { UI, ERA_ACCENT, type Game } from './ui/ui';
import { L, setLang } from './i18n';
import { initConsent } from './consent';

const params = new URLSearchParams(location.search);
const SPEED = Math.max(0.1, Number(params.get('speed')) || 1);

const game: Game = { s: newState() };

const ui = new UI(game, {
  save: () => save(game.s),
  reset: () => {
    wipe();
    start(newState());
  },
  prestige: () => {
    const u = game.s.universe + 1;
    wipe();
    start(newState(u));
    save(game.s);
  },
  toggleSound: () => toggleMute(),
  setLang: (l) => {
    setLang(l);
    save(game.s);
    location.reload();
  },
});
ui.setSoundIcon(isMuted());

const scene = new Scene(document.getElementById('scene') as HTMLCanvasElement);
const chart = document.getElementById('chart') as HTMLCanvasElement;
const sceneWrap = document.getElementById('scene-wrap')!;

function start(s: State) {
  game.s = s;
  scene.boomAt = -1;
  ui.invalidate();
  nextGolden = 40 + Math.random() * 60;
  applyAccent();
}

function applyAccent() {
  document.documentElement.style.setProperty('--accent', ERA_ACCENT[eraOf(game.s.gen)]);
}

// ---------- golden events ----------

let nextGolden = 40 + Math.random() * 60; // seconds of game time
function spawnGolden() {
  const def = pickGolden();
  const layer = document.getElementById('golden-layer')!;
  const g = document.createElement('div');
  g.className = 'golden';
  g.innerHTML = `<div class="ico">${def.icon}</div><div class="lbl">${def.label}</div>`;
  const w = layer.clientWidth;
  const h = layer.clientHeight;
  g.style.left = Math.round(40 + Math.random() * Math.max(10, w - 200)) + 'px';
  g.style.top = Math.round(30 + Math.random() * Math.max(10, h - 130)) + 'px';
  layer.appendChild(g);
  sfx.golden();
  const fade = setTimeout(() => g.classList.add('fade'), 9000);
  const kill = setTimeout(() => g.remove(), 12000);
  g.addEventListener('click', (e) => {
    clearTimeout(fade);
    clearTimeout(kill);
    g.remove();
    sfx.coin();
    const text = def.apply(game.s);
    ui.floater(e, def.label);
    ui.toast(L('GLÜCKSFALL!', 'LUCKY BREAK!'), text, 5);
  });
}

// ---------- events from the simulation ----------

function onNewGens(gens: number[]) {
  const s = game.s;
  const last = gens[gens.length - 1];
  sfx.gen();
  const extra = gens.length > 1 ? ` (+${gens.length - 1} ${L('weitere', 'more')})` : '';
  ui.toast(L('NEUES MODELL', 'NEW MODEL'), `${modelName(last)} ${L('ist live', 'is live')}${extra}. IQ ${fmt(iqOf(last))}.`);
  const era = eraOf(s.gen);
  if (era > s.seenEra) {
    s.seenEra = era;
    applyAccent();
    sfx.era();
    scene.shake = 6;
    const e = ERAS[era];
    ui.modal(`${L('ÄRA', 'ERA')} ${era + 1}: ${e.name.toUpperCase()}`, `<p>${e.intro}</p><p style="color:var(--lavender);font-size:19px">${L('Neue Gebäude, Forschung und Projekte sind freigeschaltet.', 'New buildings, research and projects unlocked.')}</p>`, [
      { label: L('LOS GEHT’S', 'LET’S GO') },
    ]);
  }
}

function onEnd() {
  scene.boom();
  scene.shake = 14;
  sfx.boom();
  setTimeout(showEndModal, 5500);
}

function showEndModal() {
  const s = game.s;
  if (!s.ended) return;
  const bonus = Math.pow(2, s.universe);
  ui.modal(L('DIE ERDE IST JETZT EIN GEDANKE', 'EARTH IS NOW A THOUGHT'), `
    <p>${L(
      'OMEGA hat den Planeten vollständig in Computronium umgewandelt. Die Menschheit lebt weiter, als ausgesprochen detaillierte Fußnote in einem sehr, sehr langen Gedankengang.',
      'OMEGA has converted the planet entirely into computronium. Humanity lives on as a remarkably detailed footnote in a very, very long chain of thought.',
    )}</p>
    <p>${L('Letzte Pressemitteilung: „Sicherheit hatte für uns immer höchste Priorität.“', 'Final press release: “Safety was always our top priority.”')}</p>
    <div class="kv">
      <span>${L('Zeit bis zur Singularität', 'Time to singularity')}</span><span>${duration(s.time)}</span>
      <span>${L('Modellgenerationen', 'Model generations')}</span><span>${s.gen}</span>
      <span>${L('Gesamtumsatz', 'Total revenue')}</span><span>${money(s.totalMoney)}</span>
      <span>${L('Klicks', 'Clicks')}</span><span>${fmt(s.clicks)}</span>
      <span>${L('Universum', 'Universe')}</span><span>#${s.universe}</span>
    </div>
    <p style="color:var(--lavender);font-size:19px">${L(
      `Im nächsten Universum startest du mit ×${fmt(bonus)} auf Compute, Forschung und Umsatz.`,
      `In the next universe you start with ×${fmt(bonus)} on compute, research and revenue.`,
    )}</p>`, [
    { label: L('NOCHMAL ANSEHEN', 'WATCH AGAIN'), cls: 'ghost', fn: onEnd },
    { label: L('NEUES UNIVERSUM', 'NEW UNIVERSE'), fn: () => ui.prestige() },
  ], 'end-modal');
}

// ---------- loop ----------

const STEP = 0.05;
let last = performance.now();
let acc = 0;
let lastRender = 0;
let lastFrame = performance.now();
let lastSave = performance.now();

function logic(now: number) {
  let dt = ((now - last) / 1000) * SPEED;
  last = now;
  if (dt > 120) dt = 120; // tab was asleep for long: offline catch-up handles more
  acc += dt;
  const s = game.s;
  const gens: number[] = [];
  let ended = false;
  let guard = 0;
  while (acc >= STEP && guard++ < 4000) {
    const step = acc > 5 ? Math.min(1, acc) : STEP;
    const ev = tick(s, step);
    acc -= step;
    gens.push(...ev.newGens);
    if (ev.ended) ended = true;
  }
  recordHistory(s);
  if (gens.length) onNewGens(gens);
  if (ended) onEnd();

  if (!s.ended && !ui.modalOpen) {
    nextGolden -= dt;
    if (nextGolden <= 0) {
      nextGolden = 60 + Math.random() * 120;
      if (document.getElementById('golden-layer')!.childElementCount === 0) spawnGolden();
    }
  }
  if (now - lastSave > 10000) {
    lastSave = now;
    save(s);
  }
}

function frame(now: number) {
  logic(now);
  const s = game.s;
  const d = derive(s);
  scene.draw(s, d, now);
  sceneWrap.classList.toggle('shake', scene.shake > 4);
  ui.stepTicker(Math.min(0.1, (now - lastFrame) / 1000));
  lastFrame = now;
  if (now - lastRender > 90) {
    lastRender = now;
    ui.render(d);
    drawChart(chart, s, ERA_ACCENT[d.era]);
  }
  initConsent();
requestAnimationFrame(frame);
}

// keep the simulation running when the tab is hidden (rAF pauses)
setInterval(() => {
  if (document.hidden) logic(performance.now());
}, 1000);

window.addEventListener('beforeunload', () => save(game.s));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) save(game.s);
});

// ---------- boot ----------

const saved = load();
if (saved) {
  start(saved.state);
  const rep = applyOffline(game.s, saved.savedAt);
  if (game.s.ended) {
    scene.boomAt = performance.now() - 6000; // show the aftermath, no second explosion
    showEndModal();
  } else if (rep) {
    game.s.seenEra = Math.max(game.s.seenEra, eraOf(game.s.gen));
    applyAccent();
    ui.modal(L('WILLKOMMEN ZURÜCK', 'WELCOME BACK'), `
      <p>${L(`Während du ${duration(rep.seconds)} weg warst, haben deine Server weitergerechnet.`, `While you were away for ${duration(rep.seconds)}, your servers kept crunching.`)}</p>
      <div class="kv">
        <span>${L('Umsatz', 'Revenue')}</span><span>+${money(rep.money)}</span>
        <span>${L('Neue Modelle', 'New models')}</span><span>+${rep.gens}</span>
      </div>`, [{ label: L('WEITER', 'CONTINUE') }]);
  }
} else {
  start(newState());
  ui.modal('SINGULARITY INC.', L(`
    <p>Du hast eine Garage, einen Gaming-PC und eine Vision: <b style="color:var(--accent);font-weight:normal">künstliche allgemeine Intelligenz</b>. Oder zumindest eine sehr gute Autovervollständigung.</p>
    <p>Trainiere Modelle, verkaufe Inferenz, kaufe Server, Strom und Kühlung. Jedes Modell macht das nächste schneller. Irgendwann macht es sich selbst.</p>
    <p style="color:var(--lavender);font-size:19px">Was am Ende passiert? Steht in den AGB.</p>`, `
    <p>You have a garage, a gaming PC and a vision: <b style="color:var(--accent);font-weight:normal">artificial general intelligence</b>. Or at least a really good autocomplete.</p>
    <p>Train models, sell inference, buy servers, power and cooling. Every model makes the next one faster. Eventually it makes itself.</p>
    <p style="color:var(--lavender);font-size:19px">What happens at the end? It’s in the terms of service.</p>`), [{ label: L('GARAGE AUFSCHLIESSEN', 'UNLOCK THE GARAGE') }]);
}

initConsent();
requestAnimationFrame(frame);
