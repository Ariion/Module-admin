/**
 * Tableau de bord : le premier écran, et souvent le seul qu'on regarde.
 *
 * Il ne sert pas à décorer. Il répond à trois questions, dans cet ordre :
 * par où je commence, qu'est-ce qui attend d'être publié, et combien de
 * choses j'ai. Le reste — graphiques, courbes de visites — ne dit rien à
 * quelqu'un qui n'a pas encore fini son site.
 *
 * Les chiffres sont cliquables : un compteur qui ne mène nulle part oblige
 * à retrouver l'écran correspondant dans le menu.
 * @module ui/back/tableau
 */
import { h, icon } from '../el.js';
import { teteEcran } from './shell-back.js';

/**
 * @param {object} options
 * @param {Function} options.t
 * @param {Function} options.etat renvoie l'inventaire du site (asynchrone)
 * @param {Function} options.aller navigation vers un autre écran
 * @param {Function} options.onGuide ouvre le parcours de création
 */
export function creerTableau({ t, etat, aller, onGuide, genre }) {
  return async function dessiner(page) {
    page.appendChild(teteEcran(t('boTableau'), t('boTableauAide')));

    const chargement = h('div', { class: 'charge' }, t('boChargement'));
    page.appendChild(chargement);

    const inv = await etat();
    chargement.remove();

    // La première question est celle du genre de site : c'est elle qui
    // décide de ce qu'on verra à gauche. Tant qu'on n'y a pas répondu, le
    // menu ne montre que le socle, et proposer « commencer » avant serait
    // envoyer quelqu'un construire sans lui avoir demandé quoi.
    if (!inv.genreChoisi) {
      page.appendChild(genre());
    } else if (inv.vierge) {
      page.appendChild(h('div', { class: 'depart' },
        h('h2', {}, t('boDepartTitre')),
        h('p', {}, t('boDepartAide')),
        h('button', { class: 'b', type: 'button', onclick: () => onGuide() },
          icon('pencil', 14), t('boDepartAction')),
      ));
    }

    const chiffre = (icone, libelle, valeur, note, cible) => h('button', {
      class: 'chiffre', type: 'button', onclick: () => aller(cible),
    },
      h('div', { class: 'chiffre__haut' }, icon(icone, 14), h('span', {}, libelle)),
      h('div', { class: 'chiffre__val' }, String(valeur)),
      h('div', { class: 'chiffre__note' }, note),
    );

    page.appendChild(h('div', { class: 'chiffres' },
      chiffre('pages', t('boPages'), inv.pages,
        inv.pages ? t('boPagesNote', inv.pages) : t('boPagesVide'), 'pages'),
      chiffre('list', t('boContenus'), inv.contenus,
        inv.types.length ? inv.types.map((x) => x.nom).join(' · ') : t('boContenusVide'), 'contenus'),
      chiffre('image', t('boMedias'), inv.medias,
        inv.medias ? t('boMediasNote') : t('boMediasVide'), 'medias'),
      chiffre('grid', t('boProduits'), inv.produits,
        inv.produits ? t('boProduitsNote') : t('boProduitsVide'), 'produits'),
    ));

    page.appendChild(h('div', { class: 'colonnes' },
      carteEnAttente(t, inv, aller),
      carteRepere(t, inv),
    ));
  };
}

/** Ce qui est modifié mais pas encore en ligne. Le vrai sujet d'un client. */
function carteEnAttente(t, inv, aller) {
  const corps = h('div', { class: 'carte__corps', style: { padding: '0' } });

  if (!inv.brouillons.length) {
    corps.style.padding = '16px';
    corps.appendChild(h('p', { style: { color: 'var(--doux)' } }, t('boRienEnAttente')));
  } else {
    corps.appendChild(h('table', { class: 'table' },
      h('tbody', {}, inv.brouillons.map((b) => h('tr', {},
        h('td', { class: 'table__nom' },
          h('button', { type: 'button', onclick: () => aller('pages', b.chemin) }, b.nom),
          h('div', { class: 'table__meta' }, b.chemin)),
        h('td', { class: 'table__actions' },
          h('span', { class: 'etat etat--brouillon' }, icon('warn', 11), t('unpublished'))),
      ))),
    ));
  }

  return h('div', { class: 'carte' },
    h('div', { class: 'carte__tete' }, icon('upload', 14), t('boEnAttente')),
    corps,
  );
}

/**
 * Le rappel du partage des rôles. Il n'est pas décoratif : sans lui, on
 * cherche longtemps où écrire ses textes, puisque le back-office n'en
 * propose nulle part.
 */
function carteRepere(t, inv) {
  const ligne = (icone, titre, texte) => h('div', { style: { display: 'flex', gap: '11px', marginBottom: '14px' } },
    h('span', { style: { color: 'var(--accent)', flex: 'none', marginTop: '2px' } }, icon(icone, 15)),
    h('div', {},
      h('div', { style: { fontWeight: '620' } }, titre),
      h('div', { style: { color: 'var(--doux)', fontSize: '13px' } }, texte),
    ),
  );

  return h('div', { class: 'carte' },
    h('div', { class: 'carte__tete' }, icon('layers', 14), t('boRepereTitre')),
    h('div', { class: 'carte__corps' },
      ligne('section', t('boRepereBackTitre'), t('boRepereBackAide')),
      ligne('pencil', t('boRepereLiveTitre'), t('boRepereLiveAide')),
      inv.exemples
        ? h('div', { class: 'note' }, icon('warn', 14),
          h('span', {}, t('boRepereExemples', inv.exemples)))
        : null,
    ),
  );
}
