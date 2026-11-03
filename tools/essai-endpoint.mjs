#!/usr/bin/env node
/**
 * La fonction de publication : est-elle exécutable, et refuse-t-elle bien ?
 *
 *   npm run essai-endpoint
 *
 * C'est l'essai qui manquait, et son absence a coûté cher. `api/admin.js` est
 * ce qui permet à un client sur Vercel de cliquer « Publier » et d'en rester
 * là — sans quoi il doit télécharger un fichier HTML et le déposer lui-même,
 * ce qu'aucun commerçant ne fera.
 *
 * Or le portage était écrit en CommonJS — `require`, `module.exports` — dans
 * un dépôt qui déclare `"type": "module"`. Il ne pouvait donc pas s'exécuter,
 * ni ici ni sur Vercel. Rien ne le disait : le fichier existait, il se lisait
 * très bien, et il n'était atteint par aucun essai.
 *
 * On vérifie donc deux choses, et seulement elles :
 *
 *   1. que la fonction se CHARGE et s'EXÉCUTE dans ce dépôt, tel qu'il est
 *      configuré ;
 *   2. qu'elle refuse tout ce qu'elle doit refuser, avec le bon code.
 *
 * Ce qui suit — vérifier une vraie signature Google, committer dans GitHub —
 * demande des identifiants réels et n'a pas sa place ici.
 */
const echecs = [];
const dit = (quoi, bon, detail = '') => {
  console.log(`  ${bon ? '✓' : '✗'} ${quoi}${bon ? '' : ` — ${detail}`}`);
  if (!bon) echecs.push(quoi);
};

console.log('\nLa fonction est atteignable');
let handler;
try {
  ({ default: handler } = await import('../api/admin.js'));
} catch (erreur) {
  dit('api/admin.js se charge', false, erreur.message);
  console.log('\n1 échec(s)\n');
  process.exit(1);
}
dit('api/admin.js exporte une fonction par défaut', typeof handler === 'function');

/** Une réponse factice, qui retient ce qu'on lui a dit. */
const faireRes = () => {
  const r = { code: 0, corps: null, entetes: {} };
  r.status = (c) => { r.code = c; return r; };
  r.json = (j) => { r.corps = j; return r; };
  r.setHeader = (k, v) => { r.entetes[k] = v; return r; };
  r.end = () => { if (!r.code) r.code = 204; return r; };
  return r;
};

const jouer = async (requete, env) => {
  const sauve = { ...process.env };
  for (const k of ['FIREBASE_PROJECT_ID', 'SITE_ID']) delete process.env[k];
  Object.assign(process.env, env || {});
  const res = faireRes();
  // La console de la fonction écrit les 500 : on la fait taire le temps de
  // l'essai, sinon une sortie verte est noyée sous des traces d'erreur
  // parfaitement attendues.
  const erreurOriginale = console.error;
  console.error = () => {};
  try { await handler(requete, res); } finally {
    console.error = erreurOriginale;
    process.env = sauve;
  }
  return res;
};

const COMPLET = { FIREBASE_PROJECT_ID: 'projet', SITE_ID: 'site' };
const poste = (action, entetes = {}) => ({ method: 'POST', query: { action }, headers: entetes, body: {} });

console.log('\nCe qu’elle doit refuser');
const CAS = [
  ['une configuration incomplète est annoncée, pas devinée', poste('check'), {}, 500],
  ['une requête sans jeton est refusée', poste('check'), COMPLET, 401],
  ['un jeton illisible est refusé', poste('check', { authorization: 'Bearer a.b.c' }), COMPLET, 401],
  ['une action inconnue est refusée', poste('rm-rf'), COMPLET, 404],
  ['une action vide est refusée', poste(''), COMPLET, 404],
  ['GET est refusé', { method: 'GET', query: { action: 'check' }, headers: {} }, COMPLET, 405],
];
for (const [quoi, requete, env, attendu] of CAS) {
  const res = await jouer(requete, env);
  dit(`${quoi} (${attendu})`, res.code === attendu, `obtenu ${res.code}`);
}

console.log('\nCe qu’elle doit accepter');
const pre = await jouer({ method: 'OPTIONS', query: {}, headers: {} }, COMPLET);
dit('le préalable CORS répond 204', pre.code === 204, `obtenu ${pre.code}`);
dit('et autorise l’en-tête Authorization',
  /Authorization/i.test(pre.entetes['Access-Control-Allow-Headers'] || ''),
  pre.entetes['Access-Control-Allow-Headers'] || '(absent)');

// Une réponse mise en cache serait servie à un autre compte : la publication
// n'est pas une ressource publique.
dit('rien n’est mis en cache', (pre.entetes['Cache-Control'] || '') === 'no-store',
  pre.entetes['Cache-Control'] || '(absent)');

console.log('\nAucun identifiant ne traîne dans le dépôt');
const { readFileSync } = await import('node:fs');
const source = readFileSync(new URL('./admin-endpoint.js', import.meta.url), 'utf8');
// Un jeton GitHub commence par ghp_ / github_pat_ ; une clé Firebase par AIza.
dit('aucun jeton écrit en dur', !/\b(ghp_|github_pat_|AIza)[A-Za-z0-9_-]{10,}/.test(source));
dit('les secrets viennent de l’environnement', /process\.env\.GITHUB_TOKEN/.test(source));

console.log(echecs.length ? `\n${echecs.length} échec(s)\n` : '\nTout est bon.\n');
process.exit(echecs.length ? 1 : 0);
