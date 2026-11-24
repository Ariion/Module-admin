#!/usr/bin/env node
/**
 * Vérifie qu'AUCUN caractère ne se perd à la saisie.
 *
 * Tape tout l'alphabet — minuscules et majuscules —, les chiffres, les
 * accents et la ponctuation, dans les deux endroits où l'on écrit : le champ
 * du panneau, et le texte directement dans l'aperçu. Puis reprend les 62
 * touches une par une, ce qui est la seule façon de repérer une touche qui,
 * seule, ne passe pas.
 *
 *   node tools/essai-clavier.mjs http://127.0.0.1:8080/index.html
 *
 * Demande Playwright (npx playwright install chromium) et un site déjà servi,
 * avec une session d'administration ouvrable par mot de passe.
 *
 *   ADMIN_EMAIL=... ADMIN_MOTDEPASSE=... node tools/essai-clavier.mjs <url>
 */
import { createRequire } from 'node:module';

const url = process.argv[2];
if (!url) {
  console.error('\n  Usage : node tools/essai-clavier.mjs <url de la page>\n');
  process.exit(1);
}

let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  console.error('\n  Playwright est introuvable :');
  console.error('    npm i -D playwright && npx playwright install chromium\n');
  process.exit(1);
}

const MINUSCULES = 'abcdefghijklmnopqrstuvwxyz';
const MAJUSCULES = MINUSCULES.toUpperCase();
const CHIFFRES = '0123456789';
const ACCENTS = 'éèêëàâäîïôöùûüçÉÈÀÇœæ';
const PONCTUATION = ".,;:!?'-–’()«»/&@€%+=#*\"";
const SUITES = [
  ['minuscules', MINUSCULES], ['majuscules', MAJUSCULES], ['chiffres', CHIFFRES],
  ['accents', ACCENTS], ['ponctuation', PONCTUATION],
];

const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 1500, height: 940 } });
const erreurs = [];
page.on('pageerror', (e) => erreurs.push(e.message));

const separateur = url.includes('?') ? '&' : '?';
await page.goto(url + separateur + 'admin', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);

const panneau = page.locator('#admin-root');
if (await panneau.locator('input[type=email]').count()) {
  await panneau.locator('input[type=email]').fill(process.env.ADMIN_EMAIL || 'a@b.fr');
  await panneau.locator('input[type=password]').fill(process.env.ADMIN_MOTDEPASSE || 'x');
  await panneau.locator('button[type=submit]').click();
}
await page.waitForFunction(() => window.Admin?.model?.doc?.location, null, { timeout: 40000 });
await page.waitForTimeout(2500);
const apercu = page.frameLocator('iframe');

const passer = panneau.locator('.btn--ghost', { hasText: 'Partir d’une page vide' });
if (await passer.isVisible().catch(() => false)) { await passer.click(); await page.waitForTimeout(500); }

let total = 0;
let perdus = 0;

/** Le texte de l'élément en cours d'édition sur place, ou null. */
const lireApercu = () => page.evaluate(() =>
  window.Admin.model.doc.querySelector('[data-admin-editing]')?.textContent ?? null);

/** Ouvre l'édition sur place sur le n-ième élément correspondant. */
async function ouvrir(selecteur, n) {
  await apercu.locator(selecteur).nth(n).click();
  await page.waitForTimeout(700);
  return (await lireApercu()) !== null;
}

function verdict(etiquette, tape, recu) {
  total++;
  // Un contenteditable remplace l'espace de tête par un espace insécable :
  // c'est le navigateur, et le texte reste le bon.
  const normalise = String(recu ?? '').replace(/ /g, ' ');
  if (normalise === tape) { console.log(`    ${etiquette} : ok`); return; }
  perdus++;
  const manquants = [...new Set([...tape].filter((c) => !normalise.includes(c)))];
  console.log(`    ${etiquette} : MANQUE ${JSON.stringify(manquants.join('')) || '(ordre différent)'}`);
  console.log('      tapé :', JSON.stringify(tape));
  console.log('      reçu :', JSON.stringify(normalise));
}

// --- 1. Écriture directe dans l'aperçu -----------------------------------
console.log('\nÉcriture directe dans l’aperçu');
let ouvert = false;
for (const selecteur of ['h1', 'h2', 'h3', 'p']) {
  for (let n = 0; n < 6 && !ouvert; n++) ouvert = await ouvrir(selecteur, n).catch(() => false);
  if (ouvert) { console.log('  sur un', selecteur.toUpperCase(), 'de la page :'); break; }
}
if (!ouvert) console.log('  aucun texte du site n’accepte l’édition sur place ici.');
else {
  for (const [nom, suite] of SUITES) {
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    await page.keyboard.type(suite, { delay: 12 });
    await page.waitForTimeout(350);
    verdict(nom, suite, await lireApercu());
  }
  // Le curseur au tout début du texte, là où l'on insère le plus souvent.
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.keyboard.type('XX');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.type(MINUSCULES, { delay: 12 });
  await page.waitForTimeout(350);
  verdict('minuscules, curseur au début', MINUSCULES, (await lireApercu() || '').replace(/XX$/, ''));

  console.log('  touche par touche :');
  const rebelles = [];
  for (const touche of MINUSCULES + MAJUSCULES + CHIFFRES) {
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    await page.keyboard.type(touche);
    await page.waitForTimeout(45);
    if ((await lireApercu()) !== touche) rebelles.push(touche);
  }
  total++;
  if (rebelles.length) { perdus++; console.log('    NE PASSENT PAS :', JSON.stringify(rebelles.join(''))); }
  else console.log('    les 62 touches passent');
}

// --- 2. Champ du panneau --------------------------------------------------
console.log('\nChamp du panneau');
const champ = panneau.locator('.views textarea:visible, .views input.input:visible').first();
if (!await champ.count()) console.log('  aucun champ de texte ouvert dans le panneau.');
else {
  for (const [nom, suite] of SUITES) {
    await champ.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    await champ.pressSequentially(suite, { delay: 12 });
    await page.waitForTimeout(400);
    verdict(nom, suite, await champ.inputValue());
  }
}

console.log('\n' + (total - perdus) + '/' + total + ' séries correctes.');
if (erreurs.length) console.log('erreurs de page :', erreurs);
console.log(perdus ? '=> DES CARACTÈRES SE PERDENT.\n' : '=> Aucun caractère perdu.\n');
await navigateur.close();
process.exit(perdus ? 1 : 0);
