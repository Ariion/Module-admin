#!/usr/bin/env node
/**
 * La portée « blocs » tient-elle sa promesse ?
 *
 *   npm run essai-portee
 *
 * C'est la promesse centrale du module : « sur les parties ajoutées
 * seulement — le code du client n'est pas touché ». Elle se vérifie mal à la
 * lecture, parce que ce qui la trahit n'est pas une règle qui repeint le
 * site : c'est une VARIABLE au nom courant, posée sur `:root`. Un site écrit
 * à la main en français a toutes les chances d'avoir son propre `--accent`,
 * et la feuille du module est injectée après la sienne.
 *
 * On mesure donc sur le site de démonstration du dépôt, qui définit ses
 * propres couleurs comme le ferait un vrai client.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

const serveur = createServer(async (req, res) => {
  const chemin = decodeURIComponent(req.url.split('?')[0]);
  try {
    const corps = await readFile(resolve(racine, '.' + chemin));
    res.writeHead(200, { 'content-type': TYPES[extname(chemin)] || 'application/octet-stream' });
    res.end(corps);
  } catch { res.writeHead(404).end('non'); }
});

const port = await new Promise((ok) => serveur.listen(0, () => ok(serveur.address().port)));
const base = `http://127.0.0.1:${port}`;

const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
const navigateur = await chromium.launch();
const echecs = [];
const dit = (nom, attendu, obtenu) => {
  const bon = String(attendu) === String(obtenu);
  if (!bon) echecs.push(nom);
  console.log(`  ${bon ? '✓' : '✗'} ${nom}${bon ? '' : ` — attendu ${attendu}, obtenu ${obtenu}`}`);
};

/**
 * Pose une ambiance sur une page et rend les variables demandées, lues sur
 * `:root` et dans une section du module.
 */
async function poser(page, themeId, portee, noms) {
  return page.evaluate(async ({ themeId, portee, noms }) => {
    const t = await import('/admin/core/theme.js');

    // Une section du module, pour vérifier que ses variables à lui restent
    // servies même quand on cesse de les poser sur la racine.
    let section = document.querySelector('[data-admin-section]');
    if (!section) {
      section = document.createElement('section');
      section.setAttribute('data-admin-section', 'essai');
      document.body.appendChild(section);
    }

    const lire = (el) => {
      const calcule = getComputedStyle(el);
      const sortie = {};
      for (const nom of noms) sortie[nom] = calcule.getPropertyValue(nom).trim();
      return sortie;
    };
    const avant = lire(document.documentElement);
    t.writeThemeSheet(document, { id: themeId, portee });
    return {
      posee: !!document.getElementById('admin-theme'),
      avant,
      racine: lire(document.documentElement),
      section: lire(section),
    };
  }, { themeId, portee, noms });
}

console.log('\nLa portée « blocs » ne prend rien au site du client\n');

// --- 1. Un site écrit à la main garde ses variables ------------------------
// La démonstration du dépôt définit --accent: #b1855b. C'est exactement le
// cas qu'on redoute : un nom courant, déjà pris.
{
  const page = await navigateur.newPage();
  await page.goto(base + '/demo/index.html');
  const lu = await poser(page, 'sobre', 'blocs', ['--accent', '--fond', '--encre']);
  await page.close();

  // Sans cette vérification, un identifiant d'ambiance mal orthographié
  // ferait passer tout le reste : la feuille ne serait simplement pas écrite.
  dit('la feuille du thème est bien posée', true, lu.posee);
  dit('le site garde son --accent', lu.avant['--accent'], lu.racine['--accent']);
  dit('la couleur du site est celle qu’il a écrite', '#b1855b', lu.racine['--accent']);
  dit('une section du module reçoit quand même la sienne', '#15181d', lu.section['--accent']);
}

// --- 2. En portée « site », le thème prend la main, et c'est le but --------
{
  const page = await navigateur.newPage();
  await page.goto(base + '/demo/index.html');
  const lu = await poser(page, 'sobre', 'site', ['--accent']);
  await page.close();
  dit('en portée « site », le thème remplace la couleur du site', '#15181d', lu.racine['--accent']);
}

// --- 3. La page de départ suit l'ambiance dans LES DEUX portées ------------
// Elle demande les variables du module par leur nom préfixé, avec sa propre
// valeur en repli : elle n'a plus besoin qu'on lui prenne les siennes.
for (const portee of ['site', 'blocs']) {
  const page = await navigateur.newPage();
  await page.goto(base + '/distribution/index.html');
  const lu = await poser(page, 'chaleureux', portee, ['--accent']);
  const attendu = await page.evaluate(async () => {
    const t = await import('/admin/core/theme.js');
    return t.themeById('chaleureux').couleurs.accent;
  });
  await page.close();
  dit(`la page de départ suit l’ambiance en portée « ${portee} »`, attendu, lu.racine['--accent']);
}

// --- 4. Sans ambiance, la page de départ garde ses propres couleurs --------
{
  const page = await navigateur.newPage();
  await page.goto(base + '/distribution/index.html');
  const seule = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  await page.close();
  dit('sans ambiance, le repli de la page de départ joue', '#15181d', seule);
}

await navigateur.close();
serveur.close();

console.log(echecs.length ? `\n${echecs.length} échec(s)\n` : '\nLa promesse tient.\n');
process.exit(echecs.length ? 1 : 0);
