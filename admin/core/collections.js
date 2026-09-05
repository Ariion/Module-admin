/**
 * Blocs répétables (liste de chambres, galerie, avis...).
 *
 * Détection automatique : un conteneur dont plusieurs enfants consécutifs
 * partagent la même signature est une collection. Le client peut alors
 * dupliquer, réordonner ou supprimer un bloc — mais jamais en changer la
 * structure : chaque bloc reste un clone du gabarit écrit par le développeur,
 * la mise en page ne peut pas être cassée.
 *
 * Le HTML du gabarit n'est pas stocké en base : il est relu dans la page à
 * chaque chargement. Si le développeur redesigne le bloc, tous les items
 * héritent du nouveau design en conservant leur contenu.
 * @module core/collections
 */
import { hash, uid } from './util.js';
import { children } from './dom.js';
import { signature, pathBetween, anchorOf } from './identity.js';

const IGNORE_ATTR = 'data-admin-ignore';
const NO_COLLECTION_ATTR = 'data-admin-no-repeat';

/**
 * Détecte les collections de la page.
 * @returns {Array<{id:string, print:object, container:Element, items:Element[], itemSig:string}>}
 */
export function detectCollections(options = {}) {
  const { roots = ['body'], minItems = 2, exclude = [], requireClass = true, doc = document } = options;
  const excludeSelector = exclude.filter(Boolean).join(',');
  const collections = [];
  const claimed = new Set();

  const containers = [];
  for (const selector of roots) {
    let nodes = [];
    try { nodes = Array.from(doc.querySelectorAll(selector)); } catch { nodes = []; }
    for (const node of nodes) {
      containers.push(node, ...node.querySelectorAll('*'));
    }
  }

  for (const container of containers) {
    if (claimed.has(container)) continue;
    if (container.hasAttribute(IGNORE_ATTR) || container.hasAttribute(NO_COLLECTION_ATTR)) continue;
    if (container.closest('[data-admin-ui]')) continue;
    if (excludeSelector) {
      try { if (container.matches(excludeSelector)) continue; } catch { /* ignore */ }
    }

    const run = longestRun(children(container), minItems);
    if (!run) continue;

    if (!isRepeatableBlock(run, { requireClass })) continue;

    const anchor = anchorOf(container);
    const print = {
      id: 'c_' + hash(anchor.key + '|' + pathBetween(anchor.node, container) + '|' + run.sig),
      anchor: anchor.key,
      path: anchor.key + '|' + pathBetween(anchor.node, container),
      sig: signature(container),
      itemSig: run.sig,
      role: 'collection',
    };
    if (collections.some((c) => c.id === print.id)) continue;

    collections.push({ id: print.id, print, container, items: run.items, itemSig: run.sig });
    for (const item of run.items) {
      claimed.add(item);
      for (const descendant of item.querySelectorAll('*')) claimed.add(descendant);
    }
  }

  return collections;
}

/**
 * Toute suite de frères identiques n'est pas un bloc répétable.
 *
 * On exige un vrai composant : des enfants (pas un simple paragraphe), du
 * contenu, et une classe. Un développeur nomme ses composants (`.room`,
 * `.review`) ; il ne nomme pas les deux `<p>` de son pied de page. Sans ce
 * garde-fou, le client se retrouve avec des boutons « dupliquer » sur des
 * lignes de texte qui n'ont rien de répétable.
 */
function isRepeatableBlock(run, { requireClass }) {
  if (requireClass && !run.sig.includes('.')) return false;
  return run.items.every((item) => item.children.length > 0)
    && run.items.some((item) => item.textContent.trim() || item.querySelector('img'));
}

/** Plus longue suite d'enfants consécutifs de même signature. */
function longestRun(kids, minItems) {
  let best = null;
  let index = 0;
  while (index < kids.length) {
    const sig = signature(kids[index]);
    let end = index;
    while (end + 1 < kids.length && signature(kids[end + 1]) === sig) end++;
    const length = end - index + 1;
    if (length >= minItems && (!best || length > best.items.length)) {
      best = { sig, start: index, items: kids.slice(index, end + 1) };
    }
    index = end + 1;
  }
  return best;
}

/** Clé d'un champ à l'intérieur d'un item : chemin relatif + rôle. */
export function fieldKey(itemRoot, el, role) {
  return 'f_' + hash(pathBetween(itemRoot, el) + '|' + role + '|' + signature(el));
}

/**
 * État initial d'une collection, lu dans le DOM.
 * @returns {{items: Array<{key:string, src:number, fields:object}>}}
 */
export function readCollection(collection, fieldsOf) {
  return {
    items: collection.items.map((item, index) => ({
      key: 'i' + index,
      src: index,
      fields: fieldsOf ? fieldsOf(item, index) : {},
    })),
  };
}

/** Structure d'origine (aucun ajout, suppression ni réordonnancement). */
export function isPristine(collection, data) {
  if (!data || !Array.isArray(data.items)) return true;
  if (data.items.length !== collection.items.length) return false;
  return data.items.every((item, index) => item.src === index);
}

/**
 * Applique une collection au DOM.
 *
 * Cas courant (le client n'a modifié que du texte) : on garde les nœuds
 * d'origine, donc les scripts du site (carrousels, lightbox) restent
 * accrochés. Ce n'est que si la structure change qu'on reconstruit la liste.
 *
 * @param {object} collection  résultat de detectCollections()
 * @param {object} data        contenu stocké
 * @param {function} applyFields (itemEl, fields) => void
 * @returns {{rebuilt:boolean, items:Element[]}}
 */
export function applyCollection(collection, data, applyFields) {
  const { container, items: originals } = collection;
  if (!data || !Array.isArray(data.items) || !data.items.length) {
    return { rebuilt: false, items: originals };
  }

  if (isPristine(collection, data)) {
    data.items.forEach((entry, index) => applyFields(originals[index], entry.fields || {}));
    return { rebuilt: false, items: originals };
  }

  // Gabarits figés AVANT toute modification, pour que dupliquer un bloc déjà
  // édité reparte d'une base propre.
  const templates = originals.map((node) => node.cloneNode(true));
  const anchorNode = originals[0];
  const fragment = container.ownerDocument.createDocumentFragment();
  const rendered = [];

  for (const entry of data.items) {
    const source = templates[entry.src] || templates[0];
    const node = source.cloneNode(true);
    node.setAttribute('data-admin-item', entry.key || uid('i'));
    fragment.appendChild(node);
    rendered.push(node);
  }

  container.insertBefore(fragment, anchorNode);
  for (const node of originals) node.remove();

  // Les champs sont appliqués une fois les blocs dans le document : la
  // détection des images de fond a besoin des styles calculés.
  data.items.forEach((entry, index) => applyFields(rendered[index], entry.fields || {}));

  collection.items = rendered;
  return { rebuilt: true, items: rendered };
}

/** Opérations exposées à l'éditeur. Retournent une nouvelle liste d'items. */
export const ops = {
  duplicate(items, index) {
    const copy = items.slice();
    const source = items[index];
    copy.splice(index + 1, 0, {
      key: uid('i'),
      src: source.src,
      fields: JSON.parse(JSON.stringify(source.fields || {})),
    });
    return copy;
  },
  remove(items, index) {
    if (items.length <= 1) return items;
    const copy = items.slice();
    copy.splice(index, 1);
    return copy;
  },
  move(items, from, to) {
    if (to < 0 || to >= items.length || from === to) return items;
    const copy = items.slice();
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
  },
};

/** Retrouve une collection stockée parmi celles détectées dans la page. */
export function matchCollection(record, detected, used = new Set()) {
  const free = (c) => !used.has(c.id);
  const byId = detected.find((c) => c.id === record.id && free(c));
  if (byId) return byId;
  const byPath = detected.filter((c) => c.print.path === record.path && free(c));
  if (byPath.length === 1) return byPath[0];
  const bySig = detected.filter((c) => c.itemSig === record.itemSig && free(c));
  return bySig.length === 1 ? bySig[0] : null;
}
