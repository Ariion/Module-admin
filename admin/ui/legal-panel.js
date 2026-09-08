/**
 * Le questionnaire des pages légales.
 *
 * Trois écrans : quels documents, qui êtes-vous, que faites-vous. Les
 * réponses ne servent pas à remplir des trous — elles décident des clauses
 * écrites. Les réponses sont conservées avec le site : les régénérer après
 * un changement d'adresse ne demande pas de tout ressaisir.
 * @module ui/legal-panel
 */
import { h, icon, clear } from './el.js';
import { openModal } from './modal.js';
import {
  CHAMPS_LEGAUX, HEBERGEURS, OPTIONS_LEGALES, DOCUMENTS,
  donneesVides, construireDocument, champsManquants,
} from '../core/legal.js';

export function openLegal({ root, t, etat, peutCreerPages, onApply, onSave }) {
  const depart = donneesVides();
  const donnees = { ...depart.donnees, ...(etat?.donnees || {}) };
  const options = { ...depart.options, ...(etat?.options || {}) };
  const choisis = new Set(etat?.documents?.length ? etat.documents : ['mentions']);

  const corps = h('div', { class: 'legal' });
  const pied = h('div', { class: 'assist__pied' });

  const modal = openModal({ root, title: t('legalTitle'), body: corps, actions: [pied] });

  const enregistrer = () => onSave?.({ donnees, options, documents: [...choisis] });

  // ------------------------------------------------------- 1. documents
  function etapeDocuments() {
    clear(corps);
    corps.append(
      h('p', { class: 'hint', style: { marginTop: '0' } }, t('legalIntro')),
      h('div', { class: 'assist__coches' }, DOCUMENTS.map((doc) => {
        const coche = h('input', {
          type: 'checkbox', checked: choisis.has(doc.id),
          onchange: (e) => { if (e.target.checked) choisis.add(doc.id); else choisis.delete(doc.id); majSuite(); },
        });
        return h('label', { class: 'assist__coche' }, coche,
          h('span', {},
            h('span', { class: 'assist__cocheTitre' }, t('legalDoc_' + doc.id)),
            h('span', { class: 'assist__cocheAide' }, t('legalDoc_' + doc.id + '_aide')),
          ));
      })),
      avertissement(),
    );

    clear(pied);
    const suite = h('button', {
      class: 'btn btn--primary', type: 'button', onclick: () => etapeIdentite(),
    }, t('wizardNext'), icon('right', 13));
    pied.append(
      h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => modal.close() }, t('cancel')),
      h('span', { style: { flex: '1' } }), suite,
    );
    const majSuite = () => { suite.disabled = choisis.size === 0; };
    majSuite();
  }

  // ------------------------------------------------------- 2. identité
  function etapeIdentite() {
    clear(corps);
    const manquants = new Set(champsManquants(donnees));

    const champs = h('div', { class: 'legal__champs' }, CHAMPS_LEGAUX.map((champ) => h('label', { class: 'legal__champ' },
      h('span', { class: 'field__label' },
        t('legal_' + champ.key),
        champ.requis ? h('em', { class: 'legal__requis' }, ' ' + t('legalRequis')) : null),
      h('input', {
        class: 'input' + (manquants.has(champ.key) ? ' input--manque' : ''),
        type: 'text', value: donnees[champ.key] || '', placeholder: champ.exemple,
        oninput: (e) => { donnees[champ.key] = e.target.value; },
      }),
    )));

    // L'hébergeur : c'est la mention sur laquelle tout le monde se trompe.
    const champsAutre = h('div', { hidden: donnees.hebergeur !== 'autre' },
      h('input', {
        class: 'input', type: 'text', placeholder: t('legalHebergeurNom'),
        value: donnees.hebergeurNom || '', style: { marginBottom: '7px' },
        oninput: (e) => { donnees.hebergeurNom = e.target.value; },
      }),
      h('input', {
        class: 'input', type: 'text', placeholder: t('legalHebergeurAdresse'),
        value: donnees.hebergeurAdresse || '',
        oninput: (e) => { donnees.hebergeurAdresse = e.target.value; },
      }),
    );

    corps.append(
      h('p', { class: 'hint', style: { marginTop: '0' } }, t('legalIdentiteHint')),
      champs,
      h('label', { class: 'legal__champ' },
        h('span', { class: 'field__label' }, t('legal_hebergeur')),
        h('select', {
          class: 'input',
          onchange: (e) => { donnees.hebergeur = e.target.value; champsAutre.hidden = e.target.value !== 'autre'; },
        }, HEBERGEURS.map((heb) => h('option', {
          value: heb.id, selected: heb.id === donnees.hebergeur,
        }, heb.nom || t('legalHebergeurAutre')))),
      ),
      champsAutre,
    );

    clear(pied);
    pied.append(
      h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => etapeDocuments() },
        icon('left', 13), t('wizardBack')),
      h('span', { style: { flex: '1' } }),
      h('button', { class: 'btn btn--primary', type: 'button', onclick: () => etapeOptions() },
        t('wizardNext'), icon('right', 13)),
    );
  }

  // -------------------------------------------------------- 3. options
  function etapeOptions() {
    clear(corps);
    const utiles = OPTIONS_LEGALES.filter((o) => o.docs.some((d) => choisis.has(d)));

    corps.append(
      h('p', { class: 'hint', style: { marginTop: '0' } }, t('legalOptionsHint')),
      h('div', { class: 'assist__coches' }, utiles.map((option) => {
        const coche = h('input', {
          type: 'checkbox', checked: !!options[option.key],
          onchange: (e) => { options[option.key] = e.target.checked; majMediateur(); },
        });
        return h('label', { class: 'assist__coche' }, coche,
          h('span', {},
            h('span', { class: 'assist__cocheTitre' }, t('legalOpt_' + option.key)),
            h('span', { class: 'assist__cocheAide' }, t('legalOpt_' + option.key + '_aide')),
          ));
      })),
    );

    const blocMediateur = h('div', { hidden: !options.mediateur, style: { marginTop: '12px' } },
      h('span', { class: 'field__label' }, t('legalMediateur')),
      h('input', {
        class: 'input', type: 'text', placeholder: t('legalMediateurNom'),
        value: donnees.mediateurNom || '', style: { marginBottom: '7px' },
        oninput: (e) => { donnees.mediateurNom = e.target.value; },
      }),
      h('input', {
        class: 'input', type: 'text', placeholder: 'https://…',
        value: donnees.mediateurUrl || '',
        oninput: (e) => { donnees.mediateurUrl = e.target.value; },
      }),
    );
    const majMediateur = () => { blocMediateur.hidden = !options.mediateur; };
    if (utiles.some((o) => o.key === 'mediateur')) corps.appendChild(blocMediateur);

    corps.appendChild(h('p', { class: 'hint' },
      t(peutCreerPages ? 'legalPagesAuto' : 'legalPagesManuel')));

    clear(pied);
    pied.append(
      h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => etapeIdentite() },
        icon('left', 13), t('wizardBack')),
      h('span', { style: { flex: '1' } }),
      h('button', {
        class: 'btn btn--primary', type: 'button',
        onclick: () => {
          const manquants = champsManquants(donnees);
          if (manquants.length) { etapeIdentite(); return; }
          enregistrer();
          modal.close();
          onApply([...choisis].map((id) => ({
            id,
            fichier: DOCUMENTS.find((d) => d.id === id).fichier,
            titre: t('legalDoc_' + id),
            sections: construireDocument(id, donnees, options),
          })));
        },
      }, icon('check', 13), t('legalGenerer')),
    );
  }

  function avertissement() {
    return h('p', { class: 'commun', style: { margin: '14px 0 0' } },
      icon('warn', 13), h('span', {}, t('legalAvertissement')));
  }

  etapeDocuments();
  return modal;
}
