/**
 * Adaptateur média : Firebase Storage.
 * Nécessite le plan Blaze (quota gratuit généreux, mais carte bancaire).
 * @module media/firebase-storage
 */
import { prepareImage, safeFileName } from './resize.js';

export function createFirebaseStorageAdapter(config, backend) {
  return {
    id: 'firebase',
    label: 'Firebase Storage',
    canUpload: true,

    async upload(file, { onProgress } = {}) {
      const { module, instance } = await backend.storage();
      const prepared = await prepareImage(file, config.media);
      const path = `sites/${config.siteId}/media/${Date.now()}-${safeFileName(prepared.name)}`;
      const ref = module.ref(instance, path);

      const task = module.uploadBytesResumable(ref, prepared.blob, {
        contentType: prepared.type || file.type,
        cacheControl: 'public, max-age=31536000',
      });

      await new Promise((resolve, reject) => {
        task.on('state_changed',
          (snap) => onProgress?.(snap.bytesTransferred / (snap.totalBytes || 1)),
          reject,
          resolve);
      });

      return {
        url: await module.getDownloadURL(ref),
        path,
        name: prepared.name,
        size: prepared.blob.size,
        width: prepared.width,
        height: prepared.height,
        type: prepared.type || file.type,
      };
    },

    async remove(item) {
      if (!item.path) return;
      const { module, instance } = await backend.storage();
      await module.deleteObject(module.ref(instance, item.path)).catch(() => {});
    },
  };
}
