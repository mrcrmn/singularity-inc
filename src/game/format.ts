// Number formatting with short suffixes: German (decimal comma, Mio/Mrd) or English (M/B).
import { lang } from '../i18n';

const SUFFIX = lang === 'en'
  ? ['', 'k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'UDc', 'DDc']
  : ['', 'k', 'Mio', 'Mrd', 'Bio', 'Brd', 'Trio', 'Trd', 'Quad', 'Qard', 'Quin', 'Qind', 'Sext', 'Sxd'];

function de(v: number, digits: number): string {
  const s = v.toFixed(digits);
  return lang === 'en' ? s : s.replace('.', ',');
}

function mantissa(v: number): string {
  return de(v, v < 10 ? 2 : v < 100 ? 1 : 0);
}

export function fmt(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n);
  if (n < 1000) {
    if (n === 0) return '0';
    if (n < 10) return de(n, n < 1 ? 2 : 1).replace(/[.,]0$/, '');
    return Math.floor(n).toString();
  }
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier < SUFFIX.length) {
    return `${mantissa(n / 10 ** (tier * 3))} ${SUFFIX[tier]}`;
  }
  return sci(n);
}

export function sci(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  const e = Math.floor(Math.log10(n));
  return `${de(n / 10 ** e, 2)}e${e}`;
}

export function money(n: number): string {
  return '$' + fmt(n);
}

function unit(n: number, base: string, prefixes: string[]): string {
  if (!Number.isFinite(n)) return '∞ ' + base;
  if (n < 1) return `0 ${prefixes[0]}${base}`;
  const tier = Math.max(0, Math.floor(Math.log10(n) / 3));
  if (tier < prefixes.length) return `${mantissa(n / 10 ** (tier * 3))} ${prefixes[tier]}${base}`;
  return `${sci(n)} ${base}`;
}

const SI = ['', 'k', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y', 'R', 'Q'];

export const flops = (n: number) => unit(n, 'FLOP/s', SI);
export const flop = (n: number) => unit(n, 'FLOP', SI);
export const watts = (n: number) => unit(n, 'W', SI);
// data is stored in TB
export const bytes = (tb: number) => unit(tb * 1e12, 'B', SI);

export function duration(sec: number): string {
  if (!Number.isFinite(sec) || sec > 3600 * 24 * 365 * 100) return '∞';
  if (sec < 1) return sec < 0.1 ? '<' + de(0.1, 1) + 's' : de(sec, 1) + 's';
  const s = Math.floor(sec % 60);
  const m = Math.floor((sec / 60) % 60);
  const h = Math.floor(sec / 3600);
  if (h > 48) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}:${s.toString().padStart(2, '0')}`;
  return `${s}s`;
}

export const decimal = (v: number, digits: number) => de(v, digits);

export function pct(v: number): string {
  return Math.round(v * 100) + '%';
}
