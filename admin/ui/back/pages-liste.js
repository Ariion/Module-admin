/**
 * Les pages du site : la liste, et ce qu'on peut en faire.
 *
 * Le back-office s'arrête au CHÂSSIS — créer une page, la nommer, la
 * supprimer, voir où elle en est. Écrire dedans se fait sur la page
 * elle-même, où l'on voit ce qu'on écrit. Chaque ligne porte donc deux
 * portes : « Structure » pour poser les sections, « Écrire » pour les
 * remplir.
 *
 * Créer une page depuis le back-office demande un hébergement capable
 * d'écrire un fichier. Quand il ne l'est pas, on le dit une fois, en haut,
 * au lieu de laisser un bouton qui échouera.
 * @module ui/back/pages-liste
 */
import { h, icon } from '../el.js';
import { teteEcran, listeVide } from './shell-back.js';
import { slugPage } from '../../core/pages.js';

/**
 * @param {object} options
 * @param {Function} options.t
 * @param {Function} options.lister renvoie les pages connues (asynchrone)
 * @param {Function} options.peutCreer l'hébergement sait-il écrire un fichier
 * @param {Function} options.onCreer
 * @param {Function} options.onStructure ouvre la structure d'une page
 * @param {Function} options.onEcrire ouvre l'éditeur en direct sur la page
 * @param {Function} options.onSupprimer
 */
export function creerPagesListe({ t, lister, peutCreer, onCreer, onStructure, onEcrire, onSupprimer }) {
  return async function dessiner(page, cheminVise = null) {
    let pages = [];

    const creer = h('button', {
      class: 'b b--fort', type: 'button', disabled: !peutCreer(),
      onclick: () => demanderPage(),
    }, icon('plus', 14), t('boPageCreer'));

    page.appendChild(teteEcran(t('boPages'), t('boPagesAide'), creer));

    if (!peutCreer()) {
      page.appendChild(h('div', { class: 'note', style: { marginBottom: '18px' } },
        icon('warn', 14), h('span', {}, t('boPagesSansHote'))));
    }

    const carte = h('div', { class: 'carte' });
    page.appendChild(carte);
    carte.appendChild(h('div', { class: 'charge' }, t('boChargement')));

    pages = await lister();
    carte.replaceChildren();

    if (!pages.length) {
      carte.appendChild(listeVide('pages', t('boPagesVideLong'),
        peutCreer() ? h('button', { class: 'b b--fort', type: 'button', onclick: () => demanderPage() },
          icon('plus', 14), t('boPageCreer')) : null));
      return;
    }

    carte.appendChild(h('table', { class: 'table' },
      h('thead', {}, h('tr', {},
        h('th', {}, t('boColPage')),
        h('th', {}, t('boColEtat')),
        h('th', {}, t('boColSections')),
        h('th', { style: { textAlign: 'right' } }, t('boColActions')),
      )),
      h('tbody', {}, pages.map((p) => ligne(p, p.chemin === cheminVise))),
    ));

    function ligne(p, visee) {
      const rang = h('tr', visee ? { style: { background: 'var(--accent-pale)' } } : {},
        h('td', { class: 'table__nom' },
          h('button', { type: 'button', onclick: () => onStructure(p) }, p.nom),
          // La mention « page d'accueil » n'a d'intérêt que si le nom ne le
          // dit pas déjà : « Accueil · Accueil » ne renseigne personne.
          h('div', { class: 'table__meta' },
            p.chemin + (p.accueil && p.nom !== t('boPageAccueil') ? ' · ' + t('boPageAccueilMarque') : '')),
        ),
        h('td', {}, etatDe(p)),
        h('td', {}, p.sections == null
          ? h('span', { style: { color: 'var(--pale)' } }, '—')
          : t('boNbSections', p.sections)),
        h('td', { class: 'table__actions' },
          h('button', { class: 'b b--sm', type: 'button', onclick: () => onStructure(p) },
            icon('layers', 13), t('boStructure')),
          h('button', { class: 'b b--sm', type: 'button', onclick: () => onEcrire(p) },
            icon('pencil', 13), t('boEcrire')),
          // La page d'accueil ne se supprime pas : un site sans accueil n'est
          // plus un site, et rien ne permettrait de le rattraper depuis ici.
          p.accueil ? null : h('button', {
            class: 'b b--sm b--danger b--icone', type: 'button',
            title: t('boPageSupprimer'), 'aria-label': t('boPageSupprimer'),
            disabled: !peutCreer(),
            onclick: () => confirmerSuppression(p),
          }, icon('trash', 13)),
        ),
      );
      return rang;
    }

    /**
     * Créer une page : un nom, et le fichier se déduit.
     *
     * On montre le nom de fichier au fur et à mesure de la frappe. Le
     * client n'a pas à le choisir, mais il a le droit de le voir : c'est
     * l'adresse que porteront ses liens, et il la retrouvera en FTP.
     */
    function demanderPage() {
      const nom = h('input', { class: 'saisie', type: 'text', placeholder: t('boPageNomExemple') });
      const fichier = h('span', { class: 'rubrique__aide' }, slugPage(''));
      const erreur = h('p', { class: 'erreur' });

      nom.addEventListener('input', () => { fichier.textContent = slugPage(nom.value); });

      const depuis = h('select', { class: 'saisie' },
        h('option', { value: '' }, t('boPageVierge')),
        ...pages.map((p) => h('option', { value: p.chemin }, t('boPageCopier', p.nom))));

      const bouton = h('button', { class: 'b b--fort', type: 'button' },
        icon('plus', 13), t('boPageCreer'));

      const valider = async () => {
        const titre = nom.value.trim();
        if (!titre) { erreur.textContent = t('boPageNomManquant'); nom.focus(); return; }
        erreur.textContent = '';
        bouton.disabled = nom.disabled = depuis.disabled = true;
        bouton.replaceChildren(icon('upload', 13), document.createTextNode(t('boCreationEnCours')));
        try {
          await onCreer({ nom: titre, chemin: slugPage(titre), depuis: depuis.value || null });
          voile.remove();
        } catch (err) {
          erreur.textContent = String(err?.message || err);
          bouton.disabled = nom.disabled = depuis.disabled = false;
          bouton.replaceChildren(icon('plus', 13), document.createTextNode(t('boPageCreer')));
          nom.focus();
        }
      };
      bouton.addEventListener('click', valider);
      nom.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); valider(); }
      });

      const voile = h('div', {
        class: 'voile', onclick: (e) => { if (e.target === voile) voile.remove(); },
      }, h('div', { class: 'voile__boite', style: { width: 'min(480px, 100%)' } },
        h('div', { class: 'carte__tete' }, icon('pages', 14), h('span', {}, t('boPageCreer')),
          h('button', {
            class: 'b b--sm b--nu b--icone', type: 'button', onclick: () => voile.remove(),
          }, icon('close', 13))),
        h('div', { class: 'carte__corps' },
          h('label', { class: 'champ' },
            h('span', { class: 'champ__nom' }, t('boPageNom')), nom, fichier),
          h('label', { class: 'champ' },
            h('span', { class: 'champ__nom' }, t('boPageDepuis')), depuis,
            h('span', { class: 'rubrique__aide' }, t('boPageDepuisAide'))),
          erreur,
          h('div', { style: { display: 'flex', gap: '8px', marginTop: '14px' } },
            bouton,
            h('button', { class: 'b', type: 'button', onclick: () => voile.remove() }, t('cancel')),
          ),
        ),
      ));
      document.body.appendChild(voile);
      nom.focus();
    }

    /**
     * Supprimer une page efface un fichier. On demande donc le nom, écrit à
     * la main : une case à cocher se coche sans lire, un nom recopié ne se
     * recopie pas par distraction.
     */
    function confirmerSuppression(p) {
      const saisie = h('input', { class: 'saisie', type: 'text', placeholder: p.nom });
      const erreur = h('p', { class: 'erreur' });
      const bouton = h('button', { class: 'b b--danger', type: 'button', disabled: true },
        icon('trash', 13), t('boPageSupprimer'));

      saisie.addEventListener('input', () => {
        bouton.disabled = saisie.value.trim().toLowerCase() !== p.nom.trim().toLowerCase();
      });

      bouton.addEventListener('click', async () => {
        bouton.disabled = true;
        try { await onSupprimer(p); voile.remove(); }
        catch (err) { erreur.textContent = String(err?.message || err); bouton.disabled = false; }
      });

      const voile = h('div', {
        class: 'voile', onclick: (e) => { if (e.target === voile) voile.remove(); },
      }, h('div', { class: 'voile__boite', style: { width: 'min(480px, 100%)' } },
        h('div', { class: 'carte__tete' }, icon('warn', 14),
          h('span', {}, t('boPageSupprimerTitre', p.nom)),
          h('button', {
            class: 'b b--sm b--nu b--icone', type: 'button', onclick: () => voile.remove(),
          }, icon('close', 13))),
        h('div', { class: 'carte__corps' },
          h('div', { class: 'note', style: { marginBottom: '14px' } }, icon('warn', 14),
            h('span', {}, t('boPageSupprimerAvertissement', p.chemin))),
          h('label', { class: 'champ' },
            h('span', { class: 'champ__nom' }, t('boPageSupprimerConfirme', p.nom)), saisie),
          erreur,
          h('div', { style: { display: 'flex', gap: '8px', marginTop: '14px' } },
            bouton,
            h('button', { class: 'b', type: 'button', onclick: () => voile.remove() }, t('cancel')),
          ),
        ),
      ));
      document.body.appendChild(voile);
      saisie.focus();
    }

    function etatDe(p) {
      if (p.brouillon) return h('span', { class: 'etat etat--brouillon' }, icon('warn', 11), t('unpublished'));
      if (p.publie) return h('span', { class: 'etat etat--publie' }, icon('check', 11), t('published'));
      return h('span', { class: 'etat etat--neutre' }, t('boPageIntacte'));
    }
  };
}
