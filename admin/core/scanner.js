/**
 * Détection automatique du contenu éditable.
 *
 * Aucun attribut à poser dans le HTML : on parcourt le DOM et on classe
 * chaque élément selon ce qu'il contient réellement. Le développeur peut
 * affiner avec `data-admin-ignore` (exclure une zone) ou via la config
 * (`scan.exclude`), mais rien n'est requis pour démarrer.
 * @module core/scanner
 */
import { NEVER, isSimpleText, hasInlineMarkup, backgroundImage, isVisible, children } from './dom.js';
import { fingerprint } from './identity.js';

const IGNORE_ATTR = 'data-admin-ignore';
const UI_ATTR = 'data-admin-ui';

/** Champs lus dans le DOM pour chaque rôle. C'est aussi le format stocké. */
export function readValue(el, role) {
  switch (role) {
    case 'image':
      return { src: el.getAttribute('src') || '', alt: el.getAttribute('alt') || '' };
    case 'background':
      return { src: backgroundImage(el) || '' };
    case 'link':
      return {
        href: el.getAttribute('href') || '',
        target: el.getAttribute('target') || '',
        ...readText(el),
      };
    default:
      return readText(el);
  }
}

function readText(el) {
  return hasInlineMarkup(el)
    ? { html: el.innerHTML.trim() }
    : { text: (el.textContent || '').trim() };
}

/** Le seul enfant significatif est-il un lien ? (cas des menus, des boutons) */
function wrapsSingleLink(el) {
  const kids = children(el);
  if (kids.length !== 1 || !kids[0].matches('a[href]')) return false;
  const own = Array.from(el.childNodes)
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.nodeValue.trim())
    .join('');
  return own === '';
}

/**
 * Parcourt le document et retourne la liste des éléments éditables.
 * @param {object} options
 * @param {string[]} options.roots      sélecteurs des zones à scanner
 * @param {Element[]} options.nodes     éléments racines (prioritaire sur roots)
 * @param {string[]} options.exclude    sélecteurs à ignorer
 * @param {boolean}  options.backgrounds détecter les images de fond CSS
 * @param {number}   options.minBackgroundArea aire minimale d'un fond éditable
 * @param {boolean}  options.visibleOnly ne garder que ce qui est affiché
 * @returns {Array<{el:Element, role:string, print:object, value:object}>}
 */
export function scan(options = {}) {
  const {
    roots = ['body'],
    nodes = null,
    exclude = [],
    backgrounds = true,
    minBackgroundArea = 12000,
    visibleOnly = true,
  } = options;

  const excludeSelector = exclude.filter(Boolean).join(',');
  const found = [];
  const seen = new Set();

  const skipped = (el) => {
    if (NEVER.has(el.tagName)) return true;
    if (el.hasAttribute(IGNORE_ATTR) || el.hasAttribute(UI_ATTR)) return true;
    if (el.closest('[' + UI_ATTR + ']')) return true;
    if (excludeSelector) {
      try { if (el.matches(excludeSelector)) return true; } catch { /* sélecteur invalide */ }
    }
    return false;
  };

  const add = (el, role) => {
    if (visibleOnly && !isVisible(el)) return;
    const print = fingerprint(el, role);
    // Deux éléments produisant la même empreinte (structure et contenu
    // strictement identiques) ne sont pas distinguables : on garde le premier.
    if (seen.has(print.id)) return;
    seen.add(print.id);
    found.push({ el, role, print, value: readValue(el, role) });
  };

  const walk = (el, textAllowed) => {
    if (skipped(el)) return;

    if (el.tagName === 'IMG') {
      if (el.getAttribute('src')) add(el, 'image');
      return;
    }

    if (backgrounds && hasOwnBackground(el, minBackgroundArea)) add(el, 'background');

    if (textAllowed && el.matches('a[href]')) {
      add(el, 'link');
      // On descend quand même : un lien peut envelopper un logo.
      for (const child of children(el)) walk(child, false);
      return;
    }

    if (textAllowed && isSimpleText(el) && !wrapsSingleLink(el)) {
      add(el, 'text');
      return;
    }

    for (const child of children(el)) walk(child, textAllowed);
  };

  const targets = nodes || roots.flatMap((selector) => {
    try { return Array.from(document.querySelectorAll(selector)); } catch { return []; }
  });
  for (const node of targets) walk(node, true);

  return found;
}

/** L'élément porte-t-il une image de fond qui lui est propre et assez grande ? */
function hasOwnBackground(el, minArea) {
  const url = backgroundImage(el);
  if (!url || url.startsWith('data:')) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width * rect.height < minArea) return false;
  // Un fond hérité d'un parent via une classe partagée serait proposé deux
  // fois : on ne garde que l'élément qui porte réellement la déclaration.
  const parent = el.parentElement;
  return !parent || backgroundImage(parent) !== url;
}

/** Index rapide { id -> entrée } utilisable par le binder et l'éditeur. */
export function indexById(entries) {
  const map = new Map();
  for (const entry of entries) map.set(entry.print.id, entry);
  return map;
}
