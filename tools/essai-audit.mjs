#!/usr/bin/env node
/**
 * Éprouve l'audit de référencement et d'accessibilité dans un vrai navigateur.
 *
 *   node tools/essai-audit.mjs
 *
 * Deux choses doivent être vraies, et la seconde compte autant que la première.
 *
 * Un défaut doit être TROUVÉ : sur une page volontairement fautive — pas de
 * description, deux titres de niveau 1, une image sans texte de remplacement,
 * un lien « cliquez ici », un gris trop clair sur blanc — chacun doit
 * apparaître, nommé.
 *
 * Et une page correcte doit rester SILENCIEUSE. Un audit qui crie pour rien ne
 * sera plus jamais ouvert, et le vrai défaut du lendemain ne sera pas vu. Le
 * faux positif est donc un échec au même titre que le défaut manqué.
 *
 * Le contraste se mesure dans le navigateur, sur ce qu'il calcule vraiment :
 * les couleurs viennent d'une feuille de style, pas d'un objet qu'on se serait
 * passé de main en main. Et les balises ajoutées doivent survivre à la
 * publication — donc à l'aller-retour par l'instantané, puis au retrait
 * complet du module.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.svg': 'image/svg+xml',
};

/**
 * La page fautive. Chaque ligne y est un défaut voulu, et un seul :
 * la description absente, le second niveau 1, la marche sautée de 1 à 4,
 * l'image nue, le lien qui ne dit rien, le gris à 2,85 pour 1, le champ sans
 * libellé, la cible de neuf pixels — et un texte sur une photo, qui ne doit
 * PAS être jugé.
 */
const FAUTIVE = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Boulangerie du Pont</title>
<style>
  body { background: #ffffff; color: #222222; font-family: sans-serif; margin: 0 }
  .pale { color: #999999 }
  .minuscule { display: inline-block; font-size: 9px; line-height: 9px; padding: 0 }
  .photo { background-image: url(/demo/images/hero.svg); background-size: cover; height: 200px }
</style></head>
<body>
  <h1>Boulangerie du Pont</h1>
  <p class="pale">Du pain au levain cuit sur pierre, tous les matins.</p>
  <h1>Nos pains</h1>
  <h4>Le levain</h4>
  <img src="/demo/images/chambre-1.svg" width="240">
  <p><a href="/tarifs.html">Cliquez ici</a></p>
  <form><input type="text" name="courriel"></form>
  <p><a class="minuscule" href="/contact.html">m</a></p>
  <div class="photo"><p class="pale">Texte pose sur une photo</p></div>
</body></html>`;

/**
 * La page correcte. Tout y est en règle : la langue déclarée, le titre et la
 * description, l'image de partage, un seul niveau 1 suivi d'un niveau 2, le
 * texte de remplacement, des liens qui disent où ils mènent, du #222 sur du
 * blanc, un champ étiqueté, et des cibles qu'un doigt atteint.
 */
const CORRECTE = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>Boulangerie du Pont — pain au levain</title>
<meta name="description" content="Pain au levain cuit sur pierre chaque matin, a Pont-Saint-Esprit. Ouvert du mardi au samedi.">
<meta property="og:image" content="https://exemple.fr/partage.jpg">
<style>
  body { background: #ffffff; color: #222222; font-family: sans-serif; margin: 0 }
  a { display: inline-block; padding: 10px 14px; font-size: 16px; color: #14425f }
  button { padding: 10px 16px; font-size: 16px }
</style></head>
<body>
  <h1>Boulangerie du Pont</h1>
  <h2>Nos pains au levain</h2>
  <p>Tout est petri a la main, chaque matin, avec trois farines et rien d autre.</p>
  <img src="/demo/images/chambre-1.svg" width="240" alt="Une miche de pain au levain sortie du four">
  <p><a href="/tarifs.html">Voir nos tarifs et nos horaires</a></p>
  <form>
    <label for="courriel">Votre adresse e-mail</label>
    <input type="text" id="courriel" name="courriel">
    <button type="submit">Recevoir la lettre</button>
  </form>
</body></html>`;

/** Le petit site qui sert à éprouver le plan : un index et deux pages liées. */
const INDEX = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>Accueil</title><meta name="description" content="La boulangerie, ses pains et ses horaires."></head>
<body><h1>Accueil</h1>
<nav><a href="/contact.html">Nous joindre</a> <a href="/tarifs.html">Nos tarifs</a></nav>
</body></html>`;

const CONTACT = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>Nous joindre</title></head><body><h1>Nous joindre</h1></body></html>`;

const TARIFS = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>Nos tarifs</title></head><body><h1>Nos tarifs</h1></body></html>`;

/** Une source vierge, celle que recharge la régénération du HTML. */
const VIERGE = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>vierge</title></head>
<body><h1 id="titre">Un titre</h1></body></html>`;

const PAGES = {
  '/index.html': INDEX,
  '/contact.html': CONTACT,
  '/tarifs.html': TARIFS,
  '/fautive.html': FAUTIVE,
  '/correcte.html': CORRECTE,
  '/vierge.html': VIERGE,
};

/** Les fichiers que le serveur sert vraiment. Le plan doit tomber dessus. */
const PAGES_REELLES = ['index.html', 'contact.html', 'tarifs.html'];

const serveur = createServer(async (req, res) => {
  const chemin = req.url.split('?')[0];
  const page = PAGES[chemin === '/' ? '/index.html' : chemin];
  if (page) {
    res.writeHead(200, { 'content-type': 'text/html' });
    return res.end(page);
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

/** Audite une page servie, et rend ses constats. */
async function auditer(chemin) {
  const page = await navigateur.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(base + chemin);
  const bilan = await page.evaluate(async () => {
    const { PageModel } = await import('/admin/core/model.js');
    const { auditerPage } = await import('/admin/core/audit.js');
    const model = new PageModel({ doc: document }).refresh();
    const resultat = auditerPage({ model, chemin: 'essai.html', nom: 'Essai' });
    return {
      cles: resultat.constats.map((c) => c.cle),
      constats: resultat.constats.map((c) => ({
        cle: c.cle, gravite: c.gravite, famille: c.famille, ou: c.ou, ancre: !!c.ancre,
      })),
      bloquants: resultat.bloquants,
      souhaitables: resultat.souhaitables,
    };
  });
  await page.close();
  return bilan;
}

console.log('\nRéférencement et accessibilité\n');

// --- 1. Sur une page fautive, chaque défaut est trouvé ---------------------
console.log('Une page volontairement fautive');
const fautive = await auditer('/fautive.html');
const attendus = [
  ['la description manquante', 'auditDescriptionAbsente'],
  ['la langue non déclarée', 'auditLangueAbsente'],
  ['les deux titres de niveau 1', 'auditH1Multiple'],
  ['la marche sautée entre les niveaux', 'auditNiveauSaute'],
  ['l’image sans texte de remplacement', 'auditAltAbsent'],
  ['le lien qui ne dit pas où il mène', 'auditLienVague'],
  ['le contraste insuffisant', 'auditContraste'],
  ['le champ sans libellé', 'auditChampMuet'],
  ['la cible trop petite', 'auditCiblePetite'],
  ['l’image de partage absente', 'auditPartageAbsent'],
];
for (const [nom, cle] of attendus) dit(nom, true, fautive.cles.includes(cle));

// Le titre, lui, est présent : un audit qui reprocherait tout dès qu'il
// reproche quelque chose ne prouverait rien.
dit('le titre présent n’est pas reproché', false, fautive.cles.includes('auditTitreAbsent'));

console.log('\nCe que chaque constat sait dire');
const contraste = fautive.constats.find((c) => c.cle === 'auditContraste');
dit('le contraste est bloquant', 'bloquant', contraste?.gravite);
dit('il est rangé dans l’accessibilité', 'accessibilite', contraste?.famille);
dit('il dit sur quel texte il porte', true, /levain/.test(contraste?.ou || ''));
dit('et il sait où emmener', true, !!contraste?.ancre);
dit('le lien vague est seulement souhaitable', 'souhaitable',
  fautive.constats.find((c) => c.cle === 'auditLienVague')?.gravite);
dit('l’image sans alt est bloquante', 'bloquant',
  fautive.constats.find((c) => c.cle === 'auditAltAbsent')?.gravite);

// Un texte posé sur une photo n'est PAS jugé : le contraste y dépend du pixel,
// et un verdict inventé serait pire qu'un silence.
console.log('\nUn texte posé sur une photo');
dit('aucun contraste n’est jugé sur la photo', false,
  fautive.constats.some((c) => c.cle === 'auditContraste' && /photo/.test(c.ou)));

// --- 2. Sur une page correcte, aucun faux positif -------------------------
console.log('\nUne page correcte — le silence compte autant');
const correcte = await auditer('/correcte.html');
dit('aucun point à corriger', 0, correcte.bloquants);
dit('aucun point à améliorer', 0, correcte.souhaitables);
if (correcte.cles.length) console.log('    reprochés à tort : ' + correcte.cles.join(', '));

// --- 3. Le contraste se calcule, il ne s'estime pas ----------------------
console.log('\nLe calcul du contraste, sur des couples connus');
{
  const page = await navigateur.newPage();
  await page.goto(base + '/correcte.html');
  const mesures = await page.evaluate(async () => {
    const a = await import('/admin/core/audit.js');
    const blanc = { r: 255, g: 255, b: 255, a: 1 };
    return {
      blancSurBlanc: a.rapportContraste('#ffffff', '#ffffff'),
      noirSurBlanc: a.rapportContraste('#000000', '#ffffff'),
      noirEnRgb: a.rapportContraste('rgb(0, 0, 0)', 'rgb(255, 255, 255)'),
      limiteHaute: a.rapportContraste('#767676', '#ffffff'),
      limiteBasse: a.rapportContraste('#777777', '#ffffff'),
      demiNoir: a.rapportContraste(a.aplatir({ r: 0, g: 0, b: 0, a: 0.5 }, blanc), blanc),
      illisible: a.rapportContraste('oklch(0.5 0.1 200)', '#ffffff'),
      seuil: a.SEUILS.normal,
      // Ce que le navigateur calcule vraiment sur un élément de la page.
      mesure: a.mesurerContraste(document.querySelector('p')).rapport,
    };
  });
  await page.close();
  dit('blanc sur blanc', 1, mesures.blancSurBlanc);
  dit('noir sur blanc', 21, mesures.noirSurBlanc);
  dit('la forme rgb() donne le même rapport', 21, mesures.noirEnRgb);
  dit('le couple limite qui passe (#767676)', 4.54, mesures.limiteHaute);
  dit('celui qui ne passe pas (#777777)', 4.48, mesures.limiteBasse);
  dit('le seuil exigé', 4.5, mesures.seuil);
  dit('une couleur à moitié transparente est aplatie', 3.98, mesures.demiNoir);
  dit('une couleur qu’on ne sait pas lire ne rend pas de verdict', null, mesures.illisible);
  dit('le texte de la page correcte, tel que rendu', 15.91, mesures.mesure);
}

// --- 4. Les métadonnées et la fiche survivent à la publication ------------
// La régénération ne repart PAS du DOM affiché : elle recharge la source
// d'origine et lui applique l'instantané publié. Une balise qui ne ferait pas
// cet aller-retour s'éditerait parfaitement et ne se publierait jamais.
console.log('\nAprès un aller-retour par l’instantané publié');
{
  const page = await navigateur.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(base + '/correcte.html');
  const lu = await page.evaluate(async () => {
    const { PageModel } = await import('/admin/core/model.js');
    const { freezePage } = await import('/admin/ui/export.js');

    const model = new PageModel({ doc: document }).refresh();
    model.setReglage('referencement', { adresse: 'https://exemple.fr', langue: 'fr', plan: true });
    model.setReglage('brief', {
      activite: 'Boulangerie du Pont', metier: 'alimentaire', ville: 'Pont-Saint-Esprit',
      phrase: 'Du pain au levain cuit sur pierre.', telephone: '04 66 00 00 00',
    });
    model.setReglage('legal', {
      donnees: { adresse: '1 route de la Forêt, 30130 Pont-Saint-Esprit', email: 'bonjour@exemple.fr' },
    });
    model.setPageMeta({
      titre: 'Pain au levain à Pont-Saint-Esprit',
      description: 'Cuit sur pierre chaque matin, avec trois farines et rien d’autre.',
      partage: 'https://exemple.fr/partage.jpg',
    });
    const instantane = model.toSnapshot();

    const cadre = document.createElement('iframe');
    cadre.style.cssText = 'width:1000px;height:600px;border:0';
    cadre.src = '/vierge.html';
    document.body.appendChild(cadre);
    await new Promise((ok) => cadre.addEventListener('load', ok, { once: true }));
    const vierge = cadre.contentDocument;

    const republie = new PageModel({ doc: vierge }).refresh();
    republie.applySnapshot(instantane);

    const fiche = vierge.querySelector('script[data-referencement="etablissement"]');
    const donnees = fiche ? JSON.parse(fiche.textContent) : null;
    // Ce que devient le fichier une fois le module retiré pour de bon.
    const fige = freezePage({ doc: vierge });

    return {
      titre: vierge.title,
      description: vierge.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      ogTitre: vierge.querySelector('meta[property="og:title"]')?.getAttribute('content') || '',
      ogImage: vierge.querySelector('meta[property="og:image"]')?.getAttribute('content') || '',
      carte: vierge.querySelector('meta[name="twitter:card"]')?.getAttribute('content') || '',
      langue: vierge.documentElement.getAttribute('lang') || '',
      type: donnees?.['@type'] || '',
      nom: donnees?.name || '',
      telephone: donnees?.telephone || '',
      codePostal: donnees?.address?.postalCode || '',
      ville: donnees?.address?.addressLocality || '',
      rue: donnees?.address?.streetAddress || '',
      // Deux applications de suite ne doivent pas produire deux fiches.
      fiches: (() => { republie.applySnapshot(instantane); return vierge.querySelectorAll('script[data-referencement]').length; })(),
      figeGardeLaFiche: fige.includes('"@type": "FoodEstablishment"'),
      figeGardeLePartage: fige.includes('https://exemple.fr/partage.jpg'),
      figeGardeLaLangue: /<html[^>]*lang="fr"/.test(fige),
      figeSansAdmin: !/data-admin-/.test(fige),
    };
  });
  await page.close();
  dit('le titre est repris', 'Pain au levain à Pont-Saint-Esprit', lu.titre);
  dit('la description est reprise', true, /trois farines/.test(lu.description));
  dit('og:title est posé', 'Pain au levain à Pont-Saint-Esprit', lu.ogTitre);
  dit('og:image est posé', 'https://exemple.fr/partage.jpg', lu.ogImage);
  dit('la vignette est large', 'summary_large_image', lu.carte);
  dit('la langue est déclarée', 'fr', lu.langue);
  dit('la fiche connaît le métier', 'FoodEstablishment', lu.type);
  dit('elle porte l’enseigne', 'Boulangerie du Pont', lu.nom);
  dit('et le téléphone', '04 66 00 00 00', lu.telephone);
  dit('le code postal est reconnu', '30130', lu.codePostal);
  dit('la ville vient du questionnaire', 'Pont-Saint-Esprit', lu.ville);
  dit('la rue est gardée entière', '1 route de la Forêt', lu.rue);
  dit('deux applications ne font pas deux fiches', 1, lu.fiches);

  console.log('\nEt le module retiré pour de bon');
  dit('la fiche reste dans le fichier figé', true, lu.figeGardeLaFiche);
  dit('l’image de partage aussi', true, lu.figeGardeLePartage);
  dit('la langue aussi', true, lu.figeGardeLaLangue);
  dit('sans un seul attribut du module', true, lu.figeSansAdmin);
}

// --- 5. Le plan du site liste les pages réelles ---------------------------
// Le plan est construit sur les pages que le module connaît, pas sur une liste
// écrite à la main : s'il s'en écarte, il envoie les moteurs sur des adresses
// qui n'existent pas — ou passe à côté de celles qui existent.
console.log('\nLe plan du site, comparé aux fichiers réellement servis');
{
  const page = await navigateur.newPage();
  await page.goto(base + '/index.html');
  const lu = await page.evaluate(async () => {
    const { discoverPages } = await import('/admin/core/pages.js');
    const { planDuSite, robots } = await import('/admin/core/referencement.js');
    const pages = discoverPages(document);
    const plan = planDuSite({
      adresse: 'https://exemple.fr',
      // Deux fois l'accueil : une liste de pages en contient, et deux <loc>
      // identiques font compter la page pour deux.
      pages: [...pages.map((p) => ({ chemin: p.path })), { chemin: 'index.html' }],
    });
    return {
      trouvees: pages.map((p) => p.path).sort(),
      adresses: [...plan.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).sort(),
      entete: plan.startsWith('<?xml version="1.0" encoding="UTF-8"?>'),
      sansAdresse: planDuSite({ adresse: '', pages: [{ chemin: 'index.html' }] }),
      robots: robots({ adresse: 'https://exemple.fr' }),
    };
  });
  await page.close();

  dit('les pages découvertes sont celles du serveur', PAGES_REELLES.sort().join(','), lu.trouvees.join(','));
  dit('le plan liste exactement ces pages', [
    'https://exemple.fr/',
    'https://exemple.fr/contact.html',
    'https://exemple.fr/tarifs.html',
  ].join(','), lu.adresses.join(','));
  dit('l’accueil n’est listé qu’une fois', 3, lu.adresses.length);
  dit('l’en-tête XML est écrit', true, lu.entete);
  dit('sans adresse de site, aucun plan', '', lu.sansAdresse);
  dit('robots.txt annonce le plan', true, lu.robots.includes('Sitemap: https://exemple.fr/sitemap.xml'));
  dit('et écarte les copies du code d’origine', true, lu.robots.includes('Disallow: /*.src.html$'));
}

// --- 6. Chaque phrase de l'écran existe, en français et en anglais --------
// Un dictionnaire rend la CLÉ quand la traduction manque : l'écran s'affiche
// alors, avec « auditLienVague » écrit dedans. Personne ne le voit en relisant
// du code, et le client le lit en production. On relève donc les clés dans la
// source, et on vérifie que chacune répond.
console.log('\nLes phrases de l’écran, dans les deux langues');
{
  const page = await navigateur.newPage();
  await page.goto(base + '/correcte.html');
  const lu = await page.evaluate(async () => {
    const { createTranslator } = await import('/admin/ui/i18n.js');
    const { creerReferencement } = await import('/admin/ui/back/referencement.js');
    const { rubriquesActives, rubrique } = await import('/admin/core/rubriques.js');
    const { GRAVITES, FAMILLES } = await import('/admin/core/audit.js');

    const sources = await Promise.all([
      fetch('/admin/ui/back/referencement.js').then((r) => r.text()),
      fetch('/admin/core/audit.js').then((r) => r.text()),
    ]);
    const cles = new Set();
    // `[,)]` après le guillemet : sans lui, `t('boAuditZone_' + zone)` ferait
    // relever le PRÉFIXE comme s'il était une clé, et l'essai réclamerait une
    // phrase qui n'a aucune raison d'exister. Les clés construites par
    // morceaux sont ajoutées à la main juste en dessous, valeur par valeur.
    for (const m of sources[0].matchAll(/\bt\('([A-Za-z0-9_]+)'\s*[,)]/g)) cles.add(m[1]);
    for (const m of sources[1].matchAll(/constat\('([A-Za-z0-9_]+)'\s*[,)]/g)) cles.add(m[1]);
    // Celles que le code construit par morceaux : le relevé ne les voit pas.
    for (const g of GRAVITES) { cles.add('boAuditGravite_' + g); cles.add('boAuditGraviteAide_' + g); }
    for (const f of FAMILLES) cles.add('boAuditFamille_' + f);
    for (const z of ['entete', 'pied']) cles.add('boAuditZone_' + z);
    cles.add('rub_referencement');
    cles.add('rubAide_referencement');
    cles.add('boGroupe_' + rubrique('referencement').groupe);

    const manquantes = [];
    for (const langue of ['fr', 'en']) {
      const t = createTranslator(langue);
      for (const cle of cles) if (t(cle, 1, 2, 3) === cle) manquantes.push(langue + ':' + cle);
    }
    return {
      nombre: cles.size,
      manquantes,
      ecran: typeof creerReferencement,
      auMenu: rubriquesActives(null).includes('referencement'),
    };
  });
  await page.close();
  dit('l’écran est une fabrique', 'function', lu.ecran);
  dit('la rubrique est au menu sans rien cocher', true, lu.auMenu);
  dit('aucune phrase manquante', '', lu.manquantes.join(', '));
  console.log(`    ${lu.nombre} clés relevées`);
}

await navigateur.close();
serveur.close();

console.log(echecs.length ? `\n${echecs.length} échec(s)\n` : '\nTout est bon.\n');
process.exit(echecs.length ? 1 : 0);
