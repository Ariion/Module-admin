/**
 * Journalisation. Silencieuse par défaut : le module ne doit jamais polluer
 * la console d'un site en production.
 * @module core/log
 */
let enabled = false;

export function setDebug(value) { enabled = !!value; }
export function debug(...args) { if (enabled) console.debug('[admin]', ...args); }
export function warn(...args) { if (enabled) console.warn('[admin]', ...args); }
export function error(...args) { console.error('[admin]', ...args); }

/**
 * Exécute fn en absorbant toute erreur. Règle d'or du module : une panne du
 * module ne doit jamais casser le rendu du site.
 */
export function safe(fn, fallback = undefined, label = '') {
  try {
    return fn();
  } catch (err) {
    warn('erreur ignorée', label, err);
    return fallback;
  }
}
