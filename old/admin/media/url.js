/**
 * Adaptateur média : URL saisie à la main.
 *
 * Toujours disponible, aucune configuration. Permet de pointer une image
 * déjà présente sur le site (`/images/hero.jpg`) ou hébergée ailleurs.
 * C'est aussi le mode de repli si aucun stockage n'est configuré.
 * @module media/url
 */
export function createUrlAdapter() {
  return {
    id: 'url',
    label: 'Adresse d’image',
    canUpload: false,
    async upload() {
      throw new Error('Ce mode ne permet pas le téléversement : indiquez une adresse d’image.');
    },
  };
}
