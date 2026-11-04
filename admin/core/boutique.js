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
import { SCRIPT_PANIER, clePanier, attributsProduit } from './panier.js';

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

  // Le panier du module. C'est le mode par DÉFAUT dès qu'un produit n'a pas
  // de lien de paiement propre : un catalogue sans panier obligerait à
  // acheter un article à la fois, et à repartir du site entre chaque.
  if (boutique.mode === 'panier' || (!boutique.mode && !produit.lien)) {
    lien.className = 'panier-ajouter';
    lien.setAttribute('href', '#');
    for (const [nom, valeur] of Object.entries(attributsProduit(produit))) {
      lien.setAttribute(nom, valeur);
    }
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

/**
 * Le tiroir du panier, son bouton flottant, son style et son comportement.
 *
 * Tout est posé en une fois et ne dépend de rien : la page publiée est un
 * fichier, elle doit se suffire. Le style est volontairement neutre — des
 * filets, pas de couleur — parce qu'il atterrit sur le site d'un client dont
 * on ne connaît pas la charte, et qu'un panier fluo sur une boutique sobre
 * est pire qu'un panier discret.
 */
export function poserPanierLocal(doc, { siteId = 'site', pagePanier = '' } = {}) {
  if (doc.querySelector('[data-panier-tiroir]')) return false;
  doc.documentElement.setAttribute('data-panier-cle', clePanier(siteId));

  const style = doc.createElement('style');
  style.setAttribute('data-admin-ui', '');
  style.textContent = STYLE_PANIER;
  doc.head.appendChild(style);

  const bouton = doc.createElement('button');
  bouton.type = 'button';
  bouton.className = 'panier-bulle';
  bouton.setAttribute('data-panier-ouvrir', '');
  bouton.setAttribute('aria-label', 'Ouvrir le panier');
  bouton.innerHTML = '<span aria-hidden="true">Panier</span>'
    + '<span class="panier-bulle__compte" data-panier-badge hidden>0</span>';
  doc.body.appendChild(bouton);

  const tiroir = doc.createElement('aside');
  tiroir.className = 'panier';
  tiroir.setAttribute('data-panier-tiroir', '');
  tiroir.hidden = true;
  tiroir.innerHTML = `
    <div class="panier__fond" data-panier-fermer></div>
    <div class="panier__boite" role="dialog" aria-label="Panier">
      <header class="panier__tete">
        <strong>Votre panier</strong>
        <button type="button" data-panier-fermer aria-label="Fermer">&#215;</button>
      </header>
      <p class="panier__vide" data-panier-vide>Votre panier est vide.</p>
      <div data-panier-plein hidden>
        <ul class="panier__lignes" data-panier-lignes></ul>
        <div class="panier__total">
          <span>Sous-total</span><strong data-panier-total>0,00 &#8364;</strong>
        </div>
        <p class="panier__note">Frais de port calculés à l'étape suivante.</p>
        <p class="panier__erreur" data-panier-erreur hidden></p>
        <a class="panier__commander" href="${safeUrl(pagePanier) || '#'}"
           data-panier-commander="/api/paiement">Commander</a>
        <button type="button" class="panier__vider" data-panier-vider>Vider le panier</button>
      </div>
    </div>`;
  doc.body.appendChild(tiroir);

  const script = doc.createElement('script');
  script.setAttribute('data-admin-ui', '');
  script.textContent = SCRIPT_PANIER;
  doc.body.appendChild(script);
  return true;
}

const STYLE_PANIER = `
.panier-bulle{position:fixed;right:18px;bottom:18px;z-index:40;display:flex;align-items:center;
  gap:9px;border:1px solid currentColor;background:#fff;color:inherit;cursor:pointer;
  font:inherit;font-size:13px;letter-spacing:.06em;text-transform:uppercase;padding:12px 17px}
.panier-bulle__compte{font-weight:700;font-variant-numeric:tabular-nums}
.panier{position:fixed;inset:0;z-index:50}
.panier[hidden]{display:none}
/* Ceinture et bretelles : tant que le tiroir n'est pas ouvert, il ne capte
   aucun clic, même si le script n'a pas encore posé son hidden. */
.panier:not([data-ouvert]){pointer-events:none}
.panier[data-ouvert]{pointer-events:auto}
.panier__fond{position:absolute;inset:0;background:rgba(0,0,0,.34);opacity:0;transition:opacity .25s}
.panier[data-ouvert] .panier__fond{opacity:1}
.panier__boite{position:absolute;top:0;right:0;height:100%;width:min(390px,100%);
  background:#fff;border-left:1px solid rgba(0,0,0,.18);padding:20px;overflow:auto;
  transform:translateX(100%);transition:transform .3s cubic-bezier(.2,.8,.3,1)}
.panier[data-ouvert] .panier__boite{transform:none}
.panier__tete{display:flex;justify-content:space-between;align-items:center;
  padding-bottom:14px;border-bottom:1px solid rgba(0,0,0,.12)}
.panier__tete button{background:none;border:0;font:inherit;font-size:22px;cursor:pointer;line-height:1}
.panier__vide{padding:34px 0;opacity:.6;font-size:14px}
.panier__lignes{list-style:none;margin:0;padding:0}
.panier__lignes li{display:grid;grid-template-columns:54px 1fr auto;gap:12px;align-items:center;
  padding:14px 0;border-bottom:1px solid rgba(0,0,0,.1)}
.panier__lignes img,.panier__trou{width:54px;height:54px;object-fit:cover;display:block;
  background:rgba(0,0,0,.05)}
.panier__nom{margin:0;font-weight:600;font-size:14px}
.panier__opt{margin:3px 0 0;font-size:12px;opacity:.6}
.panier__prix{margin:3px 0 0;font-size:13px}
.panier__qte{display:flex;align-items:center;gap:9px;font-variant-numeric:tabular-nums}
.panier__qte button{width:26px;height:26px;border:1px solid rgba(0,0,0,.25);background:#fff;
  cursor:pointer;font:inherit;line-height:1}
.panier__total{display:flex;justify-content:space-between;padding:16px 0 6px;font-size:15px}
.panier__note{margin:0 0 16px;font-size:12.5px;opacity:.6}
.panier__commander{display:block;text-align:center;text-decoration:none;padding:13px;
  background:#111;color:#fff;font-weight:600;font-size:14px}
.panier__erreur{margin:0 0 12px;padding:10px 12px;background:#fdecea;color:#7a1f14;
  font-size:13px;border-left:3px solid #c0392b}
.panier__vider{display:block;width:100%;margin-top:10px;background:none;border:0;
  font:inherit;font-size:12.5px;opacity:.6;cursor:pointer;padding:6px}
@media (prefers-reduced-motion:reduce){.panier__fond,.panier__boite{transition:none}}`;

/** Les catégories présentes dans le catalogue. */
export function categoriesDe(produits) {
  return [...new Set((produits || []).map((p) => String(p.categorie || '').trim()).filter(Boolean))];
}
