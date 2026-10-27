#!/usr/bin/env node
/**
 * Joue toute la batterie d'essais, et dit ce qui n'a PAS été joué.
 *
 *   npm test
 *
 * Il y avait quatorze commandes et aucune façon de répondre à la seule
 * question qui compte avant de livrer : est-ce que le module est vert ?
 * Les lancer une par une finit toujours de la même manière — on joue les
 * rapides, on oublie les autres, et on oublie surtout ceux qui refusent de
 * partir faute de configuration.
 *
 * Car trois d'entre eux ne tournent pas ici : ils demandent un projet
 * Firebase, ou un site déjà servi. Lancés à l'aveugle, ils rendent un code
 * d'échec qui ressemble trait pour trait à un vrai défaut — et une batterie
 * où le rouge est normal est une batterie que plus personne ne lit.
 *
 * D'où la distinction tenue ici : un essai est VERT, ROUGE, ou IGNORÉ pour
 * une raison nommée. Seul le rouge fait échouer la commande. L'ignoré reste
 * visible, avec ce qu'il faudrait pour le jouer — c'est la seule façon qu'il
 * ne devienne pas invisible.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const a = (chemin) => resolve(racine, chemin);

/** Les clés Firebase sont-elles renseignées, ou encore « À REMPLIR » ? */
const clesFirebase = () => {
  const chemin = a('essais/vercel/admin-config.js');
  if (!existsSync(chemin)) return false;
  return !readFileSync(chemin, 'utf8').includes('À REMPLIR');
};

/**
 * Chaque essai, et ce qui l'empêcherait de partir.
 *
 * `empeche` rend la raison de ne pas le jouer, ou null. On la calcule AVANT
 * de lancer quoi que ce soit : découvrir après coup qu'un rouge venait d'une
 * configuration absente coûte exactement le temps qu'on croyait gagner.
 */
const ESSAIS = [
  { nom: 'ecrans', quoi: 'réglages par écran' },
  { nom: 'marque', quoi: 'couleurs et typographies du client' },
  { nom: 'portee', quoi: 'portée des variables de thème' },
  { nom: 'elements', quoi: 'identité des éléments détectés' },
  { nom: 'images', quoi: 'chaîne des images' },
  { nom: 'mise-en-forme', quoi: 'gras, italique, couleurs' },
  { nom: 'assainissement', quoi: 'ce que le contenu garde, et ce qu’il ne laisse pas passer' },
  { nom: 'formulaire', quoi: 'formulaire de contact' },
  { nom: 'debit', quoi: 'volume et vitesse' },
  { nom: 'audit', quoi: 'audit de page' },
  { nom: 'bibliotheque', quoi: 'modèles de pages' },
  { nom: 'illustrations', quoi: 'les 36 scènes dessinées' },
  {
    nom: 'regles',
    quoi: 'règles Firestore — la frontière de sécurité',
    lent: true,
    empeche: () => (existsSync(a('node_modules/.bin/firebase'))
      ? null
      : 'outillage absent : npm i --no-save firebase-tools @firebase/rules-unit-testing firebase'),
  },
  {
    nom: 'local',
    quoi: 'parcours complet sur un site servi',
    empeche: () => (clesFirebase()
      ? null
      : 'clés Firebase à renseigner dans essais/vercel/admin-config.js'),
  },
  {
    nom: 'clavier',
    quoi: 'aucun caractère perdu à la saisie',
    empeche: () => (process.env.ESSAI_CLAVIER_URL
      ? null
      : 'demande un site servi et une session ouvrable : ESSAI_CLAVIER_URL=…'),
  },
];

const seulement = process.argv.includes('--rapide');
const verts = [];
const rouges = [];
const ignores = [];

for (const essai of ESSAIS) {
  const raison = essai.empeche?.() ?? null;
  if (raison) { ignores.push([essai, raison]); continue; }
  if (seulement && essai.lent) { ignores.push([essai, 'écarté par --rapide']); continue; }

  process.stdout.write(`  ${essai.nom.padEnd(16)} `);
  const args = ['run', `essai-${essai.nom}`, '--silent'];
  if (essai.nom === 'clavier') args.push('--', process.env.ESSAI_CLAVIER_URL);
  const r = spawnSync('npm', args, { cwd: racine, encoding: 'utf8' });

  if (r.status === 0) { console.log('vert'); verts.push(essai); } else {
    console.log('ROUGE');
    rouges.push([essai, (r.stdout || '') + (r.stderr || '')]);
  }
}

console.log(`\n  ${verts.length} vert(s), ${rouges.length} rouge(s), ${ignores.length} ignoré(s)`);

if (ignores.length) {
  console.log('\n  Non joués — et pourquoi :');
  for (const [essai, raison] of ignores) {
    console.log(`    ${essai.nom.padEnd(16)} ${essai.quoi}`);
    console.log(`    ${''.padEnd(16)} ↳ ${raison}`);
  }
}

if (rouges.length) {
  for (const [essai, sortie] of rouges) {
    console.log(`\n  ── ${essai.nom} : ${essai.quoi} ──`);
    const lignes = sortie.split('\n').filter((l) => /NON |Error|✗|échec/.test(l));
    console.log((lignes.length ? lignes.slice(0, 8) : sortie.split('\n').slice(-12))
      .map((l) => `    ${l}`).join('\n'));
  }
  console.log(`\n  ${rouges.length} essai(s) en échec.\n`);
  process.exit(1);
}

console.log('\n  Rien de rouge.\n');
