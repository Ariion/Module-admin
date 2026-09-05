/**
 * Panneau latéral : réglages d'une image ou d'un lien.
 * Le texte, lui, s'édite directement dans la page.
 * @module ui/panel
 */
import { h, icon, clear } from './el.js';
import { safeImageUrl } from '../core/sanitize.js';

export function createPanel({ root, t, onChange, onRevert, openLibrary, upload }) {
  let entry = null;
  let value = null;

  const title = h('span', { class: 'panel__title' });
  const body = h('div', { class: 'panel__body' });
  const foot = h('div', { class: 'panel__foot' });

  const panel = h('div', { class: 'panel' },
    h('div', { class: 'panel__head' },
      title,
      h('button', { class: 'btn btn--ghost btn--icon', title: t('close'), onclick: () => close() }, icon('close', 14)),
    ),
    body,
    foot,
  );
  root.appendChild(panel);

  function close() {
    panel.classList.remove('panel--open');
    entry = null;
  }

  function open(nextEntry, currentValue) {
    entry = nextEntry;
    value = { ...currentValue };
    clear(body);
    clear(foot);
    title.textContent = t(entry.role === 'link' ? 'link' : entry.role === 'background' ? 'background' : 'image');
    (entry.role === 'link' ? renderLink : renderImage)();
    foot.append(
      h('button', {
        class: 'btn btn--ghost', onclick: () => { onRevert(entry); close(); },
      }, t('revert')),
      h('button', { class: 'btn', onclick: close }, t('close')),
    );
    panel.classList.add('panel--open');
  }

  function commit(patch) {
    value = { ...value, ...patch };
    onChange(entry, patch);
  }

  // ---------------------------------------------------------------- image
  function renderImage() {
    const image = h('img', { alt: '' });
    const preview = h('div', { class: 'preview' }, image);
    const progress = h('i');
    const progressBar = h('div', { class: 'progress', style: { display: 'none' } }, progress);
    const status = h('p', { class: 'hint' });

    const setPreview = (src) => {
      const safe = safeImageUrl(src);
      if (safe) image.setAttribute('src', safe);
      else image.removeAttribute('src');
    };
    setPreview(value.src);

    const urlInput = h('input', {
      class: 'input', type: 'text', value: value.src || '', placeholder: '/images/photo.jpg',
      onchange: (event) => { setPreview(event.target.value); commit({ src: event.target.value }); },
    });

    const file = h('input', {
      type: 'file', accept: 'image/*', style: { display: 'none' },
      onchange: (event) => {
        const selected = event.target.files && event.target.files[0];
        if (selected) send(selected);
        event.target.value = '';
      },
    });

    async function send(selected) {
      status.textContent = t('uploading');
      progressBar.style.display = '';
      progress.style.width = '5%';
      try {
        const result = await upload(selected, (ratio) => { progress.style.width = Math.round(ratio * 100) + '%'; });
        urlInput.value = result.url;
        setPreview(result.url);
        commit({ src: result.url });
        status.textContent = '';
      } catch (err) {
        status.textContent = err.message || String(err);
      } finally {
        progressBar.style.display = 'none';
      }
    }

    preview.addEventListener('dragover', (event) => { event.preventDefault(); preview.classList.add('preview--drop'); });
    preview.addEventListener('dragleave', () => preview.classList.remove('preview--drop'));
    preview.addEventListener('drop', (event) => {
      event.preventDefault();
      preview.classList.remove('preview--drop');
      const dropped = event.dataTransfer.files && event.dataTransfer.files[0];
      if (dropped) send(dropped);
    });

    body.append(
      preview,
      h('div', { class: 'panel__foot', style: { padding: '0 0 14px', borderTop: '0' } },
        h('button', { class: 'btn', onclick: () => file.click() }, icon('upload', 13), t('chooseFile')),
        h('button', { class: 'btn', onclick: () => openLibrary((item) => {
          urlInput.value = item.url;
          setPreview(item.url);
          commit({ src: item.url });
        }) }, icon('folder', 13), t('library')),
      ),
      progressBar,
      status,
      file,
      h('div', { class: 'field' },
        h('label', { class: 'field__label' }, t('imageUrl')),
        urlInput,
      ),
      entry.role === 'image' && h('div', { class: 'field' },
        h('label', { class: 'field__label' }, t('altText')),
        h('input', {
          class: 'input', type: 'text', value: value.alt || '',
          onchange: (event) => commit({ alt: event.target.value }),
        }),
      ),
    );
  }

  // ----------------------------------------------------------------- lien
  function renderLink() {
    const label = typeof value.html === 'string' ? null : (value.text || '');
    body.append(
      h('div', { class: 'field' },
        h('label', { class: 'field__label' }, t('linkUrl')),
        h('input', {
          class: 'input', type: 'text', value: value.href || '', placeholder: 'https://…, /page.html, #ancre, mailto:…',
          onchange: (event) => commit({ href: event.target.value }),
        }),
      ),
      label !== null && h('div', { class: 'field' },
        h('label', { class: 'field__label' }, t('linkLabel')),
        h('input', {
          class: 'input', type: 'text', value: label,
          onchange: (event) => commit({ text: event.target.value }),
        }),
      ),
      h('label', { class: 'check' },
        h('input', {
          type: 'checkbox', checked: value.target === '_blank',
          onchange: (event) => commit({ target: event.target.checked ? '_blank' : '' }),
        }),
        t('linkTarget'),
      ),
    );
  }

  return { open, close, get entry() { return entry; }, node: panel };
}
