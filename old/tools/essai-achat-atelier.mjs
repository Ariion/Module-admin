#!/usr/bin/env node
/**
 * L'achat d'Atelier lui-même : le prix affiché est-il le prix facturé, et le
 * consentement est-il vraiment exigé, pas seulement suggéré ?
 *
 *   npm run essai-achat-atelier
 *
 * Deux garanties, et c'est tout ce qui compte ici :
 *
 *  - le prix vient de l'environnement, jamais d'ailleurs — la page Tarifs et
 *    cette fonction lisent exactement la même valeur (`GET` pour l'affichage,
 *    `POST` pour la facturation), donc elles ne peuvent pas diverger ;
 *  - sans la case de consentement cochée, aucune session n'est créée — une
 *    requête fabriquée à la main, sans navigateur ni JavaScript, doit buter
 *    dessus exactement comme un panier vide bute sur un panier vide.
 *
 * Stripe est bouchonné : aucun appel ne sort, aucune clé n'est nécessaire.
 */
const echecs = [];
const dit = (quoi, bon, detail = '') => {
  console.log(`  ${bon ? '✓' : '✗'} ${quoi}${bon ? '' : ` — ${detail}`}`);
  if (!bon) echecs.push(quoi);
};

const { default: handler } = await import('../api/achat-atelier.js');

let envoyeAStripe = null;
globalThis.fetch = async (url, init) => {
  envoyeAStripe = new URLSearchParams(init.body);
  return { ok: true, json: async () => ({ url: 'https://checkout.stripe.com/c/essai' }) };
};

const faireRes = () => {
  const r = { code: 0, corps: null, entetes: {} };
  r.status = (c) => { r.code = c; return r; };
  r.json = (j) => { r.corps = j; return r; };
  r.setHeader = (k, v) => { r.entetes[k] = v; return r; };
  r.end = () => { if (!r.code) r.code = 204; return r; };
  return r;
};

const AVEC_PRIX = { STRIPE_SECRET_KEY: 'sk_test_essai', PRIX_MODULE: '149', PRIX_POSE: '490', PRIX_COMPLET: '890' };
const jouer = async (corps, env, methode = 'POST') => {
  const sauve = { ...process.env };
  for (const k of ['STRIPE_SECRET_KEY', 'PRIX_MODULE', 'PRIX_POSE', 'PRIX_COMPLET', 'ACHAT_RETOUR']) {
    delete process.env[k];
  }
  Object.assign(process.env, env);
  envoyeAStripe = null;
  const res = faireRes();
  const taire = console.error; console.error = () => {};
  try {
    await handler({ method: methode, headers: { origin: 'https://exemple.fr' }, body: corps }, res);
  } finally { console.error = taire; process.env = sauve; }
  return res;
};

console.log('\nLe prix affiché est le prix facturé — une seule source');
const sansPrix = await jouer({}, {}, 'GET');
dit('rien de configuré → les trois formules à null',
  sansPrix.code === 200 && Object.values(sansPrix.corps).every((v) => v === null),
  JSON.stringify(sansPrix.corps));

const avecPrix = await jouer({}, AVEC_PRIX, 'GET');
dit('les prix configurés sont renvoyés tels quels',
  avecPrix.corps.module === 149 && avecPrix.corps.pose === 490 && avecPrix.corps.complet === 890,
  JSON.stringify(avecPrix.corps));

console.log('\nCe qu’elle refuse');
dit('sans clé Stripe (500)',
  (await jouer({ formule: 'module', consentement: true },
    { PRIX_MODULE: '149' })).code === 500);
dit('une formule inconnue (400)',
  (await jouer({ formule: 'gratuit', consentement: true }, AVEC_PRIX)).code === 400);
dit('sans le champ consentement (400)',
  (await jouer({ formule: 'module' }, AVEC_PRIX)).code === 400);
dit('avec consentement à false — tenter de passer outre la case (400)',
  (await jouer({ formule: 'module', consentement: false }, AVEC_PRIX)).code === 400);
dit('avec une valeur approchante mais pas exactement `true` (400)',
  (await jouer({ formule: 'module', consentement: 'true' }, AVEC_PRIX)).code === 400,
  'une chaîne "true" ne doit pas suffire — seul le booléen compte');
dit('un prix non configuré refuse la vente plutôt que de facturer 0 € (503)',
  (await jouer({ formule: 'complet', consentement: true },
    { STRIPE_SECRET_KEY: 'sk_test_essai', PRIX_MODULE: '149' })).code === 503);
dit('PUT (405)', (await jouer({}, AVEC_PRIX, 'PUT')).code === 405);

console.log('\nUne commande valide');
const ok = await jouer({ formule: 'pose', consentement: true }, AVEC_PRIX);
dit('la session est créée', ok.code === 200 && !!ok.corps.url, JSON.stringify(ok.corps));
dit('le montant facturé est celui de PRIX_POSE (49000 centimes)',
  envoyeAStripe.get('line_items[0][price_data][unit_amount]') === '49000',
  envoyeAStripe.get('line_items[0][price_data][unit_amount]'));
dit('le mode est un paiement unique', envoyeAStripe.get('mode') === 'payment');
dit('le consentement est tracé dans les métadonnées de la session',
  envoyeAStripe.get('metadata[consentement_reutilisation_portfolio]') === 'oui');
dit('la formule achetée est tracée aussi',
  envoyeAStripe.get('metadata[formule]') === 'pose');
dit('un horodatage accompagne le consentement',
  /^\d{4}-\d{2}-\d{2}T/.test(envoyeAStripe.get('metadata[consentement_horodatage]') || ''),
  envoyeAStripe.get('metadata[consentement_horodatage]'));
dit('le retour en cas d’annulation pointe vers /tarifs',
  (envoyeAStripe.get('cancel_url') || '').endsWith('/tarifs?paiement=annule'),
  envoyeAStripe.get('cancel_url'));
dit('le retour en cas de succès porte la formule achetée',
  (envoyeAStripe.get('success_url') || '').includes('formule=pose'),
  envoyeAStripe.get('success_url'));

console.log('\nAucun secret ne fuit');
const { readFileSync } = await import('node:fs');
const source = readFileSync(new URL('../api/achat-atelier.js', import.meta.url), 'utf8');
dit('aucune clé écrite en dur', !/\bsk_(test|live)_[A-Za-z0-9]{10,}/.test(source));
dit('la clé vient de l’environnement', /process\.env\.STRIPE_SECRET_KEY/.test(source));
dit('aucun import ne sort de api/',
  ![...source.matchAll(/^\s*import\s[^;]*?from\s*['"](\.[^'"]+)['"]/gm)]
    .some((m) => m[1].startsWith('..')));

console.log(echecs.length ? `\n${echecs.length} échec(s)\n` : '\nTout est bon.\n');
process.exit(echecs.length ? 1 : 0);
