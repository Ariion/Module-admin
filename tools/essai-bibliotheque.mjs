#!/usr/bin/env node
/**
 * La bibliothèque de modèles tient-elle ses promesses ?
 *
 *   npm run essai-bibliotheque
 *
 * Deux d'entre elles se cassent en silence. La première : la vignette et le
 * bouton doivent passer par la MÊME fabrique — si elles divergent, on choisit
 * une mise en page et on en obtient une autre, sans qu'aucune erreur ne le
 * dise. La seconde : les scènes dessinées doivent VARIER d'un métier à
 * l'autre, sinon le filtre de métier est un bouton qui ne change rien, et un
 * réglage sans effet visible fait douter de tous les autres.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
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
const page = await navigateur.newPage({ viewport: { width: 1280, height: 900 } });

const requetes = [];
page.on('request', (r) => requetes.push(r.url()));
const plantages = [];
page.on('pageerror', (e) => plantages.push(String(e.message).slice(0, 140)));
await page.goto(`http://127.0.0.1:${port}/index.html`);

const echecs = [];
const dit = (nom, bon, detail = '') => {
  if (!bon) echecs.push(nom);
  console.log(`  ${bon ? '✓' : '✗'} ${nom}${bon ? '' : ' — ' + detail}`);
};

console.log('\nLa bibliothèque de modèles\n');

const lu = await page.evaluate(async () => {
  const b = await import('/admin/core/bibliotheque.js');
  const { documentDemo } = await import('/admin/ui/back/apparence.js');
  const { renderWidget } = await import('/admin/core/widgets.js');
  const { METIERS } = await import('/admin/core/brief.js');
  const reglage = { id: 'chaleureux', portee: 'site' };

  const textes = (sections) => {
    const sortie = [];
    const p = (n) => {
      for (const x of n || []) {
        if (x.props?.text) sortie.push(String(x.props.text));
        if (x.props?.html) sortie.push(String(x.props.html));
        if (x.children) p(x.children);
      }
    };
    p(sections);
    return sortie;
  };
  const visuels = (sections) => {
    const sortie = [];
    const p = (n) => {
      for (const x of n || []) {
        for (const cle of ['image', 'src']) if (x.props?.[cle]) sortie.push(x.props[cle]);
        if (x.children) p(x.children);
      }
    };
    p(sections);
    return sortie;
  };

  // Chaque modèle, rendu pour un métier : rien ne doit lever.
  const rendus = {};
  for (const m of b.MODELES) {
    const sections = b.pageDuModele(m.id, { metier: 'restaurant', theme: reglage });
    rendus[m.id] = {
      sections: sections.length,
      html: documentDemo(renderWidget, sections, reglage).length,
      visuels: visuels(sections).length,
    };
  }

  // Deux appels successifs doivent rendre la même chose : c'est ce qui fait
  // que le bouton pose ce que la vignette montrait.
  const sansCles = (x) => JSON.stringify(x, (cle, valeur) => (cle === 'key' ? undefined : valeur));
  const a = sansCles(b.pageDuModele('editorial', { metier: 'beaute', theme: reglage }));
  const c = sansCles(b.pageDuModele('editorial', { metier: 'beaute', theme: reglage }));

  // Les scènes doivent différer d'un métier à l'autre.
  const parMetier = {};
  for (const m of METIERS) {
    const s = b.pageDuModele('editorial', { metier: m.id, theme: reglage });
    parMetier[m.id] = { visuel: visuels(s)[0] || '', textes: textes(s).slice(0, 3) };
  }

  // Une page déjà écrite ne doit pas être réécrite par les mots du métier.
  const dejaEcrite = [{ type: 'section', props: {}, children: [
    { type: 'heading', props: { text: 'Mon vrai titre' } },
    { type: 'text', props: { html: 'Ma vraie phrase.' } },
  ] }];
  b.poserLesMots(dejaEcrite, b.briefDuMetier('restaurant'));

  return {
    modeles: b.MODELES.length,
    familles: b.TYPES_MODELE.length,
    rendus,
    stable: a === c,
    parMetier,
    titreGarde: dejaEcrite[0].children[0].props.text,
    phraseGardee: dejaEcrite[0].children[1].props.html,
    inconnu: b.pageDuModele('nexistepas', { metier: 'restaurant' }).length,
  };
});

dit('onze modèles, six familles', lu.modeles === 11 && lu.familles === 6,
  `${lu.modeles} modèles / ${lu.familles} familles`);

const vides = Object.entries(lu.rendus).filter(([, r]) => !r.sections || r.html < 500);
dit('chaque modèle se construit et se rend', vides.length === 0,
  vides.map(([id]) => id).join(', '));
// Tous les modèles n'ont pas d'image, et c'est voulu : une page de contact
// est un formulaire et des coordonnées. On vérifie donc que ceux qui ont des
// emplacements les reçoivent, pas que tous en aient.
const avecVisuel = Object.values(lu.rendus).filter((r) => r.visuels > 0).length;
dit(`les modèles à emplacements reçoivent leurs scènes (${avecVisuel} sur 11)`,
  avecVisuel >= 8, String(avecVisuel));
dit('un modèle inconnu ne lève pas, il rend une page vide', lu.inconnu === 0, String(lu.inconnu));

console.log('\nCe que la vignette montre est ce que le bouton pose');
dit('deux appels rendent la même structure et les mêmes mots', lu.stable);

console.log('\nLe métier change réellement la page');
const visuelsDistincts = new Set(Object.values(lu.parMetier).map((x) => x.visuel));
dit(`les scènes diffèrent d’un métier à l’autre (${visuelsDistincts.size} sur 12)`,
  visuelsDistincts.size >= 11, [...visuelsDistincts].length + ' distinctes');
dit('le restaurant porte son enseigne',
  lu.parMetier.restaurant.textes.join(' ').includes('La Table du Marché'),
  lu.parMetier.restaurant.textes.join(' | '));
dit('le bâtiment porte la sienne',
  lu.parMetier.batiment.textes.join(' ').includes('Delaunay'),
  lu.parMetier.batiment.textes.join(' | '));
// L'intention n'est pas « ce doit être un dessin » mais « rien ne part vers
// un tiers ». Un dessin est une donnée en ligne, une photo est un fichier
// servi par le site lui-même : les deux satisfont la règle, une adresse
// http(s) ne la satisferait pas.
dit('aucun visuel ne dépend d’un serveur tiers',
  Object.values(lu.parMetier).every((x) => !/^https?:/i.test(x.visuel)),
  'un visuel pointe vers un hôte extérieur');

console.log('\nCe qui a déjà été écrit n’est jamais écrasé');
dit('le titre du client est gardé', lu.titreGarde === 'Mon vrai titre', lu.titreGarde);
dit('sa phrase aussi', lu.phraseGardee === 'Ma vraie phrase.', lu.phraseGardee);

console.log('\nRien ne sort de la page');
const externes = requetes.filter((u) => !u.includes(`127.0.0.1:${port}`));
dit(`aucune requête vers l’extérieur (${externes.length})`, externes.length === 0, externes.slice(0, 2).join(' '));
dit('aucune exception pendant tout l’essai', plantages.length === 0, plantages.slice(0, 2).join(' | '));

await navigateur.close();
serveur.close();
console.log(echecs.length ? `\n${echecs.length} échec(s)\n` : '\nTout est bon.\n');
process.exit(echecs.length ? 1 : 0);
