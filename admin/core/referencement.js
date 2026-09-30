/**
 * Référencement : ce que la page dit d'elle-même, et ce que le site déclare.
 *
 * Le module ne connaissait du référencement que le titre et la description.
 * C'est le strict minimum, et il manquait tout ce qui se voit réellement :
 * l'image qui s'affiche quand on partage l'adresse dans un message, l'adresse
 * canonique qui évite qu'une même page compte pour deux, la langue déclarée —
 * qui sert autant aux moteurs qu'aux lecteurs d'écran — et la fiche
 * d'établissement, la seule chose qui fasse apparaître une adresse et un
 * téléphone dans un résultat de recherche.
 *
 * Tout est écrit dans le `<head>`, donc DANS le fichier publié : la
 * régénération recharge la source et lui réapplique l'instantané, et ces
 * balises repartent du même endroit que le titre. Le module retiré, elles
 * restent — c'est la seule façon qu'un référencement serve à quelque chose.
 *
 * Deux règles tiennent ce fichier :
 *
 *   1. **On complète, on ne corrige pas.** Une balise `og:` écrite à la main
 *      par le développeur est un choix ; l'écraser avec le titre du document
 *      serait perdre son travail sans le lui dire. On ne pose donc que ce qui
 *      manque, et on ne remplace que ce que le client a lui-même renseigné
 *      dans le module.
 *   2. **Rien n'est deviné.** Pas de langue par défaut : `lang="fr"` sur un
 *      site anglais est pire que pas de langue du tout, parce que c'est faux
 *      et que plus personne ne le vérifiera. Ce qu'on ne sait pas, l'audit le
 *      réclame au client.
 *
 * @module core/referencement
 */
import { metierById } from './brief.js';
import { safeImageUrl, safeUrl } from './sanitize.js';

/**
 * Marque la fiche d'établissement posée par le module.
 *
 * Le préfixe `data-admin-` est volontairement évité : la régénération du HTML
 * et l'export manuel effacent ce préfixe, et effaceraient donc le seul moyen
 * de retrouver notre fiche pour la remplacer — on en écrirait une deuxième à
 * chaque publication. Même raison que pour `data-formulaire-*`.
 */
export const MARQUE_FICHE = 'data-referencement';

/** Fichiers écrits à la racine du site. Cette liste EST l'autorisation. */
export const FICHIERS_PLAN = ['sitemap.xml', 'robots.txt'];

/**
 * Réglages de référencement du site, jamais `null` : l'écran lit toujours un
 * objet, même quand rien n'a été renseigné.
 */
export function referencementDe(reglages) {
  const valeurs = reglages?.referencement;
  return {
    adresse: '', langue: '', plan: true,
    ...(valeurs && typeof valeurs === 'object' ? valeurs : {}),
  };
}

/**
 * Le type schema.org correspondant au métier déclaré.
 *
 * Un type juste vaut mieux qu'un type précis : `Restaurant` ouvre droit à
 * l'affichage des horaires et de la carte, `LocalBusiness` reste correct
 * partout. On ne descend donc dans le détail que là où le métier ne laisse
 * aucun doute.
 */
const TYPES_SCHEMA = {
  restaurant: 'Restaurant',
  alimentaire: 'FoodEstablishment',
  beaute: 'BeautySalon',
  batiment: 'HomeAndConstructionBusiness',
  sante: 'HealthAndBeautyBusiness',
  conseil: 'ProfessionalService',
  boutique: 'Store',
  creatif: 'ProfessionalService',
  hebergement: 'LodgingBusiness',
  association: 'LocalBusiness',
  sport: 'SportsActivityLocation',
  autre: 'LocalBusiness',
};

/**
 * La fiche d'établissement, construite depuis ce que le client a déjà dit.
 *
 * Aucune question de plus ne lui est posée : le métier, la ville et l'enseigne
 * viennent du questionnaire, l'adresse et le téléphone des mentions légales.
 * Un client qui a rempli l'un des deux a donc sa fiche sans rien faire.
 *
 * @returns {object|null} la fiche, ou null s'il n'y a pas même une enseigne —
 *   une fiche sans nom n'est pas une fiche, et les moteurs l'ignorent.
 */
export function ficheEtablissement(reglages, options = {}) {
  const brief = reglages?.brief || {};
  const legal = reglages?.legal?.donnees || reglages?.legal || {};
  const reglage = referencementDe(reglages);

  const enseigne = texte(brief.activite) || texte(legal.denomination);
  if (!enseigne) return null;

  const adresseSite = safeUrl(reglage.adresse || options.adresse || '') || '';
  const fiche = {
    '@context': 'https://schema.org',
    '@type': TYPES_SCHEMA[brief.metier] || 'LocalBusiness',
    name: enseigne,
  };

  const description = texte(brief.phrase) || metierById(brief.metier).presentation(brief);
  if (description) fiche.description = coupe(description, 300);
  if (adresseSite) fiche.url = adresseSite;
  if (options.image) fiche.image = options.image;

  const telephone = texte(brief.telephone) || texte(legal.telephone);
  if (telephone) fiche.telephone = telephone;
  const courriel = texte(brief.courriel) || texte(legal.email);
  if (courriel) fiche.email = courriel;

  const postale = adressePostale(texte(brief.adresse) || texte(legal.adresse), texte(brief.ville));
  if (postale) fiche.address = postale;

  return fiche;
}

/**
 * L'adresse, découpée autant qu'on sache le faire honnêtement.
 *
 * Le code postal est le seul repère fiable — cinq chiffres d'affilée — et il
 * coupe l'adresse en deux : la rue avant, la commune après. On ne découpe pas
 * aux virgules : une rue en contient (« 12, rue du Puits, bâtiment B »), et
 * envoyer les visiteurs à une adresse fausse coûte bien plus qu'une adresse
 * laissée en un seul morceau.
 *
 * La ville du questionnaire passe devant celle des mentions légales : c'est
 * celle que le client a écrite en pensant à ses clients.
 */
function adressePostale(adresse, ville) {
  if (!adresse && !ville) return null;
  const brut = String(adresse || '').trim();
  const code = /\b(\d{5})\b/.exec(brut);
  const rue = (code ? brut.slice(0, code.index) : brut).replace(/[\s,;]+$/, '').trim();
  const apres = code ? brut.slice(code.index + code[0].length).replace(/^[\s,;]+/, '').trim() : '';

  const postale = { '@type': 'PostalAddress' };
  if (code) postale.postalCode = code[1];
  if (rue) postale.streetAddress = rue;
  const commune = ville || apres;
  if (commune) postale.addressLocality = commune;
  return Object.keys(postale).length > 1 ? postale : null;
}

/**
 * Écrit dans l'en-tête tout ce que le module sait du référencement.
 *
 * Idempotent, et appelé à chaque application d'instantané : deux appels de
 * suite laissent le même document. C'est ce qui permet de l'appeler depuis le
 * modèle (édition, aperçu) ET depuis la régénération, sans compter les
 * passages.
 *
 * @param {Document} doc
 * @param {object} options
 * @param {object} options.meta       le titre, la description, l'image, la canonique
 * @param {object} options.reglages   réglages du site (langue, adresse, brief, légal)
 * @param {string} [options.adresse]  adresse publique de CETTE page, si on la connaît
 */
export function ecrireEntete(doc, { meta = {}, reglages = null, adresse = '' } = {}) {
  const reglage = referencementDe(reglages);
  const titre = texte(meta.titre) || (doc.title || '');
  const description = texte(meta.description)
    || doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
  const image = safeImageUrl(texte(meta.partage)) || '';
  const canonique = safeUrl(texte(meta.canonique)) || safeUrl(adresse) || '';

  // La langue est déclarée sur <html> : c'est là que les lecteurs d'écran la
  // cherchent pour choisir leur voix, et là que les moteurs la lisent.
  if (reglage.langue && doc.documentElement.getAttribute('lang') !== reglage.langue) {
    doc.documentElement.setAttribute('lang', reglage.langue);
  }

  if (canonique) poserLien(doc, 'canonical', canonique, !!texte(meta.canonique));

  // Le partage : ce qui s'affiche quand l'adresse est collée dans un message.
  // Sans image, la vignette est un rectangle gris avec le nom de domaine, et
  // le lien ne donne aucune envie d'être ouvert.
  poserMeta(doc, 'property', 'og:type', 'website', false);
  poserMeta(doc, 'property', 'og:title', titre, false);
  poserMeta(doc, 'property', 'og:description', description, false);
  poserMeta(doc, 'property', 'og:url', canonique, false);
  poserMeta(doc, 'property', 'og:image', image, true);
  if (reglage.langue) poserMeta(doc, 'property', 'og:locale', localeOg(reglage.langue), false);

  // Twitter lit `og:` faute de mieux, mais pas la forme de la vignette : sans
  // `twitter:card`, une image de 1200×630 est rognée en timbre-poste.
  poserMeta(doc, 'name', 'twitter:card', image ? 'summary_large_image' : 'summary', !!image);
  poserMeta(doc, 'name', 'twitter:title', titre, false);
  poserMeta(doc, 'name', 'twitter:description', description, false);
  poserMeta(doc, 'name', 'twitter:image', image, true);

  ecrireFiche(doc, ficheEtablissement(reglages, { adresse: canonique, image }));
}

/**
 * Pose la fiche d'établissement, ou la retire s'il n'y a plus rien à déclarer.
 *
 * Une fiche fausse coûte plus qu'une fiche absente : les moteurs la retiennent
 * et affichent l'ancienne adresse pendant des semaines. On réécrit donc la
 * nôtre entièrement à chaque fois, plutôt que d'y fondre des morceaux.
 */
function ecrireFiche(doc, fiche) {
  const existante = doc.querySelector(`script[${MARQUE_FICHE}="etablissement"]`);
  if (!fiche) { if (existante) existante.remove(); return; }

  const contenu = JSON.stringify(fiche, null, 2);
  const balise = existante || doc.createElement('script');
  if (!existante) {
    balise.setAttribute('type', 'application/ld+json');
    balise.setAttribute(MARQUE_FICHE, 'etablissement');
    (doc.head || doc.documentElement).appendChild(balise);
  }
  if (balise.textContent !== contenu) balise.textContent = contenu;
}

/**
 * Pose une balise d'en-tête.
 *
 * @param {boolean} remplace la valeur vient-elle d'un choix du client ? Si oui
 *   elle prime sur ce que porte déjà la page ; sinon on ne fait que combler un
 *   vide, et le travail du développeur reste intact.
 */
function poserMeta(doc, attribut, cle, valeur, remplace) {
  const existante = doc.querySelector(`meta[${attribut}="${cle}"]`);
  if (!valeur) return;
  if (existante && !remplace) return;
  if (existante) {
    if (existante.getAttribute('content') !== valeur) existante.setAttribute('content', valeur);
    return;
  }
  const balise = doc.createElement('meta');
  balise.setAttribute(attribut, cle);
  balise.setAttribute('content', valeur);
  (doc.head || doc.documentElement).appendChild(balise);
}

function poserLien(doc, rel, href, remplace) {
  const existant = doc.querySelector(`link[rel="${rel}"]`);
  if (existant && !remplace) return;
  if (existant) {
    if (existant.getAttribute('href') !== href) existant.setAttribute('href', href);
    return;
  }
  const balise = doc.createElement('link');
  balise.setAttribute('rel', rel);
  balise.setAttribute('href', href);
  (doc.head || doc.documentElement).appendChild(balise);
}

/** `fr` → `fr_FR`. Facebook attend la forme longue, et ignore l'autre. */
function localeOg(langue) {
  const propre = String(langue || '').replace('-', '_');
  if (propre.includes('_')) return propre;
  return propre ? propre + '_' + propre.toUpperCase() : '';
}

/**
 * Le plan du site, au format que lisent les moteurs.
 *
 * Il ne remplace pas les liens de la page : un moteur suit les liens de toute
 * façon. Il sert aux pages mal liées — une page de remerciement, un article
 * qu'on vient de publier — et il donne une date de dernière modification, ce
 * qu'aucun lien ne dit.
 *
 * @param {object} options
 * @param {string} options.adresse adresse publique du site
 * @param {Array<{chemin:string, modifie?:number}>} options.pages
 * @returns {string} le fichier, ou une chaîne vide sans adresse — un plan
 *   d'adresses relatives n'est lu par personne.
 */
export function planDuSite({ adresse, pages = [] }) {
  const racine = racineDe(adresse);
  if (!racine) return '';

  const vues = new Set();
  const lignes = [];
  for (const page of pages) {
    const url = adressePublique(racine, page?.chemin);
    if (!url || vues.has(url)) continue;
    vues.add(url);
    const modifie = page.modifie ? new Date(page.modifie) : null;
    lignes.push('  <url>\n    <loc>' + xml(url) + '</loc>'
      + (modifie && !Number.isNaN(modifie.getTime())
        ? '\n    <lastmod>' + modifie.toISOString().slice(0, 10) + '</lastmod>' : '')
      + '\n  </url>');
  }
  if (!lignes.length) return '';

  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + lignes.join('\n') + '\n</urlset>\n';
}

/**
 * Le fichier `robots.txt`.
 *
 * Deux lignes utiles. La première ouvre le site : un `robots.txt` absent
 * l'ouvre aussi, mais son absence est indistinguable d'une erreur de serveur,
 * et certains outils s'en plaignent. La seconde donne le plan.
 *
 * La troisième est la seule qui protège quelque chose : l'hébergement garde à
 * côté de chaque page une copie de son code d'origine, `page.src.html`,
 * lisible par qui en connaît l'adresse. Indexée, elle ferait apparaître dans
 * les résultats une version du site d'avant les corrections du client — et
 * deux pages au contenu proche se pénalisent l'une l'autre.
 */
export function robots({ adresse }) {
  const racine = racineDe(adresse);
  const lignes = ['User-agent: *', 'Allow: /', '', 'Disallow: /*.src.html$'];
  if (racine) lignes.push('', 'Sitemap: ' + racine + '/sitemap.xml');
  return lignes.join('\n') + '\n';
}

/** L'origine du site, sans barre finale, ou une chaîne vide. */
export function racineDe(adresse) {
  const propre = safeUrl(String(adresse || '').trim());
  if (!propre) return '';
  try {
    const url = new URL(propre);
    if (!/^https?:$/.test(url.protocol)) return '';
    return (url.origin + url.pathname).replace(/\/+$/, '');
  } catch { return ''; }
}

/**
 * L'adresse publique d'une page.
 *
 * `index.html` devient la racine : c'est l'adresse que les visiteurs partagent
 * et celle que les hébergements servent, et déclarer les deux ferait compter
 * l'accueil pour deux pages au contenu identique.
 */
export function adressePublique(racine, chemin) {
  if (!racine) return '';
  const propre = String(chemin || '').replace(/^\/+/, '').trim();
  if (!propre) return racine + '/';
  if (/^index\.html?$/i.test(propre)) return racine + '/';
  return racine + '/' + propre.split('/').map(encodeURIComponent).join('/');
}

function xml(valeur) {
  return String(valeur)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function texte(valeur) {
  return typeof valeur === 'string' ? valeur.trim() : '';
}

function coupe(valeur, max) {
  const propre = String(valeur).replace(/\s+/g, ' ').trim();
  return propre.length > max ? propre.slice(0, max - 1).trimEnd() + '…' : propre;
}
