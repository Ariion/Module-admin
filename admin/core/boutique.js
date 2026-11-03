/**
 * Catalogue de produits, et bouton d'achat.
 *
 * Le module ne devient pas une boutique : il ne touche jamais un numéro de
 * carte, ne tient pas de commandes et ne gère pas de stock. Il tient le
 * catalogue — nom, prix, photo, description — et délègue l'encaissement à un
 * service qui fait ça pour de bon.
 *
 * Deux façons de vendre :
 *  - `lien` : le bouton ouvre une page de paiement hébergée ailleurs (Stripe
 *    Payment Link, Gumroad, Lemon Squeezy, PayPal, une place de marché). Rien
 *    à configurer, aucun serveur, et le prestataire gère la TVA, le reçu et
 *    l'adresse de livraison ;
 *  - `snipcart` : un vrai panier sur le site, qui sait additionner plusieurs
 *    produits et calculer les frais de port. Demande une clé, et que le
 *    balisage du produit se trouve dans le HTML — donc la régénération du
 *    fichier, donc un hébergement PHP.
 * @module core/boutique
 */
import { safeUrl, safeImageUrl, safeText } from './sanitize.js';

/** Où le paiement se fait. */
export const VENDEURS = [
  { id: 'stripe', exemple: 'https://buy.stripe.com/…' },
  { id: 'gumroad', exemple: 'https://votrenom.gumroad.com/l/produit' },
  { id: 'lemonsqueezy', exemple: 'https://votreboutique.lemonsqueezy.com/checkout/…' },
  { id: 'paypal', exemple: 'https://www.paypal.com/ncp/payment/…' },
  { id: 'externe', exemple: 'https://…' },
];

const DEVISES = { EUR: '€', USD: '$', GBP: '£', CHF: 'CHF', CAD: '$ CA' };

/** Fiche produit assainie : rien d'autre que ces champs n'entre. */
export function normaliserProduit(brut) {
  const prix = Number(String(brut?.prix ?? '').replace(',', '.'));
  return {
    id: String(brut?.id || '').slice(0, 40) || 'p' + Math.random().toString(36).slice(2, 9),
    nom: safeText(brut?.nom ?? '').slice(0, 120),
    description: safeText(brut?.description ?? '').slice(0, 600),
    prix: Number.isFinite(prix) && prix >= 0 ? Math.round(prix * 100) / 100 : 0,
    devise: Object.keys(DEVISES).includes(brut?.devise) ? brut.devise : 'EUR',
    image: safeImageUrl(brut?.image ?? ''),
    type: brut?.type === 'virtuel' ? 'virtuel' : 'physique',
    vendeur: VENDEURS.some((v) => v.id === brut?.vendeur) ? brut.vendeur : 'stripe',
    lien: safeUrl(brut?.lien ?? ''),
    categorie: safeText(brut?.categorie ?? '').slice(0, 60),
    poids: Math.max(0, Math.round(Number(brut?.poids) || 0)),
    disponible: brut?.disponible !== false,
    declinaisons: declinaisonsDe(brut?.declinaisons),
  };
}

/**
 * Les déclinaisons d'un produit : parfum, taille, couleur.
 *
 * Trois au plus, parce que Snipcart n'en lit pas davantage
 * (`custom1` à `custom3`). En demander une quatrième ne produirait aucune
 * erreur : l'option disparaîtrait simplement de la commande, ce qui est la
 * pire façon d'échouer. On coupe donc ici, où ça se voit.
 *
 * Une option peut porter un supplément, avec la notation de Snipcart :
 * « Grand[+5.00] ». On la laisse passer telle quelle — c'est lui qui la lit,
 * pas nous.
 */
function declinaisonsDe(brut) {
  if (!Array.isArray(brut)) return [];
  return brut.slice(0, 3).map((d) => ({
    nom: safeText(d?.nom ?? '').slice(0, 40),
    options: (Array.isArray(d?.options) ? d.options : [])
      .slice(0, 24)
      .map((o) => safeText(o ?? '').slice(0, 60))
      .filter(Boolean),
  })).filter((d) => d.nom && d.options.length);
}

/**
 * Prix lisible : « 24,90 € », « 9,00 € ».
 *
 * Les centimes ronds étaient auparavant retirés. Seul, « 9 € » se lit très
 * bien ; dans une grille de six produits à côté de « 12,50 € », la virgule
 * ne s'aligne plus et la liste paraît bâclée. Un catalogue est le seul
 * endroit où ce prix s'affiche — il suit donc la règle du catalogue.
 */
export function prixLisible(produit) {
  const symbole = DEVISES[produit.devise] || produit.devise;
  return `${produit.prix.toFixed(2).replace('.', ',')} ${symbole}`;
}

/**
 * Construit le bouton d'achat.
 *
 * En mode panier, ce sont les attributs `data-item-*` qui font foi : c'est
 * Snipcart qui lit le balisage de la page, pas nous qui lui parlons.
 */
export function boutonAchat(doc, produit, boutique = {}, libelle = 'Acheter') {
  const lien = doc.createElement('a');
  lien.textContent = libelle;

  if (!produit.disponible) {
    lien.textContent = 'Indisponible';
    lien.setAttribute('aria-disabled', 'true');
    lien.style.opacity = '.55';
    lien.style.pointerEvents = 'none';
    return lien;
  }

  if (boutique.mode === 'snipcart') {
    lien.className = 'snipcart-add-item';
    lien.setAttribute('href', '#');
    lien.setAttribute('data-item-id', produit.id);
    lien.setAttribute('data-item-name', produit.nom);
    lien.setAttribute('data-item-price', String(produit.prix));
    lien.setAttribute('data-item-url', doc.location ? doc.location.pathname : '/');
    lien.setAttribute('data-item-shippable', produit.type === 'physique' ? 'true' : 'false');
    if (produit.image) lien.setAttribute('data-item-image', produit.image);
    if (produit.description) lien.setAttribute('data-item-description', produit.description);
    if (produit.poids) lien.setAttribute('data-item-weight', String(produit.poids));
    // Snipcart numérote ses champs à partir de 1, et il lit la valeur
    // choisie dans `-value`. Sans valeur par défaut, un acheteur qui ne
    // touche pas au sélecteur commanderait une déclinaison vide.
    produit.declinaisons.forEach((d, rang) => {
      const n = rang + 1;
      lien.setAttribute(`data-item-custom${n}-name`, d.nom);
      lien.setAttribute(`data-item-custom${n}-options`, d.options.join('|'));
      lien.setAttribute(`data-item-custom${n}-value`, premiereOption(d.options[0]));
    });
    return lien;
  }

  if (produit.lien) {
    lien.setAttribute('href', produit.lien);
    lien.setAttribute('target', '_blank');
    lien.setAttribute('rel', 'noopener noreferrer');
  }
  return lien;
}

/** « Grand[+5.00] » désigne l'option « Grand » : le supplément n'en fait pas partie. */
export function premiereOption(option) {
  return String(option || '').replace(/\[[^\]]*\]\s*$/, '').trim();
}

/**
 * L'option telle qu'on la MONTRE : « A5 (+6,00 €) ».
 *
 * « A5[+6.00] » est la notation que Snipcart lit. L'afficher telle quelle
 * mettait sous les yeux de l'acheteur une syntaxe d'outil, avec un point
 * décimal anglais au milieu d'une boutique française. Le supplément doit se
 * voir — c'est une information de prix — mais écrit comme un prix.
 */
export function libelleOption(option, devise = 'EUR') {
  const brut = String(option || '');
  const nu = premiereOption(brut);
  const sup = brut.match(/\[\s*\+?\s*(\d+(?:[.,]\d{1,2})?)\s*\]\s*$/);
  if (!sup) return nu;
  const symbole = DEVISES[devise] || devise;
  const montant = Number(sup[1].replace(',', '.')).toFixed(2).replace('.', ',');
  return `${nu} (+${montant} ${symbole})`;
}

/**
 * Le script qui relie les sélecteurs de la page au bouton d'achat.
 *
 * Il est écrit en texte, et non posé en écouteur, pour une raison précise :
 * la page publiée est du HTML STATIQUE, produit par `core/bake.js`, et un
 * écouteur ne se sérialise pas. Des sélecteurs qui ne feraient rien une fois
 * la page publiée seraient pires que pas de sélecteurs du tout — ils
 * laisseraient l'acheteur croire qu'il a choisi sa taille.
 *
 * Il tient en quelques lignes et ne dépend de rien : c'est le même texte
 * qu'injectent le module et le script de démonstration, pour qu'il n'y ait
 * qu'une version de ce comportement.
 */
export const SCRIPT_DECLINAISONS = `
document.addEventListener('change', function (e) {
  var sel = e.target;
  if (!sel.matches || !sel.matches('[data-declinaison]')) return;
  var carte = sel.closest('[data-produit]');
  var bouton = carte && carte.querySelector('.snipcart-add-item');
  if (!bouton) return;
  bouton.setAttribute('data-item-custom' + sel.dataset.declinaison + '-value', sel.value);
});`.trim();

/** Le catalogue rangé, filtré éventuellement sur une catégorie. */
export function catalogueFiltre(produits, categorie) {
  const liste = (produits || []).map(normaliserProduit);
  if (!categorie) return liste;
  const cible = categorie.trim().toLowerCase();
  return liste.filter((p) => p.categorie.toLowerCase() === cible);
}

/**
 * Pose le panier dans la page, si le site en utilise un.
 *
 * Snipcart lit le balisage `data-item-*` que nos boutons portent déjà : il
 * n'y a rien à lui envoyer, seulement à le charger. Les balises sont
 * marquées `data-admin-ui` pour ne pas se retrouver dans l'export.
 */
export function poserPanier(doc, boutique) {
  if (!boutique || boutique.mode !== 'snipcart' || !boutique.cle) return false;
  if (doc.getElementById('snipcart')) return false;

  const style = doc.createElement('link');
  style.rel = 'stylesheet';
  style.href = 'https://cdn.snipcart.com/themes/v3.7.1/default/snipcart.css';
  style.setAttribute('data-admin-ui', '');
  doc.head.appendChild(style);

  const script = doc.createElement('script');
  script.src = 'https://cdn.snipcart.com/themes/v3.7.1/default/snipcart.js';
  script.async = true;
  script.setAttribute('data-admin-ui', '');
  doc.body.appendChild(script);

  const racine = doc.createElement('div');
  racine.id = 'snipcart';
  racine.hidden = true;
  racine.setAttribute('data-admin-ui', '');
  racine.setAttribute('data-api-key', String(boutique.cle));
  racine.setAttribute('data-config-modal-style', 'side');
  doc.body.appendChild(racine);

  const declinaisons = doc.createElement('script');
  declinaisons.textContent = SCRIPT_DECLINAISONS;
  declinaisons.setAttribute('data-admin-ui', '');
  doc.body.appendChild(declinaisons);
  return true;
}

/** Les catégories présentes dans le catalogue. */
export function categoriesDe(produits) {
  return [...new Set((produits || []).map((p) => String(p.categorie || '').trim()).filter(Boolean))];
}
