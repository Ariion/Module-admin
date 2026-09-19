/**
 * Types de contenu.
 *
 * Un site qui publie régulièrement n'a pas des pages, il a des contenus :
 * des articles, des réalisations, des biens. Chacun se montre dans une
 * galerie — une collection de cartes — et se lit sur sa propre page.
 *
 * Le module ne devine pas ce découpage : le développeur le déclare dans
 * admin-config.js, une fois. Le client n'a ensuite plus qu'un bouton par
 * forme de contenu, et il ne voit jamais qu'il crée une page.
 *
 *   types: [{
 *     id: 'article',
 *     nom: 'Articles',
 *     index: 'portfolio.html',        // la page qui porte la galerie
 *     collection: '.articles-grid',   // le conteneur des cartes
 *     sousTypes: [
 *       { id: 'interview', nom: 'Interview', icone: 'text',
 *         modele: 'modeles/interview.html' },
 *     ],
 *   }]
 *
 * `modele` est une page du site, écrite à la main, qui sert de point de
 * départ : la créer revient à la copier. C'est volontairement bête — une
 * page neuve hérite ainsi de tout le site sans que le module ait à
 * comprendre sa mise en page.
 * @module core/types
 */
import { slug } from './dom.js';

/** Les types déclarés, nettoyés de ce qui est inutilisable. */
export function typesDe(config) {
  const bruts = Array.isArray(config?.types) ? config.types : [];
  return bruts
    .map((type) => ({
      id: String(type.id || '').trim(),
      nom: String(type.nom || type.id || '').trim(),
      index: normaliserChemin(type.index),
      collection: String(type.collection || '').trim(),
      sousTypes: (Array.isArray(type.sousTypes) ? type.sousTypes : [])
        .map((sous) => ({
          id: String(sous.id || '').trim(),
          nom: String(sous.nom || sous.id || '').trim(),
          icone: String(sous.icone || 'text').trim(),
          modele: normaliserChemin(sous.modele),
        }))
        .filter((sous) => sous.id && sous.modele),
    }))
    .filter((type) => type.id && type.index && type.sousTypes.length);
}

/**
 * Le type dont la galerie est la page affichée, s'il y en a un.
 *
 * On compare des chemins de fichier, pas des URL : l'hébergement peut
 * servir portfolio.html sous /portfolio, et l'éditeur doit reconnaître la
 * page dans les deux cas.
 */
export function typePourPage(config, pathname = location.pathname) {
  const courant = normaliserChemin(pathname);
  return typesDe(config).find((type) => type.index === courant) || null;
}

/** Chemin de fichier comparable : « /portfolio » et « portfolio.html » coïncident. */
export function normaliserChemin(valeur) {
  let chemin = String(valeur || '').trim().replace(/\\/g, '/');
  chemin = chemin.replace(/^\/+/, '').replace(/[?#].*$/, '');
  if (chemin === '') return '';
  if (chemin.endsWith('/')) chemin += 'index.html';
  if (!/\.html?$/i.test(chemin)) chemin = chemin.replace(/\/index$/, '') + '.html';
  return chemin.toLowerCase();
}

/** Nom de fichier tiré du titre saisi. */
export function cheminDepuisTitre(nom, sousType) {
  const base = slug(String(nom || '').trim()).replace(/_/g, '-');
  return (base || 'nouvel-' + (sousType?.id || 'article')) + '.html';
}

/** Adresse que portera la carte de la galerie. */
export function lienVers(chemin) {
  return String(chemin || '').replace(/^\/+/, '');
}
