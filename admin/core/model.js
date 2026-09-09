/**
 * Modèle de page : fait le lien entre le DOM réel, les éléments détectés et
 * le contenu stocké. Utilisé tel quel par le runtime (lecture seule) et par
 * l'éditeur (lecture + écriture).
 * @module core/model
 */
import { scan } from './scanner.js';
import { buildIndex, resolveAll, fingerprint } from './identity.js';
import { detectCollections, readCollection, fieldKey, applyCollection, matchCollection, ops } from './collections.js';
import { applyValue, readCurrent, readStyle } from './binder.js';
import {
  listSections, applySections, emptyState as emptySections, isEmpty as sectionsEmpty,
  sectionFieldKey, ops as sectionOps,
} from './sections.js';
import { createWidget, renderWidget, findWidget, removeWidget, WIDGETS } from './widgets.js';
import { compileCustomCss, writeCustomSheet } from './style.js';
import { writeFontLink } from './fonts.js';
import { findPageTemplate } from './page-templates.js';
import { clone, equal, uid } from './util.js';
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
    this.doc = scanOptions.doc || document;
    /** @type {Map<string, {el:Element, role:string, print:object, value:object}>} */
    this.entries = new Map();
    /** @type {Array} collections détectées dans la page */
    this.collections = [];
    /** @type {Map<string, object>} valeurs actuelles (contenu surchargé) */
    this.values = new Map();
    this.reglages = null;
    this.pageMeta = null;
    /** @type {Map<string, object>} état des collections */
    this.collectionState = new Map();
    /** @type {Map<string, object>} métadonnées d'identité par id */
    this.meta = new Map();
    /** @type {Map<string, object>} enregistrements non rebranchés */
    this.orphans = new Map();
    /** @type {Map<string, object>} surcharges de style (couleurs, fond) */
    this.styles = new Map();
    /** @type {Map<string, {el:Element, print:object}>} cibles de style */
    this.styleTargets = new Map();
    /** @type {{add:Array, hide:Array, order:Array}} structure de la page */
    this.sections = emptySections();
    /** @type {Map<string, Element>} sections ajoutées, par clé */
    this.insertedSections = new Map();
    this.collectionsById = new Map();
  }

  /** Analyse la page. À rejouer après une reconstruction de collection. */
  refresh() {
    this.collections = safe(() => detectCollections(this.scanOptions), [], 'detectCollections');

    // Ce qui vit dans une section ajoutée est piloté par cette section : ces
    // éléments n'existent pas dans le code du site, ils ne peuvent donc pas
    // être adressés par une empreinte calculée sur lui.
    this.insertedSections = new Map();
    const inInserted = new Set();
    for (const el of this.doc.querySelectorAll('[data-admin-section]')) {
      this.insertedSections.set(el.getAttribute('data-admin-section'), el);
      inInserted.add(el);
      for (const noeud of el.querySelectorAll('*')) inInserted.add(noeud);
    }

    const inCollection = new Set();
    for (const collection of this.collections) {
      for (const item of collection.items) {
        inCollection.add(item);
        for (const node of item.querySelectorAll('*')) inCollection.add(node);
      }
    }

    this.collections = this.collections.filter((c) => !inInserted.has(c.container));
    this.collectionsById = new Map(this.collections.map((c) => [c.id, c]));

    const entries = safe(() => scan(this.scanOptions), [], 'scan');
    this.entries = new Map();
    for (const entry of entries) {
      // Ce qui vit dans un bloc répétable est géré par la collection.
      if (inCollection.has(entry.el)) continue;
      if (inInserted.has(entry.el)) continue;
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
  applySnapshot(snapshot, options = {}) {
    const data = snapshot && typeof snapshot === 'object' ? snapshot : emptySnapshot();
    let applied = 0;
    // Deux instantanés se succèdent (le commun, puis la page) : le second ne
    // doit pas effacer les orphelins signalés par le premier.
    const orphelinsPrecedents = options.cumuler ? [...this.orphans] : [];

    // --- Contenu simple -----------------------------------------------
    const records = Object.entries(data.content || {}).map(([id, record]) => ({ id, ...record }));
    const { matched, orphans } = safe(() => resolveAll(records, this.index), { matched: new Map(), orphans: records }, 'resolveAll');

    this.orphans = new Map([...orphelinsPrecedents, ...orphans.map((record) => [record.id, record])]);
    for (const record of records) {
      const hit = matched.get(record.id);
      if (!hit) continue;

      // Les surcharges de style visent des éléments que la détection de
      // contenu ne remonte pas (une section, un conteneur) : elles ont leur
      // propre registre.
      if (record.role === 'style') {
        const cible = this.styleTarget(hit.el);
        this.styles.set(cible.print.id, clone(record.value));
        if (safe(() => applyValue(hit.el, 'style', record.value), false, 'applyStyle')) applied++;
        continue;
      }

      const entry = this.entryFor(hit.el, record.role);
      const id = entry ? entry.print.id : record.id;
      this.values.set(id, clone(record.value));
      this.meta.set(id, { ...record, resolvedVia: hit.via });
      if (safe(() => applyValue(hit.el, record.role, record.value), false, 'applyValue')) applied++;
    }

    if (data.meta && typeof data.meta === 'object') {
      this.pageMeta = { ...(this.pageMeta || {}), ...clone(data.meta) };
      safe(() => appliquerMeta(this.doc, this.pageMeta), false, 'meta');
    }

    if (data.reglages && typeof data.reglages === 'object') {
      this.reglages = { ...(this.reglages || {}), ...clone(data.reglages) };
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

    // --- Structure de la page ------------------------------------------
    // Appliquée en dernier : les empreintes du contenu ont été calculées sur
    // la page d'origine, donc ajouter ou masquer une section ne décale
    // l'identité de rien.
    if (data.sections && !sectionsEmpty(data.sections)) {
      this.sections = clone(data.sections);
      safe(() => {
        const bilan = applySections(this.doc, this.sections, (racine, champs) => {
          this.applySectionFields(racine, champs);
        }, this.contexteWidgets());
        applied += bilan.ajoutees + bilan.masquees;
      }, null, 'applySections');
      this.rebuilt = true;
    }

    if (this.rebuilt) {
      // La structure a changé : on réanalyse pour que l'éditeur travaille
      // sur les nœuds réellement présents.
      this.rebuilt = false;
      this.refresh();
    }

    this.refreshCustomCss();
    this.refreshFonts();
    debug('appliqué', applied, 'valeurs,', this.orphans.size, 'orphelins');
    return { applied, orphans: [...this.orphans.values()] };
  }

  /** Champs éditables d'une section ajoutée, indexés par clé relative. */
  sectionFieldsIn(racine) {
    const map = new Map();
    const trouves = safe(() => scan({ ...this.scanOptions, nodes: [racine], visibleOnly: false }), [], 'sectionFields');
    for (const entry of trouves) map.set(sectionFieldKey(racine, entry.el, entry.role), entry);
    return map;
  }

  applySectionFields(racine, champs) {
    const map = this.sectionFieldsIn(racine);
    for (const [cle, valeur] of Object.entries(champs || {})) {
      const cible = map.get(cle);
      if (cible) applyValue(cible.el, cible.role, valeur);
    }
  }

  /** Sections de premier niveau, telles qu'affichées. */
  sectionList() {
    return safe(() => listSections(this.doc), [], 'listSections');
  }

  /** Applique une opération de structure et réapplique la page. */
  sectionOp(op, ...args) {
    if (!sectionOps[op]) return false;
    const suivant = op === 'move'
      ? sectionOps.move(this.sections, this.sectionList().map((s) => s.ref), ...args)
      : sectionOps[op](this.sections, ...args);
    if (suivant === this.sections) return false;
    this.sections = suivant;
    return true;
  }

  // ---------------------------------------------------------- widgets
  /** Sections ajoutées qui sont construites avec des widgets. */
  widgetSections() {
    return this.sections.add.filter((r) => r.kind === 'widgets');
  }

  /** Retrouve un widget par sa clé, dans n'importe quelle section ajoutée. */
  findWidgetNode(key) {
    for (const record of this.widgetSections()) {
      if (record.tree.key === key) return { record, noeud: record.tree, liste: [record.tree] };
      const trouve = findWidget(record.tree.children || [], key);
      if (trouve) return { record, ...trouve };
    }
    return null;
  }

  /** Section ajoutée à laquelle appartient un widget. */
  sectionOfWidget(key) {
    return this.findWidgetNode(key)?.record || null;
  }

  /** Ajoute une section vide, prête à recevoir des widgets. */
  addBlankSection(afterRef) {
    this.sections = sectionOps.addBlank(this.sections, afterRef);
    return this.sections.lastKey;
  }

  /**
   * Pose la trame d'une page entière.
   * @param {string} id
   * @param {boolean} remplacer masquer les sections existantes du site
   */
  applyPageTemplate(id, remplacer) {
    const modele = findPageTemplate(id);
    return modele ? this.applyTrees(modele.build(), remplacer) : false;
  }

  /**
   * Pose une suite de sections composées ailleurs (modèle de page, assistant
   * de démarrage). En mode remplacement, les sections du site sont masquées
   * — jamais supprimées : elles restent récupérables depuis la Structure.
   * @param {object[]} trees arbres de widgets, un par section
   * @param {boolean} remplacer
   */
  applyTrees(trees, remplacer) {
    if (!Array.isArray(trees) || !trees.length) return false;

    if (remplacer) {
      for (const section of this.sectionList()) {
        if (section.ref.startsWith('ins:')) continue;
        this.sections = sectionOps.hide(this.sections, section.ref, section.label);
      }
    }

    // Chaque section vient après la précédente : la trame garde son ordre.
    let apres = remplacer ? null : (this.sectionList().slice(-1)[0]?.ref || null);
    for (const tree of trees) {
      const record = { kind: 'widgets', key: uid('s'), after: apres, tree };
      this.sections = { ...this.sections, add: [...this.sections.add, record] };
      apres = 'ins:' + record.key;
    }
    return true;
  }

  /** Ajoute une section construite depuis un modèle. */
  addTemplateSection(id, afterRef) {
    const avant = this.sections;
    this.sections = sectionOps.addTemplate(this.sections, id, afterRef);
    return this.sections === avant ? null : this.sections.lastKey;
  }

  /**
   * Insère un widget dans un conteneur.
   * @param {string} type      type de widget
   * @param {string} parentKey clé du conteneur (section, colonnes, colonne)
   * @param {number} index     position, -1 pour la fin
   */
  /**
   * Ce dont certains widgets ont besoin en plus de leurs réglages : le
   * catalogue du site, et la façon de vendre.
   */
  contexteWidgets() {
    return {
      produits: this.reglages?.produits || [],
      boutique: this.reglages?.boutique || {},
    };
  }

  /** Entrées de menu déduites des pages connues du site. */
  liensDesPages() {
    return (this.reglages?.pages || [])
      .map((page) => `${page.label || page.path} | ${page.path}`)
      .join('\n');
  }

  insertWidget(type, parentKey, index = -1) {
    const cible = this.findWidgetNode(parentKey);
    if (!cible || !cible.noeud.children) return null;
    const def = WIDGETS[type];
    if (!def) return null;

    const noeud = createWidget(type);
    // Un menu inséré sur un site qu'on construit part des pages connues :
    // le client n'a pas à retaper ce que le module sait déjà.
    if (type === 'menu' && !noeud.props.liens) noeud.props.liens = this.liensDesPages();
    const liste = cible.noeud.children;
    if (index < 0 || index >= liste.length) liste.push(noeud);
    else liste.splice(index, 0, noeud);

    this.rerenderSection(cible.record.key);
    return noeud.key;
  }

  removeWidgetNode(key) {
    const cible = this.findWidgetNode(key);
    if (!cible) return false;
    // Retirer la racine, c'est retirer la section entière.
    if (cible.record.tree.key === key) {
      this.sections = { ...this.sections, add: this.sections.add.filter((r) => r.key !== cible.record.key) };
      const el = this.doc.querySelector(`[data-admin-section="${cible.record.key}"]`);
      if (el) el.remove();
      return true;
    }
    if (!removeWidget(cible.record.tree.children || [], key)) return false;
    this.rerenderSection(cible.record.key);
    return true;
  }

  moveWidgetNode(key, delta) {
    const cible = this.findWidgetNode(key);
    if (!cible || cible.record.tree.key === key) return false;
    const liste = cible.liste;
    const index = liste.findIndex((n) => n.key === key);
    const vers = index + delta;
    if (index < 0 || vers < 0 || vers >= liste.length) return false;
    const [noeud] = liste.splice(index, 1);
    liste.splice(vers, 0, noeud);
    this.rerenderSection(cible.record.key);
    return true;
  }

  setWidgetProps(key, patch) {
    const cible = this.findWidgetNode(key);
    if (!cible) return false;
    // L'habillage est un sous-objet : on le fusionne au lieu de l'écraser.
    const style = patch.style ? { ...(cible.noeud.props.style || {}), ...patch.style } : cible.noeud.props.style;
    cible.noeud.props = { ...cible.noeud.props, ...patch, ...(style ? { style } : {}) };

    // Changer le nombre de colonnes ajoute ou retire des colonnes, sans
    // perdre le contenu de celles qui restent.
    if (cible.noeud.type === 'columns' && patch.count != null) {
      const voulu = Math.max(1, Math.min(4, Number(patch.count) || 2));
      const enfants = cible.noeud.children || [];
      while (enfants.length < voulu) enfants.push(createWidget('column'));
      while (enfants.length > voulu) enfants.pop();
      cible.noeud.children = enfants;
    }

    this.rerenderSection(cible.record.key);
    this.refreshCustomCss();
    this.refreshFonts();
    return true;
  }

  /** Redessine une section ajoutée après modification de son arbre. */
  rerenderSection(sectionKey) {
    const record = this.sections.add.find((r) => r.key === sectionKey);
    if (!record || record.kind !== 'widgets') return false;
    const ancien = this.doc.querySelector(`[data-admin-section="${sectionKey}"]`);
    if (!ancien) return false;
    const neuf = renderWidget(record.tree, this.doc, this.contexteWidgets());
    if (!neuf) return false;
    neuf.setAttribute('data-admin-section', sectionKey);
    ancien.replaceWith(neuf);
    this.refresh();
    return true;
  }

  /** Écrit la valeur d'un champ d'une section ajoutée. */
  setSectionField(key, fieldKey, value, el, role) {
    const record = this.sections.add.find((r) => r.key === key);
    if (!record) return false;
    record.fields = record.fields || {};
    record.fields[fieldKey] = { ...(record.fields[fieldKey] || {}), ...value };
    if (el) applyValue(el, role, record.fields[fieldKey]);
    return true;
  }

  /**
   * Réunit les CSS personnalisés de la page dans une feuille unique.
   * Une règle a besoin d'un sélecteur — pour un `:hover` par exemple — donc
   * elle ne peut pas vivre en style en ligne comme le reste.
   */
  refreshCustomCss() {
    const morceaux = [];
    for (const valeur of this.styles.values()) {
      if (valeur.customCss) morceaux.push(compileCustomCss(valeur.customCss));
    }
    const parcourir = (noeuds) => {
      for (const noeud of noeuds || []) {
        const perso = noeud.props?.style?.customCss;
        if (perso) morceaux.push(compileCustomCss(perso));
        if (noeud.children) parcourir(noeud.children);
      }
    };
    for (const record of this.widgetSections()) parcourir([record.tree]);
    safe(() => writeCustomSheet(this.doc, morceaux), null, 'customCss');
  }

  /**
   * Charge les polices réellement employées dans la page. La balise produite
   * est conservée à la régénération du HTML : le site garde ses polices même
   * une fois le module retiré.
   */
  refreshFonts() {
    const noms = [];
    for (const valeur of this.styles.values()) {
      if (valeur.fontFamily) noms.push(valeur.fontFamily);
    }
    const parcourir = (noeuds) => {
      for (const noeud of noeuds || []) {
        const police = noeud.props?.style?.fontFamily;
        if (police) noms.push(police);
        if (noeud.children) parcourir(noeud.children);
      }
    };
    for (const record of this.widgetSections()) parcourir([record.tree]);
    safe(() => writeFontLink(this.doc, noms), null, 'fonts');
  }

  /** Déclare un élément comme cible de style et retourne son empreinte. */
  styleTarget(el) {
    for (const cible of this.styleTargets.values()) {
      if (cible.el === el) return cible;
    }
    const cible = { el, role: 'style', print: fingerprint(el, 'style') };
    this.styleTargets.set(cible.print.id, cible);
    return cible;
  }

  /** Style courant d'un élément : surcharge enregistrée, sinon le CSS du site. */
  styleOf(el) {
    const cible = this.styleTarget(el);
    return { ...readStyle(el), ...(this.styles.get(cible.print.id) || {}) };
  }

  /** Écrit une surcharge de style et l'applique. */
  setStyle(el, patch) {
    const cible = this.styleTarget(el);
    const courant = this.styles.get(cible.print.id) || {};
    const fusion = { ...courant, ...patch };
    // Une valeur vide n'est pas une surcharge : on rend la main au CSS.
    for (const [cle, valeur] of Object.entries(fusion)) {
      if ((valeur === '' || valeur == null) && cle !== 'customCss') delete fusion[cle];
    }
    if (Object.keys(fusion).length) this.styles.set(cible.print.id, fusion);
    else this.styles.delete(cible.print.id);
    applyValue(el, 'style', { ...patch });
    if ('customCss' in patch) this.refreshCustomCss();
    if ('fontFamily' in patch) this.refreshFonts();
    return fusion;
  }

  /** Retire toute surcharge de style d'un élément. */
  clearStyle(el) {
    const cible = this.styleTarget(el);
    this.styles.delete(cible.print.id);
    applyValue(el, 'style', { color: '', background: '', backgroundImage: '' });
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

  /**
   * Réglages du site, conservés dans le document commun : ils ne dépendent
   * d'aucune page. Aujourd'hui, les réponses au questionnaire légal.
   */
  setPageMeta(patch) {
    this.pageMeta = { ...(this.pageMeta || {}), ...patch };
    appliquerMeta(this.doc, this.pageMeta);
  }

  /** Valeurs actuelles, lues dans la page si rien n'a été enregistré. */
  pageMetaCourant() {
    const description = this.doc.querySelector('meta[name="description"]');
    return {
      titre: this.pageMeta?.titre ?? (this.doc.title || ''),
      description: this.pageMeta?.description ?? (description?.getAttribute('content') || ''),
    };
  }

  setReglage(cle, valeur) {
    this.reglages = { ...(this.reglages || {}), [cle]: clone(valeur) };
  }

  /**
   * Zone commune à laquelle appartient un élément, s'il y en a une.
   *
   * Sur un site codé à la main, l'en-tête et le pied de page sont recopiés
   * dans chaque fichier. Sans traitement particulier, un client qui corrige
   * son téléphone dans le pied de page ne le corrigerait que sur la page
   * ouverte. Ce qui vit dans ces zones est donc enregistré à part, dans un
   * document commun appliqué à toutes les pages.
   *
   * @returns {'entete'|'pied'|null}
   */
  zoneDe(el) {
    const zone = el?.closest?.(ZONES_COMMUNES);
    if (!zone) return null;
    const signes = [zone.tagName, zone.className, zone.id, zone.getAttribute('role') || ''].join(' ');
    return /footer|contentinfo|pied|bas-de-page/i.test(signes) ? 'pied' : 'entete';
  }

  /**
   * Sérialise l'état courant pour l'enregistrement.
   * @param {{portee?:'page'|'commun'}} options `page` exclut l'en-tête et le
   *   pied, `commun` ne garde qu'eux. Sans portée, tout est sérialisé.
   */
  toSnapshot(options = {}) {
    const portee = options.portee || null;
    // Un enregistrement dont on ne retrouve pas l'élément reste au format
    // page : c'est là qu'il a été écrit, et le perdre serait pire.
    const garder = (el) => {
      if (!portee) return true;
      const commun = !!(el && this.zoneDe(el));
      return portee === 'commun' ? commun : !commun;
    };

    const content = {};
    for (const [id, value] of this.values) {
      const entry = this.entries.get(id);
      const meta = this.meta.get(id);
      const print = entry ? entry.print : meta;
      if (!print) continue;
      if (!garder(entry?.el)) continue;
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

    for (const [id, value] of this.styles) {
      const cible = this.styleTargets.get(id);
      if (!cible) continue;
      if (!garder(cible.el)) continue;
      content[id] = {
        role: 'style',
        anchor: cible.print.anchor,
        path: cible.print.path,
        sig: cible.print.sig,
        ch: cible.print.ch,
        sample: cible.print.sample || '',
        value: clone(value),
      };
    }

    const collections = {};
    for (const [id, data] of this.collectionState) {
      const collection = this.collectionsById.get(id);
      if (!collection) continue;
      if (!garder(collection.container)) continue;
      collections[id] = {
        anchor: collection.print.anchor,
        path: collection.print.path,
        sig: collection.print.sig,
        itemSig: collection.itemSig,
        items: clone(data.items),
      };
    }

    const instantane = { v: SNAPSHOT_VERSION, content, collections };
    // Ajouter ou masquer une section vaut pour la page ouverte, jamais pour
    // toutes : la structure ne fait pas partie du commun.
    if (portee !== 'commun' && !sectionsEmpty(this.sections)) instantane.sections = clone(this.sections);
    // Les réglages du site voyagent avec le document commun.
    if (portee !== 'page' && this.reglages) instantane.reglages = clone(this.reglages);
    // Le titre et la description appartiennent à la page, eux.
    if (portee !== 'commun' && this.pageMeta) instantane.meta = clone(this.pageMeta);
    return instantane;
  }

  /** Nombre de modifications par rapport au HTML d'origine. */
  get changeCount() {
    const structure = this.sections.add.length + this.sections.hide.length
      + (this.sections.order.length ? 1 : 0);
    return this.values.size + this.collectionState.size + this.styles.size + structure;
  }
}

/**
 * Écrit le titre et la description dans l'en-tête du document. Ces deux-là
 * vivent hors du `<body>`, donc hors de portée de la détection de contenu,
 * mais ils comptent autant que le reste : sans eux, toutes les pages créées
 * depuis un même modèle portent le même titre.
 */
function appliquerMeta(doc, meta) {
  let change = false;
  if (typeof meta?.titre === 'string' && meta.titre && doc.title !== meta.titre) {
    doc.title = meta.titre;
    change = true;
  }
  if (typeof meta?.description === 'string') {
    let balise = doc.querySelector('meta[name="description"]');
    if (!balise && meta.description) {
      balise = doc.createElement('meta');
      balise.setAttribute('name', 'description');
      doc.head.appendChild(balise);
    }
    if (balise && balise.getAttribute('content') !== meta.description) {
      balise.setAttribute('content', meta.description);
      change = true;
    }
  }
  return change;
}

/**
 * Ce qui compte comme en-tête ou pied de page. On reste sur des repères que
 * tout le monde écrit : la balise, le rôle ARIA, ou une classe évidente.
 */
const ZONES_COMMUNES = [
  'header', 'footer',
  '[role="banner"]', '[role="contentinfo"]',
  '.site-header', '.site-footer', '.header', '.footer',
  '#header', '#footer', '#site-header', '#site-footer',
].join(',');

export { readCurrent };
