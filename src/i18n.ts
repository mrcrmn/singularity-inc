// Language: browser default, overridable in the in-game menu (stored, applied on reload).

export type Lang = 'de' | 'en';

const KEY = 'singularity-lang';

function detect(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'de' || v === 'en') return v;
  } catch {
    // no storage (tests, private mode)
  }
  if (typeof navigator === 'undefined') return 'de';
  const prefs = navigator.languages?.length ? navigator.languages : [navigator.language ?? ''];
  for (const p of prefs) {
    const l = p.toLowerCase();
    if (l.startsWith('de')) return 'de';
    if (l.startsWith('en')) return 'en';
  }
  return 'en';
}

export const lang: Lang = detect();

export const L = (de: string, en: string) => (lang === 'en' ? en : de);

export function setLang(l: Lang) {
  try {
    localStorage.setItem(KEY, l);
  } catch {
    // ignore
  }
}
