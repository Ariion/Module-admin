/**
 * Adaptateur média : Firebase Storage.
 * Nécessite le plan Blaze (quota gratuit généreux, mais carte bancaire).
 * @module media/firebase-storage
 */
import { preparerJeu, safeFileName } from './resize.js';
import { srcsetDe } from '../core/images.js';
import { debug } from '../core/log.js';

export function createFirebaseStorageAdapter(config, backend) {
  return {
    id: 'firebase',
    label: 'Firebase Storage',
    canUpload: true,

    async upload(file, { onProgress } = {}) {
      const { module, instance } = await backend.storage();
      const jeu = await preparerJeu(file, config.media);
      // Un seul horodatage pour tout le jeu : les largeurs d'une même photo se
      // suivent alors dans la liste du dossier, au lieu d'être dispersées.
      const lot = Date.now();

      const envoyer = async (variante, suivre) => {
        const path = `sites/${config.siteId}/media/${lot}-${safeFileName(variante.name)}`;
        const ref = module.ref(instance, path);
        const task = module.uploadBytesResumable(ref, variante.blob, {
          contentType: variante.type || file.type,
          cacheControl: 'public, max-age=31536000',
        });
        await new Promise((resolve, reject) => {
          task.on('state_changed',
            (snap) => suivre?.(snap.bytesTransferred / (snap.totalBytes || 1)),
            reject,
            resolve);
        });
        return {
          url: await module.getDownloadURL(ref),
          path,
          width: variante.width,
          height: variante.height,
          size: variante.blob.size,
          type: variante.type || file.type,
        };
      };

      // L'image elle-même d'abord, et c'est elle qui porte la progression : les
      // petites largeurs ne pèsent presque rien, une barre qui reculerait pour
      // elles serait un mensonge poli.
      const principale = await envoyer(jeu.principale, onProgress);

      // Une largeur intermédiaire qui échoue ne coûte que ce gain-là.
      const petites = [];
      for (const variante of jeu.variantes.slice(0, -1)) {
        try {
          petites.push(await envoyer(variante));
        } catch (err) {
          debug('variante non envoyée', variante.width, err);
        }
      }
      onProgress?.(1);

      const variantes = [...petites, principale];
      return {
        ...principale,
        name: jeu.principale.name,
        srcset: srcsetDe(variantes),
        variantes,
      };
    },

    /**
     * Retire l'image ET ses largeurs intermédiaires : un stockage facturé à
     * l'octet n'a pas à garder des fichiers que plus rien ne désigne.
     */
    async remove(item) {
      const chemins = [item.path, ...(item.variantes || []).map((v) => v.path)];
      const utiles = [...new Set(chemins.filter(Boolean))];
      if (!utiles.length) return;
      const { module, instance } = await backend.storage();
      for (const path of utiles) {
        await module.deleteObject(module.ref(instance, path)).catch(() => {});
      }
    },
  };
}
