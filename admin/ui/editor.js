/**
 * Éditeur — chargé à la demande, uniquement pour les personnes connectées.
 *
 * Assemble les briques : authentification, modèle de page, surcouche de
 * sélection, panneaux, brouillon et publication. C'est le seul module qui
 * connaît l'enchaînement complet ; les autres restent indépendants.
 * @module ui/editor
 */
import { SHADOW_CSS, DOCUMENT_CSS } from './styles.js';
import { createTranslator } from './i18n.js';
import { h, icon, clear } from './el.js';
import { createOverlay } from './overlay.js';
import { createTextEditor } from './text-edit.js';
import { createPanel } from './panel.js';
import { openLogin } from './login.js';
import { openMediaLibrary } from './media-library.js';
import { openRevisions } from './revisions.js';
import { openExport } from './export.js';
import { createMedia } from '../media/index.js';
import { createHost } from '../data/host.js';
import { bakePage } from '../core/bake.js';
import { cacheKey } from '../core/config.js';
import { debounce, timeAgo } from '../core/util.js';
import { debug, safe } from '../core/log.js';

const BAR_HEIGHT = 48;

export async function startEditor(runtime) {
  const { config } = runtime;
  const t = createTranslator(config.lang);

  // --- Racine isolée -------------------------------------------------
  const host = h('div', { id: 'admin-root', 'data-admin-ui': '' });
  host.style.cssText = 'position:absolute;top:0;left:0;width:0;height:0;z-index:2147483000;';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.appendChild(h('style', {}, SHADOW_CSS));
  const layer = h('div', { class: 'layer' });
  const root = h('div', {});
  shadow.append(layer, root);
  document.body.appendChild(host);

  const documentStyle = h('style', { id: 'admin-document-style' }, DOCUMENT_CSS);
  document.head.appendChild(documentStyle);

  // --- Back-end ------------------------------------------------------
  const backend = await createBackend(config);
  const media = createMedia(config, backend);
  const hosting = createHost(config, backend);

  const state = {
    editing: false,
    dirty: false,
    savedAt: null,
    saving: false,
    hasDraft: false,
    baked: null,
    user: null,
    access: null,
  };

  const toast = h('div', { class: 'toast' });
  root.appendChild(toast);
  let toastTimer = null;
  function notify(message, isError = false) {
    toast.textContent = message;
    toast.className = 'toast toast--show' + (isError ? ' toast--error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.className = 'toast'; }, 3200);
  }

  // --- Barre supérieure ----------------------------------------------
  const statusText = h('span');
  const statusPill = h('span', { class: 'pill' });
  const publishButton = h('button', { class: 'btn btn--primary', onclick: () => publish() }, icon('check', 13), t('publish'));
  const previewButton = h('button', { class: 'btn', onclick: () => togglePreview() }, icon('eye', 13), t('preview'));

  const bar = h('div', { class: 'bar' },
    h('div', { class: 'bar__brand' }, h('span', { class: 'bar__dot' }), 'Admin',
      h('span', { class: 'bar__site' }, config.siteId)),
    h('div', { class: 'bar__status' }, statusPill, statusText),
    h('div', { class: 'bar__actions' },
      previewButton,
      h('button', { class: 'btn btn--icon', title: t('media'), onclick: () => openMediaLibrary({ root, t, backend, media, onPick: () => {} }) }, icon('image', 13)),
      h('button', { class: 'btn btn--icon', title: t('history'), onclick: () => history() }, icon('history', 13)),
      h('button', { class: 'btn btn--icon', title: t('exportSite'), onclick: () => openExport({ root, t, pageId: config.pageId, snapshot: () => runtime.getModel().toSnapshot() }) }, icon('download', 13)),
      publishButton,
      h('button', { class: 'btn btn--ghost', onclick: () => quit() }, t('signOut')),
    ),
  );

  // --- Composants d'édition -------------------------------------------
  let overlay = null;
  let textEditor = null;
  let panel = null;

  function buildEditingParts() {
    const model = runtime.getModel();

    overlay = createOverlay({
      host, layer, model, t,
      onSelect: (entry) => select(entry),
      onCollectionOp: async (id, op, ...args) => {
        if (op === 'reset') {
          if (!model.resetCollection(id)) return;
          markDirty();
          await autosave.flush();
          // Les blocs d'origine ont été remplacés par des clones : seul un
          // rechargement redonne le HTML tel qu'écrit par le développeur.
          location.reload();
          return;
        }
        if (!model.applyCollectionOp(id, op, ...args)) return;
        markDirty();
        overlay.refresh();
      },
    });

    textEditor = createTextEditor({
      host, layer, t,
      onCommit: (entry, value) => setValue(entry, value),
    });

    panel = createPanel({
      root, t,
      onChange: (entry, patch) => setValue(entry, patch),
      onRevert: (entry) => revert(entry),
      openLibrary: (onPick) => openMediaLibrary({ root, t, backend, media, onPick }),
      upload: (file, onProgress) => media.primary.upload(file, { onProgress }),
    });
  }

  function select(entry) {
    overlay.setActive(entry.el);
    if (entry.role === 'text') {
      panel.close();
      textEditor.start(entry);
      return;
    }
    textEditor.commit();
    panel.open(entry, currentValue(entry));
  }

  function currentValue(entry) {
    const model = runtime.getModel();
    if (entry.collectionId != null) {
      const data = model.collectionData(entry.collectionId);
      const stored = data?.items?.[entry.itemIndex]?.fields?.[entry.fieldKey];
      return { ...entry.value, ...(stored || {}) };
    }
    return model.valueOf(entry.print.id) || entry.value;
  }

  function setValue(entry, patch) {
    const model = runtime.getModel();
    if (entry.collectionId != null) {
      model.setCollectionField(entry.collectionId, entry.itemIndex, entry.fieldKey, patch, entry.el, entry.role);
    } else {
      model.set(entry.print.id, patch);
    }
    markDirty();
    overlay.reposition();
  }

  function revert(entry) {
    const model = runtime.getModel();
    if (entry.collectionId != null) {
      const data = model.collectionData(entry.collectionId);
      const fields = data?.items?.[entry.itemIndex]?.fields;
      if (fields) delete fields[entry.fieldKey];
      model.reapplyCollection(entry.collectionId);
      overlay.refresh();
    } else {
      const original = model.originalOf(entry.print.id);
      if (original) model.set(entry.print.id, original);
    }
    markDirty();
  }

  // --- Brouillon et publication ---------------------------------------
  const autosave = debounce(async () => {
    if (!state.dirty) return;
    state.saving = true;
    render();
    try {
      await backend.saveDraft(config.pageId, runtime.getModel().toSnapshot());
      state.hasDraft = true;
      state.savedAt = Date.now();
      state.dirty = false;
    } catch (err) {
      notify(String(err.message || err), true);
    } finally {
      state.saving = false;
      render();
    }
  }, config.editor.autosave);

  function markDirty() {
    state.dirty = true;
    render();
    autosave();
  }

  async function publish() {
    autosave.cancel();
    publishButton.disabled = true;
    statusText.textContent = t('publishing');
    try {
      const snapshot = runtime.getModel().toSnapshot();
      await backend.publish(config.pageId, snapshot);
      safe(() => localStorage.setItem(cacheKey(config), JSON.stringify(snapshot)));
      state.dirty = false;
      state.hasDraft = false;
      state.savedAt = Date.now();
      notify(t('published'));
    } catch (err) {
      notify(String(err.message || err), true);
      publishButton.disabled = false;
      render();
      return;
    }

    // Le contenu est publié ; on l'inscrit maintenant DANS le fichier HTML de
    // l'hébergement. Un échec ici ne remet pas la publication en cause : le
    // site reste à jour, il dépend simplement encore du module.
    if (hosting.enabled) {
      statusText.textContent = t('baking');
      try {
        await bakeIntoHost();
        state.baked = Date.now();
        notify(t('bakedOk'));
      } catch (err) {
        state.baked = null;
        notify(t('bakedFail') + ' ' + String(err.message || err), true);
      }
    }
    publishButton.disabled = false;
    render();
  }

  /** Réécrit le fichier .html publié avec le contenu à l'intérieur. */
  async function bakeIntoHost() {
    const { sourceUrl } = await hosting.ensureSource();
    const model = runtime.getModel();
    const scanOptions = { ...model.scanOptions };
    delete scanOptions.doc;

    const { html, orphans } = await bakePage({
      sourceUrl,
      snapshot: model.toSnapshot(),
      scanOptions,
      pageId: config.pageId,
    });
    if (orphans.length) {
      notify(t('orphans', orphans.length), true);
    }
    await hosting.writePage(html);
  }

  function history() {
    openRevisions({
      root, t, backend, pageId: config.pageId, lang: config.lang,
      onRestore: (snapshot) => {
        runtime.getModel().applySnapshot(snapshot);
        overlay.refresh();
        markDirty();
        notify(t('restored'));
      },
    });
  }

  function togglePreview() {
    state.editing = !state.editing;
    if (state.editing) {
      overlay.enable();
    } else {
      textEditor.commit();
      panel.close();
      overlay.disable();
    }
    render();
  }

  async function quit() {
    autosave.flush();
    textEditor.commit();
    overlay?.disable();
    runtime.markEditing(false);
    await backend.signOut().catch(() => {});
    teardown();
    location.href = location.pathname;
  }

  function teardown() {
    document.documentElement.removeAttribute('data-admin-active');
    documentStyle.remove();
    host.remove();
    restoreFixed();
  }

  // --- Rendu de la barre ------------------------------------------------
  function render() {
    const model = runtime.model;
    const changes = model ? model.changeCount : 0;

    clear(statusPill);
    if (state.saving) {
      statusPill.className = 'pill';
      statusPill.textContent = t('draftSaving');
    } else if (state.dirty || state.hasDraft) {
      statusPill.className = 'pill pill--warn';
      statusPill.append(icon('warn', 11), t('unpublished'));
    } else if (hosting.enabled && state.baked) {
      statusPill.className = 'pill pill--ok';
      statusPill.append(icon('check', 11), t('bakedPill'));
    } else {
      statusPill.className = 'pill pill--ok';
      statusPill.append(icon('check', 11), t('published'));
    }

    const parts = [];
    parts.push(changes ? t('changes', changes) : t('noChanges'));
    if (state.savedAt) parts.push(t('draftSaved') + ' ' + timeAgo(state.savedAt, config.lang));
    if (model && model.orphans.size) parts.push(t('orphans', model.orphans.size));
    parts.push(state.editing ? t('hint') : t('preview'));
    statusText.textContent = parts.join(' · ');

    clear(previewButton);
    previewButton.append(icon(state.editing ? 'eye' : 'pencil', 13), state.editing ? t('preview') : t('edit'));
    publishButton.disabled = !changes && !state.hasDraft;
  }

  // --- Décalage des éléments fixes du site ------------------------------
  const shifted = [];
  function offsetFixed() {
    document.documentElement.setAttribute('data-admin-active', '');
    document.documentElement.style.setProperty('--admin-bar-h', BAR_HEIGHT + 'px');
    for (const el of document.body.querySelectorAll('*')) {
      if (el.closest('[data-admin-ui]')) continue;
      const style = getComputedStyle(el);
      if (style.position !== 'fixed' && style.position !== 'sticky') continue;
      const top = parseFloat(style.top);
      if (Number.isNaN(top) || top >= BAR_HEIGHT) continue;
      shifted.push([el, el.style.top]);
      // Mémorisé aussi dans le DOM : l'export doit pouvoir défaire ce décalage
      // sans rien savoir de l'éditeur.
      el.setAttribute('data-admin-shifted', el.style.top);
      el.style.top = (top + BAR_HEIGHT) + 'px';
    }
  }
  function restoreFixed() {
    for (const [el, value] of shifted) {
      el.style.top = value;
      el.removeAttribute('data-admin-shifted');
      if (!el.getAttribute('style')) el.removeAttribute('style');
    }
    shifted.length = 0;
  }

  // --- Démarrage ---------------------------------------------------------
  async function enterEditMode() {
    runtime.markEditing(true);
    root.appendChild(bar);
    offsetFixed();

    runtime.getModel();
    let draft = null;
    try { draft = await backend.loadDraft(config.pageId); } catch { draft = null; }
    if (draft && (Object.keys(draft.content || {}).length || Object.keys(draft.collections || {}).length)) {
      runtime.getModel().applySnapshot(draft);
      state.hasDraft = true;
      state.savedAt = draft.updatedAt || null;
    }

    buildEditingParts();
    state.editing = true;
    overlay.enable();
    render();
    debug('éditeur prêt');
  }

  return new Promise((resolve) => {
    let started = false;
    backend.onUser(async (user, access) => {
      state.user = user;
      state.access = access;
      if (!user) {
        runtime.markEditing(false);
        openLogin({ root, t, backend });
        return;
      }
      if (!access?.allowed) {
        notify(t('noAccess'), true);
        await backend.signOut().catch(() => {});
        return;
      }
      if (started) return;
      started = true;
      await enterEditMode();
      // Exposé pour permettre à un site d'ajouter ses propres commandes
      // (bouton « publier » maison, intégration dans un back-office…).
      resolve({ backend, media, hosting, teardown, render, notify, publish, markDirty, select, bakeIntoHost });
    });
  });
}

async function createBackend(config) {
  if (config.backend === 'demo') {
    const { MemoryBackend } = await import('../data/memory.js');
    return new MemoryBackend(config).init();
  }
  const { FirebaseBackend } = await import('../data/firebase.js');
  return new FirebaseBackend(config).init();
}
