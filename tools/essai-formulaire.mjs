#!/usr/bin/env node
/**
 * Éprouve le formulaire de contact dans un vrai navigateur.
 *
 *   node tools/essai-formulaire.mjs
 *
 * Le point à prouver tient en une phrase : le formulaire doit continuer à
 * envoyer DEPUIS UNE PAGE OÙ LE MODULE N'EXISTE PLUS. Tout le reste du
 * contenu publié se passe de script — un titre figé dans le HTML est un
 * titre. Un formulaire, lui, a besoin de quelqu'un pour porter l'envoi, et ce
 * quelqu'un doit tenir dans la page.
 *
 * On ne relit donc pas le code : on fige réellement la page avec l'export du
 * module — celui qui retire tout —, on la recharge dans un cadre où aucun
 * fichier du module n'est chargé, et on y appuie sur « Envoyer ».
 *
 * Firestore est bouchonné : aucun essai ne part sur le réseau, et aucune
 * clé n'est nécessaire pour faire tourner ce test.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };

/** Où le formulaire croit écrire. Rien de tout ceci n'existe. */
const CIBLE = { projet: 'projet-essai', cle: 'cle-essai', site: 'site-essai', base: '(default)' };

const URL_ATTENDUE = 'https://firestore.googleapis.com/v1/projects/projet-essai'
  + '/databases/(default)/documents/sites/site-essai/messages?key=cle-essai';

/**
 * La page d'essai est intégrée comme un vrai site : la configuration, puis le
 * runtime. C'est ce qui donne du sens à l'épreuve de la page figée — il y a
 * bien quelque chose à retirer. Le back-end « demo » garde tout en local :
 * le runtime ne demande rien au réseau.
 */
const PAGE = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>essai</title>
<style>body { font: 16px system-ui } form { max-width: 40em }</style></head>
<body>
<h1 id="titre">Un site de démonstration</h1>
<p>Un paragraphe écrit par le développeur.</p>
<form id="sien" action="/cherche" method="get"><input type="search" name="q"><button>Chercher</button></form>
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
const echecs = [];
const dit = (nom, attendu, obtenu) => {
  const bon = String(attendu) === String(obtenu);
  if (!bon) echecs.push(`${nom} : attendu ${attendu}, obtenu ${obtenu}`);
  console.log(`  ${bon ? '✓' : '✗'} ${nom}${bon ? '' : ` — attendu ${attendu}, obtenu ${obtenu}`}`);
};

// Une exception non rattrapée dans la page est un échec en soi : la règle du
// module est que le site ne casse jamais, quoi qu'il arrive à l'envoi.
const plantages = [];

/**
 * Ouvre la page d'essai, y pose un formulaire réglé comme demandé, arme le
 * script d'envoi et bouchonne Firestore.
 *
 * `window.panne` décide de ce que répond le bouchon : rien (succès), 'refus'
 * (la base répond non — règles, quota) ou 'rejet' (le réseau est coupé).
 */
async function scene(props = {}) {
  const page = await navigateur.newPage({ viewport: { width: 1100, height: 800 } });
  page.on('pageerror', (err) => plantages.push(String(err?.message || err)));
  await page.goto(base + '/index.html');
  await page.evaluate(async ({ props, CIBLE }) => {
    const { createWidget, renderWidget } = await import('/admin/core/widgets.js');
    const { writeFormulaireScript } = await import('/admin/core/formulaire.js');
    const noeud = createWidget('formulaire');
    Object.assign(noeud.props, props);
    document.body.appendChild(renderWidget(noeud, document, { formulaire: CIBLE }));
    writeFormulaireScript(document, true);

    window.envois = [];
    window.panne = null;
    window.fetch = (url, init) => {
      window.envois.push({ url, init });
      if (window.panne === 'rejet') return Promise.reject(new Error('réseau coupé'));
      if (window.panne === 'refus') return Promise.resolve({ ok: false, status: 403 });
      return Promise.resolve({ ok: true, status: 200 });
    };
  }, { props, CIBLE });
  return page;
}

console.log('\nFormulaire de contact\n');

// --- 1. Le formulaire se rend, et se règle -----------------------------
console.log('Le rendu, et ce que les réglages y changent');
{
  const page = await navigateur.newPage();
  await page.goto(base + '/index.html');
  const lu = await page.evaluate(async (CIBLE) => {
    const { createWidget, renderWidget } = await import('/admin/core/widgets.js');
    const lire = (props) => {
      const noeud = createWidget('formulaire');
      Object.assign(noeud.props, props);
      const el = renderWidget(noeud, document, { formulaire: CIBLE });
      const noms = (selecteur) => [...el.querySelectorAll(selecteur)]
        .map((c) => c.getAttribute('name')).filter((n) => n !== '_').join(',');
      return {
        champs: noms('[name]'),
        requis: noms('[required]'),
        appat: el.querySelectorAll('[name="_"]').length,
        bouton: el.querySelector('button[type=submit]').textContent,
        classes: el.className,
        balises: [...el.querySelectorAll('*')].map((n) => n.tagName.toLowerCase()).join(','),
        projet: el.getAttribute('data-formulaire-projet'),
        site: el.getAttribute('data-formulaire-site'),
        cases: el.querySelectorAll('fieldset input[type=checkbox]').length,
        legende: el.querySelector('legend')?.textContent || '',
        options: el.querySelectorAll('select option').length,
        libelles: [...el.querySelectorAll('label')].map((l) => l.textContent.trim()).join('|'),
      };
    };
    return {
      defaut: lire({}),
      regle: lire({
        nom: 'absent', telephone: 'obligatoire', nomLibelle: 'Nom',
        cases: 'facultatif', casesOptions: 'Être rappelé\nRecevoir la brochure\nAutre',
        liste: 'facultatif', listeOptions: 'Un devis\nUne question',
        bouton: 'Nous écrire', courrielLibelle: 'Votre e-mail',
      }),
    };
  }, CIBLE);
  await page.close();

  dit('les trois champs utiles sont posés', 'nom,courriel,message', lu.defaut.champs);
  dit('et ils sont obligatoires', 'nom,courriel,message', lu.defaut.requis);
  dit('un appât attend les robots', 1, lu.defaut.appat);
  dit('le bouton porte son texte', 'Envoyer', lu.defaut.bouton);
  // La règle de tous les éléments du module : du HTML sémantique, sans classes,
  // pour que la feuille du site s'y applique d'elle-même.
  dit('aucune classe sur le formulaire', '', lu.defaut.classes);
  dit('aucune classe dans le balisage', false, /class=/.test(lu.defaut.balises));
  dit('la destination est inscrite dans le HTML', 'projet-essai', lu.defaut.projet);
  dit('le site aussi', 'site-essai', lu.defaut.site);

  dit('un champ retiré disparaît', false, lu.regle.champs.includes('nom'));
  dit('un champ ajouté apparaît', true, lu.regle.champs.includes('telephone'));
  dit('et il est obligatoire', true, lu.regle.requis.includes('telephone'));
  dit('un champ facultatif ne l’est pas', false, lu.regle.requis.includes('liste'));
  dit('les cases à cocher sont là', 3, lu.regle.cases);
  dit('le groupe de cases porte sa légende', 'Je souhaite', lu.regle.legende);
  // Une ligne vide en plus des deux choix : sans elle, « Un devis » serait la
  // réponse de qui n'a rien choisi.
  dit('la liste déroulante ouvre sur un choix vide', 3, lu.regle.options);
  dit('le libellé réglé s’affiche', true, lu.regle.libelles.includes('Votre e-mail'));
  dit('le texte du bouton suit', 'Nous écrire', lu.regle.bouton);
}

// --- 2. La validation refuse un envoi incomplet ------------------------
// C'est celle du navigateur (`required`, `type=email`) : traduite dans la
// langue du visiteur, et debout avant qu'aucun script ne soit chargé.
console.log('\nUn envoi incomplet');
{
  const page = await scene();
  const lu = await page.evaluate(async () => {
    const form = document.querySelector('form[data-formulaire]');
    form.querySelector('[name=nom]').value = 'Camille Rey';
    form.querySelector('[name=courriel]').value = 'pas-une-adresse';
    form.requestSubmit();
    await new Promise((ok) => setTimeout(ok, 60));
    const adresseSeule = form.querySelector('[name=courriel]').checkValidity();
    form.querySelector('[name=courriel]').value = 'camille@exemple.fr';
    form.requestSubmit();
    await new Promise((ok) => setTimeout(ok, 60));
    return {
      valide: form.checkValidity(),
      adresseSeule,
      envois: window.envois.length,
      etatCache: document.querySelector('[data-formulaire-etat]').hidden,
      manquant: form.querySelector('[name=message]').validity.valueMissing,
    };
  });
  await page.close();
  dit('une adresse qui n’en est pas est refusée', false, lu.adresseSeule);
  dit('le formulaire reste invalide', false, lu.valide);
  dit('rien n’est parti', 0, lu.envois);
  dit('aucun remerciement affiché', true, lu.etatCache);
  dit('le navigateur désigne le champ resté vide', true, lu.manquant);
}

// --- 3. Ce qui part, et où ---------------------------------------------
console.log('\nUn envoi complet');
{
  const page = await scene({
    telephone: 'facultatif',
    cases: 'facultatif', casesOptions: 'Être rappelé\nRecevoir la brochure',
    liste: 'facultatif', listeOptions: 'Un devis\nUne question',
  });
  const lu = await page.evaluate(async () => {
    const form = document.querySelector('form[data-formulaire]');
    const avant = document.body.children.length;
    form.querySelector('[name=nom]').value = 'Camille Rey';
    form.querySelector('[name=courriel]').value = 'camille@exemple.fr';
    form.querySelector('[name=telephone]').value = '06 12 34 56 78';
    form.querySelector('[name=message]').value = 'Bonjour,\nvos tarifs pour juin ?';
    const cases = form.querySelectorAll('[name=cases]');
    cases[0].checked = true;
    cases[1].checked = true;
    form.querySelector('[name=liste]').value = 'Un devis';
    form.requestSubmit();
    await new Promise((ok) => setTimeout(ok, 80));

    const envoi = window.envois[0] || {};
    const corps = envoi.init ? JSON.parse(envoi.init.body) : { fields: {} };
    const etat = document.querySelector('[data-formulaire-etat]');
    return {
      nombre: window.envois.length,
      url: envoi.url,
      methode: envoi.init?.method,
      identifiants: envoi.init?.credentials,
      cles: Object.keys(corps.fields).sort().join(','),
      nom: corps.fields.nom?.stringValue,
      courriel: corps.fields.courriel?.stringValue,
      message: corps.fields.message?.stringValue,
      cases: corps.fields.cases?.stringValue,
      liste: corps.fields.liste?.stringValue,
      page: corps.fields.page?.stringValue,
      lu: corps.fields.lu?.booleanValue,
      ecart: Math.abs(Number(corps.fields.envoye?.integerValue) - Date.now()),
      merci: etat.textContent,
      etatVisible: !etat.hidden,
      marque: etat.getAttribute('data-formulaire-etat'),
      videApres: form.querySelector('[name=nom]').value,
      boutonRendu: !form.querySelector('button[type=submit]').disabled,
      corpsIntact: document.body.children.length === avant,
    };
  });
  await page.close();

  dit('une seule requête', 1, lu.nombre);
  dit('vers la boîte du site, par l’API REST', URL_ATTENDUE, lu.url);
  dit('en création', 'POST', lu.methode);
  // Pas de cookie : le document est créé par un visiteur anonyme, et c'est la
  // règle Firestore qui décide, pas une session.
  dit('sans identifiants', 'omit', lu.identifiants);
  dit('dix clés, exactement celles que les règles acceptent',
    'cases,courriel,envoye,formulaire,liste,lu,message,nom,page,telephone', lu.cles);
  dit('le nom', 'Camille Rey', lu.nom);
  dit('l’adresse', 'camille@exemple.fr', lu.courriel);
  dit('le message, retours à la ligne compris', true, lu.message.includes('\n'));
  dit('les cases cochées, réunies en une chaîne', 'Être rappelé, Recevoir la brochure', lu.cases);
  dit('le choix de la liste', 'Un devis', lu.liste);
  dit('la page d’où part le message', '/index.html', lu.page);
  dit('le message n’arrive pas déjà lu', false, lu.lu);
  dit('l’horodatage est celui de maintenant', true, lu.ecart < 5000);

  dit('le remerciement s’affiche', true, lu.etatVisible);
  dit('et c’est celui réglé', true, /Merci/.test(lu.merci));
  dit('marqué comme une réussite', 'ok', lu.marque);
  dit('les champs sont vidés', '', lu.videApres);
  dit('le bouton est rendu', true, lu.boutonRendu);
  dit('la page n’a pas bougé', true, lu.corpsIntact);
}

// --- 4. Les formulaires du développeur ne sont pas détournés -----------
// Le module ne prend la main que sur les siens : une recherche ou une
// inscription écrite à la main doit continuer de partir où elle allait.
console.log('\nLe formulaire écrit par le développeur');
{
  const page = await scene();
  const lu = await page.evaluate(async () => {
    const sien = document.querySelector('#sien');
    const evenement = new Event('submit', { bubbles: true, cancelable: true });
    sien.dispatchEvent(evenement);
    await new Promise((ok) => setTimeout(ok, 30));
    return { empeche: evenement.defaultPrevented, envois: window.envois.length };
  });
  await page.close();
  dit('son envoi n’est pas intercepté', false, lu.empeche);
  dit('et rien n’est écrit dans la base', 0, lu.envois);
}

// --- 5. Dans une page régénérée, sans le module ------------------------
// Le test le plus important, et le seul qui dise quelque chose du produit :
// on publie, on fige la page comme le fait l'export — qui retire TOUT ce que
// le module y a laissé —, on la recharge dans un cadre qui ne charge aucun
// fichier du module, et on envoie.
console.log('\nUne page figée, d’où le module a été retiré');
{
  const page = await navigateur.newPage();
  page.on('pageerror', (err) => plantages.push(String(err?.message || err)));
  await page.goto(base + '/index.html');
  const lu = await page.evaluate(async (CIBLE) => {
    const { PageModel } = await import('/admin/core/model.js');
    const { createWidget } = await import('/admin/core/widgets.js');
    const { FORMULAIRE_SCRIPT_ID } = await import('/admin/core/formulaire.js');
    const { freezePage } = await import('/admin/ui/export.js');

    // Un instantané publié, tel que la régénération du HTML en reçoit un.
    const section = createWidget('section');
    const formulaire = createWidget('formulaire');
    section.children.push(formulaire);
    const instantane = {
      v: 1, content: {}, collections: {},
      sections: { add: [{ kind: 'widgets', key: 's1', after: null, tree: section }], hide: [], order: [] },
    };

    // Une source vierge, module neutralisé : c'est exactement ce que charge
    // `bakePage` avant d'appliquer l'instantané.
    const cadre = document.createElement('iframe');
    cadre.style.cssText = 'width:900px;height:600px;border:0';
    cadre.src = '/index.html?admin-bake';
    document.body.appendChild(cadre);
    await new Promise((ok) => cadre.addEventListener('load', ok, { once: true }));
    const vierge = cadre.contentDocument;

    const modele = new PageModel({ doc: vierge, formulaire: CIBLE }).refresh();
    modele.applySnapshot(instantane);

    const script = vierge.getElementById(FORMULAIRE_SCRIPT_ID);
    const fige = freezePage({ doc: vierge });

    // Le cadre qui ne connaît pas le module : pas de src, pas d'import, rien
    // que le HTML figé.
    const nu = document.createElement('iframe');
    nu.style.cssText = 'width:900px;height:600px;border:0';
    nu.setAttribute('srcdoc', fige);
    document.body.appendChild(nu);
    await new Promise((ok) => nu.addEventListener('load', ok, { once: true }));
    const sans = nu.contentDocument;

    // Firestore bouchonné DANS le cadre nu.
    const envois = [];
    nu.contentWindow.fetch = (url, init) => {
      envois.push({ url, init });
      return Promise.resolve({ ok: true, status: 200 });
    };

    const form = sans.querySelector('form[data-formulaire]');
    form.querySelector('[name=nom]').value = 'Lucie Bernard';
    form.querySelector('[name=courriel]').value = 'lucie@exemple.fr';
    form.querySelector('[name=message]').value = 'Êtes-vous ouverts le 14 ?';
    form.requestSubmit();
    await new Promise((ok) => setTimeout(ok, 80));

    const corps = envois[0] ? JSON.parse(envois[0].init.body) : { fields: {} };
    return {
      // Après régénération, sur la source vierge
      formulaireApplique: !!vierge.querySelector('form[data-formulaire]'),
      scriptPose: !!script,
      scriptSurvit: script ? !script.hasAttribute('data-admin-ui') : false,
      // Ce que contient la page figée
      resteDuModule: /admin\/runtime|admin-config|ADMIN_CONFIG/.test(fige) ? 'oui' : 'non',
      scriptsRestants: sans.querySelectorAll('script').length,
      attributsAdmin: sans.querySelectorAll('[data-admin-section], [data-admin-widget]').length,
      destinationGardee: form.getAttribute('data-formulaire-projet'),
      // Et l'envoi, depuis cette page-là
      envois: envois.length,
      url: envois[0]?.url,
      nom: corps.fields.nom?.stringValue,
      merci: sans.querySelector('[data-formulaire-etat]').textContent,
      pageIntacte: !!sans.querySelector('#titre'),
    };
  }, CIBLE);
  await page.close();

  dit('l’instantané publié repose le formulaire', true, lu.formulaireApplique);
  dit('et le script d’envoi avec lui', true, lu.scriptPose);
  dit('la régénération du HTML ne l’effacera pas', true, lu.scriptSurvit);
  dit('la page figée ne garde aucun fichier du module', 'non', lu.resteDuModule);
  dit('une seule balise de script : celle de l’envoi', 1, lu.scriptsRestants);
  dit('aucun attribut du module', 0, lu.attributsAdmin);
  dit('la destination, elle, est restée', 'projet-essai', lu.destinationGardee);
  dit('l’envoi part de cette page-là', 1, lu.envois);
  dit('vers la même boîte', URL_ATTENDUE, lu.url);
  dit('avec ce qui a été saisi', 'Lucie Bernard', lu.nom);
  dit('et le remerciement s’affiche', true, /Merci/.test(lu.merci));
  dit('le reste de la page est intact', true, lu.pageIntacte);
}

// --- 6. Quand la base ne répond pas -----------------------------------
// La règle du module : si quoi que ce soit échoue, la page reste celle que le
// développeur a écrite. Un formulaire ne fait pas exception — et le visiteur
// doit lire une phrase, pas rester devant un bouton mort.
console.log('\nQuand Firestore ne répond pas');
for (const [panne, nom] of [['rejet', 'le réseau est coupé'], ['refus', 'la base refuse (403)']]) {
  const page = await scene();
  const lu = await page.evaluate(async (panne) => {
    const form = document.querySelector('form[data-formulaire]');
    const avant = document.body.children.length;
    window.panne = panne;
    form.querySelector('[name=nom]').value = 'Camille Rey';
    form.querySelector('[name=courriel]').value = 'camille@exemple.fr';
    form.querySelector('[name=message]').value = 'Bonjour';
    form.requestSubmit();
    await new Promise((ok) => setTimeout(ok, 80));
    const etat = document.querySelector('[data-formulaire-etat]');
    return {
      message: etat.textContent,
      marque: etat.getAttribute('data-formulaire-etat'),
      bouton: !form.querySelector('button[type=submit]').disabled,
      garde: form.querySelector('[name=message]').value,
      titre: document.querySelector('#titre')?.textContent || '',
      corpsIntact: document.body.children.length === avant,
    };
  }, panne);
  await page.close();
  console.log(`  — ${nom}`);
  dit('une phrase lisible s’affiche', true, /n’a pas abouti/.test(lu.message));
  dit('marquée comme un échec', 'ko', lu.marque);
  dit('le bouton redevient cliquable', true, lu.bouton);
  // Ce qu'on a écrit ne doit pas disparaître : on va réessayer.
  dit('la saisie est conservée', 'Bonjour', lu.garde);
  dit('la page du développeur est intacte', 'Un site de démonstration', lu.titre);
  dit('et rien n’a bougé dans le corps', true, lu.corpsIntact);
}

// --- 7. Une page sans formulaire n'emporte pas de script ---------------
console.log('\nUne page sans formulaire');
{
  const page = await navigateur.newPage();
  await page.goto(base + '/index.html');
  const lu = await page.evaluate(async () => {
    const { PageModel } = await import('/admin/core/model.js');
    const { createWidget } = await import('/admin/core/widgets.js');
    const { FORMULAIRE_SCRIPT_ID } = await import('/admin/core/formulaire.js');
    const section = createWidget('section');
    section.children.push(createWidget('heading'));
    const modele = new PageModel({ doc: document }).refresh();
    modele.applySnapshot({
      v: 1, content: {}, collections: {},
      sections: { add: [{ kind: 'widgets', key: 's1', after: null, tree: section }], hide: [], order: [] },
    });
    return { script: !!document.getElementById(FORMULAIRE_SCRIPT_ID) };
  });
  await page.close();
  dit('aucun script inutile dans la page', false, lu.script);
}

// --- 8. La boîte de réception -----------------------------------------
// L'écran ne sait faire que quatre choses : lister, lire, marquer lu,
// supprimer. On les fait toutes, et on vérifie surtout qu'un message écrit
// par un inconnu ne devient jamais du HTML.
console.log('\nLa boîte de réception');
{
  const page = await navigateur.newPage();
  page.on('pageerror', (err) => plantages.push(String(err?.message || err)));
  await page.goto(base + '/index.html');
  const lu = await page.evaluate(async () => {
    const { creerMessages } = await import('/admin/ui/back/messages.js');
    const { createTranslator } = await import('/admin/ui/i18n.js');
    const pause = () => new Promise((ok) => setTimeout(ok, 40));

    let boite = [
      { id: 'm1', nom: 'Camille Rey', courriel: 'camille@exemple.fr', telephone: '',
        message: 'Bonjour, vos tarifs pour juin ?', liste: 'Un devis', cases: '',
        page: '/contact.html', envoye: Date.now(), lu: false },
      { id: 'm2', nom: '', courriel: 'lucie@exemple.fr', telephone: '', cases: '', liste: '',
        message: '<img src=x onerror=alert(1)><b>gras ?</b>',
        page: '/contact.html', envoye: Date.now() - 60000, lu: true },
    ];
    const journal = [];
    const dessiner = creerMessages({
      t: createTranslator('fr'), lang: 'fr',
      lister: async () => boite.slice(),
      onLu: async (m, etat) => {
        journal.push('lu:' + m.id + ':' + etat);
        boite = boite.map((x) => (x.id === m.id ? { ...x, lu: etat } : x));
      },
      onSupprimer: async (m) => {
        journal.push('supprime:' + m.id);
        boite = boite.filter((x) => x.id !== m.id);
      },
    });

    const hote = document.createElement('div');
    document.body.appendChild(hote);
    await dessiner(hote);
    const lignes = hote.querySelectorAll('tbody tr').length;
    const nonLus = hote.querySelectorAll('tbody .etat--brouillon').length;

    // Ouvrir le second : celui dont le message contient du balisage. Il est
    // déjà lu, donc rien ne doit être marqué au passage.
    hote.querySelectorAll('tbody tr')[1].querySelector('.table__nom button').click();
    await pause();
    const detail = [...document.querySelectorAll('.voile')].pop();
    const dedans = {
      balise: detail.querySelectorAll('img, b').length,
      texte: detail.textContent.includes('<img src=x onerror=alert(1)>'),
      mailto: detail.querySelector('a[href^="mailto:"]')?.getAttribute('href') || '',
    };
    detail.querySelector('.carte__tete button').click();
    await pause();

    // Ouvrir le premier, qui n'est pas lu : l'ouvrir suffit à le marquer.
    hote.querySelectorAll('tbody tr')[0].querySelector('.table__nom button').click();
    await pause();
    [...document.querySelectorAll('.voile')].pop().querySelector('.carte__tete button').click();
    await pause();

    // Puis le remettre en non lu depuis la liste.
    const apresLecture = hote.querySelectorAll('tbody tr').length;
    [...hote.querySelectorAll('tbody tr')[0].querySelectorAll('.table__actions button')][1].click();
    await pause();

    // Supprimer le premier, confirmation comprise.
    hote.querySelectorAll('tbody tr')[0].querySelector('.b--danger').click();
    await pause();
    const fenetre = [...document.querySelectorAll('.voile')].pop();
    fenetre.querySelector('.carte__corps .b--danger').click();
    await pause();

    return {
      lignes, nonLus, ...dedans, apresLecture,
      journal: journal.join(','),
      restantes: hote.querySelectorAll('tbody tr').length,
      restantesEnBase: boite.length,
    };
  });
  await page.close();

  dit('les messages sont listés', 2, lu.lignes);
  dit('le non lu est signalé', 1, lu.nonLus);
  dit('la liste tient après ouverture', 2, lu.apresLecture);
  // Le point qui compte : ce qu'un inconnu a écrit reste du texte.
  dit('aucune balise n’est interprétée', 0, lu.balise);
  dit('le balisage s’affiche tel quel', true, lu.texte);
  dit('l’adresse devient un lien de réponse', 'mailto:lucie@exemple.fr', lu.mailto);
  dit('ouvrir un message le marque lu, et le bouton le rebascule',
    'lu:m1:true,lu:m1:false,supprime:m1', lu.journal);
  dit('le message supprimé quitte la liste', 1, lu.restantes);
  dit('et la base ne le garde pas', 1, lu.restantesEnBase);
}

dit('aucune exception dans la page', '', plantages.join(' | '));

await navigateur.close();
serveur.close();

console.log(echecs.length ? `\n${echecs.length} échec(s)\n` : '\nTout est bon.\n');
process.exit(echecs.length ? 1 : 0);
