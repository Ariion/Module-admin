/**
 * Banque d'images libres de droits.
 *
 * Le client n'a pas toujours de photos. Plutôt que de le laisser chercher
 * ailleurs et revenir avec un fichier de 6 Mo, l'éditeur interroge une banque
 * et pose l'image choisie dans sa bibliothèque.
 *
 * Pixabay demande une clé d'API — gratuite, personnelle. Sans clé, l'onglet
 * explique quoi faire au lieu de faire semblant.
 *
 * Ses conditions demandent aussi de ne pas se contenter de pointer leurs
 * fichiers : quand l'hébergement le permet, l'image est rapatriée dans le
 * dossier du site (`action=import` du script PHP), ce qui est de toute façon
 * meilleur pour la performance et la pérennité du site.
 * @module media/banque
 */
const POINT = 'https://pixabay.com/api/';

/**
 * @param {object} config configuration du site
 * @param {object} backend back-end de données (jeton d'authentification)
 * @returns {{id:string, disponible:boolean, chercher:Function, importer:Function}}
 */
export function createBanque(config, backend) {
  const cle = config.media?.pixabay || '';
  const endpoint = config.media?.endpoint || '';
  // Point d'entrée surchargeable : c'est ce qui rend la recherche testable
  // sans clé ni réseau.
  const base = config.media?.banqueUrl || POINT;

  return {
    id: 'pixabay',
    get disponible() { return !!cle; },
    peutImporter: !!endpoint,

    /**
     * @param {string} requete termes recherchés
     * @param {{page?:number, orientation?:string}} options
     * @returns {Promise<{total:number, images:object[]}>}
     */
    async chercher(requete, { page = 1, orientation = 'all' } = {}) {
      if (!cle) throw new Error('Aucune clé Pixabay dans la configuration (media.pixabay).');
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
      const nom = (image.etiquettes.split(',')[0] || 'image').trim().replace(/\s+/g, '-');
      if (!endpoint) {
        // Hébergement statique : on garde l'adresse de la banque.
        return { url: image.url, name: nom, kind: 'image', source: 'pixabay', auteur: image.auteur };
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
        size: json.size, type: json.type, kind: 'image', source: 'pixabay', auteur: image.auteur,
      };
    },
  };
}
