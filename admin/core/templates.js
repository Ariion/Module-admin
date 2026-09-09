/**
 * Modèles de section : des mises en page prêtes à l'emploi.
 *
 * Ce sont de simples arbres de widgets. Comme les widgets émettent du HTML
 * sémantique sans classes, un modèle inséré prend d'emblée la typographie et
 * les couleurs du site : il n'apporte que la STRUCTURE, jamais un style qui
 * jurerait avec le reste.
 * @module core/templates
 */
import { createWidget } from './widgets.js';

/** Propriétés qui portent du texte de remplissage dans un modèle. */
const REMPLISSAGE = ['text', 'html', 'items'];

/**
 * Fabrique un widget avec des propriétés initiales.
 *
 * Le texte d'un modèle est marqué comme exemple : c'est ce qui permet au
 * guide de dire « il reste ça à écrire » plutôt que de compter la page comme
 * remplie alors qu'elle affiche encore « Le titre de votre site ». La marque
 * disparaît dès que le client écrit son propre texte.
 */
export function w(type, props = {}, enfants = null) {
  const noeud = createWidget(type);
  noeud.props = { ...noeud.props, ...props };
  // `exemple: false` explicite : un texte écrit à partir des mots du client
  // n'est pas du remplissage, et le guide ne doit pas le réclamer.
  if (props.exemple === undefined
    && REMPLISSAGE.some((cle) => props[cle] !== undefined)) noeud.props.exemple = true;
  if (enfants) {
    if (noeud.type === 'columns') {
      noeud.children = enfants.map((contenu) => {
        const colonne = createWidget('column');
        colonne.children = contenu;
        return colonne;
      });
      noeud.props.count = enfants.length;
    } else {
      noeud.children = enfants;
    }
  }
  return noeud;
}

export function section(enfants, props = {}) {
  const racine = createWidget('section');
  racine.props = { ...racine.props, ...props };
  racine.children = enfants;
  return racine;
}

export const TEMPLATES = [
  {
    id: 'intro',
    colonnes: [1],
    build: () => section([
      w('heading', { text: 'Un titre de section', level: 'h2' }),
      w('text', { html: 'Présentez ici ce que vous proposez, en deux ou trois phrases. Ce texte reprend automatiquement la typographie de votre site.' }),
    ]),
  },
  {
    id: 'cta',
    colonnes: [1],
    build: () => section([
      w('heading', { text: 'Prêt à réserver ?', level: 'h2', align: 'center' }),
      w('text', { html: 'Ajoutez une phrase qui donne envie de vous contacter.', align: 'center' }),
      w('spacer', { height: 16 }),
      w('button', { text: 'Nous contacter', href: 'contact.html', align: 'center' }),
    ]),
  },
  {
    id: 'duo',
    colonnes: [1, 1],
    build: () => section([
      w('heading', { text: 'Deux colonnes', level: 'h2' }),
      w('spacer', { height: 12 }),
      w('columns', { count: 2 }, [
        [w('heading', { text: 'Première colonne', level: 'h3' }), w('text', { html: 'Le contenu de la première colonne.' })],
        [w('heading', { text: 'Seconde colonne', level: 'h3' }), w('text', { html: 'Le contenu de la seconde colonne.' })],
      ]),
    ]),
  },
  {
    id: 'trio',
    colonnes: [1, 1, 1],
    build: () => section([
      w('heading', { text: 'Nos points forts', level: 'h2', align: 'center' }),
      w('spacer', { height: 20 }),
      w('columns', { count: 3 }, [
        [w('heading', { text: 'Premier point', level: 'h3' }), w('text', { html: 'Une phrase qui développe ce point.' })],
        [w('heading', { text: 'Deuxième point', level: 'h3' }), w('text', { html: 'Une phrase qui développe ce point.' })],
        [w('heading', { text: 'Troisième point', level: 'h3' }), w('text', { html: 'Une phrase qui développe ce point.' })],
      ]),
    ]),
  },
  {
    id: 'imageTexte',
    colonnes: [1, 1],
    build: () => section([
      w('columns', { count: 2, gap: 40 }, [
        [w('image', { alt: '' })],
        [
          w('heading', { text: 'Une image et du texte', level: 'h2' }),
          w('text', { html: 'Décrivez ce que montre l’image. Idéal pour présenter un lieu, une prestation ou une équipe.' }),
          w('spacer', { height: 12 }),
          w('button', { text: 'En savoir plus', href: '#' }),
        ],
      ]),
    ]),
  },
  {
    id: 'galerie',
    colonnes: [1, 1, 1],
    build: () => section([
      w('heading', { text: 'En images', level: 'h2', align: 'center' }),
      w('spacer', { height: 20 }),
      w('columns', { count: 3, gap: 16 }, [
        [w('image', { alt: '' })], [w('image', { alt: '' })], [w('image', { alt: '' })],
      ]),
    ]),
  },
  {
    id: 'liste',
    colonnes: [1],
    build: () => section([
      w('heading', { text: 'Ce qui est compris', level: 'h2' }),
      w('list', { items: 'Premier élément\nDeuxième élément\nTroisième élément\nQuatrième élément' }),
    ]),
  },
  {
    id: 'contact',
    colonnes: [1, 1],
    build: () => section([
      w('columns', { count: 2, gap: 40 }, [
        [
          w('heading', { text: 'Nous trouver', level: 'h2' }),
          w('text', { html: 'Adresse, téléphone et horaires.' }),
          w('spacer', { height: 12 }),
          w('button', { text: 'Nous écrire', href: 'mailto:contact@exemple.fr' }),
        ],
        [w('map', { query: '', height: 300 })],
      ]),
    ]),
  },
];

export function findTemplate(id) {
  return TEMPLATES.find((m) => m.id === id) || null;
}
