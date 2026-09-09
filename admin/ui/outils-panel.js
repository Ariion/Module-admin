/**
 * Les outils du site, rangés.
 *
 * Ils vivaient dans le pied du panneau : six boutons de même taille, de même
 * couleur, sans ordre — « Modèles de page », « Écrire pour moi », « Ambiance »,
 * « Réglages », « Pages légales », « Boutique ». Rien ne disait lequel prendre
 * quand, et le pied grossissait à chaque ajout.
 *
 * Ici, chacun a une ligne, un intitulé et une phrase qui dit à quoi il sert.
 * Ils sont groupés par moment : construire la page, lui donner son allure,
 * ajouter du contenu, régler le module. C'est la même liste, mais on peut
 * enfin la lire.
 * @module ui/outils-panel
 */
import { h, icon } from './el.js';
import { openModal } from './modal.js';

/**
 * Les groupes, dans l'ordre où on en a besoin.
 * `cle` sert à retrouver l'action et les libellés.
 */
export const GROUPES_OUTILS = [
  {
    id: 'construire',
    outils: [
      { cle: 'brief', icone: 'pencil', fort: true },
      { cle: 'modeles', icone: 'pages' },
    ],
  },
  {
    id: 'allure',
    outils: [{ cle: 'theme', icone: 'palette' }],
  },
  {
    id: 'contenu',
    outils: [
      { cle: 'boutique', icone: 'grid' },
      { cle: 'legal', icone: 'code' },
    ],
  },
  {
    id: 'module',
    outils: [
      { cle: 'reglages', icone: 'sliders' },
      // En dernier, et signalé : c'est la seule ligne qui défait du travail.
      { cle: 'reset', icone: 'history', danger: true },
    ],
  },
];

/**
 * @param {object} options
 * @param {HTMLElement} options.root
 * @param {Function} options.t
 * @param {Object<string, Function>} options.actions une fonction par `cle`
 */
export function openOutils({ root, t, actions }) {
  const corps = h('div', { class: 'outils' });

  const modal = openModal({ root, title: t('outilsTitre'), body: corps });

  for (const groupe of GROUPES_OUTILS) {
    corps.appendChild(h('div', { class: 'outils__groupe' }, t('outilsGroupe_' + groupe.id)));
    for (const outil of groupe.outils) {
      const action = actions[outil.cle];
      if (!action) continue;
      corps.appendChild(h('button', {
        class: 'outil' + (outil.fort ? ' outil--fort' : '') + (outil.danger ? ' outil--danger' : ''),
        type: 'button',
        onclick: () => { modal.close(); action(); },
      },
        h('span', { class: 'outil__icone' }, icon(outil.icone, 15)),
        h('span', { class: 'outil__texte' },
          h('span', { class: 'outil__nom' }, t('outil_' + outil.cle)),
          h('span', { class: 'outil__aide' }, t('outilAide_' + outil.cle))),
        icon('right', 13),
      ));
    }
  }

  return modal;
}
