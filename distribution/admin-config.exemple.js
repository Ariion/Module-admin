/* =========================================================================
   Module Admin — configuration du site

   Copiez ce fichier en « admin-config.js » à la racine du site, et
   renseignez les valeurs. C'est le SEUL fichier qui diffère d'un site à
   l'autre.

   Les clés Firebase se trouvent dans la console :
   Paramètres du projet ▸ Vos applications ▸ application Web ▸ firebaseConfig
   ========================================================================= */
window.ADMIN_CONFIG = {

  // Identifiant du site dans la base. Un site = un identifiant.
  siteId: 'nom-du-site',

  firebase: {
    apiKey:        'À REMPLIR',
    authDomain:    'À REMPLIR.firebaseapp.com',
    projectId:     'À REMPLIR',
    storageBucket: 'À REMPLIR.appspot.com',
    appId:         'À REMPLIR',
  },

  // 'fr' ou 'en'.
  lang: 'fr',

  // Traces dans la console du navigateur. À laisser à true le temps de la
  // mise en route : le module dit alors ce qu'il détecte, ce qu'il applique,
  // et ce qui manque encore dans ce fichier.
  debug: true,

  // ----------------------------------------------------------------- médias
  // 'endpoint' → dossier du site, via admin-endpoint.php (aucun abonnement)
  // 'firebase' → Firebase Storage (demande le plan Blaze)
  // 'url'      → aucun téléversement : la bibliothèque se remplit par adresse
  media: {
    adapter: 'endpoint',
    endpoint: '/admin-endpoint.php',

    // Banque d'images libres de droits dans l'onglet Médias. La clé est
    // gratuite : compte sur pixabay.com, puis pixabay.com/api/docs/.
    // Sans elle, l'onglet explique la marche à suivre.
    pixabay: '',
  },

  // ------------------------------------------------- rédaction assistée
  // FACULTATIF. Le questionnaire « Écrire pour moi » fonctionne déjà sans
  // rien de tout cela : les textes sont composés par le module.
  //
  // Pour les faire écrire par une IA, la clé se met dans admin-endpoint.php
  // (variable $IA_CLE), sur VOTRE hébergement — pas ici. Ce fichier-ci est
  // servi à tous les visiteurs du site : une clé d'API y serait publique,
  // et facturée à qui la trouve. Voir docs/IA.md.
  // ia: { endpoint: '/admin-endpoint.php' },

  // ------------------------------------------------- réécriture du HTML
  // Chaque publication réécrit le fichier .html du site avec le contenu à
  // l'intérieur : le module peut être retiré, le site garde tout.
  // Demande un hébergement PHP. À commenter sur un hébergement statique.
  host: { endpoint: '/admin-endpoint.php' },

  // ------------------------------------------------ affiner la détection
  // scan: {
  //   // Ce que le client ne doit pas pouvoir modifier.
  //   exclude: ['.site-nav a', '.mentions'],
  //
  //   // Ne pas proposer les images de fond CSS.
  //   backgrounds: false,
  //
  //   // Nombre minimum d'éléments pour qu'une liste soit vue comme
  //   // répétable (cartes, avis, tarifs…).
  //   minItems: 2,
  // },
};
