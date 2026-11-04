#!/usr/bin/env node
/**
 * La fonction de paiement : refuse-t-elle ce qu'elle doit refuser, et
 * surtout, à quel prix encaisse-t-elle ?
 *
 *   npm run essai-paiement
 *
 * Le panier vit dans le navigateur de l'acheteur, donc dans un endroit qu'il
 * contrôle. Rien ne l'empêche d'y écrire 0,01 € pour une planche à 48 € et
 * d'envoyer ça à la caisse. La seule défense est que le serveur relise le
 * catalogue et ignore le prix reçu — et c'est précisément ce qu'on vérifie
 * ici, en envoyant un panier falsifié et en regardant ce qui part chez
 * Stripe.
 *
 * Firestore et Stripe sont bouchonnés : aucun appel ne sort, aucune clé
 * n'est nécessaire, et l'essai tourne partout.
 */
const echecs = [];
const dit = (quoi, bon, detail = '') => {
  console.log(`  ${bon ? '✓' : '✗'} ${quoi}${bon ? '' : ` — ${detail}`}`);
  if (!bon) echecs.push(quoi);
};

const { default: handler } = await import('../api/paiement.js');

/** Le catalogue que « Firestore » renverra : c'est lui qui fait foi. */
const CATALOGUE = {
  fields: {
    reglages: {
      mapValue: {
        fields: {
          boutique: {
            mapValue: {
              fields: {
                produits: {
                  arrayValue: {
                    values: [
                      { mapValue: { fields: {
                        id: { stringValue: 'planche' },
                        nom: { stringValue: 'Planche à découper' },
                        prix: { doubleValue: 48 },
                        devise: { stringValue: 'EUR' },
                        type: { stringValue: 'physique' },
                      } } },
                      { mapValue: { fields: {
                        id: { stringValue: 'epuise' },
                        nom: { stringValue: 'Article épuisé' },
                        prix: { doubleValue: 10 },
                        disponible: { booleanValue: false },
                      } } },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

let envoyeAStripe = null;
globalThis.fetch = async (url, init) => {
  if (String(url).includes('firestore')) {
    return { ok: true, json: async () => CATALOGUE };
  }
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

const ENV = { STRIPE_SECRET_KEY: 'sk_test_essai', FIREBASE_PROJECT_ID: 'p', SITE_ID: 's' };
const jouer = async (corps, env = ENV, methode = 'POST') => {
  const sauve = { ...process.env };
  for (const k of Object.keys(ENV)) delete process.env[k];
  Object.assign(process.env, env);
  envoyeAStripe = null;
  const res = faireRes();
  const taire = console.error; console.error = () => {};
  try {
    await handler({ method: methode, headers: { origin: 'https://exemple.fr' }, body: corps }, res);
  } finally { console.error = taire; process.env = sauve; }
  return res;
};

console.log('\nCe qu’elle refuse');
dit('sans clé Stripe (500)',
  (await jouer({ lignes: [{ id: 'planche', quantite: 1 }] },
    { FIREBASE_PROJECT_ID: 'p', SITE_ID: 's' })).code === 500);
dit('un panier vide (400)', (await jouer({ lignes: [] })).code === 400);
dit('un corps sans lignes (400)', (await jouer({})).code === 400);
dit('GET (405)', (await jouer({}, ENV, 'GET')).code === 405);
dit('un article hors catalogue (409)',
  (await jouer({ lignes: [{ id: 'inexistant', quantite: 1 }] })).code === 409);
dit('un article épuisé (409)',
  (await jouer({ lignes: [{ id: 'epuise', quantite: 1 }] })).code === 409);

console.log('\nLe prix vient du CATALOGUE, jamais de la requête');
// Le cœur de l'essai : on envoie un prix falsifié et on regarde la caisse.
const falsifie = await jouer({
  lignes: [{ id: 'planche', quantite: 2, prix: 0.01, nom: 'Planche à 1 centime' }],
});
dit('la session est créée', falsifie.code === 200 && !!falsifie.corps.url,
  JSON.stringify(falsifie.corps));
const montant = envoyeAStripe && envoyeAStripe.get('line_items[0][price_data][unit_amount]');
dit('le montant est celui du catalogue (4800 centimes)', montant === '4800',
  `obtenu ${montant}`);
dit('le prix falsifié n’apparaît nulle part',
  !String(envoyeAStripe).includes('=1&') && montant !== '1', 'un centime a filtré');
const nom = envoyeAStripe && envoyeAStripe.get('line_items[0][price_data][product_data][name]');
dit('le nom aussi vient du catalogue', nom === 'Planche à découper', String(nom));
dit('la quantité, elle, est celle demandée',
  envoyeAStripe.get('line_items[0][quantity]') === '2');

console.log('\nLa forme attendue par Stripe');
dit('le mode est un paiement unique', envoyeAStripe.get('mode') === 'payment');
dit('la devise est reprise du produit',
  envoyeAStripe.get('line_items[0][price_data][currency]') === 'eur');
// Un produit expédiable demande une adresse ; un produit numérique non.
dit('une adresse est demandée pour un produit physique',
  !!envoyeAStripe.get('shipping_address_collection[allowed_countries][0]'));
dit('les adresses de retour sont posées',
  /exemple\.fr/.test(envoyeAStripe.get('success_url') || ''),
  envoyeAStripe.get('success_url') || '(absente)');

console.log('\nLa quantité est bornée');
await jouer({ lignes: [{ id: 'planche', quantite: 99999 }] });
dit('une quantité démesurée est ramenée à 99',
  envoyeAStripe.get('line_items[0][quantity]') === '99',
  envoyeAStripe.get('line_items[0][quantity]'));
await jouer({ lignes: [{ id: 'planche', quantite: -5 }] });
dit('une quantité négative devient 1',
  envoyeAStripe.get('line_items[0][quantity]') === '1');

console.log('\nAucun secret ne fuit');
const { readFileSync } = await import('node:fs');
const source = readFileSync(new URL('../api/paiement.js', import.meta.url), 'utf8');
dit('aucune clé écrite en dur', !/\bsk_(test|live)_[A-Za-z0-9]{10,}/.test(source));
dit('la clé vient de l’environnement', /process\.env\.STRIPE_SECRET_KEY/.test(source));
dit('aucun import ne sort de api/',
  ![...source.matchAll(/^\s*import\s[^;]*?from\s*['"](\.[^'"]+)['"]/gm)]
    .some((m) => m[1].startsWith('..')));

console.log(echecs.length ? `\n${echecs.length} échec(s)\n` : '\nTout est bon.\n');
process.exit(echecs.length ? 1 : 0);
