#!/usr/bin/env node
/**
 * L'assistant rapide : des intentions cochées à des propositions de page.
 *
 *   npm run essai-assistant
 *
 * C'est la moitié de l'assistant de création qui n'avait, elle non plus,
 * aucun essai dédié (l'autre moitié, le questionnaire de brief, est couverte
 * par `essai-redacteur`). `composerPropositions` tient sur une invariante
 * silencieuse : pour chaque modèle, le nombre de sections « résumées »
 * (`resume`) ne doit jamais dépasser ni le nombre de sections réellement
 * construites, ni le nombre de vignettes d'aperçu disponibles (`apercu`).
 * Si l'un des deux glisse en dessous de l'autre lors d'une prochaine
 * modification d'un modèle, l'assemblage silencieux de plusieurs intentions
 * perdrait des vignettes sans qu'aucune erreur ne le signale — seulement un
 * assistant dont la proposition ne ressemble plus tout à fait à ce qu'elle
 * montre.
 */
import {
  INTENTIONS, PAGE_TEMPLATES, composerPropositions, findPageTemplate,
} from '../admin/core/page-templates.js';

const echecs = [];
const dit = (quoi, bon, detail = '') => {
  console.log(`  ${bon ? '✓' : '✗'} ${quoi}${bon ? '' : ` — ${detail}`}`);
  if (!bon) echecs.push(quoi);
};

/* --------------------------------------------- l'invariante resume/apercu */

console.log('\nChaque modèle tient l’invariante résumé ≤ construit, ≤ aperçu');
const casses = PAGE_TEMPLATES.filter((m) => {
  const n = m.build().length;
  const resume = m.resume || 2;
  return resume > n || resume > m.apercu.length;
});
dit(`les ${PAGE_TEMPLATES.length} modèles la tiennent`, casses.length === 0,
  casses.map((m) => m.id).join(', '));

/* --------------------------------------------- aucune intention ne pointe dans le vide */

console.log('\nChaque intention pointe vers un modèle qui existe');
const introuvables = INTENTIONS.filter((i) => !findPageTemplate(i.modele));
dit('les 6 intentions résolvent toutes un modèle', introuvables.length === 0,
  introuvables.map((i) => `${i.id}→${i.modele}`).join(', '));

/* --------------------------------------------- une intention seule : le modèle complet */

console.log('\nUne seule intention cochée donne le modèle complet');
for (const intention of INTENTIONS) {
  const props = composerPropositions([intention.id], 'une');
  const attendu = findPageTemplate(intention.modele).build().length;
  dit(`${intention.id} seule → une proposition complète (${attendu} sections)`,
    props.length === 1 && props[0].id === 'complet' && props[0].trees.length === attendu,
    JSON.stringify(props.map((p) => [p.id, p.trees.length])));
}

/* --------------------------------------------- plusieurs intentions, une page */

console.log('\nPlusieurs intentions sur une seule page : assemblage + l’essentiel');
const deux = composerPropositions(['vitrine', 'contact'], 'une');
dit('deux propositions : assemble puis essentiel',
  deux.length === 2 && deux[0].id === 'assemble' && deux[1].id === 'essentiel',
  JSON.stringify(deux.map((p) => p.id)));
dit('l’assemblage porte autant de vignettes que de sections',
  deux[0].apercu.length === deux[0].trees.length,
  `${deux[0].apercu.length} vignettes / ${deux[0].trees.length} sections`);
dit('l’essentiel est le modèle complet de la première intention',
  deux[1].trees.length === findPageTemplate('onepage').build().length);

const trois = composerPropositions(['vitrine', 'vente', 'contact'], 'une');
dit('trois intentions assemblent les trois modèles',
  trois[0].modeles.length === 3 && trois[0].modeles[0] === 'onepage',
  JSON.stringify(trois[0].modeles));

/* --------------------------------------------- plusieurs intentions, plusieurs pages */

console.log('\nPlusieurs intentions, plusieurs pages : la première complète, les autres en option');
const multi = composerPropositions(['vitrine', 'vente', 'contact'], 'plusieurs');
dit('deux propositions : la page complète, puis l’assemblage de repli',
  multi.length === 2 && multi[0].id === 'complet' && multi[1].id === 'assemble',
  JSON.stringify(multi.map((p) => p.id)));
dit('la première ne porte que la première intention',
  multi[0].modeles.length === 1 && multi[0].modeles[0] === 'onepage');

/* --------------------------------------------- rien coché, une intention inconnue */

console.log('\nCas limites : rien coché, une intention qui n’existe pas');
dit('aucune intention cochée → aucune proposition', composerPropositions([], 'une').length === 0);
dit('une intention inconnue seule → aucune proposition',
  composerPropositions(['nexistepas'], 'une').length === 0);
const melange = composerPropositions(['nexistepas', 'contact'], 'une');
dit('mélangée à une intention connue, celle-ci reste proposée',
  melange.length === 1 && melange[0].trees.length === findPageTemplate('contact').build().length,
  JSON.stringify(melange.map((p) => p.id)));

/* --------------------------------------------- stabilité : deux appels, le même résultat */

console.log('\nDeux appels identiques rendent la même chose');
// Chaque widget reçoit une clé aléatoire à sa construction (`uid()`) : c'est
// ce qui distingue deux instances du même modèle dans l'éditeur. Comparer
// les clés ferait donc toujours échouer le test ; ce qui compte ici est que
// la STRUCTURE et les MOTS soient identiques, pas les identifiants.
const sansCles = (x) => JSON.stringify(x, (cle, valeur) => (cle === 'key' ? undefined : valeur));
const a = composerPropositions(['vitrine', 'portfolio'], 'une');
const b = composerPropositions(['vitrine', 'portfolio'], 'une');
dit('la proposition est stable d’un appel à l’autre', sansCles(a) === sansCles(b));

console.log(echecs.length ? `\n${echecs.length} échec(s)\n` : '\nTout est bon.\n');
process.exit(echecs.length ? 1 : 0);
