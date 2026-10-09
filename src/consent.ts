// Google Analytics, loaded only after explicit consent (small banner, revocable in the menu).

import { L } from './i18n';

const KEY = 'singularity-consent';
const GA_ID = 'G-59EWT5WKYT';

export type Consent = 'granted' | 'denied' | null;

export function consent(): Consent {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

function store(v: 'granted' | 'denied') {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    // ignore
  }
}

let loaded = false;
function loadAnalytics() {
  if (loaded) return;
  loaded = true;
  const w = window as unknown as { dataLayer: unknown[]; gtag: (...a: unknown[]) => void };
  w.dataLayer = w.dataLayer || [];
  w.gtag = function () {
    // gtag expects the arguments object, not an array
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer.push(arguments);
  };
  w.gtag('js', new Date());
  w.gtag('config', GA_ID);
  const sc = document.createElement('script');
  sc.async = true;
  sc.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(sc);
}

export function setConsent(v: 'granted' | 'denied') {
  const before = consent();
  store(v);
  if (v === 'granted') loadAnalytics();
  else if (before === 'granted') {
    // drop GA cookies and reload so the already-running script is gone
    for (const c of document.cookie.split(';')) {
      const name = c.split('=')[0].trim();
      if (name.startsWith('_ga')) {
        for (const domain of ['', location.hostname, '.' + location.hostname.split('.').slice(-2).join('.')]) {
          document.cookie = `${name}=; Max-Age=0; path=/${domain ? '; domain=' + domain : ''}`;
        }
      }
    }
    location.reload();
  }
}

export function initConsent() {
  const c = consent();
  if (c === 'granted') return loadAnalytics();
  if (c === 'denied') return;
  const el = document.createElement('div');
  el.id = 'cookie-banner';
  el.innerHTML = `
    <p>${L(
      'Darf ich anonym zählen, wie viele Leute spielen? Dafür setzt Google Analytics ein Cookie. Dein Spielstand bleibt so oder so nur in deinem Browser.',
      'Mind if I count how many people play? Google Analytics sets a cookie for that. Your save stays in your browser either way.',
    )}</p>
    <div class="cb-actions">
      <button class="big-btn ghost" data-c="denied">${L('ABLEHNEN', 'DECLINE')}</button>
      <button class="big-btn" data-c="granted">${L('OK, GERNE', 'SURE')}</button>
    </div>`;
  for (const b of el.querySelectorAll<HTMLElement>('button[data-c]')) {
    b.addEventListener('click', () => {
      setConsent(b.dataset.c as 'granted' | 'denied');
      el.remove();
    });
  }
  // wait until no modal is open, so the banner never covers a dialog
  const root = document.getElementById('modal-root')!;
  const show = () => {
    if (root.childElementCount) return;
    obs.disconnect();
    document.body.appendChild(el);
  };
  const obs = new MutationObserver(show);
  obs.observe(root, { childList: true });
  show();
}
