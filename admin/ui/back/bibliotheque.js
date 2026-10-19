/**
 * La bibliothèque : choisir une mise en page en la voyant.
 *
 * Les galeries de modèles des autres constructeurs montrent des captures
 * d'écran. Ici chaque vignette est la page RENDUE — le même code que celui
 * qui construira la vôtre, dans votre ambiance, avec les mots de votre
 * métier. Changer le métier dans la liste repeint les onze vignettes, parce
 * qu'elles sont calculées et non stockées.
 *
 * Deux filtres et pas davantage : ce que la page EST (un accueil, un contact,
 * un article) et pour quel métier. Au-delà, on trie une galerie de onze
 * entrées, ce qui coûte plus d'attention que de la parcourir.
 * @module ui/back/bibliotheque
 */
import { h, icon, clear } from '../el.js';
import { teteEcran } from './shell-back.js';
import { TYPES_MODELE, modelesDuType, metiersBibliotheque } from '../../core/bibliotheque.js';

/**
 * @param {object} options
 * @param {Function} options.t
 * @param {Function} options.rendreModele reçoit (modeleId, metierId, theme), rend du HTML
 * @param {Function} options.theme renvoie le réglage d'ambiance du site
 * @param {Function} options.onCreer reçoit { modeleId, metier, nom }
 */
export function creerBibliotheque({ t, rendreModele, theme, onCreer }) {
  return async function dessiner(page) {
    let type = '';
    let metier = 'restaurant';
    const reglage = (await theme()) || null;

    const etat = h('span', { class: 'table__meta' });
    const choixMetier = h('select', {
      class: 'saisie', style: { width: 'auto' },
      onchange: (e) => { metier = e.target.value; peindre(); },
    }, metiersBibliotheque(t).map((m) => h('option', {
      value: m.id, selected: m.id === metier,
    }, m.nom)));

    page.appendChild(teteEcran(t('boBiblio'), t('boBiblioAide'),
      h('label', { class: 'demo-choix' }, h('span', {}, t('boDemoMetier')), choixMetier)));

    // Les familles de pages. « Toutes » d'abord : on arrive pour regarder,
    // pas pour chercher — le filtre sert au second passage.
    const onglets = h('div', { class: 'onglets' }, [
      bouton('', t('boBiblioTous')),
      ...TYPES_MODELE.map((id) => bouton(id, t('boBiblioType_' + id))),
    ]);
    page.appendChild(h('div', { class: 'carte', style: { marginBottom: '20px' } },
      h('div', { class: 'carte__tete' }, icon('template', 14), h('span', {}, t('boBiblioFiltre')), etat),
      h('div', { class: 'carte__corps' }, onglets)));

    function bouton(id, libelle) {
      return h('button', {
        class: 'onglet', type: 'button', 'aria-selected': id === type ? 'true' : 'false',
        onclick: (e) => {
          type = id;
          for (const b of e.currentTarget.parentElement.children) b.setAttribute('aria-selected', 'false');
          e.currentTarget.setAttribute('aria-selected', 'true');
          peindre();
        },
      }, libelle);
    }

    const grille = h('div', { class: 'themes-gal' });
    page.appendChild(grille);

    function peindre() {
      clear(grille);
      const retenus = modelesDuType(type);
      if (!retenus.length) {
        grille.appendChild(h('p', { class: 'table__meta' }, t('boBiblioVide')));
        return;
      }
      for (const modele of retenus) {
        // `srcdoc` plutôt qu'une adresse : la page de démonstration n'existe
        // nulle part sur le disque et n'a pas à y exister. Elle ne charge
        // rien du site, donc rien ne peut être confondu avec du vrai contenu.
        const vignette = h('iframe', {
          class: 'theme-vignette', tabindex: '-1', 'aria-hidden': 'true',
          scrolling: 'no', srcdoc: rendreModele(modele.id, metier, reglage),
        });

        grille.appendChild(h('div', { class: 'theme-carte' },
          h('div', { class: 'theme-carte__vue' }, vignette),
          h('div', { class: 'theme-carte__pied' },
            h('div', { class: 'theme-carte__main' },
              h('span', { class: 'theme-carte__nom' }, t('page_' + modele.id)),
              h('span', { class: 'theme-carte__police' }, t('boBiblioType_' + modele.type)),
            ),
          ),
          h('div', { class: 'theme-carte__actions' },
            h('button', { class: 'b b--sm', type: 'button', onclick: () => voir(modele) },
              icon('eye', 12), t('boThemeVoir')),
            h('button', { class: 'b b--sm b--fort', type: 'button', onclick: () => demander(modele) },
              icon('plus', 12), t('boBiblioPrendre')),
          ),
        ));
      }
    }

    /** La page en grand, dans un cadre isolé. */
    function voir(modele) {
      const cadre = h('iframe', {
        class: 'demo-cadre', title: t('page_' + modele.id), loading: 'lazy',
        srcdoc: rendreModele(modele.id, metier, reglage),
      });
      const voile = h('div', {
        class: 'voile voile--large',
        onclick: (e) => { if (e.target === voile) voile.remove(); },
      }, h('div', { class: 'voile__boite voile__boite--large' },
        h('div', { class: 'carte__tete' },
          icon('template', 14),
          h('span', {}, t('page_' + modele.id)),
          h('span', { class: 'table__meta' }, t('boBiblioAvertissement')),
          h('button', {
            class: 'b b--sm b--fort', type: 'button',
            onclick: () => { voile.remove(); demander(modele); },
          }, icon('plus', 12), t('boBiblioPrendre')),
          h('button', {
            class: 'b b--sm b--nu b--icone', type: 'button', onclick: () => voile.remove(),
          }, icon('close', 13)),
        ),
        cadre,
      ));
      document.body.appendChild(voile);
    }

    /**
     * Le nom de la page à créer.
     *
     * Le modèle se pose sur une page NEUVE, jamais sur une page qui existe :
     * remplacer une mise en page effacerait un travail, et une galerie n'est
     * pas l'endroit où l'on détruit quelque chose.
     */
    function demander(modele) {
      const nom = h('input', { class: 'saisie', type: 'text', placeholder: t('boBiblioNomAide') });
      const message = h('p', { class: 'table__meta', style: { marginTop: '10px' } }, '');
      const valider = h('button', { class: 'b b--fort', type: 'button', onclick: poser },
        icon('check', 13), t('boBiblioCreer'));

      async function poser() {
        const voulu = nom.value.trim();
        if (!voulu) { message.textContent = t('boBiblioNomManque'); nom.focus(); return; }
        valider.disabled = true;
        message.textContent = t('boBiblioEnCours');
        try {
          await onCreer({ modeleId: modele.id, metier, nom: voulu });
          voile.remove();
        } catch (err) {
          // La fenêtre RESTE ouverte : un nom déjà pris se corrige, et
          // refermer obligerait à tout recommencer sans savoir pourquoi.
          valider.disabled = false;
          message.textContent = String(err?.message || err);
        }
      }

      const voile = h('div', {
        class: 'voile', onclick: (e) => { if (e.target === voile) voile.remove(); },
      }, h('div', { class: 'voile__boite' },
        h('div', { class: 'carte__tete' },
          icon('pages', 14), h('span', {}, t('boBiblioCreerTitre', t('page_' + modele.id))),
          h('button', {
            class: 'b b--sm b--nu b--icone', type: 'button', onclick: () => voile.remove(),
          }, icon('close', 13)),
        ),
        h('div', { class: 'carte__corps' },
          h('label', { class: 'champ__libelle' }, t('boBiblioNom')),
          nom,
          message,
          h('div', { class: 'rangee', style: { marginTop: '14px' } }, valider),
        ),
      ));
      document.body.appendChild(voile);
      nom.focus();
    }

    peindre();
  };
}
