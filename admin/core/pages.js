/**
 * Pages du site.
 *
 * Le module n'a pas la liste des pages : un site statique n'a pas d'index.
 * On la déduit des liens de la page affichée — menu et pied de page pointent
 * en pratique vers toutes les pages du site. C'est une découverte, pas une
 * vérité : une page qui n'est liée nulle part n'apparaîtra pas.
 * @module core/pages
 */
import { pageKeyFromLocation } from './dom.js';

/** Chemin de fichier correspondant à une URL de page. */
export function filePathOf(url) {
  let chemin = new URL(url, location.href).pathname.replace(/^\/+/, '');
  if (chemin === '' || chemin.endsWith('/')) return chemin + 'index.html';
  const dernier = chemin.split('/').pop();
  return dernier.includes('.') ? chemin : chemin + '/index.html';
}

/** Titre lisible d'une page, à partir de son chemin. */
export function labelOf(chemin, texteLien = '') {
  if (texteLien && texteLien.length < 30) return texteLien;
  const nom = chemin.split('/').pop().replace(/\.html?$/i, '');
  if (nom === 'index') {
    const dossier = chemin.split('/').slice(-2, -1)[0];
    return dossier || 'Accueil';
  }
  return nom.replace(/[-_]/g, ' ');
}

/**
 * Pages atteignables depuis le document affiché.
 * @param {Document} doc
 * @returns {Array<{url:string, path:string, label:string, courante:boolean}>}
 */
export function discoverPages(doc) {
  const courante = filePathOf(doc.location.href);
  const vues = new Map();

  vues.set(courante, {
    url: doc.location.href.split('?')[0],
    path: courante,
    label: doc.title ? doc.title.split(/[—|–-]/)[0].trim().slice(0, 40) : labelOf(courante),
    courante: true,
  });

  for (const lien of doc.querySelectorAll('a[href]')) {
    const href = lien.getAttribute('href');
    if (!href || href.startsWith('#') || /^(mailto|tel|sms|javascript):/i.test(href)) continue;

    let url;
    try { url = new URL(href, doc.baseURI); } catch { continue; }
    if (url.origin !== location.origin) continue;
    if (!/\.html?$/i.test(url.pathname) && !url.pathname.endsWith('/')) continue;

    const chemin = filePathOf(url.href);
    if (vues.has(chemin)) continue;
    vues.set(chemin, {
      url: url.origin + url.pathname,
      path: chemin,
      label: labelOf(chemin, lien.textContent.replace(/\s+/g, ' ').trim()),
      courante: false,
    });
  }

  return [...vues.values()].sort((a, b) => (b.courante ? 1 : 0) - (a.courante ? 1 : 0)
    || a.path.localeCompare(b.path));
}

/** Nom de fichier propre à partir d'un intitulé saisi. */
export function slugPage(nom) {
  const base = pageKeyFromLocation('/' + String(nom || '').trim()).replace(/_/g, '-');
  return (base && base !== 'home' ? base : 'nouvelle-page') + '.html';
}
