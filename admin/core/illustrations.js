/**
 * Images d'exemple, dessinées à partir du thème et du métier.
 *
 * Une page vide se remplit mal : tant qu'il n'y a pas d'image, le client ne
 * voit pas ce que sa page donnera, et il n'ose rien. Une banque de photos ne
 * répond pas au problème — il faut une clé d'API, une recherche, un choix, et
 * une licence à relire avant de revendre quoi que ce soit.
 *
 * Ces images-là sont dessinées sur place, en SVG, avec les couleurs du thème :
 * elles s'accordent d'office, ne demandent aucun réseau, ne posent aucune
 * question de droits, et se remplacent d'un clic par une vraie photo.
 *
 * Elles ont longtemps été des aplats — un dégradé, des arcs, des vagues. Joli,
 * et parfaitement muet : devant une vignette de modèle, personne ne se projette
 * dans un aplat. Elles évoquent donc maintenant le MÉTIER : une table dressée
 * pour un restaurant, un portant pour une boutique, un échafaudage pour le
 * bâtiment. Ce ne sont pas des photographies et elles n'essaient pas de s'en
 * faire passer pour — mais on reconnaît ce qu'on regarde, et c'est tout ce
 * qu'on leur demande.
 *
 * Les scènes sont composées de primitives communes plutôt qu'écrites une par
 * une : trente-six dessins indépendants auraient divergé au premier réglage de
 * couleur, et personne ne les aurait tous reregardés.
 * @module core/illustrations
 */
import { themeApplique } from './theme.js';

/** Palette de repli quand aucun thème n'est choisi. */
const NEUTRE = { fond: '#eef1f6', fondDoux: '#dfe5ee', accent: '#5b6472', encre: '#15181d' };

const encoder = (svg) => 'data:image/svg+xml;charset=utf-8,'
  + encodeURIComponent(svg.replace(/\s{2,}/g, ' ').trim());

// ----------------------------------------------------------------- primitives
//
// Chacune rend un fragment SVG dans le repère 1200 × 800. Elles ne connaissent
// que la palette : c'est ce qui permet à une même scène de passer de l'ambiance
// « nuit » à « chaleureux » sans qu'on y retouche.

/** Le fond : un dégradé vertical, jamais un aplat — un aplat n'a pas de jour. */
const fond = (c, haut = c.fondDoux, bas = c.fond) => `
  <defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${haut}"/><stop offset="1" stop-color="${bas}"/>
  </linearGradient></defs><rect width="1200" height="800" fill="url(#f)"/>`;

/** Le sol : une bande basse qui donne une assise à ce qu'on pose dessus. */
const sol = (c, y = 600) =>
  `<rect x="0" y="${y}" width="1200" height="${800 - y}" fill="${c.accent}" opacity=".13"/>`;

/** Une ombre portée douce, posée SOUS un objet pour le décoller du fond. */
const ombre = (c, x, y, rx) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${Math.max(6, rx * 0.13)}"
    fill="${c.encre}" opacity=".10"/>`;

/** Une fenêtre : deux battants et la lumière qui entre. */
const fenetre = (c, x, y, w, h) => `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 14}"
    fill="${c.fond}" opacity=".92"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 14}"
    fill="none" stroke="${c.accent}" stroke-width="7" opacity=".5"/>
  <line x1="${x + w / 2}" y1="${y}" x2="${x + w / 2}" y2="${y + h}"
    stroke="${c.accent}" stroke-width="7" opacity=".5"/>`;

/** Une suspension : la ligne et l'abat-jour. Trois d'affilée font une salle. */
const suspension = (c, x, y, r = 40) => `
  <line x1="${x}" y1="0" x2="${x}" y2="${y - r / 2}" stroke="${c.accent}"
    stroke-width="4" opacity=".45"/>
  <path d="M${x - r} ${y} L${x - r * 0.42} ${y - r * 0.95} L${x + r * 0.42} ${y - r * 0.95}
    L${x + r} ${y} Z" fill="${c.accent}" opacity=".62"/>`;

/** Une plante en pot : la touche qui fait « lieu » plutôt que « schéma ». */
const plante = (c, x, y, s = 1) => `
  <path d="M${x} ${y - 20 * s} C ${x - 70 * s} ${y - 120 * s} ${x - 40 * s} ${y - 210 * s}
    ${x} ${y - 230 * s} C ${x + 44 * s} ${y - 208 * s} ${x + 72 * s} ${y - 116 * s}
    ${x} ${y - 20 * s} Z" fill="${c.accent}" opacity=".5"/>
  <path d="M${x - 46 * s} ${y} h${92 * s} l${-14 * s} ${70 * s} h${-64 * s} Z"
    fill="${c.accent}" opacity=".75"/>`;

/** Une table vue de côté : plateau et pieds. */
const table = (c, x, y, w) => `
  <rect x="${x - w / 2}" y="${y}" width="${w}" height="16" rx="8"
    fill="${c.accent}" opacity=".78"/>
  <rect x="${x - w / 2 + 24}" y="${y + 16}" width="12" height="90" fill="${c.accent}" opacity=".55"/>
  <rect x="${x + w / 2 - 36}" y="${y + 16}" width="12" height="90" fill="${c.accent}" opacity=".55"/>`;

/** Une assiette vue de dessus : deux cercles, et le couvert à côté. */
const couvert = (c, x, y, r) => `
  ${ombre(c, x, y + r * 0.9, r)}
  <circle cx="${x}" cy="${y}" r="${r}" fill="${c.fond}" opacity=".95"/>
  <circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${c.accent}"
    stroke-width="5" opacity=".45"/>
  <circle cx="${x}" cy="${y}" r="${r * 0.6}" fill="${c.accent}" opacity=".18"/>
  <rect x="${x + r * 1.28}" y="${y - r * 0.6}" width="7" height="${r * 1.2}" rx="3.5"
    fill="${c.accent}" opacity=".55"/>
  <rect x="${x - r * 1.42}" y="${y - r * 0.6}" width="7" height="${r * 1.2}" rx="3.5"
    fill="${c.accent}" opacity=".55"/>`;

/** Un verre : le calice, le pied, l'embase. */
const verre = (c, x, y, s = 1) => `
  <path d="M${x - 20 * s} ${y - 92 * s} h${40 * s} l${-6 * s} ${52 * s}
    h${-28 * s} Z" fill="${c.accent}" opacity=".5"/>
  <rect x="${x - 2.5 * s}" y="${y - 40 * s}" width="${5 * s}" height="${30 * s}"
    fill="${c.accent}" opacity=".5"/>
  <rect x="${x - 16 * s}" y="${y - 12 * s}" width="${32 * s}" height="${6 * s}" rx="3"
    fill="${c.accent}" opacity=".5"/>`;

/** Une étagère et ce qu'on pose dessus : hauteurs variées, jamais régulières. */
const etagere = (c, x, y, w, hauteurs) => {
  const pas = w / hauteurs.length;
  const objets = hauteurs.map((h, i) => {
    const ox = x + pas * i + pas * 0.18;
    const ow = pas * 0.64;
    return `<rect x="${ox}" y="${y - h}" width="${ow}" height="${h}" rx="${ow / 5}"
      fill="${c.accent}" opacity="${(0.34 + (i % 3) * 0.14).toFixed(2)}"/>`;
  }).join('');
  return `${objets}<rect x="${x}" y="${y}" width="${w}" height="11" rx="5"
    fill="${c.accent}" opacity=".7"/>`;
};

/** Un portant : la barre, les cintres, les vêtements. */
const portant = (c, x, y, w) => {
  const n = 5;
  const pas = w / n;
  const pieces = Array.from({ length: n }, (_, i) => {
    const px = x + pas * i + pas / 2;
    const h = 150 + (i % 3) * 38;
    return `<path d="M${px} ${y + 6} l${-9} ${16}" stroke="${c.accent}" stroke-width="4"
        opacity=".6" fill="none"/>
      <path d="M${px - 42} ${y + 26} h84 l${-14} ${h} h${-56} Z"
        fill="${c.accent}" opacity="${(0.3 + (i % 3) * 0.16).toFixed(2)}"/>`;
  }).join('');
  return `<rect x="${x - 10}" y="${y}" width="${w + 20}" height="8" rx="4"
    fill="${c.accent}" opacity=".75"/>${pieces}`;
};

/** Des collines : l'horizon qui fait respirer une image d'hébergement. */
const collines = (c) => `
  <path d="M0 560 C 220 440 380 610 620 520 C 840 440 1010 540 1200 470 L1200 800 L0 800 Z"
    fill="${c.accent}" opacity=".22"/>
  <path d="M0 650 C 260 560 470 720 760 630 C 960 570 1080 640 1200 610 L1200 800 L0 800 Z"
    fill="${c.accent}" opacity=".38"/>`;

/** Une maison : le corps, le toit, la porte, une fenêtre. */
const maison = (c, x, y, s = 1) => `
  ${ombre(c, x, y + 8, 180 * s)}
  <path d="M${x - 150 * s} ${y - 110 * s} L${x} ${y - 230 * s} L${x + 150 * s} ${y - 110 * s} Z"
    fill="${c.accent}" opacity=".68"/>
  <rect x="${x - 125 * s}" y="${y - 115 * s}" width="${250 * s}" height="${115 * s}"
    fill="${c.accent}" opacity=".5"/>
  <rect x="${x - 26 * s}" y="${y - 72 * s}" width="${52 * s}" height="${72 * s}" rx="${6 * s}"
    fill="${c.fond}" opacity=".85"/>
  <rect x="${x + 48 * s}" y="${y - 92 * s}" width="${48 * s}" height="${40 * s}" rx="${5 * s}"
    fill="${c.fond}" opacity=".7"/>`;

/** Un histogramme qui monte : le geste du conseil, sans un chiffre inventé. */
const barres = (c, x, y, w, valeurs) => {
  const pas = w / valeurs.length;
  return valeurs.map((v, i) => `<rect x="${x + pas * i + pas * 0.2}" y="${y - v}"
    width="${pas * 0.6}" height="${v}" rx="${pas * 0.1}"
    fill="${c.accent}" opacity="${(0.32 + i * 0.12).toFixed(2)}"/>`).join('');
};

/** Un toit en construction et son échafaudage. */
const chantier = (c, x, y, s = 1) => {
  const montants = [0, 1, 2, 3].map((i) =>
    `<line x1="${x - 210 * s + i * 140 * s}" y1="${y}" x2="${x - 210 * s + i * 140 * s}"
      y2="${y - 290 * s}" stroke="${c.accent}" stroke-width="${8 * s}" opacity=".45"/>`).join('');
  const traverses = [0, 1, 2].map((i) =>
    `<line x1="${x - 210 * s}" y1="${y - 70 * s - i * 95 * s}" x2="${x + 210 * s}"
      y2="${y - 70 * s - i * 95 * s}" stroke="${c.accent}" stroke-width="${7 * s}" opacity=".4"/>`).join('');
  return `<path d="M${x - 190 * s} ${y - 120 * s} L${x} ${y - 250 * s}
      L${x + 190 * s} ${y - 120 * s} L${x + 190 * s} ${y} L${x - 190 * s} ${y} Z"
      fill="${c.accent}" opacity=".55"/>${montants}${traverses}`;
};

/** Un cercle de silhouettes : ce que fait une association, en une forme. */
const cercle = (c, x, y, r, n = 6) => Array.from({ length: n }, (_, i) => {
  const a = (Math.PI * 2 * i) / n - Math.PI / 2;
  const px = x + Math.cos(a) * r;
  const py = y + Math.sin(a) * r;
  return `<circle cx="${px.toFixed(1)}" cy="${(py - 34).toFixed(1)}" r="26"
      fill="${c.accent}" opacity="${(0.4 + (i % 3) * 0.15).toFixed(2)}"/>
    <path d="M${(px - 30).toFixed(1)} ${(py + 56).toFixed(1)}
      a30 42 0 0 1 60 0 Z" fill="${c.accent}" opacity="${(0.4 + (i % 3) * 0.15).toFixed(2)}"/>`;
}).join('');

/** Une piste : des couloirs qui fuient, et la ligne d'arrivée. */
const piste = (c) => {
  const lignes = [0, 1, 2, 3].map((i) =>
    `<line x1="${120 + i * 70}" y1="800" x2="${430 + i * 118}" y2="330"
      stroke="${c.fond}" stroke-width="9" opacity=".8"/>`).join('');
  return `<path d="M0 800 L330 300 L1200 300 L1200 800 Z" fill="${c.accent}" opacity=".4"/>${lignes}`;
};

/** Un nuancier : des pastilles alignées, le geste du métier créatif. */
const nuancier = (c, x, y) => [0, 1, 2, 3, 4].map((i) =>
  `${ombre(c, x + i * 130 + 60, y + 128, 58)}
   <rect x="${x + i * 130}" y="${y}" width="118" height="118" rx="16"
     fill="${c.accent}" opacity="${(0.24 + i * 0.16).toFixed(2)}"/>`).join('');

/** Des flacons alignés : l'étagère d'un institut. */
const flacons = (c, x, y) => [0, 1, 2, 3].map((i) => {
  const h = 110 + (i % 3) * 46;
  const px = x + i * 128;
  return `${ombre(c, px + 34, y + 6, 40)}
    <rect x="${px + 22}" y="${y - h - 26}" width="24" height="30" rx="6"
      fill="${c.accent}" opacity=".7"/>
    <rect x="${px}" y="${y - h}" width="68" height="${h}" rx="18"
      fill="${c.accent}" opacity="${(0.32 + (i % 3) * 0.16).toFixed(2)}"/>`;
}).join('');

// -------------------------------------------------------------------- scènes

/**
 * Les scènes, par métier. Trois chacune : une page en aligne souvent
 * plusieurs, et deux fois la même image signe le gabarit.
 *
 * Les identifiants de métier sont ceux de `core/brief.js`. Un métier absent
 * retombe sur `autre`, dont les scènes sont volontairement abstraites — c'est
 * le seul cas où l'on ne sait pas quoi évoquer.
 */
const SCENES = {
  restaurant: [
    (c) => `${fond(c)}${sol(c, 620)}${suspension(c, 300, 180)}${suspension(c, 600, 230, 48)}
      ${suspension(c, 900, 180)}${table(c, 600, 620, 620)}${verre(c, 420, 620)}
      ${verre(c, 780, 620, 0.85)}${plante(c, 140, 620, 0.8)}`,
    (c) => `${fond(c, c.fond, c.fondDoux)}${couvert(c, 600, 400, 190)}
      ${couvert(c, 220, 250, 90)}${couvert(c, 980, 560, 110)}${verre(c, 240, 640)}`,
    (c) => `${fond(c)}${sol(c, 650)}${fenetre(c, 160, 130, 300, 360)}
      ${fenetre(c, 740, 130, 300, 360)}${table(c, 600, 650, 460)}${plante(c, 1080, 650, 1)}`,
  ],
  alimentaire: [
    (c) => `${fond(c)}${sol(c, 640)}${etagere(c, 180, 420, 840, [120, 170, 96, 150, 134, 180])}
      ${etagere(c, 180, 640, 840, [160, 110, 190, 130, 170, 104])}`,
    (c) => `${fond(c, c.fond, c.fondDoux)}${ombre(c, 600, 640, 300)}
      ${[0, 1, 2].map((i) => `<ellipse cx="${380 + i * 220}" cy="${560 - i % 2 * 60}" rx="150" ry="96"
        fill="${c.accent}" opacity="${(0.3 + i * 0.16).toFixed(2)}"/>`).join('')}`,
    (c) => `${fond(c)}${sol(c, 600)}${fenetre(c, 420, 110, 360, 330)}
      ${etagere(c, 150, 600, 900, [140, 96, 176, 120, 160])}`,
  ],
  beaute: [
    (c) => `${fond(c)}${sol(c, 640)}${ombre(c, 600, 300, 200)}
      <circle cx="600" cy="290" r="190" fill="${c.fond}" opacity=".9"/>
      <circle cx="600" cy="290" r="190" fill="none" stroke="${c.accent}" stroke-width="12" opacity=".6"/>
      ${flacons(c, 320, 640)}`,
    (c) => `${fond(c, c.fond, c.fondDoux)}${sol(c, 660)}${flacons(c, 180, 660)}
      ${plante(c, 980, 660, 1.1)}`,
    (c) => `${fond(c)}${fenetre(c, 680, 120, 340, 400)}${sol(c, 650)}
      <circle cx="330" cy="320" r="150" fill="${c.accent}" opacity=".35"/>
      ${flacons(c, 200, 650)}`,
  ],
  batiment: [
    (c) => `${fond(c)}${sol(c, 660)}${chantier(c, 600, 660)}`,
    (c) => `${fond(c, c.fond, c.fondDoux)}${sol(c, 690)}${chantier(c, 380, 690, 0.8)}
      ${maison(c, 900, 690, 0.7)}`,
    (c) => `${fond(c)}${sol(c, 640)}
      ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${140 + (i % 3) * 300}" y="${260 + Math.floor(i / 3) * 190}"
        width="270" height="150" rx="10" fill="${c.accent}"
        opacity="${(0.26 + (i % 4) * 0.13).toFixed(2)}"/>`).join('')}`,
  ],
  sante: [
    (c) => `${fond(c, c.fond, c.fondDoux)}${sol(c, 660)}${fenetre(c, 420, 120, 360, 380)}
      ${plante(c, 950, 660, 1.2)}${plante(c, 230, 660, 0.85)}`,
    (c) => `${fond(c)}<circle cx="600" cy="400" r="250" fill="${c.accent}" opacity=".16"/>
      <circle cx="600" cy="400" r="160" fill="${c.accent}" opacity=".24"/>
      <rect x="560" y="310" width="80" height="180" rx="22" fill="${c.fond}" opacity=".9"/>
      <rect x="510" y="360" width="180" height="80" rx="22" fill="${c.fond}" opacity=".9"/>`,
    (c) => `${fond(c)}${sol(c, 680)}${fenetre(c, 140, 140, 300, 340)}
      ${table(c, 760, 600, 420)}${plante(c, 1070, 680, 0.9)}`,
  ],
  conseil: [
    (c) => `${fond(c)}${sol(c, 680)}${barres(c, 240, 620, 720, [180, 260, 210, 340, 420])}`,
    (c) => `${fond(c, c.fond, c.fondDoux)}${sol(c, 700)}${table(c, 600, 540, 760)}
      ${[0, 1, 2, 3].map((i) => `<circle cx="${330 + i * 180}" cy="${430}" r="52"
        fill="${c.accent}" opacity="${(0.32 + (i % 3) * 0.16).toFixed(2)}"/>`).join('')}`,
    (c) => `${fond(c)}<path d="M160 620 L400 470 L640 540 L900 300 L1060 360"
      stroke="${c.accent}" stroke-width="16" fill="none" opacity=".6" stroke-linecap="round"/>
      ${barres(c, 200, 700, 800, [90, 150, 120, 220, 180])}`,
  ],
  boutique: [
    (c) => `${fond(c)}${sol(c, 660)}${portant(c, 230, 260, 740)}`,
    (c) => `${fond(c, c.fond, c.fondDoux)}${sol(c, 640)}
      ${etagere(c, 160, 400, 880, [110, 150, 92, 140])}${portant(c, 300, 500, 600)}`,
    (c) => `${fond(c)}
      <path d="M100 240 h1000 l-60 130 h-880 Z" fill="${c.accent}" opacity=".55"/>
      ${fenetre(c, 260, 400, 680, 300)}${sol(c, 700)}`,
  ],
  creatif: [
    (c) => `${fond(c)}${sol(c, 660)}${nuancier(c, 270, 330)}${plante(c, 1060, 660, 0.9)}`,
    (c) => `${fond(c, c.fond, c.fondDoux)}
      <circle cx="420" cy="330" r="200" fill="${c.accent}" opacity=".32"/>
      <rect x="560" y="380" width="380" height="300" rx="28" fill="${c.accent}" opacity=".46"/>
      <path d="M720 150 L900 320 L540 320 Z" fill="${c.accent}" opacity=".24"/>`,
    (c) => `${fond(c)}${sol(c, 690)}${table(c, 600, 560, 720)}${nuancier(c, 320, 400)}`,
  ],
  hebergement: [
    (c) => `${fond(c, c.fond, c.fondDoux)}${collines(c)}${maison(c, 620, 620, 1)}`,
    (c) => `${fond(c)}${collines(c)}${maison(c, 360, 650, 0.68)}${maison(c, 850, 620, 0.9)}`,
    (c) => `${fond(c)}${sol(c, 660)}${fenetre(c, 620, 130, 420, 380)}
      <rect x="150" y="470" width="420" height="190" rx="26" fill="${c.accent}" opacity=".5"/>
      <rect x="180" y="420" width="150" height="70" rx="22" fill="${c.fond}" opacity=".8"/>`,
  ],
  association: [
    (c) => `${fond(c)}${sol(c, 700)}${cercle(c, 600, 420, 230, 6)}`,
    (c) => `${fond(c, c.fond, c.fondDoux)}${collines(c)}${cercle(c, 600, 430, 180, 5)}`,
    (c) => `${fond(c)}${sol(c, 690)}
      <path d="M200 180 h800 v180 l-400 -70 l-400 70 Z" fill="${c.accent}" opacity=".5"/>
      ${cercle(c, 600, 560, 190, 4)}`,
  ],
  sport: [
    (c) => `${fond(c)}${piste(c)}`,
    (c) => `${fond(c, c.fond, c.fondDoux)}${sol(c, 680)}
      ${[0, 1, 2].map((i) => `<rect x="${260 + i * 240}" y="${520 - i % 2 * 70}" width="180" height="52"
        rx="26" fill="${c.accent}" opacity="${(0.34 + i * 0.16).toFixed(2)}"/>
        <circle cx="${260 + i * 240}" cy="${546 - i % 2 * 70}" r="46" fill="${c.accent}"
        opacity="${(0.46 + i * 0.14).toFixed(2)}"/>
        <circle cx="${440 + i * 240}" cy="${546 - i % 2 * 70}" r="46" fill="${c.accent}"
        opacity="${(0.46 + i * 0.14).toFixed(2)}"/>`).join('')}`,
    (c) => `${fond(c)}<rect x="140" y="160" width="920" height="500" rx="18"
      fill="${c.accent}" opacity=".34"/>
      <circle cx="600" cy="410" r="110" fill="none" stroke="${c.fond}" stroke-width="10" opacity=".9"/>
      <line x1="600" y1="160" x2="600" y2="660" stroke="${c.fond}" stroke-width="10" opacity=".9"/>
      <rect x="140" y="300" width="130" height="220" fill="none" stroke="${c.fond}"
        stroke-width="10" opacity=".9"/>
      <rect x="930" y="300" width="130" height="220" fill="none" stroke="${c.fond}"
        stroke-width="10" opacity=".9"/>`,
  ],
  autre: [
    (c) => `${fond(c, c.accent, c.fondDoux)}`,
    (c) => `${fond(c)}<circle cx="880" cy="200" r="420" fill="${c.accent}" opacity=".22"/>
      <circle cx="300" cy="640" r="300" fill="${c.accent}" opacity=".16"/>
      <circle cx="620" cy="400" r="170" fill="${c.accent}" opacity=".3"/>`,
    (c) => `${fond(c)}
      <path d="M0 520 C 260 400 420 640 720 500 C 940 396 1080 470 1200 430 L1200 800 L0 800 Z"
        fill="${c.accent}" opacity=".26"/>
      <path d="M0 620 C 300 520 470 730 780 600 C 980 516 1090 580 1200 552 L1200 800 L0 800 Z"
        fill="${c.accent}" opacity=".42"/>`,
  ],
};

/** Les métiers qui ont leurs propres scènes. */
export const METIERS_ILLUSTRES = Object.keys(SCENES).filter((id) => id !== 'autre');

/**
 * Les images d'exemple d'un thème, pour un métier.
 *
 * @param {object|null} reglageTheme réglage d'ambiance
 * @param {string} [metierId] métier à évoquer ; sinon des formes abstraites
 * @returns {{id: string, url: string}[]}
 */
export function illustrations(reglageTheme, metierId = 'autre') {
  const theme = themeApplique(reglageTheme);
  const c = theme ? theme.couleurs : NEUTRE;
  const scenes = SCENES[metierId] || SCENES.autre;
  return scenes.map((dessin, rang) => ({
    id: `${metierId}-${rang}`,
    url: encoder(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"
      width="1200" height="800">${dessin(c)}</svg>`),
  }));
}

/** Une image d'exemple est-elle une image dessinée par le module ? */
export function estIllustration(url) {
  return String(url || '').startsWith('data:image/svg+xml');
}
