/**
 * La miniature d'un modèle de page.
 *
 * Une liste de barres grises ne dit rien : le client ne se projette pas dans
 * un schéma. Ici on dessine une vraie petite page — bandeau photographique,
 * cartes, colonnes déséquilibrées, blocs de texte — avec les couleurs de
 * l'ambiance retenue et les visuels dessinés par le module.
 *
 * C'est une miniature, pas un rendu : on ne charge pas la page entière dans
 * un cadre pour l'afficher gros comme un timbre. Mais elle a les bonnes
 * proportions, les bonnes couleurs et de vraies images, ce qui suffit à
 * reconnaître ce qu'on va obtenir.
 * @module ui/apercu-page
 */
import { h } from './el.js';
import { themeById } from '../core/theme.js';
import { illustrations } from '../core/illustrations.js';

/** Palette de repli quand aucune ambiance n'est choisie. */
const NEUTRE = {
  fond: '#ffffff', fondDoux: '#f2f4f7', encre: '#1b1f27',
  doux: '#8b93a1', accent: '#4d8bf5', surAccent: '#ffffff',
};

/**
 * Dessine la miniature.
 *
 * @param {Array} bandes description de la page, de haut en bas. Chaque entrée
 *   est une chaîne (`'titre'`, `'texte'`, `'bande'`) ou un objet
 *   (`{ type:'hero'|'cartes'|'duo', n, ratio, hauteur }`).
 * @param {{id?:string}|null} theme réglage d'ambiance du site
 * @returns {HTMLElement}
 */
export function apercuPage(bandes, theme) {
  const t = themeById(theme?.id);
  const c = t ? t.couleurs : NEUTRE;
  const visuels = illustrations(theme);
  let rang = 0;
  const image = () => visuels[(rang++) % visuels.length].url;

  const vue = h('div', { class: 'mini', style: { background: c.fond } });

  const trait = (largeur, teinte, hauteur = 3) => h('span', {
    class: 'mini__trait',
    style: { width: largeur, height: hauteur + 'px', background: teinte },
  });

  const photo = (hauteur) => h('span', {
    class: 'mini__photo',
    style: { height: hauteur + 'px', backgroundImage: `url("${image()}")` },
  });

  for (const brut of bandes) {
    const bande = typeof brut === 'string' ? { type: brut } : brut;

    switch (bande.type) {
      // Le bandeau : une photo, et du texte par-dessus. C'est ce qui se
      // reconnaît au premier coup d'œil.
      case 'hero': {
        vue.appendChild(h('span', {
          class: 'mini__hero',
          style: { height: (bande.hauteur || 34) + 'px', backgroundImage: `url("${image()}")` },
        },
          h('span', { class: 'mini__voile' }),
          h('span', { class: 'mini__heroTexte' },
            trait('54%', 'rgba(255,255,255,.92)', 5),
            trait('34%', 'rgba(255,255,255,.55)', 2),
            h('span', { class: 'mini__pastille', style: { background: c.accent } })),
        ));
        break;
      }

      case 'cartes': {
        const combien = bande.n || 3;
        vue.appendChild(h('span', { class: 'mini__bloc' },
          trait('40%', c.encre, 4),
          h('span', { class: 'mini__rang' },
            Array.from({ length: combien }, () => h('span', { class: 'mini__carte' },
              photo(bande.hauteur || 22),
              h('span', { class: 'mini__carteTexte' }, trait('70%', 'rgba(255,255,255,.9)', 2)))))));
        break;
      }

      case 'duo': {
        const [a, b] = bande.ratio === '2-1' ? ['2fr', '1fr']
          : bande.ratio === '1-2' ? ['1fr', '2fr'] : ['1fr', '1fr'];
        const colonneTexte = h('span', { class: 'mini__col' },
          trait('62%', c.encre, 4), trait('96%', c.doux, 2), trait('88%', c.doux, 2),
          trait('44%', c.accent, 2));
        vue.appendChild(h('span', {
          class: 'mini__bloc mini__duo', style: { gridTemplateColumns: `${a} ${b}` },
        }, bande.image === 'gauche'
          ? [photo(bande.hauteur || 30), colonneTexte]
          : [colonneTexte, photo(bande.hauteur || 30)]));
        break;
      }

      case 'texte':
        vue.appendChild(h('span', { class: 'mini__bloc mini__centre' },
          trait('46%', c.encre, 4), trait('76%', c.doux, 2), trait('64%', c.doux, 2)));
        break;

      case 'bande':
        vue.appendChild(h('span', {
          class: 'mini__bande', style: { background: c.fondDoux },
        }, trait('40%', c.encre, 4), trait('26%', c.doux, 2)));
        break;

      case 'photo':
        vue.appendChild(photo(bande.hauteur || 26));
        break;

      default:
        vue.appendChild(h('span', { class: 'mini__bloc' }, trait('50%', c.encre, 4)));
    }
  }

  return vue;
}
