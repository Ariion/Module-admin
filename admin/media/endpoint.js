/**
 * Adaptateur média : dossier hébergé chez le client.
 *
 * C'est la réponse au « je ne veux pas d'abonnement en plus » : les images
 * restent sur l'hébergement du site (OVH, o2switch...), dans un dossier
 * `/medias`, servi par le même domaine. Le module dialogue avec un petit
 * script déposé à la racine (voir tools/admin-endpoint.php), qui vérifie le
 * jeton Firebase avant d'écrire quoi que ce soit.
 *
 * Avantages : zéro coût supplémentaire, bibliothèque consultable en FTP,
 * images servies depuis le même domaine (bon pour la performance).
 * @module media/endpoint
 */
import { prepareImage, safeFileName } from './resize.js';

export function createEndpointAdapter(config, backend) {
  const endpoint = config.media?.endpoint;

  const call = async (options) => {
    const token = await backend.idToken();
    const headers = token ? { Authorization: 'Bearer ' + token } : {};
    const response = await fetch(options.url, { ...options, headers: { ...headers, ...options.headers } });
    const text = await response.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* réponse non JSON */ }
    if (!response.ok || !json || json.error) {
      throw new Error(json?.error || `Le serveur a répondu ${response.status}. ${text.slice(0, 120)}`);
    }
    return json;
  };

  return {
    id: 'endpoint',
    label: 'Dossier du site',
    canUpload: !!endpoint,

    async upload(file, { onProgress } = {}) {
      if (!endpoint) throw new Error('Aucun endpoint média configuré (media.endpoint).');
      const prepared = await prepareImage(file, config.media);
      const form = new FormData();
      form.append('file', prepared.blob, safeFileName(prepared.name));
      form.append('siteId', config.siteId);

      onProgress?.(0.1);
      const json = await call({ url: endpoint + '?action=upload', method: 'POST', body: form });
      onProgress?.(1);

      return {
        url: json.url,
        path: json.path || '',
        name: prepared.name,
        size: prepared.blob.size,
        width: prepared.width,
        height: prepared.height,
        type: prepared.type || file.type,
      };
    },

    /** Liste ce que contient réellement le dossier, même déposé en FTP. */
    async list() {
      if (!endpoint) return [];
      const json = await call({ url: endpoint + '?action=list&siteId=' + encodeURIComponent(config.siteId) });
      return Array.isArray(json.files) ? json.files : [];
    },

    async remove(item) {
      if (!endpoint || !item.path) return;
      await call({
        url: endpoint + '?action=delete',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: item.path, siteId: config.siteId }),
      });
    },
  };
}
