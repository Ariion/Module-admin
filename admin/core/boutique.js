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
  };
}

/** Prix lisible : « 24,90 € ». */
export function prixLisible(produit) {
  const symbole = DEVISES[produit.devise] || produit.devise;
  const montant = produit.prix.toFixed(2).replace('.', ',').replace(/,00$/, '');
  return `${montant} ${symbole}`;
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
    return lien;
  }

  if (produit.lien) {
    lien.setAttribute('href', produit.lien);
    lien.setAttribute('target', '_blank');
    lien.setAttribute('rel', 'noopener noreferrer');
  }
  return lien;
}

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
  return true;
}

/** Les catégories présentes dans le catalogue. */
export function categoriesDe(produits) {
  return [...new Set((produits || []).map((p) => String(p.categorie || '').trim()).filter(Boolean))];
}
