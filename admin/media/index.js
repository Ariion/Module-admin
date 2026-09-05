/**
 * Sélection de l'adaptateur média.
 *
 * Le module ne force aucun fournisseur : le stockage des images est un point
 * d'extension. Écrire un nouvel adaptateur (Cloudinary, S3, Bunny...) revient
 * à exposer `upload(file)` et, si possible, `list()`.
 * @module media
 */
import { createFirebaseStorageAdapter } from './firebase-storage.js';
import { createEndpointAdapter } from './endpoint.js';
import { createUrlAdapter } from './url.js';

/**
 * @param {object} config configuration du site
 * @param {object} backend back-end de données (fournit le jeton d'auth)
 * @returns {{primary:object, adapters:object[]}}
 */
export function createMedia(config, backend) {
  const requested = config.media?.adapter || (config.media?.endpoint ? 'endpoint' : 'firebase');
  const adapters = [];

  if (requested === 'endpoint' || config.media?.endpoint) {
    adapters.push(createEndpointAdapter(config, backend));
  }
  if (requested === 'firebase' && backend.storage) {
    adapters.push(createFirebaseStorageAdapter(config, backend));
  }
  adapters.push(createUrlAdapter());

  const primary = adapters.find((a) => a.id === requested) || adapters[0];
  return { primary, adapters };
}
