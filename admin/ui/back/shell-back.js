/**
 * Charpente du back-office : la marque, la barre du haut, le menu, la vue.
 *
 * Le menu est la seule chose qui ne bouge jamais. C'est lui qui répond à la
 * question que se pose un débutant toutes les trente secondes — « où
 * suis-je, et qu'est-ce que je peux faire ? » — et c'est pour ça qu'il
 * porte des mots, pas des icônes seules.
 *
 * Un écran ne se dessine que lorsqu'on y va : les listes coûtent des
 * lectures, et on n'ouvre pas la bibliothèque média pour afficher le
 * tableau de bord.
 * @module ui/back/shell-back
 */
import { h, icon, clear } from '../el.js';

/**
 * @param {object} options
 * @param {HTMLElement} options.hote élément qui reçoit le back-office
 * @param {Function} options.t
 * @param {string} options.nomSite affiché dans la barre du haut
 * @param {Function} options.onQuitter
 * @param {Function} options.onVoirSite
 */
export function creerChassis({ hote, t, nomSite, onQuitter, onVoirSite }) {
  const vue = h('div', { class: 'bo__vue' });
  const menu = h('nav', { class: 'bo__menu', 'aria-label': t('boMenu') });
  const site = h('div', { class: 'bo__site' });

  const grille = h('div', { class: 'bo' },
    h('div', { class: 'bo__marque' },
      icon('sliders', 16),
      h('span', {}, t('boMarque')),
      h('small', {}, t('boMarqueSuite')),
    ),
    h('div', { class: 'bo__barre' },
      site,
      h('button', { class: 'b b--sm', type: 'button', onclick: () => onVoirSite?.() },
        icon('eye', 13), t('boVoirSite')),
      h('button', { class: 'b b--sm b--nu', type: 'button', onclick: () => onQuitter?.() },
        icon('close', 13), t('signOut')),
    ),
    menu,
    vue,
  );

  site.append(h('span', {}, t('boSiteEnCours') + ' '), h('strong', {}, nomSite));
  hote.appendChild(grille);

  /** @type {Map<string, {bouton: HTMLElement, dessiner: Function, badge: HTMLElement|null}>} */
  const ecrans = new Map();
  let courant = null;
  let nettoyer = null;

  /**
   * Déclare un écran. `dessiner(vue)` est appelé à chaque visite : un écran
   * qu'on rouvre doit montrer l'état du moment, pas celui d'il y a dix
   * minutes.
   */
  function ajouterEcran(id, { libelle, icone, dessiner, badge = false, cache = false }) {
    const pastille = badge ? h('span', { class: 'bo__compte', hidden: true }) : null;
    // Un écran caché existe et se dessine, mais n'a pas d'entrée au menu :
    // on y arrive depuis une ligne de liste, jamais « comme ça ».
    const bouton = cache ? null : h('button', {
      class: 'bo__lien', type: 'button', onclick: () => aller(id),
    }, icon(icone, 15), h('span', {}, libelle), pastille);
    if (bouton) menu.appendChild(bouton);
    ecrans.set(id, { bouton, dessiner, badge: pastille, parent: cache ? null : id });
  }

  function ajouterGroupe(libelle) {
    menu.appendChild(h('div', { class: 'bo__groupe' }, libelle));
  }

  /** Va sur un écran. `arg` est transmis au dessinateur (l'élément ouvert). */
  function aller(id, arg = null) {
    const ecran = ecrans.get(id);
    if (!ecran) return;
    courant = id;
    for (const [cle, e] of ecrans) {
      if (!e.bouton) continue;
      if (cle === id) e.bouton.setAttribute('aria-current', 'page');
      else e.bouton.removeAttribute('aria-current');
    }
    // Un écran peut avoir ouvert quelque chose qui doit se refermer — une
    // iframe d'analyse, par exemple. S'il a renvoyé de quoi le faire, c'est
    // maintenant, avant que sa vue ne disparaisse sous lui.
    if (typeof nettoyer === 'function') { nettoyer(); nettoyer = null; }
    clear(vue);
    const page = h('div', { class: 'bo__page' });
    vue.appendChild(page);
    vue.scrollTop = 0;
    const rendu = ecran.dessiner(page, arg);
    Promise.resolve(rendu).then((f) => { if (typeof f === 'function') nettoyer = f; });
  }

  /** Le nombre affiché à côté d'une entrée du menu. Zéro ne s'affiche pas. */
  function majBadge(id, nombre) {
    const ecran = ecrans.get(id);
    if (!ecran?.badge) return;
    ecran.badge.textContent = String(nombre);
    ecran.badge.hidden = !nombre;
  }

  return {
    ajouterGroupe, ajouterEcran, aller, majBadge,
    get courant() { return courant; },
    rafraichir: () => courant && aller(courant),
  };
}

/** En-tête d'écran : le titre, une phrase, et les actions à droite. */
export function teteEcran(titre, phrase, ...actions) {
  return h('div', { class: 'bo__tete' },
    h('div', {}, h('h1', {}, titre), phrase ? h('p', {}, phrase) : null),
    actions.length ? h('div', { class: 'bo__tete-actions' }, actions) : null,
  );
}

/** Ce qu'on montre à la place d'une liste vide : jamais un tableau sans ligne. */
export function listeVide(nomIcone, texte, action = null) {
  return h('div', { class: 'vide' }, icon(nomIcone, 30), h('p', {}, texte), action);
}
