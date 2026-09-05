/**
 * Petites fonctions utilitaires, sans dépendance.
 * @module core/util
 */

/** Hash FNV-1a 32 bits, rendu en base36. Déterministe, stable entre navigateurs. */
export function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(36);
}

/** Texte normalisé pour comparaison : espaces compactés, casse et accents ignorés. */
export function normText(str) {
  return (str || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function debounce(fn, delay) {
  let t = null;
  const wrapped = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => { t = null; fn(...args); }, delay);
  };
  wrapped.cancel = () => { clearTimeout(t); t = null; };
  wrapped.pending = () => t !== null;
  wrapped.flush = (...args) => { if (!t) return undefined; clearTimeout(t); t = null; return fn(...args); };
  return wrapped;
}

/** Identifiant aléatoire court, pour les items de collection et les médias. */
export function uid(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Similarité 0..1 entre deux chaînes (Dice sur bigrammes). Sert au ré-appariement. */
export function similarity(a, b) {
  a = normText(a); b = normText(b);
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
  const grams = (s) => {
    const m = new Map();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      m.set(g, (m.get(g) || 0) + 1);
    }
    return m;
  };
  const ga = grams(a), gb = grams(b);
  let inter = 0;
  for (const [g, n] of ga) inter += Math.min(n, gb.get(g) || 0);
  return (2 * inter) / (a.length - 1 + b.length - 1);
}

/** Clone profond via JSON. Le contenu manipulé est toujours du JSON simple. */
export function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

/** Égalité structurelle de deux valeurs JSON. */
export function equal(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/** Attend que le DOM soit analysable. */
export function ready(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

/** Émetteur d'évènements minimal. */
export function emitter() {
  const map = new Map();
  return {
    on(name, fn) {
      if (!map.has(name)) map.set(name, new Set());
      map.get(name).add(fn);
      return () => map.get(name).delete(fn);
    },
    emit(name, payload) {
      const set = map.get(name);
      if (!set) return;
      for (const fn of [...set]) {
        try { fn(payload); } catch (err) { console.error('[admin] listener', name, err); }
      }
    },
  };
}

/** Formate une date en "il y a X" court, pour la barre d'outils. */
export function timeAgo(ts, lang = 'fr') {
  if (!ts) return '';
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  const fr = lang === 'fr';
  if (s < 5) return fr ? "à l'instant" : 'just now';
  if (s < 60) return fr ? `il y a ${s} s` : `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return fr ? `il y a ${m} min` : `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return fr ? `il y a ${h} h` : `${h}h ago`;
  const d = Math.round(h / 24);
  return fr ? `il y a ${d} j` : `${d}d ago`;
}
