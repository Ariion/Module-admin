/**
 * Catalogue de widgets et rendu.
 *
 * Le problème d'un widget générique posé sur un site écrit à la main, c'est
 * qu'il jure avec le reste. La réponse tient dans le balisage : les widgets
 * émettent du HTML SÉMANTIQUE ET SANS CLASSES — un `<h2>`, un `<p>`, un
 * `<img>`. La feuille de style du site s'y applique donc d'elle-même, et un
 * titre inséré prend la police, la couleur et les marges du site. Seuls les
 * conteneurs portent quelques styles en ligne, pour la mise en grille.
 *
 * Un widget n'est jamais inséré dans le balisage du développeur : il vit dans
 * une section ajoutée. La mise en page du site reste intacte.
 * @module core/widgets
 */
import { uid } from './util.js';
import { safeHtml, safeUrl, safeImageUrl, safeText } from './sanitize.js';
import { applyStyleObject } from './style.js';
import { catalogueFiltre, prixLisible, boutonAchat } from './boutique.js';
import { marqueDe, nomDeMarque, tracerMarque } from './marques.js';

/** Catégories affichées dans le panneau, dans l'ordre. */
/**
 * Éléments dont l'habillage vise un enfant plutôt que l'enveloppe.
 * Le bouton est le seul cas aujourd'hui, et c'en est un vrai : ce qu'on voit
 * à l'écran est le lien, pas le bloc qui le centre.
 */
const CIBLES_STYLE = {
  button: (el) => el.querySelector('a'),
};

/** Hauteurs du bandeau d'accueil. « plein » vise la hauteur de l'écran. */
const HAUTEURS_HERO = { moyenne: '46vh', grande: '70vh', plein: '100vh' };

/** Proportions possibles pour deux colonnes. */
const RATIOS = { '1-2': '1fr 2fr', '2-1': '2fr 1fr', '1-3': '1fr 3fr', '3-1': '3fr 1fr' };

/** Les pistes d'une grille de colonnes, selon le nombre et la proportion. */
function pistesColonnes(p) {
  const nombre = Math.max(1, Math.min(4, p.count || 2));
  // Une proportion ne veut rien dire au-delà de deux colonnes.
  if (nombre === 2 && RATIOS[p.ratio]) return RATIOS[p.ratio];
  return `repeat(${nombre}, minmax(0, 1fr))`;
}

/**
 * Les éléments qui se COMPORTENT — ouvrir un panneau, changer d'onglet,
 * agrandir une photo — n'ont pas droit au script du module : la page publiée
 * ne le charge plus. Leur comportement tient donc soit dans le HTML lui-même
 * (`<details>`), soit dans une règle CSS d'état (`:checked`, `:target`).
 *
 * Une règle a besoin d'un sélecteur, donc d'une classe et d'une feuille. La
 * feuille vit DANS l'élément, parmi ses enfants : elle part avec lui quand on
 * le retire, et elle survit à la régénération du fichier HTML, qui n'efface
 * que les attributs `data-admin-*`. Une feuille posée dans `<head>` aurait
 * demandé un mécanisme de plus à tenir d'accord avec la publication.
 */
const PREFIXE_COMPORTEMENT = 'admin-w-';

/** La classe qui porte les règles d'un élément, dérivée de sa clé. */
function classeDe(noeud) {
  return PREFIXE_COMPORTEMENT + noeud.key;
}

/** La feuille d'un élément, à poser parmi ses enfants. */
function feuilleDe(doc, regles) {
  const feuille = doc.createElement('style');
  feuille.textContent = regles.join('');
  return feuille;
}

/** Les lignes non vides d'un réglage multiligne. */
function lignesDe(valeur) {
  return String(valeur ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
}

/** Les champs d'une ligne « A | B | C ». */
function champsDe(ligne) {
  return String(ligne).split('|').map((c) => c.trim());
}

/**
 * Une grille qui se replie d'elle-même.
 *
 * `auto-fit` plutôt qu'un nombre de colonnes fixe : c'est la largeur minimale
 * qui décide, et la grille tombe à une colonne sans une seule requête de
 * média. Trois témoignages restent donc lisibles à 390 px sans que ces
 * éléments écrivent leur propre responsive, qui entrerait en concurrence avec
 * les formats d'écran — eux seuls produisent des règles `@media`, sur les
 * réglages du client.
 */
function grilleSouple(el, mini, gap) {
  el.style.display = 'grid';
  el.style.gridTemplateColumns = `repeat(auto-fit, minmax(min(100%, ${mini}px), 1fr))`;
  el.style.gap = gap + 'px';
}

export const CATEGORIES = ['mise-en-page', 'structure', 'basique', 'media', 'boutique'];

/**
 * Définition d'un widget.
 * `container` : accepte d'autres widgets. `fields` : réglages exposés.
 */
export const WIDGETS = {
  section: {
    category: 'structure', icon: 'section', container: true, hidden: true,
    defaults: () => ({ maxWidth: 1080, padding: 64, align: 'left' }),
    fields: [
      { key: 'maxWidth', type: 'number', label: 'widthLabel', min: 320, max: 2000, step: 20 },
      { key: 'padding', type: 'number', label: 'paddingLabel', min: 0, max: 200, step: 4 },
    ],
  },

  /**
   * Le bandeau d'accueil : une image plein cadre, un voile, du texte par
   * dessus. C'est ce qui manquait le plus — toutes les mises en page qu'on
   * admire commencent par là, et une section ordinaire ne sait pas le faire :
   * elle centre une boîte sur un fond uni.
   */
  hero: {
    category: 'mise-en-page', icon: 'image', container: true,
    defaults: () => ({
      image: '', voile: 45, hauteur: 'grande', align: 'center', texte: 'clair',
      maxWidth: 900, padding: 24,
    }),
    fields: [
      { key: 'image', type: 'media', label: 'heroImage', accept: 'image' },
      { key: 'hauteur', type: 'select', label: 'heroHauteur',
        options: ['moyenne', 'grande', 'plein'] },
      { key: 'voile', type: 'number', label: 'heroVoile', min: 0, max: 90, step: 5 },
      { key: 'texte', type: 'select', label: 'heroTexte', options: ['clair', 'sombre'] },
      { key: 'align', type: 'align', label: 'alignLabel' },
      { key: 'maxWidth', type: 'number', label: 'blockWidth', min: 320, max: 1600, step: 20 },
    ],
  },

  /**
   * Une carte média : l'image ET son titre, en un seul bloc, le texte posé
   * sur le bas de l'image. Empiler « image » puis « titre » donne autre
   * chose — deux blocs qui se suivent, pas une carte.
   */
  carte: {
    category: 'mise-en-page', icon: 'image',
    defaults: () => ({
      image: '', titre: 'Un lieu', sousTitre: 'PAYS', href: '', hauteur: 300,
    }),
    fields: [
      { key: 'image', type: 'media', label: 'carteImage', accept: 'image' },
      { key: 'titre', type: 'text', label: 'carteTitre' },
      { key: 'sousTitre', type: 'text', label: 'carteSousTitre' },
      { key: 'hauteur', type: 'number', label: 'carteHauteur', min: 140, max: 700, step: 10 },
      { key: 'href', type: 'text', label: 'linkHref' },
    ],
  },

  /**
   * L'étiquette : trois mots en capitales espacées au-dessus d'un titre.
   * C'est un détail, et c'est le détail qui sépare une page d'un document.
   */
  etiquette: {
    category: 'mise-en-page', icon: 'text',
    defaults: () => ({ text: 'Depuis 1974', align: 'left' }),
    fields: [
      { key: 'text', type: 'text', label: 'textLabel' },
      { key: 'align', type: 'align', label: 'alignLabel' },
    ],
  },

  column: {
    category: 'structure', icon: 'columns', container: true, hidden: true,
    defaults: () => ({}),
    fields: [],
  },

  columns: {
    category: 'structure', icon: 'columns', container: true, columns: true,
    defaults: () => ({ count: 2, gap: 28, ratio: 'egal' }),
    fields: [
      { key: 'count', type: 'select', label: 'columnCount', options: [2, 3, 4] },
      // Deux colonnes strictement égales sont ce qui donne l'air « gabarit ».
      // Un texte à côté d'une image veut presque toujours un déséquilibre.
      { key: 'ratio', type: 'select', label: 'columnRatio',
        options: ['egal', '1-2', '2-1', '1-3', '3-1'] },
      { key: 'gap', type: 'number', label: 'gapLabel', min: 0, max: 120, step: 4 },
    ],
  },

  heading: {
    category: 'basique', icon: 'heading',
    defaults: () => ({ text: 'Titre de section', level: 'h2', align: 'left' }),
    fields: [
      { key: 'text', type: 'text', label: 'textContent' },
      { key: 'level', type: 'select', label: 'levelLabel', options: ['h2', 'h3', 'h4'] },
      { key: 'align', type: 'align', label: 'alignLabel' },
    ],
  },

  text: {
    category: 'basique', icon: 'text',
    defaults: () => ({ html: 'Un paragraphe de texte. Cliquez pour le modifier.', align: 'left' }),
    fields: [
      { key: 'html', type: 'richtext', label: 'textContent' },
      { key: 'align', type: 'align', label: 'alignLabel' },
    ],
  },

  button: {
    category: 'basique', icon: 'button',
    defaults: () => ({ text: 'En savoir plus', href: '#', target: '', align: 'left' }),
    fields: [
      { key: 'text', type: 'text', label: 'linkLabel' },
      { key: 'href', type: 'text', label: 'linkUrl' },
      { key: 'target', type: 'checkbox', label: 'linkTarget', on: '_blank' },
      { key: 'align', type: 'align', label: 'alignLabel' },
    ],
  },

  list: {
    category: 'basique', icon: 'list',
    defaults: () => ({ items: 'Premier élément\nDeuxième élément\nTroisième élément' }),
    fields: [{ key: 'items', type: 'lines', label: 'itemsLabel' }],
  },

  /**
   * Citation en exergue. Rendue en <blockquote> : le site la style comme il
   * veut, sans que le module impose une classe.
   */
  citation: {
    category: 'basique', icon: 'text',
    defaults: () => ({ texte: 'La phrase qui résume tout.', source: '' }),
    fields: [
      { key: 'texte', type: 'lines', label: 'quoteText' },
      { key: 'source', type: 'text', label: 'quoteSource' },
    ],
  },

  /**
   * Encadré : un titre court et quelques points à retenir. Rendu en <aside>,
   * qui dit exactement ce que c'est — un à-côté du propos principal.
   */
  encadre: {
    category: 'basique', icon: 'list',
    defaults: () => ({ titre: 'À retenir', items: 'Le premier point\nLe deuxième point' }),
    fields: [
      { key: 'titre', type: 'text', label: 'boxTitle' },
      { key: 'items', type: 'lines', label: 'itemsLabel' },
    ],
  },

  /**
   * L'accordéon : la foire aux questions, celle qui traîne en bas de presque
   * toutes les pages de service, et qu'on bricole chaque fois autrement.
   *
   * Rendu en `<details>`, donc sans une ligne de script : ouvrir et fermer est
   * un comportement du navigateur. C'est le seul choix tenable, puisque le
   * module a disparu de la page publiée.
   */
  accordeon: {
    category: 'mise-en-page', icon: 'layers',
    defaults: () => ({
      items: 'Quels sont vos horaires ?|Du mardi au samedi, de 9 h à 19 h.\n'
        + 'Intervenez-vous à domicile ?|Oui, dans un rayon de 20 km.\n'
        + 'Le devis est-il payant ?|Non, le devis est gratuit et sans engagement.',
      ouvert: 'premier', exclusif: 'oui',
    }),
    fields: [
      { key: 'items', type: 'lines', label: 'accordeonItems', hint: 'accordeonHint',
        placeholder: 'Quels sont vos horaires ? | Du mardi au samedi, de 9 h à 19 h.' },
      { key: 'ouvert', type: 'select', label: 'accordeonOuvert',
        options: ['premier', 'aucun', 'tous'] },
      { key: 'exclusif', type: 'checkbox', label: 'accordeonExclusif', on: 'oui' },
    ],
  },

  /**
   * Les onglets : trois offres, trois horaires, trois lieux, sans tripler la
   * hauteur de la page.
   *
   * Des boutons radio et une règle `:checked`. Aucun script, donc : c'est le
   * navigateur qui retient l'onglet choisi, et il le fait aussi bien dans la
   * page publiée que dans l'aperçu.
   */
  onglets: {
    category: 'mise-en-page', icon: 'template',
    defaults: () => ({
      items: 'Le midi|Entrée, plat et dessert à 19 €, du mardi au vendredi.\n'
        + 'Le soir|À la carte, de 19 h à 22 h, sur réservation.\n'
        + 'Le dimanche|Brunch de 11 h à 15 h.',
      align: 'left',
    }),
    fields: [
      { key: 'items', type: 'lines', label: 'ongletsItems', hint: 'ongletsHint',
        placeholder: 'Le midi | Entrée, plat et dessert à 19 €.' },
      { key: 'align', type: 'align', label: 'ongletsAlign' },
    ],
  },

  /**
   * Les témoignages. L'avis client est l'argument le plus réclamé et le plus
   * mal bricolé à la main — le plus souvent en trois `<div>` qui se décalent
   * dès qu'un avis est plus long que les autres.
   */
  temoignages: {
    category: 'mise-en-page', icon: 'text',
    defaults: () => ({
      items: 'Travail soigné et délais tenus. Je recommande.|Claire M.|Bordeaux\n'
        + 'On nous a écoutés avant de nous proposer quoi que ce soit.|Paul D.|Client depuis 2019\n'
        + 'Un chantier propre chaque soir. Cela compte plus qu’on ne croit.|Fatima B.|Mérignac',
      etoiles: 5, largeurMini: 260, gap: 26,
    }),
    fields: [
      { key: 'items', type: 'lines', label: 'temoignagesItems', hint: 'temoignagesHint',
        placeholder: 'L’avis | Le nom | Ville ou précision' },
      { key: 'etoiles', type: 'number', label: 'temoignagesEtoiles', min: 0, max: 5, step: 1 },
      { key: 'largeurMini', type: 'number', label: 'colonneMini', min: 180, max: 520, step: 10 },
      { key: 'gap', type: 'number', label: 'gapLabel', min: 0, max: 80, step: 2 },
    ],
  },

  /**
   * La galerie et sa visionneuse. Restaurant, artisan, hébergement : la photo
   * EST le contenu, et la regarder en grand n'est pas un luxe.
   *
   * La visionneuse repose sur `:target` — un lien vers une ancre, une règle
   * qui affiche la vue correspondante. Donc, là encore, aucun script.
   */
  galerie: {
    category: 'media', icon: 'image',
    defaults: () => ({
      images: '', hauteur: 220, largeurMini: 200, gap: 12, visionneuse: 'oui',
    }),
    fields: [
      { key: 'images', type: 'images', label: 'galerieImages', hint: 'galerieHint' },
      { key: 'hauteur', type: 'number', label: 'galerieHauteur', min: 80, max: 600, step: 10 },
      { key: 'largeurMini', type: 'number', label: 'colonneMini', min: 80, max: 520, step: 10 },
      { key: 'gap', type: 'number', label: 'gapLabel', min: 0, max: 60, step: 2 },
      { key: 'visionneuse', type: 'checkbox', label: 'galerieVisionneuse', on: 'oui' },
    ],
  },

  /** Les chiffres clés : « 15 ans », « 400 chantiers », trois nombres alignés. */
  chiffres: {
    category: 'mise-en-page', icon: 'grid',
    defaults: () => ({
      items: '15|ans d’expérience\n400|chantiers livrés\n98 %|clients satisfaits',
      align: 'center', largeurMini: 180, gap: 24,
    }),
    fields: [
      { key: 'items', type: 'lines', label: 'chiffresItems', hint: 'chiffresHint',
        placeholder: '400 | chantiers livrés' },
      { key: 'align', type: 'align', label: 'alignLabel' },
      { key: 'largeurMini', type: 'number', label: 'colonneMini', min: 120, max: 420, step: 10 },
      { key: 'gap', type: 'number', label: 'gapLabel', min: 0, max: 80, step: 2 },
    ],
  },

  /**
   * Les tarifs : des colonnes comparables, dont une mise en avant.
   *
   * Une ligne par offre, et les avantages séparés par un point-virgule à
   * l'intérieur de la ligne. Deux séparateurs valent mieux qu'un réglage par
   * puce : on lit ses trois offres d'un coup d'œil dans le champ.
   */
  tarifs: {
    category: 'mise-en-page', icon: 'columns',
    defaults: () => ({
      items: 'Essentiel|390 €|Pour se lancer|Une page ; Un formulaire ; Mise en ligne'
        + '|contact.html\n'
        + 'Complet|790 €|Pour aller plus loin|Cinq pages ; Galerie photo ; Référencement local'
        + ' ; Un an de suivi|contact.html\n'
        + 'Sur mesure|Sur devis|Pour un projet précis|Pages libres ; Boutique ; Accompagnement'
        + '|contact.html',
      enAvant: 2, etiquetteAvant: 'Le plus demandé', libelle: 'Choisir cette offre',
      largeurMini: 240, gap: 22,
    }),
    fields: [
      { key: 'items', type: 'lines', label: 'tarifsItems', hint: 'tarifsHint',
        placeholder: 'Essentiel | 390 € | Pour se lancer | Une page ; Un formulaire | contact.html' },
      { key: 'enAvant', type: 'number', label: 'tarifsEnAvant', min: 0, max: 8, step: 1 },
      { key: 'etiquetteAvant', type: 'text', label: 'tarifsEtiquette' },
      { key: 'libelle', type: 'text', label: 'tarifsLibelle' },
      { key: 'largeurMini', type: 'number', label: 'colonneMini', min: 200, max: 520, step: 10 },
      { key: 'gap', type: 'number', label: 'gapLabel', min: 0, max: 80, step: 2 },
    ],
  },

  /**
   * Les icônes des réseaux, DESSINÉES.
   *
   * Pas une police d'icônes, pas un CDN : les tracés sont dans le module (voir
   * `core/marques.js`) et posés en SVG dans la page. Le pied de page d'un site
   * dont le module a été retiré garde donc ses icônes, sans qu'une seule
   * requête soit partie les chercher.
   */
  reseaux: {
    category: 'basique', icon: 'link',
    defaults: () => ({
      liens: 'instagram|https://www.instagram.com/\n'
        + 'facebook|https://www.facebook.com/\n'
        + 'courriel|mailto:contact@exemple.fr',
      taille: 22, forme: 'cercle', align: 'left',
    }),
    fields: [
      { key: 'liens', type: 'lines', label: 'reseauxLiens', hint: 'reseauxHint',
        placeholder: 'instagram | https://www.instagram.com/mon-compte' },
      { key: 'taille', type: 'number', label: 'reseauxTaille', min: 14, max: 56, step: 2 },
      { key: 'forme', type: 'select', label: 'reseauxForme', options: ['nu', 'cercle', 'carre'] },
      { key: 'align', type: 'align', label: 'alignLabel' },
    ],
  },

  divider: {
    category: 'basique', icon: 'divider',
    defaults: () => ({ width: 100 }),
    fields: [{ key: 'width', type: 'number', label: 'widthPercent', min: 10, max: 100, step: 5 }],
  },

  spacer: {
    category: 'basique', icon: 'spacer',
    defaults: () => ({ height: 48 }),
    fields: [{ key: 'height', type: 'number', label: 'heightLabel', min: 8, max: 400, step: 8 }],
  },

  image: {
    category: 'media', icon: 'image',
    defaults: () => ({ src: '', alt: '', align: 'left', width: 100 }),
    fields: [
      { key: 'src', type: 'image', label: 'imageUrl' },
      { key: 'alt', type: 'text', label: 'altText' },
      { key: 'width', type: 'number', label: 'widthPercent', min: 10, max: 100, step: 5 },
      { key: 'align', type: 'align', label: 'alignLabel' },
    ],
  },

  video: {
    category: 'media', icon: 'video',
    defaults: () => ({ url: '' }),
    fields: [{ key: 'url', type: 'media', label: 'videoUrl', placeholder: 'https://www.youtube.com/watch?v=…' }],
  },

  audio: {
    category: 'media', icon: 'music',
    defaults: () => ({ src: '', title: '' }),
    fields: [
      { key: 'src', type: 'audio', label: 'audioUrl' },
      { key: 'title', type: 'text', label: 'audioTitle' },
    ],
  },

  catalogue: {
    category: 'boutique', icon: 'grid',
    defaults: () => ({ categorie: '', colonnes: 3, libelle: 'Acheter', montrerPrix: true }),
    fields: [
      { key: 'categorie', type: 'text', label: 'catalogueCategorie', placeholder: 'Toutes' },
      { key: 'colonnes', type: 'number', label: 'colCount', min: 1, max: 4, step: 1 },
      { key: 'libelle', type: 'text', label: 'catalogueLibelle' },
    ],
  },

  produit: {
    category: 'boutique', icon: 'button',
    defaults: () => ({ produit: '', libelle: 'Acheter', montrerPrix: true }),
    fields: [
      { key: 'produit', type: 'produit', label: 'produitChoisi' },
      { key: 'libelle', type: 'text', label: 'catalogueLibelle' },
    ],
  },

  menu: {
    category: 'basique', icon: 'list',
    defaults: () => ({ liens: '', align: 'center' }),
    fields: [
      { key: 'liens', type: 'lines', label: 'menuLiens' },
      { key: 'align', type: 'align', label: 'alignLabel' },
    ],
  },

  copyright: {
    category: 'basique', icon: 'pages',
    defaults: () => ({ nom: '', depuis: '', mention: 'Tous droits réservés', align: 'center' }),
    fields: [
      { key: 'nom', type: 'text', label: 'copyrightNom', placeholder: 'Nom du site ou de la société' },
      { key: 'depuis', type: 'number', label: 'copyrightDepuis', min: 1900, max: 2200, step: 1 },
      { key: 'mention', type: 'text', label: 'copyrightMention' },
      { key: 'align', type: 'align', label: 'alignLabel' },
    ],
  },

  map: {
    category: 'media', icon: 'map',
    defaults: () => ({ query: '', height: 340 }),
    fields: [
      { key: 'query', type: 'text', label: 'mapQuery', placeholder: '14 route de la Forêt, Parentis' },
      { key: 'height', type: 'number', label: 'heightLabel', min: 160, max: 800, step: 20 },
    ],
  },
};

/** Crée un widget neuf, avec ses valeurs par défaut. */
export function createWidget(type) {
  const def = WIDGETS[type];
  if (!def) return null;
  const noeud = { key: uid('w'), type, props: { ...def.defaults(), style: {} } };
  if (def.container) {
    noeud.children = def.columns
      ? Array.from({ length: noeud.props.count }, () => ({ key: uid('c'), type: 'column', children: [] }))
      : [];
  }
  return noeud;
}

/** Aligne un élément selon la propriété `align`. */
function appliquerAlignement(el, align) {
  if (align && align !== 'left') el.style.textAlign = align;
}

/**
 * Construit le DOM d'un widget.
 * @param {object} noeud
 * @param {Document} doc
 * @returns {Element|null}
 */
/**
 * @param {object} noeud arbre du widget
 * @param {Document} doc document cible
 * @param {{produits?:object[], boutique?:object}} [contexte] données du site
 *   dont certains widgets ont besoin — le catalogue, par exemple.
 */
export function renderWidget(noeud, doc, contexte = {}) {
  if (!noeud || !noeud.type) return null;
  const p = noeud.props || {};
  let el = null;

  switch (noeud.type) {
    case 'section': {
      el = doc.createElement('section');
      const interieur = doc.createElement('div');
      interieur.style.maxWidth = (p.maxWidth || 1080) + 'px';
      interieur.style.margin = '0 auto';
      interieur.style.padding = (p.padding ?? 64) + 'px 24px';
      el.appendChild(interieur);
      rendreEnfants(noeud.children, interieur, doc, contexte);
      break;
    }

    case 'hero': {
      el = doc.createElement('section');
      el.style.position = 'relative';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.minHeight = HAUTEURS_HERO[p.hauteur] || HAUTEURS_HERO.grande;
      el.style.overflow = 'hidden';
      // La feuille du site met presque toujours du rembourrage sur `section`
      // et contraint `section > *` à une largeur maximale. Sur un bandeau
      // plein cadre, cela laisserait le voile au centre et l'image nue sur
      // les bords. On neutralise donc les deux, ici seulement.
      el.style.padding = '0';

      const fond = safeImageUrl(p.image);
      if (fond) {
        el.style.backgroundImage = `url("${fond.replace(/"/g, '%22')}")`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
      }

      // Le voile est ce qui rend le texte lisible sur n'importe quelle photo.
      // Sans lui, une image claire avale un titre blanc.
      const voile = Math.max(0, Math.min(90, Number(p.voile ?? 45)));
      if (fond && voile) {
        const rideau = doc.createElement('div');
        rideau.setAttribute('aria-hidden', 'true');
        rideau.style.cssText = 'position:absolute;inset:0;max-width:none;margin:0;';
        rideau.style.background = p.texte === 'sombre'
          ? `rgba(255,255,255,${voile / 100})`
          : `rgba(0,0,0,${voile / 100})`;
        el.appendChild(rideau);
      }

      const dedans = doc.createElement('div');
      dedans.style.position = 'relative';
      dedans.style.width = '100%';
      dedans.style.maxWidth = (p.maxWidth || 900) + 'px';
      dedans.style.margin = '0 auto';
      dedans.style.padding = '64px 24px';
      appliquerAlignement(dedans, p.align || 'center');
      rendreEnfants(noeud.children, dedans, doc, contexte);
      el.appendChild(dedans);

      // La feuille de style du site fixe la couleur des titres : hériter ne
      // suffirait pas. On la pose donc sur chaque descendant qui n'en a pas
      // déjà une à lui.
      if (fond) {
        const encre = p.texte === 'sombre' ? '#12141a' : '#ffffff';
        dedans.style.color = encre;
        for (const enfant of dedans.querySelectorAll('*')) {
          if (!enfant.style.color) enfant.style.color = 'inherit';
        }
      }

      // Un titre de bandeau n'a pas la taille d'un titre de section. La
      // feuille du site plafonne les h2 autour de 35 px ; sur une image plein
      // cadre, c'est ce qui fait « document » plutôt que « page ». On grossit,
      // sans écraser une taille que le client aurait choisie lui-même.
      for (const titre of dedans.querySelectorAll('h1, h2, h3')) {
        if (titre.style.fontSize) continue;
        titre.style.fontSize = 'clamp(2.4rem, 6.5vw, 4.8rem)';
        titre.style.lineHeight = '1.05';
      }
      break;
    }

    case 'carte': {
      const lien = safeUrl(p.href);
      el = doc.createElement(lien ? 'a' : 'div');
      if (lien) { el.setAttribute('href', lien); el.style.textDecoration = 'none'; }
      el.style.position = 'relative';
      el.style.display = 'flex';
      el.style.flexDirection = 'column';
      el.style.justifyContent = 'flex-end';
      el.style.minHeight = Math.max(140, Math.min(700, Number(p.hauteur) || 300)) + 'px';
      el.style.overflow = 'hidden';
      el.style.color = '#fff';

      const visuel = safeImageUrl(p.image);
      if (visuel) {
        el.style.backgroundImage = `url("${visuel.replace(/"/g, '%22')}")`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
      } else {
        el.style.background = '#20242c';
      }

      // Un dégradé plutôt qu'un voile uniforme : l'image reste visible en
      // haut, le texte reste lisible en bas.
      const ombre = doc.createElement('span');
      ombre.setAttribute('aria-hidden', 'true');
      ombre.style.cssText = 'position:absolute;inset:0;'
        + 'background:linear-gradient(transparent 35%, rgba(0,0,0,.72));';
      el.appendChild(ombre);

      const pied = doc.createElement('span');
      pied.style.cssText = 'position:relative;display:block;padding:22px 22px 20px;';
      if (p.titre) {
        const titre = doc.createElement('strong');
        titre.textContent = remplacerJetons(p.titre);
        titre.style.cssText = 'display:block;font-size:1.3em;line-height:1.2;color:inherit;';
        pied.appendChild(titre);
      }
      if (p.sousTitre) {
        const sous = doc.createElement('span');
        sous.textContent = remplacerJetons(p.sousTitre);
        sous.style.cssText = 'display:block;margin-top:6px;font-size:.72em;'
          + 'letter-spacing:.16em;text-transform:uppercase;opacity:.82;color:inherit;';
        pied.appendChild(sous);
      }
      el.appendChild(pied);
      break;
    }

    case 'etiquette': {
      el = doc.createElement('p');
      el.textContent = remplacerJetons(p.text);
      el.style.cssText = 'font-size:.74em;letter-spacing:.18em;text-transform:uppercase;'
        + 'margin:0 0 14px;opacity:.7;';
      appliquerAlignement(el, p.align);
      break;
    }

    case 'column': {
      el = doc.createElement('div');
      el.style.minWidth = '0';
      rendreEnfants(noeud.children, el, doc, contexte);
      break;
    }

    case 'columns': {
      el = doc.createElement('div');
      el.style.display = 'grid';
      el.style.gridTemplateColumns = pistesColonnes(p);
      el.style.gap = (p.gap ?? 28) + 'px';
      rendreEnfants(noeud.children, el, doc, contexte);
      break;
    }

    case 'heading': {
      el = doc.createElement(['h2', 'h3', 'h4'].includes(p.level) ? p.level : 'h2');
      el.textContent = remplacerJetons(p.text);
      appliquerAlignement(el, p.align);
      break;
    }

    case 'text': {
      el = doc.createElement('div');
      el.innerHTML = safeHtml(remplacerJetons(p.html));
      appliquerAlignement(el, p.align);
      break;
    }

    case 'button': {
      el = doc.createElement('div');
      appliquerAlignement(el, p.align);
      const lien = doc.createElement('a');
      lien.textContent = String(p.text ?? '');
      const href = safeUrl(p.href);
      if (href) lien.setAttribute('href', href);
      if (p.target === '_blank') {
        lien.setAttribute('target', '_blank');
        lien.setAttribute('rel', 'noopener noreferrer');
      }
      el.appendChild(lien);
      break;
    }

    case 'list': {
      el = doc.createElement('ul');
      for (const ligne of String(p.items ?? '').split('\n')) {
        if (!ligne.trim()) continue;
        const item = doc.createElement('li');
        item.textContent = ligne.trim();
        el.appendChild(item);
      }
      break;
    }

    case 'citation': {
      el = doc.createElement('blockquote');
      for (const ligne of String(p.texte ?? '').split('\n')) {
        if (!ligne.trim()) continue;
        const para = doc.createElement('p');
        para.textContent = remplacerJetons(ligne.trim());
        el.appendChild(para);
      }
      if (String(p.source ?? '').trim()) {
        const source = doc.createElement('cite');
        source.textContent = remplacerJetons(String(p.source).trim());
        el.appendChild(source);
      }
      break;
    }

    case 'encadre': {
      el = doc.createElement('aside');
      if (String(p.titre ?? '').trim()) {
        const titre = doc.createElement('strong');
        titre.textContent = remplacerJetons(String(p.titre).trim());
        el.appendChild(titre);
      }
      const liste = doc.createElement('ul');
      for (const ligne of String(p.items ?? '').split('\n')) {
        if (!ligne.trim()) continue;
        const item = doc.createElement('li');
        item.textContent = remplacerJetons(ligne.trim());
        liste.appendChild(item);
      }
      if (liste.childNodes.length) el.appendChild(liste);
      break;
    }

    case 'accordeon': {
      el = doc.createElement('div');
      const entrees = lignesDe(p.items);
      if (!entrees.length) {
        el.appendChild(placeholder(doc, 'Une ligne par question : Question | Réponse'));
        break;
      }
      // Un accordéon exclusif se déclare par `name`, et le navigateur s'en
      // charge. Un navigateur qui ignore l'attribut laisse simplement deux
      // panneaux ouverts : personne ne perd de contenu. En revanche `name`
      // interdit d'en ouvrir plusieurs, donc il n'a rien à faire là quand on
      // a justement demandé que tout soit ouvert.
      const exclusif = p.exclusif === 'oui' && p.ouvert !== 'tous';
      entrees.forEach((ligne, rang) => {
        const [question, ...reponse] = champsDe(ligne);
        const details = doc.createElement('details');
        if (exclusif) details.setAttribute('name', 'a' + noeud.key);
        if (p.ouvert === 'tous' || (p.ouvert !== 'aucun' && rang === 0)) {
          details.setAttribute('open', '');
        }
        details.style.cssText = 'border-top:1px solid rgba(128,128,128,.28);'
          + (rang === entrees.length - 1 ? 'border-bottom:1px solid rgba(128,128,128,.28);' : '');

        const titre = doc.createElement('summary');
        titre.textContent = remplacerJetons(question);
        titre.style.cssText = 'cursor:pointer;padding:15px 0;font-weight:600;';
        details.appendChild(titre);

        const corps = doc.createElement('p');
        corps.textContent = remplacerJetons(reponse.join(' | '));
        corps.style.cssText = 'margin:0 0 17px;';
        details.appendChild(corps);
        el.appendChild(details);
      });
      break;
    }

    case 'onglets': {
      el = doc.createElement('div');
      const entrees = lignesDe(p.items);
      if (!entrees.length) {
        el.appendChild(placeholder(doc, 'Une ligne par onglet : Titre | Contenu'));
        break;
      }
      const classe = classeDe(noeud);
      el.className = classe;
      // Les titres et les panneaux sont frères, dans un seul conteneur souple :
      // les panneaux prennent toute la ligne, les titres se serrent sur la
      // précédente. Sans sous-conteneur, la règle `:checked ~ div` reste vraie.
      el.style.cssText = 'position:relative;display:flex;flex-wrap:wrap;gap:14px 22px;';
      if (p.align === 'center') el.style.justifyContent = 'center';
      if (p.align === 'right') el.style.justifyContent = 'flex-end';

      const regles = [
        `.${classe}>label{cursor:pointer;padding:8px 0;`
          + 'border-bottom:2px solid transparent;opacity:.6}',
        `.${classe}>div{display:none;width:100%;margin:0}`,
        `.${classe}>input:checked+label{opacity:1;border-bottom-color:currentColor}`,
        `.${classe}>input:focus-visible+label{outline:2px solid currentColor;outline-offset:4px}`,
      ];

      // Les titres sont posés d'abord, les panneaux ensuite : intercalés, le
      // conteneur souple renverrait chaque titre sous le panneau précédent au
      // lieu de les aligner en une rangée.
      const titres = [];
      const panneaux = [];
      entrees.forEach((ligne, rang) => {
        const [titre, ...contenu] = champsDe(ligne);
        const id = noeud.key + '-o' + (rang + 1);

        const bouton = doc.createElement('input');
        bouton.setAttribute('type', 'radio');
        bouton.setAttribute('name', noeud.key);
        bouton.setAttribute('id', id);
        if (rang === 0) bouton.setAttribute('checked', '');
        // Effacé en style EN LIGNE, et non par la feuille : si la feuille
        // venait à manquer, on verrait trois boutons radio en trop plutôt que
        // trois panneaux empilés sur une case à cocher. Effacé, pas
        // `display:none` — il reste dans l'ordre de tabulation, et les flèches
        // du clavier changent d'onglet comme il faut.
        bouton.style.cssText = 'position:absolute;width:1px;height:1px;'
          + 'opacity:0;margin:0;pointer-events:none;';

        const etiquette = doc.createElement('label');
        etiquette.setAttribute('for', id);
        etiquette.textContent = remplacerJetons(titre);

        const panneau = doc.createElement('div');
        const texte = doc.createElement('p');
        texte.textContent = remplacerJetons(contenu.join(' | '));
        texte.style.margin = '0';
        panneau.appendChild(texte);

        titres.push(bouton, etiquette);
        panneaux.push(panneau);
        regles.push(`.${classe}>#${id}:checked~div:nth-of-type(${rang + 1}){display:block}`);
      });
      el.append(feuilleDe(doc, regles), ...titres, ...panneaux);
      break;
    }

    case 'temoignages': {
      el = doc.createElement('div');
      const avis = lignesDe(p.items);
      if (!avis.length) {
        el.appendChild(placeholder(doc, 'Une ligne par avis : L’avis | Le nom | Ville'));
        break;
      }
      grilleSouple(el, Math.max(180, Number(p.largeurMini) || 260), Math.max(0, p.gap ?? 26));

      const etoiles = Math.max(0, Math.min(5, Number(p.etoiles ?? 0)));
      for (const ligne of avis) {
        const [propos, nom, detail] = champsDe(ligne);
        const bloc = doc.createElement('figure');
        bloc.style.cssText = 'margin:0;display:flex;flex-direction:column;gap:12px;';

        // Des caractères, pas des images : une étoile dessinée serait une
        // requête de plus, et celle-ci est déjà dans toutes les polices.
        if (etoiles) {
          const note = doc.createElement('p');
          note.textContent = '★'.repeat(etoiles) + '☆'.repeat(5 - etoiles);
          note.setAttribute('aria-label', `${etoiles} sur 5`);
          note.style.cssText = 'margin:0;letter-spacing:.14em;';
          bloc.appendChild(note);
        }

        const citation = doc.createElement('blockquote');
        citation.style.margin = '0';
        const phrase = doc.createElement('p');
        phrase.textContent = remplacerJetons(propos);
        phrase.style.margin = '0';
        citation.appendChild(phrase);
        bloc.appendChild(citation);

        const signature = [remplacerJetons(nom || ''), remplacerJetons(detail || '')]
          .filter(Boolean).join(' — ');
        if (signature) {
          const auteur = doc.createElement('figcaption');
          auteur.textContent = signature;
          auteur.style.cssText = 'font-size:.86em;opacity:.72;';
          bloc.appendChild(auteur);
        }
        el.appendChild(bloc);
      }
      break;
    }

    case 'galerie': {
      el = doc.createElement('div');
      const images = lignesDe(p.images).map((x) => safeImageUrl(x)).filter(Boolean);
      if (!images.length) {
        el.appendChild(placeholder(doc, 'Ajoutez des photos depuis la bibliothèque.'));
        break;
      }
      grilleSouple(el, Math.max(80, Number(p.largeurMini) || 200), Math.max(0, p.gap ?? 12));

      const hauteur = Math.max(80, Math.min(600, Number(p.hauteur) || 220));
      const visionneuse = p.visionneuse === 'oui';
      const idGalerie = 'g' + noeud.key;
      const idVue = (rang) => 'v' + noeud.key + '-' + rang;
      // La croix et les flèches renvoient à la galerie elle-même, et non à une
      // ancre vide : refermer la visionneuse ne doit pas remonter en haut de
      // la page, mais rendre la vue là où on l'a ouverte.
      if (visionneuse) el.setAttribute('id', idGalerie);

      images.forEach((src, rang) => {
        const vignette = doc.createElement('img');
        vignette.setAttribute('src', src);
        vignette.setAttribute('alt', '');
        vignette.setAttribute('loading', 'lazy');
        vignette.style.cssText = `width:100%;height:${hauteur}px;`
          + 'object-fit:cover;display:block;';
        if (!visionneuse) { el.appendChild(vignette); return; }

        const ouvrir = doc.createElement('a');
        ouvrir.setAttribute('href', '#' + idVue(rang));
        ouvrir.setAttribute('aria-label', `Agrandir la photo ${rang + 1}`);
        ouvrir.style.cssText = 'display:block;overflow:hidden;';
        ouvrir.appendChild(vignette);
        el.appendChild(ouvrir);
      });

      if (visionneuse) {
        const regles = [];
        images.forEach((src, rang) => {
          const vue = doc.createElement('div');
          vue.setAttribute('id', idVue(rang));
          // `hidden` plutôt qu'une règle de la feuille : sans la feuille, la
          // visionneuse reste fermée au lieu d'étaler les photos en pleine
          // page les unes sous les autres. Et rien n'est perdu — les mêmes
          // photos sont déjà dans la grille, juste au-dessus.
          vue.setAttribute('hidden', '');
          vue.style.cssText = 'position:fixed;inset:0;z-index:9000;padding:22px;'
            + 'align-items:center;justify-content:center;background:rgba(8,8,10,.92);';

          // Cliquer à côté referme : c'est le geste qu'on fait sans y penser.
          // Mais ce lien-là double la croix, qui dit déjà la même chose : le
          // laisser dans l'ordre de lecture ferait annoncer « Fermer » deux
          // fois à qui n'a que la voix pour naviguer.
          const fond = doc.createElement('a');
          fond.setAttribute('href', '#' + idGalerie);
          fond.setAttribute('aria-hidden', 'true');
          fond.setAttribute('tabindex', '-1');
          fond.style.cssText = 'position:absolute;inset:0;';
          vue.appendChild(fond);

          const grande = doc.createElement('img');
          grande.setAttribute('src', src);
          grande.setAttribute('alt', '');
          grande.style.cssText = 'position:relative;max-width:94%;max-height:84vh;'
            + 'width:auto;height:auto;object-fit:contain;';
          vue.appendChild(grande);

          const commande = (signe, libelle, cible, place) => {
            const lien = doc.createElement('a');
            lien.setAttribute('href', '#' + cible);
            lien.setAttribute('aria-label', libelle);
            lien.textContent = signe;
            lien.style.cssText = 'position:absolute;' + place
              + ';display:flex;align-items:center;justify-content:center;'
              + 'width:44px;height:44px;color:#fff;text-decoration:none;'
              + 'font-size:27px;line-height:1;';
            vue.appendChild(lien);
          };
          commande('×', 'Fermer', idGalerie, 'top:8px;right:8px');
          if (images.length > 1) {
            const avant = (rang - 1 + images.length) % images.length;
            const apres = (rang + 1) % images.length;
            commande('‹', 'Photo précédente', idVue(avant), 'left:4px;top:50%;margin-top:-22px');
            commande('›', 'Photo suivante', idVue(apres), 'right:4px;top:50%;margin-top:-22px');
          }
          el.appendChild(vue);
          regles.push(`#${idVue(rang)}:target{display:flex}`);
        });
        el.insertBefore(feuilleDe(doc, regles), el.firstChild);
      }
      break;
    }

    case 'chiffres': {
      el = doc.createElement('div');
      const entrees = lignesDe(p.items);
      if (!entrees.length) {
        el.appendChild(placeholder(doc, 'Une ligne par chiffre : 400 | chantiers livrés'));
        break;
      }
      grilleSouple(el, Math.max(120, Number(p.largeurMini) || 180), Math.max(0, p.gap ?? 24));

      for (const ligne of entrees) {
        const [valeur, ...libelle] = champsDe(ligne);
        const bloc = doc.createElement('div');
        appliquerAlignement(bloc, p.align || 'center');

        const nombre = doc.createElement('strong');
        nombre.textContent = remplacerJetons(valeur);
        // En `em` et non en pixels : la taille suit celle réglée sur le bloc,
        // donc une surcharge de format d'écran la fait suivre avec elle.
        nombre.style.cssText = 'display:block;font-size:2.7em;line-height:1.05;';
        bloc.appendChild(nombre);

        const mot = doc.createElement('span');
        mot.textContent = remplacerJetons(libelle.join(' | '));
        mot.style.cssText = 'display:block;margin-top:8px;font-size:.78em;'
          + 'letter-spacing:.14em;text-transform:uppercase;opacity:.72;';
        bloc.appendChild(mot);
        el.appendChild(bloc);
      }
      break;
    }

    case 'tarifs': {
      el = doc.createElement('div');
      const offres = lignesDe(p.items);
      if (!offres.length) {
        el.appendChild(placeholder(doc,
          'Une ligne par offre : Nom | Prix | Mention | avantage ; avantage | adresse'));
        break;
      }
      grilleSouple(el, Math.max(200, Number(p.largeurMini) || 240), Math.max(0, p.gap ?? 22));

      const enAvant = parseInt(p.enAvant, 10);
      offres.forEach((ligne, rang) => {
        const [nom, prix, mention, avantages, adresse] = champsDe(ligne);
        const distinguee = rang + 1 === enAvant;
        const colonne = doc.createElement('div');
        // Un trait plus net, et rien d'autre : une couleur inventée ici
        // jurerait avec la charte du site, que le module ne connaît pas.
        colonne.style.cssText = 'display:flex;flex-direction:column;gap:12px;padding:26px 24px;'
          + (distinguee ? 'border:2px solid currentColor;' : 'border:1px solid rgba(128,128,128,.3);');

        if (distinguee && String(p.etiquetteAvant ?? '').trim()) {
          const marque = doc.createElement('p');
          marque.textContent = remplacerJetons(p.etiquetteAvant);
          marque.style.cssText = 'margin:0;font-size:.7em;letter-spacing:.16em;'
            + 'text-transform:uppercase;opacity:.75;';
          colonne.appendChild(marque);
        }

        const titre = doc.createElement('h3');
        titre.textContent = remplacerJetons(nom || '');
        titre.style.margin = '0';
        colonne.appendChild(titre);

        if (prix) {
          const montant = doc.createElement('p');
          montant.textContent = remplacerJetons(prix);
          montant.style.cssText = 'margin:0;font-size:2em;line-height:1.1;font-weight:600;';
          colonne.appendChild(montant);
        }
        if (mention) {
          const sous = doc.createElement('p');
          sous.textContent = remplacerJetons(mention);
          sous.style.cssText = 'margin:0;font-size:.9em;opacity:.72;';
          colonne.appendChild(sous);
        }

        const liste = doc.createElement('ul');
        liste.style.cssText = 'margin:0;flex:1;';
        for (const avantage of String(avantages ?? '').split(';')) {
          if (!avantage.trim()) continue;
          const item = doc.createElement('li');
          item.textContent = remplacerJetons(avantage.trim());
          liste.appendChild(item);
        }
        if (liste.childNodes.length) colonne.appendChild(liste);

        const href = safeUrl(adresse);
        const libelle = String(p.libelle ?? '').trim();
        if (href && libelle) {
          const action = doc.createElement('a');
          action.setAttribute('href', href);
          action.textContent = remplacerJetons(libelle);
          colonne.appendChild(action);
        }
        el.appendChild(colonne);
      });
      break;
    }

    case 'reseaux': {
      el = doc.createElement('nav');
      el.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;align-items:center;';
      appliquerAlignement(el, p.align);
      if (p.align === 'center') el.style.justifyContent = 'center';
      if (p.align === 'right') el.style.justifyContent = 'flex-end';

      const taille = Math.max(12, Math.min(72, Number(p.taille) || 22));
      const rayon = p.forme === 'carre' ? '9px' : '50%';
      for (const ligne of lignesDe(p.liens)) {
        const [mot, adresse] = champsDe(ligne);
        const marque = marqueDe(mot);
        // Un mot qu'on ne sait pas dessiner ne donne pas une icône vide : il
        // ne donne rien, et la ligne suivante est traitée.
        if (!marque) continue;

        const href = safeUrl(adresse);
        const lien = doc.createElement(href ? 'a' : 'span');
        if (href) lien.setAttribute('href', href);
        lien.setAttribute('title', nomDeMarque(marque));
        // L'icône est un dessin : sans nom accessible, le lien serait annoncé
        // « lien » et rien de plus.
        lien.setAttribute('aria-label', nomDeMarque(marque));
        lien.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;'
          + 'color:inherit;text-decoration:none;'
          + (p.forme === 'nu' ? '' : `width:${taille * 2}px;height:${taille * 2}px;`
            + `border:1px solid currentColor;border-radius:${rayon};`);
        lien.appendChild(tracerMarque(doc, marque, taille));
        el.appendChild(lien);
      }
      if (!el.childNodes.length) {
        el.appendChild(placeholder(doc, 'Une ligne par réseau : instagram | https://…'));
      }
      break;
    }

    case 'divider': {
      el = doc.createElement('hr');
      el.style.width = Math.max(10, Math.min(100, p.width ?? 100)) + '%';
      el.style.marginLeft = '0';
      break;
    }

    case 'spacer': {
      el = doc.createElement('div');
      el.style.height = Math.max(0, p.height ?? 48) + 'px';
      el.setAttribute('aria-hidden', 'true');
      break;
    }

    case 'image': {
      el = doc.createElement('div');
      appliquerAlignement(el, p.align);
      const img = doc.createElement('img');
      const src = safeImageUrl(p.src);
      if (src) img.setAttribute('src', src);
      img.setAttribute('alt', safeText(p.alt || '').replace(/&lt;|&gt;/g, ''));
      img.style.width = Math.max(10, Math.min(100, p.width ?? 100)) + '%';
      img.style.display = 'inline-block';
      el.appendChild(img);
      break;
    }

    case 'video': {
      el = doc.createElement('div');
      const src = urlIntegration(p.url);
      const fichierVideo = src ? '' : fichierMedia(p.url, VIDEO_EXT);
      if (fichierVideo) {
        // Vidéo déposée dans la bibliothèque du site : lecteur natif.
        const lecteur = doc.createElement('video');
        lecteur.setAttribute('controls', '');
        lecteur.setAttribute('playsinline', '');
        lecteur.setAttribute('preload', 'metadata');
        lecteur.setAttribute('src', fichierVideo);
        lecteur.style.cssText = 'width:100%;height:auto;display:block;';
        el.appendChild(lecteur);
      } else if (src) {
        el.style.position = 'relative';
        el.style.paddingBottom = '56.25%';
        const cadre = doc.createElement('iframe');
        cadre.setAttribute('src', src);
        cadre.setAttribute('title', 'Vidéo');
        cadre.setAttribute('loading', 'lazy');
        cadre.setAttribute('allowfullscreen', '');
        cadre.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;';
        el.appendChild(cadre);
      } else {
        el.appendChild(placeholder(doc, 'Ajoutez l’adresse d’une vidéo (YouTube, Vimeo ou fichier MP4).'));
      }
      break;
    }

    case 'audio': {
      el = doc.createElement('div');
      const source = safeImageUrl(p.src) || (/^(https?:|\/|\.\/)/i.test(String(p.src || '')) ? String(p.src) : '');
      if (p.title) {
        const legende = doc.createElement('p');
        legende.textContent = String(p.title);
        el.appendChild(legende);
      }
      if (source) {
        const lecteur = doc.createElement('audio');
        lecteur.setAttribute('controls', '');
        lecteur.setAttribute('src', source);
        lecteur.style.width = '100%';
        el.appendChild(lecteur);
      } else {
        el.appendChild(placeholder(doc, 'Indiquez l’adresse d’un fichier audio (MP3, OGG).'));
      }
      break;
    }

    case 'catalogue':
    case 'produit': {
      // Le catalogue vit dans les réglages du site, pas dans le widget : un
      // produit corrigé l'est partout où il apparaît.
      const catalogue = contexte.produits || [];
      const liste = noeud.type === 'produit'
        ? catalogueFiltre(catalogue).filter((x) => x.id === p.produit).slice(0, 1)
        : catalogueFiltre(catalogue, p.categorie);

      el = doc.createElement('div');
      if (!liste.length) {
        el.appendChild(placeholder(doc, noeud.type === 'produit'
          ? 'Choisissez un produit dans les réglages.'
          : 'Aucun produit. Ajoutez-en depuis le panneau Boutique.'));
        break;
      }

      if (noeud.type === 'catalogue') {
        const colonnes = Math.max(1, Math.min(4, Number(p.colonnes) || 3));
        el.style.display = 'grid';
        el.style.gridTemplateColumns = `repeat(${colonnes}, minmax(0, 1fr))`;
        el.style.gap = '28px';
      }

      for (const produit of liste) {
        const carte = doc.createElement('div');
        if (produit.image) {
          const img = doc.createElement('img');
          img.setAttribute('src', produit.image);
          img.setAttribute('alt', produit.nom);
          img.setAttribute('loading', 'lazy');
          img.style.cssText = 'width:100%;height:auto;display:block;margin-bottom:14px;';
          carte.appendChild(img);
        }
        const titre = doc.createElement('h3');
        titre.textContent = produit.nom;
        carte.appendChild(titre);

        if (produit.description) {
          const texte = doc.createElement('p');
          texte.textContent = produit.description;
          carte.appendChild(texte);
        }
        if (p.montrerPrix !== false) {
          const prix = doc.createElement('p');
          prix.textContent = prixLisible(produit);
          prix.style.fontWeight = '600';
          carte.appendChild(prix);
        }
        const achat = doc.createElement('div');
        achat.appendChild(boutonAchat(doc, produit, contexte.boutique, String(p.libelle || 'Acheter')));
        carte.appendChild(achat);
        el.appendChild(carte);
      }
      break;
    }

    case 'menu': {
      // Une ligne par entrée : « Libellé | adresse ». Sans adresse, on
      // déduit un nom de fichier du libellé — c'est ce qu'attend quelqu'un
      // qui tape juste « Contact ».
      el = doc.createElement('nav');
      appliquerAlignement(el, p.align);
      el.style.display = 'flex';
      el.style.flexWrap = 'wrap';
      el.style.gap = '22px';
      if (p.align === 'center') el.style.justifyContent = 'center';
      if (p.align === 'right') el.style.justifyContent = 'flex-end';

      for (const ligne of String(p.liens ?? '').split('\n')) {
        const brut = ligne.trim();
        if (!brut) continue;
        const [libelle, adresse] = brut.split('|').map((x) => x.trim());
        if (!libelle) continue;
        const lien = doc.createElement('a');
        lien.textContent = libelle;
        const href = safeUrl(adresse || fichierDepuisLibelle(libelle));
        if (href) lien.setAttribute('href', href);
        el.appendChild(lien);
      }
      if (!el.childNodes.length) el.appendChild(placeholder(doc, 'Une ligne par entrée : Accueil | index.html'));
      break;
    }

    case 'copyright': {
      // L'année est recalculée à chaque affichage : le pied de page d'un
      // site vitrine ne devrait jamais afficher une année périmée.
      el = doc.createElement('p');
      appliquerAlignement(el, p.align);
      const annee = new Date().getFullYear();
      const depuis = parseInt(p.depuis, 10);
      const periode = Number.isFinite(depuis) && depuis > 1900 && depuis < annee
        ? depuis + '–' + annee
        : String(annee);
      el.textContent = ['©', periode, remplacerJetons(p.nom).trim(), remplacerJetons(p.mention).trim() ? '— ' + remplacerJetons(p.mention) : '']
        .filter(Boolean).join(' ');
      break;
    }

    case 'map': {
      el = doc.createElement('div');
      const requete = String(p.query || '').trim();
      if (requete) {
        const cadre = doc.createElement('iframe');
        cadre.setAttribute('src', 'https://www.google.com/maps?output=embed&q=' + encodeURIComponent(requete));
        cadre.setAttribute('title', 'Carte');
        cadre.setAttribute('loading', 'lazy');
        cadre.style.cssText = `width:100%;height:${Math.max(160, p.height ?? 340)}px;border:0;`;
        el.appendChild(cadre);
      } else {
        el.appendChild(placeholder(doc, 'Indiquez une adresse à afficher sur la carte.'));
      }
      break;
    }

    default:
      return null;
  }

  // Habillage propre au widget : même schéma que pour les éléments du site.
  if (p.style) {
    // Un bouton est un lien seul dans un bloc : c'est le LIEN qu'on voit.
    // Sans cette distinction, changer la couleur ou la forme d'un bouton
    // habillait l'enveloppe invisible et ne se voyait nulle part.
    const interieur = CIBLES_STYLE[noeud.type]?.(el);
    if (interieur) {
      applyStyleObject(el, p.style, { groupes: ['place', 'space'] });
      applyStyleObject(interieur, p.style, { groupes: ['colors', 'type', 'border'] });
    } else {
      applyStyleObject(el, p.style);
    }
  }

  el.setAttribute('data-admin-widget', noeud.key);
  el.setAttribute('data-admin-type', noeud.type);
  return el;
}

function rendreEnfants(enfants, parent, doc, contexte = {}) {
  for (const enfant of enfants || []) {
    const el = renderWidget(enfant, doc, contexte);
    if (el) parent.appendChild(el);
  }
}

/** Bloc d'attente affiché tant qu'un widget n'est pas renseigné. */
function placeholder(doc, texte) {
  const el = doc.createElement('p');
  el.textContent = texte;
  el.style.cssText = 'padding:26px;border:1px dashed currentColor;opacity:.45;text-align:center;margin:0;';
  return el;
}

/** « Nos tarifs » → « nos-tarifs.html ». */
function fichierDepuisLibelle(libelle) {
  const slug = String(libelle).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug ? slug + '.html' : '';
}

const VIDEO_EXT = /\.(mp4|webm|ogv|mov|m4v)$/i;

/**
 * Adresse d'un fichier média servi tel quel (bibliothèque du site ou lien
 * direct), par opposition à une page d'hébergeur.
 */
function fichierMedia(url, extensions) {
  const valeur = String(url || '').trim();
  if (!valeur) return '';
  const chemin = valeur.split(/[?#]/)[0];
  if (!extensions.test(chemin)) return '';
  return /^https?:/i.test(valeur) || /^[/.]/.test(valeur) ? valeur : '';
}

/** N'accepte que des hébergeurs vidéo connus, en URL d'intégration. */
function urlIntegration(url) {
  const valeur = String(url || '').trim();
  if (!valeur) return '';
  try {
    const u = new URL(valeur, 'https://x/');
    if (/(^|\.)youtube\.com$/.test(u.hostname)) {
      const id = u.searchParams.get('v');
      return id ? 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) : '';
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.slice(1);
      return id ? 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) : '';
    }
    if (/(^|\.)vimeo\.com$/.test(u.hostname)) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      return /^\d+$/.test(id || '') ? 'https://player.vimeo.com/video/' + id : '';
    }
  } catch { /* URL illisible */ }
  return '';
}

const JETONS = /\{\{\s*(année|annee|year)\s*\}\}/gi;

/**
 * Remplace les jetons d'un texte de widget. Seuls les widgets en profitent :
 * ils sont reconstruits depuis leurs réglages à chaque affichage, alors qu'un
 * texte du site est relu depuis la page quand le client le modifie — le jeton
 * y serait remplacé par sa valeur, et l'année figerait sans prévenir.
 */
export function remplacerJetons(texte) {
  return String(texte ?? '').replace(JETONS, String(new Date().getFullYear()));
}

/** Parcourt un arbre de widgets et retourne le nœud portant cette clé. */
export function findWidget(racines, key, parent = null) {
  for (const noeud of racines || []) {
    if (noeud.key === key) return { noeud, parent: parent || racines, liste: racines };
    if (noeud.children) {
      const trouve = findWidget(noeud.children, key, noeud);
      if (trouve) return trouve;
    }
  }
  return null;
}

/** Retire un widget de l'arbre. */
export function removeWidget(racines, key) {
  for (let i = 0; i < racines.length; i++) {
    if (racines[i].key === key) { racines.splice(i, 1); return true; }
    if (racines[i].children && removeWidget(racines[i].children, key)) return true;
  }
  return false;
}
