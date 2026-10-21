/**
 * Les trente-six scènes dessinées : cohérence interne de chaque SVG.
 *
 * Les primitives se partagent des dégradés et des filtres déclarés une seule
 * fois, par `fond()`. C'est ce qui permet de changer la lumière des trente-six
 * d'un seul geste — et c'est exactement ce qui peut casser en silence : une
 * scène écrite sans `fond()` référencerait des `url(#id)` inexistants, et le
 * navigateur ne dirait rien. Il ne rendrait simplement ni l'ombre, ni le halo.
 * Un essai qui regarde les images ne verrait rien non plus, parce que l'absence
 * d'un flou ne saute pas aux yeux. D'où ce contrôle, purement textuel.
 */
import { illustrations, METIERS_ILLUSTRES } from '../admin/core/illustrations.js';

const echecs = [];
const dit = (quoi, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  NON '} ${quoi}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) echecs.push(quoi);
};

const THEMES = ['chaleureux', 'nuit', 'naturel', 'elegant', 'sobre', 'pep', 'pro', 'magazine', 'brut'];
const metiers = [...METIERS_ILLUSTRES, 'autre'];

console.log(`\n${metiers.length} métiers × ${THEMES.length} thèmes`);

let scenes = 0;
const orphelins = [];
const sansFond = [];

for (const theme of THEMES) {
  for (const metier of metiers) {
    for (const image of illustrations({ id: theme }, metier)) {
      scenes += 1;
      const svg = decodeURIComponent(image.url.replace(/^data:image\/svg\+xml;charset=utf-8,/, ''));
      const definis = new Set([...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
      for (const [, ref] of svg.matchAll(/url\(#([^)]+)\)/g)) {
        if (!definis.has(ref)) orphelins.push(`${theme}/${metier}/${image.id} → #${ref}`);
      }
      if (!definis.has('f')) sansFond.push(`${theme}/${metier}/${image.id}`);
    }
  }
}

dit(`${scenes} scènes produites sans exception`, scenes > 0, String(scenes));
dit('aucune référence url(#…) sans définition',
  orphelins.length === 0, orphelins.slice(0, 3).join(' | '));
dit('chaque scène passe par fond()', sansFond.length === 0, sansFond.slice(0, 3).join(' | '));

console.log('\nRien ne sort du fichier');
const dehors = [];
for (const metier of metiers) {
  for (const image of illustrations({ id: 'sobre' }, metier)) {
    if (/^https?:/i.test(image.url)) dehors.push(`${metier}/${image.id}`);
  }
}
dit('aucun visuel ne pointe vers un hôte extérieur', dehors.length === 0, dehors.join(' | '));

console.log('\nLa lumière est la même pour toute la série');
// Une série dont chaque image est éclairée autrement ne lit pas comme une
// série. La direction est déclarée une fois ; on vérifie qu'aucune scène ne
// la redéclare pour son compte.
const jours = new Set();
for (const metier of metiers) {
  for (const image of illustrations({ id: 'sobre' }, metier)) {
    const svg = decodeURIComponent(image.url.replace(/^data:image\/svg\+xml;charset=utf-8,/, ''));
    const m = svg.match(/id="jour"[^>]*cx="([^"]+)"[^>]*cy="([^"]+)"/);
    if (m) jours.add(`${m[1]},${m[2]}`);
  }
}
dit(`une seule direction de jour (${[...jours].join(' / ')})`, jours.size === 1, [...jours].join(' / '));

console.log(echecs.length ? `\n${echecs.length} échec(s)\n` : '\nTout est bon.\n');
process.exit(echecs.length ? 1 : 0);
