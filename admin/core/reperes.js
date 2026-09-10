/**
 * Repères d'alignement : les lignes qui apparaissent quand on déplace un bloc.
 *
 * Déplacer un bloc à la souris sans repères, c'est viser à l'œil : on n'est
 * jamais sûr d'être centré, et deux blocs voisins finissent à trois pixels
 * l'un de l'autre sans qu'on le voie. Les logiciels de dessin résolvent cela
 * depuis toujours par des lignes qui s'affichent quand un bord ou un centre
 * tombe sur celui d'un voisin, et par la distance affichée entre deux blocs.
 *
 * Ce module ne dessine rien : il calcule. Il reçoit des rectangles et rend
 * les accrochages et les écarts, ce qui le rend vérifiable sans navigateur.
 *
 * @module core/reperes
 */

/** Distance en dessous de laquelle un bord s'accroche à un repère (px). */
export const TOLERANCE = 6;

/**
 * Les lignes sur lesquelles un bloc peut s'aligner : les bords et le centre
 * de sa section, et ceux de chacun de ses voisins.
 *
 * @param {DOMRectReadOnly} section
 * @param {DOMRectReadOnly[]} freres
 * @returns {{x: object[], y: object[]}}
 */
export function reperesDe(section, freres = []) {
  const x = [];
  const y = [];

  const poser = (liste, valeur, type, source) => {
    if (!Number.isFinite(valeur)) return;
    liste.push({ v: valeur, type, source });
  };

  if (section) {
    poser(x, section.left, 'bord', 'section');
    poser(x, section.left + section.width / 2, 'centre', 'section');
    poser(x, section.right, 'bord', 'section');
    poser(y, section.top, 'bord', 'section');
    poser(y, section.top + section.height / 2, 'centre', 'section');
    poser(y, section.bottom, 'bord', 'section');
  }

  for (const f of freres) {
    if (!f || !f.width || !f.height) continue;
    poser(x, f.left, 'bord', 'frere');
    poser(x, f.left + f.width / 2, 'centre', 'frere');
    poser(x, f.right, 'bord', 'frere');
    poser(y, f.top, 'bord', 'frere');
    poser(y, f.top + f.height / 2, 'centre', 'frere');
    poser(y, f.bottom, 'bord', 'frere');
  }

  return { x, y };
}

/** Les trois prises d'un rectangle sur un axe : début, milieu, fin. */
function prises(rect, axe) {
  return axe === 'x'
    ? [rect.left, rect.left + rect.width / 2, rect.right]
    : [rect.top, rect.top + rect.height / 2, rect.bottom];
}

/**
 * Cherche le meilleur accrochage d'un rectangle sur un axe.
 *
 * Le centre l'emporte à égalité de distance : quand on hésite entre « centré »
 * et « bord aligné », c'est presque toujours le centre qu'on visait.
 *
 * @returns {{ecart:number, ligne:number, type:string}|null}
 */
export function accrochageAxe(rect, reperes, axe, tolerance = TOLERANCE) {
  let meilleur = null;
  for (const prise of prises(rect, axe)) {
    for (const repere of reperes) {
      const ecart = repere.v - prise;
      if (Math.abs(ecart) > tolerance) continue;
      const mieux = !meilleur
        || Math.abs(ecart) < Math.abs(meilleur.ecart) - 0.001
        || (Math.abs(Math.abs(ecart) - Math.abs(meilleur.ecart)) <= 0.001
          && repere.type === 'centre' && meilleur.type !== 'centre');
      if (mieux) meilleur = { ecart, ligne: repere.v, type: repere.type, source: repere.source };
    }
  }
  return meilleur;
}

/**
 * Accrochage sur les deux axes.
 * @returns {{dx:number, dy:number, ligneX:object|null, ligneY:object|null}}
 */
export function accrocher(rect, reperes, tolerance = TOLERANCE) {
  const surX = accrochageAxe(rect, reperes.x || [], 'x', tolerance);
  const surY = accrochageAxe(rect, reperes.y || [], 'y', tolerance);
  return {
    dx: surX ? surX.ecart : 0,
    dy: surY ? surY.ecart : 0,
    ligneX: surX, ligneY: surY,
  };
}

/** Deux rectangles se chevauchent-ils sur un axe ? */
function chevauche(a, b, axe) {
  return axe === 'x'
    ? a.left < b.right && b.left < a.right
    : a.top < b.bottom && b.top < a.bottom;
}

/**
 * Les écarts avec le voisin le plus proche de chaque côté.
 *
 * On ne mesure que les voisins réellement en face : un bloc situé en
 * diagonale n'apprend rien, et afficher sa distance ne ferait que du bruit.
 *
 * @returns {Array<{axe:'v'|'h', taille:number, de:number, a:number, centre:number}>}
 */
export function ecarts(rect, freres = []) {
  let haut = null; let bas = null; let gauche = null; let droite = null;

  for (const f of freres) {
    if (!f || !f.width || !f.height) continue;

    if (chevauche(rect, f, 'x')) {
      if (f.bottom <= rect.top) {
        const taille = rect.top - f.bottom;
        if (!haut || taille < haut.taille) {
          haut = { axe: 'v', taille, de: f.bottom, a: rect.top, centre: milieu(rect, f, 'x') };
        }
      } else if (f.top >= rect.bottom) {
        const taille = f.top - rect.bottom;
        if (!bas || taille < bas.taille) {
          bas = { axe: 'v', taille, de: rect.bottom, a: f.top, centre: milieu(rect, f, 'x') };
        }
      }
    }

    if (chevauche(rect, f, 'y')) {
      if (f.right <= rect.left) {
        const taille = rect.left - f.right;
        if (!gauche || taille < gauche.taille) {
          gauche = { axe: 'h', taille, de: f.right, a: rect.left, centre: milieu(rect, f, 'y') };
        }
      } else if (f.left >= rect.right) {
        const taille = f.left - rect.right;
        if (!droite || taille < droite.taille) {
          droite = { axe: 'h', taille, de: rect.right, a: f.left, centre: milieu(rect, f, 'y') };
        }
      }
    }
  }

  // Un écart nul ne s'affiche pas : deux blocs collés n'ont pas d'espace
  // à mesurer, et l'étiquette « 0 » ne dirait rien.
  return [haut, bas, gauche, droite].filter((e) => e && e.taille >= 1);
}

/** Milieu commun à deux rectangles sur un axe : où poser la mesure. */
function milieu(a, b, axe) {
  const debut = axe === 'x' ? Math.max(a.left, b.left) : Math.max(a.top, b.top);
  const fin = axe === 'x' ? Math.min(a.right, b.right) : Math.min(a.bottom, b.bottom);
  return (debut + fin) / 2;
}

/** Translate un rectangle : le bloc suit la souris avant d'être accroché. */
export function translater(rect, dx, dy) {
  return {
    left: rect.left + dx, right: rect.right + dx,
    top: rect.top + dy, bottom: rect.bottom + dy,
    width: rect.width, height: rect.height,
  };
}
