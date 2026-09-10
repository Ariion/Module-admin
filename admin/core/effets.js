/**
 * Bibliothèque d'effets : survol, clic, apparition.
 *
 * Trois familles, et elles ne posent pas les mêmes problèmes :
 *
 *   - **survol** et **clic** sont du CSS pur. Ils marchent sans JavaScript,
 *     survivent à la régénération du HTML, et continuent de fonctionner si le
 *     module est retiré du site.
 *
 *   - **apparition** demande de savoir quand un bloc entre dans l'écran, donc
 *     du JavaScript. C'est le seul endroit du module où une animation pourrait
 *     laisser un bloc INVISIBLE si le script ne tourne pas. L'état de départ
 *     est donc conditionné à un attribut que seul le module pose sur `<html>` :
 *     pas de module, pas d'attribut, rien n'est masqué. Un site dont on retire
 *     le module perd ses apparitions et garde tout son contenu.
 *
 * Le mouvement est aussi une question de confort : tout est enveloppé dans
 * `prefers-reduced-motion`, le réglage système de qui ne supporte pas les
 * animations.
 *
 * @module core/effets
 */

/** Identifiant de la feuille de style des effets. */
export const EFFETS_STYLE_ID = 'admin-effets';

/** Classe posée sur un bloc qui s'anime à l'apparition. */
export const CLASSE_ANIMEE = 'admin-anim';

/** Attribut posé sur `<html>` quand le module peut animer. */
export const MARQUE_ANIME = 'data-admin-anime';

const PREFIXE = 'admin-e-';

/** Durées proposées, en millisecondes. */
export const DUREES = [150, 250, 400, 700];

/**
 * Effets au survol. Chacun rend les déclarations de l'état survolé, et
 * éventuellement des règles sur l'état de repos.
 */
export const SURVOL = {
  elever: {
    repos: 'transition: transform var(--d) ease, box-shadow var(--d) ease;',
    actif: 'transform: translateY(-6px); box-shadow: 0 14px 30px rgba(0,0,0,.18);',
  },
  agrandir: {
    repos: 'transition: transform var(--d) ease;',
    actif: 'transform: scale(1.04);',
  },
  retrecir: {
    repos: 'transition: transform var(--d) ease;',
    actif: 'transform: scale(.97);',
  },
  eclaircir: {
    repos: 'transition: filter var(--d) ease;',
    actif: 'filter: brightness(1.14);',
  },
  assombrir: {
    repos: 'transition: filter var(--d) ease;',
    actif: 'filter: brightness(.86);',
  },
  contour: {
    repos: 'transition: box-shadow var(--d) ease;',
    actif: 'box-shadow: 0 0 0 2px currentColor;',
  },
  pencher: {
    repos: 'transition: transform var(--d) ease;',
    actif: 'transform: rotate(-1.5deg);',
  },
  // Le bloc rogne, l'image grandit dedans : c'est l'effet des cartes qu'on
  // voit partout, et il demande deux règles au lieu d'une.
  zoomImage: {
    repos: 'overflow: hidden;',
    interne: { cible: 'img', repos: 'transition: transform var(--d) ease;', actif: 'transform: scale(1.08);' },
  },
  // Un trait qui se déploie sous le texte. Sur un lien, c'est le seul effet
  // qui se lit comme une invitation à cliquer.
  souligner: {
    repos: 'position: relative;',
    pseudo: {
      repos: 'content: ""; position: absolute; left: 0; right: 0; bottom: -2px;'
        + ' height: 1.5px; background: currentColor;'
        + ' transform: scaleX(0); transform-origin: left;'
        + ' transition: transform var(--d) ease;',
      actif: 'transform: scaleX(1);',
    },
  },
};

/** Effets au clic (état enfoncé). */
export const CLIC = {
  enfoncer: { actif: 'transition: transform 90ms ease; transform: scale(.96);' },
  creuser: {
    actif: 'transition: transform 90ms ease, filter 90ms ease;'
      + ' transform: translateY(2px); filter: brightness(.92);',
  },
  eclair: { actif: 'transition: filter 90ms ease; filter: brightness(1.25);' },
};

/** Effets à l'apparition : état de départ, l'arrivée étant toujours neutre. */
export const ENTREE = {
  fondu: 'opacity: 0;',
  monter: 'opacity: 0; transform: translateY(26px);',
  descendre: 'opacity: 0; transform: translateY(-26px);',
  glisserGauche: 'opacity: 0; transform: translateX(-34px);',
  glisserDroite: 'opacity: 0; transform: translateX(34px);',
  zoom: 'opacity: 0; transform: scale(.94);',
};

/** Les listes proposées dans le panneau. */
export const CATALOGUE = {
  survol: ['', ...Object.keys(SURVOL)],
  clic: ['', ...Object.keys(CLIC)],
  entree: ['', ...Object.keys(ENTREE)],
};

/** Un effet est-il demandé quelque part dans cet habillage ? */
export function aDesEffets(style) {
  return !!(style && (SURVOL[style.survol] || CLIC[style.clic] || ENTREE[style.entree]));
}

/** Empreinte courte et stable d'un texte : sert de nom de classe. */
function empreinte(texte) {
  let h = 5381;
  for (let i = 0; i < texte.length; i += 1) h = ((h << 5) + h + texte.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** La signature d'un habillage : deux blocs identiques partagent leur classe. */
function signature(style) {
  return [style.survol || '', style.clic || '', style.entree || '', duree(style)].join('|');
}

function duree(style) {
  const v = Number(style?.dureeEffet);
  return DUREES.includes(v) ? v : 250;
}

/** Nom de classe des effets d'un bloc, ou null s'il n'en a aucun. */
export function classeDesEffets(style) {
  if (!aDesEffets(style)) return null;
  return PREFIXE + empreinte(signature(style));
}

/**
 * Les règles CSS d'un habillage, portant sur sa classe.
 * @param {object} style
 * @returns {string} CSS, ou '' si aucun effet
 */
export function cssDesEffets(style) {
  const classe = classeDesEffets(style);
  if (!classe) return '';
  const sel = '.' + classe;
  const d = duree(style) + 'ms';
  // Les déclarations sont rassemblées PAR SÉLECTEUR avant d'être écrites :
  // deux effets sur le même bloc — s'élever au survol, s'enfoncer au clic —
  // posent chacun leur `transition`, et la seconde effacerait la première.
  const parSelecteur = new Map();
  const poser = (selecteur, decl) => {
    if (!decl) return;
    const liste = parSelecteur.get(selecteur) || [];
    liste.push(decl.replace(/var\(--d\)/g, d));
    parSelecteur.set(selecteur, liste);
  };

  const regles = [];

  const survol = SURVOL[style.survol];
  if (survol) {
    poser(sel, survol.repos);
    poser(`${sel}:hover`, survol.actif);
    if (survol.interne) {
      poser(`${sel} ${survol.interne.cible}`, survol.interne.repos);
      poser(`${sel}:hover ${survol.interne.cible}`, survol.interne.actif);
    }
    if (survol.pseudo) {
      poser(`${sel}::after`, survol.pseudo.repos);
      poser(`${sel}:hover::after`, survol.pseudo.actif);
    }
  }

  const clic = CLIC[style.clic];
  if (clic) poser(`${sel}:active`, clic.actif);

  const entree = ENTREE[style.entree];
  if (entree) {
    // L'état de départ n'existe QUE si le module a posé sa marque, et que le
    // visiteur n'a pas demandé moins d'animations. Sans l'un ou l'autre, le
    // bloc reste simplement visible.
    regles.push('@media (prefers-reduced-motion: no-preference) {');
    regles.push(`  html[${MARQUE_ANIME}] ${sel} { ${entree} }`);
    regles.push(`  ${sel} { transition: opacity ${d} ease, transform ${d} ease; }`);
    regles.push(`  html[${MARQUE_ANIME}] ${sel}[data-admin-vu] { opacity: 1; transform: none; }`);
    regles.push('}');
  }

  // Les règles d'écran des apparitions ont déjà été écrites telles quelles :
  // on ajoute maintenant celles qu'on a rassemblées.
  const assemblees = [];
  for (const [selecteur, liste] of parSelecteur) {
    assemblees.push(`${selecteur} { ${fusionnerDeclarations(liste)} }`);
  }
  return [...assemblees, ...regles].join('\n');
}

/**
 * Réunit des déclarations en une seule.
 *
 * `transition` est le seul cas particulier, et il compte : c'est une
 * propriété qui s'additionne — deux animations, deux transitions — alors que
 * la simple concaténation ferait gagner la dernière.
 */
function fusionnerDeclarations(liste) {
  const transitions = [];
  const autres = [];
  for (const bloc of liste) {
    for (const decl of bloc.split(';')) {
      const propre = decl.trim();
      if (!propre) continue;
      if (/^transition\s*:/i.test(propre)) transitions.push(propre.replace(/^transition\s*:/i, '').trim());
      else autres.push(propre);
    }
  }
  const morceaux = [...autres];
  if (transitions.length) {
    const vues = new Set();
    const gardees = [];
    for (const part of transitions.join(',').split(',')) {
      const morceau = part.trim();
      if (!morceau) continue;
      const propriete = morceau.split(/\s+/)[0];
      if (vues.has(propriete)) continue;
      vues.add(propriete);
      gardees.push(morceau);
    }
    morceaux.push('transition: ' + gardees.join(', '));
  }
  return morceaux.map((m) => m.replace(/;$/, '')).join('; ') + ';';
}

/** Écrit (ou retire) la feuille des effets dans un document. */
export function writeEffetsSheet(doc, morceaux) {
  const contenu = [...new Set(morceaux.filter(Boolean))].join('\n');
  let feuille = doc.getElementById(EFFETS_STYLE_ID);
  if (!contenu) { if (feuille) feuille.remove(); return; }
  if (!feuille) {
    feuille = doc.createElement('style');
    feuille.id = EFFETS_STYLE_ID;
    doc.head.appendChild(feuille);
  }
  if (feuille.textContent !== contenu) feuille.textContent = contenu;
}

/**
 * Fait apparaître les blocs quand ils entrent dans l'écran.
 *
 * Appelée par le runtime, côté visiteur. Ne fait rien — donc ne masque
 * rien — si le navigateur ne sait pas observer, ou si le visiteur a demandé
 * moins d'animations.
 *
 * @param {Document} doc
 * @returns {Function|null} de quoi tout débrancher
 */
export function animerApparitions(doc) {
  const vue = doc.defaultView;
  if (!vue || typeof vue.IntersectionObserver !== 'function') return null;
  if (vue.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return null;

  const blocs = doc.querySelectorAll('.' + CLASSE_ANIMEE);
  if (!blocs.length) return null;

  doc.documentElement.setAttribute(MARQUE_ANIME, '');

  const observateur = new vue.IntersectionObserver((entrees) => {
    for (const entree of entrees) {
      if (!entree.isIntersecting) continue;
      entree.target.setAttribute('data-admin-vu', '');
      observateur.unobserve(entree.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

  for (const bloc of blocs) observateur.observe(bloc);

  return () => {
    observateur.disconnect();
    doc.documentElement.removeAttribute(MARQUE_ANIME);
  };
}
