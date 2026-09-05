/**
 * Modèle de page : fait le lien entre le DOM réel, les éléments détectés et
 * le contenu stocké. Utilisé tel quel par le runtime (lecture seule) et par
 * l'éditeur (lecture + écriture).
 * @module core/model
 */
import { scan } from './scanner.js';
import { buildIndex, resolveAll } from './identity.js';
import { detectCollections, readCollection, fieldKey, applyCollection, matchCollection, ops } from './collections.js';
import { applyValue, readCurrent } from './binder.js';
import { clone, equal } from './util.js';
import { debug, safe } from './log.js';

export const SNAPSHOT_VERSION = 1;

export function emptySnapshot() {
  return { v: SNAPSHOT_VERSION, content: {}, collections: {} };
}

export class PageModel {
  /**
   * @param {object} scanOptions options passées au scanner
   */
  constructor(scanOptions = {}) {
    this.scanOptions = scanOptions;
    /** @type {Map<string, {el:Element, role:string, print:object, value:object}>} */
    this.entries = new Map();
    /** @type {Array} collections détectées dans la page */
    this.collections = [];
    /** @type {Map<string, object>} valeurs actuelles (contenu surchargé) */
    this.values = new Map();
    /** @type {Map<string, object>} état des collections */
    this.collectionState = new Map();
    /** @type {Map<string, object>} métadonnées d'identité par id */
    this.meta = new Map();
    /** @type {Map<string, object>} enregistrements non rebranchés */
    this.orphans = new Map();
    this.collectionsById = new Map();
  }

  /** Analyse la page. À rejouer après une reconstruction de collection. */
  refresh() {
    this.collections = safe(() => detectCollections(this.scanOptions), [], 'detectCollections');
    this.collectionsById = new Map(this.collections.map((c) => [c.id, c]));

    const inCollection = new Set();
    for (const collection of this.collections) {
      for (const item of collection.items) {
        inCollection.add(item);
        for (const node of item.querySelectorAll('*')) inCollection.add(node);
      }
    }

    const entries = safe(() => scan(this.scanOptions), [], 'scan');
    this.entries = new Map();
    for (const entry of entries) {
      // Ce qui vit dans un bloc répétable est géré par la collection.
      if (inCollection.has(entry.el)) continue;
      this.entries.set(entry.print.id, entry);
    }
    this.index = buildIndex([...this.entries.values()]);
    debug('scan', this.entries.size, 'éléments,', this.collections.length, 'collections');
    return this;
  }

  /** Champs éditables d'un bloc répétable, indexés par clé relative. */
  fieldsIn(itemEl) {
    const map = new Map();
    const found = safe(() => scan({ ...this.scanOptions, nodes: [itemEl], visibleOnly: false }), [], 'fieldsIn');
    for (const entry of found) {
      map.set(fieldKey(itemEl, entry.el, entry.role), entry);
    }
    return map;
  }

  /**
   * Applique un instantané de contenu au DOM.
   * @returns {{applied:number, orphans:object[]}}
   */
  applySnapshot(snapshot) {
    const data = snapshot && typeof snapshot === 'object' ? snapshot : emptySnapshot();
    let applied = 0;

    // --- Contenu simple -----------------------------------------------
    const records = Object.entries(data.content || {}).map(([id, record]) => ({ id, ...record }));
    const { matched, orphans } = safe(() => resolveAll(records, this.index), { matched: new Map(), orphans: records }, 'resolveAll');

    this.orphans = new Map(orphans.map((record) => [record.id, record]));
    for (const record of records) {
      const hit = matched.get(record.id);
      if (!hit) continue;
      const entry = this.entryFor(hit.el, record.role);
      const id = entry ? entry.print.id : record.id;
      this.values.set(id, clone(record.value));
      this.meta.set(id, { ...record, resolvedVia: hit.via });
      if (safe(() => applyValue(hit.el, record.role, record.value), false, 'applyValue')) applied++;
    }

    // --- Blocs répétables ---------------------------------------------
    const usedCollections = new Set();
    for (const [id, record] of Object.entries(data.collections || {})) {
      const collection = matchCollection({ id, ...record }, this.collections, usedCollections);
      if (!collection) continue;
      usedCollections.add(collection.id);
      this.collectionState.set(collection.id, clone(record));
      safe(() => {
        const result = applyCollection(collection, record, (itemEl, fields) => {
          const fieldMap = this.fieldsIn(itemEl);
          for (const [key, value] of Object.entries(fields || {})) {
            const target = fieldMap.get(key);
            if (target && applyValue(target.el, target.role, value)) applied++;
          }
        });
        if (result.rebuilt) this.rebuilt = true;
      }, null, 'applyCollection');
    }

    if (this.rebuilt) {
      // La structure a changé : on réanalyse pour que l'éditeur travaille
      // sur les nœuds réellement présents.
      this.rebuilt = false;
      this.refresh();
    }

    debug('appliqué', applied, 'valeurs,', this.orphans.size, 'orphelins');
    return { applied, orphans: [...this.orphans.values()] };
  }

  /** Entrée correspondant à un élément DOM (après ré-appariement). */
  entryFor(el, role) {
    for (const entry of this.entries.values()) {
      if (entry.el === el && (!role || entry.role === role)) return entry;
    }
    return null;
  }

  /** Valeur courante d'un élément : surcharge enregistrée, sinon le HTML. */
  valueOf(id) {
    const entry = this.entries.get(id);
    if (!entry) return this.values.get(id) || null;
    return this.values.has(id) ? this.values.get(id) : clone(entry.value);
  }

  /** Valeur d'origine (celle écrite dans le HTML par le développeur). */
  originalOf(id) {
    const entry = this.entries.get(id);
    return entry ? clone(entry.value) : null;
  }

  /**
   * Écrit une valeur, l'applique au DOM et retourne l'ancienne valeur.
   * Une valeur identique à l'originale est retirée du contenu stocké : le
   * site reste alors piloté par son HTML.
   */
  set(id, value) {
    const entry = this.entries.get(id);
    if (!entry) return null;
    const previous = this.valueOf(id);
    const merged = { ...previous, ...value };
    if (equal(merged, entry.value)) this.values.delete(id);
    else this.values.set(id, merged);
    applyValue(entry.el, entry.role, merged);
    return previous;
  }

  /** État courant d'une collection (items du DOM si jamais modifiée). */
  collectionData(id) {
    const collection = this.collectionsById.get(id);
    if (!collection) return null;
    if (this.collectionState.has(id)) return this.collectionState.get(id);
    return readCollection(collection);
  }

  /** Applique une opération de bloc (dupliquer, déplacer, supprimer). */
  applyCollectionOp(id, op, ...args) {
    const collection = this.collectionsById.get(id);
    if (!collection || !ops[op]) return false;
    const data = clone(this.collectionData(id));
    const items = ops[op](data.items, ...args);
    if (items === data.items) return false;
    this.collectionState.set(id, { ...data, items });
    this.reapplyCollection(id);
    return true;
  }

  /** Écrit la valeur d'un champ à l'intérieur d'un bloc répétable. */
  setCollectionField(collectionId, itemIndex, key, value, el, role) {
    const data = clone(this.collectionData(collectionId));
    const item = data.items[itemIndex];
    if (!item) return false;
    item.fields = item.fields || {};
    item.fields[key] = { ...(item.fields[key] || {}), ...value };
    this.collectionState.set(collectionId, data);
    if (el) applyValue(el, role, item.fields[key]);
    return true;
  }

  /**
   * Rend une liste répétable à son état d'origine dans le code.
   * Utile quand le développeur a ajouté ou retiré un bloc dans le HTML : la
   * liste enregistrée par le client fait alors autorité, et il faut pouvoir
   * repartir de la version du code.
   */
  resetCollection(id) {
    return this.collectionState.delete(id);
  }

  reapplyCollection(id) {
    const collection = this.collectionsById.get(id);
    const data = this.collectionState.get(id);
    if (!collection || !data) return;
    safe(() => {
      applyCollection(collection, data, (itemEl, fields) => {
        const fieldMap = this.fieldsIn(itemEl);
        for (const [key, value] of Object.entries(fields || {})) {
          const target = fieldMap.get(key);
          if (target) applyValue(target.el, target.role, value);
        }
      });
    }, null, 'reapplyCollection');
    this.refresh();
  }

  /** Sérialise l'état courant pour l'enregistrement. */
  toSnapshot() {
    const content = {};
    for (const [id, value] of this.values) {
      const entry = this.entries.get(id);
      const meta = this.meta.get(id);
      const print = entry ? entry.print : meta;
      if (!print) continue;
      content[id] = {
        role: print.role,
        anchor: print.anchor,
        path: print.path,
        sig: print.sig,
        ch: print.ch,
        sample: print.sample || '',
        value: clone(value),
      };
    }

    const collections = {};
    for (const [id, data] of this.collectionState) {
      const collection = this.collectionsById.get(id);
      if (!collection) continue;
      collections[id] = {
        anchor: collection.print.anchor,
        path: collection.print.path,
        sig: collection.print.sig,
        itemSig: collection.itemSig,
        items: clone(data.items),
      };
    }

    return { v: SNAPSHOT_VERSION, content, collections };
  }

  /** Nombre de modifications par rapport au HTML d'origine. */
  get changeCount() {
    return this.values.size + this.collectionState.size;
  }
}

export { readCurrent };
