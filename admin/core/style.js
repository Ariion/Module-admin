/**
 * Réglages d'habillage, communs aux éléments du site et aux widgets.
 *
 * Un seul schéma décrit ce qui est réglable, ce qui sert à la fois à
 * construire le panneau et à écrire les styles. Tout est appliqué en style
 * en ligne : les valeurs suivent donc l'élément, y compris dans le fichier
 * HTML régénéré, sans dépendre d'une feuille séparée.
 *
 * Le CSS personnalisé fait exception : il a besoin d'un sélecteur (pour un
 * `:hover` par exemple). Il produit une classe `admin-c-…` et une règle dans
 * une feuille unique, l'une et l'autre conservées à la régénération.
 * @module core/style
 */
import { hash } from './util.js';
import { safeImageUrl } from './sanitize.js';
import { fontStack, fontName } from './fonts.js';

export const CUSTOM_STYLE_ID = 'admin-custom-css';
const CLASS_PREFIX = 'admin-c-';

/**
 * Schéma des réglages. `css` est la propriété appliquée, `unit` son unité.
 * Les groupes servent au découpage du panneau.
 */
export const STYLE_FIELDS = [
  { group: 'colors', key: 'color', css: 'color', type: 'color', label: 'textColor' },
  { group: 'colors', key: 'background', css: 'backgroundColor', type: 'color', label: 'bgColor' },
  { group: 'colors', key: 'backgroundImage', css: 'backgroundImage', type: 'image', label: 'bgImage' },

  { group: 'type', key: 'fontFamily', css: 'fontFamily', type: 'font', label: 'fontFamily' },
  { group: 'type', key: 'fontSize', css: 'fontSize', type: 'number', unit: 'px', label: 'fontSize', min: 8, max: 160, step: 1 },
  { group: 'type', key: 'fontWeight', css: 'fontWeight', type: 'select', label: 'fontWeight', options: ['', '300', '400', '500', '600', '700', '800'] },
  { group: 'type', key: 'lineHeight', css: 'lineHeight', type: 'number', label: 'lineHeight', min: 0.8, max: 3, step: 0.05 },
  { group: 'type', key: 'letterSpacing', css: 'letterSpacing', type: 'number', unit: 'px', label: 'letterSpacing', min: -5, max: 20, step: 0.1 },
  { group: 'type', key: 'textTransform', css: 'textTransform', type: 'select', label: 'textTransform', options: ['', 'none', 'uppercase', 'lowercase', 'capitalize'] },
  { group: 'type', key: 'fontStyle', css: 'fontStyle', type: 'select', label: 'fontStyle', options: ['', 'normal', 'italic'] },
  { group: 'type', key: 'textDecoration', css: 'textDecoration', type: 'select', label: 'textDecoration', options: ['', 'none', 'underline'] },
  { group: 'type', key: 'textAlign', css: 'textAlign', type: 'align', label: 'alignLabel' },

  { group: 'space', key: 'paddingBlock', css: 'paddingBlock', type: 'number', unit: 'px', label: 'paddingY', min: 0, max: 240, step: 2 },
  { group: 'space', key: 'paddingInline', css: 'paddingInline', type: 'number', unit: 'px', label: 'paddingX', min: 0, max: 240, step: 2 },
  { group: 'space', key: 'marginTop', css: 'marginTop', type: 'number', unit: 'px', label: 'marginTop', min: -100, max: 240, step: 2 },
  { group: 'space', key: 'marginBottom', css: 'marginBottom', type: 'number', unit: 'px', label: 'marginBottom', min: -100, max: 240, step: 2 },
  { group: 'space', key: 'maxWidth', css: 'maxWidth', type: 'number', unit: 'px', label: 'maxWidthLabel', min: 120, max: 2400, step: 20 },

  { group: 'border', key: 'borderWidth', css: 'borderWidth', type: 'number', unit: 'px', label: 'borderWidth', min: 0, max: 24, step: 1 },
  { group: 'border', key: 'borderColor', css: 'borderColor', type: 'color', label: 'borderColor' },
  { group: 'border', key: 'borderRadius', css: 'borderRadius', type: 'number', unit: 'px', label: 'borderRadius', min: 0, max: 200, step: 1 },
  { group: 'border', key: 'boxShadow', css: 'boxShadow', type: 'select', label: 'shadowLabel', options: ['', 'none', '0 2px 8px rgba(0,0,0,.10)', '0 8px 24px rgba(0,0,0,.14)', '0 18px 44px rgba(0,0,0,.20)'] },
];

export const STYLE_GROUPS = ['colors', 'type', 'space', 'border'];

const PAR_CLE = new Map(STYLE_FIELDS.map((f) => [f.key, f]));

/** Une couleur CSS reconnue, et rien d'autre. */
function estCouleur(valeur) {
  if (/^#[0-9a-f]{3,8}$/i.test(valeur)) return true;
  if (/^(rgb|hsl)a?\([\d\s.,%/-]+\)$/i.test(valeur)) return true;
  return /^[a-z]{3,20}$/i.test(valeur)
    && typeof CSS !== 'undefined' && CSS.supports && CSS.supports('color', valeur);
}

/** Convertit une valeur de réglage en valeur CSS, ou null si elle est refusée. */
function versCss(champ, brut) {
  const valeur = String(brut ?? '').trim();
  if (!valeur) return '';

  switch (champ.type) {
    case 'color':
      return estCouleur(valeur) ? valeur : null;
    case 'image': {
      if (valeur === 'none') return 'none';
      const src = safeImageUrl(valeur);
      return src ? 'url("' + src.replace(/"/g, '%22') + '")' : null;
    }
    case 'number': {
      const n = Number(valeur);
      if (!Number.isFinite(n)) return null;
      return champ.unit ? n + champ.unit : String(n);
    }
    case 'font':
      return fontStack(valeur);
    case 'select':
      return champ.options.includes(valeur) ? valeur : null;
    case 'align':
      return ['left', 'center', 'right', 'justify'].includes(valeur) ? valeur : null;
    default:
      return null;
  }
}

/**
 * Applique un objet de réglages à un élément.
 * @returns {boolean} true si quelque chose a changé
 */
export function applyStyleObject(el, style) {
  if (!el || !style || typeof style !== 'object') return false;
  let change = false;

  for (const [cle, brut] of Object.entries(style)) {
    const champ = PAR_CLE.get(cle);
    if (!champ) continue;

    const css = versCss(champ, brut);
    if (css === null) continue;

    if (!css) {
      if (el.style[champ.css]) { el.style[champ.css] = ''; change = true; }
      continue;
    }
    // Une bordure sans style ne s'affiche pas.
    if (cle === 'borderWidth' && !el.style.borderStyle) el.style.borderStyle = 'solid';
    if (el.style[champ.css] !== css) { el.style[champ.css] = css; change = true; }
  }

  if ('customCss' in style) change = appliquerClassePerso(el, style.customCss) || change;
  return change;
}

/** Classe unique portant le CSS personnalisé d'un élément. */
function appliquerClassePerso(el, css) {
  const texte = String(css || '').trim();
  const ancienne = Array.from(el.classList).find((c) => c.startsWith(CLASS_PREFIX));
  const nouvelle = texte ? CLASS_PREFIX + hash(texte) : null;
  if (ancienne === nouvelle) return false;
  if (ancienne) el.classList.remove(ancienne);
  if (nouvelle) el.classList.add(nouvelle);
  return true;
}

/**
 * Traduit le CSS saisi par l'utilisateur en règles portant sur sa classe.
 * Accepte aussi bien `couleur: rouge;` que `selector:hover { … }`.
 */
export function compileCustomCss(css) {
  const texte = String(css || '').trim();
  if (!texte) return '';
  const classe = '.' + CLASS_PREFIX + hash(texte);

  const sur = (bloc) => bloc
    .split(';')
    .map((d) => d.trim())
    .filter((d) => d && d.includes(':') && !/(expression\s*\(|javascript\s*:|@import|<)/i.test(d))
    .join('; ');

  if (!texte.includes('{')) {
    const decl = sur(texte);
    return decl ? `${classe} { ${decl} }` : '';
  }

  const regles = [];
  const motif = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = motif.exec(texte))) {
    const selecteur = m[1].trim().replace(/\bselector\b/g, classe);
    if (!selecteur || /[<>@]/.test(selecteur)) continue;
    const decl = sur(m[2]);
    if (decl) regles.push(`${selecteur.startsWith('.') || selecteur.startsWith(classe) ? selecteur : classe + ' ' + selecteur} { ${decl} }`);
  }
  return regles.join('\n');
}

/**
 * Réunit tous les CSS personnalisés d'une page dans une feuille unique.
 * @param {Document} doc
 * @param {string[]} morceaux
 */
export function writeCustomSheet(doc, morceaux) {
  const contenu = morceaux.filter(Boolean).join('\n');
  let feuille = doc.getElementById(CUSTOM_STYLE_ID);
  if (!contenu) { if (feuille) feuille.remove(); return; }
  if (!feuille) {
    feuille = doc.createElement('style');
    feuille.id = CUSTOM_STYLE_ID;
    doc.head.appendChild(feuille);
  }
  feuille.textContent = contenu;
}

/** Valeurs effectives d'un élément, pour préremplir le panneau. */
export function readStyleValues(el) {
  const vue = el.ownerDocument.defaultView;
  const calcule = vue ? vue.getComputedStyle(el) : null;
  const lu = {};
  for (const champ of STYLE_FIELDS) {
    const enLigne = el.style[champ.css];
    if (enLigne) {
      lu[champ.key] = champ.unit ? parseFloat(enLigne) : enLigne;
    } else if (calcule && ['color', 'background', 'fontSize', 'fontWeight', 'lineHeight', 'textAlign'].includes(champ.key)) {
      const v = calcule[champ.css];
      lu[champ.key] = champ.unit ? parseFloat(v) : v;
    } else {
      lu[champ.key] = '';
    }
  }
  lu.fontFamily = fontName(el.style.fontFamily);
  const fond = el.style.backgroundImage || (calcule ? calcule.backgroundImage : '');
  const url = /url\((['"]?)(.*?)\1\)/.exec(fond);
  lu.backgroundImage = url ? url[2] : '';
  return lu;
}
