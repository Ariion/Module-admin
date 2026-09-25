/**
 * Formats d'écran : un même réglage, une valeur par largeur.
 *
 * Un titre à 2,6rem est juste sur un écran large et illisible sur un
 * téléphone. Jusqu'ici le module ne savait donner qu'une valeur par réglage :
 * on choisissait donc la moins mauvaise des deux. Ici une surcharge s'ajoute
 * PAR FORMAT, et seulement pour les réglages qu'on a voulu changer.
 *
 * Le format de base — l'ordinateur — reste en style en ligne, comme tout le
 * reste du module : les valeurs suivent l'élément jusque dans le fichier HTML
 * régénéré. Les surcharges, elles, demandent une règle d'écran, donc une
 * classe et une feuille à part. C'est le même mécanisme que le CSS
 * personnalisé et que les effets, pour la même raison.
 *
 * Les largeurs servent DEUX fois : à contraindre l'aperçu, et à écrire les
 * points de rupture. Un seul vocabulaire, sinon l'aperçu montrerait un état
 * que le site n'aura jamais — ce qui est pire que pas d'aperçu du tout.
 * @module core/ecrans
 */
import { hash } from './util.js';

/** Identifiant de la feuille portant les règles d'écran. */
export const ECRANS_STYLE_ID = 'admin-ecrans';

const PREFIXE = 'admin-r-';

/**
 * Les formats, du plus large au plus étroit.
 *
 * `apercu` est la largeur du cadre d'aperçu, `media` la condition écrite dans
 * la feuille. L'une doit satisfaire l'autre : un aperçu à 820px doit recevoir
 * les règles d'une tablette, sinon on règle à l'aveugle. C'est la seule
 * contrainte à respecter en touchant ce tableau.
 *
 * L'ordre compte : sur un téléphone de 390px les deux conditions sont vraies,
 * et c'est la dernière écrite qui gagne. Du plus large au plus étroit, la
 * cascade tombe donc juste sans qu'on ait à départager les spécificités.
 */
export const ECRANS = [
  { id: 'desktop', base: true, media: null, apercu: '100%', icone: 'desktop' },
  { id: 'tablet', media: '(max-width: 1024px)', apercu: '820px', icone: 'tablet' },
  { id: 'mobile', media: '(max-width: 640px)', apercu: '390px', icone: 'mobile' },
];

/** Le format qui vit en style en ligne. */
export const ECRAN_BASE = 'desktop';

/** Les formats qui produisent une règle d'écran. */
export const ECRANS_SECONDAIRES = ECRANS.filter((e) => !e.base).map((e) => e.id);

/** Le format portant cet identifiant, ou celui de base. */
export function ecran(id) {
  return ECRANS.find((e) => e.id === id) || ECRANS[0];
}

/**
 * Les surcharges d'un format, telles qu'enregistrées. Jamais `null` : le
 * panneau lit toujours un objet, même quand rien n'a été surchargé.
 */
export function surchargesDe(style, ecranId) {
  if (!ecranId || ecranId === ECRAN_BASE) return {};
  const par = style?.ecrans;
  const valeurs = par && typeof par === 'object' ? par[ecranId] : null;
  return valeurs && typeof valeurs === 'object' ? valeurs : {};
}

/**
 * Les valeurs telles qu'elles s'appliqueront sur ce format : la base, puis
 * ce que le format surcharge. C'est ce que le panneau doit montrer — un champ
 * vide sur mobile ne veut pas dire « rien », il veut dire « comme la base ».
 *
 * Les formats plus larges comptent aussi : une valeur posée sur tablette
 * descend sur mobile, puisque les deux conditions y sont vraies. On empile
 * donc dans l'ordre du tableau jusqu'au format demandé.
 */
export function styleDeLEcran(style, ecranId) {
  const base = { ...(style || {}) };
  delete base.ecrans;
  if (!ecranId || ecranId === ECRAN_BASE) return base;
  let valeurs = base;
  for (const e of ECRANS) {
    if (e.base) continue;
    valeurs = { ...valeurs, ...surchargesDe(style, e.id) };
    if (e.id === ecranId) break;
  }
  return valeurs;
}

/**
 * Enregistre un correctif sur un format. Une valeur vidée n'est pas une
 * surcharge à zéro : c'est la fin de la surcharge, et le format reprend la
 * valeur de base. Sans cela, il n'y aurait aucun moyen de revenir en arrière
 * autrement qu'en remettant tout l'habillage à zéro.
 *
 * @returns {object} le sous-objet `ecrans` complet, ou undefined s'il ne
 *   reste plus rien à enregistrer — auquel cas la clé disparaît du style.
 */
export function fusionnerEcrans(courant, ecranId, patch) {
  const tous = { ...(courant && typeof courant === 'object' ? courant : {}) };
  if (!ecranId || ecranId === ECRAN_BASE) return Object.keys(tous).length ? tous : undefined;

  const valeurs = { ...(tous[ecranId] || {}) };
  for (const [cle, valeur] of Object.entries(patch || {})) {
    if (valeur === '' || valeur == null) delete valeurs[cle];
    else valeurs[cle] = valeur;
  }
  if (Object.keys(valeurs).length) tous[ecranId] = valeurs;
  else delete tous[ecranId];
  return Object.keys(tous).length ? tous : undefined;
}

/** Ce style surcharge-t-il quelque chose sur ce format ? */
export function ecranSurcharge(style, ecranId) {
  return Object.keys(surchargesDe(style, ecranId)).length > 0;
}

/** Les formats sur lesquels ce style surcharge quelque chose. */
export function ecransSurcharges(style) {
  return ECRANS_SECONDAIRES.filter((id) => ecranSurcharge(style, id));
}

/**
 * La classe portant les règles d'écran de ce style, ou une chaîne vide.
 *
 * La classe est l'empreinte des surcharges elles-mêmes : deux blocs réglés
 * pareil partagent une règle, et rien n'a besoin d'un identifiant stable à
 * conserver d'une session à l'autre. C'est ce que fait déjà le CSS
 * personnalisé, pour la même raison.
 */
export function classeDesEcrans(style) {
  const parts = [];
  for (const id of ECRANS_SECONDAIRES) {
    const valeurs = surchargesDe(style, id);
    const cles = Object.keys(valeurs).sort();
    if (!cles.length) continue;
    parts.push(id + ':' + cles.map((c) => c + '=' + valeurs[c]).join(','));
  }
  return parts.length ? PREFIXE + hash(parts.join('|')) : '';
}

/** Toute classe de format posée sur cet élément. */
export function classeEcransPosee(el) {
  return Array.from(el.classList).find((c) => c.startsWith(PREFIXE)) || null;
}

/**
 * Réunit les règles d'écran d'une page dans une feuille unique.
 *
 * Même forme que la feuille des effets : les doublons sont écartés, et une
 * page sans surcharge n'emporte pas de feuille vide.
 */
export function writeEcransSheet(doc, morceaux) {
  const contenu = [...new Set(morceaux.filter(Boolean))].join('\n');
  let feuille = doc.getElementById(ECRANS_STYLE_ID);
  if (!contenu) { if (feuille) feuille.remove(); return; }
  if (!feuille) {
    feuille = doc.createElement('style');
    feuille.id = ECRANS_STYLE_ID;
    doc.head.appendChild(feuille);
  }
  if (feuille.textContent !== contenu) feuille.textContent = contenu;
}
