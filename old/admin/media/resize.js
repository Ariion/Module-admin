/**
 * Redimensionnement des images côté navigateur, avant envoi.
 *
 * Un client qui téléverse une photo de 6 Mo sortie de son téléphone ferait
 * exploser à la fois le temps de chargement du site et le quota de stockage.
 * On ramène donc l'image à une largeur raisonnable et on la recompresse.
 *
 * Une seule largeur ne suffit pourtant pas : 1920 px sur un téléphone de
 * 390 px, c'est une dizaine de fois les octets nécessaires. On produit donc un
 * JEU de largeurs, ici, dans le navigateur du client — il n'y a pas de serveur
 * d'application pour le faire après coup, et il n'y en aura pas.
 *
 * Tout est en repli : un format que `createImageBitmap` ne sait pas ouvrir, un
 * encodeur absent, une recompression qui alourdit — dans chacun de ces cas le
 * fichier d'origine part tel quel. Une image qui arrive lourde vaut mieux
 * qu'une image qui n'arrive pas.
 * @module media/resize
 */
import { debug } from '../core/log.js';
import { largeursUtiles } from '../core/images.js';

const RESIZABLE = /^image\/(jpeg|png|webp)$/;

/**
 * Un jeu de largeurs pour une même image.
 *
 * `variantes` est trié de la plus petite à la plus grande et contient
 * TOUJOURS la principale en dernier : l'appelant a donc une seule boucle à
 * écrire, et l'adresse qu'il stockera est celle du dernier envoi.
 *
 * @param {File} file
 * @param {{maxWidth:number, maxHeight:number, quality:number, format:string}} options
 * @returns {Promise<{principale:object, variantes:object[]}>}
 */
export async function preparerJeu(file, options = {}) {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.82,
    format = 'auto',
  } = options;

  const origine = { blob: file, width: 0, height: 0, name: file.name, type: file.type };
  const seule = (principale) => ({ principale, variantes: [principale] });
  if (!RESIZABLE.test(file.type)) return seule(origine);

  try {
    const bitmap = await createImageBitmap(file);
    // `close()` remet les dimensions à zéro : on les relève avant, sinon la
    // proportion écrite dans le HTML publié serait nulle — donc absente, donc
    // aucune place réservée et la page qui saute au chargement.
    const sourceLargeur = bitmap.width;
    const sourceHauteur = bitmap.height;

    const ratio = Math.min(1, maxWidth / sourceLargeur, maxHeight / sourceHauteur);
    const plafondLargeur = Math.round(sourceLargeur * ratio);
    const plafondHauteur = Math.round(sourceHauteur * ratio);

    // WebP quand le navigateur sait l'encoder : à qualité perçue égale, il
    // pèse le tiers d'un JPEG. Quand il ne sait pas, on reste sur le format
    // d'origine — jamais sur un WebP que `toBlob` aurait silencieusement
    // rendu en PNG, ce qui alourdirait au lieu d'alléger.
    const type = format === 'auto'
      ? (supportsWebp() ? 'image/webp' : (file.type === 'image/png' ? 'image/png' : 'image/jpeg'))
      : format;

    const variantes = [];
    for (const largeur of largeursUtiles(plafondLargeur)) {
      const hauteur = Math.max(1, Math.round(plafondHauteur * largeur / plafondLargeur));
      const blob = await encoder(bitmap, largeur, hauteur, type, quality);
      if (!blob) continue;
      const principale = largeur === plafondLargeur;
      variantes.push({
        blob,
        width: largeur,
        height: hauteur,
        name: principale ? renameFor(file.name, type) : nomVariante(file.name, largeur, type),
        type,
      });
    }
    bitmap.close?.();

    const plusGrande = variantes[variantes.length - 1];
    if (!plusGrande) {
      debug('aucun encodage possible, fichier d’origine conservé');
      return seule({ ...origine, width: sourceLargeur, height: sourceHauteur });
    }

    // Recompresser une image déjà optimisée l'alourdit. On garde alors le
    // fichier d'origine comme plus grande largeur — les variantes plus petites,
    // elles, restent un gain, et l'échelle reste cohérente puisque cette
    // comparaison n'a lieu que si l'image n'a pas été réduite.
    if (ratio === 1 && plusGrande.blob.size >= file.size) {
      debug('recompression inutile, fichier d’origine conservé');
      const gardee = { ...origine, width: sourceLargeur, height: sourceHauteur };
      variantes[variantes.length - 1] = gardee;
      return { principale: gardee, variantes };
    }

    return { principale: plusGrande, variantes };
  } catch (err) {
    debug('redimensionnement impossible', err);
    return seule(origine);
  }
}

/**
 * La seule image préparée, sans ses variantes : ce que demande un appelant qui
 * n'a qu'un fichier à poser.
 *
 * @param {File} file
 * @param {object} options mêmes options que `preparerJeu`
 * @returns {Promise<{blob:Blob, width:number, height:number, name:string, type:string}>}
 */
export async function prepareImage(file, options = {}) {
  return (await preparerJeu(file, options)).principale;
}

/** Rend une largeur donnée du bitmap dans le format demandé. */
async function encoder(bitmap, largeur, hauteur, type, quality) {
  const canvas = document.createElement('canvas');
  canvas.width = largeur;
  canvas.height = hauteur;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, largeur, hauteur);
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

let webpSupport = null;
function supportsWebp() {
  if (webpSupport === null) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    webpSupport = canvas.toDataURL('image/webp').startsWith('data:image/webp');
  }
  return webpSupport;
}

function renameFor(name, type) {
  const ext = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' }[type] || 'jpg';
  return name.replace(/\.[a-z0-9]+$/i, '') + '.' + ext;
}

/**
 * Le nom d'une largeur intermédiaire. La largeur est dans le nom pour que la
 * bibliothèque — et un client qui regarde son dossier en FTP — voie tout de
 * suite à quoi sert ce fichier.
 */
function nomVariante(name, largeur, type) {
  return renameFor(name, type).replace(/(\.[a-z0-9]+)$/i, `-${largeur}$1`);
}

/** Nom de fichier sûr pour un stockage distant. */
export function safeFileName(name) {
  return String(name)
    .normalize('NFD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 80) || 'image';
}
