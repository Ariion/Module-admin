/**
 * Fenêtre modale générique (connexion, bibliothèque, historique).
 * @module ui/modal
 */
import { h, icon } from './el.js';

export function openModal({ root, title, body, actions = [], size = '', onClose }) {
  const dialog = h('div', { class: 'modal ' + (size === 'sm' ? 'modal--sm' : '') },
    h('div', { class: 'modal__head' },
      h('span', { style: { flex: '1' } }, title),
      h('button', { class: 'btn btn--ghost btn--icon', onclick: () => close() }, icon('close', 14)),
    ),
    h('div', { class: 'modal__body' }, body),
    actions.length ? h('div', { class: 'modal__foot' }, actions) : null,
  );

  const backdrop = h('div', {
    class: 'backdrop',
    onclick: (event) => { if (event.target === backdrop) close(); },
  }, dialog);

  const onKey = (event) => { if (event.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey, true);

  function close() {
    document.removeEventListener('keydown', onKey, true);
    backdrop.remove();
    onClose?.();
  }

  root.appendChild(backdrop);
  return { close, dialog, backdrop };
}
