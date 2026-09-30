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
import { preparerJeu, safeFileName } from './resize.js';
import { srcsetDe } from '../core/images.js';
import { debug } from '../core/log.js';

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
      const jeu = await preparerJeu(file, config.media);

      const envoyer = async (variante) => {
        const form = new FormData();
        form.append('file', variante.blob, safeFileName(variante.name));
        form.append('siteId', config.siteId);
        const json = await call({ url: endpoint + '?action=upload', method: 'POST', body: form });
        return {
          url: json.url,
          path: json.path || '',
          width: variante.width,
          height: variante.height,
          size: variante.blob.size,
          type: variante.type || file.type,
        };
      };

      // L'image elle-même d'abord : si elle ne passe pas, rien ne doit rester
      // dans le dossier, et l'erreur doit remonter au client.
      onProgress?.(0.1);
      const principale = await envoyer(jeu.principale);

      // Les petites largeurs sont un gain, pas une condition. Une seule qui
      // échoue — quota atteint, réseau coupé au mauvais moment — ne doit pas
      // coûter au client l'image qu'il vient de choisir : elle manquera dans
      // le `srcset`, et le navigateur prendra la grande.
      const petites = [];
      const reste = jeu.variantes.slice(0, -1);
      for (let i = 0; i < reste.length; i += 1) {
        onProgress?.(0.1 + 0.9 * ((i + 1) / (reste.length + 1)));
        try {
          petites.push(await envoyer(reste[i]));
        } catch (err) {
          debug('variante non envoyée', reste[i].width, err);
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

    /** Liste ce que contient réellement le dossier, même déposé en FTP. */
    async list() {
      if (!endpoint) return [];
      const json = await call({ url: endpoint + '?action=list&siteId=' + encodeURIComponent(config.siteId) });
      return Array.isArray(json.files) ? json.files : [];
    },

    /**
     * Retire l'image ET ses largeurs intermédiaires : sans cela, chaque photo
     * effacée laisserait trois fichiers que plus rien ne désigne, et le
     * dossier du client grossirait sans que personne ne sache pourquoi.
     */
    async remove(item) {
      if (!endpoint) return;
      const chemins = [item.path, ...(item.variantes || []).map((v) => v.path)];
      for (const path of [...new Set(chemins.filter(Boolean))]) {
        await call({
          url: endpoint + '?action=delete',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path, siteId: config.siteId }),
        }).catch((err) => debug('variante non supprimée', path, err));
      }
    },
  };
}
