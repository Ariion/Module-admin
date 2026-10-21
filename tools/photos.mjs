#!/usr/bin/env node
/**
 * Prépare les photos d'exemple : du JPEG brut aux quatre largeurs WebP.
 *
 *   npm run photos
 *
 * Déposez les fichiers dans `photos-source/`, nommés `<metier>-<rang>.jpg`
 * d'après `docs/PHOTOS-PROMPTS.md`, et lancez cette commande. Elle écrit les
 * images dans `medias/exemples/` et le catalogue dans
 * `admin/core/photos.js`, que les illustrations consultent.
 *
 * Pourquoi `medias/` et non `admin/` : une page publiée qui pointerait vers
 * un fichier du module perdrait ses images le jour où le client retire le
 * module. Or il doit pouvoir le retirer sans que son site change. Les photos
 * vivent donc avec le site, pas avec l'outil.
 *
 * Pourquoi un catalogue écrit plutôt qu'une lecture de dossier : le module
 * tourne dans un navigateur, il ne sait pas lister un répertoire. Et un
 * catalogue permet de n'avoir que les métiers qu'on a vraiment photographiés
 * — les autres gardent leurs scènes dessinées.
 */
import { readdirSync, mkdirSync, writeFileSync, existsSync, statSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = resolve(racine, 'photos-source');
const SORTIE = resolve(racine, 'medias/exemples');
const CATALOGUE = resolve(racine, 'admin/core/photos.js');

/** Les douze identifiants de métier. Un nom hors liste est refusé, pas deviné. */
const METIERS = [
  'restaurant', 'alimentaire', 'beaute', 'batiment', 'sante', 'conseil',
  'boutique', 'creatif', 'hebergement', 'association', 'sport', 'autre',
];

/** Les largeurs produites : celles que `core/images.js` sait choisir. */
const LARGEURS = [480, 960, 1440, 1920];

const QUALITE = 82;

if (!existsSync(SOURCE)) {
  console.error(`
  Aucun dossier « photos-source/ ».

  Déposez-y vos photos nommées d'après docs/PHOTOS-PROMPTS.md :
    restaurant-1.jpg  boutique-2.jpg  batiment-3.jpg …
`);
  process.exit(1);
}

/** `restaurant-2.jpg` donne { metier: 'restaurant', rang: 2 }, sinon null. */
function lireNom(fichier) {
  const nom = basename(fichier, extname(fichier)).toLowerCase();
  const trouve = /^([a-z]+)-(\d+)$/.exec(nom);
  if (!trouve) return null;
  const [, metier, rang] = trouve;
  if (!METIERS.includes(metier)) return null;
  return { metier, rang: Number(rang) };
}

const entrees = readdirSync(SOURCE)
  .filter((f) => /\.(jpe?g|png)$/i.test(f))
  .sort();

if (!entrees.length) {
  console.error('\n  Le dossier « photos-source/ » est vide.\n');
  process.exit(1);
}

rmSync(SORTIE, { recursive: true, force: true });
mkdirSync(SORTIE, { recursive: true });

const catalogue = {};
const refuses = [];
let octets = 0;

console.log('\nPhotos d’exemple\n');

for (const fichier of entrees) {
  const lu = lireNom(fichier);
  if (!lu) { refuses.push(fichier); continue; }

  const source = resolve(SOURCE, fichier);
  const taille = execFileSync('identify', ['-format', '%w %h', source], { encoding: 'utf-8' })
    .trim().split(/\s+/).map(Number);
  const [largeurSource, hauteurSource] = taille;

  // On ne grossit jamais une image : agrandir ajoute des pixels et aucune
  // information, et le résultat se voit sur un bandeau plein cadre.
  //
  // La largeur NATIVE est gardée quand elle dépasse le dernier palier retenu.
  // Sans cela une source de 1264 px ne servirait que du 960, et on jetterait
  // un quart de sa définition pour rester sur des nombres ronds.
  const paliers = LARGEURS.filter((l) => l <= largeurSource);
  const dernier = paliers[paliers.length - 1] || 0;
  const utiles = largeurSource > dernier && largeurSource < LARGEURS[LARGEURS.length - 1]
    ? [...paliers, largeurSource]
    : paliers;
  if (!utiles.length) {
    refuses.push(`${fichier} (trop petite : ${largeurSource} px)`);
    continue;
  }

  const variantes = [];
  for (const largeur of utiles) {
    const nom = `${lu.metier}-${lu.rang}-${largeur}.webp`;
    const cible = resolve(SORTIE, nom);
    execFileSync('convert', [
      source, '-resize', `${largeur}x`, '-strip', '-quality', String(QUALITE), cible,
    ]);
    octets += statSync(cible).size;
    variantes.push({ nom, largeur });
  }

  const hauteur = Math.round(hauteurSource * (utiles[utiles.length - 1] / largeurSource));
  const photo = {
    srcset: variantes.map((v) => `/medias/exemples/${v.nom} ${v.largeur}w`).join(', '),
    src: `/medias/exemples/${variantes[variantes.length - 1].nom}`,
    largeur: utiles[utiles.length - 1],
    hauteur,
  };
  (catalogue[lu.metier] ||= [])[lu.rang - 1] = photo;
  console.log(`  ✓ ${fichier.padEnd(24)} ${largeurSource}×${hauteurSource} → ${utiles.join(', ')}`);
}

// Un trou dans la série ferait porter la photo 3 au rang 2 : on compacte, et
// un métier incomplet garde simplement moins de photos.
for (const metier of Object.keys(catalogue)) {
  catalogue[metier] = catalogue[metier].filter(Boolean);
  if (!catalogue[metier].length) delete catalogue[metier];
}

const entete = `/**
 * Catalogue des photos d'exemple. ÉCRIT PAR \`npm run photos\`.
 *
 * Ne pas modifier à la main : le fichier est réécrit entièrement à chaque
 * passage. Pour ajouter une photo, déposez-la dans \`photos-source/\` et
 * relancez la commande.
 *
 * Les adresses partent de la racine du site et non du module : une page
 * publiée garde ses images le jour où le client retire le module.
 * @module core/photos
 */
export const PHOTOS = ${JSON.stringify(catalogue, null, 2)};

/** Les photos d'un métier, ou une liste vide s'il n'en a pas. */
export function photosDuMetier(metierId) {
  return PHOTOS[metierId] || [];
}
`;
writeFileSync(CATALOGUE, entete, 'utf-8');

const metiers = Object.keys(catalogue);
console.log(`\n  ${metiers.length} métier(s) photographié(s) : ${metiers.join(', ')}`);
console.log(`  ${Math.round(octets / 1024)} Ko au total dans medias/exemples/`);
if (refuses.length) {
  console.log(`\n  ${refuses.length} fichier(s) écartés :`);
  for (const f of refuses) console.log(`    ${f}`);
  console.log('  Nommez-les <metier>-<rang>.jpg, avec un métier de la liste.');
}
console.log(`\n  Catalogue écrit : admin/core/photos.js`);
console.log('  Les métiers sans photo gardent leurs scènes dessinées.\n');
