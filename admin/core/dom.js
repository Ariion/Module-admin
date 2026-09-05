/**
 * Helpers DOM partagés par le scanner, l'identité et l'éditeur.
 * @module core/dom
 */

/** Éléments qui ne contiennent jamais de contenu éditable. */
export const NEVER = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'CANVAS', 'IFRAME',
  'OBJECT', 'EMBED', 'VIDEO', 'AUDIO', 'MAP', 'AREA', 'BR', 'HR', 'HEAD',
  'META', 'LINK', 'TITLE', 'BASE', 'PATH', 'USE', 'DEFS',
]);

/** Balises dont le contenu texte est éditable tel quel. */
export const TEXT_TAGS = new Set([
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'LI', 'A', 'BUTTON',
  'BLOCKQUOTE', 'FIGCAPTION', 'LABEL', 'TD', 'TH', 'DT', 'DD', 'STRONG',
  'EM', 'SMALL', 'CITE', 'Q', 'SUMMARY', 'ADDRESS', 'TIME', 'DIV', 'PRE',
]);

/** Balises inline tolérées à l'intérieur d'un texte éditable. */
export const INLINE_TAGS = new Set([
  'A', 'B', 'STRONG', 'I', 'EM', 'U', 'SPAN', 'BR', 'SMALL', 'SUP', 'SUB',
  'MARK', 'CODE', 'ABBR', 'TIME', 'CITE', 'Q', 'WBR',
]);

export function children(el) {
  return el ? Array.from(el.children) : [];
}

/** Rang de l'élément parmi ses frères de même balise (1-based). */
export function nthOfType(el) {
  let n = 1;
  let sib = el.previousElementSibling;
  while (sib) {
    if (sib.tagName === el.tagName) n++;
    sib = sib.previousElementSibling;
  }
  return n;
}

/** Un élément est-il rendu ? Sert à ne pas proposer du contenu invisible. */
export function isVisible(el) {
  if (!el.isConnected) return false;
  const style = getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

/** URL de background-image résolue, ou null. */
export function backgroundImage(el) {
  const raw = getComputedStyle(el).backgroundImage;
  if (!raw || raw === 'none') return null;
  const m = raw.match(/url\((['"]?)(.*?)\1\)/);
  return m && m[2] ? m[2] : null;
}

/** true si tous les enfants sont du texte ou des balises inline simples. */
export function isSimpleText(el) {
  if (!el.firstChild) return false;
  let hasText = false;
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.nodeValue.trim()) hasText = true;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (!INLINE_TAGS.has(node.tagName)) return false;
      if (node.textContent.trim()) hasText = true;
      // Un lien imbriqué est un élément éditable à part entière : on ne le
      // fusionne pas dans le texte du parent s'il porte un href réel.
      if (node.tagName === 'A' && node.getAttribute('href')) return false;
      if (node.querySelector && node.querySelector('img, a[href]')) return false;
    } else if (node.nodeType === Node.COMMENT_NODE) {
      continue;
    }
  }
  return hasText;
}

/** true si le texte de l'élément contient au moins une balise inline. */
export function hasInlineMarkup(el) {
  for (const node of el.childNodes) {
    if (node.nodeType === Node.ELEMENT_NODE && INLINE_TAGS.has(node.tagName)) return true;
  }
  return false;
}

/**
 * Clé de page dérivée de l'URL : "/", "/index.html" -> "home" ;
 * "/chambres/suite.html" -> "chambres_suite".
 * Surchargeable par <html data-admin-page="..."> ou par la config.
 */
export function pageKeyFromLocation(pathname = location.pathname) {
  const attr = document.documentElement.getAttribute('data-admin-page');
  if (attr) return slug(attr);
  let p = decodeURIComponent(pathname || '/');
  p = p.replace(/\/+$/, '');
  p = p.replace(/\/(index|default|accueil)\.(html?|php)$/i, '');
  p = p.replace(/\.(html?|php)$/i, '');
  p = p.replace(/^\/+/, '');
  return slug(p) || 'home';
}

export function slug(str) {
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
    .slice(0, 100);
}

/** Rectangle absolu (document) d'un élément, pour positionner les surcouches. */
export function rectOf(el) {
  const r = el.getBoundingClientRect();
  return {
    top: r.top + window.scrollY,
    left: r.left + window.scrollX,
    width: r.width,
    height: r.height,
  };
}

/** Remonte jusqu'au premier ancêtre satisfaisant le prédicat (self inclus). */
export function closestBy(el, predicate) {
  let node = el;
  while (node && node !== document.documentElement) {
    if (predicate(node)) return node;
    node = node.parentElement;
  }
  return null;
}
