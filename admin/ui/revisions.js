/**
 * Historique des publications : consulter et restaurer une version.
 *
 * Restaurer n'écrase rien tout de suite — la version est chargée comme
 * brouillon, l'utilisateur voit le résultat dans la page et décide ensuite
 * de publier. Même logique qu'un « annuler » sûr.
 * @module ui/revisions
 */
import { h, icon } from './el.js';
import { openModal } from './modal.js';

export function openRevisions({ root, t, backend, pageId, lang, onRestore }) {
  const list = h('ul', { class: 'list' });
  const body = h('div', {}, h('p', { class: 'hint' }, t('exportHelp')), list);

  const modal = openModal({ root, title: t('history'), body });

  (async () => {
    let revisions = [];
    try { revisions = await backend.listRevisions(pageId); } catch { revisions = []; }
    if (!revisions.length) {
      list.appendChild(h('li', {}, h('span', { class: 'hint' }, t('noRevisions'))));
      return;
    }
    for (const revision of revisions) {
      list.appendChild(h('li', {},
        h('div', { class: 'list__main' },
          h('div', {}, revision.label || formatDate(revision.publishedAt, lang)),
          h('div', { class: 'list__meta' },
            formatDate(revision.publishedAt, lang), ' · ', t('by'), ' ', revision.publishedBy || '—'),
        ),
        h('button', {
          class: 'btn btn--sm',
          onclick: () => {
            const snapshot = parse(revision.snapshot);
            if (!snapshot) return;
            onRestore(snapshot);
            modal.close();
          },
        }, icon('history', 12), t('restore')),
      ));
    }
  })();

  return modal;
}

function parse(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

function formatDate(timestamp, lang = 'fr') {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    dateStyle: 'medium', timeStyle: 'short',
  });
}
