/**
 * Surcouche de sélection posée sur l'aperçu.
 *
 * Le site vit dans une iframe : les contours sont dessinés à côté, dans le
 * panneau, jamais dans la page. Rien n'est ajouté au DOM du site, donc
 * quitter l'édition ne laisse aucune trace.
 * @module ui/overlay
 */
import { h, icon, clear } from './el.js';

const LABELS = { text: 'text', image: 'image', link: 'link', background: 'background' };

export function createOverlay({ layer, origin, t, onSelect, onCollectionOp }) {
  let doc = null;
  let win = null;
  let model = null;
  let actif = false;
  let survole = null;
  let selectionne = null;
  let parElement = new Map();
  let parItem = new Map();

  const cadre = h('div', { class: 'hl' });
  const etiquette = h('span', { class: 'hl__tag' });
  cadre.appendChild(etiquette);
  const cadreActif = h('div', { class: 'hl hl--active' });
  const outilsBloc = h('div', { class: 'itembar' });
  layer.append(cadre, cadreActif, outilsBloc);
  cacher(cadre); cacher(cadreActif); cacher(outilsBloc);

  function cacher(n) { n.style.display = 'none'; }
  function montrer(n) { n.style.display = ''; }

  /** Reconstruit les tables de correspondance après un scan. */
  function refresh(prochainModel) {
    if (prochainModel) {
      model = prochainModel;
      doc = model.doc;
      win = doc.defaultView;
    }
    if (!model) return;

    parElement = new Map();
    for (const entry of model.entries.values()) parElement.set(entry.el, entry);

    parItem = new Map();
    for (const collection of model.collections) {
      collection.items.forEach((item, index) => {
        parItem.set(item, { collection, index });
        for (const [cle, champ] of model.fieldsIn(item)) {
          parElement.set(champ.el, { ...champ, collectionId: collection.id, itemIndex: index, fieldKey: cle });
        }
      });
    }
    reposition();
  }

  function entreeSous(noeud) {
    let courant = noeud;
    while (courant && courant !== doc.body) {
      if (parElement.has(courant)) return parElement.get(courant);
      courant = courant.parentElement;
    }
    return null;
  }

  function itemSous(noeud) {
    let courant = noeud;
    while (courant && courant !== doc.body) {
      if (parItem.has(courant)) return parItem.get(courant);
      courant = courant.parentElement;
    }
    return null;
  }

  function placer(noeud, el) {
    if (!el || !el.isConnected) { cacher(noeud); return; }
    const decalage = origin();
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) { cacher(noeud); return; }
    noeud.style.left = (decalage.x + rect.left) + 'px';
    noeud.style.top = (decalage.y + rect.top) + 'px';
    noeud.style.width = rect.width + 'px';
    noeud.style.height = rect.height + 'px';
    montrer(noeud);
  }

  function peindreSurvol(entry) {
    if (!entry) { cacher(cadre); return; }
    placer(cadre, entry.el);
    clear(etiquette);
    etiquette.append(
      icon(entry.role === 'link' ? 'link' : entry.role === 'text' ? 'pencil' : 'image', 11),
      t(LABELS[entry.role] || 'text'),
    );
    cadre.appendChild(etiquette);
  }

  function peindreOutilsBloc(cible) {
    if (!cible) { cacher(outilsBloc); return; }
    const { collection, index } = cible;
    const el = collection.items[index];
    if (!el || !el.isConnected) { cacher(outilsBloc); return; }

    const decalage = origin();
    const rect = el.getBoundingClientRect();
    clear(outilsBloc);

    const bouton = (nom, titre, op, ...args) => h('button', {
      class: 'btn btn--sm btn--icon', type: 'button', title: titre,
      onclick: (e) => { e.preventDefault(); e.stopPropagation(); onCollectionOp(collection.id, op, ...args); },
    }, icon(nom, 13));

    outilsBloc.append(
      bouton('copy', t('duplicate'), 'duplicate', index),
      bouton('up', t('moveUp'), 'move', index, index - 1),
      bouton('down', t('moveDown'), 'move', index, index + 1),
      h('button', {
        class: 'btn btn--sm btn--icon btn--danger', type: 'button', title: t('remove'),
        onclick: (e) => {
          e.preventDefault(); e.stopPropagation();
          if (confirm(t('removeConfirm'))) onCollectionOp(collection.id, 'remove', index);
        },
      }, icon('trash', 13)),
    );
    outilsBloc.style.left = (decalage.x + Math.max(rect.left, rect.right - 128)) + 'px';
    outilsBloc.style.top = (decalage.y + rect.top + 5) + 'px';
    montrer(outilsBloc);
  }

  const surMouvement = (event) => {
    if (!actif) return;
    const entry = entreeSous(event.target);
    if (entry !== survole) { survole = entry; peindreSurvol(entry); }
    peindreOutilsBloc(itemSous(event.target));
  };

  const surSortie = () => { survole = null; cacher(cadre); cacher(outilsBloc); };

  const surClic = (event) => {
    if (!actif) return;
    // En édition, un lien se modifie ; il ne se suit pas.
    event.preventDefault();
    event.stopPropagation();
    const entry = entreeSous(event.target);
    const item = itemSous(event.target);
    onSelect(entry
      ? { el: entry.el, entry, collection: item?.collection, itemIndex: item?.index }
      : { el: event.target, collection: item?.collection, itemIndex: item?.index });
  };

  const reposition = () => {
    if (!actif) { cacher(cadre); cacher(cadreActif); cacher(outilsBloc); return; }
    placer(cadre, survole?.el);
    placer(cadreActif, selectionne);
    cacher(outilsBloc);
  };

  function brancher() {
    if (!doc) return;
    doc.addEventListener('mousemove', surMouvement, true);
    doc.addEventListener('mouseleave', surSortie);
    doc.addEventListener('click', surClic, true);
    win.addEventListener('scroll', reposition, true);
    win.addEventListener('resize', reposition);
    doc.documentElement.setAttribute('data-admin-editable', '');
  }

  function debrancher() {
    if (!doc) return;
    doc.removeEventListener('mousemove', surMouvement, true);
    doc.removeEventListener('mouseleave', surSortie);
    doc.removeEventListener('click', surClic, true);
    win.removeEventListener('scroll', reposition, true);
    win.removeEventListener('resize', reposition);
    doc.documentElement.removeAttribute('data-admin-editable');
  }

  return {
    refresh,
    reposition,
    enable() { if (actif) return; actif = true; brancher(); reposition(); },
    disable() { debrancher(); actif = false; survole = null; reposition(); },
    setActive(el) { selectionne = el || null; placer(cadreActif, selectionne); },
    /** Fait défiler l'aperçu jusqu'à un élément et le met en évidence. */
    reveal(el) {
      if (!el || !el.isConnected) return;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setTimeout(reposition, 320);
    },
    get document() { return doc; },
  };
}
