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
  /* Un pot de miel : corps hexagonal suggéré par deux arêtes, couvercle à
     jupe, étiquette qui laisse voir la matière au-dessus et en dessous. */
  'miel.svg': SOCLE(`<defs>${matiere('m', '#eeb64a', '#9c5c12')}${matiere('cv', '#8a5516', '#5e390d')}</defs>
    <path d="M316 206h168v230q0 24-24 24H340q-24 0-24-24z" fill="url(#m)"/>
    <path d="M316 206h22v254h-22z" fill="#fff" opacity=".17"/>
    <rect x="300" y="176" width="200" height="40" rx="7" fill="url(#cv)"/>
    <rect x="300" y="210" width="200" height="9" fill="#4a2d0a" opacity=".45"/>
    <rect x="338" y="282" width="124" height="104" rx="4" fill="#fbf6ec" opacity=".95"/>
    <path d="M400 306l22 13v26l-22 13-22-13v-26z" fill="none" stroke="#9c5c12" stroke-width="5"/>
    <path d="M364 366h72" stroke="#9c5c12" stroke-width="5" stroke-linecap="round" opacity=".8"/>`),

  /* Un pot de confiture : coiffe de tissu, ficelle, et le fruit visible. */
  'confiture.svg': SOCLE(`<defs>${matiere('c', '#9c4169', '#45152c')}</defs>
    <path d="M324 232h152v204q0 24-24 24H348q-24 0-24-24z" fill="url(#c)"/>
    <path d="M324 232h20v228h-20z" fill="#fff" opacity=".13"/>
    <path d="M300 236q100-62 200 0-14 12-32 14-68 10-136 0-18-2-32-14z" fill="#e2d3b4"/>
    <path d="M302 244q98 26 196 0" fill="none" stroke="#b59c6d" stroke-width="7"/>
    <rect x="348" y="300" width="104" height="92" rx="4" fill="#fbf6ec" opacity=".95"/>
    <circle cx="386" cy="338" r="13" fill="#45152c" opacity=".8"/>
    <circle cx="412" cy="352" r="10" fill="#45152c" opacity=".6"/>
    <path d="M370 374h60" stroke="#9c4169" stroke-width="5" stroke-linecap="round"/>`, '#f2e9e5'),

  /* Un sachet kraft : soufflet, pli cousu, fenêtre et une feuille. */
  'tisane.svg': SOCLE(`<defs>${matiere('t', '#cbbf8c', '#6d6338')}</defs>
    <path d="M322 212h156l-12 248H334z" fill="url(#t)"/>
    <path d="M322 212h32l-8 248h-12z" fill="#fff" opacity=".15"/>
    <path d="M316 196h168l-6 20H322z" fill="#554d2a"/>
    <path d="M330 206h140" stroke="#3f3a1f" stroke-width="4" stroke-dasharray="9 7"/>
    <rect x="352" y="292" width="96" height="104" rx="4" fill="#fbf6ec" opacity=".92"/>
    <path d="M400 316c-26 16-28 48-2 66 26-16 28-50 2-66z" fill="#6d6338" opacity=".7"/>
    <path d="M398 324v56" stroke="#fbf6ec" stroke-width="3" opacity=".85"/>`, '#edeee1'),

  /* Un savon : pain à bords adoucis, bandeau de papier, sceau frappé. */
  /* Le sceau était une croix dans un cercle : ça lisait « pharmacie ». Une
     feuille gravée dit « savon artisanal » sans qu'on ait à l'expliquer. */
  'savon.svg': SOCLE(`<defs>${matiere('s', '#f6ecd8', '#bda583')}</defs>
    <rect x="276" y="282" width="286" height="162" rx="34" fill="url(#s)"/>
    <rect x="276" y="282" width="286" height="48" rx="24" fill="#fff" opacity=".45"/>
    <rect x="368" y="282" width="102" height="162" fill="#d9c9a6" opacity=".9"/>
    <rect x="368" y="282" width="10" height="162" fill="#000" opacity=".08"/>
    <rect x="460" y="282" width="10" height="162" fill="#000" opacity=".05"/>
    <path d="M419 332c-26 18-28 52-2 72 26-18 28-54 2-72z" fill="none"
      stroke="#8a7550" stroke-width="4.5"/>
    <path d="M418 342v54" stroke="#8a7550" stroke-width="4.5" stroke-linecap="round"/>`, '#f3f0e8'),

  /* Une planche : fil du bois, trou de suspension, chanfrein. */
  'planche.svg': SOCLE(`<defs>${matiere('p', '#cd9456', '#7a4a1e')}</defs>
    <rect x="232" y="246" width="376" height="196" rx="30" fill="url(#p)"/>
    <rect x="232" y="246" width="376" height="26" rx="13" fill="#fff" opacity=".2"/>
    <circle cx="566" cy="290" r="18" fill="#efe6d6"/>
    <circle cx="566" cy="290" r="18" fill="none" stroke="#6b3f17" stroke-width="3" opacity=".5"/>
    <path d="M268 296q90 10 180 0t120 6M268 342q110 12 200 0M268 388q80-10 170 0t130-6"
      stroke="#5d3a19" stroke-width="4" fill="none" opacity=".28" stroke-linecap="round"/>`, '#f0e7d8'),

  /* Un carnet : dos cousu, élastique, tranche de pages. */
  'carnet.svg': SOCLE(`<defs>${matiere('n', '#45667e', '#1b2f40')}</defs>
    <rect x="300" y="202" width="246" height="258" rx="7" fill="#e8e3d6"/>
    <rect x="286" y="196" width="252" height="258" rx="7" fill="url(#n)"/>
    <rect x="286" y="196" width="34" height="258" rx="5" fill="#16293a"/>
    <path d="M303 228v26M303 272v26M303 316v26M303 360v26"
      stroke="#d8cdb8" stroke-width="5" stroke-linecap="round"/>
    <rect x="470" y="196" width="9" height="258" fill="#0f1d29" opacity=".55"/>
    <rect x="352" y="300" width="108" height="4" rx="2" fill="#d8cdb8" opacity=".55"/>
    <rect x="352" y="324" width="76" height="4" rx="2" fill="#d8cdb8" opacity=".4"/>`, '#e9ebef'),
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
/**
 * Insère du HTML avant une balise fermante, sans que `$` ne soit interprété.
 *
 * `String.replace` avec une chaîne de remplacement donne un sens à `$` : `$&`
 * est la correspondance, `` $` `` ce qui précède, et `$'` TOUT CE QUI SUIT.
 * Le script du panier contient `'$'` — le symbole dollar de la table des
 * devises — qui a donc été remplacé par la fin du document, produisant un
 * script au milieu duquel apparaissait `</html>`. La page se chargeait, le
 * panier ne faisait rien, et la console disait seulement « Invalid or
 * unexpected token ».
 *
 * Une FONCTION de remplacement n'interprète rien. C'est la seule forme sûre
 * dès qu'on insère du contenu qu'on n'a pas écrit soi-même.
 */
const inserer = (html, balise, contenu) =>
  html.replace(balise, () => contenu + balise);

const rendre = (arbres, adresse) => page.evaluate(async ({ arbres, adresse, produits, cle, enseigne }) => {
  const { renderWidget } = await import('/admin/core/widgets.js');
  const { documentDemo } = await import('/admin/ui/back/apparence.js');
  const boutique = cle ? { mode: 'snipcart', cle } : { mode: 'panier' };

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
  if (!cle) {
    const { poserPanierLocal } = await import('/admin/core/boutique.js');
    poserPanierLocal(doc, { siteId: 'comptoir', pagePanier: '/boutique/panier.html' });
  }
  return documentDemo((a, d) => d.importNode(a, true), [], { id: 'naturel' })
    .replace('</head>', () => doc.head.innerHTML + '</head>')
    .replace('<html', `<html ${doc.documentElement.getAttribute('data-panier-cle')
      ? `data-panier-cle="${doc.documentElement.getAttribute('data-panier-cle')}"` : ''}`)
    .replace('</body>', () => doc.body.innerHTML + '</body>');
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

pages.push({
  fichier: 'panier.html',
  adresse: '/boutique/panier.html',
  arbres: [
    section(titre(ENSEIGNE, 'h2'), texte('<a href="./">← Poursuivre mes achats</a>')),
    section(titre('Votre panier', 'h3'),
      { type: 'panier', props: { libelle: 'Commander', suite: './', vide: 'Votre panier est vide.' } }),
  ],
});

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
  html = inserer(html, '</body>', `  <script>${SCRIPT_DECLINAISONS}<\/script>\n`);
  if (!CLE) {
    // Sans clé, le panier du MODULE prend le relais : on additionne, on
    // compte, on se souvient. Seul le paiement manque, et il est annoncé.
    return inserer(html, '</body>', `
  <div style="position:fixed;left:0;bottom:0;background:#111;color:#fff;
    font:12px/1.4 system-ui,sans-serif;padding:9px 14px;letter-spacing:.04em">
    Panier du module actif. Le paiement demande une clé Snipcart.
  </div>
`);
  }
  return inserer(html, '</body>', `
  <link rel="stylesheet" href="https://cdn.snipcart.com/themes/v3.7.1/default/snipcart.css">
  <div id="snipcart" hidden data-api-key="${CLE}" data-config-modal-style="side"></div>
  <script async src="https://cdn.snipcart.com/themes/v3.7.1/default/snipcart.js"><\/script>
`);
}

await navigateur.close();
serveur.close();
console.log(`\n  ${ecrites} page(s) écrite(s) dans essais/vercel/boutique/`);
console.log(CLE ? '  Panier Snipcart actif.\n' : '  Panier du module actif (paiement non branché).\n');
