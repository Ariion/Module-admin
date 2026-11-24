#!/usr/bin/env node
/**
 * Les fonctions pures de l'installeur : construction des requêtes, signature.
 *
 *   npm run essai-installeur
 *
 * L'installeur parle à sept API Google différentes depuis une machine qu'on
 * ne contrôle pas — la sienne. On ne peut donc pas lui faire jouer une vraie
 * installation ici : ça demanderait un compte Google, un navigateur pour
 * `firebase login`, et un vrai projet à créer et détruire à chaque essai.
 *
 * Ce qu'on PEUT vérifier sans rien de tout ça, et qui couvre l'essentiel du
 * risque : que chaque requête est construite avec la bonne forme, et que la
 * signature RS256 du compte de service est mathématiquement correcte. Une
 * signature fausse ne se verrait qu'au moment où Google la refuserait — en
 * plein milieu d'une installation chez un client, sans navigateur à portée
 * de main pour comprendre pourquoi.
 */
import { generateKeyPairSync, createVerify } from 'node:crypto';
import {
  patcherConfig, siteIdDe, assertionCompteDeService, corpsEchangeJeton,
  requeteAccesPremierCompte, requeteActiverMotDePasse, requeteCreerCompte,
  requetesPublierRegles,
} from './installer.mjs';

const echecs = [];
const dit = (quoi, bon, detail = '') => {
  console.log(`  ${bon ? '✓' : '✗'} ${quoi}${bon ? '' : ` — ${detail}`}`);
  if (!bon) echecs.push(quoi);
};

/* ------------------------------------------------- patcherConfig / siteIdDe */

console.log('\nÉcrire les cinq clés sans toucher au reste');

const FICHIER_DEMO = `const CLES = {
  apiKey:        'À REMPLIR',
  authDomain:    'À REMPLIR.firebaseapp.com',
  projectId:     'À REMPLIR',
  storageBucket: 'À REMPLIR.appspot.com',
  appId:         'À REMPLIR',
};
window.ADMIN_CONFIG = { siteId: 'essais-vercel', firebase: CLES, debug: true };
`;

const VALEURS = {
  apiKey: 'AIzaVrai', authDomain: 'mon-projet.firebaseapp.com', projectId: 'mon-projet',
  storageBucket: 'mon-projet.appspot.com', appId: '1:123:web:abc', siteId: 'ma-boulangerie',
};

const patch1 = patcherConfig(FICHIER_DEMO, VALEURS);
dit('les cinq clés sont remplacées', patch1.manquants.length === 0, patch1.manquants.join(', '));
dit('la valeur exacte est écrite', patch1.texte.includes("apiKey:        'AIzaVrai'"));
dit('siteId suit aussi', patch1.texte.includes("siteId: 'ma-boulangerie'"));
dit('un commentaire voisin n’est pas touché', patch1.texte.includes('window.ADMIN_CONFIG'));
dit('la forme générale (indentation, virgules) ne bouge pas',
  patch1.texte.split('\n').length === FICHIER_DEMO.split('\n').length);

// Rejouer sur un fichier déjà renseigné : une seconde installation ne doit
// pas laisser de trace de la première valeur.
const patch2 = patcherConfig(patch1.texte, { ...VALEURS, apiKey: 'AIzaAutre' });
dit('une seconde passe remplace, ne double pas', patch2.texte.includes("apiKey:        'AIzaAutre'")
  && !patch2.texte.includes('AIzaVrai'));

const FORME_INATTENDUE = 'const reglages = { nom: "site" };';
const patch3 = patcherConfig(FORME_INATTENDUE, VALEURS);
dit('un fichier sans les clés attendues les signale, sans planter',
  patch3.manquants.length === 5, patch3.manquants.join(', '));

dit('siteIdDe lit la valeur existante', siteIdDe(FICHIER_DEMO) === 'essais-vercel');
dit('siteIdDe rend null si absent', siteIdDe('const x = 1;') === null);

/* --------------------------------------------- assertionCompteDeService */

console.log('\nLa signature du compte de service');

// Un vrai couple de clés, jetable : on ne signe rien avec une clé qui sert
// ailleurs, et on n'a besoin que de la forme PEM que Google renvoie.
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const COMPTE = {
  client_email: 'essai@mon-projet.iam.gserviceaccount.com',
  private_key: privateKey.export({ type: 'pkcs1', format: 'pem' }),
};

const maintenant = 1_700_000_000;
const jwt = assertionCompteDeService(COMPTE, 'https://www.googleapis.com/auth/cloud-platform', maintenant);
const morceaux = jwt.split('.');
dit('trois morceaux : en-tête, charge, signature', morceaux.length === 3);

const decoder = (b64) => JSON.parse(Buffer.from(b64, 'base64url').toString());
const entete = decoder(morceaux[0]);
const charge = decoder(morceaux[1]);
dit('l’algorithme déclaré est RS256', entete.alg === 'RS256', entete.alg);
dit('l’émetteur est le compte de service', charge.iss === COMPTE.client_email);
dit('la portée est transmise telle quelle',
  charge.scope === 'https://www.googleapis.com/auth/cloud-platform');
dit('l’audience vise l’échange de jeton Google', charge.aud === 'https://oauth2.googleapis.com/token');
dit('l’expiration suit l’émission d’une heure', charge.exp - charge.iat === 3600);

// Le seul essai qui compte vraiment : la signature est-elle mathématiquement
// VALIDE pour ce contenu exact, avec la clé publique correspondante ?
const verifie = createVerify('RSA-SHA256')
  .update(`${morceaux[0]}.${morceaux[1]}`)
  .verify(publicKey, Buffer.from(morceaux[2], 'base64url'));
dit('la signature se vérifie avec la clé publique du compte', verifie);

// Changer un seul caractère de la charge doit invalider la signature — sinon
// elle ne protège rien.
const charge2 = morceaux[1].slice(0, -1) + (morceaux[1].at(-1) === 'A' ? 'B' : 'A');
const falsifie = createVerify('RSA-SHA256')
  .update(`${morceaux[0]}.${charge2}`)
  .verify(publicKey, Buffer.from(morceaux[2], 'base64url'));
dit('une charge modifiée casse la vérification', !falsifie);

/* ----------------------------------------------------- corpsEchangeJeton */

console.log('\nL’échange contre un jeton d’accès');
const corps = corpsEchangeJeton('un.jwt.ici');
dit('le type de cession est le bon', corps.get('grant_type') === 'urn:ietf:params:oauth:grant-type:jwt-bearer');
dit('l’assertion est transmise', corps.get('assertion') === 'un.jwt.ici');

/* --------------------------------------------------- les requêtes REST */

console.log('\nLa forme des requêtes');

const acces = requeteAccesPremierCompte('mon-projet', 'ma-boutique', 'uid-123');
dit('l’accès vise le bon chemin Firestore',
  acces.url.endsWith('/sites/ma-boutique/members/uid-123'), acces.url);
dit('le rôle par défaut est owner', acces.corps.fields.role.stringValue === 'owner');
const accesAutre = requeteAccesPremierCompte('p', 's', 'u', 'editor');
dit('un rôle différent est repris', accesAutre.corps.fields.role.stringValue === 'editor');
// Un identifiant de site avec un caractère spécial ne doit jamais casser
// l'URL ni, pire, injecter un segment de chemin.
const accesEchappe = requeteAccesPremierCompte('p', 'site/avec slash', 'u');
dit('un siteId est échappé dans l’URL', !accesEchappe.url.includes('site/avec slash')
  && accesEchappe.url.includes(encodeURIComponent('site/avec slash')));

const auth = requeteActiverMotDePasse('mon-projet');
dit('la portée d’activation vise le bon projet', auth.url.includes('/projects/mon-projet/config'));
dit('seul le mot de passe est demandé, rien d’autre n’est touché',
  Object.keys(auth.corps.signIn).length === 1 && auth.corps.signIn.email.enabled === true);

const creation = requeteCreerCompte('AIzaClé', 'client@exemple.fr', 'un-mot-de-passe-correct');
dit('la clé publique suffit, en paramètre d’URL', creation.url.includes('key=AIzaCl'));
dit('aucun jeton n’est requis dans les en-têtes', !('headers' in creation));
dit('le mot de passe part dans le corps, pas dans l’URL',
  !creation.url.includes('un-mot-de-passe') && creation.corps.password === 'un-mot-de-passe-correct');

const regles = requetesPublierRegles('mon-projet', { release: 'cloud.firestore', source: 'rules_version=\'2\';' });
dit('la création vise le bon projet', regles.creer.url.includes('/projects/mon-projet/rulesets'));
dit('le texte des règles est transmis intact',
  regles.creer.corps.source.files[0].content === "rules_version='2';");
const publication = regles.publier('projects/mon-projet/rulesets/abc123');
dit('la publication vise la bonne release', publication.url.includes('/releases/cloud.firestore'));
dit('la publication pointe le nouveau ruleset',
  publication.corps.rulesetName === 'projects/mon-projet/rulesets/abc123');

// Storage se publie sous une release par BUCKET, jamais une release fixe :
// un projet peut avoir plusieurs buckets, et se tromper publierait les
// règles pour le mauvais.
const reglesStorage = requetesPublierRegles('mon-projet', {
  release: 'firebase.storage/mon-projet.appspot.com', source: 'service firebase.storage {}',
});
dit('la release Storage porte le nom du bucket',
  reglesStorage.creer.url.includes('/rulesets')
  && reglesStorage.publier('x').url.includes('firebase.storage%2Fmon-projet.appspot.com')
    || reglesStorage.publier('x').url.includes('firebase.storage/mon-projet.appspot.com'));

console.log(echecs.length ? `\n${echecs.length} échec(s)\n` : '\nTout est bon.\n');
process.exit(echecs.length ? 1 : 0);
