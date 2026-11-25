/**
 * Sélecteur de structure : le choix du nombre de colonnes et de leur
 * proportion, AVANT de les poser — comme pour les modèles de page et de
 * section. Décider après coup revient toujours à défaire puis refaire.
 * @module ui/structure-picker
 */
import { h } from './el.js';
import { openModal } from './modal.js';

/**
 * Les structures proposées : le choix vient AVANT l'insertion, comme pour un
 * modèle de section. Posées ici et non dans `core/widgets.js` — qui sert
 * aussi aux pages publiées — parce qu'elles ne servent qu'à ce sélecteur :
 * personne, en visite sur le site, n'a besoin de connaître les dix mises en
 * page proposées pour en choisir une. Les proportions n'existent que pour
 * deux colonnes — au-delà, une proportion ne voudrait rien dire — donc les
 * structures à trois colonnes ou plus restent égales.
 */
const STRUCTURES = [
  { count: 1, ratio: 'egal' },
  { count: 2, ratio: 'egal' },
  { count: 3, ratio: 'egal' },
  { count: 4, ratio: 'egal' },
  { count: 5, ratio: 'egal' },
  { count: 2, ratio: '1-2' },
  { count: 2, ratio: '2-1' },
  { count: 2, ratio: '1-3' },
  { count: 2, ratio: '3-1' },
  { count: 6, ratio: 'egal' },
];

/** Les parts (sur 4) de chaque proportion à deux colonnes, pour la vignette. */
const PARTS = { egal: null, '1-2': [1, 2], '2-1': [2, 1], '1-3': [1, 3], '3-1': [3, 1] };

function vignette(structure) {
  const parts = PARTS[structure.ratio];
  const colonnes = Array.from({ length: structure.count }, (_, i) => h('span', {
    class: 'struct__col',
    style: parts ? { flex: String(parts[i]) } : null,
  }));
  return h('span', { class: 'struct__preview' }, colonnes);
}

export function openStructurePicker({ root, t, onChoose }) {
  const corps = h('div', {},
    h('p', { class: 'hint', style: { marginTop: '0', textAlign: 'center' } }, t('structTitre')),
    h('div', { class: 'structs' }, STRUCTURES.map((structure) => h('button', {
      class: 'struct', type: 'button',
      title: t('structLabel', structure.count),
      onclick: () => { modal.close(); onChoose(structure); },
    }, vignette(structure)))),
  );

  const modal = openModal({ root, title: t('structTitre'), body: corps, size: 'sm' });
  return modal;
}
