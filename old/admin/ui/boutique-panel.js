/**
 * Gestion du catalogue.
 *
 * Le module tient la fiche — nom, prix, photo, description — et le lien vers
 * la page de paiement. Il ne voit jamais un moyen de paiement, et ne tient ni
 * commande ni stock : c'est ce qui permet de vendre depuis un site statique
 * sans devenir responsable d'une caisse.
 * @module ui/boutique-panel
 */
import { h, icon, clear } from './el.js';
import { openModal } from './modal.js';
import { VENDEURS, normaliserProduit, prixLisible } from '../core/boutique.js';

export function openBoutique({ root, t, produits, boutique, pickMedia, onSave }) {
  let liste = (produits || []).map(normaliserProduit);
  let reglages = { mode: 'lien', ...(boutique || {}) };
  let edite = null;

  const corps = h('div', {});
  const pied = h('div', { class: 'assist__pied' });
  const modal = openModal({ root, title: t('boutiqueTitre'), body: corps, actions: [pied] });

  const enregistrer = () => onSave({ produits: liste, boutique: reglages });

  // ------------------------------------------------------------- liste
  function vueListe() {
    edite = null;
    clear(corps);

    corps.append(
      h('p', { class: 'hint', style: { marginTop: '0' } }, t('boutiqueIntro')),
      champMode(),
    );

    if (!liste.length) {
      corps.appendChild(h('p', { class: 'empty' }, t('boutiqueVide')));
    } else {
      const ul = h('ul', { class: 'list' });
      liste.forEach((produit, index) => {
        ul.appendChild(h('li', {},
          produit.image
            ? h('img', { src: produit.image, alt: '', style: { width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', flex: 'none' } })
            : h('span', { class: 'sel__icon' }, icon('grid', 14)),
          h('div', { class: 'list__main' },
            h('div', {}, produit.nom || t('boutiqueSansNom')),
            h('div', { class: 'list__meta' },
              prixLisible(produit) + ' · ' + t('type_' + produit.type)
              + (produit.categorie ? ' · ' + produit.categorie : '')
              + (produit.disponible ? '' : ' · ' + t('boutiqueIndisponible'))),
          ),
          h('button', {
            class: 'btn btn--sm', type: 'button', onclick: () => vueFiche(index),
          }, icon('pencil', 12), t('edit')),
          h('button', {
            class: 'btn btn--sm btn--icon btn--danger', type: 'button', title: t('remove'),
            onclick: () => {
              if (!confirm(t('boutiqueSupprConfirm'))) return;
              liste = liste.filter((x, i) => i !== index);
              enregistrer();
              vueListe();
            },
          }, icon('trash', 12)),
        ));
      });
      corps.appendChild(ul);
    }

    clear(pied);
    pied.append(
      h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => modal.close() }, t('close')),
      h('span', { style: { flex: '1' } }),
      h('button', {
        class: 'btn btn--primary', type: 'button',
        onclick: () => { liste = [...liste, normaliserProduit({ nom: '' })]; vueFiche(liste.length - 1); },
      }, icon('plus', 13), t('boutiqueAjouter')),
    );
  }

  /** Comment l'encaissement se fait : lien externe, ou panier sur le site. */
  function champMode() {
    const aide = h('p', { class: 'hint', style: { margin: '0 0 12px' } },
      t(reglages.mode === 'snipcart' ? 'boutiqueModePanierAide' : 'boutiqueModeLienAide'));

    const cle = h('div', { hidden: reglages.mode !== 'snipcart', style: { marginBottom: '12px' } },
      h('span', { class: 'field__label' }, t('boutiqueClePanier')),
      h('input', {
        class: 'input', type: 'text', value: reglages.cle || '',
        placeholder: 'API key Snipcart',
        oninput: (e) => { reglages = { ...reglages, cle: e.target.value }; enregistrer(); },
      }));

    return h('div', {},
      h('span', { class: 'field__label' }, t('boutiqueMode')),
      h('div', { class: 'seg', style: { marginBottom: '10px' } },
        ['lien', 'snipcart'].map((mode) => h('button', {
          class: 'seg__btn', type: 'button', 'aria-pressed': reglages.mode === mode ? 'true' : 'false',
          onclick: () => {
            reglages = { ...reglages, mode };
            enregistrer();
            vueListe();
          },
        }, t('boutiqueMode_' + mode)))),
      aide, cle,
    );
  }

  // ------------------------------------------------------------- fiche
  function vueFiche(index) {
    edite = index;
    const produit = liste[index];
    const maj = (patch) => {
      liste = liste.map((x, i) => (i === index ? normaliserProduit({ ...x, ...patch }) : x));
      enregistrer();
    };

    clear(corps);
    const apercu = h('img', {
      alt: '', style: { width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '8px', display: produit.image ? 'block' : 'none' },
    });
    if (produit.image) apercu.setAttribute('src', produit.image);

    corps.append(
      h('div', { class: 'field' },
        h('span', { class: 'field__label' }, t('boutiqueNom')),
        h('input', {
          class: 'input', type: 'text', value: produit.nom,
          oninput: (e) => maj({ nom: e.target.value }),
        })),

      h('div', { class: 'field' },
        h('span', { class: 'field__label' }, t('boutiqueDescription')),
        h('textarea', {
          class: 'textarea', style: { minHeight: '64px' }, value: produit.description,
          oninput: (e) => maj({ description: e.target.value }),
        })),

      h('div', { class: 'row', style: { marginBottom: '13px' } },
        h('label', {},
          h('span', { class: 'field__label' }, t('boutiquePrix')),
          h('input', {
            class: 'input', type: 'text', value: String(produit.prix).replace('.', ','),
            oninput: (e) => maj({ prix: e.target.value }),
          })),
        h('label', {},
          h('span', { class: 'field__label' }, t('boutiqueDevise')),
          h('select', {
            class: 'input', onchange: (e) => maj({ devise: e.target.value }),
          }, ['EUR', 'USD', 'GBP', 'CHF', 'CAD'].map((d) => h('option', {
            value: d, selected: d === produit.devise,
          }, d)))),
      ),

      h('div', { class: 'field' },
        h('span', { class: 'field__label' }, t('boutiqueType')),
        h('div', { class: 'seg' }, ['physique', 'virtuel'].map((type) => h('button', {
          class: 'seg__btn', type: 'button', 'aria-pressed': produit.type === type ? 'true' : 'false',
          onclick: () => { maj({ type }); vueFiche(index); },
        }, t('type_' + type))))),

      produit.type === 'physique' && reglages.mode === 'snipcart'
        ? h('div', { class: 'field' },
          h('span', { class: 'field__label' }, t('boutiquePoids')),
          h('input', {
            class: 'input', type: 'number', min: 0, step: 10, value: produit.poids || '',
            oninput: (e) => maj({ poids: e.target.value }),
          }))
        : null,

      h('div', { class: 'field' },
        h('span', { class: 'field__label' }, t('boutiqueImage')),
        apercu,
        h('div', { class: 'row', style: { marginTop: '7px' } },
          h('input', {
            class: 'input', type: 'text', value: produit.image, placeholder: t('noImage'),
            oninput: (e) => maj({ image: e.target.value }),
          }),
          h('button', {
            class: 'btn btn--icon', type: 'button', title: t('library'),
            onclick: () => pickMedia((item) => { maj({ image: item.url }); vueFiche(index); }, 'image'),
          }, icon('folder', 13)),
        )),

      h('div', { class: 'field' },
        h('span', { class: 'field__label' }, t('boutiqueCategorie')),
        h('input', {
          class: 'input', type: 'text', value: produit.categorie, placeholder: t('boutiqueCategoriePlaceholder'),
          oninput: (e) => maj({ categorie: e.target.value }),
        })),

      reglages.mode === 'lien' ? h('div', {},
        h('div', { class: 'field' },
          h('span', { class: 'field__label' }, t('boutiqueVendeur')),
          h('select', {
            class: 'input', onchange: (e) => { maj({ vendeur: e.target.value }); vueFiche(index); },
          }, VENDEURS.map((v) => h('option', {
            value: v.id, selected: v.id === produit.vendeur,
          }, t('vendeur_' + v.id))))),
        h('div', { class: 'field' },
          h('span', { class: 'field__label' }, t('boutiqueLien')),
          h('input', {
            class: 'input', type: 'text', value: produit.lien,
            placeholder: VENDEURS.find((v) => v.id === produit.vendeur)?.exemple || 'https://…',
            oninput: (e) => maj({ lien: e.target.value }),
          }),
          h('p', { class: 'hint' }, t('vendeur_' + produit.vendeur + '_aide'))),
      ) : null,

      h('label', { class: 'check' },
        h('input', {
          type: 'checkbox', checked: produit.disponible,
          onchange: (e) => maj({ disponible: e.target.checked }),
        }),
        t('boutiqueDisponible')),
    );

    clear(pied);
    pied.append(
      h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => vueListe() },
        icon('left', 13), t('boutiqueRetour')),
      h('span', { style: { flex: '1' } }),
      h('button', { class: 'btn btn--primary', type: 'button', onclick: () => vueListe() },
        icon('check', 13), t('done')),
    );
  }

  vueListe();
  return { modal, get edite() { return edite; } };
}
