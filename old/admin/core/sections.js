/**
 * Sections de page : ajouter, masquer, réordonner.
 *
 * Deux façons d'ajouter une section, complémentaires :
 *   - `widgets` — une section vide que l'on remplit de widgets (titre, texte,
 *     image, colonnes…). Les widgets émettent du HTML sémantique sans classes,
 *     donc la feuille de style du site s'y applique d'elle-même.
 *   - `copy` — une copie d'une section déjà présente dans la page, quand on
 *     veut reprendre une mise en page que le développeur a déjà écrite.
 *
 * Dans les deux cas la section ajoutée vit à côté du balisage du développeur,
 * jamais dedans — à une exception près, et elle est déclarée : un conteneur
 * portant `data-admin-zone` désigne l'endroit où le client peut composer
 * librement. Sur une page d'article, c'est le corps du texte : on veut
 * pouvoir y poser un intertitre ou une image, et y déplacer un bloc. Le
 * principe tient, puisque c'est le développeur qui ouvre la porte.
 *
 * Les opérations de structure sont appliquées APRÈS le contenu : les
 * empreintes des éléments sont calculées sur la page d'origine, donc insérer
 * ou masquer une section ne décale l'identité de rien.
 * @module core/sections
 */
import { hash, uid } from './util.js';
import { fingerprint, pathBetween, anchorOf } from './identity.js';
import { createWidget, renderWidget } from './widgets.js';
import { findTemplate } from './templates.js';

const IGNORE = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'LINK', 'BR'];

/**
 * Où vivent les sections.
 *
 * Le corps de la page par défaut. Si le développeur a marqué un conteneur
 * d'un `data-admin-zone`, c'est lui : les sections y sont listées, ajoutées
 * et réordonnées, et le reste de la page n'est plus manipulable.
 */
export function racineSections(doc = document) {
  return doc.querySelector('[data-admin-zone]') || doc.body;
}

/** Sections de premier niveau de la page, dans l'ordre du document. */
export function listSections(doc = document) {
  const sections = [];
  for (const el of Array.from(racineSections(doc).children)) {
    if (IGNORE.includes(el.tagName)) continue;
    if (el.hasAttribute('data-admin-ui')) continue;
    // Une section ajoutée est listée même vide : sans cela on ne pourrait ni
    // la déplacer ni la retirer tant qu'elle n'a pas de contenu.
    if (!el.hasAttribute('data-admin-section')
      && !el.textContent.trim() && !el.querySelector('img, svg')) continue;
    sections.push({ el, ref: refOf(el), label: labelOf(el) });
  }
  return sections;
}

/** Attribut portant la référence d'origine d'une section (voir applySections). */
const ATTR_REF = 'data-admin-ref';

/**
 * Référence stable d'une section.
 *
 * L'empreinte d'une section repose sur son rang parmi ses frères. Or dès
 * qu'une section est retirée ou ajoutée, les rangs suivants se décalent : une
 * référence calculée sur le DOM MODIFIÉ ne retrouverait plus rien sur le DOM
 * d'origine, où tout est réappliqué. Chaque section conserve donc sa référence
 * d'origine, posée avant toute modification.
 */
export function refOf(el) {
  const ajoutee = el.getAttribute('data-admin-section');
  if (ajoutee) return 'ins:' + ajoutee;
  const origine = el.getAttribute(ATTR_REF);
  if (origine) return origine;
  return fingerprint(el, 'section').id;
}

/** Chemin d'une section d'origine, pour la retrouver après republication. */
export function pathOf(el) {
  const ancre = anchorOf(el);
  return ancre.key + '|' + pathBetween(ancre.node, el);
}

/** Nom lisible d'une section, tel qu'affiché au client. */
export function labelOf(el) {
  const titre = el.querySelector('h1, h2, h3');
  if (titre && titre.textContent.trim()) {
    return titre.textContent.replace(/\s+/g, ' ').trim().slice(0, 42);
  }
  // Dans une zone de composition, une section est un bloc de texte et non un
  // pan de page : son nom de balise ne dit rien. On prend ses premiers mots,
  // qui sont ce que la personne reconnaît dans la page.
  const propre = el.textContent.replace(/\s+/g, ' ').trim();
  if (propre) return propre.slice(0, 42) + (propre.length > 42 ? '…' : '');
  if (el.querySelector('img')) {
    const img = el.querySelector('img');
    return img.getAttribute('alt')?.trim().slice(0, 42) || 'Image';
  }
  const nom = el.getAttribute('id') || Array.from(el.classList)[0];
  return nom || el.tagName.toLowerCase();
}

/** État vide. */
export function emptyState() {
  return { add: [], hide: [], order: [] };
}

/**
 * Applique les opérations de structure au document.
 *
 * @param {Document} doc
 * @param {{add:Array, hide:Array, order:Array}} state
 * @param {(el:Element, fields:object) => void} applyFields
 * @returns {{ajoutees:number, masquees:number}}
 */
export function applySections(doc, state, applyFields, contexte = {}) {
  const data = { ...emptyState(), ...(state || {}) };
  let ajoutees = 0;
  let masquees = 0;

  const parRef = new Map();
  for (const section of listSections(doc)) parRef.set(section.ref, section.el);

  // Chaque section porte sa référence d'ORIGINE, calculée avant toute
  // modification. Sans cela, une seconde suppression enregistrerait une
  // référence décalée par la première, et resterait sans effet.
  for (const [ref, el] of parRef) el.setAttribute(ATTR_REF, ref);

  // --- Ajouts ---------------------------------------------------------
  for (const record of data.add) {
    const el = record.kind === 'widgets'
      ? construireSectionWidgets(record, doc, contexte)
      : construireCopie(record, parRef);
    if (!el) continue;

    el.setAttribute('data-admin-section', record.key);

    // Sur une page déjà régénérée, la section est écrite dans le HTML : on la
    // remplace là où elle est, au lieu d'en ajouter une seconde à la suite.
    const existant = doc.querySelector(`[data-admin-section="${record.key}"]`);
    if (existant) {
      existant.replaceWith(el);
    } else {
      const racine = racineSections(doc);
      const apres = parRef.get(record.after) || parRef.get(record.from) || racine.lastElementChild;
      if (apres) apres.after(el); else racine.appendChild(el);
    }

    parRef.set('ins:' + record.key, el);
    if (record.kind !== 'widgets' && applyFields && record.fields) applyFields(el, record.fields);
    ajoutees++;
  }

  // --- Masquages ------------------------------------------------------
  for (const entree of data.hide) {
    const ref = typeof entree === 'string' ? entree : entree.ref;
    const el = parRef.get(ref);
    if (!el) continue;
    el.remove();
    parRef.delete(ref);
    masquees++;
  }

  // --- Ordre ----------------------------------------------------------
  if (data.order.length) {
    const connues = data.order.map((ref) => parRef.get(ref)).filter(Boolean);
    if (connues.length > 1) {
      const ancre = connues[0];
      let precedent = ancre;
      ancre.parentElement.insertBefore(ancre, ancre.parentElement.firstElementChild);
      for (const el of connues.slice(1)) {
        precedent.after(el);
        precedent = el;
      }
    }
  }

  return { ajoutees, masquees };
}

/** Copie d'une section existante de la page. */
function construireCopie(record, parRef) {
  const source = parRef.get(record.from);
  if (!source) return null;
  const copie = source.cloneNode(true);
  copie.removeAttribute('id'); // un id doit rester unique dans la page
  for (const el of copie.querySelectorAll('[id]')) el.removeAttribute('id');
  return copie;
}

/** Section construite à partir d'un arbre de widgets. */
function construireSectionWidgets(record, doc, contexte) {
  return renderWidget(record.tree, doc, contexte);
}

/** Clé d'un champ à l'intérieur d'une section ajoutée. */
export function sectionFieldKey(racine, el, role) {
  return 'f_' + hash(pathBetween(racine, el) + '|' + role);
}

/** Opérations exposées à l'éditeur. */
export const ops = {
  /** Ajoute une copie de `from`, placée juste après `after`. */
  add(state, from, after) {
    return {
      ...state,
      add: [...state.add, { kind: 'copy', key: uid('s'), from, after: after || from, fields: {} }],
    };
  },

  /** Ajoute une section vide, prête à recevoir des widgets. */
  addBlank(state, after, dansZone = false) {
    const tree = createWidget('section');
    // Dans une zone de composition, la section n'est qu'un contenant : la
    // largeur et les marges d'une section de pleine page y feraient un trou.
    if (dansZone) Object.assign(tree.props, { maxWidth: 2000, padding: 0 });
    const record = { kind: 'widgets', key: uid('s'), after, tree };
    return { ...state, add: [...state.add, record], lastKey: record.key };
  },

  /** Ajoute une section construite depuis un modèle. */
  addTemplate(state, id, after) {
    const modele = findTemplate(id);
    if (!modele) return state;
    const record = { kind: 'widgets', key: uid('s'), after, tree: modele.build() };
    return { ...state, add: [...state.add, record], lastKey: record.key };
  },
  hide(state, ref, label = '') {
    if (ref.startsWith('ins:')) {
      // Une section ajoutée se retire, elle ne se masque pas.
      return { ...state, add: state.add.filter((r) => 'ins:' + r.key !== ref) };
    }
    if (state.hide.some((e) => refDe(e) === ref)) return state;
    return { ...state, hide: [...state.hide, { ref, label }] };
  },
  show(state, ref) {
    return { ...state, hide: state.hide.filter((e) => refDe(e) !== ref) };
  },
  move(state, refs, from, to) {
    if (to < 0 || to >= refs.length || from === to) return state;
    const ordre = refs.slice();
    const [ref] = ordre.splice(from, 1);
    ordre.splice(to, 0, ref);
    return { ...state, order: ordre };
  },
};

/** Référence d'une entrée de masquage, quelle que soit sa forme. */
export function refDe(entree) {
  return typeof entree === 'string' ? entree : entree.ref;
}

/** Y a-t-il quoi que ce soit à appliquer ? */
export function isEmpty(state) {
  if (!state) return true;
  return !state.add?.length && !state.hide?.length && !state.order?.length;
}
