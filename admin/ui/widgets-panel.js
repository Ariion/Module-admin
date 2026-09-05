/**
 * Bibliothèque de widgets.
 *
 * Grille de vignettes, recherche et catégories repliables. Chaque vignette est
 * déplaçable : on la fait glisser dans l'aperçu pour l'y déposer, ou on clique
 * dessus pour l'ajouter à la zone active.
 * @module ui/widgets-panel
 */
import { h, icon, clear } from './el.js';
import { WIDGETS, CATEGORIES } from '../core/widgets.js';

/** Type MIME maison, transporté dans le presse-papiers du glisser-déposer. */
export const DRAG_PREFIX = 'admin-widget:';

export function createWidgetsPanel({ vue, t, onInsert, onDragStart, onDragEnd }) {
  let filtre = '';
  const replies = new Set();

  const recherche = h('input', {
    class: 'input search__input', type: 'search', placeholder: t('searchWidget'),
    oninput: (e) => { filtre = e.target.value.trim().toLowerCase(); dessiner(); },
  });

  const entete = h('div', { class: 'search' }, icon('search', 13), recherche);
  const corps = h('div', {});
  vue.append(entete, corps);

  function widgetsDe(categorie) {
    return Object.entries(WIDGETS)
      .filter(([, def]) => def.category === categorie && !def.hidden)
      .filter(([type]) => !filtre || t('w_' + type).toLowerCase().includes(filtre) || type.includes(filtre));
  }

  function dessiner() {
    clear(corps);
    let total = 0;

    for (const categorie of CATEGORIES) {
      const liste = widgetsDe(categorie);
      if (!liste.length) continue;
      total += liste.length;

      const ouvert = filtre ? true : !replies.has(categorie);
      const grille = h('div', { class: 'wgrid' }, liste.map(([type]) => vignette(type)));
      const bloc = h('div', { class: 'wcat', 'data-open': ouvert ? 'true' : 'false' },
        h('button', {
          class: 'wcat__head', type: 'button',
          onclick: () => {
            if (replies.has(categorie)) replies.delete(categorie); else replies.add(categorie);
            dessiner();
          },
        }, h('span', {}, t('cat_' + categorie)), icon('down', 12)),
        grille,
      );
      corps.appendChild(bloc);
    }

    if (!total) corps.appendChild(h('p', { class: 'empty' }, t('noWidget')));
  }

  function vignette(type) {
    const def = WIDGETS[type];
    return h('button', {
      class: 'wtile', type: 'button', draggable: 'true', title: t('w_' + type),
      ondragstart: (e) => {
        e.dataTransfer.setData('text/plain', DRAG_PREFIX + type);
        e.dataTransfer.effectAllowed = 'copy';
        onDragStart?.(type);
      },
      ondragend: () => onDragEnd?.(),
      onclick: () => onInsert(type),
    },
      h('span', { class: 'wtile__icon' }, icon(def.icon, 20)),
      h('span', { class: 'wtile__label' }, t('w_' + type)),
    );
  }

  dessiner();
  return { render: dessiner, focus: () => recherche.focus() };
}
