#!/usr/bin/env node
/**
 * Éprouve ce qui borne le NOMBRE d'envois du formulaire.
 *
 *   node tools/essai-debit.mjs
 *
 * Deux choses à prouver, et la première est la plus facile à casser en
 * durcissant la seconde :
 *
 *   1. LE FORMULAIRE MARCHE ENCORE DANS UNE PAGE SANS LE MODULE. Avec relais
 *      comme sans. On ne relit pas le code : on fige réellement la page avec
 *      l'export — celui qui retire tout —, on la recharge dans un cadre où
 *      aucun fichier du module n'est chargé, et on appuie sur « Envoyer ».
 *
 *   2. LA TERMINAISON PHP COMPTE VRAIMENT. C'est le seul endroit du module
 *      qu'un inconnu peut appeler, et le seul qui sache limiter un débit —
 *      aucune règle Firestore ne compte. On la fait donc tourner pour de vrai
 *      sous `php -S`, avec un bouchon local à la place de Google, et on
 *      regarde ce qu'elle laisse passer. Relire un compteur ne prouve rien :
 *      un verrou de fichier mal posé ne se voit qu'à l'exécution.
 *
 * Rien ne part sur le réseau : Firestore et Firebase Auth sont bouchonnés, et
 * aucune clé n'est nécessaire pour faire tourner cet essai. PHP absent, la
 * partie 2 est annoncée comme non jouée plutôt que comptée verte.
 */
import { createServer } from 'node:http';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, resolve, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };

/** Où le formulaire croit écrire. Rien de tout ceci n'existe. */
const CIBLE = { projet: 'projet-essai', cle: 'cle-essai', site: 'site-essai', base: '(default)' };
const SITE_SERVEUR = 'site-du-serveur';

const echecs = [];
const dit = (nom, attendu, obtenu) => {
  const bon = String(attendu) === String(obtenu);
  if (!bon) echecs.push(`${nom} : attendu ${attendu}, obtenu ${obtenu}`);
  console.log(`  ${bon ? '✓' : '✗'} ${nom}${bon ? '' : ` — attendu ${attendu}, obtenu ${obtenu}`}`);
};

const dors = (ms) => new Promise((ok) => setTimeout(ok, ms));

// =====================================================================
//  1. La page publiée, module retiré
// =====================================================================

const PAGE = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>essai</title></head>
<body>
<h1 id="titre">Un site de démonstration</h1>
<script>window.ADMIN_CONFIG = { siteId: 'site-essai', backend: 'demo',
  firebase: { projectId: 'projet-essai', apiKey: 'cle-essai' } };</script>
<script type="module" src="/admin/runtime.js"></script>
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
const plantages = [];

/**
 * Publie un formulaire, fige la page comme le fait l'export, la recharge dans
 * un cadre qui ne connaît pas le module, et y envoie autant de fois qu'on le
 * demande.
 */
async function pageFigee(cible, envois = 1) {
  const page = await navigateur.newPage();
  page.on('pageerror', (err) => plantages.push(String(err?.message || err)));
  await page.goto(base + '/index.html');
  const lu = await page.evaluate(async ({ cible, envois }) => {
    const { PageModel } = await import('/admin/core/model.js');
    const { createWidget } = await import('/admin/core/widgets.js');
    const { freezePage } = await import('/admin/ui/export.js');

    const section = createWidget('section');
    section.children.push(createWidget('formulaire'));
    const instantane = {
      v: 1, content: {}, collections: {},
      sections: { add: [{ kind: 'widgets', key: 's1', after: null, tree: section }], hide: [], order: [] },
    };

    const cadre = document.createElement('iframe');
    cadre.style.cssText = 'width:900px;height:600px;border:0';
    cadre.src = '/index.html?admin-bake';
    document.body.appendChild(cadre);
    await new Promise((ok) => cadre.addEventListener('load', ok, { once: true }));
    const vierge = cadre.contentDocument;
    new PageModel({ doc: vierge, formulaire: cible }).refresh().applySnapshot(instantane);
    const fige = freezePage({ doc: vierge });

    // Le cadre qui ne connaît pas le module : pas de src, pas d'import, rien
    // que le HTML figé.
    const nu = document.createElement('iframe');
    nu.style.cssText = 'width:900px;height:600px;border:0';
    nu.setAttribute('srcdoc', fige);
    document.body.appendChild(nu);
    await new Promise((ok) => nu.addEventListener('load', ok, { once: true }));
    const sans = nu.contentDocument;

    const partis = [];
    nu.contentWindow.fetch = (url, init) => {
      partis.push({ url, init });
      return Promise.resolve({ ok: true, status: 200 });
    };

    const form = sans.querySelector('form[data-formulaire]');
    const etats = [];
    for (let i = 0; i < envois; i++) {
      form.querySelector('[name=nom]').value = 'Lucie Bernard';
      form.querySelector('[name=courriel]').value = 'lucie@exemple.fr';
      form.querySelector('[name=message]').value = 'Êtes-vous ouverts le 14 ?';
      form.requestSubmit();
      await new Promise((ok) => setTimeout(ok, 80));
      etats.push(sans.querySelector('[data-formulaire-etat]').textContent);
    }

    return {
      relais: form.getAttribute('data-formulaire-relais') || '',
      projet: form.getAttribute('data-formulaire-projet') || '',
      cle: form.getAttribute('data-formulaire-cle') || '',
      scripts: sans.querySelectorAll('script').length,
      partis: partis.length,
      url: partis[0]?.url || '',
      corps: partis[0] ? partis[0].init.body : '',
      etats,
      titreIntact: !!sans.querySelector('#titre'),
    };
  }, { cible, envois });
  await page.close();
  return lu;
}

console.log('\nCe qui borne le nombre d’envois du formulaire\n');

console.log('Sans relais : la page figée écrit toujours dans Firestore');
{
  const lu = await pageFigee(CIBLE);
  dit('la destination Firestore est dans le HTML', 'projet-essai', lu.projet);
  dit('aucun relais n’y figure', '', lu.relais);
  dit('une seule balise de script : celle de l’envoi', 1, lu.scripts);
  dit('l’envoi part', 1, lu.partis);
  dit('vers l’API REST de Firestore', true, lu.url.startsWith('https://firestore.googleapis.com/v1/'));
  dit('avec un document typé Firestore', true, /"stringValue"/.test(lu.corps));
  dit('le remerciement s’affiche', true, /Merci/.test(lu.etats[0]));
  dit('la page du développeur est intacte', true, lu.titreIntact);
}

console.log('\nAvec relais : la page figée écrit chez l’hébergeur du client');
{
  const lu = await pageFigee({ ...CIBLE, relais: '/admin-endpoint.php?action=message' });
  dit('le relais est dans le HTML', '/admin-endpoint.php?action=message', lu.relais);
  // Le point qui compte : une page qui porterait les deux offrirait au premier
  // curieux le chemin court, celui qui ne passe pas par le comptage.
  dit('la destination Firestore n’y est plus', '', lu.projet);
  dit('ni la clé', '', lu.cle);
  dit('une seule balise de script, toujours', 1, lu.scripts);
  dit('l’envoi part vers le relais', '/admin-endpoint.php?action=message', lu.url);
  dit('avec la saisie à plat, pas un document Firestore', false, /"stringValue"/.test(lu.corps));
  const envoye = JSON.parse(lu.corps);
  dit('huit clés, celles que le relais attend',
    'cases,courriel,formulaire,liste,message,nom,page,telephone',
    Object.keys(envoye).sort().join(','));
  dit('ni l’état de lecture ni l’horodatage : le serveur les pose',
    false, 'lu' in envoye || 'envoye' in envoye);
  dit('le nom saisi', 'Lucie Bernard', envoye.nom);
  dit('le remerciement s’affiche', true, /Merci/.test(lu.etats[0]));
  dit('la page du développeur est intacte', true, lu.titreIntact);
}

// Le repos posé après un envoi réussi. Il ne protège de rien — un envoi
// fabriqué hors de la page ne passe pas par là — mais il évite qu'un double
// clic, ou une boucle posée sur le bouton, remplisse la boîte.
console.log('\nLe repos après un envoi réussi');
{
  const lu = await pageFigee(CIBLE, 3);
  dit('trois envois demandés, un seul parti', 1, lu.partis);
  dit('et le visiteur relit son remerciement', true, /Merci/.test(lu.etats[2]));
}

console.log('\nL’appât');
{
  const page = await navigateur.newPage();
  page.on('pageerror', (err) => plantages.push(String(err?.message || err)));
  await page.goto(base + '/index.html');
  const lu = await page.evaluate(async (cible) => {
    const { createWidget, renderWidget } = await import('/admin/core/widgets.js');
    const { writeFormulaireScript } = await import('/admin/core/formulaire.js');
    const noeud = createWidget('formulaire');
    document.body.appendChild(renderWidget(noeud, document, { formulaire: cible }));
    writeFormulaireScript(document, true);
    const partis = [];
    window.fetch = (url, init) => { partis.push({ url, init }); return Promise.resolve({ ok: true }); };

    const form = document.querySelector('form[data-formulaire]');
    form.querySelector('[name=nom]').value = 'Robot';
    form.querySelector('[name=courriel]').value = 'robot@exemple.fr';
    form.querySelector('[name=message]').value = 'tout ce qui traîne';
    form.querySelector('[name="_"]').value = 'rempli aussi';
    form.requestSubmit();
    await new Promise((ok) => setTimeout(ok, 80));
    return {
      partis: partis.length,
      cache: getComputedStyle(form.querySelector('[name="_"]')).position,
      etat: document.querySelector('[data-formulaire-etat]').textContent,
    };
  }, CIBLE);
  await page.close();
  dit('l’appât est hors de l’écran', 'absolute', lu.cache);
  dit('rempli, rien n’est écrit', 0, lu.partis);
  // On répond « merci » exprès : un robot à qui l'on dit non revient.
  dit('et le robot croit avoir réussi', true, /Merci/.test(lu.etat));
}

dit('aucune exception dans la page', '', plantages.join(' | '));

await navigateur.close();
serveur.close();

// =====================================================================
//  2. La terminaison PHP, pour de vrai
// =====================================================================

/** Le bouchon qui tient la place de Firestore et de Firebase Auth. */
function bouchon() {
  const recus = [];
  const app = createServer((req, res) => {
    let corps = '';
    req.on('data', (bout) => { corps += bout; });
    req.on('end', () => {
      recus.push({ url: req.url, entetes: req.headers, corps });
      res.writeHead(200, { 'content-type': 'application/json' });
      if (req.url.includes('signInWithPassword')) {
        return res.end(JSON.stringify({ idToken: 'jeton-du-facteur', expiresIn: '3600' }));
      }
      res.end(JSON.stringify({ name: 'projects/p/databases/(default)/documents/x/y' }));
    });
  });
  return { app, recus };
}

/**
 * Installe `admin-endpoint.php` dans un dossier neuf, réglé comme demandé, et
 * le sert avec le serveur intégré de PHP. On copie plutôt que de modifier le
 * fichier du dépôt : c'est bien celui qui sera livré que l'on éprouve.
 */
async function terminaison(hoteBouchon, reglages) {
  const dossier = await mkdtemp(join(tmpdir(), 'essai-debit-'));
  let source = await readFile(resolve(racine, 'tools/admin-endpoint.php'), 'utf8');
  const poser = (nom, valeur) => {
    const motif = new RegExp(`^(\\$${nom}\\s*=\\s*)[^;]+;`, 'm');
    if (!motif.test(source)) throw new Error(`réglage introuvable dans admin-endpoint.php : ${nom}`);
    source = source.replace(motif, `$1${valeur};`);
  };
  poser('PROJECT_ID', "'projet-du-serveur'");
  poser('CONTACT_ACTIF', reglages.actif ?? 'true');
  poser('CONTACT_SITE_ID', `'${SITE_SERVEUR}'`);
  poser('CONTACT_CLE_API', "'cle-du-serveur'");
  poser('CONTACT_FACTEUR', "'facteur@exemple.fr'");
  poser('CONTACT_MOT_DE_PASSE', "'mot-de-passe'");
  poser('CONTACT_MAX_HEURE_IP', String(reglages.heure ?? 2));
  poser('CONTACT_MAX_JOUR_IP', String(reglages.jour ?? 5));
  poser('CONTACT_MAX_JOUR_SITE', String(reglages.site ?? 50));
  poser('CONTACT_DOSSIER', `'${dossier}'`);
  poser('CONTACT_HOTE_FIRESTORE', `'${hoteBouchon}'`);
  poser('CONTACT_HOTE_AUTH', `'${hoteBouchon}'`);
  await writeFile(join(dossier, 'admin-endpoint.php'), source);

  // Sans mandataire : le bouchon est sur la boucle locale, et curl suivrait un
  // http_proxy hérité de l'environnement.
  const env = { ...process.env, NO_PROXY: '127.0.0.1,localhost', no_proxy: '127.0.0.1,localhost' };
  for (const cle of Object.keys(env)) {
    if (/^(https?_proxy|all_proxy)$/i.test(cle)) delete env[cle];
  }
  const libre = await new Promise((ok) => {
    const s = createServer();
    s.listen(0, () => { const p = s.address().port; s.close(() => ok(p)); });
  });
  const php = spawn('php', ['-S', `127.0.0.1:${libre}`, '-t', dossier], { env, stdio: 'ignore' });
  const url = `http://127.0.0.1:${libre}/admin-endpoint.php?action=message`;
  for (let i = 0; i < 80; i++) {
    const debout = await fetch(url, { method: 'HEAD' }).then(() => true).catch(() => false);
    if (debout) break;
    await dors(50);
  }
  return {
    url,
    arreter: async () => { php.kill(); await rm(dossier, { recursive: true, force: true }); },
  };
}

/** Un envoi vers la terminaison, tel que la page publiée l'écrit. */
function envoyer(url, corps, entetes = {}) {
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1', ...entetes },
    body: JSON.stringify(corps),
  });
}

const message = (extra = {}) => ({
  page: '/contact.html', formulaire: 'f1', nom: 'Camille Rey',
  courriel: 'camille@exemple.fr', telephone: '', message: 'Bonjour, un devis ?',
  cases: '', liste: '', ...extra,
});

const phpPresent = await new Promise((ok) => {
  const essai = spawn('php', ['-v'], { stdio: 'ignore' });
  essai.on('error', () => ok(false));
  essai.on('exit', (code) => ok(code === 0));
});

if (!phpPresent) {
  console.log('\nLa terminaison PHP n’a PAS été éprouvée : php est absent de cette machine.');
  console.log('Installez php-cli et relancez — la partie 2 de cet essai ne prouve rien sans lui.');
} else {
  const { app, recus } = bouchon();
  const portBouchon = await new Promise((ok) => app.listen(0, () => ok(app.address().port)));
  const hoteBouchon = `http://127.0.0.1:${portBouchon}`;

  console.log('\nLa terminaison PHP : ce qu’elle refuse d’emblée');
  {
    const t = await terminaison(hoteBouchon, {});
    const avant = recus.length;
    const sansEntete = await fetch(t.url, { method: 'POST', body: '{}' });
    dit('un envoi sans origine ni référent est refusé', 403, sansEntete.status);
    const enGet = await fetch(t.url, { headers: { origin: 'http://127.0.0.1' } });
    dit('un GET est refusé', 405, enGet.status);
    const ailleurs = await envoyer(t.url, message(), { origin: 'https://ailleurs.example' });
    dit('une origine étrangère est refusée', 403, ailleurs.status);
    const vide = await envoyer(t.url, message({ nom: '', courriel: '', telephone: '', message: '' }));
    dit('un message vide de sens est refusé', 400, vide.status);
    const illisible = await fetch(t.url, {
      method: 'POST', headers: { origin: 'http://127.0.0.1' }, body: 'pas du json',
    });
    dit('un corps illisible est refusé', 400, illisible.status);
    dit('et rien de tout cela n’est arrivé dans la base', 0, recus.length - avant);
    await t.arreter();
  }

  console.log('\nCe qu’elle dépose, et sous quel compte');
  {
    const t = await terminaison(hoteBouchon, {});
    const avant = recus.length;
    const reponse = await envoyer(t.url, message({
      // Ce que la requête raconte sur la destination ne doit servir à rien.
      site: 'site-dun-autre', siteId: 'site-dun-autre', lu: true,
      envoye: 32503680000000, vecteur: 'une clé inventée',
      message: 'z'.repeat(6000),
    }));
    dit('l’envoi est accepté', 200, reponse.status);
    const auth = recus.find((r) => r.url.includes('signInWithPassword'));
    const depot = recus.slice(avant).find((r) => r.url.includes('/messages'));
    dit('le compte du facteur a été ouvert', true, !!auth);
    dit('avec l’adresse réglée sur le serveur', true, !!auth
      && JSON.parse(auth.corps).email === 'facteur@exemple.fr');
    dit('le message est déposé', true, !!depot);
    dit('dans le site réglé sur le SERVEUR, pas celui annoncé', true,
      !!depot && depot.url.includes(`/sites/${SITE_SERVEUR}/messages`));
    dit('dans le projet réglé sur le serveur', true, !!depot && depot.url.includes('/projects/projet-du-serveur/'));
    dit('sous le jeton du facteur', 'Bearer jeton-du-facteur', depot?.entetes?.authorization);
    const champs = JSON.parse(depot.corps).fields;
    dit('dix clés, exactement celles que les règles acceptent',
      'cases,courriel,envoye,formulaire,liste,lu,message,nom,page,telephone',
      Object.keys(champs).sort().join(','));
    dit('la clé inventée a été jetée', false, 'vecteur' in champs);
    dit('le message n’arrive pas déjà lu', false, champs.lu.booleanValue);
    // L'horodatage du serveur : c'est même un progrès sur le dépôt direct, où
    // l'horloge du visiteur pouvait faire refuser son message.
    dit('l’horodatage est celui du serveur, pas celui annoncé', true,
      Math.abs(Number(champs.envoye.integerValue) - Date.now()) < 10000);
    dit('un message trop long arrive tronqué, pas perdu', 5000, champs.message.stringValue.length);

    const appat = await envoyer(t.url, message({ _: 'rempli par un robot' }));
    dit('l’appât rempli reçoit un « reçu »', 200, appat.status);
    dit('et rien n’est déposé', 1, recus.slice(avant).filter((r) => r.url.includes('/messages')).length);
    await t.arreter();
  }

  console.log('\nEt ce qu’elle compte');
  {
    const t = await terminaison(hoteBouchon, { heure: 2, jour: 5, site: 50 });
    const avant = recus.length;
    const un = await envoyer(t.url, message());
    const deux = await envoyer(t.url, message());
    const trois = await envoyer(t.url, message());
    dit('le premier envoi passe', 200, un.status);
    dit('le deuxième aussi', 200, deux.status);
    dit('le troisième de la même adresse dans l’heure est refusé', 429, trois.status);
    dit('et la borne atteinte est nommée', 'ip-heure', (await trois.json()).borne);
    dit('deux messages déposés, pas trois', 2,
      recus.slice(avant).filter((r) => r.url.includes('/messages')).length);
    await t.arreter();
  }

  // Le plafond du site est le seul qui tienne quand l'attaque arrive de mille
  // adresses : on éteint donc les bornes par adresse pour l'éprouver seul.
  console.log('\nLe plafond du site, celui qui protège la facture');
  {
    const t = await terminaison(hoteBouchon, { heure: 0, jour: 0, site: 2 });
    const avant = recus.length;
    await envoyer(t.url, message());
    await envoyer(t.url, message());
    const trop = await envoyer(t.url, message());
    dit('le troisième envoi du jour est refusé', 429, trop.status);
    dit('et c’est bien le plafond du site qui a parlé', 'site-jour', (await trop.json()).borne);
    dit('deux messages déposés, pas trois', 2,
      recus.slice(avant).filter((r) => r.url.includes('/messages')).length);
    await t.arreter();
  }

  console.log('\nLa terminaison éteinte');
  {
    const t = await terminaison(hoteBouchon, { actif: 'false' });
    const avant = recus.length;
    const reponse = await envoyer(t.url, message());
    dit('elle le dit au lieu de faire semblant', 501, reponse.status);
    dit('et n’écrit rien', 0, recus.length - avant);
    await t.arreter();
  }

  app.close();
}

console.log(echecs.length ? `\n${echecs.length} échec(s)\n` : '\nTout est bon.\n');
process.exit(echecs.length ? 1 : 0);
