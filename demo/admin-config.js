/**
 * Configuration du module d'administration pour ce site.
 * C'est le SEUL fichier à adapter d'un site à l'autre.
 */
window.ADMIN_CONFIG = {
  // Identifiant du site dans la base.
  siteId: 'hotel-des-pins',

  // 'demo' : tout reste dans ce navigateur, aucun compte à créer.
  // Passez à 'firebase' et renseignez les clés ci-dessous pour la production.
  backend: 'demo',

  // firebase: {
  //   apiKey: 'AIza…',
  //   authDomain: 'mon-projet.firebaseapp.com',
  //   projectId: 'mon-projet',
  //   storageBucket: 'mon-projet.appspot.com',
  //   appId: '1:000000000000:web:0000000000000000000000',
  // },

  lang: 'fr',
  debug: true,

  scan: {
    // Le menu et les mentions du pied de page restent gérés par le code.
    exclude: ['.site-nav a'],
  },

  // Réécriture du HTML à chaque publication (demande PHP sur l'hébergement).
  // Renseignez-la en production pour que le site garde son contenu même si le
  // module est retiré un jour.
  // host: { endpoint: '/admin-endpoint.php' },

  media: {
    // 'firebase'  → Firebase Storage (plan Blaze)
    // 'endpoint'  → dossier chez le client (voir tools/admin-endpoint.php)
    // 'url'       → saisie d'une adresse d'image uniquement
    adapter: 'url',
  },
};
