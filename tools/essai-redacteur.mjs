#!/usr/bin/env node
/**
 * Le rédacteur et le brief qui l'alimente : la partie du module qui écrit une
 * page entière à la place de quelqu'un qui « ne sait pas quoi mettre ».
 *
 *   npm run essai-redacteur
 *
 * C'est le cœur du produit — la promesse qui le distingue d'un simple
 * éditeur de blocs — et jusqu'ici rien ne le protégeait d'une régression
 * silencieuse. Ce qui compte le plus à vérifier n'est pas que ça ne plante
 * pas, mais trois promesses précises faites dans les commentaires du code
 * lui-même : un texte du client n'est jamais écrasé, un témoignage n'est
 * jamais inventé, et du texte saisi par le client ne devient jamais du HTML
 * actif une fois posé dans la page.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  METIERS, metierById, briefVide, briefUtilisable, prestationsDuBrief,
  phrasesDesAtouts, motsClesPhotos, themeSuggere,
} from '../admin/core/brief.js';
import { redigerPage } from '../admin/core/redacteur.js';
import { illustrations, estIllustration } from '../admin/core/illustrations.js';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const echecs = [];
const dit = (quoi, bon, detail = '') => {
  console.log(`  ${bon ? '✓' : '✗'} ${quoi}${bon ? '' : ` — ${detail}`}`);
  if (!bon) echecs.push(quoi);
};

const texteDe = (sections) => {
  const sortie = [];
  const p = (noeuds) => {
    for (const n of noeuds || []) {
      if (n.props?.text) sortie.push(String(n.props.text));
      if (n.props?.html) sortie.push(String(n.props.html));
      if (n.children) p(n.children);
    }
  };
  p(sections);
  return sortie.join(' § ');
};

/* --------------------------------------------- un brief vide n'écrit rien */

console.log('\nUn brief sans activité ne produit rien');
const vide = redigerPage(briefVide());
dit('aucune section', vide.sections.length === 0, String(vide.sections.length));
dit('briefUtilisable le confirme', !briefUtilisable(briefVide()));
dit('un brief avec activité devient utilisable',
  briefUtilisable({ ...briefVide(), activite: 'Ma boutique' }));

/* --------------------------------------------- chaque métier écrit une page complète */

console.log('\nChaque métier écrit une page complète, sans planter');
const briefDe = (metier) => ({
  ...briefVide(), metier, activite: 'Mon activité', ville: 'Lyon',
});

const parMetier = {};
for (const m of METIERS) {
  const plan = redigerPage(briefDe(m.id));
  parMetier[m.id] = plan;
}
const incomplets = Object.entries(parMetier).filter(([, p]) => p.sections.length !== 5);
dit(`les ${METIERS.length} métiers produisent chacun 5 sections`, incomplets.length === 0,
  incomplets.map(([id, p]) => `${id}:${p.sections.length}`).join(', '));

const requetesVides = Object.entries(parMetier).filter(([, p]) => !p.requetes.length);
dit('chaque métier fournit des mots-clés de recherche photo', requetesVides.length === 0,
  requetesVides.map(([id]) => id).join(', '));

/* --------------------------------------------- l'ambiance suit le métier */

console.log('\nL\'ambiance proposée suit le métier, sauf choix explicite');
dit('un restaurant → chaleureux', themeSuggere({ metier: 'restaurant' }) === 'chaleureux');
dit('un bâtiment → pro', themeSuggere({ metier: 'batiment' }) === 'pro');
dit('un ton "dynamique" l\'emporte sur le métier',
  themeSuggere({ metier: 'batiment', ton: 'dynamique' }) === 'pep');
dit('métier inconnu → repli sobre', themeSuggere({ metier: 'nexistepas' }) === 'sobre');

/* --------------------------------------------- les scènes dessinées varient avec le métier */

console.log('\nSans banque d\'images, les scènes dessinées varient par métier');
const scenesParMetier = new Set(
  METIERS.map((m) => illustrations(null, m.id)[0]?.url).filter(Boolean),
);
dit(`au moins ${METIERS.length - 1} rendus distincts sur ${METIERS.length} métiers`,
  scenesParMetier.size >= METIERS.length - 1, String(scenesParMetier.size));
// « autre » peut désormais être photographié — ce n'est plus la référence
// à laquelle comparer. La vraie garantie reste que personne ne tombe sur
// rien : un métier absent reçoit quand même une scène dessinée, valide.
const repli = illustrations(null, 'nexistepas')[0];
dit('un métier non reconnu retombe sur une scène dessinée, jamais sur rien',
  !!repli?.url && estIllustration(repli.url), JSON.stringify(repli));

/* --------------------------------------------- rien écrit par le client n'est écrasé */

console.log('\nCe que le client a tapé n\'est jamais remplacé');
const briefAvecPrestations = {
  ...briefVide(), metier: 'boutique', activite: 'Mon atelier',
  prestations: 'Mes bougies artisanales|Coulées à la main, parfums maison.\nLivraison locale',
};
const prestations = prestationsDuBrief(briefAvecPrestations);
dit('le titre saisi est gardé tel quel', prestations[0].titre === 'Mes bougies artisanales',
  prestations[0].titre);
dit('la description saisie est gardée', prestations[0].texte === 'Coulées à la main, parfums maison.');
dit('une ligne sans description reçoit celle du métier, pas un vide',
  prestations[1].titre === 'Livraison locale' && !!prestations[1].texte && !prestations[1].propre);

const texteIA = { prestations: [{ titre: 'ignoré', texte: 'Texte proposé par l\'IA.' }] };
const planAvecIA = redigerPage(briefAvecPrestations, { textes: texteIA });
dit('un texte proposé par l\'IA ne remplace jamais un titre déjà saisi par le client',
  texteDe(planAvecIA.sections).includes('Mes bougies artisanales'));

const briefAvecPhrase = { ...briefVide(), metier: 'autre', activite: 'X', phrase: 'Ma phrase à moi.' };
dit('la phrase d\'accroche du client passe avant celle du métier',
  texteDe(redigerPage(briefAvecPhrase).sections).includes('Ma phrase à moi.'));

/* --------------------------------------------- aucun témoignage n'est inventé */

console.log('\nAucun témoignage n\'est jamais inventé');
const planTemoignages = redigerPage(briefDe('restaurant'));
const section = planTemoignages.sections.find((s) =>
  JSON.stringify(s).includes('temoignages'));
const trouveTemoignages = (n) => {
  for (const x of n || []) {
    if (x.type === 'temoignages') return x;
    const sous = trouveTemoignages(x.children);
    if (sous) return sous;
  }
  return null;
};
const bloc = trouveTemoignages(planTemoignages.sections);
dit('le bloc avis existe et porte une consigne, jamais un nom inventé',
  !!bloc && bloc.props.items.includes('Recopiez ici') && !/[A-ZÀ-Ü][a-zà-ü]+ (?:,|\|) [A-ZÀ-Ü]/.test(bloc.props.items));
dit('le bloc avis est marqué comme exemple à remplir', bloc?.props.exemple === true);

/* --------------------------------------------- rien ne sort vers un tiers */

console.log('\nAucun visuel de repli ne pointe vers un hôte extérieur');
const toutesLesScenes = METIERS.flatMap((m) => illustrations(null, m.id).map((i) => i.url));
dit('toutes les scènes sont des données en ligne (data:), jamais une URL http(s)',
  toutesLesScenes.every((u) => !/^https?:/i.test(u)));

/* --------------------------------------------- rien de saisi ne devient du HTML actif */

// `redigerPage` elle-même ne doit rien échapper qui parte en `text` — ce
// prop-là se pose par `textContent`, qui échappe tout seul au rendu. Vérifier
// la sortie brute de `redigerPage` jugerait donc la mauvaise frontière. La
// vraie frontière, c'est `renderWidget` : un vrai navigateur, le même chemin
// que le site publié.
console.log('\nUne fois rendu, aucun champ du brief ne devient du HTML actif');

const TYPES = { '.html': 'text/html', '.js': 'text/javascript' };
const PAGE = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>essai</title></head><body></body></html>';
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
  } catch { res.writeHead(404).end('non'); }
});
const port = await new Promise((ok) => serveur.listen(0, () => ok(serveur.address().port)));
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
const navigateur = await chromium.launch();
const page = await navigateur.newPage();
const plantages = [];
page.on('pageerror', (e) => plantages.push(String(e.message).slice(0, 140)));
await page.goto(`http://127.0.0.1:${port}/index.html`);

const rendu = await page.evaluate(async () => {
  const { redigerPage } = await import('/admin/core/redacteur.js');
  const { briefVide } = await import('/admin/core/brief.js');
  const { documentDemo } = await import('/admin/ui/back/apparence.js');
  const { renderWidget } = await import('/admin/core/widgets.js');

  const brief = {
    ...briefVide(), metier: 'autre',
    activite: '<img src=x onerror="window.__declenche=true">',
    ville: '<script>window.__declenche=true</script>',
    phrase: '"><svg onload="window.__declenche=true">',
    telephone: '<b>01 23</b>', courriel: 'a@b.fr"><script>window.__declenche=true</script>',
  };
  const plan = redigerPage(brief);
  const html = documentDemo(renderWidget, plan.sections, { id: 'sobre', portee: 'site' });
  return { html, declenche: window.__declenche === true };
});

dit('aucun gestionnaire injecté ne s’exécute au rendu', rendu.declenche !== true);
dit('aucune balise <script> n’apparaît dans le document rendu',
  !/<script[\s>]/i.test(rendu.html), rendu.html.match(/<script[^>]*>/i)?.[0] || '');
dit('le texte saisi apparaît échappé, jamais comme balise active',
  rendu.html.includes('&lt;img src=x onerror=') || rendu.html.includes('&lt;img src="x" onerror='));
dit('aucune exception pendant le rendu', plantages.length === 0, plantages.join(' | '));

await navigateur.close();
serveur.close();

console.log(echecs.length ? `\n${echecs.length} échec(s)\n` : '\nTout est bon.\n');
process.exit(echecs.length ? 1 : 0);
