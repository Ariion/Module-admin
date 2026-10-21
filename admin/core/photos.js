/**
 * Catalogue des photos d'exemple. ÉCRIT PAR `npm run photos`.
 *
 * Ne pas modifier à la main : le fichier est réécrit entièrement à chaque
 * passage. Pour ajouter une photo, déposez-la dans `photos-source/` et
 * relancez la commande.
 *
 * Les adresses partent de la racine du site et non du module : une page
 * publiée garde ses images le jour où le client retire le module.
 *
 * Vide par défaut : tant qu'aucune photo n'est déposée, tous les métiers
 * gardent leurs scènes dessinées.
 * @module core/photos
 */
export const PHOTOS = {};

/** Les photos d'un métier, ou une liste vide s'il n'en a pas. */
export function photosDuMetier(metierId) {
  return PHOTOS[metierId] || [];
}
