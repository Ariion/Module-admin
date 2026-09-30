/**
 * Performance des images : un seul vocabulaire, du téléversement au fichier
 * publié.
 *
 * Sur un site vitrine réel, les images sont l'essentiel du poids de la page.
 * Le module savait déjà ramener une photo à 1920 px avant l'envoi ; cela ne
 * règle que le cas du grand écran. Un téléphone de 390 px téléchargeait la
 * même image, soit une dizaine de fois les octets dont il avait besoin.
 *
 * Trois gains, et ils doivent tous atterrir dans le HTML PUBLIÉ — le module
 * est retirable, un script de notre côté ne compterait pour rien :
 *
 *   `srcset`/`sizes`   plusieurs largeurs, le navigateur choisit ;
 *   `loading`          ce qui est sous le pli n'est pas chargé tout de suite ;
 *   `width`/`height`   la place est réservée avant l'arrivée de l'image.
 *
 * Ces trois-là sont des attributs HTML standards : ils survivent au retrait du
 * module sans rien demander à personne. C'est la raison de ce choix plutôt que
 * d'un observateur en JavaScript, qui aurait été plus souple et serait parti
 * avec le dossier `admin/`.
 * @module core/images
 */
import { safeImageUrl } from './sanitize.js';

/**
 * Les largeurs intermédiaires produites à l'envoi.
 *
 * Trois paliers, pas dix : chaque palier est un fichier de plus à stocker, à
 * envoyer depuis le navigateur du client et à effacer le jour où l'image
 * part. 480 couvre le téléphone, 960 la tablette et le téléphone à écran
 * dense, 1440 l'ordinateur portable ordinaire. La quatrième largeur n'est pas
 * dans cette liste : c'est celle de la source elle-même, plafonnée par
 * `media/resize.js`.
 */
export const LARGEURS = [480, 960, 1440];

/**
 * Les largeurs à produire pour une source de cette largeur.
 *
 * Agrandir n'a aucun intérêt : un palier plus large que la source pèserait
 * plus lourd pour la même quantité d'information. On garde donc les paliers
 * strictement inférieurs, plus la source. Une photo de 700 px donne
 * `[480, 700]` ; une vignette de 300 px ne donne qu'elle-même, et n'aura donc
 * pas de `srcset` — ce qui est juste, il n'y a rien à choisir.
 */
export function largeursUtiles(largeurSource) {
  const source = Math.round(Number(largeurSource) || 0);
  if (!source) return [];
  return [...LARGEURS.filter((l) => l < source), source];
}

/**
 * L'attribut `sizes`, par usage.
 *
 * `sizes` dit au navigateur quelle place l'image occupera, AVANT que la mise
 * en page soit calculée — il choisit le fichier à ce moment-là. Une valeur
 * trop petite donne une image floue, une valeur trop grande annule le gain :
 * on préfère donc surestimer légèrement, un octet de trop se voyant moins
 * qu'un flou.
 *
 * Ces valeurs décrivent les mises en page que le module produit lui-même
 * (bandeau plein cadre, bloc dans une section, grille de vignettes). Pour une
 * image du site du client, on ne peut pas deviner : `sizesMesure` relève la
 * largeur réelle à l'écran.
 */
export const SIZES = {
  /** Bandeau d'accueil : l'image occupe toute la largeur de la fenêtre. */
  pleine: '100vw',
  /** Bloc dans une section : pleine largeur en dessous, plafonné au-delà. */
  bloc: '(max-width: 1100px) 100vw, 1080px',
  /** Vignette de galerie : la grille se replie sous 640 px. */
  vignette: '(max-width: 640px) 100vw, 33vw',
};

/**
 * Le `sizes` d'une image déjà posée dans la page, déduit de sa largeur à
 * l'écran. Sert aux images du site du client, dont on ne connaît pas la mise
 * en page : on la mesure au moment où le client choisit la photo.
 */
export function sizesMesure(el) {
  const vue = el?.ownerDocument?.defaultView;
  const largeur = Math.round(el?.getBoundingClientRect?.().width || 0);
  const fenetre = vue?.innerWidth || 0;
  if (!largeur || !fenetre) return SIZES.pleine;
  // Une image qui prend presque toute la largeur en prendra toute sur un
  // écran plus étroit : la décrire en pixels fixes ferait télécharger une
  // grande variante à un téléphone.
  if (largeur >= fenetre * 0.9) return SIZES.pleine;
  return `(max-width: ${largeur}px) 100vw, ${largeur}px`;
}

/**
 * La chaîne `srcset` d'un jeu de variantes téléversées.
 *
 * Les descripteurs sont en `w` et non en `x` : c'est la largeur du fichier qui
 * est connue, la densité de l'écran du visiteur ne l'est pas.
 *
 * @param {Array<{url:string, width:number}>} variantes
 */
export function srcsetDe(variantes) {
  const utiles = (variantes || [])
    .filter((v) => v && v.url && Number(v.width) > 0)
    .sort((a, b) => a.width - b.width);
  // Une seule largeur ne se choisit pas : `srcset` serait du bruit, et une
  // chaîne vide dit clairement « rien à proposer » au reste du module.
  if (utiles.length < 2) return '';
  return utiles.map((v) => `${v.url} ${Math.round(v.width)}w`).join(', ');
}

/**
 * Ce qu'un enregistrement de la médiathèque apprend sur une image : de quoi
 * écrire `srcset`, `width` et `height`. Rend `null` quand il n'y a rien à
 * dire — une adresse saisie à la main, une image de banque liée à distance.
 *
 * Le `srcset` est stocké TEL QUEL, jamais recalculé à partir du nom de
 * fichier : l'hébergement renomme ce qu'il reçoit (suffixe aléatoire contre
 * les collisions), et une adresse devinée pointerait sur un fichier absent.
 * Une image cassée sur un téléphone est bien pire que pas de variante.
 */
export function variantesDe(item) {
  if (!item) return null;
  const srcset = item.srcset || srcsetDe(item.variantes);
  const largeur = Math.round(Number(item.width) || 0);
  const hauteur = Math.round(Number(item.height) || 0);
  if (!srcset && !(largeur && hauteur)) return null;
  return { srcset, largeur, hauteur };
}

/**
 * Un `srcset` dont chaque adresse est repassée par le filtre des images.
 *
 * La valeur vient du contenu enregistré, donc de la base : elle doit subir le
 * même examen que n'importe quelle adresse d'image, comme tout ce que le module
 * écrit dans la page. Une seule candidate refusée fait tomber la chaîne
 * entière — un `srcset` incomplet ferait choisir au navigateur une largeur qui
 * n'existe pas, et l'image serait cassée sur les seuls écrans concernés, donc
 * invisible à la relecture.
 */
export function srcsetSur(srcset) {
  const candidates = String(srcset ?? '').split(',').map((c) => c.trim()).filter(Boolean);
  if (candidates.length < 2) return '';
  const propres = [];
  for (const candidate of candidates) {
    const [adresse, descripteur] = candidate.split(/\s+/);
    if (!safeImageUrl(adresse) || !/^\d+w$/.test(descripteur || '')) return '';
    propres.push(`${adresse} ${descripteur}`);
  }
  return propres.join(', ');
}

/**
 * Range les largeurs d'un ou plusieurs médias dans la table d'un réglage.
 *
 * La table est indexée par adresse et taillée aux adresses que le réglage tient
 * réellement : une photo retirée d'une galerie n'y laisse rien. Sans cet
 * élagage, la table d'une galerie qu'on remanie dix fois pèserait dix galeries.
 *
 * @param {object} courant table déjà enregistrée
 * @param {object[]} items médias qui viennent d'être choisis ou téléversés
 * @param {string[]} adresses adresses que le réglage tient après l'opération
 * @returns {object|undefined} la table, ou rien s'il n'y a plus de largeurs
 */
export function rangerVariantes(courant, items, adresses) {
  const table = {};
  const ancienne = courant && typeof courant === 'object' ? courant : {};
  for (const adresse of adresses || []) {
    if (ancienne[adresse]) table[adresse] = ancienne[adresse];
  }
  for (const item of items || []) {
    const connues = variantesDe(item);
    if (item?.url && connues) table[item.url] = connues;
  }
  return Object.keys(table).length ? table : undefined;
}

/**
 * Pose sur un `<img>` tout ce qui le fait arriver vite et sans secousse.
 *
 * @param {Element} img
 * @param {string} src adresse de l'image
 * @param {{srcset?:string, largeur?:number, hauteur?:number}} [variantes]
 * @param {{sizes?:string, differe?:boolean, prioritaire?:boolean}} [options]
 */
export function poserImage(img, src, variantes, options = {}) {
  const { sizes = SIZES.bloc, differe = true, prioritaire = false } = options;
  if (src) img.setAttribute('src', src);

  const srcset = variantes?.srcset || '';
  if (srcset) {
    img.setAttribute('srcset', srcset);
    img.setAttribute('sizes', sizes);
  }

  // Les dimensions ne servent pas à dimensionner — le CSS du site s'en
  // charge — mais à donner la PROPORTION avant l'arrivée du fichier. Sans
  // elles, le texte qui suit l'image remonte puis redescend : c'est le
  // décalage de mise en page, le défaut de chargement le plus visible et le
  // moins cher à corriger.
  if (variantes?.largeur && variantes?.hauteur) {
    img.setAttribute('width', String(variantes.largeur));
    img.setAttribute('height', String(variantes.hauteur));
  }

  // Une image de bandeau différée retarde l'affichage au lieu de
  // l'accélérer : le navigateur ne la demande qu'après avoir calculé la mise
  // en page, alors qu'elle est ce que le visiteur attend. D'où les deux cas.
  if (prioritaire) {
    img.setAttribute('fetchpriority', 'high');
    img.removeAttribute('loading');
    img.removeAttribute('decoding');
  } else if (differe) {
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
  }
  return img;
}

/** Une image de bandeau, à l'attaque : jamais différée, toujours prioritaire. */
export const PREMIER_ECRAN = { differe: false, prioritaire: true };

/**
 * Tranche, sur un document réellement mis en page, ce qui est différé.
 *
 * C'est la seule mesure qui vaille : au rendu, un élément ne sait pas où il
 * tombera dans la page. Un bandeau est toujours en haut, une vignette de
 * galerie presque jamais — mais une simple image peut être l'une ou l'autre,
 * et se tromper coûte cher dans les deux sens (une image de haut de page
 * différée retarde l'affichage ; trente vignettes non différées le retardent
 * tout autant).
 *
 * Deux règles, et la frontière entre elles est celle du HTML du client :
 *
 *   - sur nos propres images (dans une section posée par le module), on
 *     décide dans les deux sens ;
 *   - sur une image du site du client, on n'AJOUTE que ce qui manque, et
 *     seulement des attributs de planification (`loading`, `decoding`) qui ne
 *     changent rien au rendu. Un `loading` écrit par le développeur reste, une
 *     largeur qu'il a fixée reste : c'est lui qui connaît sa page.
 *
 * @param {Document} doc document RENDU (les rectangles doivent être calculés)
 * @param {{pli?:number}} [options] hauteur du premier écran
 * @returns {{differees:number, immediates:number, dimensionnees:number}}
 */
export function reglerChargementImages(doc, options = {}) {
  const vue = doc.defaultView;
  const pli = Number(options.pli) || vue?.innerHeight || 900;
  // Les rectangles sont relatifs à la fenêtre : sans le défilement, une page
  // que le client avait fait défiler verrait son bas de page pris pour son
  // premier écran.
  const defilement = vue?.scrollY || 0;
  let differees = 0;
  let immediates = 0;
  let dimensionnees = 0;

  for (const img of doc.querySelectorAll('img')) {
    // Dans un `<picture>`, c'est `<source>` qui décide du fichier et la
    // proportion change d'une source à l'autre : on n'a rien à y dire.
    if (img.closest('picture')) continue;

    const rect = img.getBoundingClientRect();
    // Un document non rendu donne des rectangles nuls. On préfère alors ne
    // rien conclure : pas de mesure, pas de décision.
    if (!rect.width && !rect.height) continue;

    const notre = !!img.closest('[data-admin-section]');

    // La proportion manque encore : on la relève sur le fichier chargé. Des
    // attributs égaux à la taille réelle de l'image ne déplacent rien — le
    // navigateur arrivait déjà à cette proportion — ils la lui font seulement
    // connaître avant d'avoir reçu les octets. C'est pour cela qu'on s'autorise
    // à les poser aussi sur une image du site du client.
    if (!img.hasAttribute('width') && !img.hasAttribute('height')
      && img.naturalWidth && img.naturalHeight) {
      img.setAttribute('width', String(img.naturalWidth));
      img.setAttribute('height', String(img.naturalHeight));
      dimensionnees += 1;
    }
    const dansLePremierEcran = rect.top + defilement < pli;

    if (dansLePremierEcran) {
      immediates += 1;
      if (notre && img.getAttribute('loading') === 'lazy') {
        img.removeAttribute('loading');
        img.removeAttribute('decoding');
      }
      continue;
    }

    differees += 1;
    if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
    if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
    // Les deux ne vont pas ensemble : une image différée n'est pas prioritaire.
    if (notre) img.removeAttribute('fetchpriority');
  }

  return { differees, immediates, dimensionnees };
}
