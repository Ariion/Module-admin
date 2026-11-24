#!/usr/bin/env node
/**
 * La boutique de démonstration tient-elle le contrat de Snipcart ?
 *
 *   SNIPCART_CLE=… npm run boutique-demo && npm run essai-snipcart
 *
 * Snipcart ne nous croit pas sur parole, et c'est heureux : avant
 * d'encaisser, il va LIRE la page désignée par `data-item-url` et vérifie
 * qu'il y retrouve le même identifiant au même prix. C'est ce qui empêche un
 * visiteur de changer le prix dans son navigateur avant de commander.
 *
 * Donc une commande peut échouer alors que la page est parfaite à l'œil :
 * l'erreur n'apparaît qu'au moment de payer, chez le client, devant son
 * propre acheteur. C'est le pire endroit pour la découvrir.
 *
 * Cet essai refait la vérification de Snipcart, en local et sans compte : il
 * suit chaque `data-item-url`, ouvre la page visée, et s'assure que l'article
 * y figure bien au même prix. Il attrape aussi les deux pièges qu'un
 * catalogue français tend tout seul — un prix écrit « 12,50 » au lieu de
 * « 12.50 », et un article expédiable sans poids, que Snipcart refuse.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BOUTIQUE = resolve(racine, 'essais/vercel/boutique');

if (!existsSync(BOUTIQUE)) {
  console.error('\n  Aucune boutique de démonstration. Fabriquez-la :\n'
    + '    SNIPCART_CLE=… npm run boutique-demo\n');
  process.exit(1);
}

const echecs = [];
const dit = (quoi, bon, detail = '') => {
  console.log(`  ${bon ? '✓' : '✗'} ${quoi}${bon ? '' : ` — ${detail}`}`);
  if (!bon) echecs.push(quoi);
};

const pages = readdirSync(BOUTIQUE).filter((f) => f.endsWith('.html'));
const lu = new Map(pages.map((f) => [f, readFileSync(resolve(BOUTIQUE, f), 'utf8')]));

/** Les articles d'une page, avec leurs attributs. */
function articlesDe(html) {
  return [...html.matchAll(/<a[^>]*class="[^"]*snipcart-add-item[^"]*"[^>]*>/g)].map((m) => {
    const attrs = {};
    for (const a of m[0].matchAll(/data-item-([a-z0-9-]+)="([^"]*)"/g)) attrs[a[1]] = a[2];
    return attrs;
  });
}

const tous = [...lu].flatMap(([f, html]) => articlesDe(html).map((a) => ({ ...a, page: f })));

if (!tous.length) {
  console.log('\n  Aucun article Snipcart : la boutique a été fabriquée sans clé.');
  console.log('  Rien à vérifier — relancez avec SNIPCART_CLE pour cet essai.\n');
  process.exit(0);
}

console.log(`\n${pages.length} page(s), ${tous.length} article(s)`);

console.log('\nLes attributs que Snipcart exige');
for (const champ of ['id', 'name', 'price', 'url']) {
  const sans = tous.filter((a) => !a[champ]);
  dit(`data-item-${champ} sur chaque article`, sans.length === 0,
    sans.map((a) => `${a.page}/${a.id || '?'}`).join(', '));
}

console.log('\nLes pièges d’un catalogue français');
// Snipcart lit un nombre, pas un prix écrit. « 12,50 » lui vaut 12.
const virgule = tous.filter((a) => !/^\d+(\.\d{1,2})?$/.test(a.price || ''));
dit('un prix en décimal à point, jamais à virgule', virgule.length === 0,
  virgule.map((a) => `${a.id}="${a.price}"`).join(', '));

// Sans poids, Snipcart ne sait pas calculer un port et refuse l'article.
const sansPoids = tous.filter((a) => a.shippable === 'true' && !(Number(a.weight) > 0));
dit('un poids sur chaque article expédiable', sansPoids.length === 0,
  sansPoids.map((a) => a.id).join(', '));

const doublons = [...new Map(tous.map((a) => [`${a.page}|${a.id}`, a])).keys()];
dit('aucun identifiant répété dans une même page', doublons.length === tous.length,
  `${tous.length - doublons.length} doublon(s)`);

console.log('\nLa vérification que Snipcart fera lui-même');
// C'est ici que se joue la commande. Un `data-item-url` qui pointe vers une
// page où l'article ne figure pas — « / » par exemple — passe inaperçu à
// l'écran et fait échouer le paiement.
for (const article of tous) {
  const cible = String(article.url || '').replace(/^\/boutique\/?/, '') || 'index.html';
  const html = lu.get(cible) || lu.get(cible.replace(/\/$/, '') + '.html');
  if (!html) {
    dit(`${article.id} — la page ${article.url} existe`, false, 'introuvable');
    continue;
  }
  const chezElle = articlesDe(html).find((a) => a.id === article.id);
  dit(`${article.id} — retrouvé sur ${article.url} au même prix`,
    !!chezElle && chezElle.price === article.price,
    chezElle ? `${chezElle.price} ≠ ${article.price}` : 'absent de cette page');
}

console.log('\nLes déclinaisons');
const avecDecl = tous.filter((a) => a['custom1-name']);
if (!avecDecl.length) {
  console.log('  — aucun produit décliné dans ce catalogue');
} else {
  // Snipcart ne lit que custom1 à custom3. Une quatrième ne provoquerait
  // aucune erreur : l'option disparaîtrait de la commande, en silence.
  const trop = tous.filter((a) => a['custom4-name']);
  dit('trois déclinaisons au plus par produit', trop.length === 0,
    trop.map((x) => x.id).join(', '));

  const incomplets = [];
  const valeursHorsListe = [];
  for (const article of avecDecl) {
    for (let n = 1; n <= 3; n += 1) {
      const nom = article[`custom${n}-name`];
      if (!nom) continue;
      const options = article[`custom${n}-options`];
      const valeur = article[`custom${n}-value`];
      if (!options || !valeur) { incomplets.push(`${article.id}/${nom}`); continue; }
      // Sans valeur par défaut valide, un acheteur qui ne touche pas au
      // sélecteur commande une déclinaison vide — et le vendeur ne sait pas
      // quelle taille expédier.
      const nues = options.split('|').map((o) => o.replace(/\[[^\]]*\]\s*$/, '').trim());
      if (!nues.includes(valeur)) valeursHorsListe.push(`${article.id}/${nom}="${valeur}"`);
    }
  }
  dit('chaque déclinaison a ses options ET une valeur par défaut',
    incomplets.length === 0, incomplets.join(', '));
  dit('la valeur par défaut figure parmi les options',
    valeursHorsListe.length === 0, valeursHorsListe.join(', '));

  // Le supplément « [+6.00] » est une notation d'outil. S'il atteint la
  // valeur envoyée, Snipcart reçoit une option qu'il ne reconnaît pas.
  const notation = avecDecl.filter((a) => [1, 2, 3]
    .some((n) => /\[/.test(a[`custom${n}-value`] || '')));
  dit('aucune valeur ne porte la notation de supplément',
    notation.length === 0, notation.map((x) => x.id).join(', '));

  const sansScript = [...lu].filter(([, html]) => /data-declinaison=/.test(html)
    && !/addEventListener/.test(html)).map(([f]) => f);
  // Les écouteurs ne se sérialisent pas : une page publiée sans ce script
  // montrerait des sélecteurs qui ne changent rien, ce qui est pire que pas
  // de sélecteur — l'acheteur croit avoir choisi sa taille.
  dit('les pages à sélecteurs portent le script qui les relie',
    sansScript.length === 0, sansScript.join(', '));
}

console.log('\nLe panier');
const accueil = lu.get('index.html') || '';
// Le balisage des articles est écrit dans tous les cas ; le panier lui-même
// n'est posé que si l'on a fourni une clé. Un panier absent faute de clé
// n'est pas un défaut — en faire un échec ferait rougir la batterie par
// défaut, et une batterie dont le rouge est normal n'est plus lue.
if (!/id="snipcart"/.test(accueil)) {
  console.log('  — non posé : boutique fabriquée sans SNIPCART_CLE');
  console.log('    Le balisage des articles, lui, vient d’être vérifié.');
} else {
  dit('la racine du panier est posée', true);
  dit('elle porte une clé', /data-api-key="[^"]+"/.test(accueil));
  dit('le script du panier est chargé', /snipcart\.js/.test(accueil));
}

console.log('\nLes visuels');
const images = [...new Set(tous.map((a) => a.image).filter(Boolean))];
const absentes = images.filter((src) => !existsSync(resolve(racine, 'essais/vercel', '.' + src)));
dit(`les ${images.length} visuels référencés existent`, absentes.length === 0,
  absentes.join(', '));
// Snipcart affiche cette image dans SON panier, servi depuis son domaine :
// une adresse relative y pointerait vers chez lui, et la vignette manquerait.
const relatives = images.filter((src) => !src.startsWith('/') && !/^https?:/.test(src));
dit('leurs adresses sont absolues', relatives.length === 0, relatives.join(', '));

console.log(echecs.length ? `\n${echecs.length} échec(s)\n` : '\nTout est bon.\n');
process.exit(echecs.length ? 1 : 0);
