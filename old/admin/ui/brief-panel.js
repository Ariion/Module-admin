/**
 * « Je ne sais pas quoi mettre » — le questionnaire qui écrit la page.
 *
 * Trois écrans, des questions auxquelles n'importe qui sait répondre sur son
 * propre métier, et à la fin une page entière : accroche, prestations,
 * présentation, photos, coordonnées, plan. Aucune de ces questions ne demande
 * de savoir ce qu'est une section, un bloc ou une mise en page.
 *
 * @module ui/brief-panel
 */
import { h, icon, clear } from './el.js';
import { openModal } from './modal.js';
import { METIERS, ATOUTS, briefVide, briefUtilisable } from '../core/brief.js';

const TONS = ['chaleureux', 'sobre', 'dynamique'];

/** Champ court, avec son libellé et son aide. */
function champ(t, cle, valeur, onSaisie, { multi = false, placeholder = '' } = {}) {
  const saisie = multi
    ? h('textarea', { class: 'input input--multi', rows: 4, value: valeur, placeholder })
    : h('input', { class: 'input', type: 'text', value: valeur, placeholder });
  saisie.addEventListener('input', () => onSaisie(saisie.value));
  return h('label', { class: 'champ' },
    h('span', { class: 'champ__nom' }, t('brief_' + cle)),
    h('span', { class: 'champ__aide' }, t('briefAide_' + cle)),
    saisie);
}

/**
 * @param {object} options
 * @param {HTMLElement} options.root
 * @param {Function} options.t
 * @param {object|null} options.brief brief déjà rempli, s'il y en a un
 * @param {boolean} options.iaDisponible une rédaction par IA est-elle possible
 * @param {Function} options.onApply reçoit (brief, {ia}) et construit la page
 */
export function openBrief({ root, t, brief: initial, iaDisponible, onApply }) {
  let brief = { ...briefVide(), ...(initial || {}) };
  let avecIA = false;
  let etape = 0;

  const corps = h('div', { class: 'assist' });
  const pied = h('div', { class: 'assist__pied' });
  const modal = openModal({ root, title: t('briefTitre'), body: corps, actions: [pied] });

  const maj = (cle) => (valeur) => { brief = { ...brief, [cle]: valeur }; };

  // ------------------------------------------------------- 1. qui vous êtes
  function etapeIdentite() {
    clear(corps);
    corps.append(
      h('p', { class: 'hint', style: { marginTop: '0' } }, t('briefIntro')),
      champ(t, 'activite', brief.activite, (v) => { maj('activite')(v); majPied(); },
        { placeholder: t('briefExempleActivite') }),
      h('div', { class: 'assist__q' },
        h('div', { class: 'assist__titre' }, t('briefMetier')),
        h('div', { class: 'metiers' }, METIERS.map((metier) => h('button', {
          class: 'metier', type: 'button',
          'aria-pressed': brief.metier === metier.id ? 'true' : 'false',
          onclick: () => { brief = { ...brief, metier: metier.id }; etapeIdentite(); },
        }, t('metier_' + metier.id)))),
      ),
      champ(t, 'ville', brief.ville, maj('ville')),
    );
    majPied();
  }

  // -------------------------------------------------- 2. ce que vous faites
  function etapeOffre() {
    clear(corps);
    corps.append(
      champ(t, 'phrase', brief.phrase, maj('phrase'), { placeholder: t('briefExemplePhrase') }),
      champ(t, 'prestations', brief.prestations, maj('prestations'),
        { multi: true, placeholder: t('briefExemplePrestations') }),
      h('div', { class: 'assist__q' },
        h('div', { class: 'assist__titre' }, t('briefAtouts')),
        h('div', { class: 'assist__coches' }, ATOUTS.map((atout) => {
          const coche = h('input', {
            type: 'checkbox', checked: (brief.atouts || []).includes(atout.id),
            onchange: (e) => {
              const set = new Set(brief.atouts || []);
              if (e.target.checked) set.add(atout.id); else set.delete(atout.id);
              brief = { ...brief, atouts: [...set] };
              etapeOffre();
            },
          });
          return h('label', { class: 'assist__coche assist__coche--court' }, coche,
            h('span', {}, h('span', { class: 'assist__cocheTitre' }, t('atout_' + atout.id))));
        })),
      ),
      // Deux atouts demandent une précision : sans elle, la phrase resterait vague.
      (brief.atouts || []).includes('anciennete')
        ? champ(t, 'depuis', brief.depuis, maj('depuis'), { placeholder: '1998' }) : null,
      (brief.atouts || []).includes('deplacement')
        ? champ(t, 'zone', brief.zone, maj('zone'), { placeholder: t('briefExempleZone') }) : null,
    );
    majPied();
  }

  // ------------------------------------------------ 3. comment vous joindre
  function etapeContact() {
    clear(corps);
    corps.append(
      champ(t, 'telephone', brief.telephone, maj('telephone')),
      champ(t, 'courriel', brief.courriel, maj('courriel')),
      champ(t, 'adresse', brief.adresse, maj('adresse')),
      champ(t, 'horaires', brief.horaires, maj('horaires'), { placeholder: t('briefExempleHoraires') }),

      h('div', { class: 'assist__q' },
        h('div', { class: 'assist__titre' }, t('briefTon')),
        h('div', { class: 'seg' }, TONS.map((ton) => h('button', {
          class: 'seg__btn', type: 'button',
          'aria-pressed': brief.ton === ton ? 'true' : 'false',
          onclick: () => { brief = { ...brief, ton }; etapeContact(); },
        }, t('ton_' + ton)))),
      ),

      // La rédaction par IA n'est proposée que si elle est réellement branchée.
      iaDisponible
        ? h('label', { class: 'assist__coche', style: { marginTop: '16px' } },
          h('input', {
            type: 'checkbox', checked: avecIA,
            onchange: (e) => { avecIA = e.target.checked; },
          }),
          h('span', {},
            h('span', { class: 'assist__cocheTitre' }, t('briefIA')),
            h('span', { class: 'assist__cocheAide' }, t('briefIAAide'))))
        : h('p', { class: 'hint' }, t('briefSansIA')),
    );
    majPied();
  }

  const ECRANS = [etapeIdentite, etapeOffre, etapeContact];

  function majPied() {
    clear(pied);
    const precedent = h('button', {
      class: 'btn btn--ghost', type: 'button',
      onclick: () => { etape -= 1; ECRANS[etape](); },
    }, icon('left', 13), t('wizardBack'));

    const suivant = h('button', {
      class: 'btn btn--primary', type: 'button',
      onclick: () => { etape += 1; ECRANS[etape](); },
    }, t('briefSuivant'), icon('right', 13));

    const construire = h('button', {
      class: 'btn btn--primary', type: 'button',
      onclick: () => { modal.close(); onApply(brief, { ia: avecIA }); },
    }, icon('check', 13), t('briefConstruire'));

    const dernier = etape === ECRANS.length - 1;
    suivant.disabled = !briefUtilisable(brief);
    construire.disabled = !briefUtilisable(brief);

    pied.append(
      etape > 0 ? precedent : h('button', {
        class: 'btn btn--ghost', type: 'button', onclick: () => modal.close(),
      }, t('cancel')),
      h('span', { style: { flex: '1' } }),
      h('span', { class: 'assist__pas' }, t('briefPas', etape + 1, ECRANS.length)),
      dernier ? construire : suivant,
    );
  }

  etapeIdentite();
  return modal;
}
