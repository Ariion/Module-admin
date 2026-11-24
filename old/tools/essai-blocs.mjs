#!/usr/bin/env node
/**
 * Les blocs qui portent une donnée, et non seulement une mise en page.
 *
 *   npm run essai-blocs
 *
 * Horaires, articles, téléchargements, agenda : ces quatre-là transforment
 * ce qu'un client tape en balisage. C'est leur intérêt, et c'est leur risque
 * — une transformation qui se trompe ne casse rien à l'écran.
 *
 * Le cas des horaires le montre bien. Un commerçant écrit « 7h30 – 12h30 ».
 * schema.org lit « Tu 07:30-12:30 », et rien d'autre : une heure à un seul
 * chiffre est ignorée. L'horaire s'afficherait parfaitement sur la page et
 * manquerait dans la fiche Google, sans aucun signe. On fige donc la table
 * de conversion, format par format.
 */
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.js': 'text/javascript', '.html': 'text/html' };
const serveur = createServer((req, res) => {
  const url = req.url.split('?')[0];
  let corps;
  try { corps = readFileSync(resolve(racine, '.' + url)); }
  catch { res.writeHead(404); res.end('non'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(url)] || 'text/plain' });
  res.end(corps);
});
const port = await new Promise((ok) => serveur.listen(0, () => ok(serveur.address().port)));

let chromium;
try { ({ chromium } = createRequire(import.meta.url)('/opt/node-tools/node_modules/playwright/index.js')); }
catch { console.error('\n  Playwright est introuvable.\n'); serveur.close(); process.exit(1); }

const navigateur = await chromium.launch();
const page = await navigateur.newPage();
await page.goto(`http://127.0.0.1:${port}/essais/vercel/modeles.html`);

const echecs = [];
const dit = (quoi, bon, detail = '') => {
  console.log(`  ${bon ? '✓' : '✗'} ${quoi}${bon ? '' : ` — ${detail}`}`);
  if (!bon) echecs.push(quoi);
};

/** Ce que chaque écriture d'un horaire doit donner à schema.org. */
const HORAIRES = [
  ['Mardi|7h30 – 12h30', ['Tu 07:30-12:30'], 'l’écriture française courante'],
  ['Mardi|7 h 30-12 h 30', ['Tu 07:30-12:30'], 'avec des espaces'],
  ['Mardi|07:30-12:30', ['Tu 07:30-12:30'], 'l’écriture technique'],
  ['Mardi|8h-12h', ['Tu 08:00-12:00'], 'des heures rondes'],
  ['Mardi|07:00-13:00 ; 15:30-19:00', ['Tu 07:00-13:00', 'Tu 15:30-19:00'], 'deux créneaux'],
  ['Lundi|Fermé', [], 'un jour fermé n’émet rien'],
  ['Lundi|', [], 'un jour vide non plus'],
  ['Mardi|de 9 à 12', [], 'une phrase n’est pas inventée'],
  ['MARDI|7h-12h', ['Tu 07:00-12:00'], 'la casse ne change rien'],
];

console.log('\nLes horaires, tels que Google les lira');
const horaires = await page.evaluate(async (cas) => {
  const { renderWidget } = await import('/admin/core/widgets.js');
  return cas.map(([items]) => {
    const el = renderWidget({ type: 'horaires', props: { items } }, document, {});
    return [...el.querySelectorAll('meta[itemprop="openingHours"]')]
      .map((m) => m.getAttribute('content'));
  });
}, HORAIRES);
HORAIRES.forEach(([items, attendu, quoi], i) => {
  dit(`${quoi} — « ${items.split('|')[1] || '(vide)'} »`,
    JSON.stringify(horaires[i]) === JSON.stringify(attendu),
    `obtenu ${JSON.stringify(horaires[i])}`);
});

console.log('\nLes quatre blocs rendent quelque chose');
const rendus = await page.evaluate(async () => {
  const { renderWidget, WIDGETS } = await import('/admin/core/widgets.js');
  const out = {};
  for (const type of ['horaires', 'articles', 'telechargement', 'agenda']) {
    const plein = renderWidget({ type, props: WIDGETS[type].defaults() }, document, {});
    const vide = renderWidget({ type, props: { ...WIDGETS[type].defaults(), items: '' } }, document, {});
    out[type] = {
      texte: (plein?.textContent || '').trim().length,
      liens: plein ? plein.querySelectorAll('a').length : 0,
      videDit: (vide?.textContent || '').trim().length > 0,
    };
  }
  return out;
});
for (const [type, r] of Object.entries(rendus)) {
  dit(`${type} affiche son contenu`, r.texte > 20, `${r.texte} caractères`);
  // Un bloc vide qui ne dit rien laisse le client devant un trou sans savoir
  // quoi y mettre : chacun doit expliquer ce qu'il attend.
  dit(`${type} vide explique ce qu’il attend`, r.videDit);
}
dit('les articles portent des liens', rendus.articles.liens > 0);
dit('les téléchargements aussi', rendus.telechargement.liens > 0);

console.log('\nCe qui doit rester sûr');
const sur = await page.evaluate(async () => {
  const { renderWidget } = await import('/admin/core/widgets.js');
  const el = renderWidget({ type: 'telechargement',
    props: { items: 'Piégé|javascript:alert(1)|PDF|1 ko' } }, document, {});
  const lien = el.querySelector('a');
  const art = renderWidget({ type: 'articles',
    props: { items: 'Piégé|javascript:alert(1)|2026|x' } }, document, {});
  return { tele: lien ? lien.getAttribute('href') : null,
    article: art.querySelector('a')?.getAttribute('href') ?? null };
});
dit('un lien de téléchargement en javascript: est neutralisé', !/javascript:/i.test(sur.tele || ''), String(sur.tele));
dit('un lien d’article aussi', !/javascript:/i.test(sur.article || ''), String(sur.article));

await navigateur.close();
serveur.close();
console.log(echecs.length ? `\n${echecs.length} échec(s)\n` : '\nTout est bon.\n');
process.exit(echecs.length ? 1 : 0);
