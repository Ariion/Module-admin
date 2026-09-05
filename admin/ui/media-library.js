/**
 * Bibliothèque média.
 *
 * Deux sources possibles, fusionnées : l'index tenu dans Firestore (ce qui a
 * été téléversé depuis l'éditeur) et, si l'adaptateur sait lister, le contenu
 * réel du dossier hébergé chez le client — ce qui rend visibles les images
 * déposées en FTP par le développeur.
 * @module ui/media-library
 */
import { h, icon, clear } from './el.js';
import { openModal } from './modal.js';
import { safeImageUrl } from '../core/sanitize.js';

export function openMediaLibrary({ root, t, backend, media, onPick }) {
  const grid = h('div', { class: 'grid' });
  const status = h('p', { class: 'hint' });
  const file = h('input', {
    type: 'file', accept: 'image/*', multiple: true, style: { display: 'none' },
    onchange: async (event) => {
      const files = Array.from(event.target.files || []);
      event.target.value = '';
      for (const selected of files) await send(selected);
      await load();
    },
  });

  async function send(selected) {
    status.textContent = t('uploading') + ' ' + selected.name;
    try {
      const result = await media.primary.upload(selected);
      await backend.addMedia(result);
      status.textContent = '';
    } catch (err) {
      status.textContent = err.message || String(err);
    }
  }

  async function load() {
    clear(grid);
    status.textContent = '…';
    const items = [];
    const seen = new Set();

    const push = (item) => {
      const url = safeImageUrl(item.url);
      if (!url || seen.has(url)) return;
      seen.add(url);
      items.push({ ...item, url });
    };

    try { (await backend.listMedia()).forEach(push); } catch { /* index illisible */ }
    if (media.primary.list) {
      try { (await media.primary.list()).forEach(push); } catch { /* dossier illisible */ }
    }

    status.textContent = items.length ? '' : t('emptyLibrary');
    for (const item of items) {
      grid.appendChild(h('button', {
        class: 'tile', title: item.name || item.url,
        onclick: () => { onPick(item); modal.close(); },
      },
        h('img', { src: item.url, alt: item.name || '', loading: 'lazy' }),
        h('div', { class: 'tile__name' }, item.name || item.url.split('/').pop()),
      ));
    }
  }

  const modal = openModal({
    root,
    title: t('media'),
    body: h('div', {}, status, grid, file),
    actions: [
      media.primary.canUpload
        ? h('button', { class: 'btn btn--primary', onclick: () => file.click() }, icon('upload', 13), t('chooseFile'))
        : h('span', { class: 'hint' }, t('exportHelp')),
    ],
  });

  load();
  return modal;
}
