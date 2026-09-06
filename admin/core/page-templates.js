/**
 * Modèles de page entière.
 *
 * Une page se compose de plusieurs sections : ces modèles en posent la
 * trame complète — accueil une page, page de vente, portfolio, contact,
 * à propos. Comme les modèles de section, ce sont des arbres de widgets :
 * ils apportent la structure et le texte d'exemple, la typographie et les
 * couleurs viennent du site.
 * @module core/page-templates
 */
import { w, section } from './templates.js';

const T = (texte) => ({ html: texte });

export const PAGE_TEMPLATES = [
  {
    id: 'onepage',
    apercu: ['bar', 'trio', 'duo', 'trio'],
    build: () => [
      section([
        w('heading', { text: 'Le titre de votre site', level: 'h2', align: 'center' }),
        w('text', { ...T('Une phrase qui dit en quelques mots ce que vous proposez et à qui.'), align: 'center' }),
        w('spacer', { height: 20 }),
        w('button', { text: 'Nous contacter', href: 'contact.html', align: 'center' }),
      ], { padding: 88 }),
      section([
        w('heading', { text: 'Ce que nous proposons', level: 'h2', align: 'center' }),
        w('spacer', { height: 24 }),
        w('columns', { count: 3 }, [
          [w('heading', { text: 'Première offre', level: 'h3' }), w('text', T('Décrivez cette offre en une ou deux phrases.'))],
          [w('heading', { text: 'Deuxième offre', level: 'h3' }), w('text', T('Décrivez cette offre en une ou deux phrases.'))],
          [w('heading', { text: 'Troisième offre', level: 'h3' }), w('text', T('Décrivez cette offre en une ou deux phrases.'))],
        ]),
      ]),
      section([
        w('columns', { count: 2, gap: 40 }, [
          [w('image', { alt: '' })],
          [
            w('heading', { text: 'Qui nous sommes', level: 'h2' }),
            w('text', T('Racontez votre histoire, votre métier, ce qui vous distingue.')),
            w('spacer', { height: 12 }),
            w('button', { text: 'En savoir plus', href: '#' }),
          ],
        ]),
      ]),
      section([
        w('heading', { text: 'En images', level: 'h2', align: 'center' }),
        w('spacer', { height: 20 }),
        w('columns', { count: 3, gap: 16 }, [[w('image', { alt: '' })], [w('image', { alt: '' })], [w('image', { alt: '' })]]),
      ]),
      section([
        w('columns', { count: 2, gap: 40 }, [
          [
            w('heading', { text: 'Nous trouver', level: 'h2' }),
            w('text', T('Adresse, téléphone, horaires d’ouverture.')),
            w('spacer', { height: 12 }),
            w('button', { text: 'Nous écrire', href: 'mailto:contact@exemple.fr' }),
          ],
          [w('map', { query: '', height: 300 })],
        ]),
      ]),
    ],
  },

  {
    id: 'vente',
    apercu: ['bar', 'trio', 'duo', 'bar'],
    build: () => [
      section([
        w('heading', { text: 'La promesse, en une phrase', level: 'h2', align: 'center' }),
        w('text', { ...T('Précisez à qui vous vous adressez et le résultat obtenu.'), align: 'center' }),
        w('spacer', { height: 20 }),
        w('button', { text: 'Je me lance', href: '#offre', align: 'center' }),
      ], { padding: 88 }),
      section([
        w('heading', { text: 'Trois bonnes raisons', level: 'h2', align: 'center' }),
        w('spacer', { height: 24 }),
        w('columns', { count: 3 }, [
          [w('heading', { text: 'Gain de temps', level: 'h3' }), w('text', T('Expliquez le bénéfice concret.'))],
          [w('heading', { text: 'Tranquillité', level: 'h3' }), w('text', T('Expliquez le bénéfice concret.'))],
          [w('heading', { text: 'Résultat', level: 'h3' }), w('text', T('Expliquez le bénéfice concret.'))],
        ]),
      ]),
      section([
        w('columns', { count: 2, gap: 40 }, [
          [w('image', { alt: '' })],
          [
            w('heading', { text: 'Comment ça se passe', level: 'h2' }),
            w('list', { items: 'Premier temps : le point de départ\nDeuxième temps : la mise en place\nTroisième temps : le résultat' }),
          ],
        ]),
      ]),
      section([
        w('text', { ...T('« Une phrase de client satisfait, courte et précise. »'), align: 'center' }),
        w('text', { ...T('Prénom, ville'), align: 'center' }),
      ]),
      section([
        w('heading', { text: 'Ce qui est compris', level: 'h2' }),
        w('list', { items: 'Premier élément\nDeuxième élément\nTroisième élément\nQuatrième élément' }),
        w('spacer', { height: 20 }),
        w('button', { text: 'Commander', href: 'contact.html' }),
      ]),
    ],
  },

  {
    id: 'portfolio',
    apercu: ['bar', 'trio', 'trio', 'duo'],
    build: () => [
      section([
        w('heading', { text: 'Mon travail', level: 'h2' }),
        w('text', T('Une ligne pour situer votre pratique et vos domaines.')),
      ], { padding: 72 }),
      section([
        w('columns', { count: 3, gap: 16 }, [[w('image', { alt: '' })], [w('image', { alt: '' })], [w('image', { alt: '' })]]),
        w('spacer', { height: 16 }),
        w('columns', { count: 3, gap: 16 }, [[w('image', { alt: '' })], [w('image', { alt: '' })], [w('image', { alt: '' })]]),
      ]),
      section([
        w('columns', { count: 2, gap: 40 }, [
          [w('heading', { text: 'À propos', level: 'h2' }), w('text', T('Votre parcours, vos outils, votre façon de travailler.'))],
          [w('heading', { text: 'Me contacter', level: 'h3' }), w('text', T('Disponibilités et façon de vous joindre.')), w('spacer', { height: 12 }), w('button', { text: 'Écrire', href: 'mailto:contact@exemple.fr' })],
        ]),
      ]),
    ],
  },

  {
    id: 'contact',
    apercu: ['bar', 'duo', 'bar'],
    build: () => [
      section([
        w('heading', { text: 'Nous contacter', level: 'h2' }),
        w('text', T('Le meilleur moyen de nous joindre, et sous quel délai vous aurez une réponse.')),
      ], { padding: 72 }),
      section([
        w('columns', { count: 2, gap: 40 }, [
          [
            w('heading', { text: 'Coordonnées', level: 'h3' }),
            w('list', { items: 'Adresse : 1 rue de l’Exemple\nTéléphone : 00 00 00 00 00\nCourriel : contact@exemple.fr' }),
            w('spacer', { height: 12 }),
            w('button', { text: 'Écrire un message', href: 'mailto:contact@exemple.fr' }),
          ],
          [w('map', { query: '', height: 320 })],
        ]),
      ]),
      section([
        w('heading', { text: 'Horaires', level: 'h3' }),
        w('list', { items: 'Lundi au vendredi : 9 h – 18 h\nSamedi : 10 h – 17 h\nDimanche : fermé' }),
      ]),
    ],
  },

  {
    id: 'apropos',
    apercu: ['bar', 'duo', 'trio'],
    build: () => [
      section([
        w('heading', { text: 'Notre histoire', level: 'h2', align: 'center' }),
        w('text', { ...T('Une phrase qui résume d’où vous venez et où vous allez.'), align: 'center' }),
      ], { padding: 80 }),
      section([
        w('columns', { count: 2, gap: 40 }, [
          [w('image', { alt: '' })],
          [w('heading', { text: 'Comment tout a commencé', level: 'h3' }), w('text', T('Racontez le début, les personnes, le lieu.'))],
        ]),
      ]),
      section([
        w('heading', { text: 'Ce à quoi nous tenons', level: 'h2', align: 'center' }),
        w('spacer', { height: 24 }),
        w('columns', { count: 3 }, [
          [w('heading', { text: 'Première valeur', level: 'h3' }), w('text', T('Ce qu’elle signifie au quotidien.'))],
          [w('heading', { text: 'Deuxième valeur', level: 'h3' }), w('text', T('Ce qu’elle signifie au quotidien.'))],
          [w('heading', { text: 'Troisième valeur', level: 'h3' }), w('text', T('Ce qu’elle signifie au quotidien.'))],
        ]),
      ]),
    ],
  },
];

export function findPageTemplate(id) {
  return PAGE_TEMPLATES.find((m) => m.id === id) || null;
}
