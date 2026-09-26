#!/usr/bin/env node
/**
 * Éprouve les sept éléments qui se comportent, dans un vrai navigateur.
 *
 *   node tools/essai-elements.mjs
 *
 * Le point à prouver n'est pas qu'un accordéon s'affiche : c'est qu'il
 * s'ouvre ENCORE une fois le module parti. À la publication, `core/bake.js`
 * réécrit le fichier `.html` avec le contenu dedans, et le client peut retirer
 * la balise du module quand il veut. Un accordéon qui aurait besoin de notre
 * script serait alors un titre muet, et une visionneuse, une photo qu'on ne
 * peut plus agrandir. Le défaut ne se verrait pas à l'édition — seulement sur
 * le site en ligne, après coup.
 *
 * On fabrique donc la page comme le module la publie : les éléments sont
 * rendus, puis la page est figée par le VRAI code de sortie (`ui/export.js`),
 * celui qui retire les scripts et tous les attributs `data-admin-*`. Le
 * navigateur ouvre ensuite ce fichier-là, tout seul, et c'est sur lui qu'on
 * clique et qu'on mesure.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };

/** Les sept, dans l'ordre où on les éprouve. */
const SEPT = ['accordeon', 'onglets', 'temoignages', 'galerie', 'chiffres', 'tarifs', 'reseaux'];

/**
 * Deux photos écrites en clair dans l'adresse.
 *
 * Une image servie par le serveur d'essai ferait une requête, et l'essai des
 * réseaux ne pourrait plus distinguer « une icône a appelé le réseau » de
 * « une photo de galerie a appelé le réseau ». En `data:`, rien ne part.
 */
const PHOTOS = ['%23b25', '%23258'].map((teinte) => 'data:image/svg+xml,'
  + `%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400'%3E`
  + `%3Crect width='600' height='400' fill='${teinte}'/%3E%3C/svg%3E`);

/**
 * La page d'atelier : un site ordinaire, avec sa feuille de style et la
 * déclaration du module. Elle ne sert qu'à FABRIQUER le fichier publié.
 */
const ATELIER = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>essai des éléments</title>
<style>
  body { margin: 0; font: 16px/1.5 system-ui, sans-serif; color: #1a1c22 }
  section { padding: 24px 12px }
  h2, h3 { margin: 0 0 12px }
  ul { padding-left: 20px }
  a { color: #1a5fd0 }
</style>
<script>window.ADMIN_CONFIG = { site: 'essai' };</script>
</head><body><main></main></body></html>`;

/** Les pages figées, remplies au fil de l'essai. */
const publiees = new Map();

const serveur = createServer(async (req, res) => {
  const chemin = req.url.split('?')[0];
  if (chemin === '/' || chemin === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html' });
    return res.end(ATELIER);
  }
  if (publiees.has(chemin)) {
    res.writeHead(200, { 'content-type': 'text/html' });
    return res.end(publiees.get(chemin));
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

/**
 * Fabrique une page publiée contenant ces éléments.
 *
 * On passe par `freezePage`, et non par une copie du HTML des éléments : c'est
 * le code qui écrit réellement le fichier du client, scripts retirés compris.
 * Recopier son travail dans l'essai, ce serait éprouver l'essai.
 *
 * @returns {{html:string, cles:object, erreurs:string[]}}
 */
async function publier(types, photos) {
  const page = await navigateur.newPage();
  const bavures = [];
  page.on('pageerror', (e) => bavures.push(String(e.message)));
  await page.goto(base + '/index.html');

  const fabrique = await page.evaluate(async ({ types, photos }) => {
    const { createWidget, renderWidget } = await import('/admin/core/widgets.js');
    const { freezePage } = await import('/admin/ui/export.js');
    const cles = {};
    const manques = [];

    const hote = document.querySelector('main');
    for (const type of types) {
      const noeud = createWidget(type);
      if (!noeud) { manques.push(type + ' : createWidget rend null'); continue; }
      if (type === 'galerie') noeud.props.images = photos.join('\n');
      const enveloppe = createWidget('section');
      enveloppe.children = [noeud];
      enveloppe.props.padding = 32;

      const el = renderWidget(enveloppe, document);
      if (!el) { manques.push(type + ' : renderWidget rend null'); continue; }
      el.setAttribute('data-admin-section', 's-' + type);
      hote.appendChild(el);
      cles[type] = noeud.key;
    }
    return { html: freezePage({ doc: document }), cles, manques };
  }, { types, photos });

  await page.close();
  return { ...fabrique, erreurs: bavures };
}

/** Ouvre une page publiée, en notant ce qu'elle demande au réseau. */
async function ouvrir(chemin, largeur = 390) {
  const page = await navigateur.newPage({ viewport: { width: largeur, height: 820 } });
  const requetes = [];
  page.on('request', (r) => requetes.push({ url: r.url(), type: r.resourceType() }));
  const bavures = [];
  page.on('pageerror', (e) => bavures.push(String(e.message)));
  await page.goto(base + chemin, { waitUntil: 'load' });
  return { page, requetes, bavures };
}

// ------------------------------------------------------------------ 1
console.log('\nLes sept éléments\n');
console.log('Création et rendu');

const tout = await publier(SEPT, PHOTOS);
for (const manque of tout.manques) echecs.push(manque);
for (const type of SEPT) {
  dit(`« ${type} » se crée et se rend`, true, !!tout.cles[type]);
}
dit('aucune erreur pendant le rendu', '', tout.erreurs.join(' | '));

publiees.set('/publie.html', tout.html);
const cles = tout.cles;

// ------------------------------------------------------------------ 2
// Ce que le client reçoit : le fichier, tel qu'il part sur l'hébergement.
console.log('\nLe fichier publié');
dit('aucune balise <script>', false, /<script/i.test(tout.html));
dit('aucune trace « data-admin »', false, /data-admin/.test(tout.html));
dit('aucune adresse vers /admin/', false, /\/admin\//.test(tout.html));
dit('les feuilles des éléments sont dedans', true, tout.html.split('<style').length - 1 >= 2);

// ------------------------------------------------------------------ 3
console.log('\nSans le module, à 390 px — l’accordéon s’ouvre et se ferme');
{
  const { page, bavures } = await ouvrir('/publie.html');
  const details = page.locator('details');
  dit('trois questions', 3, await details.count());
  dit('la première est ouverte à l’arrivée', true, await details.nth(0).evaluate((e) => e.open));
  dit('la deuxième est fermée', false, await details.nth(1).evaluate((e) => e.open));

  await details.nth(1).locator('summary').click();
  dit('un clic ouvre la deuxième', true, await details.nth(1).evaluate((e) => e.open));
  // « Une seule ouverte à la fois » est l'attribut `name`, tenu par le
  // navigateur : c'est lui qu'on éprouve, pas notre code.
  dit('et referme la première', false, await details.nth(0).evaluate((e) => e.open));

  await details.nth(1).locator('summary').click();
  dit('un second clic la referme', false, await details.nth(1).evaluate((e) => e.open));
  dit('la réponse reste dans la page une fois fermée', true,
    (await details.nth(1).locator('p').textContent()).length > 10);
  dit('aucune erreur de script', '', bavures.join(' | '));
  await page.close();
}

console.log('\nSans le module — on change d’onglet');
{
  const { page } = await ouvrir('/publie.html');
  const panneau = (rang) => page.locator(`.admin-w-${cles.onglets} > div`).nth(rang);
  const visible = (rang) => panneau(rang).evaluate((e) => getComputedStyle(e).display);

  dit('trois onglets', 3, await page.locator(`.admin-w-${cles.onglets} > label`).count());
  dit('le premier panneau est affiché', 'block', await visible(0));
  dit('le deuxième est masqué', 'none', await visible(1));

  await page.locator(`label[for="${cles.onglets}-o2"]`).click();
  dit('un clic affiche le deuxième', 'block', await visible(1));
  dit('et masque le premier', 'none', await visible(0));

  await page.locator(`label[for="${cles.onglets}-o3"]`).click();
  dit('le troisième prend la suite', 'block', await visible(2));
  dit('le deuxième se retire', 'none', await visible(1));
  await page.close();
}

console.log('\nSans le module — la visionneuse s’ouvre, défile et se referme');
{
  const { page } = await ouvrir('/publie.html');
  const vue = (rang) => page.locator(`#v${cles.galerie}-${rang}`);
  const etat = (rang) => vue(rang).evaluate((e) => getComputedStyle(e).display);

  dit('deux vignettes', 2, await page.locator(`#g${cles.galerie} > a`).count());
  dit('la visionneuse est fermée à l’arrivée', 'none', await etat(0));

  await page.locator(`#g${cles.galerie} > a`).nth(0).click();
  dit('un clic sur la vignette l’ouvre', 'flex', await etat(0));
  // Une visionneuse qui s'ouvre sans couvrir l'écran n'en est pas une.
  const boite = await vue(0).boundingBox();
  dit('elle couvre la largeur de l’écran', 390, Math.round(boite.width));

  await vue(0).locator('a[aria-label="Photo suivante"]').click();
  dit('« suivante » passe à la deuxième', 'flex', await etat(1));
  dit('et referme la première', 'none', await etat(0));

  await vue(1).locator('a[aria-label="Fermer"]').click();
  dit('la croix referme tout', 'none', await etat(1));
  dit('les photos restent dans la grille', 2, await page.locator(`#g${cles.galerie} > a > img`).count());
  await page.close();
}

// ------------------------------------------------------------------ 4
// Lisible à 390 px : on mesure la page et les colonnes, au lieu de supposer
// qu'une grille de trois se replie.
console.log('\nÀ 390 px de large — mesuré, pas supposé');
{
  const { page } = await ouvrir('/publie.html');
  const debord = await page.evaluate(() => document.documentElement.scrollWidth);
  dit('aucun débordement horizontal', true, debord <= 390);

  const colonnes = async (selecteur) => page.$$eval(selecteur, (els) => {
    const boites = els.map((e) => e.getBoundingClientRect());
    return {
      nombre: new Set(boites.map((b) => Math.round(b.left))).size,
      plusLarge: Math.round(Math.max(...boites.map((b) => b.width))),
      plusEtroit: Math.round(Math.min(...boites.map((b) => b.width))),
    };
  });

  const avis = await colonnes('figure');
  dit('les témoignages passent à une colonne', 1, avis.nombre);
  dit('et chacun prend la largeur disponible', true, avis.plusLarge >= 300);

  const mesures = await page.evaluate(() => {
    const dans = (balise) => Array.from(document.querySelectorAll(balise));
    const largeur = (el) => Math.round(el.getBoundingClientRect().width);
    const chiffres = dans('main > section')[4].querySelectorAll('strong');
    const offres = dans('main > section')[5].querySelectorAll('h3');
    return {
      chiffres: [...chiffres].map((e) => Math.round(e.getBoundingClientRect().left)),
      chiffreLu: [...chiffres].map((e) => parseFloat(getComputedStyle(e).fontSize)),
      // La colonne, et non son titre : celle qui est mise en avant porte un
      // trait plus épais, qui décalerait son titre d'un pixel.
      offres: [...offres].map((e) => Math.round(e.parentElement.getBoundingClientRect().left)),
      icone: largeur(document.querySelector('nav a')),
      texteAccordeon: largeur(document.querySelector('details p')),
    };
  });
  dit('les chiffres clés s’empilent', 1, new Set(mesures.chiffres).size);
  dit('le nombre reste grand mais lisible', true,
    mesures.chiffreLu.every((t) => t >= 28 && t <= 60));
  dit('les trois tarifs s’empilent', 1, new Set(mesures.offres).size);
  dit('une icône de réseau garde une cible cliquable', true, mesures.icone >= 40);
  dit('le texte d’une réponse reste large', true, mesures.texteAccordeon >= 300);
  await page.close();
}

// Et à l'inverse : sur un large écran, les mêmes grilles se déplient. Sans
// cette contre-épreuve, une colonne unique partout passerait pour un succès.
console.log('\nSur un large écran (1280 px) — les grilles se déplient');
{
  const { page } = await ouvrir('/publie.html', 1280);
  const rangs = await page.$$eval('figure', (els) => new Set(
    els.map((e) => Math.round(e.getBoundingClientRect().left))).size);
  dit('trois témoignages, trois colonnes', 3, rangs);
  await page.close();
}

// ------------------------------------------------------------------ 5
console.log('\nLes icônes de réseaux n’appellent rien');
{
  const seul = await publier(['reseaux'], PHOTOS);
  publiees.set('/publie-reseaux.html', seul.html);
  const { page, requetes, bavures } = await ouvrir('/publie-reseaux.html');

  // L'icône d'onglet du navigateur n'est pas demandée par la page : c'est le
  // navigateur qui la réclame de lui-même, sur n'importe quelle adresse.
  const dehors = requetes.filter(
    (r) => r.type !== 'document' && !r.url.endsWith('/favicon.ico'));
  dit('la page est bien chargée', `${base}/publie-reseaux.html`, requetes[0].url);
  dit('aucune requête en dehors de la page', 0, dehors.length);
  if (dehors.length) console.log('    ', dehors.map((r) => `${r.type} ${r.url}`).join('\n     '));
  dit('aucune balise <img>', 0, await page.locator('img').count());
  dit('aucune feuille externe', 0, await page.locator('link[rel~="stylesheet"]').count());
  dit('aucune police appelée', false, /@font-face|fonts\./.test(seul.html));

  // Dessinées veut dire : des tracés, dans la page.
  dit('trois marques', 3, await page.locator('nav a svg').count());
  dit('des tracés, pas des images', true, await page.locator('nav a svg path').count() >= 3);
  dit('elles prennent la couleur du texte', 'currentColor',
    await page.locator('nav a svg path').first().getAttribute('stroke')
      || await page.locator('nav a svg path').first().getAttribute('fill'));
  dit('chaque lien se nomme', true, await page.evaluate(() => Array.from(
    document.querySelectorAll('nav a')).every((a) => !!a.getAttribute('aria-label'))));
  dit('aucune erreur de script', '', bavures.join(' | '));
  await page.close();
}

// ------------------------------------------------------------------ 6
// Les formats d'écran s'appliquent à ces éléments comme aux autres : une
// surcharge de mobile doit battre leur style en ligne. C'est le mécanisme
// récent qu'il ne faut pas casser en posant des styles à la main.
console.log('\nUn format d’écran surcharge l’un de ces éléments');
{
  const page = await navigateur.newPage({ viewport: { width: 390, height: 800 } });
  await page.goto(base + '/index.html');
  const lu = await page.evaluate(async () => {
    const { createWidget, renderWidget } = await import('/admin/core/widgets.js');
    const s = await import('/admin/core/style.js');
    const e = await import('/admin/core/ecrans.js');

    const noeud = createWidget('chiffres');
    noeud.props.style = { paddingBlock: 60, ecrans: { mobile: { paddingBlock: 12 } } };
    const el = renderWidget(noeud, document);
    document.querySelector('main').appendChild(el);
    e.writeEcransSheet(document, [s.cssDesEcrans(noeud.props.style)]);
    return {
      classe: /admin-r-/.test(el.className),
      comportement: /admin-w-/.test(el.className),
      marge: getComputedStyle(el).paddingTop,
      grille: getComputedStyle(el).display,
    };
  });
  await page.close();
  dit('la classe de format est posée sur l’élément', true, lu.classe);
  dit('la surcharge de mobile gagne sur le style en ligne', '12px', lu.marge);
  dit('la grille de l’élément est intacte', 'grid', lu.grille);
  dit('aucune classe de comportement parasite', false, lu.comportement);
}

await navigateur.close();
serveur.close();

console.log(echecs.length ? `\n${echecs.length} échec(s)\n` : '\nTout est bon.\n');
process.exit(echecs.length ? 1 : 0);
