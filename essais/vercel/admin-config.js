/* =========================================================================
   CONFIGURATION DES DEUX ESSAIS

   Remplacez les 5 valeurs « À REMPLIR » par celles de la console Firebase :
   Paramètres du projet ▸ Vos applications ▸ application Web ▸ firebaseConfig

   Tant qu'elles ne le sont pas, les deux pages basculent d'elles-mêmes en
   mode démonstration : l'éditeur s'ouvre avec n'importe quelle adresse et
   n'importe quel mot de passe, et tout reste dans le navigateur du visiteur.
   C'est ce qui permet de montrer l'outil sans avoir rien configuré.
   ========================================================================= */
const CLES = {
  apiKey:        'À REMPLIR',
  authDomain:    'À REMPLIR.firebaseapp.com',
  projectId:     'À REMPLIR',
  storageBucket: 'À REMPLIR.appspot.com',
  appId:         'À REMPLIR',
};

const RENSEIGNE = !Object.values(CLES).some((v) => /À REMPLIR/.test(v));

window.ADMIN_CONFIG = {
  siteId: 'test-lamartine',

  // 'firebase' dès que les clés sont là, 'demo' en attendant.
  backend: RENSEIGNE ? 'firebase' : 'demo',
  firebase: CLES,

  lang: 'fr',

  // Laisse les traces dans la console du navigateur pendant le test.
  debug: true,

  // Pas de téléversement sur un hébergement statique : la bibliothèque média
  // se remplit par adresse (image déjà en ligne, vidéo YouTube, MP3 distant).
  media: { adapter: 'url' },

  // Réécriture du HTML : impossible sur Vercel, dont les fichiers sont en
  // lecture seule après déploiement. À activer sur un hébergement PHP.
  // host: { endpoint: '/admin-endpoint.php' },
};

if (!RENSEIGNE) {
  console.info('[admin] Mode démonstration : clés Firebase non renseignées dans '
    + 'essais/vercel/admin-config.js. Les modifications restent dans ce navigateur.');
}
