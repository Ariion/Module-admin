/**
 * Le parcours guidé : la page, de haut en bas, une étape par section.
 *
 * La bibliothèque d'éléments suppose qu'on sait ce qu'on veut construire.
 * Quelqu'un qui n'a jamais fait de site ne le sait pas : il veut qu'on lui
 * dise quoi remplir, dans l'ordre, jusqu'à ce qu'il n'y ait plus rien à
 * remplir. C'est exactement ce que décrit cette liste — les sections de la
 * page dans l'ordre du document, et dans chacune les champs à renseigner,
 * nommés en français courant plutôt qu'en vocabulaire de développeur.
 *
 * Deux origines cohabitent sans que le client ait à le savoir :
 *   - une section AJOUTÉE par le module est décrite par son arbre de widgets ;
 *   - une section du CODE DU CLIENT est décrite par ce que le scanner y a
 *     détecté (textes, images, liens).
 *
 * @module core/guide
 */

/** Widgets qui demandent une saisie, et ce qu'on demande au client. */
const CHAMPS_WIDGET = {
  heading: (noeud) => ({
    genre: 'titre', valeur: noeud.props?.text || '',
    patch: (v) => ({ text: v }),
  }),
  text: (noeud) => ({
    genre: 'texte', valeur: noeud.props?.html || '',
    patch: (v) => ({ html: v }),
  }),
  button: (noeud) => ({
    genre: 'bouton', valeur: noeud.props?.text || '', lien: noeud.props?.href || '',
    patch: (v) => ({ text: v }), patchLien: (v) => ({ href: v }),
  }),
  image: (noeud) => ({
    genre: 'image', valeur: noeud.props?.src || '', alt: noeud.props?.alt || '',
    patch: (v) => ({ src: v }), patchAlt: (v) => ({ alt: v }),
  }),
  list: (noeud) => ({
    genre: 'liste', valeur: noeud.props?.items || '',
    patch: (v) => ({ items: v }),
  }),
  video: (noeud) => ({
    genre: 'video', valeur: noeud.props?.src || '',
    patch: (v) => ({ src: v }),
  }),
  map: (noeud) => ({
    genre: 'adresse', valeur: noeud.props?.query || '',
    patch: (v) => ({ query: v }),
  }),
};

/**
 * Le champ contient-il encore le texte du modèle ?
 *
 * La marque est posée par les modèles au moment où ils sont construits, et
 * retirée à la première frappe du client : deviner à la lecture du texte
 * serait à la fois faux (un client peut vouloir garder une phrase) et fragile.
 */
export function estExemple(champ) {
  return !!champ?.exemple;
}

/** Un champ est rempli s'il a une valeur, et que ce n'est plus l'exemple. */
export function estRempli(champ) {
  const valeur = String(champ.valeur || '').replace(/<[^>]*>/g, '').trim();
  if (!valeur) return false;
  return !estExemple(champ);
}

/** Champs d'une section ajoutée : un parcours de son arbre de widgets. */
function champsWidgets(tree) {
  const champs = [];
  const parcourir = (noeuds) => {
    for (const noeud of noeuds || []) {
      const fabrique = CHAMPS_WIDGET[noeud.type];
      if (fabrique) {
        champs.push({
          source: 'widget', key: noeud.key, exemple: !!noeud.props?.exemple,
          ...fabrique(noeud),
        });
      }
      if (noeud.children) parcourir(noeud.children);
    }
  };
  parcourir(tree.children || []);
  return champs;
}

/** Genre déduit du rôle détecté dans le code du client. */
const GENRE_ROLE = { image: 'image', background: 'fond', link: 'bouton', text: 'texte' };

/** Champs d'une section du code du client : ce que le scanner y a trouvé. */
function champsDom(model, el) {
  const champs = [];
  for (const entry of model.entries.values()) {
    if (!el.contains(entry.el)) continue;
    const valeur = model.valueOf(entry.print.id) || entry.value;
    const genre = GENRE_ROLE[entry.role] || 'texte';
    // Un titre reste un titre : c'est le mot que le client comprend.
    const titre = genre === 'texte' && /^H[1-6]$/.test(entry.el.tagName);
    champs.push({
      source: 'dom', entry,
      genre: titre ? 'titre' : genre,
      valeur: genre === 'image' || genre === 'fond'
        ? (valeur.src || '')
        : (valeur.text ?? valeur.html ?? ''),
      lien: entry.role === 'link' ? (valeur.href || '') : undefined,
      alt: entry.role === 'image' ? (valeur.alt || '') : undefined,
    });
  }
  return champs;
}

/** Nom lisible d'une étape : le premier titre qu'elle contient. */
function titreDe(champs) {
  const premier = champs.find((c) => c.genre === 'titre' && String(c.valeur || '').trim());
  if (!premier) return '';
  const texte = String(premier.valeur).replace(/<[^>]*>/g, '').trim();
  return texte.length > 46 ? texte.slice(0, 44) + '…' : texte;
}

/**
 * Nom de repli quand la partie n'a pas de titre.
 *
 * « nav » ou « div » ne veut rien dire pour le client : on nomme la partie par
 * ce qu'elle est à ses yeux — le menu, le bas de page — et à défaut par son
 * rang dans la page.
 */
function repliDe(el) {
  const tag = el.tagName;
  if (tag === 'HEADER') return 'entete';
  if (tag === 'NAV') return 'menu';
  if (tag === 'FOOTER') return 'pied';
  if (el.querySelector('nav') && !el.textContent.trim().split(/\s+/).slice(20).length) return 'menu';
  return 'partie';
}

/**
 * Le parcours complet de la page ouverte.
 * @param {import('./model.js').PageModel} model
 * @returns {Array<object>} étapes, dans l'ordre du document
 */
export function etapesDuGuide(model) {
  const parCle = new Map(model.widgetSections().map((r) => [r.key, r]));

  return model.sectionList().map((section, index) => {
    const cle = section.el.getAttribute('data-admin-section');
    const record = cle ? parCle.get(cle) : null;
    const champs = record ? champsWidgets(record.tree) : champsDom(model, section.el);
    const etape = {
      index, ref: section.ref, cle, el: section.el,
      ajoutee: !!record,
      titre: titreDe(champs),
      repli: repliDe(section.el),
      champs,
    };
    return { ...etape, ...restantsDe(etape) };
  });
}

/** Ce qu'il reste à remplir dans une étape, recompté sur ses champs. */
export function restantsDe(etape) {
  const aRemplir = etape.champs.filter((c) => c.genre !== 'fond');
  return { total: aRemplir.length, restants: aRemplir.filter((c) => !estRempli(c)).length };
}

/**
 * Avancement global. Recompté à chaque appel, jamais lu dans un total figé :
 * le panneau modifie les champs en place au fil de la frappe, et la jauge doit
 * bouger au caractère près.
 */
export function avancement(etapes) {
  let total = 0; let faits = 0;
  for (const etape of etapes) {
    const compte = restantsDe(etape);
    total += compte.total;
    faits += compte.total - compte.restants;
  }
  return { total, faits, part: total ? Math.round((faits / total) * 100) : 0 };
}
