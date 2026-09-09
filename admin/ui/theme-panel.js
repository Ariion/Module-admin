/**
 * Choix du thème : l'allure générale du site, en une image.
 *
 * On ne demande pas au client de composer une palette — il n'a aucune raison
 * de savoir le faire. On lui montre neuf ambiances toutes faites et il en
 * désigne une ; le module en déduit polices, couleurs, formes et rythme.
 * @module ui/theme-panel
 */
import { h, icon, clear } from './el.js';
import { openModal } from './modal.js';
import { THEMES, themeById } from '../core/theme.js';
import { fontStack } from '../core/fonts.js';

/** Vignette d'un thème : une page miniature peinte avec sa palette. */
function vignette(theme) {
  const { couleurs: c, formes: f } = theme;
  return h('span', { class: 'theme__vue', style: { background: c.fond } },
    h('span', {
      class: 'theme__titre',
      style: { fontFamily: fontStack(theme.police.titres) || 'serif', color: c.encre },
    }, 'Aa'),
    h('span', { class: 'theme__ligne', style: { background: c.doux } }),
    h('span', { class: 'theme__ligne theme__ligne--court', style: { background: c.doux } }),
    h('span', {
      class: 'theme__btn',
      style: {
        background: f.bouton === 'plein' ? c.accent : 'transparent',
        border: f.bouton === 'plein' ? '0' : `2px solid ${c.accent}`,
        borderRadius: Math.min(f.rayonBouton, 12) + 'px',
      },
    }),
    h('span', { class: 'theme__bande', style: { background: c.fondDoux } }),
  );
}

/**
 * Pose la grille de thèmes dans un hôte quelconque (panneau ou fenêtre).
 *
 * @param {object} options
 * @param {HTMLElement} options.hote
 * @param {Function} options.t
 * @param {{id?:string, portee?:string}|null} options.valeur réglage courant
 * @param {boolean} options.siteExistant le site a-t-il déjà son propre code
 * @param {Function} options.onChange reçoit le nouveau réglage
 */
export function rendreChoixTheme({ hote, t, valeur, siteExistant, onChange }) {
  let etat = { portee: siteExistant ? 'blocs' : 'site', ...(valeur || {}) };

  const dessiner = () => {
    clear(hote);

    const grille = h('div', { class: 'themes' }, THEMES.map((theme) => h('button', {
      class: 'theme', type: 'button',
      'aria-pressed': etat.id === theme.id ? 'true' : 'false',
      onclick: () => { etat = { ...etat, id: theme.id }; onChange(etat); dessiner(); },
    },
      vignette(theme),
      h('span', { class: 'theme__nom' }, t('theme_' + theme.id)),
    )));

    // La portée n'a de sens que sur un site qui a déjà son propre style : sur
    // une page vierge, il n'y a rien à préserver.
    const portee = siteExistant && etat.id
      ? h('div', { class: 'theme__portee' },
        h('div', { class: 'hint', style: { marginTop: '0', marginBottom: '8px' } }, t('themePorteeAide')),
        h('div', { class: 'seg' }, ['blocs', 'site'].map((p) => h('button', {
          class: 'seg__btn', type: 'button',
          'aria-pressed': (etat.portee || 'blocs') === p ? 'true' : 'false',
          onclick: () => { etat = { ...etat, portee: p }; onChange(etat); dessiner(); },
        }, t('themePortee_' + p)))),
      )
      : null;

    const retirer = etat.id
      ? h('button', {
        class: 'btn btn--ghost btn--wide', type: 'button',
        style: { marginTop: '10px' },
        onclick: () => { etat = { portee: etat.portee }; onChange(etat); dessiner(); },
      }, icon('close', 13), t('themeAucun'))
      : null;

    hote.append(grille, ...[portee, retirer].filter(Boolean));
  };

  dessiner();
  return { get valeur() { return etat; } };
}

/** La même grille, en fenêtre, pour la barre d'outils. */
export function openTheme({ root, t, valeur, siteExistant, onChange }) {
  const corps = h('div', {});
  const modal = openModal({
    root, title: t('themeTitre'), body: corps,
    actions: [h('span', { style: { flex: '1' } }), h('button', {
      class: 'btn btn--primary', type: 'button', onclick: () => modal.close(),
    }, icon('check', 13), t('done'))],
  });
  corps.append(h('p', { class: 'hint', style: { marginTop: '0' } }, t('themeAide')));
  const hote = h('div', {});
  corps.appendChild(hote);
  rendreChoixTheme({ hote, t, valeur, siteExistant, onChange });
  return modal;
}

export { themeById };
