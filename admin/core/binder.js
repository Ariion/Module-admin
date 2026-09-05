/**
 * Écriture du contenu dans le DOM.
 *
 * Seul endroit du module qui modifie la page. Tout passe par l'assainisseur,
 * et rien n'est écrit si la valeur est vide ou identique : un contenu absent
 * laisse le HTML d'origine en place, ce qui garantit un rendu correct même
 * si la base est vide ou injoignable.
 * @module core/binder
 */
import { safeHtml, safeText, safeUrl, safeImageUrl } from './sanitize.js';
import { readValue } from './scanner.js';

/**
 * Applique une valeur à un élément.
 * @returns {boolean} true si le DOM a changé
 */
export function applyValue(el, role, value) {
  if (!el || !value || typeof value !== 'object') return false;
  switch (role) {
    case 'image': return applyImage(el, value);
    case 'background': return applyBackground(el, value);
    case 'link': return applyLink(el, value);
    case 'style': return applyStyle(el, value);
    default: return applyText(el, value);
  }
}

function applyText(el, value) {
  if (typeof value.html === 'string') {
    const html = safeHtml(value.html);
    if (el.innerHTML === html) return false;
    el.innerHTML = html;
    return true;
  }
  if (typeof value.text === 'string') {
    if (el.textContent === value.text) return false;
    el.textContent = value.text;
    return true;
  }
  return false;
}

function applyImage(el, value) {
  let changed = false;
  if (typeof value.src === 'string' && value.src) {
    const src = safeImageUrl(value.src);
    if (src && el.getAttribute('src') !== src) {
      el.setAttribute('src', src);
      // Une image responsive garderait sinon l'ancien visuel : on neutralise
      // les sources alternatives que le développeur avait prévues.
      el.removeAttribute('srcset');
      el.removeAttribute('sizes');
      const picture = el.closest('picture');
      if (picture) {
        for (const source of picture.querySelectorAll('source')) source.remove();
      }
      changed = true;
    }
  }
  if (typeof value.alt === 'string' && el.getAttribute('alt') !== value.alt) {
    el.setAttribute('alt', safeText(value.alt).replace(/&lt;|&gt;/g, ''));
    changed = true;
  }
  return changed;
}

function applyBackground(el, value) {
  if (typeof value.src !== 'string' || !value.src) return false;
  const src = safeImageUrl(value.src);
  if (!src) return false;
  const css = 'url("' + src.replace(/"/g, '%22') + '")';
  if (el.style.backgroundImage === css) return false;
  el.style.backgroundImage = css;
  return true;
}

function applyLink(el, value) {
  let changed = applyText(el, value);
  if (typeof value.href === 'string') {
    const href = safeUrl(value.href);
    if (href && el.getAttribute('href') !== href) {
      el.setAttribute('href', href);
      changed = true;
    }
  }
  if (typeof value.target === 'string' && el.getAttribute('target') !== value.target) {
    if (value.target) {
      el.setAttribute('target', value.target);
      if (value.target === '_blank') el.setAttribute('rel', 'noopener noreferrer');
    } else {
      el.removeAttribute('target');
    }
    changed = true;
  }
  return changed;
}

/**
 * Applique une surcharge de style. Volontairement limité aux couleurs et à
 * l'image de fond : le client peut changer l'habillage, jamais les
 * dimensions ni le positionnement — la mise en page reste au développeur.
 */
const STYLE_PROPS = {
  color: 'color',
  background: 'backgroundColor',
  backgroundImage: 'backgroundImage',
};

function applyStyle(el, value) {
  let changed = false;
  for (const [cle, propriete] of Object.entries(STYLE_PROPS)) {
    if (!(cle in value)) continue;
    const brut = String(value[cle] ?? '').trim();

    if (!brut) {
      if (el.style[propriete]) { el.style[propriete] = ''; changed = true; }
      continue;
    }

    let css = brut;
    if (cle === 'backgroundImage') {
      if (brut === 'none') {
        css = 'none';
      } else {
        const src = safeImageUrl(brut);
        if (!src) continue;
        css = 'url("' + src.replace(/"/g, '%22') + '")';
      }
    } else if (!isColor(brut)) {
      continue;
    }

    if (el.style[propriete] !== css) { el.style[propriete] = css; changed = true; }
  }
  return changed;
}

/** N'accepte qu'une couleur CSS reconnue : rien d'autre n'entre dans style. */
function isColor(value) {
  if (/^#[0-9a-f]{3,8}$/i.test(value)) return true;
  if (/^(rgb|hsl)a?\([\d\s.,%/-]+\)$/i.test(value)) return true;
  return /^[a-z]{3,20}$/i.test(value) && CSS.supports && CSS.supports('color', value);
}

/** Valeurs de style effectives, pour préremplir les champs de l'éditeur. */
export function readStyle(el) {
  const view = el.ownerDocument.defaultView;
  const calcule = view ? view.getComputedStyle(el) : null;
  const fond = el.style.backgroundImage || (calcule ? calcule.backgroundImage : '');
  const url = /url\((['"]?)(.*?)\1\)/.exec(fond);
  return {
    color: el.style.color || (calcule ? calcule.color : ''),
    background: el.style.backgroundColor || (calcule ? calcule.backgroundColor : ''),
    backgroundImage: url ? url[2] : '',
  };
}

/** Relit la valeur courante d'un élément (utilisé après édition en place). */
export function readCurrent(el, role) {
  return readValue(el, role);
}

/**
 * Mémorise la valeur d'origine d'un élément avant toute écriture, pour
 * pouvoir revenir au HTML livré par le développeur.
 */
export function snapshotOriginal(el, role, store) {
  if (store.has(el)) return store.get(el);
  const original = readValue(el, role);
  store.set(el, original);
  return original;
}
