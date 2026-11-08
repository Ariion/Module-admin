/**
 * achat-atelier — crée une session de paiement Stripe pour acheter Atelier.
 *
 * À NE PAS CONFONDRE avec `api/paiement.js` : celui-ci encaisse pour le
 * compte d'un site CONSTRUIT avec Atelier (le miel, le savon, la planche en
 * noyer — le catalogue d'un client). Celui-ci encaisse pour AARDESIGN,
 * quand quelqu'un achète le module lui-même, une formule parmi trois. Les
 * deux parlent à des comptes Stripe différents et ne doivent jamais se
 * mélanger — d'où deux fichiers, deux jeux de variables d'environnement.
 *
 * Même principe de sécurité que `paiement.js` : le prix ne vient JAMAIS du
 * navigateur, qui pourrait envoyer n'importe quoi. Il vient d'une variable
 * d'environnement, lue côté serveur — c'est la manière la plus simple de ne
 * jamais le coder en dur dans un fichier public tout en gardant un seul
 * endroit à modifier quand les tarifs changent.
 *
 * Le consentement à la réutilisation du logo et du site en portfolio est
 * lui aussi vérifié ici, pas seulement dans la page : une case cochée côté
 * client ne prouve rien si le serveur ne la redemande pas. Sans elle, pas de
 * session — exactement comme un panier vide.
 *
 * Variables d'environnement (Vercel › Settings › Environment Variables,
 * sur le PROJET DE LA VITRINE, pas sur celui d'un client) :
 *
 *   STRIPE_SECRET_KEY   clé secrète du compte Stripe d'AARDESIGN
 *   PRIX_MODULE         prix de la formule « Le module », en euros (ex: 149)
 *   PRIX_POSE           prix de la formule « Le module, posé », en euros
 *   PRIX_COMPLET        prix de la formule « Le site complet », en euros
 *   ACHAT_RETOUR        adresse de la page de remerciement (facultatif)
 *
 * Tant qu'un prix n'est pas renseigné, la formule correspondante refuse la
 * vente plutôt que d'accepter 0 € ou une valeur inventée — « — € » sur la
 * page Tarifs n'est pas qu'un texte, c'est aussi ce que ce fichier vérifie.
 */
const STRIPE = 'https://api.stripe.com/v1';

const erreur = (message, status = 400) => Object.assign(new Error(message), { status });

/** Les trois formules : leur nom affiché à l'acheteur, et la variable qui porte leur prix. */
const FORMULES = {
  module: { nom: 'Atelier — Le module', variable: 'PRIX_MODULE' },
  pose: { nom: 'Atelier — Le module, posé', variable: 'PRIX_POSE' },
  complet: { nom: 'Atelier — Le site complet', variable: 'PRIX_COMPLET' },
};

/**
 * Encode un objet imbriqué comme Stripe l'attend : `a[b][0][c]=valeur`.
 * Recopié de `paiement.js` : une fonction servie par Vercel ne doit dépendre
 * d'aucun fichier hors de `api/`, qui n'est pas déployé.
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

/**
 * Les prix configurés, tels que la page Tarifs doit les AFFICHER — jamais un
 * texte écrit à la main ailleurs : un prix affiché qui ne serait pas celui
 * réellement facturé serait pire que « — € », et personne ne le verrait
 * avant qu'un client ne paie le mauvais montant.
 */
function prixAffiches() {
  const sortie = {};
  for (const [id, formule] of Object.entries(FORMULES)) {
    const euros = Number(process.env[formule.variable]);
    sortie[id] = Number.isFinite(euros) && euros > 0 ? euros : null;
  }
  return sortie;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') return res.status(200).json(prixAffiches());
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée.' });

  try {
    const cle = process.env.STRIPE_SECRET_KEY;
    if (!cle) throw erreur('STRIPE_SECRET_KEY manquante.', 500);

    const corps = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const formule = FORMULES[String(corps.formule || '')];
    if (!formule) throw erreur('Formule inconnue.', 400);

    // La case à cocher protège le client (on ne lui prête jamais une
    // autorisation qu'il n'a pas donnée) autant qu'elle protège Aardesign
    // (une autorisation jamais vraiment accordée ne tiendrait pas). Les deux
    // raisons suffisent à refuser la vente si elle manque.
    if (corps.consentement !== true) {
      throw erreur('La case de consentement doit être cochée pour continuer.', 400);
    }

    const euros = prixAffiches()[String(corps.formule)];
    if (!euros) {
      throw erreur(`Le prix de cette formule n'est pas encore configuré (${formule.variable}).`, 503);
    }

    const origine = (req.headers.origin || `https://${req.headers.host || ''}`).replace(/\/$/, '');
    const retour = process.env.ACHAT_RETOUR || `${origine}/merci`;

    const session = {
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: Math.round(euros * 100),
          product_data: { name: formule.nom },
        },
      }],
      success_url: `${retour}?formule=${encodeURIComponent(corps.formule)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origine}/tarifs?paiement=annule`,
      locale: 'fr',
      customer_creation: 'always',
      // Trace durable du consentement, rattachée au paiement lui-même —
      // plus fiable qu'un enregistrement séparé qui pourrait se perdre.
      metadata: {
        formule: corps.formule,
        consentement_reutilisation_portfolio: 'oui',
        consentement_horodatage: new Date().toISOString(),
      },
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
      throw erreur(`Stripe a refusé : ${json?.error?.message || reponse.status}`, 502);
    }

    return res.status(200).json({ url: json.url });
  } catch (e) {
    const status = e && e.status ? e.status : 500;
    if (status >= 500) console.error('[achat-atelier]', e);
    return res.status(status).json({ error: e.message || 'Erreur interne.' });
  }
}
