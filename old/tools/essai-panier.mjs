#!/usr/bin/env node
/**
 * Le panier du module, dans un vrai navigateur.
 *
 *   npm run boutique-demo && npm run essai-panier
 *
 * Le panier est du JavaScript injecté EN TEXTE dans une page statique : il ne
 * passe par aucun outil de construction, personne ne le compile, et rien ne
 * le relit. Les deux défauts trouvés en l'écrivant le montrent bien, et
 * aucun des deux ne se voyait sans navigateur.
 *
 *  1. Le script arrivait CORROMPU. Le générateur l'insérait avec
 *     `String.replace('</body>', …)`, et `replace` donne un sens à `$` dans
 *     sa chaîne de remplacement : `$'` y désigne tout ce qui suit la
 *     correspondance. Le `'$'` de la table des devises a donc été remplacé
 *     par la fin du document. La page se chargeait, le panier ne faisait
 *     rien, et la console disait « Invalid or unexpected token ».
 *
 *  2. Une fois le panier refermé, son voile RESTAIT devant la page et
 *     interceptait tous les clics. La boutique devenait inutilisable dès
 *     qu'on avait ouvert le panier une seule fois — sans message, sans
 *     erreur : les clics tombaient dans le vide.
 */
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BOUTIQUE = resolve(racine, 'essais/vercel/boutique');
if (!existsSync(resolve(BOUTIQUE, 'panier.html'))) {
  console.error('\n  Fabriquez d’abord la boutique : npm run boutique-demo\n');
  process.exit(1);
}

const echecs = [];
const dit = (quoi, bon, detail = '') => {
  console.log(`  ${bon ? '✓' : '✗'} ${quoi}${bon ? '' : ` — ${detail}`}`);
  if (!bon) echecs.push(quoi);
};

/* Le script injecté est-il seulement du JavaScript valide ? On le vérifie
   SANS navigateur d'abord : une erreur de syntaxe se lit mieux ici. */
console.log('\nLe script injecté');
const page = readFileSync(resolve(BOUTIQUE, 'index.html'), 'utf8');
const scripts = [...page.matchAll(/<script[^>]*data-admin-ui[^>]*>([\s\S]*?)<\/script>/g)]
  .map((m) => m[1]);
dit('un script de panier est présent', scripts.length > 0);
if (scripts.length) {
  let valide = true;
  let raison = '';
  try { new (class { })(); new Function(scripts[scripts.length - 1]); }
  catch (erreur) { valide = false; raison = erreur.message; }
  dit('il est syntaxiquement valide', valide, raison);
  // Le marqueur exact de la corruption par `$'` : la fin du document se
  // retrouvait au milieu du script.
  dit('il ne contient pas de fragment de la page', !/<\/html>|<\/body>/.test(scripts.at(-1)),
    'le document a fui dans le script');
}

const TYPES = { '.html': 'text/html', '.svg': 'image/svg+xml', '.css': 'text/css' };
const serveur = createServer((req, res) => {
  const url = req.url.split('?')[0];
  let corps;
  try { corps = readFileSync(resolve(racine, './essais/vercel' + url)); }
  catch { res.writeHead(404); res.end('non'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(url)] || 'text/plain' });
  res.end(corps);
});
const port = await new Promise((ok) => serveur.listen(0, () => ok(serveur.address().port)));

let chromium;
try { ({ chromium } = createRequire(import.meta.url)('/opt/node-tools/node_modules/playwright/index.js')); }
catch { console.error('\n  Playwright est introuvable.\n'); serveur.close(); process.exit(1); }

const navigateur = await chromium.launch();
const onglet = await navigateur.newPage({ viewport: { width: 1200, height: 900 } });
const plantages = [];
onglet.on('pageerror', (e) => plantages.push(e.message));

const base = `http://127.0.0.1:${port}/boutique`;
await onglet.goto(`${base}/index.html`);
await onglet.waitForTimeout(500);

console.log('\nAu départ');
dit('aucune exception', plantages.length === 0, plantages[0] || '');
dit('le compteur est caché', await onglet.locator('[data-panier-badge]').isHidden());

console.log('\nAjouter');
await onglet.locator('.panier-ajouter').first().click();
await onglet.waitForTimeout(420);
dit('le compteur passe à 1', (await onglet.locator('[data-panier-badge]').textContent()) === '1');
dit('le tiroir s’ouvre', await onglet.locator('.panier__boite').isVisible());
dit('une ligne apparaît', (await onglet.locator('[data-panier-lignes] li').count()) === 1);
const premier = (await onglet.locator('[data-panier-total]').first().textContent()).trim();
dit(`le total est chiffré (${premier})`, /\d+,\d{2}/.test(premier), premier);

console.log('\nQuantités');
await onglet.locator('[data-plus]').first().click();
await onglet.waitForTimeout(320);
dit('« + » double le total',
  (await onglet.locator('[data-panier-total]').first().textContent()).trim() !== premier);
await onglet.locator('[data-moins]').first().click();
await onglet.waitForTimeout(320);
dit('« − » revient en arrière',
  (await onglet.locator('[data-panier-total]').first().textContent()).trim() === premier);

console.log('\nFermer');
await onglet.locator('[data-panier-fermer]').first().click();
await onglet.waitForTimeout(600);
// LE défaut : le voile restait devant la page et avalait tous les clics.
// On interroge la propriété elle-même plutôt qu'un point de l'écran : un
// point peut tomber hors du cadre visible et faire échouer l'essai pour une
// raison qui n'a rien à voir avec le défaut qu'on traque.
const etat = await onglet.evaluate(() => {
  const t = document.querySelector('[data-panier-tiroir]');
  if (!t) return { absent: true };
  return {
    cache: t.hidden,
    transparentAuxClics: getComputedStyle(t).pointerEvents === 'none',
    ouvert: t.hasAttribute('data-ouvert'),
  };
});
dit('le tiroir se referme', !etat.ouvert);
dit('il ne capte plus aucun clic', etat.cache || etat.transparentAuxClics,
  'ni masqué ni transparent aux clics : il avale la page');

console.log('\nDéclinaisons');
await onglet.locator('[data-produit="carnet-relie"] select').first().selectOption('A5');
await onglet.locator('[data-produit="carnet-relie"] .panier-ajouter').click();
await onglet.waitForTimeout(420);
dit('un second produit fait une seconde ligne',
  (await onglet.locator('[data-panier-lignes] li').count()) === 2);
const options = (await onglet.locator('.panier__opt').allTextContents()).join(' ');
dit('l’option choisie suit dans le panier', /A5/.test(options), options || '(aucune)');

console.log('\nLa page panier');
await onglet.goto(`${base}/panier.html`);
await onglet.waitForTimeout(500);
dit('elle retrouve les mêmes lignes',
  (await onglet.locator('[data-panier-page] [data-panier-lignes] li').count()) === 2);
dit('et le même total',
  /\d+,\d{2}/.test(await onglet.locator('[data-panier-total]').first().textContent()));

await onglet.locator('[data-panier-vider]').first().click();
await onglet.waitForTimeout(350);
dit('« vider » ramène au panier vide',
  await onglet.locator('[data-panier-page] [data-panier-vide]').isVisible());

dit('aucune exception sur tout le parcours', plantages.length === 0, plantages[0] || '');

await navigateur.close();
serveur.close();
console.log(echecs.length ? `\n${echecs.length} échec(s)\n` : '\nTout est bon.\n');
process.exit(echecs.length ? 1 : 0);
