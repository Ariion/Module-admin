/**
 * Polices d'écriture.
 *
 * Une sélection de familles Google Fonts, chargées à la demande : seules les
 * polices réellement utilisées dans la page produisent une balise `<link>`.
 * Celle-ci est conservée à la régénération du HTML, donc le site garde ses
 * polices même sans le module.
 * @module core/fonts
 */
export const FONT_LINK_ID = 'admin-fonts';

/**
 * Familles proposées, avec leur pile de secours et leur famille de style.
 * `groupe` sert à ranger la liste dans le panneau : sur quarante entrées,
 * une liste à plat devient illisible.
 */
export const FONTS = [
  // --- Serif : classique, éditorial, chaleureux
  { name: 'Playfair Display', stack: 'serif', groupe: 'serif', weights: '400;500;600;700' },
  { name: 'Fraunces', stack: 'serif', groupe: 'serif', weights: '300;400;500;600' },
  { name: 'Lora', stack: 'serif', groupe: 'serif', weights: '400;500;600;700' },
  { name: 'Cormorant Garamond', stack: 'serif', groupe: 'serif', weights: '300;400;500;600' },
  { name: 'Libre Baskerville', stack: 'serif', groupe: 'serif', weights: '400;700' },
  { name: 'EB Garamond', stack: 'serif', groupe: 'serif', weights: '400;500;600' },
  { name: 'Crimson Pro', stack: 'serif', groupe: 'serif', weights: '300;400;600' },
  { name: 'Source Serif 4', stack: 'serif', groupe: 'serif', weights: '300;400;600;700' },
  { name: 'Bitter', stack: 'serif', groupe: 'serif', weights: '300;400;600;700' },
  { name: 'Merriweather', stack: 'serif', groupe: 'serif', weights: '300;400;700' },
  { name: 'Spectral', stack: 'serif', groupe: 'serif', weights: '300;400;600' },
  { name: 'Newsreader', stack: 'serif', groupe: 'serif', weights: '300;400;500;600' },
  { name: 'Instrument Serif', stack: 'serif', groupe: 'serif', weights: '400' },
  { name: 'DM Serif Display', stack: 'serif', groupe: 'serif', weights: '400' },

  // --- Sans serif : neutre, moderne, lisible
  { name: 'Inter', stack: 'sans-serif', groupe: 'sans', weights: '300;400;500;600;700' },
  { name: 'Work Sans', stack: 'sans-serif', groupe: 'sans', weights: '300;400;500;600' },
  { name: 'DM Sans', stack: 'sans-serif', groupe: 'sans', weights: '400;500;700' },
  { name: 'Montserrat', stack: 'sans-serif', groupe: 'sans', weights: '300;400;500;600;700' },
  { name: 'Poppins', stack: 'sans-serif', groupe: 'sans', weights: '300;400;500;600' },
  { name: 'Raleway', stack: 'sans-serif', groupe: 'sans', weights: '300;400;500;600' },
  { name: 'Karla', stack: 'sans-serif', groupe: 'sans', weights: '300;400;500;600' },
  { name: 'Manrope', stack: 'sans-serif', groupe: 'sans', weights: '300;400;500;600;700' },
  { name: 'Outfit', stack: 'sans-serif', groupe: 'sans', weights: '300;400;500;600' },
  { name: 'Plus Jakarta Sans', stack: 'sans-serif', groupe: 'sans', weights: '300;400;500;600;700' },
  { name: 'Figtree', stack: 'sans-serif', groupe: 'sans', weights: '300;400;500;600;700' },
  { name: 'Nunito Sans', stack: 'sans-serif', groupe: 'sans', weights: '300;400;600;700' },
  { name: 'Rubik', stack: 'sans-serif', groupe: 'sans', weights: '300;400;500;600' },
  { name: 'Lato', stack: 'sans-serif', groupe: 'sans', weights: '300;400;700' },
  { name: 'Open Sans', stack: 'sans-serif', groupe: 'sans', weights: '300;400;600;700' },
  { name: 'Source Sans 3', stack: 'sans-serif', groupe: 'sans', weights: '300;400;600;700' },
  { name: 'Archivo', stack: 'sans-serif', groupe: 'sans', weights: '400;500;600;700' },
  { name: 'Space Grotesk', stack: 'sans-serif', groupe: 'sans', weights: '300;400;500;700' },

  // --- Titrage : caractère marqué, à réserver aux grands corps
  { name: 'Bebas Neue', stack: 'sans-serif', groupe: 'titrage', weights: '400' },
  { name: 'Abril Fatface', stack: 'cursive', groupe: 'titrage', weights: '400' },
  { name: 'Anton', stack: 'sans-serif', groupe: 'titrage', weights: '400' },
  { name: 'Oswald', stack: 'sans-serif', groupe: 'titrage', weights: '400;500;600' },
  { name: 'Righteous', stack: 'cursive', groupe: 'titrage', weights: '400' },
  { name: 'Alfa Slab One', stack: 'cursive', groupe: 'titrage', weights: '400' },
  { name: 'Syne', stack: 'sans-serif', groupe: 'titrage', weights: '400;600;700;800' },
  { name: 'Unbounded', stack: 'cursive', groupe: 'titrage', weights: '300;400;600' },

  // --- Manuscrit : signatures, accroches courtes
  { name: 'Caveat', stack: 'cursive', groupe: 'manuscrit', weights: '400;600' },
  { name: 'Dancing Script', stack: 'cursive', groupe: 'manuscrit', weights: '400;600' },
  { name: 'Great Vibes', stack: 'cursive', groupe: 'manuscrit', weights: '400' },
  { name: 'Sacramento', stack: 'cursive', groupe: 'manuscrit', weights: '400' },

  // --- Chasse fixe : code, chiffres alignés, étiquettes
  { name: 'IBM Plex Mono', stack: 'monospace', groupe: 'mono', weights: '400;500' },
  { name: 'JetBrains Mono', stack: 'monospace', groupe: 'mono', weights: '400;500' },
  { name: 'Space Mono', stack: 'monospace', groupe: 'mono', weights: '400;700' },
  { name: 'Roboto Mono', stack: 'monospace', groupe: 'mono', weights: '300;400;500' },
];

/** Ordre d'affichage des familles dans le panneau. */
export const GROUPES_POLICE = ['serif', 'sans', 'titrage', 'manuscrit', 'mono'];

const PAR_NOM = new Map(FONTS.map((f) => [f.name, f]));

/** Nom de famille → valeur CSS complète, ou null si la police est inconnue. */
export function fontStack(nom) {
  const police = PAR_NOM.get(String(nom || '').trim());
  return police ? `"${police.name}", ${police.stack}` : null;
}

/** Retrouve le nom de famille dans une valeur CSS. */
export function fontName(valeur) {
  const m = /^"([^"]+)"/.exec(String(valeur || '').trim());
  return m ? m[1] : '';
}

/**
 * Écrit la balise de chargement des polices utilisées.
 * @param {Document} doc
 * @param {string[]} noms familles employées dans la page
 */
export function writeFontLink(doc, noms) {
  const utilisees = [...new Set(noms.filter((n) => PAR_NOM.has(n)))].sort();
  let lien = doc.getElementById(FONT_LINK_ID);

  if (!utilisees.length) { if (lien) lien.remove(); return; }

  const familles = utilisees
    .map((n) => 'family=' + encodeURIComponent(n).replace(/%20/g, '+') + ':wght@' + PAR_NOM.get(n).weights)
    .join('&');
  const href = `https://fonts.googleapis.com/css2?${familles}&display=swap`;

  if (!lien) {
    lien = doc.createElement('link');
    lien.id = FONT_LINK_ID;
    lien.rel = 'stylesheet';
    doc.head.appendChild(lien);
  }
  if (lien.getAttribute('href') !== href) lien.setAttribute('href', href);
}
