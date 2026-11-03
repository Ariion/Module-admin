/**
 * La fonction que Vercel expose sur `/api/admin`.
 *
 * Vercel n'exécute que ce qui se trouve dans `api/` : le portage écrit dans
 * `tools/admin-endpoint.js` était complet depuis le début, mais jamais
 * atteignable. C'est ce fichier-là qui manquait, et c'est tout ce qui
 * séparait la démonstration d'une publication en un clic.
 *
 * Il ne contient aucune logique. Le contrat, l'authentification et l'écriture
 * dans le dépôt vivent dans le portage, qui reste côte à côte avec sa version
 * PHP — deux hébergements, un seul protocole, et l'éditeur n'a pas à savoir
 * lequel lui répond.
 *
 * Variables à renseigner dans Vercel › Settings › Environment Variables :
 *
 *   GITHUB_TOKEN         jeton fin, « Contents: read and write », ce dépôt seul
 *   GITHUB_REPO          « Ariion/Module-admin »
 *   GITHUB_BRANCH        la branche déployée
 *   FIREBASE_PROJECT_ID  l'identifiant du projet Firebase
 *   SITE_ID              l'identifiant du site dans la base
 *
 * Sans elles, la fonction répond 500 avec le nom de celle qui manque, plutôt
 * que d'échouer en silence.
 */
export { default } from '../tools/admin-endpoint.js';
