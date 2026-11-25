/**
 * « Tout recommencer » — la fenêtre qui prévient avant de défaire.
 *
 * Une remise à zéro ne se déclenche pas sur un clic. Elle est décrite avant
 * d'être proposée : ce qui part, ce qui reste, et le filet — l'historique des
 * publications, qui permet de revenir en arrière. La portée « tout le site »
 * demande en plus une case cochée : c'est la seule qui touche l'ambiance, le
 * catalogue et les réponses aux pages légales.
 * @module ui/reset-panel
 */
import { h, icon, clear } from './el.js';
import { openModal } from './modal.js';

/**
 * @param {object} options
 * @param {HTMLElement} options.root
 * @param {Function} options.t
 * @param {string} options.nomPage nom lisible de la page ouverte
 * @param {number} options.nbPages nombre de pages connues du site
 * @param {boolean} options.peutRendreHtml l'hébergement sait-il réécrire le HTML
 * @param {Function} options.onReset reçoit ('page' | 'site')
 */
export function openReset({ root, t, nomPage, nbPages, peutRendreHtml, onReset }) {
  let portee = 'page';
  let compris = false;

  const corps = h('div', { class: 'raz' });
  const pied = h('div', { class: 'assist__pied' });
  const modal = openModal({ root, title: t('razTitre'), body: corps, actions: [pied] });

  function dessiner() {
    clear(corps);

    corps.append(
      h('p', { class: 'hint', style: { marginTop: '0' } }, t('razIntro')),

      h('div', { class: 'raz__choix' }, [
        { id: 'page', libelle: t('razPortee_page', nomPage), aide: t('razPorteeAide_page') },
        { id: 'site', libelle: t('razPortee_site', nbPages), aide: t('razPorteeAide_site') },
      ].map((choix) => h('button', {
        class: 'assist__carte raz__carte', type: 'button',
        'aria-pressed': portee === choix.id ? 'true' : 'false',
        onclick: () => { portee = choix.id; compris = false; dessiner(); },
      },
        h('span', { class: 'assist__carteTitre' }, choix.libelle),
        h('span', { class: 'assist__carteAide' }, choix.aide),
      ))),

      h('div', { class: 'raz__bilan' },
        h('div', { class: 'raz__colonne raz__colonne--part' },
          h('div', { class: 'raz__entete' }, icon('trash', 13), t('razPart')),
          h('ul', {}, listePart().map((ligne) => h('li', {}, ligne)))),
        h('div', { class: 'raz__colonne raz__colonne--reste' },
          h('div', { class: 'raz__entete' }, icon('check', 13), t('razReste')),
          h('ul', {}, listeReste().map((ligne) => h('li', {}, ligne)))),
      ),

      h('p', { class: 'raz__filet' }, icon('history', 13),
        h('span', {}, t('razHistorique'))),
    );

    // La portée « tout le site » emporte l'ambiance, le catalogue et les
    // réponses aux pages légales : elle demande un geste de plus.
    if (portee === 'site') {
      corps.appendChild(h('label', { class: 'assist__coche raz__coche' },
        h('input', {
          type: 'checkbox', checked: compris,
          onchange: (e) => { compris = e.target.checked; majPied(); },
        }),
        h('span', {}, h('span', { class: 'assist__cocheTitre' }, t('razCompris')))));
    }
    majPied();
  }

  function listePart() {
    const lignes = [t('razPart_contenu'), t('razPart_sections')];
    if (peutRendreHtml) lignes.push(t('razPart_html'));
    if (portee === 'site') lignes.push(t('razPart_reglages'), t('razPart_commun'));
    return lignes;
  }

  function listeReste() {
    const lignes = [t('razReste_code'), t('razReste_medias'), t('razReste_historique')];
    if (portee === 'page') lignes.push(t('razReste_autres'));
    return lignes;
  }

  function majPied() {
    clear(pied);
    const lancer = h('button', {
      class: 'btn btn--danger btn--fort', type: 'button',
      onclick: () => { modal.close(); onReset(portee); },
    }, icon('history', 13), t('razLancer'));
    lancer.disabled = portee === 'site' && !compris;

    pied.append(
      h('button', {
        class: 'btn btn--ghost', type: 'button', onclick: () => modal.close(),
      }, t('cancel')),
      h('span', { style: { flex: '1' } }),
      lancer,
    );
  }

  dessiner();
  return modal;
}
