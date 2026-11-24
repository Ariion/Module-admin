/**
 * La bibliothèque de modèles de section, en deux onglets — la même
 * distinction que pour un modèle de page, posée au même endroit : une grille
 * pour choisir d'un coup d'œil, une liste pour chercher par nom.
 *
 * Les deux onglets montrent les MÊMES modèles : il n'existe, pour l'instant,
 * qu'un seul jeu de modèles de section, ceux que le module propose. Garder
 * deux onglets malgré tout, c'est garder la place d'un second jeu — des
 * modèles enregistrés par le client lui-même — sans avoir à redessiner la
 * fenêtre le jour où il arrivera.
 * @module ui/template-library
 */
import { h, icon, clear } from './el.js';
import { openModal } from './modal.js';
import { TEMPLATES } from '../core/templates.js';

function schema(modele) {
  return h('span', { class: 'tpl__preview' },
    h('span', { class: 'tpl__bar' }),
    h('span', { class: 'tpl__cols' }, modele.colonnes.map(() => h('span', { class: 'tpl__col' }))),
  );
}

export function openTemplateLibrary({ root, t, onInsert }) {
  let onglet = 'grille';

  const corps = h('div', {});
  const nav = h('div', { class: 'bibtabs' },
    h('button', {
      class: 'bibtabs__btn', type: 'button', 'aria-pressed': 'true',
      onclick: (e) => activer('grille', e.target),
    }, t('bibPredefinis')),
    h('button', {
      class: 'bibtabs__btn', type: 'button', 'aria-pressed': 'false',
      onclick: (e) => activer('liste', e.target),
    }, t('bibListe')),
  );

  function activer(id, bouton) {
    onglet = id;
    nav.querySelectorAll('.bibtabs__btn').forEach((b) => b.setAttribute('aria-pressed', b === bouton ? 'true' : 'false'));
    peindre();
  }

  function apercu(modele) {
    const popup = openModal({
      root, title: t('tpl_' + modele.id), size: 'sm',
      body: h('div', { style: { padding: '18px 4px', display: 'flex', justifyContent: 'center' } },
        h('div', { style: { width: '220px' } }, schema(modele))),
    });
    return popup;
  }

  function inserer(modele) {
    modal.close();
    onInsert(modele.id);
  }

  function carteGrille(modele) {
    return h('button', {
      class: 'tpl tpl--biblio', type: 'button', title: t('tpl_' + modele.id),
      onclick: () => inserer(modele),
    }, schema(modele), h('span', { class: 'tpl__label' }, t('tpl_' + modele.id)));
  }

  function ligneListe(modele) {
    return h('div', { class: 'bibligne' },
      h('span', { class: 'bibligne__icon' }, icon('template', 15)),
      h('span', { class: 'bibligne__nom' }, t('tpl_' + modele.id)),
      h('span', { class: 'bibligne__type' }, t('bibTypeSection')),
      h('span', { class: 'bibligne__actions' },
        h('button', {
          class: 'btn btn--sm btn--ghost', type: 'button', onclick: () => apercu(modele),
        }, t('bibApercu')),
        h('button', {
          class: 'btn btn--sm btn--primary', type: 'button', onclick: () => inserer(modele),
        }, icon('download', 12), t('bibInsertion')),
      ),
    );
  }

  function peindre() {
    clear(corps);
    if (onglet === 'grille') {
      corps.appendChild(h('div', { class: 'tpls tpls--biblio' }, TEMPLATES.map(carteGrille)));
    } else {
      corps.appendChild(h('p', { class: 'hint', style: { marginTop: '0' } }, t('bibListeHint')));
      corps.appendChild(h('div', { class: 'bibliste' }, TEMPLATES.map(ligneListe)));
    }
  }

  peindre();
  const modal = openModal({ root, title: t('bibTitre'), body: h('div', {}, nav, corps) });
  return modal;
}
