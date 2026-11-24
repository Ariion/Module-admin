#!/usr/bin/env node
/**
 * La mise en forme du texte survit-elle jusqu'à la page publiée ?
 *
 *   npm run essai-mise-en-forme
 *
 * Un bouton de barre pose une balise que le NAVIGATEUR choisit, et le module
 * repasse tout au nettoyeur avant d'enregistrer. Les deux ne se sont jamais
 * parlé : si le navigateur produit `<strike>` là où le nettoyeur n'attend que
 * `<s>`, le client voit son prix barré à l'écran, l'enregistre, et le retrouve
 * nu au rechargement — sans un message, sans une trace.
 *
 * On exécute donc les VRAIES commandes dans un vrai navigateur, on passe le
 * résultat au VRAI nettoyeur, et on regarde ce qui reste.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript' };
const PAGE = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>essai</title></head>'
  + '<body><div id="zone" contenteditable="true">Le prix est de 24,90 euros</div></body></html>';

const serveur = createServer(async (req, res) => {
  const chemin = req.url.split('?')[0];
  if (chemin === '/' || chemin === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html' });
    return res.end(PAGE);
  }
  try {
    const corps = await readFile(resolve(racine, '.' + chemin));
    res.writeHead(200, { 'content-type': TYPES[extname(chemin)] || 'application/octet-stream' });
    res.end(corps);
  } catch { res.writeHead(404).end('non'); }
});

const port = await new Promise((ok) => serveur.listen(0, () => ok(serveur.address().port)));
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
const navigateur = await chromium.launch();
const page = await navigateur.newPage();
await page.goto(`http://127.0.0.1:${port}/index.html`);

const echecs = [];
const dit = (nom, bon, detail = '') => {
  if (!bon) echecs.push(nom);
  console.log(`  ${bon ? '✓' : '✗'} ${nom}${bon ? '' : ' — ' + detail}`);
};

/**
 * Applique une commande sur une partie du texte, puis rend ce que le
 * nettoyeur en garde. C'est le trajet réel : navigateur, puis filtre.
 */
async function passer(commande, valeur = null, parCss = false) {
  return page.evaluate(async ({ commande, valeur, parCss }) => {
    const { safeHtml } = await import('/admin/core/sanitize.js');
    const zone = document.getElementById('zone');
    zone.innerHTML = 'Le prix est de 24,90 euros';
    zone.focus();

    // On ne sélectionne que « 24,90 » : une commande appliquée à tout le bloc
    // ne dirait pas si la balise entoure bien la seule partie visée.
    const texte = zone.firstChild;
    const debut = zone.textContent.indexOf('24,90');
    const plage = document.createRange();
    plage.setStart(texte, debut);
    plage.setEnd(texte, debut + 5);
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(plage);

    document.execCommand('styleWithCSS', false, parCss);
    document.execCommand(commande, false, valeur);
    const brut = zone.innerHTML;
    return { brut, propre: safeHtml(brut) };
  }, { commande, valeur, parCss });
}

const porte = (html, balises) => balises.some((b) => new RegExp(`<${b}\\b`, 'i').test(html));

console.log('\nCe que la barre pose, et ce que le nettoyeur en garde\n');

for (const [commande, nom, balises] of [
  ['bold', 'gras', ['b', 'strong']],
  ['italic', 'italique', ['i', 'em']],
  ['underline', 'souligné', ['u']],
  ['strikeThrough', 'barré', ['s', 'strike', 'del']],
  ['superscript', 'exposant', ['sup']],
  ['subscript', 'indice', ['sub']],
]) {
  const { brut, propre } = await passer(commande);
  const posee = porte(brut, balises);
  const gardee = porte(propre, balises);
  dit(`${nom} : le navigateur le pose`, posee, brut);
  dit(`${nom} : le nettoyeur le garde`, gardee, `posé ${brut} → gardé ${propre}`);
  dit(`${nom} : et le texte est intact`, propre.includes('24,90') && propre.includes('euros'), propre);
}

console.log('\nLa couleur, qui n’a pas de balise');
{
  const { propre } = await passer('foreColor', '#b4271f', true);
  dit('elle survit en style en ligne', /color\s*:/i.test(propre), propre);
  dit('et seulement la couleur', !/background|position|display/i.test(propre), propre);
}

console.log('\nEffacer la mise en forme');
{
  const pose = await passer('bold');
  const efface = await page.evaluate(async () => {
    const { safeHtml } = await import('/admin/core/sanitize.js');
    const zone = document.getElementById('zone');
    zone.focus();
    const plage = document.createRange();
    plage.selectNodeContents(zone);
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(plage);
    document.execCommand('removeFormat');
    return safeHtml(zone.innerHTML);
  });
  dit('le gras était bien là', porte(pose.propre, ['b', 'strong']));
  dit('il ne l’est plus après effacement', !porte(efface, ['b', 'strong']), efface);
  dit('et le texte n’a pas bougé', efface.includes('24,90'), efface);
}

// Le nettoyeur ouvert au barré ne doit pas s'être ouvert à autre chose.
console.log('\nCe qui ne doit toujours pas passer');
{
  const reste = await page.evaluate(async () => {
    const { safeHtml } = await import('/admin/core/sanitize.js');
    return {
      script: safeHtml('Prix <script>alert(1)</script> barré'),
      cache: safeHtml('<span style="position:fixed;display:block;background:#000">x</span>'),
      cadre: safeHtml('<iframe src="https://exemple.fr"></iframe>Prix'),
      lien: safeHtml('<a href="javascript:alert(1)">cliquer</a>'),
    };
  });
  dit('un script est retiré', !/<script/i.test(reste.script), reste.script);
  dit('un bloc qui recouvrirait la page perd son style', !/position|display/i.test(reste.cache), reste.cache);
  dit('un cadre étranger est retiré', !/<iframe/i.test(reste.cadre), reste.cadre);
  dit('un lien qui exécute du code est désarmé', !/javascript:/i.test(reste.lien), reste.lien);
}

await navigateur.close();
serveur.close();
console.log(echecs.length ? `\n${echecs.length} échec(s)\n` : '\nTout arrive jusqu’à la page.\n');
process.exit(echecs.length ? 1 : 0);
