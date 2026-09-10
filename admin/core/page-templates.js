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
    id: 'editorial',
    pour: ['vitrine', 'portfolio'], resume: 3,
    apercu: ['bar', 'trio', 'duo', 'bar'],
    build: () => [
      // Un bandeau plein cadre : l'image porte la page, le texte se pose
      // dessus. C'est la première chose qu'on voit sur les mises en page
      // qu'on admire, et une section ordinaire ne sait pas le faire.
      w('hero', { hauteur: 'grande', voile: 45, align: 'center' }, [
        w('etiquette', { text: 'Depuis 1974', align: 'center' }),
        w('heading', { text: 'Le titre de votre site', level: 'h2', align: 'center' }),
        w('text', { ...T('Une phrase qui dit en quelques mots ce que vous proposez.'), align: 'center' }),
        w('spacer', { height: 24 }),
        w('button', { text: 'Nous découvrir', href: '#suite', align: 'center' }),
      ]),

      section([
        w('etiquette', { text: 'Ce que nous faisons', align: 'center' }),
        w('heading', { text: 'Trois façons de nous rencontrer', level: 'h2', align: 'center' }),
        w('spacer', { height: 30 }),
        // Des cartes, pas une image suivie d'un titre : le texte est POSÉ sur
        // l'image, ce qui est une composition et non un empilement.
        w('columns', { count: 3, gap: 18 }, [
          [w('carte', { titre: 'Premier lieu', sousTitre: 'CATÉGORIE', hauteur: 340 })],
          [w('carte', { titre: 'Deuxième lieu', sousTitre: 'CATÉGORIE', hauteur: 340 })],
          [w('carte', { titre: 'Troisième lieu', sousTitre: 'CATÉGORIE', hauteur: 340 })],
        ]),
      ], { padding: 88 }),

      section([
        // Deux tiers / un tiers : c'est le déséquilibre qui fait respirer une
        // page. Deux colonnes égales donnent toujours l'air d'un gabarit.
        w('columns', { count: 2, gap: 54, ratio: '2-1' }, [
          [
            w('etiquette', { text: 'Notre histoire' }),
            w('heading', { text: 'Qui nous sommes', level: 'h2' }),
            w('text', T('Racontez votre parcours, ce qui vous distingue, et pourquoi on vient chez vous plutôt qu’ailleurs.')),
          ],
          [w('image', { alt: '' })],
        ]),
      ], { padding: 88 }),

      w('hero', { hauteur: 'moyenne', voile: 55, align: 'center' }, [
        w('heading', { text: 'Une phrase qui donne envie', level: 'h2', align: 'center' }),
        w('spacer', { height: 20 }),
        w('button', { text: 'Nous contacter', href: 'contact.html', align: 'center' }),
      ]),
    ],
  },

  {
    id: 'onepage',
    pour: ['vitrine'], resume: 3,
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
    pour: ['vente'], resume: 3,
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
    pour: ['portfolio'], resume: 2,
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
    pour: ['contact'], resume: 2,
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
    pour: ['histoire'], resume: 2,
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

  {
    id: 'article',
    pour: ['article'], resume: 2,
    apercu: ['bar', 'bar', 'duo'],
    build: () => [
      section([
        w('heading', { text: 'Le titre de votre article', level: 'h2' }),
        w('text', T('<em>Publié le 1er janvier — par votre nom</em>')),
        w('spacer', { height: 12 }),
        w('image', { alt: '' }),
      ], { padding: 64 }),
      section([
        w('text', T('Le chapeau : deux ou trois phrases qui résument l’essentiel, pour donner envie de lire la suite.')),
        w('spacer', { height: 20 }),
        w('heading', { text: 'Un premier intertitre', level: 'h3' }),
        w('text', T('Le corps du texte. Vous écrivez ici directement dans la page, comme dans un traitement de texte.')),
        w('spacer', { height: 16 }),
        w('heading', { text: 'Un second intertitre', level: 'h3' }),
        w('text', T('La suite de votre propos. Ajoutez des images, des listes ou des citations depuis le panneau.')),
      ]),
      section([
        w('columns', { count: 2, gap: 40 }, [
          [w('heading', { text: 'En savoir plus', level: 'h3' }),
           w('list', { items: 'Un lien utile\nUn document à télécharger\nUne page connexe' })],
          [w('heading', { text: 'Contact presse', level: 'h3' }),
           w('text', T('Nom, téléphone, adresse électronique.')),
           w('spacer', { height: 12 }),
           w('button', { text: 'Nous écrire', href: 'mailto:contact@exemple.fr' })],
        ]),
      ]),
    ],
  },
];

/**
 * Les intentions proposées par l'assistant de démarrage, dans l'ordre où
 * elles sont présentées. Chacune pointe vers le modèle qui la sert.
 */
export const INTENTIONS = [
  { id: 'vitrine', modele: 'onepage' },
  { id: 'vente', modele: 'vente' },
  { id: 'portfolio', modele: 'portfolio' },
  { id: 'histoire', modele: 'apropos' },
  { id: 'article', modele: 'article' },
  { id: 'contact', modele: 'contact' },
];

/**
 * Compose des propositions de mise en page à partir des intentions cochées.
 *
 * Empiler des modèles entiers donnerait une page interminable : chaque
 * intention n'apporte donc que ses premières sections (`resume`), sauf quand
 * elle est seule — auquel cas le modèle complet est le meilleur départ.
 *
 * @param {string[]} intentions identifiants cochés, dans l'ordre de la liste
 * @param {string} mode 'une' (tout sur cette page) ou 'plusieurs'
 * @returns {{id:string, trees:object[][], apercu:string[], modeles:string[]}[]}
 */
export function composerPropositions(intentions, mode) {
  const retenues = INTENTIONS.filter((i) => intentions.includes(i.id));
  if (!retenues.length) return [];

  const modeleDe = (intention) => findPageTemplate(intention.modele);
  const propositions = [];

  const complet = (intention) => {
    const modele = modeleDe(intention);
    return { trees: modele.build(), apercu: modele.apercu, modeles: [modele.id] };
  };

  // Sur plusieurs pages, celle-ci ne porte que la première intention : les
  // autres deviendront des pages à part.
  if (mode === 'plusieurs' || retenues.length === 1) {
    const premier = complet(retenues[0]);
    propositions.push({ id: 'complet', ...premier });
    if (retenues.length > 1) {
      propositions.push({
        id: 'assemble',
        ...assembler(retenues.map(modeleDe)),
      });
    }
    return propositions;
  }

  propositions.push({ id: 'assemble', ...assembler(retenues.map(modeleDe)) });
  propositions.push({ id: 'essentiel', ...complet(retenues[0]) });
  return propositions;
}

function assembler(modeles) {
  const trees = [];
  const apercu = [];
  for (const modele of modeles) {
    const sections = modele.build().slice(0, modele.resume || 2);
    trees.push(...sections);
    apercu.push(...modele.apercu.slice(0, sections.length));
  }
  return { trees, apercu, modeles: modeles.map((m) => m.id) };
}

export function findPageTemplate(id) {
  return PAGE_TEMPLATES.find((m) => m.id === id) || null;
}
