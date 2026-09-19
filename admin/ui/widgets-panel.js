/**
 * Bibliothèque de widgets.
 *
 * Grille de vignettes, recherche et catégories repliables. Chaque vignette est
 * déplaçable : on la fait glisser dans l'aperçu pour l'y déposer, ou on clique
 * dessus pour l'ajouter à la zone active.
 * @module ui/widgets-panel
 */
import { h, icon, clear, rendreSansSauter } from './el.js';
import { WIDGETS, CATEGORIES } from '../core/widgets.js';
import { TEMPLATES } from '../core/templates.js';

/** Type MIME maison, transporté dans le presse-papiers du glisser-déposer. */
export const DRAG_PREFIX = 'admin-widget:';

export function createWidgetsPanel({ vue, t, onInsert, onTemplate, onDragStart, onDragEnd,
  contenus = null, onNouveauContenu = null }) {
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
    // Filtrer la liste ne doit pas renvoyer en haut du panneau.
    rendreSansSauter(corps, peindre);
  }

  function peindre() {
    clear(corps);
    let total = 0;

    // Le type de contenu d'abord : sur une page galerie, « ajouter un
    // article » est le geste qu'on vient faire, pas « poser un titre ».
    if (contenus && onNouveauContenu) {
      const sous = contenus.sousTypes.filter(
        (st) => !filtre || st.nom.toLowerCase().includes(filtre) || st.id.includes(filtre));
      if (sous.length) {
        total += sous.length;
        const ouvert = filtre ? true : !replies.has('contenus');
        corps.appendChild(h('div', { class: 'wcat', 'data-open': ouvert ? 'true' : 'false' },
          h('button', {
            class: 'wcat__head', type: 'button',
            onclick: () => {
              if (replies.has('contenus')) replies.delete('contenus'); else replies.add('contenus');
              dessiner();
            },
          }, h('span', {}, contenus.nom), icon('down', 12)),
          h('div', { class: 'wgrid' }, sous.map(vignetteContenu)),
        ));
      }
    }

    // Les modèles viennent en premier : partir d'une mise en page toute faite
    // est plus rapide que de poser les éléments un par un.
    if (onTemplate) {
      const modeles = TEMPLATES.filter((m) => !filtre || t('tpl_' + m.id).toLowerCase().includes(filtre));
      if (modeles.length) {
        total += modeles.length;
        const liste = h('div', { class: 'tpls' }, modeles.map(carteModele));
        const ouvert = filtre ? true : !replies.has('modeles');
        corps.appendChild(h('div', { class: 'wcat', 'data-open': ouvert ? 'true' : 'false' },
          h('button', {
            class: 'wcat__head', type: 'button',
            onclick: () => {
              if (replies.has('modeles')) replies.delete('modeles'); else replies.add('modeles');
              dessiner();
            },
          }, h('span', {}, t('cat_modeles')), icon('down', 12)),
          liste,
        ));
      }
    }

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

  /** Vignette d'un modèle : un aperçu schématique de sa mise en page. */
  function carteModele(modele) {
    const schema = h('span', { class: 'tpl__preview' },
      h('span', { class: 'tpl__bar' }),
      h('span', { class: 'tpl__cols' },
        modele.colonnes.map(() => h('span', { class: 'tpl__col' })),
      ),
    );
    return h('button', {
      class: 'tpl', type: 'button', title: t('tpl_' + modele.id),
      onclick: () => onTemplate(modele.id),
    }, schema, h('span', { class: 'tpl__label' }, t('tpl_' + modele.id)));
  }

  /**
   * Vignette d'un sous-type de contenu. Elle ne se glisse pas dans la page :
   * ce n'est pas un élément qu'on dépose, c'est un contenu qu'on crée.
   */
  function vignetteContenu(sousType) {
    return h('button', {
      class: 'wtile', type: 'button', title: sousType.nom,
      onclick: () => onNouveauContenu(sousType.id),
    },
      h('span', { class: 'wtile__icon' }, icon(sousType.icone || 'text', 20)),
      h('span', { class: 'wtile__label' }, sousType.nom),
    );
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
