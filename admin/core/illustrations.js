/**
 * Images d'exemple, dessinées à partir du thème.
 *
 * Une page vide se remplit mal : tant qu'il n'y a pas d'image, le client ne
 * voit pas ce que sa page donnera, et il n'ose rien. Une banque de photos ne
 * répond pas au problème — il faut une clé d'API, une recherche, un choix.
 *
 * Ces images-là sont dessinées sur place, en SVG, avec les couleurs du thème
 * retenu : elles s'accordent d'office, ne demandent aucun réseau, ne posent
 * aucune question de droits, et se remplacent d'un clic par une vraie photo
 * quand le client en a une.
 *
 * @module core/illustrations
 */
import { themeById } from './theme.js';

/** Palette de repli quand aucun thème n'est choisi. */
const NEUTRE = { fond: '#eef1f6', fondDoux: '#dfe5ee', accent: '#5b6472', encre: '#15181d' };

const encoder = (svg) => 'data:image/svg+xml;charset=utf-8,'
  + encodeURIComponent(svg.replace(/\s{2,}/g, ' ').trim());

/** Les motifs proposés : un dessin par identité, tous nourris de la palette. */
const MOTIFS = [
  {
    id: 'degrade',
    dessin: (c) => `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c.accent}"/><stop offset="1" stop-color="${c.fondDoux}"/>
    </linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/>`,
  },
  {
    id: 'arcs',
    dessin: (c) => `<rect width="1200" height="800" fill="${c.fondDoux}"/>
      <circle cx="880" cy="200" r="420" fill="${c.accent}" opacity=".22"/>
      <circle cx="300" cy="640" r="300" fill="${c.accent}" opacity=".16"/>
      <circle cx="620" cy="400" r="170" fill="${c.accent}" opacity=".30"/>`,
  },
  {
    id: 'vagues',
    dessin: (c) => `<rect width="1200" height="800" fill="${c.fond}"/>
      <path d="M0 520 C 260 400 420 640 720 500 C 940 396 1080 470 1200 430 L1200 800 L0 800 Z"
        fill="${c.accent}" opacity=".26"/>
      <path d="M0 620 C 300 520 470 730 780 600 C 980 516 1090 580 1200 552 L1200 800 L0 800 Z"
        fill="${c.accent}" opacity=".42"/>`,
  },
  {
    id: 'points',
    dessin: (c) => `<defs><pattern id="p" width="46" height="46" patternUnits="userSpaceOnUse">
      <circle cx="10" cy="10" r="4" fill="${c.accent}" opacity=".45"/></pattern></defs>
      <rect width="1200" height="800" fill="${c.fondDoux}"/><rect width="1200" height="800" fill="url(#p)"/>`,
  },
  {
    id: 'obliques',
    dessin: (c) => `<defs><pattern id="l" width="36" height="36" patternUnits="userSpaceOnUse"
      patternTransform="rotate(35)"><rect width="14" height="36" fill="${c.accent}" opacity=".28"/></pattern></defs>
      <rect width="1200" height="800" fill="${c.fond}"/><rect width="1200" height="800" fill="url(#l)"/>`,
  },
  {
    id: 'cadre',
    dessin: (c) => `<rect width="1200" height="800" fill="${c.fondDoux}"/>
      <rect x="90" y="90" width="1020" height="620" fill="none" stroke="${c.accent}" stroke-width="6" opacity=".6"/>
      <rect x="150" y="150" width="900" height="500" fill="${c.accent}" opacity=".14"/>`,
  },
  {
    id: 'horizon',
    dessin: (c) => `<defs><linearGradient id="h" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c.fondDoux}"/><stop offset="1" stop-color="${c.accent}" stop-opacity=".55"/>
    </linearGradient></defs><rect width="1200" height="800" fill="url(#h)"/>
      <circle cx="600" cy="470" r="150" fill="${c.fond}" opacity=".75"/>
      <rect y="600" width="1200" height="200" fill="${c.encre}" opacity=".14"/>`,
  },
  {
    id: 'mosaique',
    dessin: (c) => `<rect width="1200" height="800" fill="${c.fond}"/>
      <rect x="0" y="0" width="600" height="400" fill="${c.accent}" opacity=".30"/>
      <rect x="600" y="400" width="600" height="400" fill="${c.accent}" opacity=".18"/>
      <rect x="600" y="0" width="600" height="400" fill="${c.fondDoux}"/>
      <rect x="0" y="400" width="600" height="400" fill="${c.fondDoux}"/>`,
  },
];

/**
 * Les images d'exemple accordées à un thème.
 * @param {{id?:string}|null} reglageTheme le réglage `theme` du site
 * @returns {{id:string, url:string}[]}
 */
export function illustrations(reglageTheme) {
  const theme = themeById(reglageTheme?.id);
  const c = theme ? theme.couleurs : NEUTRE;
  return MOTIFS.map((motif) => ({
    id: motif.id,
    url: encoder(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"
      width="1200" height="800">${motif.dessin(c)}</svg>`),
  }));
}

/** Une image d'exemple est-elle une image dessinée par le module ? */
export function estIllustration(url) {
  return String(url || '').startsWith('data:image/svg+xml');
}
