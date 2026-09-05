/**
 * Surcouche d'édition : contours au survol, sélection au clic, barre d'outils
 * des blocs répétables.
 *
 * Aucun style n'est posé sur les éléments du site : les contours sont des
 * boîtes dessinées par-dessus, dans le shadow DOM. Sortir du mode édition
 * suffit donc à tout faire disparaître, sans résidu dans le HTML.
 * @module ui/overlay
 */
import { h, icon, clear } from './el.js';

const LABELS = { text: 'text', image: 'image', link: 'link', background: 'background' };

export function createOverlay({ host, layer, model, t, onSelect, onCollectionOp }) {
  let enabled = false;
  let hovered = null;
  let active = null;
  let elementMap = new Map();
  let itemMap = new Map();

  const box = h('div', { class: 'hl' });
  const tag = h('span', { class: 'hl__tag' });
  box.appendChild(tag);
  const activeBox = h('div', { class: 'hl hl--active' });
  const itembar = h('div', { class: 'itembar' });
  layer.append(box, activeBox, itembar);
  hide(box); hide(activeBox); hide(itembar);

  function hide(node) { node.style.display = 'none'; }
  function show(node) { node.style.display = ''; }

  /** Reconstruit les tables de correspondance après un scan. */
  function refresh() {
    elementMap = new Map();
    for (const entry of model.entries.values()) elementMap.set(entry.el, entry);

    itemMap = new Map();
    for (const collection of model.collections) {
      collection.items.forEach((item, index) => {
        itemMap.set(item, { collection, index });
        // Les champs d'un bloc répétable sont éditables eux aussi.
        for (const [key, field] of model.fieldsIn(item)) {
          elementMap.set(field.el, {
            ...field,
            collectionId: collection.id,
            itemIndex: index,
            fieldKey: key,
          });
        }
      });
    }
  }

  /** Entrée éditable la plus proche au-dessus d'un nœud. */
  function entryAt(node) {
    let current = node;
    while (current && current !== document.body) {
      if (elementMap.has(current)) return elementMap.get(current);
      current = current.parentElement;
    }
    return null;
  }

  function itemAt(node) {
    let current = node;
    while (current && current !== document.body) {
      if (itemMap.has(current)) return itemMap.get(current);
      current = current.parentElement;
    }
    return null;
  }

  function place(node, el) {
    const origin = host.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    node.style.left = (rect.left - origin.left) + 'px';
    node.style.top = (rect.top - origin.top) + 'px';
    node.style.width = rect.width + 'px';
    node.style.height = rect.height + 'px';
    show(node);
  }

  function paintHover(entry) {
    if (!entry) { hide(box); return; }
    place(box, entry.el);
    clear(tag);
    tag.append(icon(entry.role === 'link' ? 'link' : entry.role === 'text' ? 'pencil' : 'image', 11),
      t(LABELS[entry.role] || 'text'));
    box.appendChild(tag);
  }

  function paintItembar(hit) {
    if (!hit) { hide(itembar); return; }
    const { collection, index } = hit;
    const origin = host.getBoundingClientRect();
    const rect = collection.items[index].getBoundingClientRect();
    clear(itembar);
    const button = (name, title, op, ...args) => h('button', {
      class: 'btn btn--sm btn--icon', title,
      onclick: (event) => { event.preventDefault(); event.stopPropagation(); onCollectionOp(collection.id, op, ...args); },
    }, icon(name, 13));
    itembar.append(
      button('copy', t('duplicate'), 'duplicate', index),
      button('up', t('moveUp'), 'move', index, index - 1),
      button('down', t('moveDown'), 'move', index, index + 1),
      h('button', {
        class: 'btn btn--sm btn--icon btn--danger', title: t('remove'),
        onclick: (event) => {
          event.preventDefault(); event.stopPropagation();
          if (confirm(t('removeConfirm'))) onCollectionOp(collection.id, 'remove', index);
        },
      }, icon('trash', 13)),
      h('button', {
        class: 'btn btn--sm btn--icon', title: t('resetBlocks'),
        onclick: (event) => {
          event.preventDefault(); event.stopPropagation();
          if (confirm(t('resetBlocksConfirm'))) onCollectionOp(collection.id, 'reset');
        },
      }, icon('history', 13)),
    );
    itembar.style.left = (rect.right - origin.left - 164) + 'px';
    itembar.style.top = (rect.top - origin.top + 6) + 'px';
    show(itembar);
  }

  const onMove = (event) => {
    if (!enabled) return;
    if (event.target.closest && event.target.closest('[data-admin-ui]')) return;
    const entry = entryAt(event.target);
    if (entry !== hovered) {
      hovered = entry;
      paintHover(entry);
    }
    paintItembar(itemAt(event.target));
  };

  const onLeave = () => { hovered = null; hide(box); };

  const onClick = (event) => {
    if (!enabled) return;
    if (event.target.closest && event.target.closest('[data-admin-ui]')) return;
    const entry = entryAt(event.target);
    if (!entry) return;
    // On empêche la navigation : en mode édition, un lien se modifie, il ne
    // se suit pas.
    event.preventDefault();
    event.stopPropagation();
    onSelect(entry, event);
  };

  const reposition = () => {
    if (!enabled) return;
    if (hovered && hovered.el.isConnected) place(box, hovered.el); else hide(box);
    if (active && active.isConnected) place(activeBox, active); else hide(activeBox);
    hide(itembar);
  };

  return {
    refresh,
    entryAt,
    enable() {
      if (enabled) return;
      enabled = true;
      document.addEventListener('mousemove', onMove, true);
      document.addEventListener('mouseleave', onLeave);
      document.addEventListener('click', onClick, true);
      window.addEventListener('scroll', reposition, true);
      window.addEventListener('resize', reposition);
      refresh();
    },
    disable() {
      enabled = false;
      hovered = null; active = null;
      hide(box); hide(activeBox); hide(itembar);
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    },
    setActive(el) {
      active = el || null;
      if (active) place(activeBox, active); else hide(activeBox);
    },
    reposition,
  };
}
