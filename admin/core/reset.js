/**
 * Remise à zéro : rendre au site son code d'origine.
 *
 * C'est l'opération la plus destructrice du module, et elle mérite d'être
 * décrite précisément — ce qu'elle efface, et surtout ce qu'elle n'efface pas.
 *
 * ELLE EFFACE le contenu écrit depuis le module : textes, images posées,
 * sections ajoutées, habillage, et — sur une remise à zéro complète — les
 * réglages du site (ambiance, catalogue, réponses aux pages légales, brief).
 *
 * ELLE N'EFFACE PAS :
 *   - **le code du client**, qui est justement ce vers quoi on revient. Sur un
 *     site existant, la page retrouve le HTML écrit par son développeur ; sur
 *     une page de départ, elle redevient la page livrée ;
 *   - **la bibliothèque média** : ce sont des fichiers que le client a
 *     téléversés, souvent introuvables ailleurs. Les supprimer serait pire que
 *     ce qu'on lui propose de défaire ;
 *   - **l'historique des publications**. C'est le filet : une remise à zéro
 *     publie un contenu vide, elle n'efface pas les versions précédentes, et
 *     l'historique permet donc de revenir en arrière.
 *
 * D'où le choix de PUBLIER UN CONTENU VIDE plutôt que de supprimer les
 * documents : l'effet visible est le même, mais l'opération reste réversible.
 *
 * @module core/reset
 */
import { debug, warn } from './log.js';

/** Un instantané sans rien dedans : ce qu'on publie pour tout remettre à zéro. */
export function instantaneVide() {
  return { v: 1, content: {}, collections: {}, sections: { add: [], hide: [], order: [] } };
}

/**
 * Les clés que le module a laissées dans ce navigateur pour ce site.
 * Elles portent des états d'interface — assistant déjà vu, étapes cochées,
 * cache de lecture — qui n'auraient plus de sens après une remise à zéro.
 */
export function clesLocales(siteId) {
  const gardees = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const cle = localStorage.key(i);
      if (!cle || !cle.startsWith('admin:')) continue;
      if (cle.includes(':' + siteId + ':') || cle.endsWith(':' + siteId)) gardees.push(cle);
    }
  } catch { /* stockage refusé */ }
  return gardees;
}

/** Vide les traces locales du site. */
export function oublierLocal(siteId) {
  for (const cle of clesLocales(siteId)) {
    try { localStorage.removeItem(cle); } catch { /* stockage refusé */ }
  }
}

/**
 * Remet une page à zéro.
 *
 * @param {object} options
 * @param {object} options.backend
 * @param {object} options.hosting hébergement (facultatif)
 * @param {string} options.pageId
 * @param {string} [options.chemin] fichier .html à rendre à son état d'origine
 * @returns {Promise<{contenu:boolean, html:boolean, erreur:string}>}
 */
export async function remettreAZero({ backend, hosting, pageId, chemin }) {
  const bilan = { contenu: false, html: false, erreur: '' };

  // 1. Le contenu. Le brouillon part, la page publiée devient vide — mais
  //    l'historique garde ce qu'il y avait avant.
  try {
    await backend.discardDraft(pageId).catch(() => {});
    await backend.publish(pageId, instantaneVide(), 'Remise à zéro');
    bilan.contenu = true;
  } catch (err) {
    bilan.erreur = err?.message || 'Le contenu n’a pas pu être remis à zéro.';
    warn('remise à zéro : contenu', err);
    return bilan;
  }

  // 2. Le fichier HTML. Il a pu être réécrit à chaque publication : on lui
  //    rend la source, c'est-à-dire le code du développeur.
  if (hosting?.enabled && chemin) {
    try {
      const { sourceUrl } = await hosting.ensureSource(chemin);
      const reponse = await fetch(sourceUrl, { cache: 'no-store' });
      if (!reponse.ok) throw new Error(`Source illisible (${reponse.status}).`);
      const html = await reponse.text();
      if (!html.trim()) throw new Error('Source vide.');
      await hosting.writePage(html, chemin);
      bilan.html = true;
    } catch (err) {
      // Le contenu est déjà vide : la page est correcte pour le visiteur, même
      // si le fichier garde des sections écrites en dur. On le dit.
      bilan.erreur = err?.message || 'Le fichier HTML n’a pas pu être rétabli.';
      warn('remise à zéro : HTML', err);
    }
  }

  debug('remise à zéro', pageId, bilan);
  return bilan;
}

/**
 * Remet le site entier à zéro : chaque page connue, et le document commun
 * qui porte l'en-tête, le pied de page et les réglages.
 *
 * @param {object} options
 * @param {string[]} options.pages identifiants de page
 * @param {Object<string,string>} [options.chemins] pageId → fichier .html
 * @returns {Promise<{faites:number, erreurs:string[]}>}
 */
export async function remettreLeSiteAZero({ backend, hosting, pages, chemins = {}, siteId }) {
  const erreurs = [];
  let faites = 0;

  for (const pageId of pages) {
    const bilan = await remettreAZero({ backend, hosting, pageId, chemin: chemins[pageId] });
    if (bilan.contenu) faites += 1;
    if (bilan.erreur) erreurs.push(`${pageId} : ${bilan.erreur}`);
  }

  oublierLocal(siteId);
  return { faites, erreurs };
}
