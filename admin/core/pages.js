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

/**
 * Chemin de fichier correspondant à une URL de page.
 *
 * Deux hébergements écrivent la même page de deux façons. Le classique sert
 * `article.html` à l'adresse `/article.html`. Ceux qui gomment l'extension —
 * Vercel, Netlify, GitHub Pages — servent ce même fichier à `/article`, et
 * redirigent même `/article.html` vers cette adresse-là : c'est donc celle
 * que porte le navigateur dès qu'on a suivi un lien.
 *
 * Une adresse sans extension désigne par conséquent `article.html`, et non
 * `article/index.html` : un dossier se donne avec sa barre finale — les
 * serveurs qui en servent l'index redirigent d'ailleurs vers elle.
 *
 * Ce chemin n'est pas décoratif : c'est le fichier que la publication
 * réécrit, celui que la liste des pages retient, celui qu'on compare pour
 * savoir si deux adresses parlent de la même page. Se tromper ici, c'est
 * publier à côté et perdre le texte écrit.
 */
export function filePathOf(url) {
  const brut = new URL(url, location.href).pathname.replace(/^\/+/, '');
  let chemin = brut;
  // Le chemin voyage jusqu'à l'hébergement, qui attend un nom de fichier :
  // « mentions-légales.html », pas « mentions-l%C3%A9gales.html ».
  try { chemin = decodeURIComponent(brut); } catch { chemin = brut; }
  if (chemin === '' || chemin.endsWith('/')) return chemin + 'index.html';
  const dernier = chemin.split('/').pop();
  return dernier.includes('.') ? chemin : chemin + '.html';
}

/**
 * Deux chemins désignent-ils la même page ?
 *
 * `article.html` et `article/index.html` sont un seul article : une version
 * précédente du module lisait l'adresse propre `/article` de la seconde
 * façon, et les listes de pages retenues gardent des chemins de cette forme.
 * Les rapprocher évite d'afficher deux lignes pour un même texte — dont une
 * qui n'ouvre rien.
 */
export function memePage(a, b) {
  return clePage(a) === clePage(b);
}

function clePage(chemin) {
  return String(chemin || '')
    .replace(/^\/+/, '')
    .replace(/\/(index|default|accueil)\.html?$/i, '')
    .replace(/\.html?$/i, '')
    .toLowerCase() || 'index';
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
