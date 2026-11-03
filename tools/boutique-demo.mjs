#!/usr/bin/env node
/**
 * Fabrique la boutique de démonstration, en HTML statique.
 *
 *   SNIPCART_CLE=... npm run boutique-demo
 *
 * Elle sert à répondre à une question qu'un prospect pose toujours : « on
 * peut voir ce que ça donne ? ». Pas une capture — une boutique où il ajoute
 * au panier, remplit son adresse, paie avec une carte de test et reçoit sa
 * confirmation.
 *
 * POURQUOI DU HTML STATIQUE, ET NON LA PAGE VIVANTE. Snipcart ne nous croit
 * pas sur parole : avant d'encaisser, il va LIRE la page désignée par
 * `data-item-url` et vérifie qu'il y retrouve le même identifiant au même
 * prix. C'est ce qui empêche un visiteur de changer le prix dans son
 * navigateur. Son robot ne nous est pas garanti exécuter le JavaScript : une
 * page dont les produits n'existent qu'après coup ne se validerait pas.
 *
 * Ce n'est pas une entorse au fonctionnement du module, c'est exactement ce
 * qu'il produit : `core/bake.js` charge la page, applique le contenu, et
 * sérialise le résultat. Ce script-ci fait le même geste avec les mêmes
 * fonctions — `renderWidget` du site, `boutonAchat` de `core/boutique.js` —
 * pour que ce qu'on montre soit ce qu'on livre.
 *
 * La clé Snipcart ne vit pas dans le dépôt. Sans `SNIPCART_CLE`, le script
 * écrit quand même la boutique, avec un repère visible : on peut tout
 * regarder, le panier seul reste fermé.
 *
 * Le balisage `data-item-*`, lui, est écrit dans tous les cas — c'est du HTML
 * inerte tant que Snipcart n'est pas chargé. C'est ce qui permet à
 * `npm run essai-snipcart` de vérifier la boutique sans qu'une fausse clé
 * dorme dans le dépôt, et sans charger un panier qui ne pourrait pas
 * s'ouvrir.
 */
import { SCRIPT_DECLINAISONS } from '../admin/core/boutique.js';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SORTIE = resolve(racine, 'essais/vercel/boutique');
const CLE = process.env.SNIPCART_CLE || '';

/**
 * Le catalogue. Une enseigne inventée, des produits crédibles.
 *
 * Chacun porte un POIDS : c'est lui qui fait calculer des frais de port, donc
 * qui rend le tunnel vrai. Un catalogue sans poids donne une démonstration où
 * la livraison est toujours gratuite, ce qui ne montre rien.
 */
const PRODUITS = [
  { id: 'miel-500', nom: 'Miel de montagne, 500 g', categorie: 'Épicerie', prix: 12.5, poids: 650,
    description: 'Récolté à 1 400 m, en pot de verre consigné.', image: '/boutique/img/miel.svg',
    declinaisons: [{ nom: 'Contenance', options: ['250 g', '500 g[+5.50]'] }] },
  { id: 'confiture-myrtille', nom: 'Confiture de myrtille', categorie: 'Épicerie', prix: 7.9, poids: 400,
    description: 'Myrtilles sauvages, 60 % de fruits, cuite au chaudron.', image: '/boutique/img/confiture.svg' },
  { id: 'tisane-alpages', nom: 'Tisane des alpages', categorie: 'Épicerie', prix: 9, poids: 80,
    description: 'Mélange de huit plantes cueillies à la main.', image: '/boutique/img/tisane.svg' },
  { id: 'savon-chevre', nom: 'Savon au lait de chèvre', categorie: 'Maison', prix: 6.5, poids: 120,
    description: 'Saponifié à froid, sans parfum de synthèse.', image: '/boutique/img/savon.svg',
    declinaisons: [{ nom: 'Parfum', options: ['Lavande', 'Miel', 'Sans parfum'] }] },
  { id: 'planche-noyer', nom: 'Planche à découper, noyer', categorie: 'Maison', prix: 48, poids: 1200,
    description: 'Taillée dans une seule pièce, huilée au lin.', image: '/boutique/img/planche.svg' },
  { id: 'carnet-relie', nom: 'Carnet relié à la main', categorie: 'Papeterie', prix: 18, poids: 300,
    description: 'Papier 120 g, couture apparente, 144 pages.', image: '/boutique/img/carnet.svg',
    declinaisons: [
      { nom: 'Format', options: ['A6', 'A5[+6.00]'] },
      { nom: 'Couverture', options: ['Bleu nuit', 'Terre', 'Écru'] },
    ] },
];

/**
 * Les visuels produit, dessinés.
 *
 * Une boutique de démonstration sans images ne démontre rien, et des photos
 * d'une banque demanderaient de relire une licence avant de revendre quoi que
 * ce soit. Ces six-là sont dessinées sur place, dans la même langue que les
 * illustrations du module : une lumière qui vient du haut-gauche, une ombre
 * portée décalée à l'opposé, des objets qui s'assombrissent vers le bas.
 *
 * Elles ne cherchent pas à passer pour des photographies. Elles disent ce que
 * contient le pot, ce qui suffit à juger une mise en page — et le client les
 * remplace par les siennes d'un clic, ce qui est l'ordre voulu.
 */
const SOCLE = (contenu, fond = '#efe9df') => `<svg xmlns="http://www.w3.org/2000/svg"
  viewBox="222 152 396 372" width="792" height="744">
  <defs>
    <linearGradient id="f" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${fond}"/><stop offset="1" stop-color="#e3dbcd"/>
    </linearGradient>
    <radialGradient id="jour" cx=".34" cy=".18" r=".8">
      <stop offset="0" stop-color="#fff" stop-opacity=".6"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <filter id="douce" x="-45%" y="-45%" width="190%" height="190%">
      <feGaussianBlur stdDeviation="13"/></filter>
  </defs>
  <rect width="800" height="600" fill="url(#f)"/>
  <rect width="800" height="600" fill="url(#jour)"/>
  <ellipse cx="420" cy="470" rx="170" ry="26" fill="#3a2f22" opacity=".17" filter="url(#douce)"/>
  ${contenu}
</svg>`;

/** Un dégradé d'objet : clair en haut, sombre en bas. */
const matiere = (id, haut, bas) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${haut}"/><stop offset="1" stop-color="${bas}"/></linearGradient>`;

const VISUELS = {
  'miel.svg': SOCLE(`<defs>${matiere('m', '#e5a53a', '#a9681a')}</defs>
    <rect x="310" y="210" width="180" height="250" rx="26" fill="url(#m)"/>
    <rect x="296" y="178" width="208" height="42" rx="12" fill="#8a5516"/>
    <rect x="334" y="286" width="132" height="92" rx="8" fill="#fbf6ec" opacity=".93"/>
    <path d="M360 332h84M360 352h60" stroke="#a9681a" stroke-width="7" stroke-linecap="round"/>`),
  'confiture.svg': SOCLE(`<defs>${matiere('c', '#8e3f63', '#4d1b33')}</defs>
    <rect x="320" y="226" width="160" height="234" rx="22" fill="url(#c)"/>
    <path d="M306 226q94-54 188 0z" fill="#d9c7a6"/>
    <rect x="306" y="214" width="188" height="26" rx="10" fill="#c6b08a"/>
    <rect x="344" y="300" width="112" height="78" rx="8" fill="#fbf6ec" opacity=".93"/>`, '#f0e7e2'),
  'tisane.svg': SOCLE(`<defs>${matiere('t', '#b9b282', '#6f6a42')}</defs>
    <path d="M318 198h164l-14 262H332z" fill="url(#t)"/>
    <path d="M318 198q82-34 164 0z" fill="#5d5936"/>
    <rect x="350" y="300" width="100" height="92" rx="8" fill="#fbf6ec" opacity=".9"/>
    <path d="M400 330c-26 18-26 44 0 56 26-12 26-38 0-56z" fill="#6f6a42" opacity=".75"/>`, '#eceee2'),
  'savon.svg': SOCLE(`<defs>${matiere('s', '#f3ead9', '#c9b99c')}</defs>
    <rect x="296" y="300" width="248" height="132" rx="20" fill="url(#s)"/>
    <rect x="296" y="300" width="248" height="34" rx="16" fill="#fff" opacity=".45"/>
    <circle cx="420" cy="366" r="34" fill="none" stroke="#9c8b6d" stroke-width="5" opacity=".6"/>`, '#f1eee6'),
  'planche.svg': SOCLE(`<defs>${matiere('p', '#c08c52', '#7a4f24')}</defs>
    <rect x="236" y="250" width="368" height="190" rx="26" fill="url(#p)"/>
    <circle cx="566" cy="290" r="17" fill="#e3dbcd"/>
    <path d="M276 300h240M276 340h200M276 380h260" stroke="#5d3a19" stroke-width="5"
      opacity=".3" stroke-linecap="round"/>`, '#efe6d6'),
  'carnet.svg': SOCLE(`<defs>${matiere('n', '#3f5d72', '#1f3647')}</defs>
    <rect x="286" y="212" width="268" height="248" rx="12" fill="url(#n)"/>
    <rect x="286" y="212" width="30" height="248" fill="#16293a"/>
    <path d="M301 246v22M301 288v22M301 330v22M301 372v22" stroke="#d8cdb8"
      stroke-width="5" stroke-linecap="round"/>
    <rect x="356" y="300" width="146" height="4" rx="2" fill="#d8cdb8" opacity=".6"/>
    <rect x="356" y="326" width="104" height="4" rx="2" fill="#d8cdb8" opacity=".45"/>`, '#e8eaee'),
};

const ENSEIGNE = 'Comptoir du Centre';
const VILLE = 'Annecy';

/* ------------------------------------------------------------------ serveur
   Les modules du site s'importent par leur adresse : on sert le dépôt le
   temps de la fabrication, comme le ferait l'hébergement. */
const TYPES = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const serveur = createServer((req, res) => {
  const url = req.url.split('?')[0];
  let corps;
  try { corps = readFileSync(resolve(racine, '.' + url)); }
  catch { res.writeHead(404); res.end('non'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(url)] || 'text/plain' });
  res.end(corps);
});
const port = await new Promise((ok) => serveur.listen(0, () => ok(serveur.address().port)));

const require = createRequire('/opt/node-tools/package.json');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.error('\n  Playwright est introuvable.\n'); serveur.close(); process.exit(1); }

const navigateur = await chromium.launch();
const page = await navigateur.newPage();
await page.goto(`http://127.0.0.1:${port}/essais/vercel/modeles.html`);

/**
 * Rend une page de la boutique.
 *
 * Tout se passe DANS la page : `renderWidget` a besoin d'un vrai document, et
 * c'est le même que celui du site. Le `data-item-url` est posé à la main, car
 * `boutonAchat` le lit sur `doc.location` — absent d'un document fabriqué
 * hors écran, il y vaudrait « / », et Snipcart irait chercher le produit sur
 * une page où il ne figure pas.
 */
const rendre = (arbres, adresse) => page.evaluate(async ({ arbres, adresse, produits, cle, enseigne }) => {
  const { renderWidget } = await import('/admin/core/widgets.js');
  const { documentDemo } = await import('/admin/ui/back/apparence.js');
  const boutique = { mode: 'snipcart', cle };

  // On rend dans le document de la page, puis on relit : c'est le seul moyen
  // d'avoir un `doc.location` réel, donc un `data-item-url` juste.
  const bac = document.createElement('div');
  bac.style.display = 'none';
  document.body.appendChild(bac);
  const rendus = [];
  for (const arbre of arbres) {
    const el = renderWidget(arbre, document, { produits, boutique });
    if (el) { bac.appendChild(el); rendus.push(el); }
  }
  for (const lien of bac.querySelectorAll('.snipcart-add-item')) {
    lien.setAttribute('data-item-url', adresse);
  }
  const doc = document.implementation.createHTMLDocument(enseigne);
  for (const el of rendus) doc.body.appendChild(doc.importNode(el, true));
  bac.remove();
  return documentDemo((a, d) => d.importNode(a, true), [], { id: 'naturel' })
    .replace('</body>', doc.body.innerHTML + '</body>');
}, { arbres, adresse, produits: PRODUITS, cle: CLE, enseigne: ENSEIGNE });

const section = (...enfants) => ({ type: 'section', props: { maxWidth: 1080, padding: 28 }, children: enfants });
const titre = (text, level = 'h2') => ({ type: 'heading', props: { text, level, align: 'center' } });
const texte = (html) => ({ type: 'text', props: { html, align: 'center' } });

/* ------------------------------------------------------- la page catalogue */
const pages = [
  {
    fichier: 'index.html',
    adresse: '/boutique/',
    arbres: [
      section(titre(ENSEIGNE, 'h2'), texte(`Produits d’artisans, choisis un par un, à ${VILLE}.`)),
      section(titre('La boutique', 'h3'),
        { type: 'catalogue', props: { categorie: '', colonnes: 3, libelle: 'Ajouter au panier' } }),
    ],
  },
];

/* --------------------------------------- une page par produit (la « fiche ») */
for (const produit of PRODUITS) {
  pages.push({
    fichier: `${produit.id}.html`,
    adresse: `/boutique/${produit.id}.html`,
    arbres: [
      section(titre(ENSEIGNE, 'h2'), texte('<a href="./">← Retour à la boutique</a>')),
      section({ type: 'produit', props: { produit: produit.id, libelle: 'Ajouter au panier', montrerPrix: true } }),
    ],
  });
}

mkdirSync(resolve(SORTIE, 'img'), { recursive: true });
for (const [nom, svg] of Object.entries(VISUELS)) {
  writeFileSync(resolve(SORTIE, 'img', nom), svg.replace(/\s{2,}/g, ' ').trim());
}
mkdirSync(SORTIE, { recursive: true });
let ecrites = 0;
for (const p of pages) {
  let html = await rendre(p.arbres, p.adresse);
  html = poserPanier(html);
  writeFileSync(resolve(SORTIE, p.fichier), html);
  ecrites += 1;
}

/** Ajoute le panier Snipcart au document, ou le repère qui dit ce qui manque. */
function poserPanier(html) {
  // Le même texte que celui qu'injecte `poserPanier` du module : les
  // sélecteurs de déclinaison existent dès que le produit en a, que le
  // panier soit ouvert ou non.
  html = html.replace('</body>', `  <script>${SCRIPT_DECLINAISONS}<\/script>\n</body>`);
  if (!CLE) {
    return html.replace('</body>', `
  <div style="position:fixed;left:0;right:0;bottom:0;background:#1B3560;color:#fff;
    font:14px/1.5 system-ui,sans-serif;padding:12px 18px;text-align:center">
    Panier fermé : lancez <code>SNIPCART_CLE=… npm run boutique-demo</code> avec votre clé de test.
  </div>
</body>`);
  }
  return html.replace('</body>', `
  <link rel="stylesheet" href="https://cdn.snipcart.com/themes/v3.7.1/default/snipcart.css">
  <div id="snipcart" hidden data-api-key="${CLE}" data-config-modal-style="side"></div>
  <script async src="https://cdn.snipcart.com/themes/v3.7.1/default/snipcart.js"><\/script>
</body>`);
}

await navigateur.close();
serveur.close();
console.log(`\n  ${ecrites} page(s) écrite(s) dans essais/vercel/boutique/`);
console.log(CLE ? '  Panier Snipcart actif.\n' : '  Sans clé : le panier reste fermé.\n');
