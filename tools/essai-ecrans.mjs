#!/usr/bin/env node
/**
 * Éprouve les formats d'écran dans un vrai navigateur.
 *
 *   node tools/essai-ecrans.mjs
 *
 * Le point à prouver tient en une phrase : une règle d'écran doit battre le
 * style en ligne du format de base. Le module écrit ses valeurs de base en
 * style en ligne — c'est ce qui les fait survivre à la régénération du HTML —
 * et un style en ligne bat n'importe quelle règle de classe. Si ce test
 * tombe, un réglage de téléphone ne s'applique pas, sans rien signaler : la
 * page s'affiche, simplement pas comme on l'a réglée.
 *
 * On mesure donc ce que le navigateur calcule VRAIMENT, à deux largeurs, au
 * lieu de relire le CSS qu'on vient d'écrire.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };

const PAGE = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>essai</title>
<style>h1 { font-size: 18px; color: #333 }</style></head>
<body><h1 id="titre">Un titre</h1><div id="bloc">Un bloc</div></body></html>`;

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
  } catch {
    res.writeHead(404).end('non');
  }
});

const port = await new Promise((ok) => serveur.listen(0, () => ok(serveur.address().port)));
const base = `http://127.0.0.1:${port}`;

const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
const navigateur = await chromium.launch();
const echecs = [];
const dit = (nom, attendu, obtenu) => {
  const bon = String(attendu) === String(obtenu);
  if (!bon) echecs.push(`${nom} : attendu ${attendu}, obtenu ${obtenu}`);
  console.log(`  ${bon ? '✓' : '✗'} ${nom}${bon ? '' : ` — attendu ${attendu}, obtenu ${obtenu}`}`);
};

/** Applique un style puis rend les valeurs calculées, à une largeur donnée. */
async function mesurer(style, largeur, proprietes, cible = '#titre') {
  const page = await navigateur.newPage({ viewport: { width: largeur, height: 700 } });
  await page.goto(base + '/index.html');
  const lu = await page.evaluate(async ({ style, proprietes, cible }) => {
    const s = await import('/admin/core/style.js');
    const e = await import('/admin/core/ecrans.js');
    const el = document.querySelector(cible);
    s.applyStyleObject(el, style);
    e.writeEcransSheet(document, [s.cssDesEcrans(style)]);
    const calcule = getComputedStyle(el);
    const sortie = { classe: el.className, feuille: !!document.getElementById(e.ECRANS_STYLE_ID) };
    for (const p of proprietes) sortie[p] = calcule[p];
    return sortie;
  }, { style, proprietes, cible });
  await page.close();
  return lu;
}

console.log('\nFormats d’écran\n');

// --- 1. Une surcharge de mobile s'applique sur un mobile, et pas ailleurs ---
const style = {
  fontSize: 40,
  paddingBlock: 60,
  ecrans: { tablet: { fontSize: 30 }, mobile: { fontSize: 20, paddingBlock: 16 } },
};

console.log('Sur un large écran (1280px) — les valeurs de base');
const large = await mesurer(style, 1280, ['fontSize', 'paddingTop']);
dit('la classe de format est posée', true, /admin-r-/.test(large.classe));
dit('la feuille est écrite', true, large.feuille);
dit('taille du texte', '40px', large.fontSize);
dit('marge intérieure', '60px', large.paddingTop);

console.log('\nSur une tablette (820px) — la surcharge de tablette');
const tablette = await mesurer(style, 820, ['fontSize', 'paddingTop']);
dit('taille du texte', '30px', tablette.fontSize);
dit('marge intérieure héritée de la base', '60px', tablette.paddingTop);

console.log('\nSur un mobile (390px) — la surcharge de mobile gagne sur celle de tablette');
const mobile = await mesurer(style, 390, ['fontSize', 'paddingTop']);
dit('taille du texte', '20px', mobile.fontSize);
dit('marge intérieure', '16px', mobile.paddingTop);

// --- 2. Une propriété composée reste complète ---
// Sur mobile on n'annule que la rotation : la transformée doit garder le
// décalage réglé sur grand écran, sinon surcharger un réglage en effacerait
// deux autres sans le dire.
console.log('\nUne transformée composée, dont mobile n’annule que la rotation');
const place = { decalageX: 30, rotation: 10, ecrans: { mobile: { rotation: 0 } } };
const placeLarge = await mesurer(place, 1280, ['transform'], '#bloc');
const placeMobile = await mesurer(place, 390, ['transform'], '#bloc');
dit('grand écran : décalage et rotation', true, /matrix\(0\.98/.test(placeLarge.transform));
dit('mobile : le décalage de base est gardé', 'matrix(1, 0, 0, 1, 30, 0)', placeMobile.transform);

// --- 3. Sans surcharge, rien n'est écrit ---
console.log('\nSans aucune surcharge');
const nu = await mesurer({ fontSize: 40 }, 390, ['fontSize']);
dit('aucune classe de format', '', nu.classe);
dit('aucune feuille', false, nu.feuille);
dit('la base s’applique', '40px', nu.fontSize);

// --- 4. L'aperçu ne mentit pas : une iframe étroite dans une fenêtre large ---
// C'est tout le pari du sélecteur de format : le cadre d'aperçu fait 390px
// dans une fenêtre de 1280px, et les règles doivent répondre au CADRE. Si
// elles répondaient à la fenêtre, le panneau montrerait un état que le
// téléphone n'aura jamais — pire qu'une absence d'aperçu.
console.log('\nDans un cadre d’aperçu de 390px, fenêtre à 1280px');
{
  const page = await navigateur.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(base + '/index.html');
  const lu = await page.evaluate(async () => {
    const { DEVICES } = await import('/admin/ui/shell.js');
    const cadre = document.createElement('iframe');
    cadre.style.cssText = `width:${DEVICES.mobile.largeur};height:600px;border:0`;
    cadre.src = '/index.html';
    document.body.appendChild(cadre);
    await new Promise((ok) => cadre.addEventListener('load', ok, { once: true }));

    const doc = cadre.contentDocument;
    const s = await import('/admin/core/style.js');
    const e = await import('/admin/core/ecrans.js');
    const el = doc.querySelector('#titre');
    const style = { fontSize: 40, ecrans: { mobile: { fontSize: 20 } } };
    s.applyStyleObject(el, style);
    e.writeEcransSheet(doc, [s.cssDesEcrans(style)]);
    return {
      largeurCadre: DEVICES.mobile.largeur,
      taille: cadre.contentWindow.getComputedStyle(el).fontSize,
    };
  });
  await page.close();
  dit('le cadre prend la largeur du format', '390px', lu.largeurCadre);
  dit('la règle du mobile s’applique dans le cadre', '20px', lu.taille);
}

// --- 5. Les largeurs d'aperçu satisfont bien leurs points de rupture ---
// La seule contrainte du tableau ECRANS, vérifiée plutôt que commentée.
console.log('\nCohérence du tableau des écrans');
{
  const page = await navigateur.newPage();
  await page.goto(base + '/index.html');
  const bilan = await page.evaluate(async () => {
    const { ECRANS } = await import('/admin/core/ecrans.js');
    return ECRANS.filter((f) => !f.base).map((f) => ({
      id: f.id,
      ok: parseInt(f.apercu, 10) <= Number(/max-width:\s*(\d+)px/.exec(f.media)[1]),
    }));
  });
  await page.close();
  for (const f of bilan) dit(`l’aperçu de « ${f.id} » tombe dans son point de rupture`, true, f.ok);
}

// --- 6. La publication garde les règles ---
// La régénération du HTML ne repart PAS du DOM affiché : elle recharge la
// source d'origine et lui applique l'instantané publié. Un réglage de
// téléphone doit donc survivre à cet aller-retour, sinon il s'éditerait
// parfaitement et ne se publierait jamais.
console.log('\nAprès un aller-retour par l’instantané publié');
{
  const page = await navigateur.newPage({ viewport: { width: 390, height: 700 } });
  await page.goto(base + '/index.html');
  const lu = await page.evaluate(async () => {
    const { PageModel } = await import('/admin/core/model.js');
    const { ECRANS_STYLE_ID } = await import('/admin/core/ecrans.js');

    // On règle sur le document courant, puis on publie.
    const model = new PageModel({ doc: document }).refresh();
    model.setStyle(document.querySelector('#titre'), {
      fontSize: 40, ecrans: { mobile: { fontSize: 20 } },
    });
    const instantane = model.toSnapshot();

    // Une source vierge, comme celle que recharge la régénération.
    const cadre = document.createElement('iframe');
    cadre.style.cssText = 'width:390px;height:600px;border:0';
    cadre.src = '/index.html';
    document.body.appendChild(cadre);
    await new Promise((ok) => cadre.addEventListener('load', ok, { once: true }));
    const vierge = cadre.contentDocument;

    const republie = new PageModel({ doc: vierge }).refresh();
    republie.applySnapshot(instantane);

    const titre = vierge.querySelector('#titre');
    const feuille = vierge.getElementById(ECRANS_STYLE_ID);
    return {
      publieEcrans: JSON.stringify(instantane.content
        && Object.values(instantane.content).find((r) => r.role === 'style')?.value?.ecrans),
      classe: /admin-r-/.test(titre.className),
      regle: !!feuille && feuille.textContent.includes('@media'),
      taille: cadre.contentWindow.getComputedStyle(titre).fontSize,
    };
  });
  await page.close();
  dit('l’instantané emporte les surcharges', '{"mobile":{"fontSize":20}}', lu.publieEcrans);
  dit('la classe est reposée sur la source vierge', true, lu.classe);
  dit('la feuille est réécrite', true, lu.regle);
  dit('et le mobile reçoit sa valeur', '20px', lu.taille);
}

await navigateur.close();
serveur.close();

console.log(echecs.length ? `\n${echecs.length} échec(s)\n` : '\nTout est bon.\n');
process.exit(echecs.length ? 1 : 0);
