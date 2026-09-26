/**
 * Les marques des réseaux, dessinées.
 *
 * Une icône de réseau social se charge d'ordinaire depuis une police d'icônes
 * ou un CDN. Ici, ni l'un ni l'autre : le module n'a aucune dépendance
 * réseau, et surtout le site doit continuer à vivre après le retrait du
 * module. Une balise qui pointe vers un fichier extérieur, c'est un jour où
 * ce fichier ne répond plus et un pied de page qui perd ses liens.
 *
 * Les marques sont donc des tracés, posés en SVG dans la page. Ils
 * n'appellent rien et prennent la couleur du texte autour — `currentColor`,
 * donc le site les habille comme le reste.
 *
 * Ce sont des tracés RECONNAISSABLES, pas des reproductions : une marque
 * déposée ne se recopie pas au pixel, et un contour simplifié se lit mieux à
 * 20 px qu'un logo officiel réduit.
 * @module core/marques
 */

const NS = 'http://www.w3.org/2000/svg';

/**
 * Le tracé de chaque marque, sur une grille de 24.
 *
 * `plein` distingue les deux familles : un contour au trait (Instagram,
 * WhatsApp) et une silhouette pleine (Facebook, X, TikTok). Le mélange n'est
 * pas une négligence — certaines marques ne se lisent qu'en plein, et les
 * forcer au trait donne un gribouillis.
 */
export const MARQUES = {
  instagram: {
    trace: [
      'M7.5 3.5h9a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4h-9a4 4 0 0 1-4-4v-9a4 4 0 0 1 4-4z',
      'M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6z',
      'M17 6.8h.01',
    ],
  },
  facebook: {
    plein: true,
    trace: ['M13.4 21v-7.9h2.7l.4-3.1h-3.1V7.8c0-.9.25-1.5 1.55-1.5h1.65V3.5'
      + 'c-.3-.04-1.3-.13-2.45-.13-2.43 0-4.1 1.48-4.1 4.2v2.44H7.4v3.1h2.65V21z'],
  },
  x: {
    plein: true,
    trace: ['M3 3h4.3l4.6 6.2L17.5 3H21l-6.8 7.7L21.6 21h-4.3l-5-6.7L6 21H2.6l7.2-8.2z'],
  },
  linkedin: {
    trace: [
      'M4.5 9.5v10', 'M4.5 5.4h.01', 'M9.5 19.5v-10',
      'M9.5 13.2a3.7 3.7 0 0 1 7.4 0v6.3',
    ],
  },
  youtube: {
    trace: [
      'M3 8.5A3.5 3.5 0 0 1 6.5 5h11A3.5 3.5 0 0 1 21 8.5v7A3.5 3.5 0 0 1 17.5 19h-11'
        + 'A3.5 3.5 0 0 1 3 15.5z',
      'M10.5 9.2l4.6 2.8-4.6 2.8z',
    ],
  },
  whatsapp: {
    trace: [
      'M20.5 11.8a8.2 8.2 0 0 1-12.2 7.1L3.8 20.2l1.4-4.3A8.2 8.2 0 1 1 20.5 11.8z',
      'M8.8 8.9l1 2-.8 1a6 6 0 0 0 3.1 3.1l1-.8 2 1-.4 1.3a1.4 1.4 0 0 1-1.5.8'
        + ' 8 8 0 0 1-6.5-6.5 1.4 1.4 0 0 1 .8-1.5z',
    ],
  },
  tiktok: {
    plein: true,
    trace: ['M14.2 3h2.6a4.6 4.6 0 0 0 4.2 4.1v2.6a7 7 0 0 1-4.2-1.5v5.9'
      + 'a5.6 5.6 0 1 1-5.6-5.6c.3 0 .6.02.9.07v2.7a2.9 2.9 0 1 0 2.1 2.8z'],
  },
  pinterest: {
    trace: [
      'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
      'M10.1 20.6 12.7 10.8',
      'M10.4 12.4a2.9 2.9 0 1 1 5.3 1.8c-.8 1.4-2.4 2-3.8 1.3',
    ],
  },
  courriel: {
    trace: ['M3.5 6.5h17v11h-17z', 'M3.5 7.2 12 13l8.5-5.8'],
  },
  telephone: {
    trace: ['M6.2 3.5h2.6l1.8 4.4-2.2 1.4a11.5 11.5 0 0 0 5.3 5.3l1.4-2.2 4.4 1.8v2.6'
      + 'a1.9 1.9 0 0 1-2.1 1.9A15.9 15.9 0 0 1 4.3 5.6a1.9 1.9 0 0 1 1.9-2.1z'],
  },
  site: {
    trace: [
      'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
      'M3.5 9.5h17', 'M3.5 14.5h17',
      'M12 3c2.7 3 2.7 15 0 18', 'M12 3c-2.7 3-2.7 15 0 18',
    ],
  },
};

/**
 * Les autres mots qui désignent la même marque.
 *
 * Quelqu'un qui tape « twitter » ou « mail » désigne sans ambiguïté un de nos
 * tracés. Refuser le mot pour la seule raison que la marque a changé de nom,
 * ou qu'il est en anglais, ne rendrait service à personne.
 */
const ALIAS = {
  twitter: 'x', mail: 'courriel', email: 'courriel', 'e-mail': 'courriel',
  tel: 'telephone', phone: 'telephone', portable: 'telephone',
  web: 'site', 'site-web': 'site', insta: 'instagram', fb: 'facebook',
  yt: 'youtube', wa: 'whatsapp', 'tik-tok': 'tiktok',
};

/** Le nom lisible d'une marque, tel qu'il est lu à voix haute. */
const NOMS = {
  instagram: 'Instagram', facebook: 'Facebook', x: 'X', linkedin: 'LinkedIn',
  youtube: 'YouTube', whatsapp: 'WhatsApp', tiktok: 'TikTok',
  pinterest: 'Pinterest', courriel: 'Courriel', telephone: 'Téléphone',
  site: 'Site web',
};

/** L'identifiant de marque que désigne ce mot, ou une chaîne vide. */
export function marqueDe(mot) {
  const cle = String(mot || '').trim().toLowerCase().replace(/\s+/g, '-');
  const nom = ALIAS[cle] || cle;
  return MARQUES[nom] ? nom : '';
}

/** Les marques disponibles, dans l'ordre où le panneau les propose. */
export const MARQUES_CONNUES = Object.keys(MARQUES);

/** Le nom lisible d'une marque. */
export function nomDeMarque(nom) {
  return NOMS[nom] || nom;
}

/**
 * Dessine une marque dans un document.
 *
 * L'épaisseur du trait est donnée en unités de la grille de 24 : elle suit
 * donc la taille demandée, au lieu de s'épaissir en petit et de s'effacer en
 * grand.
 *
 * @param {Document} doc
 * @param {string} nom identifiant ou autre mot désignant la marque
 * @param {number} taille côté du carré, en pixels
 * @returns {Element|null} null si le mot ne désigne aucune marque
 */
export function tracerMarque(doc, nom, taille = 22) {
  const marque = MARQUES[marqueDe(nom)];
  if (!marque) return null;

  const svg = doc.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(taille));
  svg.setAttribute('height', String(taille));
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.style.cssText = 'display:block;flex:none;';

  for (const d of marque.trace) {
    const path = doc.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    if (marque.plein) {
      path.setAttribute('fill', 'currentColor');
    } else {
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', '1.7');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
    }
    svg.appendChild(path);
  }
  return svg;
}
