/**
 * Édition de texte en place (contenteditable).
 *
 * Le collage est toujours converti en texte brut : sans cela, un copier-coller
 * depuis Word injecterait des dizaines de balises de mise en forme dans la
 * page. La mise en forme reste limitée à gras / italique / lien, ce qui suffit
 * pour un site vitrine et protège le design.
 * @module ui/text-edit
 */
import { h, icon } from './el.js';
import { readCurrent } from '../core/model.js';
import { safeUrl } from '../core/sanitize.js';

export function createTextEditor({ host, layer, t, onCommit }) {
  let current = null;
  let before = null;
  const toolbar = h('div', { class: 'rtb' });
  toolbar.style.display = 'none';
  layer.appendChild(toolbar);

  const command = (name) => (event) => {
    event.preventDefault();
    document.execCommand(name);
    if (current) current.el.focus();
  };

  const addLink = (event) => {
    event.preventDefault();
    const url = prompt(t('linkUrl'), 'https://');
    if (url === null) return;
    const safe = safeUrl(url);
    if (safe) document.execCommand('createLink', false, safe);
    if (current) current.el.focus();
  };

  toolbar.append(
    h('button', { class: 'btn btn--sm btn--icon', title: 'Gras', onmousedown: command('bold') }, icon('bold', 13)),
    h('button', { class: 'btn btn--sm btn--icon', title: 'Italique', onmousedown: command('italic') }, icon('italic', 13)),
    h('button', { class: 'btn btn--sm btn--icon', title: t('linkUrl'), onmousedown: addLink }, icon('link', 13)),
  );

  function placeToolbar(el) {
    const origin = host.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    toolbar.style.left = (rect.left - origin.left) + 'px';
    toolbar.style.top = (rect.top - origin.top - 38) + 'px';
    toolbar.style.display = '';
  }

  const onPaste = (event) => {
    event.preventDefault();
    const text = (event.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const onKeyDown = (event) => {
    if (!current) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
    } else if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      commit();
    }
  };

  function start(entry) {
    if (current && current.el === entry.el) return;
    commit();
    const { el } = entry;
    before = readCurrent(el, entry.role);
    current = entry;

    el.setAttribute('contenteditable', 'true');
    el.setAttribute('spellcheck', 'true');
    el.setAttribute('data-admin-editing', '');
    el.addEventListener('paste', onPaste);
    el.addEventListener('keydown', onKeyDown);
    el.addEventListener('blur', commit, { once: true });
    el.focus();

    // On place le curseur là où l'utilisateur a cliqué plutôt qu'au début.
    const selection = window.getSelection();
    if (selection && selection.rangeCount === 0) {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      selection.addRange(range);
    }
    placeToolbar(el);
  }

  function teardown() {
    if (!current) return null;
    const entry = current;
    const { el } = entry;
    el.removeAttribute('contenteditable');
    el.removeAttribute('spellcheck');
    el.removeAttribute('data-admin-editing');
    el.removeEventListener('paste', onPaste);
    el.removeEventListener('keydown', onKeyDown);
    toolbar.style.display = 'none';
    current = null;
    return entry;
  }

  function commit() {
    const entry = teardown();
    if (!entry) return;
    const value = readCurrent(entry.el, entry.role);
    // Un lien garde son adresse : seul le libellé est modifié ici.
    if (entry.role === 'link') delete value.href;
    if (JSON.stringify(value) !== JSON.stringify(stripHref(before))) onCommit(entry, value);
  }

  function cancel() {
    const entry = teardown();
    if (!entry || !before) return;
    if (typeof before.html === 'string') entry.el.innerHTML = before.html;
    else if (typeof before.text === 'string') entry.el.textContent = before.text;
  }

  function stripHref(value) {
    if (!value) return value;
    const copy = { ...value };
    delete copy.href;
    return copy;
  }

  return {
    start,
    commit,
    cancel,
    get active() { return current; },
    reposition() { if (current) placeToolbar(current.el); },
  };
}
