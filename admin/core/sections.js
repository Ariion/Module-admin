/**
 * Sections de page : ajouter, masquer, réordonner.
 *
 * Choix de conception important. Un éditeur du type Elementor propose une
 * bibliothèque de blocs génériques, parce qu'il possède le design du site.
 * Ici c'est le développeur qui le possède : un bloc générique jurerait avec
 * tout site écrit à la main. La bibliothèque est donc constituée des SECTIONS
 * DÉJÀ PRÉSENTES dans la page — ajouter une section, c'est en dupliquer une
 * existante. Le rendu reste celui du développeur, quoi que fasse le client.
 *
 * Les opérations de structure sont appliquées APRÈS le contenu : les
 * empreintes des éléments sont calculées sur la page d'origine, donc insérer
 * ou masquer une section ne décale l'identité de rien.
 * @module core/sections
 */
import { hash, uid } from './util.js';
import { fingerprint, pathBetween, anchorOf } from './identity.js';

const IGNORE = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'LINK', 'BR'];

/** Sections de premier niveau de la page, dans l'ordre du document. */
export function listSections(doc = document) {
  const sections = [];
  for (const el of Array.from(doc.body.children)) {
    if (IGNORE.includes(el.tagName)) continue;
    if (el.hasAttribute('data-admin-ui')) continue;
    if (!el.textContent.trim() && !el.querySelector('img, svg')) continue;
    sections.push({ el, ref: refOf(el), label: labelOf(el) });
  }
  return sections;
}

/** Référence stable d'une section : son empreinte, ou sa clé si elle est ajoutée. */
export function refOf(el) {
  const ajoutee = el.getAttribute('data-admin-section');
  if (ajoutee) return 'ins:' + ajoutee;
  const print = fingerprint(el, 'section');
  return print.id;
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
export function applySections(doc, state, applyFields) {
  const data = { ...emptyState(), ...(state || {}) };
  let ajoutees = 0;
  let masquees = 0;

  const parRef = new Map();
  for (const section of listSections(doc)) parRef.set(section.ref, section.el);

  // --- Ajouts ---------------------------------------------------------
  for (const record of data.add) {
    const source = parRef.get(record.from);
    if (!source) continue;

    const copie = source.cloneNode(true);
    copie.setAttribute('data-admin-section', record.key);
    copie.removeAttribute('id'); // un id doit rester unique dans la page

    const apres = parRef.get(record.after) || source;
    apres.after(copie);

    parRef.set('ins:' + record.key, copie);
    if (applyFields && record.fields) applyFields(copie, record.fields);
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

/** Clé d'un champ à l'intérieur d'une section ajoutée. */
export function sectionFieldKey(racine, el, role) {
  return 'f_' + hash(pathBetween(racine, el) + '|' + role);
}

/** Opérations exposées à l'éditeur. */
export const ops = {
  /** Ajoute une copie de `from`, placée juste après `after`. */
  add(state, from, after) {
    const suivant = { ...state, add: [...state.add, { key: uid('s'), from, after: after || from, fields: {} }] };
    return suivant;
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
