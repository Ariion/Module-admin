#!/usr/bin/env node
/**
 * Télécharge les photos d'exemple depuis Pexels, sur VOTRE machine.
 *
 *   export PEXELS_API_KEY=...        (gratuit, sans carte, 1 minute)
 *   npm run moissonner
 *   npm run photos
 *
 * Pourquoi un script à lancer chez vous plutôt qu'un outil que je lance ici :
 * la session Claude tourne dans un conteneur dont la politique réseau refuse
 * tous les hôtes d'images — Unsplash, Pexels, Pixabay, Wikimedia répondent
 * « 403 to CONNECT ». Ce n'est pas une panne et ce n'est pas réglable depuis
 * l'application. Votre machine, elle, n'a aucune de ces restrictions.
 *
 * Ce script ne fait donc QUE ce qui demande le réseau : chercher et
 * télécharger. Le redimensionnement, le WebP et le catalogue restent dans
 * `npm run photos`, qui n'a besoin de personne.
 *
 * LICENCE — à lire avant de revendre quoi que ce soit. La licence Pexels
 * autorise l'usage commercial sans attribution et sans redevance. Elle
 * interdit deux choses qui nous concernent : revendre les photos telles
 * quelles en tant que photos, et constituer un service concurrent de banque
 * d'images. Les livrer comme visuels d'exemple à l'intérieur d'un module —
 * remplaçables d'un clic par les photos du client — ne relève ni de l'un ni
 * de l'autre. Le fichier CREDITS.json garde malgré tout la trace de chaque
 * photo et de son auteur : c'est ce qui permet de répondre en trente secondes
 * le jour où un client pose la question. Il vit dans `docs/`, et non dans
 * `photos-source/` : ce dossier-là est ignoré par git en entier, puisqu'il
 * ne contient que de la matière première. La trace, elle, doit être suivie.
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = resolve(racine, 'photos-source');
const CREDITS = resolve(racine, 'docs/PHOTOS-CREDITS.json');

/**
 * La recherche de chaque métier.
 *
 * Elle reprend l'intention de `docs/PHOTOS-PROMPTS.md` : des lieux, vides ou
 * presque, vus large. Un mot comme « portrait » ou « closeup » ramènerait des
 * visages en gros plan — inutilisables en fond de bandeau, où le texte doit
 * pouvoir se poser.
 */
const RECHERCHES = {
  restaurant: 'empty restaurant interior warm light',
  alimentaire: 'grocery store shelves interior',
  beaute: 'beauty salon interior minimal',
  batiment: 'construction site building exterior',
  sante: 'medical clinic interior bright',
  conseil: 'modern office meeting room empty',
  boutique: 'clothing boutique store interior',
  creatif: 'creative studio workspace desk',
  hebergement: 'hotel room interior window',
  association: 'community hall gathering space',
  sport: 'gym interior equipment',
  autre: 'minimal architecture interior space',
};

const PAR_METIER = 3;
const LARGEUR_MINI = 1920;

const args = process.argv.slice(2);
const option = (nom, defaut = null) => {
  const i = args.indexOf(`--${nom}`);
  return i === -1 ? defaut : args[i + 1];
};
const force = args.includes('--force');
const metierVoulu = option('metier');
const decalage = Number(option('decalage', 0)) || 0;

const cle = process.env.PEXELS_API_KEY;
if (!cle) {
  console.error(`
  Il manque la clé Pexels.

    1. https://www.pexels.com/api/  →  « Get Started »  (gratuit, sans carte)
    2. export PEXELS_API_KEY=la_clé_reçue
    3. npm run moissonner

  La clé sert uniquement à chercher : elle ne quitte pas votre machine et
  n'a rien à faire dans le dépôt.
`);
  process.exit(1);
}

const metiers = metierVoulu ? [metierVoulu] : Object.keys(RECHERCHES);
for (const m of metiers) {
  if (!RECHERCHES[m]) {
    console.error(`\n  Métier inconnu : « ${m} ».\n  Au choix : ${Object.keys(RECHERCHES).join(', ')}\n`);
    process.exit(1);
  }
}

mkdirSync(SOURCE, { recursive: true });
const credits = existsSync(CREDITS) ? JSON.parse(readFileSync(CREDITS, 'utf8')) : {};

/** Un appel à l'API, avec un message lisible quand ça se passe mal. */
async function chercher(requete) {
  const url = 'https://api.pexels.com/v1/search'
    + `?query=${encodeURIComponent(requete)}`
    + `&orientation=landscape&size=large&per_page=${PAR_METIER + decalage + 12}`;
  const reponse = await fetch(url, { headers: { Authorization: cle } });
  if (reponse.status === 401) throw new Error('clé Pexels refusée (401)');
  if (reponse.status === 429) throw new Error('quota horaire Pexels atteint (429) — réessayez dans une heure');
  if (!reponse.ok) throw new Error(`Pexels a répondu ${reponse.status}`);
  return (await reponse.json()).photos || [];
}

let ecrites = 0;
let sautees = 0;
const manques = [];

for (const metier of metiers) {
  let trouvees;
  try {
    trouvees = await chercher(RECHERCHES[metier]);
  } catch (erreur) {
    console.error(`\n  ✗ ${erreur.message}\n`);
    // Rien ne sert de redemander onze fois : une clé refusée le reste, et un
    // quota atteint vaut pour toute l'heure.
    if (/401|429/.test(erreur.message)) process.exit(1);
    manques.push(metier);
    continue;
  }

  // Trop petite, la photo ne remplirait pas les quatre largeurs du pipeline :
  // `npm run photos` ne ré-agrandit jamais, et il a raison.
  const utiles = trouvees.filter((p) => p.width >= LARGEUR_MINI).slice(decalage);
  if (utiles.length < PAR_METIER) {
    console.log(`  ! ${metier} — seulement ${utiles.length} photo(s) assez grande(s)`);
  }

  for (let rang = 1; rang <= PAR_METIER; rang += 1) {
    const photo = utiles[rang - 1];
    const cible = resolve(SOURCE, `${metier}-${rang}.jpg`);
    if (!photo) { manques.push(`${metier}-${rang}`); continue; }
    if (existsSync(cible) && !force) { sautees += 1; continue; }

    const image = await fetch(photo.src.original);
    if (!image.ok) { manques.push(`${metier}-${rang}`); continue; }
    writeFileSync(cible, Buffer.from(await image.arrayBuffer()));

    credits[`${metier}-${rang}`] = {
      auteur: photo.photographer,
      profil: photo.photographer_url,
      source: photo.url,
      largeur: photo.width,
      hauteur: photo.height,
      licence: 'Pexels License — https://www.pexels.com/license/',
    };
    console.log(`  ✓ ${metier}-${rang}  ${photo.width}×${photo.height}  © ${photo.photographer}`);
    ecrites += 1;
  }
}

writeFileSync(CREDITS, `${JSON.stringify(credits, null, 2)}\n`);

console.log(`
  ${ecrites} photo(s) écrite(s)${sautees ? `, ${sautees} déjà présente(s)` : ''}${manques.length ? `, ${manques.length} manquante(s)` : ''}`);
if (manques.length) console.log(`  manquantes : ${manques.slice(0, 8).join(', ')}`);
console.log(`
  REGARDEZ-LES avant d'enchaîner. Une recherche ne sait pas si une photo
  laisse une zone calme où poser un titre — c'est la règle de
  docs/PHOTOS-PROMPTS.md, et c'est la seule qu'une machine ne vérifie pas.

  Une photo qui ne va pas se rejoue sans toucher aux autres :
    npm run moissonner -- --metier ${metiers[0]} --decalage 3 --force

  Puis :  npm run photos
`);
