/**
 * paiement — crée une session de paiement Stripe pour le panier du module.
 *
 * Remplace Snipcart. Le panier est à nous (`core/panier.js`), le paiement est
 * à Stripe, et rien ne s'intercale entre les deux : pas d'abonnement
 * mensuel, pas de commission supplémentaire, aucun script tiers sur le site
 * du client. L'argent va directement sur le compte Stripe du vendeur.
 *
 * LE POINT QUI COMMANDE TOUT : on ne croit JAMAIS les prix envoyés par le
 * navigateur. Le panier vit dans le `localStorage` de l'acheteur, qui peut y
 * écrire ce qu'il veut — 0,01 € pour une planche à 48 €. La fonction relit
 * donc le catalogue dans Firestore et n'utilise QUE les prix qu'elle y
 * trouve. Le corps de la requête ne sert qu'à dire quels articles, en quelle
 * quantité, dans quelle déclinaison.
 *
 * C'était exactement la protection de Snipcart, qui allait lire la page avant
 * d'encaisser. On la refait, en mieux : lire la base est plus sûr que lire
 * une page, et ne dépend pas d'un robot qui exécute ou non le JavaScript.
 *
 * Pas de SDK : le module n'a aucune dépendance et n'en prendra pas pour un
 * appel HTTP. `api/admin.js` parle déjà à Firestore et GitHub de la même
 * façon.
 *
 * Variables d'environnement (Vercel › Settings › Environment Variables) :
 *
 *   STRIPE_SECRET_KEY    clé secrète du compte Stripe du VENDEUR (sk_test_…
 *                        pour essayer, sk_live_… pour encaisser)
 *   FIREBASE_PROJECT_ID  l'identifiant du projet Firebase
 *   SITE_ID              l'identifiant du site dans la base
 *   BOUTIQUE_RETOUR      adresse de la boutique, pour le retour (facultatif)
 */
const FIRESTORE = 'https://firestore.googleapis.com/v1';
const STRIPE = 'https://api.stripe.com/v1';
const PAGE_COMMUNE = '__commun';

/** Au-delà, ce n'est plus une commande, c'est une tentative. */
const MAX_LIGNES = 40;
const MAX_QUANTITE = 99;

const erreur = (message, status = 400) => Object.assign(new Error(message), { status });

/* ───────────────────────── lecture de Firestore ───────────────────────── */

/**
 * Une valeur Firestore, dépliée.
 *
 * Recopié plutôt qu'importé de `admin/data/rest.js` : une fonction servie par
 * Vercel ne doit dépendre d'aucun fichier hors de `api/`, qui n'est pas
 * déployé. La leçon a déjà coûté un `FUNCTION_INVOCATION_FAILED`.
 */
function valeur(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(valeur);
  if ('mapValue' in v) return champs(v.mapValue.fields);
  return null;
}
function champs(table) {
  const sortie = {};
  for (const [nom, v] of Object.entries(table || {})) sortie[nom] = valeur(v);
  return sortie;
}

/**
 * Le catalogue du site, tel qu'il est PUBLIÉ.
 *
 * Lu sans jeton : le contenu publié est public, c'est le rendu du site. On
 * lit donc la même chose que n'importe quel visiteur — et surtout pas le
 * brouillon, dont les prix n'ont pas encore été décidés.
 */
async function catalogueDuSite(projectId, siteId) {
  const url = `${FIRESTORE}/projects/${projectId}/databases/(default)/documents`
    + `/sites/${encodeURIComponent(siteId)}/pages/${encodeURIComponent(PAGE_COMMUNE)}`;
  const reponse = await fetch(url).catch(() => null);
  if (!reponse || !reponse.ok) throw erreur('Catalogue illisible.', 502);
  const doc = champs((await reponse.json()).fields);
  const produits = doc?.reglages?.boutique?.produits;
  if (!Array.isArray(produits) || !produits.length) {
    throw erreur('Aucun produit publié sur ce site.', 409);
  }
  return produits;
}

/* ───────────────────────────── Stripe, en REST ───────────────────────────── */

/**
 * Encode un objet imbriqué comme Stripe l'attend : `a[b][0][c]=valeur`.
 *
 * C'est ce que fait le SDK, et c'est la seule chose qu'il fait d'indispensable
 * ici.
 */
function formulaire(objet, prefixe = '', sortie = new URLSearchParams()) {
  for (const [cle, val] of Object.entries(objet)) {
    if (val === undefined || val === null) continue;
    const nom = prefixe ? `${prefixe}[${cle}]` : cle;
    if (Array.isArray(val)) {
      val.forEach((item, rang) => {
        if (item && typeof item === 'object') formulaire(item, `${nom}[${rang}]`, sortie);
        else sortie.append(`${nom}[${rang}]`, String(item));
      });
    } else if (val && typeof val === 'object') {
      formulaire(val, nom, sortie);
    } else {
      sortie.append(nom, String(val));
    }
  }
  return sortie;
}

/* ──────────────────────────────── handler ──────────────────────────────── */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée.' });

  try {
    const cle = process.env.STRIPE_SECRET_KEY;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const siteId = process.env.SITE_ID;
    if (!cle) throw erreur('STRIPE_SECRET_KEY manquante.', 500);
    if (!projectId || !siteId) throw erreur('FIREBASE_PROJECT_ID ou SITE_ID manquant.', 500);

    const corps = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const demandees = Array.isArray(corps.lignes) ? corps.lignes.slice(0, MAX_LIGNES) : [];
    if (!demandees.length) throw erreur('Panier vide.', 400);

    const catalogue = await catalogueDuSite(projectId, siteId);
    const parId = new Map(catalogue.map((p) => [String(p.id), p]));

    const articles = [];
    const inconnus = [];
    for (const ligne of demandees) {
      const produit = parId.get(String(ligne && ligne.id));
      if (!produit) { inconnus.push(String(ligne && ligne.id)); continue; }
      if (produit.disponible === false) continue;

      const quantite = Math.min(MAX_QUANTITE, Math.max(1, Math.round(Number(ligne.quantite) || 1)));
      // Le prix vient du CATALOGUE, jamais de la requête. C'est toute la
      // raison d'être de cette fonction.
      const centimes = Math.round(Number(produit.prix) * 100);
      if (!Number.isFinite(centimes) || centimes < 0) continue;

      const options = Array.isArray(ligne.options)
        ? ligne.options.map((o) => String(o).slice(0, 80)).slice(0, 3)
        : [];

      articles.push({
        quantity: quantite,
        price_data: {
          currency: String(produit.devise || 'EUR').toLowerCase(),
          unit_amount: centimes,
          product_data: {
            name: String(produit.nom || 'Article').slice(0, 250),
            ...(options.length ? { description: options.join(' · ').slice(0, 250) } : {}),
            ...(/^https?:\/\//.test(produit.image || '') ? { images: [produit.image] } : {}),
          },
        },
      });
    }

    if (!articles.length) {
      throw erreur(inconnus.length
        ? 'Aucun article du panier ne figure au catalogue publié.'
        : 'Aucun article disponible.', 409);
    }

    const origine = (req.headers.origin || `https://${req.headers.host || ''}`).replace(/\/$/, '');
    const retour = process.env.BOUTIQUE_RETOUR || `${origine}/boutique/`;
    const physique = catalogue.some((p) => p.type !== 'virtuel');

    const session = {
      mode: 'payment',
      line_items: articles,
      success_url: `${retour}?paiement=ok`,
      cancel_url: `${retour}?paiement=annule`,
      locale: 'fr',
      // L'adresse n'est demandée que si quelque chose doit être expédié :
      // la réclamer pour un produit numérique fait abandonner des commandes.
      ...(physique ? { shipping_address_collection: { allowed_countries: ['FR', 'BE', 'CH', 'LU'] } } : {}),
    };

    const reponse = await fetch(`${STRIPE}/checkout/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cle}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formulaire(session).toString(),
    });
    const json = await reponse.json().catch(() => null);
    if (!reponse.ok || !json || !json.url) {
      // Le message de Stripe est utile au développeur ; la clé, jamais.
      throw erreur(`Stripe a refusé : ${json?.error?.message || reponse.status}`, 502);
    }

    return res.status(200).json({ url: json.url, ignores: inconnus });
  } catch (e) {
    const status = e && e.status ? e.status : 500;
    if (status >= 500) console.error('[paiement]', e);
    return res.status(status).json({ error: e.message || 'Erreur interne.' });
  }
}
