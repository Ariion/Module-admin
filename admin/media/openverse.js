/**
 * Openverse — des photos libres, sans clé d'API.
 *
 * C'est ce qui manquait : Pixabay demande une clé, gratuite mais personnelle,
 * et beaucoup d'acquéreurs n'iront jamais la chercher. Openverse (fondation
 * WordPress) répond aux requêtes anonymes et envoie les en-têtes CORS, donc
 * l'éditeur peut l'interroger directement depuis le navigateur.
 *
 * Le catalogue est plus petit que celui de Pixabay et la qualité plus
 * inégale — c'est le prix de l'absence de clé. Il sert de source par défaut ;
 * qui veut mieux renseigne une clé Pixabay depuis les réglages.
 *
 * LICENCES — le point délicat. Openverse indexe aussi des images en CC-BY,
 * qui OBLIGENT à créditer l'auteur. Un client qui pioche une photo sans le
 * savoir se met en tort. On ne demande donc que les licences sans obligation
 * de mention : CC0 et domaine public. Moins de résultats, mais aucun piège.
 *
 * @module media/openverse
 */
const POINT = 'https://api.openverse.org/v1/images/';

/** Licences qui n'obligent à rien : ni mention, ni partage à l'identique. */
const LICENCES_LIBRES = 'cc0,pdm';

/**
 * @param {object} config configuration du site
 * @returns {{id:string, disponible:boolean, chercher:Function}}
 */
export function createOpenverse(config) {
  // Point d'entrée surchargeable : c'est ce qui rend la recherche testable
  // sans réseau.
  const base = config.media?.openverseUrl || POINT;

  return {
    id: 'openverse',
    // Aucune clé : la source est toujours disponible. Si le réseau ou le
    // service manque, `chercher` échoue et l'onglet le dit — mais on ne
    // masque pas la fonction pour autant.
    disponible: true,
    besoinCle: false,

    async chercher(requete, { page = 1 } = {}) {
      const params = new URLSearchParams({
        q: String(requete || '').slice(0, 100),
        page: String(page),
        page_size: '24',
        license: LICENCES_LIBRES,
        mature: 'false',
      });

      const reponse = await fetch(base + '?' + params.toString(), {
        headers: { accept: 'application/json' },
      });
      if (!reponse.ok) {
        throw new Error(reponse.status === 429
          ? 'Trop de recherches d’un coup : réessayez dans une minute.'
          : `La banque d’images a répondu ${reponse.status}.`);
      }
      const json = await reponse.json();

      return {
        total: Number(json.result_count) || 0,
        images: (json.results || [])
          // Sans fichier utilisable, la vignette ne sert à rien.
          .filter((hit) => hit && (hit.url || hit.thumbnail))
          .map((hit) => ({
            id: String(hit.id || ''),
            apercu: hit.thumbnail || hit.url || '',
            url: hit.url || hit.thumbnail || '',
            largeur: hit.width || 0,
            hauteur: hit.height || 0,
            auteur: hit.creator || '',
            licence: String(hit.license || '').toUpperCase(),
            etiquettes: (hit.tags || []).map((t) => t.name).filter(Boolean).join(', ')
              || String(hit.title || ''),
          })),
      };
    },
  };
}
