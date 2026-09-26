#!/usr/bin/env node
/**
 * Joue les règles Firestore contre l'émulateur — pour de vrai.
 *
 *   npm run essai-regles
 *
 * Pourquoi cet essai vit à part des autres : le formulaire de contact a
 * ouvert le SEUL point d'écriture de la base accessible sans compte. Ce qui
 * empêche un inconnu d'y écrire n'importe quoi n'est pas du code du module —
 * c'est `firebase/firestore.rules`, exécuté par Firebase. Une règle qu'on
 * relit sans la jouer est une règle dont on espère qu'elle marche.
 *
 * L'émulateur et la bibliothèque d'essai ne sont PAS des dépendances du
 * module : ils pèsent plusieurs centaines de mégaoctets, et celui qui achète
 * le module n'a aucune raison de les télécharger pour s'en servir. On les
 * installe le jour où l'on veut vérifier les règles :
 *
 *   npm i --no-save firebase-tools @firebase/rules-unit-testing firebase
 *   npx firebase emulators:start --only firestore --project projet-de-test
 *
 * puis, dans un autre terminal, `npm run essai-regles`.
 * Java est nécessaire à l'émulateur.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.FIRESTORE_EMULATOR_PORT || 8181);

const AIDE = `
  L'émulateur Firestore ne répond pas sur le port ${PORT}.

    npm i --no-save firebase-tools @firebase/rules-unit-testing firebase
    npx firebase emulators:start --only firestore --project projet-de-test

  Puis relancez cet essai dans un autre terminal.
`;

// Sans émulateur, l'essai ne prouverait rien : mieux vaut refuser de partir
// que rendre un vert qui ne veut rien dire.
const debout = await fetch(`http://127.0.0.1:${PORT}/`).then(() => true).catch(() => false);
if (!debout) { console.error(AIDE); process.exit(1); }

let outils;
try {
  outils = {
    ...(await import('@firebase/rules-unit-testing')),
    ...(await import('firebase/firestore')),
  };
} catch {
  console.error('\n  Installez d’abord : npm i --no-save @firebase/rules-unit-testing firebase\n');
  process.exit(1);
}
const { initializeTestEnvironment, assertFails, assertSucceeds } = outils;
const { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } = outils;

const env = await initializeTestEnvironment({
  projectId: 'projet-de-test',
  firestore: {
    host: '127.0.0.1', port: PORT,
    rules: readFileSync(resolve(racine, 'firebase/firestore.rules'), 'utf8'),
  },
});

const SITE = 'site-essai';
const chemin = (id) => `sites/${SITE}/messages/${id}`;

// Un membre du site et un message déjà reçu, posés hors règles : on éprouve
// la règle, pas la façon dont on remplit la base.
await env.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), `sites/${SITE}/members/patron`), { role: 'owner' });
  await setDoc(doc(ctx.firestore(), chemin('deja-la')), { message: 'un ancien', lu: false });
});

const inconnu = env.unauthenticatedContext().firestore();
const patron = env.authenticatedContext('patron').firestore();

/** Un message conforme, dont chaque essai ne change qu'un détail. */
const valide = (p = {}) => ({
  page: '/contact.html', formulaire: 'f1', nom: 'Camille Roy',
  courriel: 'camille@exemple.fr', telephone: '', message: 'Bonjour, un devis ?',
  cases: '', liste: '', envoye: Date.now(), lu: false, ...p,
});

let echecs = 0;
const dit = async (nom, promesse, doitPasser) => {
  try {
    await (doitPasser ? assertSucceeds(promesse) : assertFails(promesse));
    console.log(`  ✓ ${nom}`);
  } catch {
    echecs++;
    console.log(`  ✗ ${nom} — ${doitPasser
      ? 'refusé alors qu’il devait passer'
      : 'ACCEPTÉ alors qu’il devait être refusé'}`);
  }
};

console.log('\nRègles Firestore, jouées contre l’émulateur\n');

console.log('Ce qu’un visiteur inconnu DOIT pouvoir faire');
await dit('déposer un message conforme', setDoc(doc(inconnu, chemin('m1')), valide()), true);
await dit('en déposer un avec le seul téléphone',
  setDoc(doc(inconnu, chemin('m2')),
    valide({ nom: '', courriel: '', telephone: '0102030405', message: '' })), true);

console.log('\nCe qu’il ne doit PAS pouvoir faire');
await dit('lire un message', getDoc(doc(inconnu, chemin('deja-la'))), false);
await dit('lister la boîte', getDocs(collection(inconnu, `sites/${SITE}/messages`)), false);
await dit('modifier un message', updateDoc(doc(inconnu, chemin('deja-la')), { message: 'effacé' }), false);
await dit('supprimer un message', deleteDoc(doc(inconnu, chemin('deja-la'))), false);

console.log('\nCe que la forme du document doit refuser');
await dit('une clé en plus', setDoc(doc(inconnu, chemin('x1')), valide({ vecteur: 'autre chose' })), false);
await dit('une clé en moins',
  setDoc(doc(inconnu, chemin('x2')), (() => { const v = valide(); delete v.liste; return v; })()), false);
await dit('un message déjà marqué lu', setDoc(doc(inconnu, chemin('x3')), valide({ lu: true })), false);
await dit('un message de 5001 caractères',
  setDoc(doc(inconnu, chemin('x4')), valide({ message: 'a'.repeat(5001) })), false);
await dit('un nom de 121 caractères',
  setDoc(doc(inconnu, chemin('x5')), valide({ nom: 'n'.repeat(121) })), false);
await dit('un champ qui n’est pas du texte', setDoc(doc(inconnu, chemin('x6')), valide({ nom: 42 })), false);
await dit('un envoi daté de l’an 3000',
  setDoc(doc(inconnu, chemin('x7')), valide({ envoye: 32503680000000 })), false);
await dit('un envoi daté d’il y a un an',
  setDoc(doc(inconnu, chemin('x8')), valide({ envoye: Date.now() - 31536000000 })), false);
await dit('un document entièrement vide de sens',
  setDoc(doc(inconnu, chemin('x9')),
    valide({ nom: '', courriel: '', telephone: '', message: '' })), false);

console.log('\nCe que le membre du site doit pouvoir faire');
await dit('lire la boîte', getDocs(collection(patron, `sites/${SITE}/messages`)), true);
await dit('marquer un message lu', updateDoc(doc(patron, chemin('deja-la')), { lu: true }), true);
await dit('supprimer un message', deleteDoc(doc(patron, chemin('m2'))), true);

// La boîte de réception est une ouverture dans un mur : on vérifie que le
// mur est resté debout autour.
console.log('\nLe reste de la base n’a pas été ouvert au passage');
await dit('écrire dans le contenu du site',
  setDoc(doc(inconnu, `sites/${SITE}/pages/accueil`), { titre: 'remplacé' }), false);
await dit('se donner les droits en écrivant un membre',
  setDoc(doc(inconnu, `sites/${SITE}/members/moi`), { role: 'owner' }), false);

await env.cleanup();
console.log(echecs ? `\n${echecs} échec(s)\n` : '\nLes règles tiennent sur les 20 cas.\n');
process.exit(echecs ? 1 : 0);
