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

/** Familles proposées, avec leur pile de secours. */
export const FONTS = [
  { name: 'Playfair Display', stack: 'serif', weights: '400;500;600;700' },
  { name: 'Fraunces', stack: 'serif', weights: '300;400;500;600' },
  { name: 'Lora', stack: 'serif', weights: '400;500;600;700' },
  { name: 'Cormorant Garamond', stack: 'serif', weights: '300;400;500;600' },
  { name: 'Libre Baskerville', stack: 'serif', weights: '400;700' },
  { name: 'Inter', stack: 'sans-serif', weights: '300;400;500;600;700' },
  { name: 'Work Sans', stack: 'sans-serif', weights: '300;400;500;600' },
  { name: 'DM Sans', stack: 'sans-serif', weights: '400;500;700' },
  { name: 'Montserrat', stack: 'sans-serif', weights: '300;400;500;600;700' },
  { name: 'Poppins', stack: 'sans-serif', weights: '300;400;500;600' },
  { name: 'Raleway', stack: 'sans-serif', weights: '300;400;500;600' },
  { name: 'Karla', stack: 'sans-serif', weights: '300;400;500;600' },
  { name: 'Bebas Neue', stack: 'sans-serif', weights: '400' },
  { name: 'Abril Fatface', stack: 'cursive', weights: '400' },
  { name: 'IBM Plex Mono', stack: 'monospace', weights: '400;500' },
  { name: 'JetBrains Mono', stack: 'monospace', weights: '400;500' },
];

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
