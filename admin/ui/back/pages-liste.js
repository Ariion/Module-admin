/**
 * Les pages du site : la liste, et ce qu'on peut en faire.
 *
 * Le back-office s'arrête au CHÂSSIS — créer une page, la nommer, la
 * supprimer, voir où elle en est. Écrire dedans se fait sur la page
 * elle-même, où l'on voit ce qu'on écrit. Chaque ligne porte donc deux
 * portes : « Structure » pour poser les sections, « Écrire » pour les
 * remplir.
 *
 * Créer une page depuis le back-office demande un hébergement capable
 * d'écrire un fichier. Quand il ne l'est pas, on le dit une fois, en haut,
 * au lieu de laisser un bouton qui échouera.
 * @module ui/back/pages-liste
 */
import { h, icon } from '../el.js';
import { teteEcran, listeVide } from './shell-back.js';

/**
 * @param {object} options
 * @param {Function} options.t
 * @param {Function} options.lister renvoie les pages connues (asynchrone)
 * @param {Function} options.peutCreer l'hébergement sait-il écrire un fichier
 * @param {Function} options.onCreer
 * @param {Function} options.onStructure ouvre la structure d'une page
 * @param {Function} options.onEcrire ouvre l'éditeur en direct sur la page
 * @param {Function} options.onSupprimer
 */
export function creerPagesListe({ t, lister, peutCreer, onCreer, onStructure, onEcrire, onSupprimer }) {
  return async function dessiner(page, cheminVise = null) {
    const creer = h('button', {
      class: 'b b--fort', type: 'button', disabled: !peutCreer(), onclick: () => onCreer(),
    }, icon('plus', 14), t('boPageCreer'));

    page.appendChild(teteEcran(t('boPages'), t('boPagesAide'), creer));

    if (!peutCreer()) {
      page.appendChild(h('div', { class: 'note', style: { marginBottom: '18px' } },
        icon('warn', 14), h('span', {}, t('boPagesSansHote'))));
    }

    const carte = h('div', { class: 'carte' });
    page.appendChild(carte);
    carte.appendChild(h('div', { class: 'charge' }, t('boChargement')));

    const pages = await lister();
    carte.replaceChildren();

    if (!pages.length) {
      carte.appendChild(listeVide('pages', t('boPagesVideLong'),
        peutCreer() ? h('button', { class: 'b b--fort', type: 'button', onclick: () => onCreer() },
          icon('plus', 14), t('boPageCreer')) : null));
      return;
    }

    carte.appendChild(h('table', { class: 'table' },
      h('thead', {}, h('tr', {},
        h('th', {}, t('boColPage')),
        h('th', {}, t('boColEtat')),
        h('th', {}, t('boColSections')),
        h('th', { style: { textAlign: 'right' } }, t('boColActions')),
      )),
      h('tbody', {}, pages.map((p) => ligne(p, p.chemin === cheminVise))),
    ));

    function ligne(p, visee) {
      const rang = h('tr', visee ? { style: { background: 'var(--accent-pale)' } } : {},
        h('td', { class: 'table__nom' },
          h('button', { type: 'button', onclick: () => onStructure(p) }, p.nom),
          // La mention « page d'accueil » n'a d'intérêt que si le nom ne le
          // dit pas déjà : « Accueil · Accueil » ne renseigne personne.
          h('div', { class: 'table__meta' },
            p.chemin + (p.accueil && p.nom !== t('boPageAccueil') ? ' · ' + t('boPageAccueilMarque') : '')),
        ),
        h('td', {}, etatDe(p)),
        h('td', {}, p.sections == null
          ? h('span', { style: { color: 'var(--pale)' } }, '—')
          : t('boNbSections', p.sections)),
        h('td', { class: 'table__actions' },
          h('button', { class: 'b b--sm', type: 'button', onclick: () => onStructure(p) },
            icon('layers', 13), t('boStructure')),
          h('button', { class: 'b b--sm', type: 'button', onclick: () => onEcrire(p) },
            icon('pencil', 13), t('boEcrire')),
          // La page d'accueil ne se supprime pas : un site sans accueil n'est
          // plus un site, et rien ne permettrait de le rattraper depuis ici.
          p.accueil ? null : h('button', {
            class: 'b b--sm b--danger b--icone', type: 'button',
            title: t('boPageSupprimer'), 'aria-label': t('boPageSupprimer'),
            disabled: !peutCreer(),
            onclick: () => onSupprimer(p),
          }, icon('trash', 13)),
        ),
      );
      return rang;
    }

    function etatDe(p) {
      if (p.brouillon) return h('span', { class: 'etat etat--brouillon' }, icon('warn', 11), t('unpublished'));
      if (p.publie) return h('span', { class: 'etat etat--publie' }, icon('check', 11), t('published'));
      return h('span', { class: 'etat etat--neutre' }, t('boPageIntacte'));
    }
  };
}
