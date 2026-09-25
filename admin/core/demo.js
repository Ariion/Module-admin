/**
 * Sites de démonstration : une ambiance, un métier, une page entière.
 *
 * WordPress montre des captures d'écran de thèmes. Une capture ment : elle
 * est prise sur un site qui n'est pas le vôtre, avec un contenu que vous
 * n'aurez jamais. Ici la démonstration est **le vrai rendu** — les mêmes
 * couleurs, les mêmes polices, les mêmes éléments que ce que l'on obtiendra
 * en appliquant. Ce qu'on voit est ce qu'on aura, à ses textes près.
 *
 * Le contenu vient du métier : le module sait déjà écrire une page de
 * restaurant, de garage ou de cabinet — c'est ce qui sert au parcours guidé.
 * On s'en sert ici pour peupler la démonstration, avec un nom d'entreprise
 * et une ville plausibles plutôt que du faux latin : « Lorem ipsum » ne dit
 * rien de ce à quoi ressemblera la page une fois remplie.
 *
 * Les images sont les illustrations dessinées par le module, aux couleurs
 * de l'ambiance. Elles ne demandent aucun réseau, elles sont donc toujours
 * là, et elles n'appartiennent à personne — elles sont calculées.
 * @module core/demo
 */
import { METIERS, metierById, briefVide } from './brief.js';
import { redigerPage } from './redacteur.js';
import { illustrations } from './illustrations.js';

/** Des raisons sociales crédibles, par métier. Jamais un nom qui existe. */
const ENSEIGNES = {
  restaurant: ['La Table du Marché', 'Chez Renée'],
  alimentaire: ['Le Fournil de la Place', 'Maison Perrot'],
  beaute: ['Atelier Coiffure', 'Institut Bellevue'],
  batiment: ['Delaunay Rénovation', 'Atelier du Bâti'],
  sante: ['Cabinet des Tilleuls', 'Centre Paramédical'],
  conseil: ['Vernet Conseil', 'Atelier Stratégie'],
  boutique: ['La Petite Boutique', 'Comptoir du Centre'],
  creatif: ['Studio Lumière', 'Atelier Graphique'],
  hebergement: ['Le Clos des Vignes', 'Maison d’Hôtes du Pré'],
  association: ['Les Amis du Village', 'Solidarité Locale'],
  sport: ['Salle Élan', 'Club Horizon'],
  autre: ['Maison Dubois', 'Atelier Central'],
};

const VILLES = ['Annecy', 'Poitiers', 'Colmar', 'Bayonne', 'Vannes', 'Uzès'];

/** Les métiers proposés, avec leur libellé prêt à afficher. */
export function metiersDemo(t) {
  return METIERS.map((m) => ({ id: m.id, nom: t('metier_' + m.id) }));
}

/**
 * Un brief plausible pour un métier — ce qu'un client aurait rempli.
 *
 * Le tirage est stable : la même ambiance et le même métier donnent
 * toujours la même démonstration. Une galerie dont les vignettes changent à
 * chaque passage empêche de comparer, ce qui est précisément ce qu'on vient
 * y faire.
 */
export function briefDemo(metierId, graine = 0) {
  const metier = metierById(metierId) || METIERS[METIERS.length - 1];
  const noms = ENSEIGNES[metier.id] || ENSEIGNES.autre;
  return {
    ...briefVide(),
    metier: metier.id,
    activite: noms[graine % noms.length],
    ville: VILLES[graine % VILLES.length],
    ton: 'chaleureux',
    atouts: ['anciennete', 'devis'],
  };
}

/**
 * Les sections d'une page de démonstration, prêtes à rendre.
 *
 * @param {string} metierId
 * @param {object|null} theme réglage d'ambiance (pour la teinte des images)
 * @param {number} graine choix stable de l'enseigne et de la ville
 * @returns {object[]} arbres de widgets
 */
export function pageDemo(metierId, theme = null, graine = 0) {
  const visuels = illustrations(theme).map((i) => i.url);
  const { sections } = redigerPage(briefDemo(metierId, graine), { images: visuels });
  return sections;
}

/**
 * La suite de bandes qui résume une page — silhouette utile partout où l'on
 * veut évoquer une mise en page sans la rendre.
 */
export function bandesDemo(metierId) {
  return SILHOUETTES[metierId] || SILHOUETTES.autre;
}

/**
 * La silhouette d'une page, par métier.
 *
 * Elle n'est pas décorative : un restaurant se raconte en photos, un
 * cabinet de conseil en paragraphes, une boutique en grille de produits.
 * Donner la même suite de bandes à tout le monde ferait du sélecteur de
 * métier un bouton qui ne change rien — et un réglage sans effet visible
 * fait douter de tous les autres.
 */
const SILHOUETTES = {
  restaurant: ['hero', 'photo', 'texte', 'cartes', 'bande'],
  alimentaire: ['hero', 'cartes', 'photo', 'texte', 'bande'],
  beaute: ['hero', 'texte', 'cartes', 'photo', 'bande'],
  batiment: ['hero', 'cartes', 'texte', 'duo', 'bande'],
  sante: ['hero', 'texte', 'duo', 'cartes', 'bande'],
  conseil: ['hero', 'texte', 'texte', 'cartes', 'bande'],
  boutique: ['hero', 'cartes', 'cartes', 'photo', 'bande'],
  creatif: ['hero', 'photo', 'cartes', 'photo', 'bande'],
  hebergement: ['hero', 'photo', 'duo', 'cartes', 'bande'],
  association: ['hero', 'texte', 'cartes', 'duo', 'bande'],
  sport: ['hero', 'cartes', 'photo', 'texte', 'bande'],
  autre: ['hero', 'texte', 'cartes', 'photo', 'bande'],
};
