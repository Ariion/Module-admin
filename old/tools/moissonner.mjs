#!/usr/bin/env node
/**
 * Télécharge les photos d'exemple depuis Pexels, sur VOTRE machine.
 *
 *   export PEXELS_API_KEY=...   (facultatif ; sans clé, la source est Openverse)
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
  restaurant: ['empty restaurant interior wooden tables warm light', 'set restaurant table plates glasses top view', 'empty dining room chairs bar counter evening'],
  alimentaire: ['artisan bakery interior bread shelves', 'flour wooden table baguette bread linen', 'fresh vegetables crates market stall'],
  beaute: ['hair salon interior round mirror plants', 'spa shelf amber bottles towels candle', 'massage treatment room white sheets'],
  batiment: ['old stone house renovation scaffolding', 'carpenter workbench hand tools wood shavings', 'interior renovation plaster wall empty room'],
  sante: ['clinic waiting room armchairs plant bright', 'doctor desk notebook pen glass of water', 'empty medical examination room white light'],
  conseil: ['empty meeting room wooden table large window', 'desk open notebook pen coffee glasses', 'corner office window view bookshelf plant'],
  boutique: ['independent clothing boutique rail wooden floor', 'shop shelf ceramics folded textiles vase', 'shop window interior daylight wooden floor'],
  creatif: ['bright art studio large table sketchbooks', 'painter table brushes paint tubes palette', 'studio wall blank paper pinned drawing tools'],
  hebergement: ['countryside guesthouse facade wooden shutters garden', 'guest room white bed linen open window greenery', 'shaded terrace pergola wooden table valley view'],
  association: ['community hall chairs in circle large windows', 'welcome table notebooks cups plant simple tablecloth', 'community garden raised wooden beds shed'],
  sport: ['empty gym wooden floor dumbbells windows', 'running track lanes texture', 'empty gymnasium court lines basketball hoops'],
  autre: ['bright neutral workspace wooden table chair plant', 'natural materials wood linen ceramic light surface', 'small shop facade awning street no sign'],
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

// Sans clé Pexels, on se rabat sur Openverse : aucune clé, aucun compte.
const cle = process.env.PEXELS_API_KEY || '';
const SOURCE_NOM = cle ? 'Pexels' : 'Openverse (CC0 et domaine public)';
console.log(`\n  Source : ${SOURCE_NOM}\n`);

const metiers = metierVoulu ? [metierVoulu] : Object.keys(RECHERCHES);
for (const m of metiers) {
  if (!RECHERCHES[m]) {
    console.error(`\n  Métier inconnu : « ${m} ».\n  Au choix : ${Object.keys(RECHERCHES).join(', ')}\n`);
    process.exit(1);
  }
}

mkdirSync(SOURCE, { recursive: true });
const credits = existsSync(CREDITS) ? JSON.parse(readFileSync(CREDITS, 'utf8')) : {};

/** Une photo, quelle que soit la source. */
function normaliser(p) { return p; }

async function chercherPexels(requete) {
  const url = 'https://api.pexels.com/v1/search'
    + `?query=${encodeURIComponent(requete)}`
    + `&orientation=landscape&size=large&per_page=${decalage + 15}`;
  const reponse = await fetch(url, { headers: { Authorization: cle } });
  if (reponse.status === 401) throw new Error('clé Pexels refusée (401)');
  if (reponse.status === 429) throw new Error('quota horaire Pexels atteint (429), réessayez dans une heure');
  if (!reponse.ok) throw new Error(`Pexels a répondu ${reponse.status}`);
  return ((await reponse.json()).photos || []).map((p) => normaliser({
    id: `pexels-${p.id}`, width: p.width, height: p.height, telecharger: p.src.original,
    auteur: p.photographer, profil: p.photographer_url, source: p.url,
    licence: 'Pexels License, https://www.pexels.com/license/',
  }));
}

/**
 * Openverse, sans clé. Restreint à CC0 et domaine public : aucune mention
 * obligatoire, donc rien à afficher chez le client. Le catalogue est moins
 * riche que Pexels, il faut regarder le résultat de près.
 */
async function chercherOpenverse(requete) {
  const url = 'https://api.openverse.org/v1/images/'
    + `?q=${encodeURIComponent(requete)}`
    + '&license=cc0,pdm&aspect_ratio=wide&size=large&mature=false'
    + `&page_size=${Math.min(20, decalage + 20)}`;
  const reponse = await fetch(url, { headers: { 'User-Agent': 'module-admin-moissonneur' } });
  if (reponse.status === 429) throw new Error('trop de requêtes Openverse (429), réessayez dans quelques minutes');
  if (!reponse.ok) throw new Error(`Openverse a répondu ${reponse.status}`);
  return ((await reponse.json()).results || []).map((p) => normaliser({
    id: `ov-${p.id}`, width: p.width || 0, height: p.height || 0, telecharger: p.url,
    auteur: p.creator || 'inconnu', profil: p.creator_url || '', source: p.foreign_landing_url,
    licence: `${String(p.license || '').toUpperCase()} ${p.license_url || ''}`.trim(),
  }));
}

const chercher = cle ? chercherPexels : chercherOpenverse;

let ecrites = 0;
let sautees = 0;
const manques = [];

for (const metier of metiers) {
  // Une recherche par rang : vue d'ensemble, détail, lumière. C'est ce qui
  // fait une petite série plutôt que trois variantes de la même photo.
  const dejaPrises = new Set();
  for (let rang = 1; rang <= PAR_METIER; rang += 1) {
    const cible = resolve(SOURCE, `${metier}-${rang}.jpg`);
    if (existsSync(cible) && !force) { sautees += 1; continue; }

    let trouvees;
    try {
      trouvees = await chercher(RECHERCHES[metier][rang - 1]);
    } catch (erreur) {
      console.error(`\n  ✗ ${erreur.message}\n`);
      // Une clé refusée le reste, et un quota atteint vaut pour toute l'heure.
      if (/401|429/.test(erreur.message)) process.exit(1);
      manques.push(`${metier}-${rang}`);
      continue;
    }

    // Trop petite, la photo ne remplirait pas les quatre largeurs du pipeline :
    // `npm run photos` ne ré-agrandit jamais, et il a raison.
    const photo = trouvees
      .filter((p) => p.width >= LARGEUR_MINI && !dejaPrises.has(p.id))
      .slice(decalage)[0];
    if (!photo) { manques.push(`${metier}-${rang}`); continue; }
    dejaPrises.add(photo.id);

    const image = await fetch(photo.telecharger);
    if (!image.ok) { manques.push(`${metier}-${rang}`); continue; }
    writeFileSync(cible, Buffer.from(await image.arrayBuffer()));

    credits[`${metier}-${rang}`] = {
      auteur: photo.auteur,
      profil: photo.profil,
      source: photo.source,
      largeur: photo.width,
      hauteur: photo.height,
      licence: photo.licence,
    };
    console.log(`  ✓ ${metier}-${rang}  ${photo.width}×${photo.height}  © ${photo.auteur}`);
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
