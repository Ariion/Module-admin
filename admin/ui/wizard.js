/**
 * Assistant de démarrage : d'une page vide à une page construite.
 *
 * Il ne s'ouvre que sur une page vierge — jamais sur un site existant, dont
 * le code doit rester intact : le module s'y accroche, il ne le refait pas.
 *
 * Deux questions, puis des propositions de mise en page dessinées à partir
 * des réponses. Le client valide, la page est construite, et il se retrouve
 * dans l'éditeur avec le panneau à côté.
 * @module ui/wizard
 */
import { h, icon, clear } from './el.js';
import { openModal } from './modal.js';
import { INTENTIONS, composerPropositions } from '../core/page-templates.js';

const MODES = ['une', 'plusieurs'];

/** Petit schéma de la trame : une barre par section. */
function apercu(formes) {
  return h('span', { class: 'pagetpl__preview' }, formes.map((forme) => {
    if (forme === 'bar') return h('span', { class: 'pagetpl__band' });
    const n = forme === 'duo' ? 2 : 3;
    return h('span', { class: 'pagetpl__row' },
      Array.from({ length: n }, () => h('span', { class: 'pagetpl__cell' })));
  }));
}

/**
 * @param {object} options
 * @param {HTMLElement} options.root racine du shadow DOM
 * @param {Function} options.t traduction
 * @param {Function} options.onApply reçoit (trees) : les sections à poser
 * @param {Function} [options.onSkip] appelé si l'assistant est refermé sans rien poser
 * @param {boolean} [options.peutCreerPages] l'hébergement accepte-t-il la création de pages
 */
export function openWizard({ root, t, onApply, onSkip, peutCreerPages = false }) {
  let mode = 'une';
  const intentions = new Set(['vitrine']);
  let propositions = [];
  let choisie = 0;
  let pose = false;

  const corps = h('div', { class: 'assist' });
  const pied = h('div', { class: 'assist__pied' });

  const modal = openModal({
    root, title: t('wizardTitle'), body: corps, actions: [pied],
    onClose: () => { if (!pose) onSkip?.(); },
  });

  // ---------------------------------------------------------- questions
  function etapeQuestions() {
    clear(corps);
    corps.append(
      h('p', { class: 'hint', style: { marginTop: '0' } }, t('wizardIntro')),

      h('div', { class: 'assist__q' },
        h('div', { class: 'assist__titre' }, t('wizardQ1')),
        h('div', { class: 'assist__cartes' }, MODES.map((m) => h('button', {
          class: 'assist__carte', type: 'button', 'aria-pressed': mode === m ? 'true' : 'false',
          onclick: () => { mode = m; etapeQuestions(); },
        },
          icon(m === 'une' ? 'section' : 'pages', 16),
          h('span', { class: 'assist__carteTitre' }, t('wizardMode_' + m)),
          h('span', { class: 'assist__carteAide' }, t('wizardMode_' + m + '_aide')),
        ))),
      ),

      h('div', { class: 'assist__q' },
        h('div', { class: 'assist__titre' }, t(mode === 'une' ? 'wizardQ2' : 'wizardQ2multi')),
        h('div', { class: 'assist__coches' }, INTENTIONS.map((intention) => {
          const coche = h('input', {
            type: 'checkbox', checked: intentions.has(intention.id),
            onchange: (e) => {
              if (e.target.checked) intentions.add(intention.id);
              else intentions.delete(intention.id);
              majSuite();
            },
          });
          return h('label', { class: 'assist__coche' }, coche,
            h('span', {},
              h('span', { class: 'assist__cocheTitre' }, t('intention_' + intention.id)),
              h('span', { class: 'assist__cocheAide' }, t('intention_' + intention.id + '_aide')),
            ));
        })),
      ),
    );

    clear(pied);
    const suite = h('button', {
      class: 'btn btn--primary', type: 'button',
      onclick: () => etapePropositions(),
    }, t('wizardNext'), icon('right', 13));
    pied.append(
      h('button', {
        class: 'btn btn--ghost', type: 'button', onclick: () => modal.close(),
      }, t('wizardSkip')),
      h('span', { style: { flex: '1' } }),
      suite,
    );
    majSuite();

    function majSuite() { suite.disabled = intentions.size === 0; }
  }

  // ------------------------------------------------------- propositions
  function etapePropositions() {
    propositions = composerPropositions(
      INTENTIONS.filter((i) => intentions.has(i.id)).map((i) => i.id), mode);
    choisie = 0;
    if (!propositions.length) { etapeQuestions(); return; }

    clear(corps);
    const liste = h('div', { class: 'assist__props' });
    corps.append(h('p', { class: 'hint', style: { marginTop: '0' } }, t('wizardPick')), liste);

    const dessiner = () => {
      clear(liste);
      propositions.forEach((proposition, index) => {
        liste.appendChild(h('button', {
          class: 'assist__prop', type: 'button',
          'aria-pressed': index === choisie ? 'true' : 'false',
          onclick: () => { choisie = index; dessiner(); },
        },
          apercu(proposition.apercu),
          h('span', { class: 'assist__propMain' },
            h('span', { class: 'assist__propTitre' }, t('wizardProp_' + proposition.id)),
            h('span', { class: 'assist__propMeta' },
              t('pageTplSections', proposition.trees.length)
              + ' · ' + proposition.modeles.map((m) => t('page_' + m)).join(', ')),
          ),
          index === choisie ? icon('check', 15) : null,
        ));
      });
    };
    dessiner();

    // Les pages restantes ne sont pas créées d'office : on dit où le faire.
    if (mode === 'plusieurs') {
      const autres = INTENTIONS.filter((i) => intentions.has(i.id)).slice(1);
      if (autres.length) {
        corps.appendChild(h('p', { class: 'assist__note' },
          icon('pages', 13),
          h('span', {}, t(peutCreerPages ? 'wizardPagesAfter' : 'wizardPagesManual',
            autres.map((i) => t('intention_' + i.id)).join(', '))),
        ));
      }
    }

    clear(pied);
    pied.append(
      h('button', {
        class: 'btn btn--ghost', type: 'button', onclick: () => etapeQuestions(),
      }, icon('left', 13), t('wizardBack')),
      h('span', { style: { flex: '1' } }),
      h('button', {
        class: 'btn btn--primary', type: 'button',
        onclick: () => {
          pose = true;
          modal.close();
          onApply(propositions[choisie].trees);
        },
      }, icon('check', 13), t('wizardApply')),
    );
  }

  etapeQuestions();
  return modal;
}
