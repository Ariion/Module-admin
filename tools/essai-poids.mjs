#!/usr/bin/env node
/**
 * Ce qu'un VISITEUR télécharge — et ce qu'il ne doit jamais télécharger.
 *
 *   npm run essai-poids
 *
 * Le module s'ajoute à des sites qu'on n'a pas écrits, chez des clients dont
 * la promesse est « votre site n'est pas dégradé ». Une seule ligne suffit à
 * la rompre : un `import` statique posé en tête d'un fichier déjà chargé par
 * le visiteur, pour un symbole dont l'éditeur seul se sert. Rien ne casse,
 * aucun essai ne rougit, et trente kilo-octets partent chez des gens qui ne
 * se connecteront jamais.
 *
 * C'est arrivé : `core/page-templates.js`, le catalogue des trames de page,
 * était tiré par `core/model.js` pour UNE méthode que seul l'éditeur appelle.
 * Personne ne l'a vu, parce que lire un graphe d'imports à la main n'est pas
 * une chose qu'on fait.
 *
 * On mesure donc le graphe STATIQUE depuis `runtime.js` : c'est exactement ce
 * qu'un navigateur va chercher avant d'exécuter la première ligne. Un
 * `await import()` dans une méthode n'y figure pas — c'est précisément la
 * différence qu'on veut rendre visible.
 *
 * Pourquoi pas Lighthouse ici : il demande un navigateur, une trentaine de
 * secondes, et une dépendance qui n'a rien à faire dans le module. Surtout,
 * son score dépend de la page d'essai et du réseau simulé, alors que ce qu'on
 * veut tenir est une propriété du CODE. Lighthouse dit combien ça coûte ; cet
 * essai-ci dit QUI l'a fait entrer, ce qui est la seule chose actionnable.
 */
import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'admin');

/**
 * Le budget. Il se dépasse par accident, jamais par décision — d'où un essai
 * qui rougit plutôt qu'un chiffre dans un document que personne ne relit.
 * Le monter est une décision légitime : il faut seulement qu'elle soit prise,
 * et visible dans l'historique.
 */
const BUDGET_FICHIERS = 30;
const BUDGET_KIO = 375;

/**
 * Historique des relèvements, et ce qu'on sait pouvoir rendre.
 *
 * 350 → 375 (1.43.0) : les blocs horaires, articles, téléchargements et
 * agenda. Ils rendent du contenu que le VISITEUR doit voir — une page
 * publiée avec des horaires doit savoir les dessiner —, donc leur place est
 * bien ici. Relèvement assumé, pas contourné.
 *
 * RÉDUCTION CONNUE, NON FAITE : ~20 Kio. Le catalogue `WIDGETS` de
 * `core/widgets.js` (catégories, champs, valeurs par défaut) ne sert qu'aux
 * panneaux de l'éditeur — `renderWidget` est un `switch` qui ne le consulte
 * jamais. Il part chez tous les visiteurs parce que `createWidget` le lit, et
 * que `core/sections.js` appelle `createWidget` de façon SYNCHRONE depuis
 * `ops.addBlank`. Le sortir demande donc de rendre cette opération
 * asynchrone, ce qui remonte jusqu'à l'éditeur. C'est mesuré et faisable ;
 * ce n'est pas fait.
 */

/**
 * Ce qui ne doit JAMAIS se retrouver sur le chemin du visiteur.
 *
 * Chaque entrée a été vérifiée : ses méthodes ne sont pas atteignables depuis
 * `applySnapshot()`, le seul point d'entrée qu'un visiteur emprunte.
 */
const INTERDITS = [
  ['core/page-templates.js', 'les trames de page ne servent qu’à l’éditeur'],
  ['core/bake.js', 'la réécriture du HTML n’a lieu qu’à la publication'],
  ['core/bibliotheque.js', 'la bibliothèque de modèles est une vue du back-office'],
  ['core/illustrations.js', 'les images d’exemple ne servent qu’à la création'],
  ['core/historique.js', 'les révisions sont une vue du back-office'],
  ['core/guide.js', 'le guide ne s’affiche que dans l’éditeur'],
  ['core/demo.js', 'le mode démonstration est monté par l’éditeur'],
  ['core/audit.js', 'l’audit de page est une vue du back-office'],
  ['core/reset.js', 'la remise à zéro est une action du back-office'],
];

const vus = new Map();
const parents = new Map();

/** Les imports STATIQUES d'un fichier : ceux que le navigateur suit d'office. */
const statiques = (src) => [...src.matchAll(/^\s*import\s[^;]*?from\s*['"]([^'"]+)['"]/gm)]
  .map((m) => m[1]);

function suivre(fichier, parent = null) {
  if (vus.has(fichier)) return;
  vus.set(fichier, statSync(fichier).size);
  if (parent) parents.set(fichier, parent);
  for (const spec of statiques(readFileSync(fichier, 'utf8'))) {
    if (!spec.startsWith('.')) continue;
    try { suivre(resolve(dirname(fichier), spec), fichier); } catch { /* absent */ }
  }
}
suivre(resolve(racine, 'runtime.js'));

const court = (f) => f.replace(racine + '/', '');
const graphe = new Set([...vus.keys()].map(court));
const kio = [...vus.values()].reduce((a, b) => a + b, 0) / 1024;

const echecs = [];
const dit = (quoi, bon, detail = '') => {
  console.log(`  ${bon ? '✓' : '✗'} ${quoi}${bon ? '' : ` — ${detail}`}`);
  if (!bon) echecs.push(quoi);
};

console.log(`\nCe qu’un visiteur charge avant la première ligne exécutée`);
console.log(`  ${vus.size} fichiers, ${kio.toFixed(0)} Kio bruts\n`);

dit(`au plus ${BUDGET_FICHIERS} fichiers`, vus.size <= BUDGET_FICHIERS,
  `${vus.size} fichiers`);
dit(`au plus ${BUDGET_KIO} Kio bruts`, kio <= BUDGET_KIO, `${kio.toFixed(0)} Kio`);

console.log('\nCe qui ne doit pas en être');
for (const [fichier, pourquoi] of INTERDITS) {
  const present = graphe.has(fichier);
  dit(`${fichier} — ${pourquoi}`, !present,
    present ? `tiré par ${court(parents.get(resolve(racine, fichier)) || '')}` : '');
}

// Aucune vue : le visiteur n'a pas d'interface. Si un fichier de `ui/` entre
// dans ce graphe, c'est tout l'éditeur qui suit derrière lui.
console.log('\nAucune interface');
const vues = [...graphe].filter((f) => f.startsWith('ui/'));
dit('aucun fichier de ui/ sur le chemin du visiteur', vues.length === 0,
  vues.slice(0, 3).join(', '));

if (process.argv.includes('--detail')) {
  console.log('\nLe graphe, du plus lourd au plus léger :');
  for (const [f, t] of [...vus].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${(t / 1024).toFixed(1).padStart(6)} Kio  ${court(f).padEnd(26)}`
      + `${parents.has(f) ? `← ${court(parents.get(f))}` : '(entrée)'}`);
  }
}

console.log(echecs.length ? `\n${echecs.length} échec(s)\n` : '\nTout est bon.\n');
process.exit(echecs.length ? 1 : 0);
