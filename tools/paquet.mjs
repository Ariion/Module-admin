#!/usr/bin/env node
/**
 * Fabrique le dossier à téléverser sur l'hébergement d'un client.
 *
 * Le module ne se compile pas : « mettre en ligne » revient à copier trois
 * choses au bon endroit et à renseigner cinq clés. Ce script fait la copie,
 * pré-remplit ce qui peut l'être, et écrit la marche à suivre à côté — pour
 * qu'un déploiement ne dépende pas de la mémoire de celui qui le fait.
 *
 *   npm run paquet -- --site=hotel-des-pins --projet=mon-projet-firebase
 *   npm run paquet -- --site=hotel --statique        (Netlify, Vercel…)
 *
 * Options :
 *   --site=<id>       identifiant du site dans la base (obligatoire)
 *   --projet=<id>     projectId Firebase, pour renseigner le script PHP
 *   --dossier=<chemin> où écrire le paquet (défaut : paquet/)
 *   --statique        hébergement sans PHP : pas d'endpoint, pas de médias
 */
import { cpSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const args = new Map(process.argv.slice(2)
  .filter((a) => a.startsWith('--'))
  .map((a) => {
    const [cle, ...reste] = a.slice(2).split('=');
    return [cle, reste.length ? reste.join('=') : true];
  }));

const siteId = args.get('site');
const projectId = args.get('projet');
const statique = args.get('statique') === true;
const cible = resolve(racine, String(args.get('dossier') || 'paquet'));

if (!siteId || siteId === true) {
  console.error(`
  Indiquez l'identifiant du site :

    npm run paquet -- --site=hotel-des-pins --projet=mon-projet-firebase

  Options : --statique (hébergement sans PHP), --dossier=<chemin>
`);
  process.exit(1);
}

if (existsSync(cible)) rmSync(cible, { recursive: true, force: true });
mkdirSync(cible, { recursive: true });

// 1. Le module, tel quel.
cpSync(resolve(racine, 'admin'), resolve(cible, 'admin'), { recursive: true });

// 2. La configuration, seul fichier qui diffère d'un site à l'autre.
const lignesHote = statique ? '' : `
  // Réécriture du fichier .html à chaque publication : le site garde son
  // contenu même si le module est retiré un jour.
  host: { endpoint: '/admin-endpoint.php' },

  // Bibliothèque média dans un dossier du site : aucun abonnement en plus.
  media: { adapter: 'endpoint', endpoint: '/admin-endpoint.php' },
`;
const lignesStatique = `
  // Hébergement statique : pas de réécriture du HTML possible, et la
  // bibliothèque média se remplit par adresse (image du site, vidéo, MP3).
  media: { adapter: 'url' },
`;

writeFileSync(resolve(cible, 'admin-config.js'), `/* Configuration du module d'administration — ${siteId}
   Remplacez les cinq valeurs « À REMPLIR » par celles de la console Firebase :
   Paramètres du projet ▸ Vos applications ▸ application Web ▸ firebaseConfig */
window.ADMIN_CONFIG = {
  siteId: '${siteId}',

  firebase: {
    apiKey:        'À REMPLIR',
    authDomain:    'À REMPLIR.firebaseapp.com',
    projectId:     '${projectId && projectId !== true ? projectId : 'À REMPLIR'}',
    storageBucket: 'À REMPLIR.appspot.com',
    appId:         'À REMPLIR',
  },

  lang: 'fr',
${statique ? lignesStatique : lignesHote}
  // Laissé à true pour la mise en route : la console du navigateur dit alors
  // ce qui est détecté, appliqué, et ce qui manque encore dans ce fichier.
  // À repasser à false une fois le site en service.
  debug: true,
};
`, 'utf-8');

// 3. Le point d'entrée PHP, avec le projet déjà renseigné.
if (!statique) {
  let php = readFileSync(resolve(racine, 'tools/admin-endpoint.php'), 'utf-8');
  if (projectId && projectId !== true) {
    php = php.replace("$PROJECT_ID   = 'mon-projet-firebase';",
      `$PROJECT_ID   = '${projectId}';`);
  }
  writeFileSync(resolve(cible, 'admin-endpoint.php'), php, 'utf-8');

  // Dossier des médias, avec un index vide : sans lui, certains hébergements
  // affichent la liste des fichiers à qui la demande.
  mkdirSync(resolve(cible, 'medias'), { recursive: true });
  writeFileSync(resolve(cible, 'medias/index.html'), '', 'utf-8');
}

const aRemplir = !projectId || projectId === true;
writeFileSync(resolve(cible, 'LISEZMOI.txt'), `MISE EN LIGNE — ${siteId}
${'='.repeat(60)}

1. Téléversez le contenu de ce dossier à la RACINE du site, à côté de
   index.html :

     admin/${statique ? '' : `
     admin-endpoint.php
     medias/            (droits d'écriture : chmod 755, ou 775 si besoin)`}
     admin-config.js

2. Ajoutez ces deux lignes juste avant </body>, sur CHAQUE page :

     <script src="/admin-config.js"></script>
     <script type="module" src="/admin/runtime.js"></script>

3. Complétez admin-config.js avec les clés Firebase${aRemplir ? ' (et le projectId)' : ''}.
${statique ? '' : `
4. Ouvrez admin-endpoint.php et vérifiez la première section :
   ${aRemplir ? '$PROJECT_ID doit recevoir l\'identifiant du projet Firebase.' : `$PROJECT_ID est déjà renseigné (${projectId}).`}
`}
${statique ? '4' : '5'}. Dans la console Firebase :
   - Authentication ▸ Settings ▸ Authorized domains ▸ ajoutez le domaine du site
   - Firestore ▸ sites/${siteId}/members/<UID du client> avec le champ role = owner
   - Firestore ▸ Règles ▸ collez firebase/firestore.rules puis Publier

${statique ? '5' : '6'}. Vérification :
   - https://ledomaine/            le site s'affiche normalement
   - https://ledomaine/?admin      l'écran de connexion apparaît
${statique ? '' : `   - après une publication, index.src.html apparaît à côté d'index.html :
     c'est la copie du code d'origine, gardée comme référence.
`}
Détail complet : docs/MISE-EN-LIGNE.md
`, 'utf-8');

const rel = cible.replace(racine + '/', '');
console.log(`
  Paquet prêt : ${rel}/

    admin/                le module${statique ? '' : `
    admin-endpoint.php    ${aRemplir ? 'À RENSEIGNER : $PROJECT_ID' : 'projet ' + projectId}
    medias/               dossier de la bibliothèque (droits d'écriture)`}
    admin-config.js       À RENSEIGNER : les clés Firebase
    LISEZMOI.txt          la marche à suivre

  À coller avant </body> sur chaque page :

    <script src="/admin-config.js"></script>
    <script type="module" src="/admin/runtime.js"></script>
`);
