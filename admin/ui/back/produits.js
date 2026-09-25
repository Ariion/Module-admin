/**
 * Le catalogue : la liste des produits, et la fiche de chacun.
 *
 * Deux écrans en un, comme dans toutes les boutiques que le client a déjà
 * vues : un tableau où l'on retrouve d'un coup d'œil ce qu'on vend, et une
 * fiche à onglets où l'on remplit. La fiche est à onglets parce qu'un
 * produit a une quinzaine de réglages dont dix ne servent qu'une fois : les
 * empiler dans un formulaire unique donne un mur.
 *
 * Le paiement reste délégué. Le module tient la fiche — nom, prix, photo,
 * description — et le bouton emmène l'acheteur chez le vendeur. Rien n'est
 * encaissé sur le site, et c'est ce qui permet de vendre depuis un
 * hébergement statique sans rien devoir à personne.
 * @module ui/back/produits
 */
import { h, icon, clear } from '../el.js';
import { teteEcran, listeVide } from './shell-back.js';
import { VENDEURS, normaliserProduit, prixLisible, categoriesDe } from '../../core/boutique.js';

const ONGLETS = ['fiche', 'prix', 'vente', 'image'];

/**
 * @param {object} options
 * @param {Function} options.t
 * @param {Function} options.lire renvoie { produits, boutique } (asynchrone)
 * @param {Function} options.enregistrer reçoit { produits, boutique }
 * @param {Function} options.choisirMedia ouvre la médiathèque, renvoie une adresse
 */
export function creerProduits({ t, lire, enregistrer, choisirMedia }) {
  return async function dessiner(page, produitVise = null) {
    const chargement = h('div', { class: 'charge' }, t('boChargement'));
    page.appendChild(chargement);
    const donnees = await lire();
    chargement.remove();

    let produits = (donnees.produits || []).map(normaliserProduit);
    const boutique = { mode: 'lien', ...(donnees.boutique || {}) };
    const etat = h('span', { class: 'table__meta' });

    async function sauver() {
      etat.textContent = t('boEnregistrement');
      try {
        await enregistrer({ produits, boutique });
        etat.textContent = t('boEnregistre');
      } catch (err) { etat.textContent = String(err?.message || err); }
    }

    const vue = h('div', {});
    page.appendChild(vue);

    const vise = produitVise && produits.find((p) => p.id === produitVise);
    if (vise) fiche(vise); else liste();

    // ------------------------------------------------------------ liste
    function liste() {
      clear(vue);
      const ajouter = () => {
        const neuf = normaliserProduit({ nom: '' });
        produits = [...produits, neuf];
        sauver().then(() => fiche(neuf));
      };

      vue.appendChild(teteEcran(t('boProduits'), t('boProduitsAide'),
        h('button', { class: 'b b--fort', type: 'button', onclick: ajouter },
          icon('plus', 14), t('boProduitNouveau')),
      ));

      vue.appendChild(carteEncaissement());

      const carte = h('div', { class: 'carte' });
      vue.appendChild(carte);
      carte.appendChild(h('div', { class: 'carte__tete' },
        icon('grid', 14), h('span', {}, t('boNbProduits', produits.length)), etat));

      if (!produits.length) {
        carte.appendChild(listeVide('grid', t('boProduitsVideLong'),
          h('button', { class: 'b b--fort', type: 'button', onclick: ajouter },
            icon('plus', 14), t('boProduitNouveau'))));
        return;
      }

      carte.appendChild(h('table', { class: 'table' },
        h('thead', {}, h('tr', {},
          h('th', {}, t('boColProduit')),
          h('th', {}, t('boColPrix')),
          h('th', {}, t('boColCategorie')),
          h('th', {}, t('boColEtat')),
          h('th', { style: { textAlign: 'right' } }, t('boColActions')),
        )),
        h('tbody', {}, produits.map((p) => h('tr', {},
          h('td', {},
            h('div', { class: 'prod-ligne' },
              p.image
                ? h('img', { class: 'prod-ligne__vignette', src: p.image, alt: '', loading: 'lazy' })
                : h('span', { class: 'prod-ligne__vignette prod-ligne__vide' }, icon('image', 14)),
              h('div', { class: 'table__nom' },
                h('button', { type: 'button', onclick: () => fiche(p) }, p.nom || t('boutiqueSansNom')),
                h('div', { class: 'table__meta' }, t('type_' + p.type)),
              ),
            )),
          h('td', {}, prixLisible(p)),
          h('td', { class: 'table__meta' }, p.categorie || '—'),
          h('td', {}, p.disponible
            ? h('span', { class: 'etat etat--publie' }, icon('check', 11), t('boProduitEnVente'))
            : h('span', { class: 'etat etat--neutre' }, t('boProduitRetire'))),
          h('td', { class: 'table__actions' },
            h('button', { class: 'b b--sm', type: 'button', onclick: () => fiche(p) },
              icon('pencil', 13), t('edit')),
            h('button', {
              class: 'b b--sm b--danger b--icone', type: 'button', title: t('remove'),
              onclick: () => supprimer(p),
            }, icon('trash', 13)),
          ),
        ))),
      ));
    }

    /** Comment l'encaissement se fait. Un réglage de boutique, pas de produit. */
    function carteEncaissement() {
      const cle = h('input', {
        class: 'saisie', type: 'text', value: boutique.snipcart || '',
        placeholder: t('boutiqueCleSnipcart'),
        oninput: (e) => { boutique.snipcart = e.target.value.trim(); sauver(); },
      });
      const bloc = h('label', {
        class: 'champ', hidden: boutique.mode !== 'snipcart', style: { marginTop: '12px' },
      }, h('span', { class: 'champ__nom' }, t('boutiqueCleSnipcart')), cle);

      const choix = h('div', { class: 'onglets onglets--plein' },
        ['lien', 'snipcart'].map((mode) => h('button', {
          class: 'onglet', type: 'button',
          'aria-selected': boutique.mode === mode ? 'true' : 'false',
          onclick: (e) => {
            boutique.mode = mode;
            for (const b of choix.children) b.setAttribute('aria-selected', 'false');
            e.currentTarget.setAttribute('aria-selected', 'true');
            bloc.hidden = mode !== 'snipcart';
            aide.textContent = t(mode === 'snipcart' ? 'boutiqueModePanierAide' : 'boutiqueModeLienAide');
            sauver();
          },
        }, t('boutiqueMode_' + mode))));

      const aide = h('p', { class: 'table__meta', style: { marginTop: '10px' } },
        t(boutique.mode === 'snipcart' ? 'boutiqueModePanierAide' : 'boutiqueModeLienAide'));

      return h('div', { class: 'carte', style: { marginBottom: '20px' } },
        h('div', { class: 'carte__tete' }, icon('grid', 14), h('span', {}, t('boutiqueMode'))),
        h('div', { class: 'carte__corps' }, choix, aide, bloc),
      );
    }

    function supprimer(produit) {
      if (!confirm(t('boProduitSupprimerSur', produit.nom || t('boutiqueSansNom')))) return;
      produits = produits.filter((p) => p.id !== produit.id);
      sauver().then(liste);
    }

    // ------------------------------------------------------------- fiche
    function fiche(produit) {
      clear(vue);
      let ouvert = 'fiche';

      const tete = teteEcran(
        produit.nom || t('boProduitNouveau'),
        t('boProduitFicheAide'),
        h('button', { class: 'b', type: 'button', onclick: () => liste() },
          icon('left', 14), t('boRetourProduits')),
      );
      // Le titre suit le nom qu'on tape : garder « Nouveau produit » en
      // haut d'une fiche qu'on vient de nommer fait douter de ce qui a été
      // enregistré.
      const titre = tete.querySelector('h1');
      vue.appendChild(tete);

      const maj = (patch) => {
        Object.assign(produit, normaliserProduit({ ...produit, ...patch }));
        if (titre) titre.textContent = produit.nom || t('boProduitNouveau');
        sauver();
      };

      const corps = h('div', { class: 'carte__corps' });
      const barre = h('div', { class: 'onglets' }, ONGLETS.map((id) => h('button', {
        class: 'onglet', type: 'button', 'aria-selected': id === ouvert ? 'true' : 'false',
        onclick: (e) => {
          ouvert = id;
          for (const b of barre.children) b.setAttribute('aria-selected', 'false');
          e.currentTarget.setAttribute('aria-selected', 'true');
          peindre();
        },
      }, t('boOnglet_' + id))));

      vue.appendChild(h('div', { class: 'carte' },
        h('div', { class: 'carte__tete' }, icon('grid', 14),
          h('span', {}, t('boProduitFiche')), etat),
        h('div', { style: { padding: '0 16px' } }, barre),
        corps,
      ));

      const champ = (libelle, saisie, aide) => h('label', { class: 'champ' },
        h('span', { class: 'champ__nom' }, libelle),
        saisie,
        aide ? h('span', { class: 'rubrique__aide' }, aide) : null,
      );

      const texte = (valeur, ecrire, options = {}) => h('input', {
        class: 'saisie', type: options.type || 'text', value: valeur ?? '',
        placeholder: options.placeholder || '',
        oninput: (e) => ecrire(e.target.value),
      });

      function peindre() {
        clear(corps);
        if (ouvert === 'fiche') {
          corps.append(
            champ(t('boutiqueNom'), texte(produit.nom, (v) => maj({ nom: v }))),
            champ(t('boutiqueDescription'), h('textarea', {
              class: 'saisie', style: { minHeight: '90px', resize: 'vertical' },
              value: produit.description,
              oninput: (e) => maj({ description: e.target.value }),
            }), t('boProduitDescriptionAide')),
            champ(t('boutiqueCategorie'),
              texte(produit.categorie, (v) => maj({ categorie: v }),
                { placeholder: categoriesDe(produits).join(', ') }),
              t('boProduitCategorieAide')),
          );
        } else if (ouvert === 'prix') {
          corps.append(
            h('div', { class: 'duo' },
              champ(t('boutiquePrix'), texte(String(produit.prix).replace('.', ','),
                (v) => maj({ prix: v }), { placeholder: '24,90' })),
              champ(t('boutiqueDevise'), h('select', {
                class: 'saisie', onchange: (e) => maj({ devise: e.target.value }),
              }, ['EUR', 'USD', 'GBP', 'CHF', 'CAD'].map((d) => h('option', {
                value: d, selected: produit.devise === d,
              }, d)))),
            ),
            champ(t('boutiqueType'), h('select', {
              class: 'saisie', onchange: (e) => { maj({ type: e.target.value }); peindre(); },
            }, ['physique', 'virtuel'].map((x) => h('option', {
              value: x, selected: produit.type === x,
            }, t('type_' + x))))),
            produit.type === 'physique'
              ? champ(t('boutiquePoids'), texte(String(produit.poids),
                (v) => maj({ poids: v }), { type: 'number' }), t('boProduitPoidsAide'))
              : null,
            h('label', { class: 'rubrique', style: { paddingLeft: '0' } },
              h('input', {
                type: 'checkbox', checked: produit.disponible,
                onchange: (e) => maj({ disponible: e.target.checked }),
              }),
              h('span', { class: 'rubrique__main' },
                h('span', { class: 'rubrique__nom' }, t('boProduitEnVente')),
                h('span', { class: 'rubrique__aide' }, t('boProduitDisponibleAide')),
              ),
            ),
          );
        } else if (ouvert === 'vente') {
          const vendeur = VENDEURS.find((v) => v.id === produit.vendeur) || VENDEURS[0];
          corps.append(
            champ(t('boutiqueVendeur'), h('select', {
              class: 'saisie', onchange: (e) => { maj({ vendeur: e.target.value }); peindre(); },
            }, VENDEURS.map((v) => h('option', {
              value: v.id, selected: produit.vendeur === v.id,
            }, t('vendeur_' + v.id))))),
            champ(t('boutiqueLien'),
              texte(produit.lien, (v) => maj({ lien: v }), { placeholder: vendeur.exemple }),
              t('boProduitLienAide')),
          );
        } else {
          corps.append(
            produit.image
              ? h('img', { class: 'prod-photo', src: produit.image, alt: '' })
              : h('div', { class: 'prod-photo prod-photo--vide' }, icon('image', 28)),
            h('div', { class: 'row', style: { display: 'flex', gap: '8px', marginTop: '12px' } },
              h('button', {
                class: 'b', type: 'button',
                onclick: async () => {
                  const url = await choisirMedia();
                  if (url) { maj({ image: url }); peindre(); }
                },
              }, icon('image', 13), t('chooseMedia')),
              produit.image
                ? h('button', {
                  class: 'b b--danger', type: 'button',
                  onclick: () => { maj({ image: '' }); peindre(); },
                }, icon('trash', 13), t('remove'))
                : null,
            ),
            champ(t('boutiqueImage'), texte(produit.image, (v) => maj({ image: v }),
              { placeholder: 'https://…' })),
          );
        }
      }

      peindre();
    }
  };
}
