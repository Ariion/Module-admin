#!/usr/bin/env node
/**
 * Éprouve — et MESURE — la performance des images, dans un vrai navigateur.
 *
 *   node tools/essai-images.mjs
 *
 * Un chantier « performance » qui ne mesure rien ne vaut rien. Ce fichier ne
 * relit donc pas le balisage qu'on vient d'écrire : il compte les octets que le
 * serveur envoie VRAIMENT, à deux largeurs d'écran, et relève le décalage de
 * mise en page que le navigateur observe lui-même.
 *
 * Trois choses sont éprouvées bout à bout, parce qu'aucune ne vaut seule :
 *
 *   1. le téléversement — une photo est réduite, convertie en WebP et déclinée
 *      en plusieurs largeurs, dans le navigateur du client (il n'y a pas de
 *      serveur d'application pour le faire, et il n'y en aura pas) ;
 *   2. la publication — `core/bake.js` réécrit le `.html` avec ces largeurs
 *      dedans, et tranche ce qui se charge tout de suite ;
 *   3. le site sans le module — la page est figée par le VRAI code de sortie,
 *      rechargée seule, et c'est sur elle qu'on compte.
 *
 * Le point le plus important est le 3. Un gain qui vivrait dans un script du
 * module partirait avec le dossier `admin/` : il ne compterait pour rien.
 *
 * La comparaison se fait contre une page TÉMOIN, fabriquée à partir de la page
 * publiée en lui retirant exactement ce que ce chantier a ajouté — et en lui
 * rendant ce que le module faisait déjà (la vignette de galerie était déjà
 * différée). Sans quoi on s'attribuerait un gain qui existait avant.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
};

/**
 * Retard imposé aux images.
 *
 * Sans lui, une image locale arrive avant le premier rendu et aucune page ne
 * saute — le décalage de mise en page serait nul partout, y compris sur la page
 * témoin, et la mesure ne dirait rien. 200 ms, c'est un réseau mobile ordinaire.
 */
const RETARD_IMAGE = 200;

/**
 * Une petite image écrite en clair : elle sert d'image « du client » dans la
 * page d'atelier. En `data:`, elle ne coûte aucune requête, donc elle ne brouille
 * pas le comptage des octets.
 */
const IMAGE_CLIENT = (teinte) => 'data:image/svg+xml,'
  + "%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='500'%3E"
  + `%3Crect width='800' height='500' fill='%23${teinte}'/%3E%3C/svg%3E`;

/**
 * La page d'atelier : un site ordinaire, écrit à la main, avec sa feuille de
 * style et la déclaration du module. Elle ne sert qu'à FABRIQUER la page
 * publiée, exactement comme un vrai site sert de source à la régénération.
 *
 * Les deux images du client sont là pour la frontière la plus délicate du
 * module : la première sera remplacée par une photo de la médiathèque, la
 * seconde ne sera pas touchée du tout.
 *
 * Les deux sections qui les portent sont volontairement DIFFÉRENTES : l'une
 * pose l'image nue, l'autre la range dans un `<figure>` légendé. Deux sections
 * de structure voisine seraient détectées comme un bloc répétable, et leurs
 * images relèveraient de la collection plutôt que du contenu — ce n'est pas ce
 * mécanisme-là qu'on éprouve ici. Un simple `<h2>` de plus n'y suffit pas : la
 * parenté se juge sur la forme, et deux sections « titre, image, paragraphe »
 * restent parentes. Il faut que l'imbrication diffère.
 */
const ATELIER = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>essai des images</title>
<style>
  body { margin: 0; font: 16px/1.6 system-ui, sans-serif; color: #1a1c22 }
  section { padding: 28px 16px }
  h1, h2 { margin: 0 0 14px }
  .dedans { max-width: 860px; margin: 0 auto }
  /* Comme sur un vrai site : c'est la feuille qui dimensionne, pas l'attribut. */
  .photo img { width: 100%; height: auto; display: block }
</style>
<script>window.ADMIN_CONFIG = { site: 'essai' };</script>
</head><body><main>
<section class="dedans"><h1>Domaine des Trois Chênes</h1>
<p>Quatre chambres, un verger, et le calme des coteaux.</p></section>
<section class="dedans photo"><img src="${IMAGE_CLIENT('b9c3ae')}" alt="La façade">
<p>La façade, au printemps.</p></section>
<section class="dedans"><h2>Le verger</h2>
<figure class="photo"><img src="${IMAGE_CLIENT('aeb3c9')}" alt="Le verger">
<figcaption>Au petit matin.</figcaption></figure>
<p>Quatre-vingts arbres, et un vieux puits.</p></section>
</main></body></html>`;

// ------------------------------------------------------------------ serveur
const medias = new Map();     // chemin -> { corps, type }
const publiees = new Map();   // chemin -> html
let compteur = neufCompteur();

function neufCompteur() {
  return { total: 0, images: 0, requetes: 0, parUrl: new Map() };
}

function compter(chemin, octets, estImage) {
  compteur.total += octets;
  compteur.requetes += 1;
  if (estImage) compteur.images += octets;
  compteur.parUrl.set(chemin, (compteur.parUrl.get(chemin) || 0) + octets);
}

/**
 * Lit les parties d'un envoi multipart. Le module envoie un `FormData` réel :
 * boucher l'envoi plutôt que le décoder reviendrait à éprouver le bouchon.
 */
function partiesMultipart(corps, frontiere) {
  const sep = Buffer.from('--' + frontiere);
  const parties = [];
  let debut = corps.indexOf(sep);
  while (debut !== -1) {
    const apres = debut + sep.length;
    const fin = corps.indexOf(sep, apres);
    if (fin === -1) break;
    const brut = corps.subarray(apres + 2, fin - 2);
    const coupe = brut.indexOf('\r\n\r\n');
    if (coupe !== -1) {
      const entetes = brut.subarray(0, coupe).toString('latin1');
      parties.push({
        nom: /name="([^"]*)"/.exec(entetes)?.[1] || '',
        fichier: /filename="([^"]*)"/.exec(entetes)?.[1] || '',
        corps: brut.subarray(coupe + 4),
      });
    }
    debut = fin;
  }
  return parties;
}

let compteNoms = 0;

/**
 * L'endpoint média, tel que `tools/admin-endpoint.php` se comporte — suffixe
 * aléatoire compris. C'est important : un nom de fichier imprévisible est ce
 * qui interdit de DEVINER l'adresse d'une variante. Si le module se mettait un
 * jour à la deviner, cet essai tomberait.
 */
async function endpointMedia(req, res, chemin, requete) {
  const action = requete.get('action');
  if (action === 'upload') {
    const morceaux = [];
    for await (const bout of req) morceaux.push(bout);
    const corps = Buffer.concat(morceaux);
    const frontiere = /boundary=(.+)$/.exec(req.headers['content-type'] || '')?.[1];
    const partie = partiesMultipart(corps, frontiere).find((p) => p.nom === 'file');
    if (!partie) { res.writeHead(400, { 'content-type': 'application/json' }); return res.end('{"error":"aucun fichier"}'); }

    compteNoms += 1;
    const ext = extname(partie.fichier) || '.bin';
    const base = partie.fichier.slice(0, -ext.length) || 'image';
    const nom = `${base}-${(compteNoms * 2654435761 % 0xffffff).toString(16)}${ext}`;
    medias.set('/medias/' + nom, { corps: partie.corps, type: TYPES[ext] || 'application/octet-stream' });

    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({
      url: '/medias/' + nom, path: nom, name: nom,
      size: partie.corps.length, type: TYPES[ext] || 'application/octet-stream',
    }));
  }
  if (action === 'list') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ files: [] }));
  }
  res.writeHead(200, { 'content-type': 'application/json' });
  return res.end('{"ok":true}');
}

const serveur = createServer(async (req, res) => {
  const [chemin, params] = req.url.split('?');
  const requete = new URLSearchParams(params || '');

  if (chemin === '/essai-endpoint') return endpointMedia(req, res, chemin, requete);

  if (chemin === '/' || chemin === '/index.html') {
    compter(chemin, Buffer.byteLength(ATELIER), false);
    res.writeHead(200, { 'content-type': 'text/html' });
    return res.end(ATELIER);
  }
  if (publiees.has(chemin)) {
    const html = publiees.get(chemin);
    compter(chemin, Buffer.byteLength(html), false);
    res.writeHead(200, { 'content-type': 'text/html' });
    return res.end(html);
  }
  if (medias.has(chemin)) {
    const { corps, type } = medias.get(chemin);
    compter(chemin, corps.length, true);
    await new Promise((ok) => setTimeout(ok, RETARD_IMAGE));
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
    return res.end(corps);
  }
  try {
    const corps = await readFile(resolve(racine, '.' + chemin));
    compter(chemin, corps.length, false);
    res.writeHead(200, { 'content-type': TYPES[extname(chemin)] || 'application/octet-stream' });
    res.end(corps);
  } catch {
    res.writeHead(404).end('non');
  }
});

const port = await new Promise((ok) => serveur.listen(0, () => ok(serveur.address().port)));
const base = `http://127.0.0.1:${port}`;

// -------------------------------------------------------------- assertions
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
const navigateur = await chromium.launch();
const echecs = [];
const plantages = [];
const dit = (nom, attendu, obtenu) => {
  const bon = String(attendu) === String(obtenu);
  if (!bon) echecs.push(`${nom} : attendu ${attendu}, obtenu ${obtenu}`);
  console.log(`  ${bon ? '✓' : '✗'} ${nom}${bon ? '' : ` — attendu ${attendu}, obtenu ${obtenu}`}`);
};
const ko = (octets) => (octets / 1024).toFixed(1) + ' Ko';

// ============================================================ 1. téléversement
console.log('\nPerformance des images\n');
console.log('Au téléversement — une photo devient plusieurs largeurs');

const page = await navigateur.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (err) => plantages.push(String(err?.message || err)));
await page.goto(base + '/index.html');

const envoi = await page.evaluate(async () => {
  const { preparerJeu } = await import('/admin/media/resize.js');
  const { createEndpointAdapter } = await import('/admin/media/endpoint.js');

  /**
   * Une photo crédible : un dégradé, des formes, et un peu de grain. Un aplat
   * uni se compresserait à quelques octets et la mesure ne dirait rien d'une
   * vraie photo de client.
   */
  const photo = async (largeur, hauteur, teinte, nom) => {
    const toile = document.createElement('canvas');
    toile.width = largeur;
    toile.height = hauteur;
    const ctx = toile.getContext('2d');
    const fond = ctx.createLinearGradient(0, 0, largeur, hauteur);
    fond.addColorStop(0, `hsl(${teinte}, 45%, 72%)`);
    fond.addColorStop(1, `hsl(${teinte + 40}, 38%, 28%)`);
    ctx.fillStyle = fond;
    ctx.fillRect(0, 0, largeur, hauteur);
    let graine = teinte * 7919;
    const hasard = () => { graine = (graine * 1103515245 + 12345) % 2147483648; return graine / 2147483648; };
    for (let i = 0; i < 260; i += 1) {
      ctx.fillStyle = `hsla(${Math.round(hasard() * 360)}, 55%, ${30 + hasard() * 50}%, .22)`;
      ctx.beginPath();
      ctx.arc(hasard() * largeur, hasard() * hauteur, 12 + hasard() * 150, 0, 6.29);
      ctx.fill();
    }
    const pixels = ctx.getImageData(0, 0, largeur, hauteur);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const bruit = (hasard() - 0.5) * 26;
      pixels.data[i] += bruit;
      pixels.data[i + 1] += bruit;
      pixels.data[i + 2] += bruit;
    }
    ctx.putImageData(pixels, 0, 0);
    const blob = await new Promise((ok) => toile.toBlob(ok, 'image/jpeg', 0.92));
    return new File([blob], nom, { type: 'image/jpeg' });
  };

  const config = { siteId: 'essai', media: { endpoint: '/essai-endpoint' } };
  const adaptateur = createEndpointAdapter(config, { idToken: async () => 'essai' });

  const grande = await photo(2400, 1600, 28, 'chambre-vue-mer.jpg');
  const jeu = await preparerJeu(grande, {});
  const chambre = await adaptateur.upload(grande);
  const verger = await adaptateur.upload(await photo(1600, 1200, 140, 'le-verger.jpg'));

  // --- les deux replis ---------------------------------------------------
  // Un SVG : `createImageBitmap` ne le décline pas, et on ne veut surtout pas
  // qu'il s'arrête là — un logo doit pouvoir être téléversé.
  const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='300' height='120'>"
    + "<rect width='300' height='120' fill='#334'/></svg>";
  const logo = new File([svg], 'logo.svg', { type: 'image/svg+xml' });
  const jeuLogo = await preparerJeu(logo, {});
  const logoEnvoye = await adaptateur.upload(logo);

  // Un fichier qui se DIT jpeg et n'en est pas : l'encodage échoue, et
  // l'original doit passer quand même.
  const cassee = new File([new Uint8Array([0xff, 0xd8, 0x03, 0x09, 0x41])], 'cassee.jpg', { type: 'image/jpeg' });
  const jeuCasse = await preparerJeu(cassee, {});
  const casseeEnvoyee = await adaptateur.upload(cassee);

  return {
    source: { largeur: 2400, octets: grande.size, type: grande.type },
    jeu: jeu.variantes.map((v) => ({ largeur: v.width, hauteur: v.height, type: v.type, octets: v.blob.size })),
    chambre, verger,
    logo: { variantes: jeuLogo.variantes.length, srcset: logoEnvoye.srcset, url: logoEnvoye.url, type: jeuLogo.principale.type },
    cassee: { variantes: jeuCasse.variantes.length, srcset: casseeEnvoyee.srcset, url: casseeEnvoyee.url, octets: jeuCasse.principale.blob.size },
  };
});

console.log(`    source : ${envoi.source.largeur} px, ${ko(envoi.source.octets)}, ${envoi.source.type}`);
for (const v of envoi.jeu) console.log(`    ${String(v.largeur).padStart(4)} px — ${ko(v.octets).padStart(9)} — ${v.type}`);

dit('quatre largeurs sont produites', 4, envoi.jeu.length);
dit('les largeurs sont celles attendues', '480,960,1440,1920', envoi.jeu.map((v) => v.largeur).join(','));
dit('la proportion est gardée', true, envoi.jeu.every((v) => Math.abs(v.largeur / v.hauteur - 1.5) < 0.02));
dit('toutes en WebP', true, envoi.jeu.every((v) => v.type === 'image/webp'));
dit('chaque largeur pèse moins que la suivante', true,
  envoi.jeu.every((v, i) => i === 0 || v.octets > envoi.jeu[i - 1].octets));
dit('la plus grande pèse moins que la source', true, envoi.jeu[3].octets < envoi.source.octets);
dit('le srcset désigne les quatre largeurs', '480w,960w,1440w,1920w',
  envoi.chambre.srcset.split(', ').map((c) => c.split(' ')[1]).join(','));
dit('chaque adresse du srcset est bien servie', true,
  envoi.chambre.srcset.split(', ').every((c) => medias.has(c.split(' ')[0])));
dit('l’adresse principale est la plus grande largeur', 1920, envoi.chambre.width);
dit('et la médiathèque garde de quoi tout effacer', 4, envoi.chambre.variantes.length);

console.log('\nCe que le navigateur ne sait pas convertir passe quand même');
dit('un SVG n’est pas décliné', 1, envoi.logo.variantes);
dit('il n’a donc pas de srcset', '', envoi.logo.srcset);
dit('mais il est bien téléversé, tel quel', 'image/svg+xml', envoi.logo.type);
dit('un fichier illisible passe aussi', 1, envoi.cassee.variantes);
dit('avec ses octets d’origine', 5, envoi.cassee.octets);
dit('et une adresse utilisable', true, medias.has(envoi.cassee.url));

// ================================================== 2. publication du HTML
console.log('\nÀ la publication — le HTML porte tout, et le module peut partir');

const publication = await page.evaluate(async ({ chambre, verger }) => {
  const { PageModel } = await import('/admin/core/model.js');
  const { createWidget } = await import('/admin/core/widgets.js');
  const { listSections } = await import('/admin/core/sections.js');
  const { bakePage } = await import('/admin/core/bake.js');
  const { freezePage } = await import('/admin/ui/export.js');
  const { rangerVariantes, variantesDe, sizesMesure } = await import('/admin/core/images.js');

  const section = (props, enfants) => {
    const arbre = createWidget('section');
    Object.assign(arbre.props, props);
    arbre.children = enfants;
    return arbre;
  };
  const widget = (type, props) => {
    const noeud = createWidget(type);
    Object.assign(noeud.props, props);
    return noeud;
  };

  // --- le bandeau d'accueil : l'image du premier écran -------------------
  const titre = widget('heading', { text: 'Le Domaine' });
  const bandeau = widget('hero', {
    image: chambre.url,
    hauteur: 'plein',
    variantes: rangerVariantes(undefined, [chambre], [chambre.url]),
  });
  bandeau.children = [titre];
  const sectionBandeau = section({ maxWidth: 2000, padding: 0 }, [bandeau]);

  // --- plus bas dans la page : une image, puis une galerie ---------------
  const imageBloc = widget('image', {
    src: chambre.url,
    alt: 'La chambre, vue sur la vallée',
    variantes: rangerVariantes(undefined, [chambre], [chambre.url]),
  });
  const galerie = widget('galerie', {
    images: [verger.url, chambre.url].join('\n'),
    visionneuse: 'oui',
    variantes: rangerVariantes(undefined, [verger, chambre], [verger.url, chambre.url]),
  });
  const sectionBas = section({}, [imageBloc, galerie]);

  // --- l'image du client, remplacée par une photo de la médiathèque ------
  const model = new PageModel({ doc: document }).refresh();
  let idClient = null;
  for (const [id, entree] of model.entries) {
    if (entree.role === 'image' && !idClient) idClient = id;
  }
  if (!idClient) throw new Error('aucune image du client détectée par le scanner');
  const connues = variantesDe(chambre);
  model.set(idClient, {
    src: chambre.url,
    srcset: connues.srcset,
    sizes: sizesMesure(model.entries.get(idClient).el),
    // La médiathèque connaît la proportion : on la transmet plutôt que de
    // laisser la publication la deviner sur une image pas encore chargée.
    largeur: connues.largeur,
    hauteur: connues.hauteur,
  });

  // Le bandeau doit passer devant : `after` ne sait que placer APRÈS, et
  // l'ordre des sections est le seul mécanisme qui remonte un bloc en tête.
  const refsClient = listSections(document).map((s) => s.ref);
  const instantane = {
    ...model.toSnapshot(),
    sections: {
      add: [
        { kind: 'widgets', key: 'sHaut', after: null, tree: sectionBandeau },
        { kind: 'widgets', key: 'sBas', after: null, tree: sectionBas },
      ],
      hide: [],
      order: ['ins:sHaut', ...refsClient, 'ins:sBas'],
    },
  };

  // --- la vraie régénération du fichier ---------------------------------
  const { html } = await bakePage({
    sourceUrl: '/index.html', snapshot: instantane, scanOptions: {}, pageId: 'accueil',
  });

  // --- et le retrait du module, par le vrai code de sortie ---------------
  const cadre = document.createElement('iframe');
  cadre.style.cssText = 'position:fixed;left:-20000px;top:0;width:1280px;height:900px;border:0';
  cadre.setAttribute('srcdoc', html);
  document.body.appendChild(cadre);
  await new Promise((ok) => cadre.addEventListener('load', ok, { once: true }));
  await new Promise((ok) => setTimeout(ok, 400));
  const fige = freezePage({ doc: cadre.contentDocument });

  const lu = (doc) => Array.from(doc.querySelectorAll('img')).map((img) => ({
    src: img.getAttribute('src') || '',
    srcset: img.getAttribute('srcset') || '',
    sizes: img.getAttribute('sizes') || '',
    loading: img.getAttribute('loading') || '',
    decoding: img.getAttribute('decoding') || '',
    priorite: img.getAttribute('fetchpriority') || '',
    largeur: img.getAttribute('width') || '',
    hauteur: img.getAttribute('height') || '',
  }));

  return {
    html, fige,
    images: lu(cadre.contentDocument),
    resteDuModule: /admin\/runtime|admin-config|ADMIN_CONFIG|data-admin-/.test(fige) ? 'oui' : 'non',
    scripts: (fige.match(/<script/g) || []).length,
    fondCss: /background-image/.test(fige) ? 'oui' : 'non',
  };
}, { chambre: envoi.chambre, verger: envoi.verger });

const imgs = publication.images;
const bandeau = imgs[0];
const differees = imgs.filter((i) => i.loading === 'lazy');
const sansDimension = imgs.filter((i) => !i.largeur || !i.hauteur);

// L'inventaire avant les affirmations : un compte qui tombe faux doit dire
// CE qu'il a compté, sinon on ajuste le nombre attendu sans savoir pourquoi.
for (const [i, im] of imgs.entries()) {
  const nom = im.src.startsWith('data:') ? '(donnée en ligne)' : im.src.split('/').pop();
  console.log(`    ${String(i).padStart(2)}. ${nom.padEnd(38)} ${(im.loading || 'immédiat').padEnd(9)}`
    + `${(im.largeur ? im.largeur + '×' + im.hauteur : 'sans dimension').padEnd(16)}`
    + `${im.srcset ? im.srcset.split(', ').length + ' largeurs' : 'pas de srcset'}  ${im.sizes}`);
}
// Huit et non six : la galerie rend chaque photo deux fois — la vignette
// dans la grille, et la copie que la visionneuse montre en grand. C'est ce qui
// lui permet de s'ouvrir sans une ligne de script, module retiré.
dit('la page publiée porte huit images', 8, imgs.length);
dit('le bandeau est le premier visuel', true, bandeau.srcset.includes('1920w'));
dit('le bandeau n’est PAS différé', '', bandeau.loading);
dit('il est même annoncé prioritaire', 'high', bandeau.priorite);
dit('il sait choisir sa largeur', '100vw', bandeau.sizes);
dit('toutes les images sous le pli sont différées', imgs.length - 1, differees.length);
dit('et décodées sans bloquer', imgs.length - 1,
  differees.filter((i) => i.decoding === 'async').length);
dit('aucune image sans proportion écrite', 0, sansDimension.length);
// On vérifie la FORME, pas le nombre : la largeur est relevée sur la page du
// client, donc elle change avec sa mise en page. Un nombre en dur ferait
// tomber l'essai au premier pixel de marge modifié, sans que rien soit cassé.
dit('l’image du client reçoit nos largeurs', true,
  imgs.some((i) => /^\(max-width: \d+px\) 100vw, \d+px$/.test(i.sizes)
    && i.srcset.includes('1920w')));
dit('celle qu’on n’a pas touchée garde son adresse', true,
  imgs.some((i) => i.src.startsWith('data:image/svg') && i.largeur === '800'));
dit('le bandeau n’est plus un fond CSS', 'non', publication.fondCss);
dit('la page figée ne garde aucune trace du module', 'non', publication.resteDuModule);
dit('ni la moindre balise de script', 0, publication.scripts);

// ================================================ 3. octets réellement reçus
/**
 * Reconstitue le comportement d'AVANT ce chantier, pour que la comparaison ne
 * s'attribue pas un gain qui existait déjà : une seule largeur, aucune
 * proportion, aucun décodage asynchrone — mais la vignette de galerie reste
 * différée, elle l'était.
 */
function pageTemoin(html) {
  return html.replace(/<img\b[^>]*>/g, (balise) => {
    const vignette = /object-fit:cover/.test(balise) && /height:\d+px/.test(balise);
    const nue = balise
      .replace(/\s(?:srcset|sizes|decoding|fetchpriority|width|height)="[^"]*"/g, '')
      .replace(/\sloading="[^"]*"/g, '');
    return vignette ? nue.replace('<img', '<img loading="lazy"') : nue;
  });
}

publiees.set('/publie/apres.html', publication.fige);
publiees.set('/publie/avant.html', pageTemoin(publication.fige));

/**
 * Charge une page dans un navigateur neuf et rend ce que le SERVEUR a envoyé.
 * On ne déduit rien du balisage : on compte les octets sortis.
 */
async function mesurer(chemin, largeur, hauteur, defiler = false) {
  compteur = neufCompteur();
  const contexte = await navigateur.newContext({ viewport: { width: largeur, height: hauteur } });
  const vue = await contexte.newPage();
  await vue.addInitScript(() => {
    window.__decalage = 0;
    new PerformanceObserver((liste) => {
      for (const entree of liste.getEntries()) {
        if (!entree.hadRecentInput) window.__decalage += entree.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await vue.goto(base + chemin, { waitUntil: 'load' });
  await vue.waitForTimeout(700);
  if (defiler) {
    await vue.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await vue.waitForTimeout(900);
  }
  const decalage = await vue.evaluate(() => window.__decalage);
  const bilan = {
    total: compteur.total,
    images: compteur.images,
    requetes: compteur.requetes,
    decalage: Math.round(decalage * 10000) / 10000,
    urls: [...compteur.parUrl.keys()].filter((u) => u.startsWith('/medias/')),
  };
  await contexte.close();
  return bilan;
}

console.log('\nCe que le serveur envoie vraiment — au chargement');
const mobileApres = await mesurer('/publie/apres.html', 390, 700);
const mobileAvant = await mesurer('/publie/avant.html', 390, 700);
const largeApres = await mesurer('/publie/apres.html', 1280, 800);
const largeAvant = await mesurer('/publie/avant.html', 1280, 800);

const ligne = (nom, m) => console.log(
  `    ${nom.padEnd(22)} ${ko(m.total).padStart(10)} au total, `
  + `${ko(m.images).padStart(10)} d’images, ${String(m.requetes).padStart(2)} requêtes, `
  + `décalage ${m.decalage}`);
ligne('téléphone 390 — avant', mobileAvant);
ligne('téléphone 390 — après', mobileApres);
ligne('bureau 1280 — avant', largeAvant);
ligne('bureau 1280 — après', largeApres);

const largeurDe = (urls) => urls.map((u) => /-(\d+)\.webp$/.exec(u)?.[1] || /-(\d+)-/.exec(u)?.[1] || '?');
console.log(`    le téléphone reçoit : ${mobileApres.urls.join(', ') || '(rien)'}`);
console.log(`    le bureau reçoit    : ${largeApres.urls.join(', ') || '(rien)'}`);

// Pas « une seule image » : un navigateur charge aussi ce qui approche du bord
// de l'écran, et la marge qu'il s'accorde lui appartient. Ce qui est à nous, et
// ce qu'on vérifie, c'est que TOUT ce qu'il va chercher est une petite largeur.
dit('le téléphone ne va chercher que de petites largeurs', true,
  largeurDe(mobileApres.urls).every((l) => l === '480'));
dit('et il en prend moins que le grand écran', true,
  mobileApres.urls.length <= largeApres.urls.length);
dit('le bureau, lui, reçoit une grande largeur', true,
  largeurDe(largeApres.urls).some((l) => l === '1440' || l === '1920'));
dit('donc un écran étroit télécharge STRICTEMENT moins d’octets qu’un large',
  true, mobileApres.images < largeApres.images);
dit('et moins que la même page sans ce travail', true, mobileApres.images < mobileAvant.images);
dit('sur un grand écran aussi', true, largeApres.images < largeAvant.images);
dit('le décalage de mise en page est nul', 0, mobileApres.decalage);
dit('sur un grand écran aussi', 0, largeApres.decalage);
// La page témoin ne saute pas non plus, et il faut le dire plutôt que de
// s'attribuer un gain : elle perd les attributs `width`/`height`, mais garde
// les styles en ligne des éléments du module, qui réservent déjà la place.
// Le décalage nul mesuré ici prouve donc que rien n'a été CASSÉ, pas qu'on a
// réparé quelque chose. Ce que les attributs apportent vraiment se joue sur
// les images du site du client et sur les pages où le CSS ne réserve rien —
// et cela, ce montage ne sait pas le mettre en scène.
dit('le témoin ne saute pas davantage : le gain n’est pas là', 0, mobileAvant.decalage);

console.log('\nEt après avoir tout fait défiler — la page entière');
const toutApres = await mesurer('/publie/apres.html', 390, 700, true);
const toutAvant = await mesurer('/publie/avant.html', 390, 700, true);
ligne('téléphone 390 — avant', toutAvant);
ligne('téléphone 390 — après', toutApres);
dit('la page entière reste plus légère qu’avant', true, toutApres.images < toutAvant.images);

const gain = (a, b) => Math.round((1 - b / a) * 100);
console.log('\nBilan');
console.log(`    téléphone, au chargement : ${ko(mobileAvant.images)} → ${ko(mobileApres.images)} `
  + `(−${gain(mobileAvant.images, mobileApres.images)} % d’octets d’images)`);
console.log(`    téléphone, page entière  : ${ko(toutAvant.images)} → ${ko(toutApres.images)} `
  + `(−${gain(toutAvant.images, toutApres.images)} %)`);
console.log(`    bureau, au chargement    : ${ko(largeAvant.images)} → ${ko(largeApres.images)} `
  + `(−${gain(largeAvant.images, largeApres.images)} %)`);
console.log(`    décalage de mise en page : ${mobileAvant.decalage} des deux côtés — `
  + 'le gain est ailleurs, voir la note');

dit('aucune erreur de script pendant tout l’essai', 0, plantages.length);
if (plantages.length) for (const p of plantages) console.log('      ' + p);

await page.close();
await navigateur.close();
serveur.close();

console.log(echecs.length ? `\n${echecs.length} échec(s)\n` : '\nTout est bon.\n');
process.exit(echecs.length ? 1 : 0);
