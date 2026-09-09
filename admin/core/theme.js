/**
 * Thèmes : l'allure générale du site.
 *
 * Les modèles de page n'apportent que la STRUCTURE — c'est voulu : sur un
 * site existant, une mise en page qui imposerait ses couleurs jurerait avec
 * le reste. Mais sur une page vierge, il n'y a pas de « reste » : tous les
 * modèles se ressemblent alors, faute de style à hériter.
 *
 * Le thème comble ce vide. Il ne touche à aucun HTML : il écrit une feuille
 * de style dans le `<head>`, dérivée d'une poignée de valeurs (deux polices,
 * sept couleurs, des rayons, un rythme). Cette feuille est conservée à la
 * régénération du HTML, donc le site garde son allure même sans le module.
 *
 * Deux portées, parce que les deux situations n'ont rien à voir :
 *   - `site`  — la feuille habille tout le document. C'est ce qu'on veut sur
 *               une page vierge, où le thème EST le style du site.
 *   - `blocs` — la feuille ne descend que dans les sections ajoutées par le
 *               module. C'est ce qu'on veut sur un site existant : le code du
 *               client n'est pas touché, seuls les blocs ajoutés s'habillent.
 *
 * @module core/theme
 */
import { fontStack } from './fonts.js';
import { CUSTOM_STYLE_ID } from './style.js';

/** Identifiant de la feuille de style écrite dans le `<head>`. */
export const THEME_STYLE_ID = 'admin-theme';

/** Portées possibles, de la plus large à la plus prudente. */
export const PORTEES_THEME = ['site', 'blocs'];

/**
 * Les thèmes proposés.
 *
 * Chacun est un accord complet — un couple de polices, une palette, une
 * forme de bouton, un rythme vertical — et non un assortiment de réglages
 * indépendants : c'est ce qui fait qu'un site tient debout sans directeur
 * artistique.
 */
export const THEMES = [
  {
    id: 'sobre',
    police: { titres: 'Inter', textes: 'Inter' },
    couleurs: {
      fond: '#ffffff', fondDoux: '#f6f7f9', encre: '#15181d', doux: '#5b6472',
      trait: '#e5e8ec', accent: '#15181d', surAccent: '#ffffff',
    },
    formes: { rayon: 8, rayonBouton: 999, bouton: 'plein', casse: 'normale', graisseTitres: 600, chasseTitres: '-.02em' },
    rythme: { corps: 17, interligne: 1.65, section: 72, largeur: 1060, echelle: 1 },
  },
  {
    id: 'chaleureux',
    police: { titres: 'Fraunces', textes: 'Work Sans' },
    couleurs: {
      fond: '#fbf7f1', fondDoux: '#f3ebe0', encre: '#2c2118', doux: '#6b5b4b',
      trait: '#e4d9c9', accent: '#b4622e', surAccent: '#ffffff',
    },
    formes: { rayon: 14, rayonBouton: 999, bouton: 'plein', casse: 'normale', graisseTitres: 500, chasseTitres: '-.01em' },
    rythme: { corps: 17, interligne: 1.7, section: 84, largeur: 1080, echelle: 1.05 },
  },
  {
    id: 'elegant',
    police: { titres: 'Playfair Display', textes: 'Lato' },
    couleurs: {
      fond: '#ffffff', fondDoux: '#f7f5f1', encre: '#1a1a1a', doux: '#6a6a6a',
      trait: '#e6e2da', accent: '#a08048', surAccent: '#ffffff',
    },
    formes: { rayon: 0, rayonBouton: 0, bouton: 'contour', casse: 'majuscules', graisseTitres: 500, chasseTitres: '.01em' },
    rythme: { corps: 17, interligne: 1.75, section: 96, largeur: 1100, echelle: 1.1 },
  },
  {
    id: 'nuit',
    police: { titres: 'Manrope', textes: 'Manrope' },
    couleurs: {
      fond: '#0e1117', fondDoux: '#161b24', encre: '#e9edf4', doux: '#9aa6b8',
      trait: '#232b38', accent: '#6c8cff', surAccent: '#0b0e14',
    },
    formes: { rayon: 12, rayonBouton: 10, bouton: 'plein', casse: 'normale', graisseTitres: 700, chasseTitres: '-.03em' },
    rythme: { corps: 17, interligne: 1.65, section: 80, largeur: 1080, echelle: 1 },
  },
  {
    id: 'naturel',
    police: { titres: 'Lora', textes: 'Karla' },
    couleurs: {
      fond: '#f5f7f2', fondDoux: '#e9efe3', encre: '#22301f', doux: '#55684f',
      trait: '#d7e0cd', accent: '#3d6b45', surAccent: '#ffffff',
    },
    formes: { rayon: 10, rayonBouton: 999, bouton: 'plein', casse: 'normale', graisseTitres: 600, chasseTitres: '0' },
    rythme: { corps: 17, interligne: 1.7, section: 80, largeur: 1040, echelle: 1 },
  },
  {
    id: 'pep',
    police: { titres: 'Poppins', textes: 'Poppins' },
    couleurs: {
      fond: '#ffffff', fondDoux: '#fff4f1', encre: '#14161c', doux: '#5a6070',
      trait: '#ffe0d8', accent: '#ff4d3d', surAccent: '#ffffff',
    },
    formes: { rayon: 18, rayonBouton: 999, bouton: 'plein', casse: 'normale', graisseTitres: 600, chasseTitres: '-.02em' },
    rythme: { corps: 17, interligne: 1.7, section: 88, largeur: 1100, echelle: 1.05 },
  },
  {
    id: 'pro',
    police: { titres: 'DM Sans', textes: 'DM Sans' },
    couleurs: {
      fond: '#ffffff', fondDoux: '#f2f6fb', encre: '#0f1b2d', doux: '#56637a',
      trait: '#dde5f0', accent: '#1a56db', surAccent: '#ffffff',
    },
    formes: { rayon: 6, rayonBouton: 6, bouton: 'plein', casse: 'normale', graisseTitres: 700, chasseTitres: '-.02em' },
    rythme: { corps: 16, interligne: 1.65, section: 76, largeur: 1140, echelle: 1 },
  },
  {
    id: 'magazine',
    police: { titres: 'Newsreader', textes: 'Inter' },
    couleurs: {
      fond: '#ffffff', fondDoux: '#f4f3f0', encre: '#14130f', doux: '#55534c',
      trait: '#dedbd2', accent: '#b4271f', surAccent: '#ffffff',
    },
    formes: { rayon: 2, rayonBouton: 2, bouton: 'souligne', casse: 'normale', graisseTitres: 500, chasseTitres: '-.01em' },
    rythme: { corps: 18, interligne: 1.7, section: 68, largeur: 980, echelle: 1.1 },
  },
  {
    id: 'brut',
    police: { titres: 'Space Grotesk', textes: 'Space Grotesk' },
    couleurs: {
      fond: '#f2f1ec', fondDoux: '#e6e4dc', encre: '#111111', doux: '#4d4d47',
      trait: '#111111', accent: '#111111', surAccent: '#f2f1ec',
    },
    formes: { rayon: 0, rayonBouton: 0, bouton: 'contour', casse: 'majuscules', graisseTitres: 700, chasseTitres: '-.03em' },
    rythme: { corps: 17, interligne: 1.6, section: 72, largeur: 1100, echelle: 1 },
  },
];

const PAR_ID = new Map(THEMES.map((theme) => [theme.id, theme]));

/** Retrouve un thème, ou null (« aucun thème » est une réponse valable). */
export function themeById(id) {
  return PAR_ID.get(String(id || '').trim()) || null;
}

/** Les familles employées par un thème, pour la balise de chargement. */
export function policesDuTheme(reglage) {
  const theme = themeById(reglage?.id);
  if (!theme) return [];
  return [...new Set([theme.police.titres, theme.police.textes])];
}

/** Une couleur en `rgb(...)`, pour composer une transparence. */
function canaux(hex) {
  const v = String(hex || '').replace('#', '');
  const plein = v.length === 3 ? v.split('').map((c) => c + c).join('') : v;
  const n = parseInt(plein, 16);
  if (!Number.isFinite(n) || plein.length !== 6) return '0,0,0';
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

/** Déclarations du bouton, selon la forme retenue par le thème. */
function declBouton(theme) {
  const { couleurs: c, formes: f } = theme;
  const rayon = `${f.rayonBouton}px`;
  if (f.bouton === 'contour') {
    return {
      normal: `display:inline-block;padding:12px 26px;border:2px solid ${c.accent};border-radius:${rayon};`
        + `background:transparent;color:${c.accent};text-decoration:none;font-weight:600;`
        + `letter-spacing:.06em;text-transform:${f.casse === 'majuscules' ? 'uppercase' : 'none'};`
        + 'font-size:.86em;transition:background .15s,color .15s;',
      survol: `background:${c.accent};color:${c.surAccent};`,
    };
  }
  if (f.bouton === 'souligne') {
    return {
      normal: `display:inline-block;padding:4px 0;border:0;border-bottom:2px solid ${c.accent};`
        + `border-radius:0;background:none;color:${c.encre};text-decoration:none;font-weight:600;`
        + 'transition:color .15s;',
      survol: `color:${c.accent};`,
    };
  }
  return {
    normal: `display:inline-block;padding:13px 28px;border:0;border-radius:${rayon};`
      + `background:${c.accent};color:${c.surAccent};text-decoration:none;font-weight:600;`
      + `text-transform:${f.casse === 'majuscules' ? 'uppercase' : 'none'};transition:opacity .15s;`,
    survol: 'opacity:.85;',
  };
}

/**
 * La feuille de style d'un thème.
 *
 * @param {object} theme
 * @param {'site'|'blocs'} portee
 * @returns {string} CSS
 */
export function cssDuTheme(theme, portee = 'site') {
  if (!theme) return '';
  const { couleurs: c, formes: f, rythme: r } = theme;
  const titres = fontStack(theme.police.titres) || 'Georgia, "Times New Roman", serif';
  const textes = fontStack(theme.police.textes) || 'system-ui, -apple-system, sans-serif';
  const blocs = portee === 'blocs';
  const bouton = declBouton(theme);
  const e = r.echelle || 1;
  const rem = (base) => (base * e).toFixed(2) + 'rem';

  // En portée « blocs », toute règle descend dans les sections ajoutées : le
  // code du client n'est jamais visé.
  const racine = blocs ? '[data-admin-section]' : 'body';
  const dans = (selecteurs) => selecteurs
    .split(',')
    .map((s) => (blocs ? `[data-admin-section] ${s.trim()}` : s.trim()))
    .join(', ');

  const regles = [
    // Les variables servent aussi de passerelle : la page de départ livrée
    // avec le module est écrite sur ces noms-là, donc elle suit le thème
    // jusque dans ses propres règles.
    `:root{
  --admin-fond:${c.fond}; --admin-fond-doux:${c.fondDoux}; --admin-encre:${c.encre};
  --admin-doux:${c.doux}; --admin-trait:${c.trait}; --admin-accent:${c.accent};
  --admin-sur-accent:${c.surAccent}; --admin-accent-rgb:${canaux(c.accent)};
  --admin-largeur:${r.largeur}px; --admin-rayon:${f.rayon}px;
  --admin-police-titres:${titres}; --admin-police-textes:${textes};
  --fond:${c.fond}; --fond-doux:${c.fondDoux}; --encre:${c.encre}; --doux:${c.doux};
  --trait:${c.trait}; --accent:${c.accent}; --largeur:${r.largeur}px;
}`,

    `${racine}{
  background:${c.fond}; color:${c.encre};
  font-family:${textes}; font-size:${r.corps}px; line-height:${r.interligne};
  -webkit-font-smoothing:antialiased;
}`,

    `${dans('h1, h2, h3, h4, h5, h6')}{
  font-family:${titres}; color:${c.encre}; font-weight:${f.graisseTitres};
  letter-spacing:${f.chasseTitres}; line-height:1.18; margin-bottom:.5em;
  text-transform:${f.casse === 'majuscules' ? 'uppercase' : 'none'};
}`,
    `${dans('h1')}{ font-size:clamp(2rem, 5vw, ${rem(3.2)}) }`,
    `${dans('h2')}{ font-size:clamp(1.55rem, 3.4vw, ${rem(2.2)}) }`,
    `${dans('h3')}{ font-size:${rem(1.25)} }`,
    `${dans('p, li')}{ color:${c.doux} }`,
    `${dans('p')}{ margin-bottom:1em }`,
    `${dans('strong, b')}{ color:${c.encre} }`,
    `${dans('a')}{ color:${c.accent} }`,
    `${dans('img')}{ border-radius:${f.rayon}px; max-width:100%; display:block }`,
    `${dans('hr')}{ border:0; border-top:1px solid ${c.trait}; margin:2em 0 }`,
    `${dans('blockquote')}{
  border-left:3px solid ${c.accent}; padding-left:18px; color:${c.doux}; font-style:italic;
}`,

    // Le bouton de l'éditeur est un lien seul dans un bloc : c'est cette
    // forme-là qu'on habille, plus la classe pour ceux qui la posent à la main.
    `${dans('div > a:only-child:not(:has(img)), .bouton')}{ ${bouton.normal} }`,
    `${dans('div > a:only-child:not(:has(img)):hover, .bouton:hover')}{ ${bouton.survol} }`,
  ];

  if (blocs) {
    regles.push(
      `[data-admin-section]{ padding:${r.section}px 24px }`,
      `[data-admin-section] > *{ max-width:${r.largeur}px; margin-left:auto; margin-right:auto }`,
    );
  } else {
    regles.push(
      `section{ padding:${r.section}px 24px }`,
      `section > *{ max-width:${r.largeur}px; margin-left:auto; margin-right:auto }`,
      `section:nth-of-type(even){ background:${c.fondDoux} }`,
      `header, footer{ background:${c.fond}; color:${c.encre} }`,
      `footer{ border-top:1px solid ${c.trait} }`,
    );
  }

  // Les colonnes sont émises avec un nombre de pistes fixe : sans cela, trois
  // colonnes restent trois colonnes sur un téléphone, larges de rien.
  regles.push(
    `@media (max-width:760px){
  [data-admin-section] [style*="grid-template-columns"]{ grid-template-columns:1fr !important }
  ${blocs ? '[data-admin-section]' : 'section'}{ padding:${Math.round(r.section * 0.62)}px 18px }
}`,
  );

  return regles.join('\n');
}

/**
 * Écrit (ou retire) la feuille du thème dans un document.
 *
 * Elle est posée AVANT la feuille des CSS personnalisés : ce que le client
 * écrit lui-même pour un bloc doit toujours l'emporter sur le thème.
 *
 * @param {Document} doc
 * @param {{id?:string, portee?:string}|null} reglage
 */
export function writeThemeSheet(doc, reglage) {
  const theme = themeById(reglage?.id);
  let feuille = doc.getElementById(THEME_STYLE_ID);

  if (!theme) { if (feuille) feuille.remove(); return; }

  const css = cssDuTheme(theme, reglage?.portee === 'blocs' ? 'blocs' : 'site');
  if (!feuille) {
    feuille = doc.createElement('style');
    feuille.id = THEME_STYLE_ID;
    const perso = doc.getElementById(CUSTOM_STYLE_ID);
    if (perso) perso.before(feuille); else doc.head.appendChild(feuille);
  }
  if (feuille.textContent !== css) feuille.textContent = css;
}
