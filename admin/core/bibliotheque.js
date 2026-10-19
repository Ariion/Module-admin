/**
 * La bibliothèque de modèles de page.
 *
 * Les constructeurs de sites montrent une galerie de captures d'écran :
 * « Accueil — Restaurant », « À propos — Photographe ». Une capture ment
 * deux fois. Elle est prise sur un site qui n'est pas le vôtre, avec des
 * couleurs que vous n'aurez pas ; et elle vieillit sans que personne ne s'en
 * aperçoive, parce que personne ne la regarde plus une fois le modèle écrit.
 *
 * Ici il n'y a pas de captures. Chaque vignette est la page RENDUE — le même
 * code que celui qui construira la vôtre, dans l'ambiance que vous avez
 * choisie, avec les mots de votre métier. Onze modèles multipliés par douze
 * métiers et neuf ambiances : la galerie n'est pas un dossier d'images, elle
 * est calculée. Rien n'y périme.
 *
 * Et ce que montre la vignette est ce que pose le bouton. C'est la seule
 * règle qui compte : la même fonction sert les deux, parce qu'un aperçu qui
 * promet autre chose que ce qu'on obtient est pire que pas d'aperçu.
 * @module core/bibliotheque
 */
import { PAGE_TEMPLATES, findPageTemplate } from './page-templates.js';
import { METIERS, metierById, briefVide } from './brief.js';
import { illustrations } from './illustrations.js';
import { clone } from './util.js';

/**
 * Les familles de pages, dans l'ordre où on les construit.
 *
 * Ce ne sont pas les « intentions » du parcours guidé, qui disent ce que le
 * SITE veut faire. Celles-ci disent ce qu'une PAGE est — et un même site en
 * aligne plusieurs.
 */
export const TYPES_MODELE = ['accueil', 'apropos', 'boutique', 'portfolio', 'article', 'contact'];

/**
 * À quelle famille appartient chaque modèle.
 *
 * La table est écrite ici plutôt que dans les modèles eux-mêmes : un modèle
 * décrit une mise en page, pas un rangement, et c'est le rangement qu'on
 * change quand la galerie s'étoffe.
 */
const FAMILLE = {
  editorial: 'accueil', onepage: 'accueil',
  apropos: 'apropos', portrait: 'apropos',
  vente: 'boutique',
  portfolio: 'portfolio',
  article: 'article', interview: 'article', conseil: 'article', actualite: 'article',
  contact: 'contact',
};

/** Le catalogue, prêt à afficher : un modèle, sa famille, son identifiant. */
export const MODELES = PAGE_TEMPLATES.map((m) => ({
  id: m.id,
  type: FAMILLE[m.id] || 'accueil',
  pour: m.pour || [],
}));

/** Les modèles d'une famille, ou tous quand aucune n'est demandée. */
export function modelesDuType(type) {
  return type ? MODELES.filter((m) => m.type === type) : MODELES;
}

/** Les métiers proposés en filtre, avec leur libellé prêt à afficher. */
export function metiersBibliotheque(t) {
  return METIERS.map((m) => ({ id: m.id, nom: t('metier_' + m.id) }));
}

/** Des raisons sociales crédibles, par métier. Jamais un nom qui existe. */
const ENSEIGNES = {
  restaurant: 'La Table du Marché', alimentaire: 'Le Fournil de la Place',
  beaute: 'Atelier Coiffure', batiment: 'Delaunay Rénovation',
  sante: 'Cabinet des Tilleuls', conseil: 'Vernet Conseil',
  boutique: 'Comptoir du Centre', creatif: 'Studio Lumière',
  hebergement: 'Le Clos des Vignes', association: 'Les Amis du Village',
  sport: 'Salle Élan', autre: 'Maison Dubois',
};

/** Le brief d'un métier : ce qu'un client de ce métier aurait rempli. */
export function briefDuMetier(metierId, ville = 'Annecy') {
  const metier = metierById(metierId) || METIERS[METIERS.length - 1];
  return {
    ...briefVide(),
    metier: metier.id,
    activite: ENSEIGNES[metier.id] || ENSEIGNES.autre,
    ville,
    ton: 'chaleureux',
  };
}

/**
 * Pose les mots du métier sur un modèle.
 *
 * On ne réécrit PAS toute la page : seulement le premier titre, la première
 * phrase et la première étiquette. C'est délibéré. Au-delà, on inventerait —
 * et une page livrée pleine de phrases plausibles mais fausses se publie sans
 * qu'on les relise, parce qu'elles ont l'air finies. Les trois premières
 * lignes suffisent à reconnaître son métier dans la vignette ; le reste garde
 * un texte visiblement à remplir, et le guide continue de le réclamer.
 *
 * La substitution n'a lieu que si le modèle porte encore son texte d'origine :
 * une page déjà retouchée n'est jamais écrasée.
 */
export function poserLesMots(sections, brief) {
  const metier = metierById(brief?.metier);
  if (!metier) return sections;

  const accroche = typeof metier.accroche === 'function' ? metier.accroche(brief) : '';
  const restant = {
    heading: brief.activite || '',
    text: accroche,
    etiquette: brief.ville || '',
  };

  const parcourir = (noeuds) => {
    for (const noeud of noeuds || []) {
      const type = noeud.type;
      if (restant[type] && noeud.props && marqueDuModele(noeud, type)) {
        if (type === 'text') noeud.props.html = echapper(restant[type]);
        else noeud.props.text = restant[type];
        delete noeud.props.exemple;
        restant[type] = '';
      }
      if (noeud.children) parcourir(noeud.children);
    }
  };
  parcourir(sections);
  return sections;
}

/**
 * Ce nœud porte-t-il encore le texte du modèle ?
 *
 * Les modèles marquent leurs textes d'attente avec `exemple`. S'en servir
 * plutôt que de comparer des chaînes évite deux pièges : un modèle dont on
 * change la formulation cesserait d'être reconnu, et un texte écrit par le
 * client qui ressemblerait par hasard au nôtre serait écrasé.
 */
function marqueDuModele(noeud, type) {
  if (noeud.props.exemple) return true;
  // Les titres et étiquettes des modèles ne sont pas marqués : ils sont
  // courts et toujours génériques. On se contente alors d'exiger qu'il y ait
  // quelque chose à remplacer.
  return type !== 'text' && !!String(noeud.props.text || '').trim();
}

const ECHAPPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
const echapper = (texte) => String(texte).replace(/[&<>]/g, (c) => ECHAPPES[c]);

/**
 * Pose les visuels dessinés par le module dans les emplacements vides.
 *
 * Un modèle sort de `build()` sans images : ses `hero` et ses `image` ont un
 * emplacement, pas un fichier. Une vignette sans visuel ne ressemble à rien,
 * et surtout pas à ce qu'on obtiendra une fois les photos posées. Les
 * illustrations sont calculées aux couleurs de l'ambiance, donc elles ne
 * demandent aucun réseau et n'appartiennent à personne.
 */
export function poserLesVisuels(sections, theme) {
  const visuels = illustrations(theme).map((i) => i.url);
  if (!visuels.length) return sections;
  let rang = 0;
  const suivant = () => visuels[rang++ % visuels.length];

  const parcourir = (noeuds) => {
    for (const noeud of noeuds || []) {
      const p = noeud.props;
      if (p) {
        if (noeud.type === 'hero' && !p.image) p.image = suivant();
        if (noeud.type === 'image' && !p.src) p.src = suivant();
        if (noeud.type === 'carte' && !p.image) p.image = suivant();
        if (noeud.type === 'galerie' && !p.images) p.images = visuels.slice(0, 4).join('\n');
      }
      if (noeud.children) parcourir(noeud.children);
    }
  };
  parcourir(sections);
  return sections;
}

/**
 * Une page prête : la structure du modèle, les mots du métier, les visuels de
 * l'ambiance.
 *
 * C'est l'unique fabrique. La galerie l'appelle pour dessiner sa vignette, et
 * le bouton « créer » l'appelle pour poser la page — donc ce qu'on a regardé
 * est exactement ce qu'on obtient.
 *
 * @param {string} modeleId
 * @param {{metier?: string, ville?: string, theme?: object}} options
 * @returns {object[]} sections, prêtes à rendre ou à publier
 */
export function pageDuModele(modeleId, { metier = 'autre', ville, theme = null } = {}) {
  const modele = findPageTemplate(modeleId);
  if (!modele || typeof modele.build !== 'function') return [];
  // `clone` plutôt que l'arbre rendu par `build()` : la galerie en dessine
  // douze à la suite, et deux vignettes qui partageraient un nœud se
  // peindraient l'une sur l'autre.
  const sections = clone(modele.build());
  poserLesMots(sections, briefDuMetier(metier, ville));
  poserLesVisuels(sections, theme);
  return sections;
}
