#!/usr/bin/env node
/**
 * Éprouve les couleurs et les polices de la marque dans un vrai navigateur.
 *
 *   node tools/essai-marque.mjs
 *
 * Une ambiance est un point de départ : le client impose ses couleurs et ses
 * polices, le reste de l'accord tient. Trois choses peuvent mal tourner, et
 * aucune ne se signale à l'écran.
 *
 * La première : la surcharge perd contre l'ambiance, et le client voit sa
 * couleur ignorée sans savoir pourquoi. La deuxième, l'inverse : une surcharge
 * vidée reste appliquée, et il n'y a plus de retour en arrière. La troisième
 * est la seule irrattrapable — une surcharge en portée « blocs » qui repeint le
 * code du client. Un site qu'on repeint par surprise ne se dépeint pas.
 *
 * On mesure donc ce que le navigateur CALCULE, sur une page qui mêle du code
 * écrit à la main et une section posée par le module, au lieu de relire le CSS
 * qu'on vient d'écrire.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };

/**
 * La page d'essai : du code de client, et une section posée par le module.
 *
 * Le paragraphe `#sien` est la pièce importante. Il tient sa couleur de la
 * feuille du site, et il n'appartient à aucune section du module : c'est lui
 * qui dit si la portée « blocs » se tient à sa place.
 *
 * Sa couleur est héritée du `body`, et non écrite sur un sélecteur à lui : un
 * `#sien{color:…}` l'emporterait sur la feuille du thème par sa seule
 * spécificité, et la portée « site » aurait alors l'air de se retenir alors
 * qu'elle serait simplement battue.
 */
const PAGE = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>essai</title>
<style>
  body { background: #fdfdfd; color: #333333; font-family: Georgia, serif }
  h1 { font-size: 30px }
</style></head>
<body>
<p id="sien">Un paragraphe du code d’origine.</p>
<section data-admin-section="s1">
  <h1 id="titre">Un titre posé par le module</h1>
  <p id="notre">Un paragraphe posé par le module.</p>
  <div><a id="bouton" href="#">Nous appeler</a></div>
  <blockquote id="citation">Une citation.</blockquote>
</section>
<section id="bande"><p>La deuxième section du site.</p></section>
</body></html>`;

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

/**
 * Écrit la feuille du thème dans une page neuve, puis rend les valeurs
 * calculées demandées.
 *
 * @param {object} reglage le réglage `theme` du site, marque comprise
 * @param {object} cibles { nom: { sel, props } } — props en notation CSS
 */
async function mesurer(reglage, cibles) {
  const page = await navigateur.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(base + '/index.html');
  const lu = await page.evaluate(async ({ reglage, cibles }) => {
    const th = await import('/admin/core/theme.js');
    th.writeThemeSheet(document, reglage);
    const sortie = { feuille: !!document.getElementById(th.THEME_STYLE_ID) };
    for (const [nom, cible] of Object.entries(cibles)) {
      const el = document.querySelector(cible.sel);
      const calcule = getComputedStyle(el);
      sortie[nom] = {};
      for (const prop of cible.props) sortie[nom][prop] = calcule.getPropertyValue(prop).trim();
    }
    return sortie;
  }, { reglage, cibles });
  await page.close();
  return lu;
}

// L'ambiance « sobre » : accent presque noir, Inter partout, bande #f6f7f9.
const SOBRE_ACCENT = 'rgb(21, 24, 29)';
const MARQUE = { sel: '#bouton', props: ['background-color', 'color'] };
const LIEN = { sel: '#citation', props: ['border-left-color'] };

console.log('\nCouleurs et polices de la marque\n');

// --- 1. Une couleur de marque l'emporte sur celle de l'ambiance -------------
console.log('L’ambiance seule, puis la même avec une couleur de marque');
{
  const nu = await mesurer({ id: 'sobre', portee: 'site' }, { bouton: MARQUE });
  dit('la feuille est écrite', true, nu.feuille);
  dit('le bouton prend l’accent de l’ambiance', SOBRE_ACCENT, nu.bouton['background-color']);

  const peint = await mesurer(
    { id: 'sobre', portee: 'site', marque: { principale: '#c2185b' } },
    { bouton: MARQUE },
  );
  dit('le bouton prend la couleur de la marque', 'rgb(194, 24, 91)', peint.bouton['background-color']);
  dit('et le texte du bouton reste lisible', 'rgb(255, 255, 255)', peint.bouton.color);
}

// --- 2. Le texte posé sur la couleur de marque suit la couleur ---------------
// Une couleur choisie pour un logo ne dit rien de ce qui se lit dessus. Sans
// ce calcul, une marque jaune donne un bouton blanc sur blanc : le client
// colore son bouton et le voit disparaître.
console.log('\nUne marque claire, une marque sombre');
{
  const clair = await mesurer(
    { id: 'sobre', portee: 'site', marque: { principale: '#ffd400' } },
    { bouton: MARQUE },
  );
  dit('sur un jaune, le texte du bouton passe à l’encre', 'rgb(21, 24, 29)', clair.bouton.color);

  const sombre = await mesurer(
    { id: 'sobre', portee: 'site', marque: { principale: '#2b1a6f' } },
    { bouton: MARQUE },
  );
  dit('sur un violet sombre, il reste blanc', 'rgb(255, 255, 255)', sombre.bouton.color);
}

// --- 3. Une surcharge vidée rend la main à l'ambiance ------------------------
// C'est la seule façon de revenir en arrière sans changer d'ambiance. Trois
// formes de « rien » à traiter pareil : la clé absente, la chaîne vide, et une
// valeur qui n'est pas une couleur — celle-là peut venir du document.
console.log('\nUne surcharge vidée, ou fautive');
for (const [nom, marque] of [
  ['aucune marque', {}],
  ['une couleur vidée', { principale: '' }],
  ['des espaces', { principale: '   ' }],
  ['une couleur qui n’en est pas une', { principale: 'bleu de mon logo' }],
]) {
  const lu = await mesurer({ id: 'sobre', portee: 'site', marque }, { bouton: MARQUE });
  dit(`${nom} : l’ambiance reprend la main`, SOBRE_ACCENT, lu.bouton['background-color']);
}

// --- 4. La portée « blocs » ne repeint pas le code du client -----------------
// La seule erreur irrattrapable du module. Le paragraphe `#sien` a sa couleur
// dans la feuille du site et n'appartient à aucune section posée : il doit
// sortir de là exactement comme il est entré, marque ou pas.
console.log('\nEn portée « blocs », avec une marque');
{
  const cibles = {
    sien: { sel: '#sien', props: ['color'] },
    corps: { sel: 'body', props: ['background-color', 'font-family'] },
    notre: { sel: '#notre', props: ['color'] },
    bouton: MARQUE,
    bande: { sel: '#bande', props: ['background-color'] },
  };
  const lu = await mesurer(
    { id: 'sobre', portee: 'blocs', marque: { principale: '#c2185b', secondaire: '#1a56db' } },
    cibles,
  );
  dit('le paragraphe du client garde sa couleur', 'rgb(51, 51, 51)', lu.sien.color);
  dit('le fond du site n’est pas repeint', 'rgb(253, 253, 253)', lu.corps['background-color']);
  dit('la police du site n’est pas remplacée', 'Georgia, serif', lu.corps['font-family']);
  dit('la bande du site n’est pas repeinte', 'rgba(0, 0, 0, 0)', lu.bande['background-color']);
  dit('mais le bloc posé par le module prend la marque', 'rgb(194, 24, 91)', lu.bouton['background-color']);
  dit('et son texte prend la teinte douce de l’ambiance', 'rgb(91, 100, 114)', lu.notre.color);
}

// --- 5. En portée « site », tout est repeint — c'est ce qu'on demande --------
console.log('\nEn portée « site », la même marque');
{
  const lu = await mesurer(
    { id: 'sobre', portee: 'site', marque: { principale: '#c2185b', secondaire: '#1a56db' } },
    {
      sien: { sel: '#sien', props: ['color'] },
      corps: { sel: 'body', props: ['background-color'] },
      bande: { sel: '#bande', props: ['background-color'] },
    },
  );
  dit('le paragraphe du client prend la teinte douce', 'rgb(91, 100, 114)', lu.sien.color);
  dit('le fond du site prend celui de l’ambiance', 'rgb(255, 255, 255)', lu.corps['background-color']);
  // La seconde couleur d'une marque est une couleur de logo : posée telle
  // quelle sur une bande de section, elle rendrait le texte illisible. Diluée
  // à 14 % dans le fond de l'ambiance, elle reste un fond.
  dit('la bande prend la seconde couleur, diluée', 'rgb(223, 231, 250)', lu.bande['background-color']);
}

// --- 6. La seconde couleur se voit là où elle est nommée ---------------------
console.log('\nLa seconde couleur, et sa variable');
{
  const cibles = {
    citation: LIEN,
    racine: { sel: ':root', props: ['--admin-secondaire', '--admin-accent-rgb'] },
  };
  const nu = await mesurer({ id: 'sobre', portee: 'site' }, cibles);
  dit('sans marque, l’accent tient les deux rôles', '#15181d', nu.racine['--admin-secondaire']);
  dit('le filet de citation suit l’accent', SOBRE_ACCENT, nu.citation['border-left-color']);

  const lu = await mesurer(
    { id: 'sobre', portee: 'site', marque: { principale: '#c2185b', secondaire: '#1a56db' } },
    cibles,
  );
  dit('la variable porte la seconde couleur', '#1a56db', lu.racine['--admin-secondaire']);
  dit('le filet de citation la prend', 'rgb(26, 86, 219)', lu.citation['border-left-color']);
  dit('et la transparence suit la couleur principale', '194,24,91', lu.racine['--admin-accent-rgb']);
}

// --- 7. Les polices de la marque arrivent dans la balise de chargement ------
// Sans cela le site régénéré NOMMERAIT les polices du client sans les charger :
// il perdrait ses polices sans rien dire, et seulement une fois le module
// retiré — c'est-à-dire là où personne ne regarde plus.
console.log('\nLes polices de la marque, dans la balise écrite par refreshFonts()');
{
  const page = await navigateur.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(base + '/index.html');
  const lu = await page.evaluate(async () => {
    const { PageModel } = await import('/admin/core/model.js');
    const { FONT_LINK_ID } = await import('/admin/core/fonts.js');
    const model = new PageModel({ doc: document }).refresh();

    model.setReglage('theme', { id: 'sobre', portee: 'site' });
    const ambiance = document.getElementById(FONT_LINK_ID)?.getAttribute('href') || '';

    model.setReglage('theme', {
      id: 'sobre',
      portee: 'site',
      marque: { policeTitres: 'Playfair Display', policeTexte: 'Karla' },
    });
    const lien = document.getElementById(FONT_LINK_ID)?.getAttribute('href') || '';

    // Une famille qui n'est pas au catalogue ne peut pas être chargée : la
    // surcharge est écartée, et l'ambiance garde sa police.
    model.setReglage('theme', {
      id: 'sobre', portee: 'site', marque: { policeTitres: 'Helvetica de mon imprimeur' },
    });
    const inconnue = document.getElementById(FONT_LINK_ID)?.getAttribute('href') || '';

    model.setReglage('theme', {
      id: 'sobre',
      portee: 'site',
      marque: { policeTitres: 'Playfair Display', policeTexte: 'Karla' },
    });
    const titre = getComputedStyle(document.querySelector('#titre')).fontFamily;
    const texte = getComputedStyle(document.querySelector('#notre')).fontFamily;
    return { ambiance, lien, inconnue, titre, texte };
  });
  await page.close();

  dit('l’ambiance seule charge sa police', true, /family=Inter/.test(lu.ambiance));
  dit('la police des titres de la marque est chargée', true, /family=Playfair\+Display/.test(lu.lien));
  dit('celle du texte aussi', true, /family=Karla/.test(lu.lien));
  dit('celle de l’ambiance ne l’est plus', false, /family=Inter/.test(lu.lien));
  dit('une famille inconnue est écartée', true, /family=Inter/.test(lu.inconnue));
  dit('le titre est écrit dans la police de la marque', '"Playfair Display", serif', lu.titre);
  dit('le texte aussi', 'Karla, sans-serif', lu.texte);
}

// --- 8. La publication garde la marque --------------------------------------
// La régénération du HTML ne repart PAS du DOM affiché : elle recharge la
// source d'origine et lui applique l'instantané publié. La marque voyage dans
// les réglages du document commun ; si elle ne survivait pas à cet aller-retour,
// elle s'éditerait parfaitement et ne se publierait jamais.
console.log('\nAprès un aller-retour par l’instantané publié');
{
  const page = await navigateur.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(base + '/index.html');
  const lu = await page.evaluate(async () => {
    const { PageModel } = await import('/admin/core/model.js');
    const { THEME_STYLE_ID } = await import('/admin/core/theme.js');
    const { FONT_LINK_ID } = await import('/admin/core/fonts.js');

    const model = new PageModel({ doc: document }).refresh();
    model.setReglage('theme', {
      id: 'sobre',
      portee: 'blocs',
      marque: { principale: '#c2185b', policeTitres: 'Playfair Display' },
    });
    const instantane = model.toSnapshot();

    // Une source vierge, comme celle que recharge la régénération.
    const cadre = document.createElement('iframe');
    cadre.style.cssText = 'width:1000px;height:700px;border:0';
    cadre.src = '/index.html';
    document.body.appendChild(cadre);
    await new Promise((ok) => cadre.addEventListener('load', ok, { once: true }));
    const vierge = cadre.contentDocument;

    const republie = new PageModel({ doc: vierge }).refresh();
    republie.applySnapshot(instantane);

    const calcule = (sel) => cadre.contentWindow.getComputedStyle(vierge.querySelector(sel));
    return {
      publiee: JSON.stringify(instantane.reglages?.theme?.marque),
      feuille: !!vierge.getElementById(THEME_STYLE_ID),
      police: vierge.getElementById(FONT_LINK_ID)?.getAttribute('href') || '',
      bouton: calcule('#bouton').backgroundColor,
      sien: calcule('#sien').color,
    };
  });
  await page.close();

  dit('l’instantané emporte la marque',
    '{"principale":"#c2185b","policeTitres":"Playfair Display"}', lu.publiee);
  dit('la feuille est réécrite sur la source vierge', true, lu.feuille);
  dit('la balise des polices aussi', true, /family=Playfair\+Display/.test(lu.police));
  dit('le bouton du module retrouve la couleur de la marque', 'rgb(194, 24, 91)', lu.bouton);
  dit('et le code du client est toujours intact', 'rgb(51, 51, 51)', lu.sien);
}

// --- 9. La démonstration du back-office passe par le même chemin -------------
// Une galerie qui mentirait ne servirait à rien : la vignette et la feuille du
// site doivent sortir de la même fonction. On le vérifie plutôt que de le
// commenter — c'est exactement le genre d'accord qui se défait en silence.
console.log('\nLa démonstration de l’écran Apparence');
{
  const page = await navigateur.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(base + '/index.html');
  const lu = await page.evaluate(async () => {
    const { documentDemo } = await import('/admin/ui/back/apparence.js');
    const { renderWidget } = await import('/admin/core/widgets.js');
    const { pageDemo } = await import('/admin/core/demo.js');
    const reglage = {
      id: 'sobre',
      portee: 'site',
      marque: { principale: '#c2185b', policeTitres: 'Playfair Display' },
    };
    const html = documentDemo(renderWidget, pageDemo('restaurant', reglage), reglage);

    // Rendu pour de bon : on mesure la démonstration, pas sa chaîne.
    const cadre = document.createElement('iframe');
    cadre.style.cssText = 'width:1240px;height:900px;border:0';
    cadre.srcdoc = html;
    document.body.appendChild(cadre);
    await new Promise((ok) => cadre.addEventListener('load', ok, { once: true }));
    const doc = cadre.contentDocument;
    const titre = doc.querySelector('h2');
    return {
      policeChargee: /family=Playfair\+Display/.test(doc.querySelector('link[href*="fonts"]')?.href || ''),
      titre: cadre.contentWindow.getComputedStyle(titre).fontFamily,
      accent: /#c2185b/i.test(html),
    };
  });
  await page.close();

  dit('la démonstration porte la couleur de la marque', true, lu.accent);
  dit('elle charge la police de la marque', true, lu.policeChargee);
  dit('et ses titres sont écrits dedans', '"Playfair Display", serif', lu.titre);
}

await navigateur.close();
serveur.close();

console.log(echecs.length ? `\n${echecs.length} échec(s)\n` : '\nTout est bon.\n');
process.exit(echecs.length ? 1 : 0);
