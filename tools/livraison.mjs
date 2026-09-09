#!/usr/bin/env node
/**
 * Fabrique l'archive livrée à l'acquéreur.
 *
 * Ce qui est vendu n'est pas le dépôt : ni les essais, ni le code d'un site
 * client réel, ni l'outillage de développement n'ont à s'y trouver. Ce script
 * assemble exactement ce dont l'acquéreur a besoin, et rien d'autre.
 *
 *   npm run livraison
 *
 * Produit  livraison/module-admin-<version>/  et l'archive .zip du même nom.
 */
import { cpSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lire = (p) => readFileSync(resolve(racine, p), 'utf-8');

const version = JSON.parse(lire('package.json')).version;
const nom = `module-admin-${version}`;
const base = resolve(racine, 'livraison');
const cible = resolve(base, nom);

if (existsSync(cible)) rmSync(cible, { recursive: true, force: true });
mkdirSync(cible, { recursive: true });

// --- Le module, les règles, la démonstration -------------------------------
cpSync(resolve(racine, 'admin'), resolve(cible, 'admin'), { recursive: true });
cpSync(resolve(racine, 'firebase'), resolve(cible, 'firebase'), { recursive: true });
cpSync(resolve(racine, 'demo'), resolve(cible, 'demo'), { recursive: true });

// --- Le script serveur, à la racine du site --------------------------------
cpSync(resolve(racine, 'tools/admin-endpoint.php'), resolve(cible, 'admin-endpoint.php'));

// --- Dossier des médias, avec un index vide pour éviter le listing ---------
mkdirSync(resolve(cible, 'medias'), { recursive: true });
writeFileSync(resolve(cible, 'medias/index.html'), '', 'utf-8');

// --- Les fichiers destinés à l'acquéreur -----------------------------------
for (const fichier of ['LISEZMOI.md', 'LICENCE.txt', 'index.html',
  'admin-config.js', 'admin-config.exemple.js']) {
  cpSync(resolve(racine, 'distribution', fichier), resolve(cible, fichier));
}
cpSync(resolve(racine, 'CHANGELOG.md'), resolve(cible, 'CHANGELOG.md'));

// La page d'installation embarque les règles Firestore : l'acquéreur les
// copie d'un clic, sans aller ouvrir un fichier à côté.
const regles = lire('firebase/firestore.rules')
  .replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
writeFileSync(resolve(cible, 'installation.html'),
  lire('distribution/installation.html').replace('/*__REGLES_FIRESTORE__*/', regles), 'utf-8');

// --- La documentation, sans les liens vers ce qui n'est pas livré ----------
mkdirSync(resolve(cible, 'docs'), { recursive: true });
for (const doc of ['INSTALLATION.md', 'ARCHITECTURE.md', 'MISE-EN-LIGNE.md', 'IA.md']) {
  const texte = lire('docs/' + doc)
    // Les essais internes ne font pas partie de la livraison.
    .replace(/\s*\(voir\s*\[`essais\/[^\]]*`\]\([^)]*\)\)/g, '')
    .replace(/\[`essais\/[^\]]*`\]\([^)]*\)/g, 'le banc d’essai interne')
    .replace(/\[`essais\/vercel\/LISEZMOI\.md`\]\([^)]*\)/g, '`docs/MISE-EN-LIGNE.md`')
    .replace(/\(\.\.\/essais\/vercel\/LISEZMOI\.md\)/g, '(MISE-EN-LIGNE.md)');
  writeFileSync(resolve(cible, 'docs', doc), texte, 'utf-8');
}

// --- L'archive -------------------------------------------------------------
const zip = spawnSync('zip', ['-rq', `${nom}.zip`, nom], { cwd: base, encoding: 'utf-8' });
const archive = resolve(base, `${nom}.zip`);
const taille = zip.status === 0 && existsSync(archive)
  ? (readFileSync(archive).length / 1024).toFixed(0) + ' Ko'
  : null;

console.log(`
  Livraison ${version} prête.

    livraison/${nom}/            le dossier
    ${taille ? `livraison/${nom}.zip        l'archive, ${taille}` : "(zip indisponible : archivez le dossier à la main)"}

  L'acquéreur extrait, sert le dossier, et ouvre installation.html.
`);
