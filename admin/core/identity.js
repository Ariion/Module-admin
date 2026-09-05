/**
 * Identité des éléments éditables — le cœur du module.
 *
 * Contrainte : on ne modifie JAMAIS le HTML du site. L'identifiant d'un
 * élément est donc calculé à partir de sa position et de son contenu, pas
 * lu dans un attribut. Pour rester stable quand le développeur republie une
 * version légèrement modifiée du code, chaque enregistrement porte plusieurs
 * signaux, essayés en cascade à la relecture :
 *
 *   1. `id`      empreinte complète (ancre + chemin + rôle) — cas nominal
 *   2. `path`    même chemin, rôle identique — l'élément n'a pas bougé
 *   3. `ch`      hash du contenu d'origine — l'élément a bougé mais dit la
 *                même chose (paragraphe déplacé, section réordonnée)
 *   4. `sig`     même balise + mêmes classes, texte proche — dernier recours
 *
 * Ce qui échoue aux quatre est signalé comme « orphelin » dans l'éditeur, où
 * l'utilisateur peut le rebrancher sur un élément en un clic. Aucune donnée
 * n'est perdue silencieusement.
 *
 * Un développeur qui veut verrouiller un identifiant peut poser lui-même un
 * `data-admin-id="hero-titre"` : il devient prioritaire sur tout le reste.
 * C'est optionnel, jamais obligatoire.
 * @module core/identity
 */
import { hash, normText, similarity } from './util.js';
import { nthOfType, closestBy } from './dom.js';

/** Classes ignorées dans la signature : elles changent au gré des interactions. */
const VOLATILE_CLASS = /^(is-|has-|js-|has_|ea-|admin-|swiper|slick|owl|aos|wow|animate|fade|slide|active|open|show|hidden|current|selected|hover|sticky|scrolled|visible|in-view|lazy|loaded)/i;
/** Classes générées par un outil de build (hash) : instables entre deux déploiements. */
const HASHED_CLASS = /^[\w-]*[-_][a-f0-9]{5,}$/i;

const ATTR_ID = 'data-admin-id';
const ATTR_ANCHOR = 'data-admin-anchor';

/** Une classe est-elle assez stable pour entrer dans la signature ? */
function stableClass(name) {
  return name && !VOLATILE_CLASS.test(name) && !HASHED_CLASS.test(name);
}

/** Signature de forme : balise + classes stables triées. `h2.section-title` */
export function signature(el) {
  const classes = Array.from(el.classList).filter(stableClass).sort();
  return el.tagName.toLowerCase() + (classes.length ? '.' + classes.join('.') : '');
}

/** Un id HTML utilisable comme point d'ancrage (unique et non généré). */
function usableId(el) {
  const id = el.getAttribute && el.getAttribute('id');
  if (!id || HASHED_CLASS.test(id) || /^\d/.test(id)) return null;
  try {
    return el.ownerDocument.querySelectorAll('#' + CSS.escape(id)).length === 1 ? id : null;
  } catch {
    return null;
  }
}

/**
 * Point d'ancrage : le repère stable le plus proche à partir duquel on
 * calcule le chemin. Ancrer sur `#services` plutôt que sur `body` rend le
 * chemin insensible à tout ce qui change ailleurs dans la page.
 */
export function anchorOf(el) {
  const explicit = closestBy(el, (n) => n.hasAttribute && n.hasAttribute(ATTR_ANCHOR));
  if (explicit) return { node: explicit, key: '@' + explicit.getAttribute(ATTR_ANCHOR) };

  const withId = closestBy(el, (n) => !!usableId(n));
  if (withId) return { node: withId, key: '#' + usableId(withId) };

  const landmark = closestBy(el, (n) => ['MAIN', 'HEADER', 'FOOTER', 'NAV', 'ASIDE'].includes(n.tagName));
  if (landmark) return { node: landmark, key: '<' + landmark.tagName.toLowerCase() + nthOfType(landmark) };

  return { node: document.body, key: '<body' };
}

/** Chemin `section[2]>div[1]>h2[1]` entre une ancre et un descendant. */
export function pathBetween(anchor, el) {
  const parts = [];
  let node = el;
  while (node && node !== anchor && node !== document.documentElement) {
    parts.push(node.tagName.toLowerCase() + '[' + nthOfType(node) + ']');
    node = node.parentElement;
  }
  return parts.reverse().join('>');
}

/** Hash du contenu d'origine, utilisé pour retrouver un élément déplacé. */
export function contentHash(el, role) {
  if (role === 'image') {
    const src = el.getAttribute('src') || '';
    return hash(src.split('/').pop().split('?')[0] + '|' + (el.getAttribute('alt') || ''));
  }
  if (role === 'background') {
    return hash(String(el.style.backgroundImage || '').split('/').pop());
  }
  const text = normText(el.textContent).slice(0, 300);
  if (role === 'link') return hash(text + '|' + (el.getAttribute('href') || ''));
  return hash(text);
}

/**
 * Empreinte complète d'un élément pour un rôle donné.
 * @returns {{id:string, anchor:string, path:string, sig:string, ch:string, sample:string, role:string}}
 */
export function fingerprint(el, role) {
  const explicit = el.getAttribute(ATTR_ID);
  const anchor = anchorOf(el);
  const path = pathBetween(anchor.node, el);
  const sig = signature(el);
  const ch = contentHash(el, role);
  const id = explicit
    ? 'x_' + explicit
    : 'e_' + hash(anchor.key + '|' + path + '|' + role + '|' + sig);
  return {
    id,
    role,
    anchor: anchor.key,
    path: anchor.key + '|' + path,
    sig,
    ch,
    sample: (el.textContent || el.getAttribute('alt') || '').replace(/\s+/g, ' ').trim().slice(0, 80),
  };
}

/**
 * Index des empreintes présentes dans la page, pour la résolution inverse.
 * @param {Array<{el:Element, print:object}>} entries
 */
export function buildIndex(entries) {
  const byId = new Map();
  const byPath = new Map();
  const byHash = new Map();
  const bySig = new Map();

  const push = (map, key, entry) => {
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(entry);
  };

  for (const entry of entries) {
    const p = entry.print;
    byId.set(p.id, entry);
    push(byPath, p.role + '::' + p.path, entry);
    push(byHash, p.role + '::' + p.ch, entry);
    push(bySig, p.role + '::' + p.anchor + '::' + p.sig, entry);
  }
  return { byId, byPath, byHash, bySig, entries };
}

/**
 * Retrouve l'élément correspondant à un enregistrement stocké.
 * @returns {{el:Element, via:string, confidence:number}|null}
 */
export function resolve(record, index, used = new Set()) {
  const free = (entry) => entry && !used.has(entry.el);
  const role = record.role;

  // 1. Empreinte exacte.
  const exact = index.byId.get(record.id);
  if (free(exact)) return { el: exact.el, via: 'id', confidence: 1 };

  // 2. Même emplacement, même rôle : l'empreinte a bougé parce qu'une classe
  //    a changé, mais l'élément est bien celui-là.
  const samePath = (index.byPath.get(role + '::' + record.path) || []).filter(free);
  if (samePath.length === 1) return { el: samePath[0].el, via: 'path', confidence: 0.9 };

  // 3. Même contenu d'origine : l'élément a été déplacé dans la page.
  const sameHash = (index.byHash.get(role + '::' + record.ch) || []).filter(free);
  if (sameHash.length === 1) return { el: sameHash[0].el, via: 'content', confidence: 0.8 };

  // 4. Même forme dans la même section, texte le plus proche.
  const candidates = (index.bySig.get(role + '::' + record.anchor + '::' + record.sig) || []).filter(free);
  if (candidates.length) {
    let best = null;
    let bestScore = 0;
    for (const candidate of candidates) {
      const score = similarity(record.sample || '', candidate.print.sample || '');
      if (score > bestScore) { bestScore = score; best = candidate; }
    }
    if (best && bestScore >= 0.6) return { el: best.el, via: 'similarity', confidence: 0.5 + bestScore * 0.3 };
    if (candidates.length === 1 && samePath.length === 0) {
      return { el: candidates[0].el, via: 'signature', confidence: 0.5 };
    }
  }

  return null;
}

/**
 * Résout un lot d'enregistrements. Traite les correspondances sûres d'abord
 * pour qu'un appariement approximatif ne vole pas l'élément d'un autre.
 */
export function resolveAll(records, index) {
  const used = new Set();
  const matched = new Map();
  const orphans = [];

  const ordered = [...records].sort((a, b) => (a.id.startsWith('x_') ? -1 : 0) - (b.id.startsWith('x_') ? -1 : 0));

  for (const pass of ['strict', 'loose']) {
    for (const record of ordered) {
      if (matched.has(record.id)) continue;
      const hit = resolve(record, index, used);
      if (!hit) continue;
      if (pass === 'strict' && hit.confidence < 0.8) continue;
      used.add(hit.el);
      matched.set(record.id, hit);
    }
  }

  for (const record of ordered) {
    if (!matched.has(record.id)) orphans.push(record);
  }
  return { matched, orphans };
}
