/**
 * Redimensionnement des images côté navigateur, avant envoi.
 *
 * Un client qui téléverse une photo de 6 Mo sortie de son téléphone ferait
 * exploser à la fois le temps de chargement du site et le quota de stockage.
 * On ramène donc l'image à une largeur raisonnable et on la recompresse.
 * @module media/resize
 */
import { debug } from '../core/log.js';

const RESIZABLE = /^image\/(jpeg|png|webp)$/;

/**
 * @param {File} file
 * @param {{maxWidth:number, maxHeight:number, quality:number, format:string}} options
 * @returns {Promise<{blob:Blob, width:number, height:number, name:string, type:string}>}
 */
export async function prepareImage(file, options = {}) {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.82,
    format = 'auto',
  } = options;

  const fallback = { blob: file, width: 0, height: 0, name: file.name, type: file.type };
  if (!RESIZABLE.test(file.type)) return fallback;

  try {
    const bitmap = await createImageBitmap(file);
    const ratio = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
    const width = Math.round(bitmap.width * ratio);
    const height = Math.round(bitmap.height * ratio);

    const type = format === 'auto'
      ? (supportsWebp() ? 'image/webp' : (file.type === 'image/png' ? 'image/png' : 'image/jpeg'))
      : format;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
    if (!blob || blob.size >= file.size) {
      debug('recompression inutile, fichier d’origine conservé');
      return { ...fallback, width: bitmap.width, height: bitmap.height };
    }

    return { blob, width, height, name: renameFor(file.name, type), type };
  } catch (err) {
    debug('redimensionnement impossible', err);
    return fallback;
  }
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
