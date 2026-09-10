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
import { apercuPage } from './apercu-page.js';

export function openPageTemplates({ root, t, onApply, onWizard, theme = null }) {
  const corps = h('div', {},
    h('p', { class: 'hint', style: { marginTop: '0' } }, t('pageTplHint')),
    onWizard ? h('button', {
      class: 'btn btn--wide', type: 'button', style: { margin: '4px 0 14px' },
      onclick: () => { modal.close(); onWizard(); },
    }, icon('sliders', 13), t('wizardRestart')) : null,
    h('div', { class: 'pagetpls' }, PAGE_TEMPLATES.map((modele) => h('div', { class: 'pagetpl' },
      apercuPage(modele.apercu, theme),
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
