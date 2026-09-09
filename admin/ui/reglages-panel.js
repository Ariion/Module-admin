/**
 * Réglages : les clés, saisies depuis le module.
 *
 * Le client ne doit ouvrir aucun fichier. Mais toutes les clés ne se valent
 * pas, et le panneau le dit plutôt que de les traiter pareil :
 *
 *   - la clé **Pixabay** est gratuite et limitée par un quota. Elle est
 *     rangée dans les réglages du site, donc lisible par qui inspecte le
 *     site — comme elle l'était déjà dans le fichier de configuration. Ce
 *     n'est pas grave, et c'est écrit noir sur blanc.
 *
 *   - la clé de **rédaction assistée** est facturée. Elle part vers le script
 *     PHP de l'hébergement et n'en revient jamais ; à défaut de PHP, elle
 *     reste dans le navigateur de l'administrateur. Jamais dans les réglages
 *     du site, jamais dans le HTML publié.
 *
 * @module ui/reglages-panel
 */
import { h, icon, clear } from './el.js';
import { openModal } from './modal.js';
import { FOURNISSEURS, cleLocale, poserCleLocale } from '../core/ia.js';

/** Champ de saisie d'un secret : masqué, avec un bouton pour le relire. */
function champSecret(valeur, placeholder, onSaisie) {
  const saisie = h('input', {
    class: 'input', type: 'password', value: valeur, placeholder, autocomplete: 'off',
  });
  saisie.addEventListener('input', () => onSaisie(saisie.value.trim()));
  const oeil = h('button', {
    class: 'btn btn--icon', type: 'button', title: 'Afficher',
    onclick: () => { saisie.type = saisie.type === 'password' ? 'text' : 'password'; },
  }, icon('eye', 13));
  return { bloc: h('div', { class: 'row' }, saisie, oeil), saisie };
}

/**
 * @param {object} options
 * @param {HTMLElement} options.root
 * @param {Function} options.t
 * @param {object} options.etat  { pixabay, iaEnPlace, iaFournisseur, peutEndpoint }
 * @param {Function} options.onPixabay      reçoit la clé Pixabay
 * @param {Function} options.onCleIA        reçoit ({cle, fournisseur}) — hébergement
 * @param {Function} options.onCleIALocale  reçoit ({cle, fournisseur}) — navigateur
 */
export function openReglages({ root, t, etat, onPixabay, onCleIA, onCleIALocale }) {
  let pixabay = etat.pixabay || '';
  let cleIA = '';
  let fournisseur = etat.iaFournisseur || 'anthropic';
  const corps = h('div', {});
  const message = h('p', { class: 'hint' });

  const modal = openModal({
    root, title: t('reglagesTitre'), body: corps,
    actions: [
      message,
      h('span', { style: { flex: '1' } }),
      h('button', {
        class: 'btn btn--primary', type: 'button', onclick: () => modal.close(),
      }, icon('check', 13), t('done')),
    ],
  });

  function dessiner() {
    clear(corps);

    // ------------------------------------------------------ banque d'images
    const cleImage = champSecret(pixabay, 'ex. 12345678-abcdef…', (v) => { pixabay = v; });
    corps.append(
      h('h3', { class: 'reglages__titre' }, icon('image', 14), t('reglagesImages')),
      h('p', { class: 'hint', style: { marginTop: '0' } },
        pixabay ? t('reglagesImagesPixabay') : t('reglagesImagesOpenverse')),
      h('label', { class: 'champ' },
        h('span', { class: 'champ__nom' }, t('reglagesClePixabay')),
        h('span', { class: 'champ__aide' }, t('reglagesClePixabayAide')),
        cleImage.bloc),
      h('div', { class: 'row', style: { marginTop: '8px' } },
        h('button', {
          class: 'btn btn--primary', type: 'button',
          onclick: () => {
            onPixabay(pixabay);
            message.textContent = pixabay ? t('reglagesEnregistre') : t('reglagesRetiree');
            dessiner();
          },
        }, icon('check', 13), t('reglagesEnregistrer')),
      ),
      h('p', { class: 'champ__aide', style: { marginTop: '8px' } }, t('reglagesClePixabayVisible')),

      h('hr', { class: 'reglages__trait' }),
    );

    // ---------------------------------------------------- rédaction assistée
    const cleTexte = champSecret('', etat.iaEnPlace ? t('reglagesDejaEnPlace') : 'sk-…',
      (v) => { cleIA = v; });

    corps.append(
      h('h3', { class: 'reglages__titre' }, icon('pencil', 14), t('reglagesIA')),
      h('p', { class: 'hint', style: { marginTop: '0' } }, t('reglagesIAAide')),

      h('label', { class: 'champ' },
        h('span', { class: 'champ__nom' }, t('reglagesFournisseur')),
        h('div', { class: 'seg' }, FOURNISSEURS.map((f) => h('button', {
          class: 'seg__btn', type: 'button',
          'aria-pressed': fournisseur === f.id ? 'true' : 'false',
          onclick: () => { fournisseur = f.id; dessiner(); },
        }, f.id)))),

      h('label', { class: 'champ' },
        h('span', { class: 'champ__nom' }, t('reglagesCleIA')),
        h('span', { class: 'champ__aide' },
          etat.peutEndpoint ? t('reglagesCleIAServeur') : t('reglagesCleIANavigateur')),
        cleTexte.bloc),

      h('div', { class: 'row', style: { marginTop: '8px' } },
        h('button', {
          class: 'btn btn--primary', type: 'button',
          onclick: async () => {
            message.textContent = t('reglagesEnCours');
            try {
              if (etat.peutEndpoint) await onCleIA({ cle: cleIA, fournisseur });
              else onCleIALocale({ cle: cleIA, fournisseur });
              etat.iaEnPlace = !!cleIA;
              cleIA = '';
              message.textContent = etat.iaEnPlace ? t('reglagesEnregistre') : t('reglagesRetiree');
              dessiner();
            } catch (err) {
              message.textContent = err?.message || t('reglagesEchec');
            }
          },
        }, icon('check', 13), t('reglagesEnregistrer')),
        etat.iaEnPlace
          ? h('button', {
            class: 'btn btn--ghost', type: 'button',
            onclick: async () => {
              cleIA = '';
              if (etat.peutEndpoint) await onCleIA({ cle: '', fournisseur });
              else onCleIALocale({ cle: '', fournisseur });
              etat.iaEnPlace = false;
              message.textContent = t('reglagesRetiree');
              dessiner();
            },
          }, icon('trash', 13), t('reglagesRetirer'))
          : null,
      ),

      h('p', { class: 'champ__aide', style: { marginTop: '8px' } },
        etat.iaEnPlace ? t('reglagesIAEnPlace') : t('reglagesIAAbsente')),
      h('p', { class: 'champ__aide' }, t('reglagesJamaisConfig')),
    );
  }

  dessiner();
  // La clé locale déjà posée compte comme « en place ».
  if (!etat.peutEndpoint && cleLocale()) etat.iaEnPlace = true;
  return modal;
}

export { poserCleLocale };
