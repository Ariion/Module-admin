/**
 * Schéma des données Firestore. Un seul endroit décrit les chemins, pour que
 * le runtime, l'éditeur et les règles de sécurité restent alignés.
 *
 *   sites/{siteId}                        méta du site (nom, domaine)
 *   sites/{siteId}/pages/{pageId}         contenu PUBLIÉ  — lecture publique
 *   sites/{siteId}/drafts/{pageId}        BROUILLON       — éditeurs du site
 *   sites/{siteId}/revisions/{revId}      historique des publications
 *   sites/{siteId}/media/{mediaId}        bibliothèque média
 *   sites/{siteId}/members/{uid}          accès du client { role }
 *   superadmins/{uid}                     accès global (le prestataire)
 *
 * Le siteId figure toujours dans le chemin : le même code fonctionne avec un
 * projet Firebase dédié par client (un seul siteId) comme avec un projet
 * mutualisé (plusieurs siteId cloisonnés par les règles).
 * @module data/schema
 */
export const paths = {
  site: (siteId) => `sites/${siteId}`,
  page: (siteId, pageId) => `sites/${siteId}/pages/${pageId}`,
  draft: (siteId, pageId) => `sites/${siteId}/drafts/${pageId}`,
  revisions: (siteId) => `sites/${siteId}/revisions`,
  revision: (siteId, revId) => `sites/${siteId}/revisions/${revId}`,
  media: (siteId) => `sites/${siteId}/media`,
  mediaItem: (siteId, mediaId) => `sites/${siteId}/media/${mediaId}`,
  member: (siteId, uid) => `sites/${siteId}/members/${uid}`,
  superadmin: (uid) => `superadmins/${uid}`,
};

export const ROLES = { OWNER: 'owner', EDITOR: 'editor', VIEWER: 'viewer' };

export function canEdit(role) {
  return role === ROLES.OWNER || role === ROLES.EDITOR;
}
