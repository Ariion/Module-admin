#!/usr/bin/env node
/**
 * Monte un site de test complet en local et lance un serveur PHP.
 *
 * Sert à éprouver ce qu'un hébergement statique (Vercel, Netlify) ne permet
 * pas : la réécriture automatique du fichier .html à la publication.
 *
 *   node tools/essai-local.mjs
 *
 * Réutilise les clés Firebase saisies dans essais/vercel/admin-config.js.
 */
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cible = resolve(racine, '.essai-local');
const port = process.env.PORT || 8080;

const php = spawnSync('php', ['--version'], { encoding: 'utf-8' });
if (php.status !== 0) {
  console.error('\n  PHP est introuvable. Il est nécessaire pour ce test :');
  console.error('    macOS    php est préinstallé, sinon : brew install php');
  console.error('    Ubuntu   sudo apt install php-cli');
  console.error('    Windows  https://windows.php.net/download\n');
  console.error('  Sans PHP, le test sur Vercel reste possible : voir essais/vercel/LISEZMOI.md\n');
  process.exit(1);
}

const config = resolve(racine, 'essais/vercel/admin-config.js');
const source = readFileSync(config, 'utf-8');
if (source.includes('À REMPLIR')) {
  console.error('\n  Renseignez d’abord vos clés Firebase dans :');
  console.error('    essais/vercel/admin-config.js\n');
  process.exit(1);
}
const projectId = (source.match(/projectId:\s*'([^']+)'/) || [])[1];
if (!projectId) {
  console.error('\n  projectId introuvable dans essais/vercel/admin-config.js\n');
  process.exit(1);
}

rmSync(cible, { recursive: true, force: true });
mkdirSync(resolve(cible, 'medias'), { recursive: true });
cpSync(resolve(racine, 'admin'), resolve(cible, 'admin'), { recursive: true });
cpSync(resolve(racine, 'essais/vercel/index.html'), resolve(cible, 'index.html'));

// La page de test pointe vers ../../admin : à la racine du site, c'est /admin.
writeFileSync(
  resolve(cible, 'index.html'),
  readFileSync(resolve(cible, 'index.html'), 'utf-8')
    .replace('../../admin/runtime.js', '/admin/runtime.js')
    .replace('./admin-config.js', '/admin-config.js'),
);

// Même configuration, plus la réécriture du HTML.
writeFileSync(
  resolve(cible, 'admin-config.js'),
  source.replace(
    "  // host: { endpoint: '/admin-endpoint.php' },",
    "  host: { endpoint: '/admin-endpoint.php' },",
  ),
);

writeFileSync(
  resolve(cible, 'admin-endpoint.php'),
  readFileSync(resolve(racine, 'tools/admin-endpoint.php'), 'utf-8')
    .replace("$PROJECT_ID   = 'mon-projet-firebase';", `$PROJECT_ID   = '${projectId}';`),
);

console.log(`
  Site de test prêt dans .essai-local/  (projet Firebase : ${projectId})

  1. Ouvrez  http://localhost:${port}/?admin
  2. Connectez-vous avec le compte client créé dans Firebase
  3. Modifiez un titre, cliquez sur Publier
  4. Ouvrez le fichier .essai-local/index.html : la modification doit s'y
     trouver en clair, dans le HTML
  5. Supprimez le dossier .essai-local/admin, rechargez http://localhost:${port}/
     — le site doit garder toutes les modifications

  Ctrl+C pour arrêter.
`);

const serveur = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', cible], { stdio: 'inherit' });
process.on('SIGINT', () => { serveur.kill(); process.exit(0); });
