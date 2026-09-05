/* =========================================================================
   CONFIGURATION DU TEST — remplacez les 5 valeurs marquées « À REMPLIR ».
   Elles se trouvent dans la console Firebase :
   Paramètres du projet ▸ Vos applications ▸ application Web ▸ firebaseConfig
   ========================================================================= */
window.ADMIN_CONFIG = {
  siteId: 'test-lamartine',

  backend: 'firebase',

  firebase: {
    apiKey:            'À REMPLIR',
    authDomain:        'À REMPLIR.firebaseapp.com',
    projectId:         'À REMPLIR',
    storageBucket:     'À REMPLIR.appspot.com',
    appId:             'À REMPLIR',
  },

  lang: 'fr',

  // Laisse les traces dans la console du navigateur pendant le test.
  debug: true,

  // Pas de téléversement d'image dans ce test : on saisit une adresse.
  // (Firebase Storage demanderait le plan Blaze.)
  media: { adapter: 'url' },

  // Réécriture du HTML : impossible sur Vercel, dont les fichiers sont en
  // lecture seule après déploiement. À activer sur un hébergement PHP.
  // host: { endpoint: '/admin-endpoint.php' },
};
