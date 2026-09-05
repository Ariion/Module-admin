/**
 * Éditeur — chargé à la demande, uniquement pour les personnes connectées.
 *
 * Assemble les briques : coque, aperçu en iframe, modèle de page, surcouche
 * de sélection, inspecteur, structure, bibliothèque, brouillon et
 * publication. C'est le seul module qui connaît l'enchaînement complet ; les
 * autres restent indépendants.
 * @module ui/editor
 */
import { SHADOW_CSS, DOCUMENT_CSS, FRAME_CSS } from './styles.js';
import { createTranslator } from './i18n.js';
import { h, icon } from './el.js';
import { createShell } from './shell.js';
import { createOverlay } from './overlay.js';
import { createTextEditor } from './text-edit.js';
import { createInspector } from './inspector.js';
import { createNavigator } from './navigator.js';
import { createLibrary } from './library.js';
import { openLogin } from './login.js';
import { openRevisions } from './revisions.js';
import { openExport } from './export.js';
import { createMedia } from '../media/index.js';
import { createHost } from '../data/host.js';
import { bakePage } from '../core/bake.js';
import { PageModel } from '../core/model.js';
import { cacheKey } from '../core/config.js';
import { pageKeyFromLocation } from '../core/dom.js';
import { debounce, timeAgo } from '../core/util.js';
import { debug, safe } from '../core/log.js';

export async function startEditor(runtime) {
  const { config } = runtime;
  const t = createTranslator(config.lang);

  // --- Racine isolée -------------------------------------------------
  const host = h('div', { id: 'admin-root', 'data-admin-ui': '' });
  // L'hôte doit avoir une géométrie réelle : une iframe placée dans un
  // conteneur sans dimensions n'est pas composée par le navigateur, et
  // l'aperçu resterait blanc.
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483000;';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.appendChild(h('style', {}, SHADOW_CSS));
  const root = h('div', {});
  shadow.appendChild(root);
  document.body.appendChild(host);

  const documentStyle = h('style', { id: 'admin-document-style' }, DOCUMENT_CSS);
  document.head.appendChild(documentStyle);

  const backend = await createBackend(config);
  const media = createMedia(config, backend);
  const hosting = createHost(config, backend);

  const state = {
    editing: true, dirty: false, saving: false, baking: false,
    hasDraft: false, savedAt: null, baked: null,
    pageId: config.pageId, user: null, access: null,
  };

  let shell = null;
  let model = null;
  let overlay = null;
  let textEditor = null;
  let inspector = null;
  let navigator = null;
  let library = null;

  const toast = h('div', { class: 'toast' });
  root.appendChild(toast);
  let minuteurToast = null;
  function notify(message, erreur = false) {
    toast.textContent = message;
    toast.className = 'toast toast--show' + (erreur ? ' toast--error' : '');
    clearTimeout(minuteurToast);
    minuteurToast = setTimeout(() => { toast.className = 'toast'; }, 3400);
  }

  // ================================================================
  //  Construction de l'interface
  // ================================================================
  function buildShell() {
    shell = createShell({ root, t, config, onDevice: () => setTimeout(() => overlay?.reposition(), 240) });

    const vueContenu = shell.addView('contenu', t('tabContent'), 'sliders');
    const vueStructure = shell.addView('structure', t('tabStructure'), 'layers');
    const vueMedias = shell.addView('medias', t('tabMedia'), 'image');

    inspector = createInspector({
      vue: vueContenu, t,
      actions: {
        valueOf: (entry) => valeurDe(entry),
        setContent: (entry, patch) => setValue(entry, patch),
        revertContent: (entry) => revert(entry),
        styleOf: (el) => model.styleOf(el),
        setStyle: (el, patch) => { model.setStyle(el, patch); markDirty(); overlay.reposition(); },
        resetStyle: (el) => { model.clearStyle(el); markDirty(); },
        collectionOp: (id, op, ...args) => collectionOp(id, op, ...args),
        pickMedia: (rappel) => { shell.showView('medias'); library.pick(rappel); },
        upload: (fichier, onProgress) => media.primary.upload(fichier, { onProgress }),
      },
    });

    navigator = createNavigator({
      vue: vueStructure, t,
      onSelect: (sel) => { select(sel, { reveal: true }); },
      onHover: (el) => { if (el) overlay.setActive(el); },
    });

    library = createLibrary({
      vue: vueMedias, t, backend, media,
      onPicked: () => shell.showView('contenu'),
    });

    overlay = createOverlay({
      layer: shell.layer, origin: () => shell.origine(), t,
      onSelect: (sel) => select(sel),
      onCollectionOp: (id, op, ...args) => collectionOp(id, op, ...args),
    });

    textEditor = createTextEditor({
      layer: shell.layer, origin: () => shell.origine(), t,
      onCommit: (entry, valeur) => setValue(entry, valeur),
    });

    shell.setActions([
      publishButton,
      h('button', { class: 'btn btn--icon', type: 'button', title: t('history'), onclick: history }, icon('history', 13)),
      h('button', { class: 'btn btn--icon', type: 'button', title: t('exportSite'), onclick: exporter }, icon('download', 13)),
      h('button', { class: 'btn btn--icon', type: 'button', title: t('signOut'), onclick: quit }, icon('close', 13)),
    ]);
  }

  const publishButton = h('button', {
    class: 'btn btn--primary', type: 'button', onclick: () => publish(),
  }, icon('check', 13), t('publish'));

  const previewButton = h('button', {
    class: 'btn btn--sm', type: 'button', onclick: () => togglePreview(),
  }, icon('eye', 13), t('preview'));

  // ================================================================
  //  Aperçu et modèle
  // ================================================================
  async function loadPage(url) {
    const { doc } = await shell.load(url);
    doc.head.appendChild(h('style', { 'data-admin-ui': '' }, FRAME_CSS));

    state.pageId = pageIdDe(doc);
    model = new PageModel({
      roots: config.scan.roots,
      exclude: config.scan.exclude,
      backgrounds: config.scan.backgrounds,
      minBackgroundArea: config.scan.minBackgroundArea,
      visibleOnly: config.scan.visibleOnly,
      minItems: config.scan.minItems,
      requireClass: config.scan.requireClass,
      doc,
    }).refresh();
    runtime.model = model;

    // Brouillon s'il existe, sinon la dernière version publiée.
    let instantane = null;
    try { instantane = await backend.loadDraft(state.pageId); } catch { instantane = null; }
    state.hasDraft = !!(instantane && aDuContenu(instantane));
    if (!state.hasDraft) {
      try { instantane = await backend.loadPublished(state.pageId); } catch { instantane = null; }
    }
    if (instantane && aDuContenu(instantane)) {
      model.applySnapshot(instantane);
      state.savedAt = instantane.updatedAt || null;
    }

    overlay.refresh(model);
    overlay.enable();
    navigator.render(model);
    inspector.render(null);
    surveillerNavigation();
    render();
    debug('aperçu prêt —', state.pageId, model.entries.size, 'éléments');
  }

  function pageIdDe(doc) {
    if (config.host?.pagePath || config.pageId) {
      // Une page explicitement configurée reste prioritaire sur l'URL, mais
      // seulement pour la page d'origine : la navigation recalcule.
      if (doc.location.pathname === location.pathname) return config.pageId;
    }
    return safe(() => pageKeyFromLocation(doc.location.pathname), 'home', 'pageId');
  }

  function aDuContenu(instantane) {
    return Object.keys(instantane.content || {}).length > 0
      || Object.keys(instantane.collections || {}).length > 0;
  }

  /** Le client peut se déplacer dans son site : on suit l'aperçu. */
  function surveillerNavigation() {
    const frame = shell.frame;
    if (!frame || frame.dataset.adminWatched) return;
    frame.dataset.adminWatched = '1';
    frame.addEventListener('load', async () => {
      if (!frame.contentDocument) return;
      const url = frame.contentDocument.location.href;
      if (!url || url === 'about:blank') return;
      await autosave.flush();
      notify(t('pageLoaded'));
      await loadPage(url.split('?')[0]);
    });
  }

  // ================================================================
  //  Sélection et écriture
  // ================================================================
  function select(sel, options = {}) {
    if (!sel || !sel.el) { inspector.render(null); overlay.setActive(null); return; }
    textEditor.commit();
    overlay.setActive(sel.el);
    if (options.reveal) overlay.reveal(sel.el);

    const item = sel.collection
      ? sel
      : { ...sel, ...trouverBloc(sel.el) };
    inspector.render(item);
    shell.showView('contenu');

    if (item.entry && item.entry.role === 'text' && !options.reveal) {
      textEditor.start(item.entry);
    }
  }

  function trouverBloc(el) {
    for (const collection of model.collections) {
      const index = collection.items.findIndex((item) => item === el || item.contains(el));
      if (index >= 0) return { collection, itemIndex: index };
    }
    return {};
  }

  function valeurDe(entry) {
    if (entry.collectionId != null) {
      const data = model.collectionData(entry.collectionId);
      const stocke = data?.items?.[entry.itemIndex]?.fields?.[entry.fieldKey];
      return { ...entry.value, ...(stocke || {}) };
    }
    return model.valueOf(entry.print.id) || entry.value;
  }

  function setValue(entry, patch) {
    if (entry.collectionId != null) {
      model.setCollectionField(entry.collectionId, entry.itemIndex, entry.fieldKey, patch, entry.el, entry.role);
    } else {
      model.set(entry.print.id, patch);
    }
    markDirty();
    overlay.reposition();
  }

  function revert(entry) {
    if (entry.collectionId != null) {
      const data = model.collectionData(entry.collectionId);
      const champs = data?.items?.[entry.itemIndex]?.fields;
      if (champs) delete champs[entry.fieldKey];
      model.reapplyCollection(entry.collectionId);
      overlay.refresh(model);
      navigator.render(model);
    } else {
      const origine = model.originalOf(entry.print.id);
      if (origine) model.set(entry.print.id, origine);
    }
    markDirty();
    inspector.render(inspector.selection);
  }

  async function collectionOp(id, op, ...args) {
    if (op === 'reset') {
      if (!model.resetCollection(id)) return;
      markDirty();
      await autosave.flush();
      await loadPage(shell.frame.contentDocument.location.href.split('?')[0]);
      return;
    }
    if (!model.applyCollectionOp(id, op, ...args)) return;
    markDirty();
    overlay.refresh(model);
    navigator.render(model);
    inspector.render(null);
  }

  // ================================================================
  //  Brouillon et publication
  // ================================================================
  const autosave = debounce(async () => {
    if (!state.dirty || !model) return;
    state.saving = true;
    render();
    try {
      await backend.saveDraft(state.pageId, model.toSnapshot());
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
    textEditor.commit();
    publishButton.disabled = true;
    try {
      const instantane = model.toSnapshot();
      await backend.publish(state.pageId, instantane);
      safe(() => localStorage.setItem(cacheKey({ ...config, pageId: state.pageId }), JSON.stringify(instantane)));
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
    // l'hébergement. Un échec ici ne remet pas la publication en cause.
    if (hosting.enabled) {
      state.baking = true;
      render();
      try {
        await bakeIntoHost();
        state.baked = Date.now();
        notify(t('bakedOk'));
      } catch (err) {
        state.baked = null;
        notify(t('bakedFail') + ' ' + String(err.message || err), true);
      } finally {
        state.baking = false;
      }
    }
    publishButton.disabled = false;
    render();
  }

  async function bakeIntoHost() {
    const { sourceUrl } = await hosting.ensureSource();
    const scanOptions = { ...model.scanOptions };
    delete scanOptions.doc;
    const { html, orphans } = await bakePage({
      sourceUrl, snapshot: model.toSnapshot(), scanOptions, pageId: state.pageId,
    });
    if (orphans.length) notify(t('orphans', orphans.length), true);
    await hosting.writePage(html);
  }

  function history() {
    openRevisions({
      root, t, backend, pageId: state.pageId, lang: config.lang,
      onRestore: (instantane) => {
        model.applySnapshot(instantane);
        overlay.refresh(model);
        navigator.render(model);
        markDirty();
        notify(t('restored'));
      },
    });
  }

  function exporter() {
    openExport({
      root, t, pageId: state.pageId,
      doc: model.doc,
      snapshot: () => model.toSnapshot(),
    });
  }

  function togglePreview() {
    state.editing = !state.editing;
    if (state.editing) overlay.enable();
    else { textEditor.commit(); overlay.disable(); }
    render();
  }

  async function quit() {
    autosave.flush();
    textEditor?.commit();
    overlay?.disable();
    runtime.markEditing(false);
    await backend.signOut().catch(() => {});
    teardown();
    location.href = location.pathname;
  }

  function teardown() {
    document.documentElement.removeAttribute('data-admin-shell');
    documentStyle.remove();
    host.remove();
  }

  // ================================================================
  //  Rendu du panneau
  // ================================================================
  function render() {
    if (!shell) return;
    const modifications = model ? model.changeCount : 0;

    const pastille = state.baking
      ? h('span', { class: 'pill' }, t('baking'))
      : state.saving
        ? h('span', { class: 'pill' }, t('draftSaving'))
        : (state.dirty || state.hasDraft)
          ? h('span', { class: 'pill pill--warn' }, icon('warn', 11), t('unpublished'))
          : h('span', { class: 'pill pill--ok' }, icon('check', 11),
            hosting.enabled && state.baked ? t('bakedPill') : t('published'));

    const details = [];
    details.push(modifications ? t('changes', modifications) : t('noChanges'));
    if (state.savedAt) details.push(timeAgo(state.savedAt, config.lang));
    if (model && model.orphans.size) details.push(t('orphans', model.orphans.size));

    shell.setState([pastille, h('span', {}, details.join(' · ')), previewButton]);

    previewButton.replaceChildren(
      icon(state.editing ? 'eye' : 'pencil', 13),
      state.editing ? t('preview') : t('edit'),
    );
    publishButton.disabled = !modifications && !state.hasDraft;
  }

  // ================================================================
  //  Démarrage
  // ================================================================
  async function enterEditMode() {
    runtime.markEditing(true);
    document.documentElement.setAttribute('data-admin-shell', '');
    buildShell();
    await loadPage(location.pathname);
    library.charger();
  }

  return new Promise((resolve) => {
    let demarre = false;
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
      if (demarre) return;
      demarre = true;
      await enterEditMode();
      resolve({
        backend, media, hosting, teardown, render, notify,
        publish, markDirty, select, bakeIntoHost,
        get model() { return model; },
        get shell() { return shell; },
      });
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
