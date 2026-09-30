/**
 * Sélection de l'adaptateur média.
 *
 * Le module ne force aucun fournisseur : le stockage des images est un point
 * d'extension. Écrire un nouvel adaptateur (Cloudinary, S3, Bunny...) revient
 * à exposer `upload(file)` et, si possible, `list()`.
 *
 * Ce que `upload` doit rendre, et ce que chaque champ sert :
 *
 *   url, path, name, size, type    l'image telle qu'on la stocke et l'affiche
 *   width, height                  la proportion écrite dans le HTML publié,
 *                                  pour que la page ne saute pas au chargement
 *   srcset                         les largeurs, prêtes à poser telles quelles
 *   variantes[]                    {url, path, width, height} de chacune, pour
 *                                  pouvoir toutes les effacer avec l'image
 *
 * Les trois derniers sont facultatifs : un adaptateur qui ne produit qu'une
 * largeur reste parfaitement utilisable — le module écrit alors un `src` seul,
 * comme avant. C'est ce qui arrive aussi pour une adresse saisie à la main et
 * pour une image de banque laissée à distance.
 * @module media
 */
import { createFirebaseStorageAdapter } from './firebase-storage.js';
import { createEndpointAdapter } from './endpoint.js';
import { createUrlAdapter } from './url.js';
import { createBanque } from './banque.js';

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
  return { primary, adapters, banque: createBanque(config, backend) };
}
