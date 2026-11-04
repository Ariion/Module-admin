/**
 * Le panier du site.
 *
 * Jusqu'ici le module n'en avait pas : tout passait par Snipcart. Deux
 * conséquences, et aucune n'est bonne. Sans compte payant chez un tiers, un
 * site vendait un produit à la fois, par un lien qui emmenait l'acheteur
 * ailleurs — et la démonstration ne pouvait rien montrer du tout.
 *
 * Celui-ci est à nous. Il additionne, il compte, il se souvient. Ce qu'il ne
 * fait PAS, et ne fera jamais, c'est encaisser : un paiement demande un
 * serveur, des obligations et une responsabilité qu'un module posé sur un
 * site statique n'a pas à porter. Au moment de payer, il passe la main — à
 * Snipcart quand le site en a un, à une page de paiement sinon.
 *
 * LE COMPORTEMENT EST UN SCRIPT EN TEXTE, comme celui des déclinaisons, et
 * pour la même raison : la page publiée est un fichier statique produit par
 * `core/bake.js`, et un écouteur posé à l'exécution ne s'y sérialise pas. Un
 * panier qui ne fonctionnerait plus une fois le site publié serait pire que
 * pas de panier — l'acheteur croirait avoir commandé.
 *
 * @module core/panier
 */
import { prixLisible } from './boutique.js';

/** Où le panier se range, par site. Deux sites d'un même navigateur ne se mélangent pas. */
export const clePanier = (siteId) => `admin:panier:${siteId || 'site'}`;

/**
 * Les attributs que porte un bouton « Ajouter au panier ».
 *
 * Tout ce dont le panier a besoin voyage SUR le bouton, pas dans une table
 * chargée à part : la page publiée doit se suffire à elle-même, y compris
 * quand le module n'est plus là.
 */
export function attributsProduit(produit) {
  return {
    'data-p-id': produit.id,
    'data-p-nom': produit.nom,
    'data-p-prix': String(produit.prix),
    'data-p-devise': produit.devise || 'EUR',
    ...(produit.image ? { 'data-p-image': produit.image } : {}),
    ...(produit.poids ? { 'data-p-poids': String(produit.poids) } : {}),
  };
}

/**
 * Le pied du panier : sous-total, et ce qui reste à la charge de l'acheteur.
 *
 * Les frais de port ne sont PAS calculés ici. Ils dépendent du pays, du
 * poids et des règles du vendeur, et annoncer un total qui changera à l'étape
 * suivante est la meilleure façon de faire abandonner une commande. On
 * annonce donc un sous-total, et on le dit.
 */
export function totalDe(lignes) {
  return lignes.reduce((somme, l) => somme + Number(l.prix) * Number(l.quantite), 0);
}

/** Le prix d'un total, écrit comme le reste de la boutique. */
export const totalLisible = (lignes, devise = 'EUR') =>
  prixLisible({ prix: Math.round(totalDe(lignes) * 100) / 100, devise });

/**
 * Le comportement, en texte.
 *
 * Volontairement sans dépendance et sans syntaxe récente : ce script atterrit
 * dans la page d'un client, qu'on ne contrôle pas, et qu'on ne veut pas voir
 * casser sur un navigateur d'avant-hier.
 */
export const SCRIPT_PANIER = `
(function () {
  var CLE = document.documentElement.getAttribute('data-panier-cle') || 'admin:panier:site';
  var DEVISE = { EUR: '\\u20AC', USD: '$', GBP: '\\u00A3', CHF: 'CHF', CAD: '$ CA' };

  function lire() {
    try { return JSON.parse(localStorage.getItem(CLE)) || []; } catch (e) { return []; }
  }
  function ecrire(lignes) {
    try { localStorage.setItem(CLE, JSON.stringify(lignes)); } catch (e) { /* navigation privée */ }
    peindre();
  }
  function prix(valeur, devise) {
    return valeur.toFixed(2).replace('.', ',') + ' ' + (DEVISE[devise] || devise || '\\u20AC');
  }
  function total(lignes) {
    var s = 0;
    for (var i = 0; i < lignes.length; i++) s += lignes[i].prix * lignes[i].quantite;
    return s;
  }
  /* Deux fois le même produit dans la même déclinaison, c'est une quantité,
     pas deux lignes : sinon l'acheteur croit s'être trompé. */
  function cle(ligne) { return ligne.id + '|' + (ligne.options || []).join('|'); }

  function ajouter(bouton) {
    var carte = bouton.closest('[data-produit]') || document;
    var options = [];
    var selects = carte.querySelectorAll('[data-declinaison]');
    for (var i = 0; i < selects.length; i++) {
      options.push(selects[i].previousSibling && selects[i].parentNode.firstChild.textContent
        ? selects[i].parentNode.firstChild.textContent.trim() + ' : ' + selects[i].value
        : selects[i].value);
    }
    var ligne = {
      id: bouton.getAttribute('data-p-id'),
      nom: bouton.getAttribute('data-p-nom'),
      prix: parseFloat(bouton.getAttribute('data-p-prix')) || 0,
      devise: bouton.getAttribute('data-p-devise') || 'EUR',
      image: bouton.getAttribute('data-p-image') || '',
      options: options,
      quantite: 1
    };
    var lignes = lire();
    var trouve = null;
    for (var j = 0; j < lignes.length; j++) if (cle(lignes[j]) === cle(ligne)) trouve = lignes[j];
    if (trouve) trouve.quantite += 1; else lignes.push(ligne);
    ecrire(lignes);
    ouvrir();
  }

  function changer(index, delta) {
    var lignes = lire();
    if (!lignes[index]) return;
    lignes[index].quantite += delta;
    if (lignes[index].quantite < 1) lignes.splice(index, 1);
    ecrire(lignes);
  }

  function ouvrir() {
    var t = document.querySelector('[data-panier-tiroir]');
    if (t) { t.hidden = false; requestAnimationFrame(function () { t.setAttribute('data-ouvert', '1'); }); }
  }
  function fermer() {
    var t = document.querySelector('[data-panier-tiroir]');
    if (!t) return;
    t.removeAttribute('data-ouvert');
    /* Retirer l'attribut ne fait que lancer l'animation de sortie : le voile
       reste dans la page et continue d'intercepter les clics. Sans ce
       hidden, la boutique devient inutilisable dès qu'on a ouvert le panier
       une fois — et rien ne le signale, les clics tombent simplement dans le
       vide. */
    setTimeout(function () { if (!t.hasAttribute('data-ouvert')) t.hidden = true; }, 320);
  }

  function lignesHtml(lignes) {
    var html = '';
    for (var i = 0; i < lignes.length; i++) {
      var l = lignes[i];
      html += '<li data-ligne="' + i + '">'
        + (l.image ? '<img src="' + l.image + '" alt="">' : '<span class="panier__trou"></span>')
        + '<div><p class="panier__nom">' + l.nom + '</p>'
        + (l.options.length ? '<p class="panier__opt">' + l.options.join(' \\u00B7 ') + '</p>' : '')
        + '<p class="panier__prix">' + prix(l.prix, l.devise) + '</p></div>'
        + '<div class="panier__qte">'
        + '<button type="button" data-moins="' + i + '" aria-label="Retirer un">\\u2212</button>'
        + '<span>' + l.quantite + '</span>'
        + '<button type="button" data-plus="' + i + '" aria-label="Ajouter un">+</button>'
        + '</div></li>';
    }
    return html;
  }

  function peindre() {
    var lignes = lire();
    var compte = 0;
    for (var i = 0; i < lignes.length; i++) compte += lignes[i].quantite;
    var devise = lignes.length ? lignes[0].devise : 'EUR';

    var badges = document.querySelectorAll('[data-panier-badge]');
    for (var b = 0; b < badges.length; b++) {
      badges[b].textContent = compte;
      badges[b].hidden = compte === 0;
    }
    var vides = document.querySelectorAll('[data-panier-vide]');
    for (var v = 0; v < vides.length; v++) vides[v].hidden = compte > 0;
    var pleins = document.querySelectorAll('[data-panier-plein]');
    for (var p = 0; p < pleins.length; p++) pleins[p].hidden = compte === 0;

    var listes = document.querySelectorAll('[data-panier-lignes]');
    for (var k = 0; k < listes.length; k++) listes[k].innerHTML = lignesHtml(lignes);
    var totaux = document.querySelectorAll('[data-panier-total]');
    for (var t = 0; t < totaux.length; t++) totaux[t].textContent = prix(total(lignes), devise);
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-p-id],[data-panier-ouvrir],[data-panier-fermer],[data-plus],[data-moins],[data-panier-vider]') : null;
    if (!el) return;
    if (el.hasAttribute('data-p-id')) { e.preventDefault(); ajouter(el); return; }
    if (el.hasAttribute('data-panier-ouvrir')) { e.preventDefault(); ouvrir(); return; }
    if (el.hasAttribute('data-panier-fermer')) { e.preventDefault(); fermer(); return; }
    if (el.hasAttribute('data-panier-vider')) { e.preventDefault(); ecrire([]); return; }
    if (el.hasAttribute('data-plus')) { e.preventDefault(); changer(+el.getAttribute('data-plus'), 1); return; }
    if (el.hasAttribute('data-moins')) { e.preventDefault(); changer(+el.getAttribute('data-moins'), -1); }
  });

  /* Un panier rempli dans un autre onglet doit se voir ici aussi : sinon on
     commande deux fois, ou on croit avoir perdu sa sélection. */
  window.addEventListener('storage', function (e) { if (e.key === CLE) peindre(); });
  document.addEventListener('DOMContentLoaded', peindre);
  peindre();
})();
`.trim();
