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
