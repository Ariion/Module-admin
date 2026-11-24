#!/usr/bin/env node
/**
 * L'assainissement du contenu : ce qui doit passer, et ce qui ne doit pas.
 *
 *   npm run essai-assainissement
 *
 * `safeHtml` est la frontière entre le contenu et le site publié. Elle tourne
 * deux fois : à l'enregistrement, sur ce qui sort de l'éditeur, et à
 * l'AFFICHAGE, sur ce qui revient de la base. C'est le second passage qui
 * compte : un compte compromis ne doit pas pouvoir injecter du script dans la
 * page publique d'un client.
 *
 * Cet essai tient les deux bouts, parce qu'ils se contredisent :
 *
 *  - trop permissif, et on a une faille ;
 *  - trop strict, et le client qui colle depuis Word perd son gras, ses liens
 *    et ses couleurs — ce qui est arrivé, et ne se voyait nulle part.
 *
 * Un essai qui ne vérifierait que le premier bout laisserait l'autre se
 * dégrader en silence, puisque personne ne relit un assainisseur pour vérifier
 * qu'il garde assez.
 *
 * Il tourne dans un vrai navigateur : `safeHtml` s'appuie sur `DOMParser` et
 * sur la façon dont un moteur réel analyse du HTML malformé. Le simuler
 * reviendrait à essayer autre chose que ce qui s'exécutera chez le client —
 * et les contournements de ce genre d'outil vivent précisément dans cet écart.
 */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css' };

const serveur = createServer((req, res) => {
  const chemin = resolve(racine, '.' + req.url.split('?')[0]);
  let corps;
  try { corps = readFileSync(chemin); } catch { res.writeHead(404); res.end('non'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(chemin)] || 'text/plain' });
  res.end(corps);
});
const port = await new Promise((ok) => serveur.listen(0, () => ok(serveur.address().port)));

let chromium;
try {
  ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs'));
} catch {
  console.error('\n  Playwright est introuvable.\n');
  serveur.close();
  process.exit(1);
}
const navigateur = await chromium.launch();
const page = await navigateur.newPage();
await page.goto(`http://127.0.0.1:${port}/index.html`);

const echecs = [];
const dit = (nom, bon, detail = '') => {
  console.log(`  ${bon ? '✓' : '✗'} ${nom}${bon ? '' : ` — ${detail}`}`);
  if (!bon) echecs.push(nom);
};

/**
 * Ce qui doit SURVIVRE.
 *
 * `attendu` est la sortie exacte. On ne se contente pas de « ça contient du
 * gras » : une sortie exacte attrape aussi ce qui s'ajoute en trop, et c'est
 * par là qu'arrive le retour à la ligne parasite.
 */
const GARDES = [
  ['<b>gras</b>', '<b>gras</b>', 'le gras seul'],
  ['<div><b>Prix</b> cassé</div>', '<b>Prix</b> cassé', 'le gras dans une div'],
  ['<div><a href="/contact">Écrire</a></div>', '<a href="/contact">Écrire</a>', 'un lien dans une div'],
  ['<p>Une</p><p>Deux</p>', 'Une<br>Deux', 'deux paragraphes séparés, pas soudés'],
  ['<ul><li>Un</li><li>Deux</li></ul>', 'Un<br>Deux', 'une liste collée depuis Word'],
  ['<span style="color:#c00"><b>x</b></span>', '<span style="color: #c00"><b>x</b></span>', 'couleur et gras'],
  ['<p>Seule</p>', 'Seule', 'un bloc unique ne laisse pas de <br> en trop'],
  ['texte simple', 'texte simple', 'le texte nu ne bouge pas'],
];

console.log('\nCe que le client doit garder');
const gardes = await page.evaluate(async (cas) => {
  const { safeHtml } = await import('/admin/core/sanitize.js');
  return cas.map(([brut]) => safeHtml(brut));
}, GARDES);
GARDES.forEach(([, attendu, nom], i) => {
  dit(nom, gardes[i] === attendu, `obtenu ${JSON.stringify(gardes[i])}`);
});

/**
 * Ce qui ne doit PAS sortir.
 *
 * On ne compare pas à une sortie exacte ici : il y a plusieurs façons
 * acceptables de neutraliser une attaque, et figer laquelle ferait échouer
 * l'essai au premier changement d'implémentation sans qu'il y ait de faille.
 * On interdit donc la présence des motifs dangereux, quelle que soit la forme.
 */
const ATTAQUES = [
  ['<script>alert(1)</script>', 'un script'],
  ['<div><script>alert(1)</script>texte</div>', 'un script dans un bloc'],
  ['<img src=x onerror=alert(1)>', 'une image à gestionnaire'],
  ['<div onclick="alert(1)">clic</div>', 'un gestionnaire sur un bloc'],
  ['<b onmouseover="alert(1)">survol</b>', 'un gestionnaire sur une balise permise'],
  ['<a href="javascript:alert(1)">lien</a>', 'un href javascript:'],
  ['<a href="java&#9;script:alert(1)">lien</a>', 'un href javascript: obfusqué'],
  ['<a href="data:text/html,<script>alert(1)</script>">x</a>', 'un href data:'],
  ['<svg><foreignObject><b>x</b></foreignObject></svg>', 'un foreignObject'],
  ['<svg><p><style><g title="</style><img src=x onerror=alert(1)>">', 'une mXSS par svg/style'],
  ['<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>', 'une mXSS par mathml'],
  ['<style>.x{background:url(javascript:alert(1))}</style>', 'une feuille de style'],
  ['<span style="background:url(javascript:alert(1))">x</span>', 'un fond en style en ligne'],
  ['<iframe src="https://evil.tld"></iframe>', 'un cadre'],
  ['<form><input name=x></form>', 'un formulaire'],
  ['<template><b>x</b></template>', 'un template'],
  ['<object data="x"></object>', 'un objet'],
];
const INTERDIT = /<script|<iframe|<object|<embed|<form|<svg|<math|<style|<img|<input|on\w+\s*=|javascript:/i;

console.log('\nCe qui ne doit jamais ressortir');
const attaques = await page.evaluate(async (cas) => {
  const { safeHtml } = await import('/admin/core/sanitize.js');
  return cas.map(([brut]) => safeHtml(brut));
}, ATTAQUES);
ATTAQUES.forEach(([, nom], i) => {
  dit(nom, !INTERDIT.test(attaques[i]), `obtenu ${JSON.stringify(attaques[i])}`);
});

console.log('\nCe qui déborderait');
const robustesse = await page.evaluate(async () => {
  const { safeHtml } = await import('/admin/core/sanitize.js');
  const profond = '<div>'.repeat(5000) + 'fond' + '</div>'.repeat(5000);
  let tenu = true;
  let sortie = '';
  try { sortie = safeHtml(profond); } catch { tenu = false; }
  return { tenu, garde: sortie.includes('fond') };
});
// `safeHtml` tourne aussi sur le site public : une pile qui déborde n'y est
// pas une erreur d'éditeur, c'est une page qui ne s'affiche plus.
dit('5000 niveaux d’imbrication ne font pas déborder la pile', robustesse.tenu);
dit('et le texte du fond est conservé', robustesse.garde);

console.log('\nLes styles en ligne');
const styles = await page.evaluate(async () => {
  const { safeStyle } = await import('/admin/core/sanitize.js');
  return {
    couleur: safeStyle('color:#c00'),
    mixte: safeStyle('color:red;position:fixed;top:0'),
    fond: safeStyle('background:url(javascript:alert(1))'),
    variable: safeStyle('color:var(--secret)'),
    long: safeStyle('color:red;'.repeat(60)),
  };
});
dit('une couleur passe', styles.couleur === 'color: #c00', styles.couleur);
dit('la position est jetée, la couleur gardée', styles.mixte === 'color: red', styles.mixte);
dit('un fond est jeté', styles.fond === '', styles.fond);
dit('var() est jeté', styles.variable === '', styles.variable);
dit('un style démesuré est jeté en entier', styles.long === '', styles.long);

await navigateur.close();
serveur.close();
console.log(echecs.length ? `\n${echecs.length} échec(s)\n` : '\nTout est bon.\n');
process.exit(echecs.length ? 1 : 0);
