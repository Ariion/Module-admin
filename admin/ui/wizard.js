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
import { rendreChoixTheme } from './theme-panel.js';
import { apercuPage } from './apercu-page.js';

const MODES = ['une', 'plusieurs'];

/**
 * @param {object} options
 * @param {HTMLElement} options.root racine du shadow DOM
 * @param {Function} options.t traduction
 * @param {Function} options.onApply reçoit (trees, theme) : les sections à poser
 *   et l'ambiance retenue
 * @param {Function} [options.onSkip] appelé si l'assistant est refermé sans rien poser
 * @param {boolean} [options.peutCreerPages] l'hébergement accepte-t-il la création de pages
 * @param {object|null} [options.theme] ambiance déjà retenue pour le site, s'il y en a une
 */
export function openWizard({ root, t, onApply, onSkip, onBrief, peutCreerPages = false, theme: themeSite = null }) {
  let mode = 'une';
  const intentions = new Set(['vitrine']);
  let propositions = [];
  let choisie = 0;
  // L'ambiance vaut pour tout le site : on ne la redemande pas à chaque page.
  const ambianceDeja = !!themeSite?.id;
  let theme = themeSite?.id ? { ...themeSite } : { id: 'sobre', portee: 'site' };
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

    // Le chemin pour ceux qui ne savent pas quoi écrire du tout : plutôt que
    // de choisir une trame vide, ils répondent à trois questions et repartent
    // avec une page rédigée.
    if (onBrief) {
      corps.appendChild(h('button', {
        class: 'assist__brief', type: 'button',
        onclick: () => { pose = true; modal.close(); onBrief(); },
      },
        icon('pencil', 15),
        h('span', {},
          h('span', { class: 'assist__cocheTitre' }, t('wizardBrief')),
          h('span', { class: 'assist__cocheAide' }, t('wizardBriefAide'))),
        icon('right', 13),
      ));
    }

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
          apercuPage(proposition.apercu, theme),
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
      ambianceDeja
        ? h('button', {
          class: 'btn btn--primary', type: 'button', onclick: () => poser(),
        }, icon('check', 13), t('wizardApply'))
        : h('button', {
          class: 'btn btn--primary', type: 'button', onclick: () => etapeAmbiance(),
        }, t('wizardVersAmbiance'), icon('right', 13)),
    );
  }

  function poser() {
    pose = true;
    modal.close();
    onApply(propositions[choisie].trees, theme);
  }

  // ----------------------------------------------------------- ambiance
  // Sans cette étape, toutes les propositions se ressemblent : une page
  // vierge n'a aucun style à leur prêter, et le client croit que le module
  // ne sait faire qu'une seule mise en page.
  function etapeAmbiance() {
    clear(corps);
    corps.append(h('p', { class: 'hint', style: { marginTop: '0' } }, t('wizardAmbiance')));
    const hote = h('div', {});
    corps.appendChild(hote);
    rendreChoixTheme({
      hote, t, valeur: theme, siteExistant: false,
      onChange: (reglage) => { theme = reglage; },
    });

    clear(pied);
    pied.append(
      h('button', {
        class: 'btn btn--ghost', type: 'button', onclick: () => etapePropositions(),
      }, icon('left', 13), t('wizardBack')),
      h('span', { style: { flex: '1' } }),
      h('button', {
        class: 'btn btn--primary', type: 'button', onclick: () => poser(),
      }, icon('check', 13), t('wizardApply')),
    );
  }

  etapeQuestions();
  return modal;
}
