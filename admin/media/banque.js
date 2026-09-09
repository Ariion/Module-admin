/**
 * Banque d'images libres de droits.
 *
 * Le client n'a pas toujours de photos. Plutôt que de le laisser chercher
 * ailleurs et revenir avec un fichier de 6 Mo, l'éditeur interroge une banque
 * et pose l'image choisie dans sa bibliothèque.
 *
 * Deux sources, et l'ordre compte :
 *   - **Openverse**, sans clé : c'est la source par défaut, celle qui marche
 *     dès l'installation, sans que l'acquéreur ait à ouvrir un compte nulle
 *     part. Restreinte aux licences sans obligation de mention.
 *   - **Pixabay**, avec une clé gratuite et personnelle : plus grand
 *     catalogue, meilleure qualité. La clé se renseigne depuis les réglages
 *     du module, sans toucher au code.
 *
 * Ses conditions demandent aussi de ne pas se contenter de pointer leurs
 * fichiers : quand l'hébergement le permet, l'image est rapatriée dans le
 * dossier du site (`action=import` du script PHP), ce qui est de toute façon
 * meilleur pour la performance et la pérennité du site.
 * @module media/banque
 */
import { createOpenverse } from './openverse.js';

const POINT = 'https://pixabay.com/api/';

/**
 * @param {object} config configuration du site
 * @param {object} backend back-end de données (jeton d'authentification)
 * @returns {{id:string, disponible:boolean, chercher:Function, importer:Function}}
 */
export function createBanque(config, backend) {
  const openverse = createOpenverse(config);
  // La clé peut venir du fichier de configuration OU des réglages du site,
  // saisis depuis l'éditeur. La seconde l'emporte : c'est la plus récente,
  // et c'est celle que le client peut corriger lui-même.
  let cle = config.media?.pixabay || '';
  const endpoint = config.media?.endpoint || '';
  // Point d'entrée surchargeable : c'est ce qui rend la recherche testable
  // sans clé ni réseau.
  const base = config.media?.banqueUrl || POINT;

  return {
    get id() { return cle ? 'pixabay' : 'openverse'; },
    /** Il y a toujours une source : sans clé, c'est Openverse. */
    get disponible() { return !!cle || openverse.disponible; },
    get avecCle() { return !!cle; },
    peutImporter: !!endpoint,

    /** Clé saisie depuis les réglages du module. */
    setCle(valeur) { cle = String(valeur || '').trim() || (config.media?.pixabay || ''); },

    /**
     * @param {string} requete termes recherchés
     * @param {{page?:number, orientation?:string}} options
     * @returns {Promise<{total:number, images:object[]}>}
     */
    async chercher(requete, { page = 1, orientation = 'all' } = {}) {
      if (!cle) return openverse.chercher(requete, { page });
      const params = new URLSearchParams({
        key: cle,
        q: String(requete || '').slice(0, 100),
        image_type: 'photo',
        safesearch: 'true',
        per_page: '24',
        page: String(page),
        lang: config.lang === 'en' ? 'en' : 'fr',
      });
      if (orientation !== 'all') params.set('orientation', orientation);

      const reponse = await fetch(base + '?' + params.toString());
      if (!reponse.ok) {
        throw new Error(reponse.status === 429
          ? 'Trop de recherches d’un coup : réessayez dans une minute.'
          : `La banque d’images a répondu ${reponse.status}.`);
      }
      const json = await reponse.json();
      return {
        total: Number(json.totalHits) || 0,
        images: (json.hits || []).map((hit) => ({
          id: String(hit.id),
          apercu: hit.webformatURL || hit.previewURL || '',
          // largeImageURL est la version publiable ; webformatURL sert d'appoint.
          url: hit.largeImageURL || hit.webformatURL || '',
          largeur: hit.imageWidth || 0,
          hauteur: hit.imageHeight || 0,
          auteur: hit.user || '',
          etiquettes: String(hit.tags || ''),
        })),
      };
    },

    /**
     * Rapatrie l'image dans le dossier du site quand c'est possible, et
     * renvoie l'élément à ranger dans la bibliothèque.
     */
    async importer(image) {
      const nom = (String(image.etiquettes || '').split(',')[0] || 'image')
        .trim().replace(/\s+/g, '-').slice(0, 60) || 'image';
      const provenance = cle ? 'pixabay' : 'openverse';
      if (!endpoint) {
        // Hébergement statique : on garde l'adresse de la banque.
        return { url: image.url, name: nom, kind: 'image', source: provenance, auteur: image.auteur };
      }
      const token = await backend.idToken();
      const reponse = await fetch(endpoint + '?action=import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: JSON.stringify({ url: image.url, name: nom, siteId: config.siteId }),
      });
      const texte = await reponse.text();
      let json = null;
      try { json = JSON.parse(texte); } catch { /* réponse non JSON */ }
      if (!reponse.ok || !json || json.error) {
        throw new Error(json?.error || `Le serveur a répondu ${reponse.status}.`);
      }
      return {
        url: json.url, path: json.path, name: json.name || nom,
        size: json.size, type: json.type, kind: 'image', source: provenance, auteur: image.auteur,
      };
    },
  };
}
