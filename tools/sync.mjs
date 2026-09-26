#!/usr/bin/env node
/**
 * Compare le module d'un site déjà en ligne avec celui de ce dépôt.
 *
 *   npm run sync                                  vérifie la cohérence locale
 *   npm run sync -- https://exemple.fr            compare un site en ligne
 *   npm run sync -- https://exemple.fr --detail   liste chaque fichier qui diffère
 *
 * Pourquoi cet outil existe : le module vit maintenant sur plusieurs sites,
 * et il s'y met à jour à la main. Sans moyen de savoir ce qui tourne où, deux
 * accidents guettent, et les deux sont arrivés. On croit un site en retard
 * alors qu'il est en AVANCE — quelqu'un y a corrigé quelque chose — et on
 * écrase la correction en « mettant à jour ». Ou l'inverse : on rapatrie
 * depuis un site sans savoir ce qu'on emporte.
 *
 * L'outil ne modifie RIEN. Il dit ce qui diffère ; décider reste humain.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lire = (p) => readFileSync(resolve(racine, p), 'utf-8');

/** L'empreinte d'un contenu, insensible aux fins de ligne. */
export function empreinte(texte) {
  return createHash('sha256').update(texte.replace(/\r\n/g, '\n')).digest('hex').slice(0, 12);
}

/** La version déclarée dans package.json. */
export function versionDuPaquet() {
  return JSON.parse(lire('package.json')).version;
}

/** La version déclarée par le module lui-même. */
export function versionDuModule(source = lire('admin/version.js')) {
  const trouve = /VERSION\s*=\s*'([^']+)'/.exec(source);
  return trouve ? trouve[1] : null;
}

/**
 * Les deux déclarations de version s'accordent-elles ?
 *
 * Les scripts de paquet et de livraison appellent ceci AVANT de fabriquer
 * quoi que ce soit : livrer un module qui se présente sous une version qu'il
 * n'a pas, c'est reconduire exactement le problème que le marqueur devait
 * résoudre.
 */
export function verifierVersion() {
  const paquet = versionDuPaquet();
  const module = versionDuModule();
  if (paquet === module) return { ok: true, version: paquet };
  return {
    ok: false,
    version: paquet,
    message: `package.json annonce ${paquet}, admin/version.js annonce ${module}.`
      + ' Mettez les deux d’accord avant de fabriquer un paquet.',
  };
}

/** Tous les fichiers du module, chemins relatifs à la racine du dépôt. */
export function fichiersDuModule(base = 'admin') {
  const sortie = [];
  const parcourir = (dossier) => {
    for (const nom of readdirSync(resolve(racine, dossier)).sort()) {
      const chemin = join(dossier, nom);
      if (statSync(resolve(racine, chemin)).isDirectory()) parcourir(chemin);
      else if (/\.(js|css)$/.test(nom)) sortie.push(chemin);
    }
  };
  parcourir(base);
  return sortie;
}

/** Va chercher un fichier sur le site, ou explique pourquoi il n'a rien. */
async function recuperer(base, chemin) {
  const url = base.replace(/\/+$/, '') + '/' + chemin;
  try {
    const reponse = await fetch(url, { cache: 'no-store' });
    if (!reponse.ok) return { erreur: `HTTP ${reponse.status}` };
    const texte = await reponse.text();
    // Un hébergement qui sert sa page d'erreur avec un code 200 rendrait une
    // empreinte parfaitement stable et parfaitement fausse.
    if (/^\s*<!doctype html/i.test(texte)) return { erreur: 'page HTML reçue au lieu du fichier' };
    return { texte };
  } catch (err) {
    return { erreur: err.message || String(err) };
  }
}

/**
 * Compare un site en ligne au dépôt.
 * @returns {Promise<{version: object, fichiers: object[]}>}
 */
export async function comparerSite(base) {
  const distante = await recuperer(base, 'admin/version.js');
  const version = {
    locale: versionDuPaquet(),
    distante: distante.texte ? versionDuModule(distante.texte) : null,
    erreur: distante.erreur || null,
  };

  const fichiers = [];
  for (const chemin of fichiersDuModule()) {
    const recu = await recuperer(base, chemin);
    if (recu.erreur) { fichiers.push({ chemin, etat: 'absent', detail: recu.erreur }); continue; }
    const ici = empreinte(lire(chemin));
    const la = empreinte(recu.texte);
    fichiers.push({ chemin, etat: ici === la ? 'identique' : 'different', ici, la });
  }
  return { version, fichiers };
}

// --------------------------------------------------------------- en ligne de commande
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const site = args.find((a) => /^https?:\/\//.test(a)) || null;
  const detail = args.includes('--detail');

  const coherence = verifierVersion();
  console.log('\nModule admin — ' + coherence.version + '\n');
  if (!coherence.ok) {
    console.error('  ✗ ' + coherence.message + '\n');
    process.exit(1);
  }
  console.log('  ✓ package.json et admin/version.js sont d’accord');

  if (!site) {
    console.log('\n  Pour comparer un site en ligne :\n    npm run sync -- https://exemple.fr\n');
    process.exit(0);
  }

  console.log('\nComparaison avec ' + site + '\n');
  const { version, fichiers } = await comparerSite(site);

  if (version.erreur) {
    console.log(`  ? version du site illisible (${version.erreur})`);
    console.log('    Un site posé avant ce marqueur n’a pas de admin/version.js :');
    console.log('    la comparaison fichier par fichier ci-dessous reste valable.');
  } else if (version.distante === version.locale) {
    console.log(`  ✓ même version des deux côtés (${version.locale})`);
  } else {
    console.log(`  ! le site annonce ${version.distante}, ce dépôt ${version.locale}`);
  }

  const differents = fichiers.filter((f) => f.etat === 'different');
  const absents = fichiers.filter((f) => f.etat === 'absent');
  const identiques = fichiers.length - differents.length - absents.length;

  console.log(`\n  ${identiques} fichier(s) identiques`);
  if (differents.length) console.log(`  ${differents.length} fichier(s) DIFFÉRENTS`);
  if (absents.length) console.log(`  ${absents.length} fichier(s) introuvables sur le site`);

  if (differents.length && (detail || differents.length <= 12)) {
    console.log('\n  Différents :');
    for (const f of differents) console.log('    ' + f.chemin);
  } else if (differents.length) {
    console.log('\n  Ajoutez --detail pour la liste complète.');
  }
  if (absents.length && detail) {
    console.log('\n  Introuvables :');
    for (const f of absents) console.log(`    ${f.chemin} (${f.detail})`);
  }

  // Un fichier différent n'est PAS une erreur : il peut être en avance. On le
  // signale par un code de sortie distinct, pour qu'un script appelant puisse
  // s'arrêter sans qu'on ait à lire la sortie.
  if (differents.length) {
    console.log('\n  Un fichier différent peut être en AVANCE sur ce dépôt.');
    console.log('  Regardez-le avant de le remplacer.\n');
    process.exit(2);
  }
  console.log('\n  Le site est à jour.\n');
}
