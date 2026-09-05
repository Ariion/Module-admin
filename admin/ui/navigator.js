/**
 * Structure de la page.
 *
 * Donne accès à ce qu'un clic dans l'aperçu ne permet pas d'atteindre : une
 * section entière, pour lui changer son fond, ou un élément recouvert par un
 * autre. C'est aussi la carte du contenu — le client voit d'un coup d'œil
 * tout ce qu'il peut modifier.
 * @module ui/navigator
 */
import { h, icon, clear } from './el.js';

const SECTIONS = ['SECTION', 'HEADER', 'FOOTER', 'MAIN', 'ASIDE', 'ARTICLE', 'NAV'];

export function createNavigator({ vue, t, onSelect, onHover }) {
  let courant = null;

  function render(model) {
    clear(vue);
    if (!model || !model.doc?.body) {
      vue.appendChild(h('p', { class: 'empty' }, t('emptyStructure')));
      return;
    }

    const parEnfant = new Map();
    for (const entry of model.entries.values()) parEnfant.set(entry.el, entry);

    const racine = h('ul', { class: 'tree' });
    for (const section of Array.from(model.doc.body.children)) {
      if (!estAffichable(section)) continue;
      racine.appendChild(noeudSection(section, model, parEnfant));
    }
    vue.appendChild(racine.children.length ? racine : h('p', { class: 'empty' }, t('emptyStructure')));
  }

  function estAffichable(el) {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'LINK'].includes(el.tagName)) return false;
    return !el.hasAttribute('data-admin-ui');
  }

  function noeudSection(section, model, parEnfant) {
    const enfants = h('ul');
    const contenus = [...model.entries.values()].filter((e) => section.contains(e.el));
    const listes = model.collections.filter((c) => section.contains(c.container));

    for (const collection of listes) {
      enfants.appendChild(noeudCollection(collection, model));
    }
    for (const entry of contenus.slice(0, 40)) {
      enfants.appendChild(h('li', {}, bouton(entry.el, libelleEntree(entry), iconeRole(entry.role), { entry })));
    }
    if (contenus.length > 40) {
      enfants.appendChild(h('li', {}, h('p', { class: 'hint' }, t('andMore', contenus.length - 40))));
    }

    const total = contenus.length + listes.reduce((n, c) => n + c.items.length, 0);
    return h('li', {},
      bouton(section, nomSection(section), 'section', {}, total),
      enfants.children.length ? enfants : null,
    );
  }

  function noeudCollection(collection, model) {
    const items = h('ul');
    collection.items.forEach((item, index) => {
      const champs = model.fieldsIn(item);
      const premier = [...champs.values()].find((c) => c.role === 'text');
      const libelle = premier ? court(premier.el.textContent) : t('blockN', index + 1);
      items.appendChild(h('li', {}, bouton(item, libelle, 'layers', { collection, itemIndex: index })));
    });
    return h('li', {},
      bouton(collection.container, t('blockList'), 'layers', {}, collection.items.length),
      items,
    );
  }

  function bouton(el, libelle, nomIcone, extra, compte) {
    const noeud = h('button', {
      class: 'node', type: 'button',
      'aria-current': 'false',
      onclick: () => { selectionner(noeud); onSelect({ el, ...extra }); },
      onmouseenter: () => onHover?.(el),
      onmouseleave: () => onHover?.(null),
    },
      icon(nomIcone, 12),
      h('span', { class: 'node__label' }, libelle),
      compte ? h('span', { class: 'node__count' }, String(compte)) : null,
    );
    return noeud;
  }

  function selectionner(noeud) {
    if (courant) courant.setAttribute('aria-current', 'false');
    courant = noeud;
    noeud.setAttribute('aria-current', 'true');
  }

  function iconeRole(role) {
    if (role === 'link') return 'link';
    if (role === 'image' || role === 'background') return 'image';
    return 'text';
  }

  function nomSection(el) {
    const nom = el.getAttribute('id') || Array.from(el.classList)[0];
    const balise = el.tagName.toLowerCase();
    if (SECTIONS.includes(el.tagName)) return nom ? `${balise} · ${nom}` : balise;
    return nom || balise;
  }

  function libelleEntree(entry) {
    if (entry.role === 'image') return court(entry.el.getAttribute('alt')) || t('image');
    if (entry.role === 'background') return t('background');
    return court(entry.el.textContent) || t('text');
  }

  function court(texte) {
    return String(texte || '').replace(/\s+/g, ' ').trim().slice(0, 44);
  }

  /** Met en évidence le nœud correspondant à une sélection venue de l'aperçu. */
  function highlight(el) {
    for (const noeud of vue.querySelectorAll('.node')) {
      noeud.setAttribute('aria-current', 'false');
    }
    courant = null;
    void el;
  }

  return { render, highlight };
}
