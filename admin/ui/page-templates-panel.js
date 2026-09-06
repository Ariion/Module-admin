/**
 * Choix d'un modèle de page entière.
 *
 * Sert quand on part d'une page vide, ou qu'on veut refaire une page de fond
 * en comble. Deux façons de l'appliquer : ajouter la trame à la suite de ce
 * qui existe, ou remplacer la page — les sections du site sont alors retirées,
 * et restent récupérables depuis l'onglet Structure.
 * @module ui/page-templates-panel
 */
import { h, icon } from './el.js';
import { openModal } from './modal.js';
import { PAGE_TEMPLATES } from '../core/page-templates.js';

/** Petit schéma de la trame : une barre par section. */
function apercu(formes) {
  return h('span', { class: 'pagetpl__preview' }, formes.map((forme) => {
    if (forme === 'bar') return h('span', { class: 'pagetpl__band' });
    const n = forme === 'duo' ? 2 : 3;
    return h('span', { class: 'pagetpl__row' },
      Array.from({ length: n }, () => h('span', { class: 'pagetpl__cell' })));
  }));
}

export function openPageTemplates({ root, t, onApply }) {
  const corps = h('div', {},
    h('p', { class: 'hint', style: { marginTop: '0' } }, t('pageTplHint')),
    h('div', { class: 'pagetpls' }, PAGE_TEMPLATES.map((modele) => h('div', { class: 'pagetpl' },
      apercu(modele.apercu),
      h('div', { class: 'pagetpl__main' },
        h('div', { class: 'pagetpl__title' }, t('page_' + modele.id)),
        h('div', { class: 'pagetpl__meta' }, t('pageTplSections', modele.build().length)),
      ),
      h('div', { class: 'pagetpl__actions' },
        h('button', {
          class: 'btn btn--sm', type: 'button',
          onclick: () => { modal.close(); onApply(modele.id, false); },
        }, icon('plus', 12), t('pageTplAppend')),
        h('button', {
          class: 'btn btn--sm btn--sect', type: 'button',
          onclick: () => {
            if (!confirm(t('pageTplReplaceConfirm'))) return;
            modal.close();
            onApply(modele.id, true);
          },
        }, t('pageTplReplace')),
      ),
    ))),
  );

  const modal = openModal({ root, title: t('pageTemplates'), body: corps });
  return modal;
}
