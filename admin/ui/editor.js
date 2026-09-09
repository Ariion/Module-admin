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
import { createWidgetsPanel } from './widgets-panel.js';
import { createGuide } from './guide-panel.js';
import { openTheme } from './theme-panel.js';
import { createLibrary } from './library.js';
import { openLogin } from './login.js';
import { openRevisions } from './revisions.js';
import { openExport } from './export.js';
import { openPageTemplates } from './page-templates-panel.js';
import { openWizard } from './wizard.js';
import { openLegal } from './legal-panel.js';
import { openBoutique } from './boutique-panel.js';
import { filePathOf, labelOf } from '../core/pages.js';
import { ouvrirAction } from '../core/actions.js';
import { etapesDuGuide } from '../core/guide.js';
import { illustrations } from '../core/illustrations.js';
import { PAGE_COMMUNE } from '../core/config.js';
import { openPages } from './pages-panel.js';
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
    hasDraft: false, savedAt: null, baked: null, pageVierge: false,
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

    // Le Guide passe en premier : c'est la vue qui s'ouvre au démarrage, et
    // celle qui suffit à quelqu'un qui découvre. Les autres restent à côté.
    const vueGuide = shell.addView('guide', t('tabGuide'), 'check');
    const vueElements = shell.addView('elements', t('tabElements'), 'grid');
    const vueStructure = shell.addView('structure', t('tabStructure'), 'layers');
    const vueMedias = shell.addView('medias', t('tabMedia'), 'image');

    // L'onglet Éléments montre la bibliothèque, et bascule sur les réglages
    // dès qu'un élément est choisi — comme le fait Elementor.
    hoteBibliotheque = h('div', {});
    hoteInspecteur = h('div', {});
    retourBibliotheque = h('button', {
      class: 'btn btn--ghost btn--wide', type: 'button', style: { marginBottom: '10px', justifyContent: 'flex-start' },
      onclick: () => showLibrary(),
    }, icon('up', 13), t('backToLibrary'));
    hoteInspecteur.appendChild(retourBibliotheque);
    vueElements.append(hoteBibliotheque, hoteInspecteur);
    hoteInspecteur.style.display = 'none';

    const vueInspecteur = h('div', {});
    hoteInspecteur.appendChild(vueInspecteur);

    createWidgetsPanel({
      vue: hoteBibliotheque, t,
      onInsert: (type) => insererWidget(type),
      onTemplate: (id) => ajouterModele(id),
      onDragStart: (type) => overlay.beginDrag(type),
      onDragEnd: () => overlay.endDrag(),
    });

    inspector = createInspector({
      vue: vueInspecteur, t,
      actions: {
        valueOf: (entry) => valeurDe(entry),
        setContent: (entry, patch) => setValue(entry, patch),
        revertContent: (entry) => revert(entry),
        styleOf: (el) => model.styleOf(el),
        setStyle: (el, patch) => { model.setStyle(el, patch); markDirty(); overlay.reposition(); },
        resetStyle: (el) => { model.clearStyle(el); markDirty(); },
        collectionOp: (id, op, ...args) => collectionOp(id, op, ...args),
        sections: () => model.sectionList(),
        sectionIndex: (ref) => model.sectionList().findIndex((x) => x.ref === ref),
        sectionCount: () => model.sectionList().length,
        sectionOp: (ref, op, ...args) => sectionOp(ref, op, ...args),
        addSection: (from, after) => sectionOp(from, 'add', after),
        addBlankSection: (after) => ajouterSectionVide(after),
        addTemplateSection: (id, after) => ajouterModele(id, after),
        pickMedia: (rappel, accept) => { shell.showView('medias'); library.pick(rappel, accept); },
        // Voir la fenêtre telle que le visiteur la verra, dans l'aperçu.
        previewAction: (action) => ouvrirAction(model.doc, action),
        zoneDe: (el) => model.zoneDe(el),
        produits: () => model.reglages?.produits || [],
        upload: async (fichier, onProgress) => {
          // Tout ce qui est téléversé depuis un réglage rejoint la
          // bibliothèque : le client le retrouve pour une autre page.
          const resultat = await media.primary.upload(fichier, { onProgress });
          try {
            await backend.addMedia(resultat);
            library?.charger();
          } catch { /* index média indisponible */ }
          return resultat;
        },
        setWidgetProps: (key, patch) => {
          if (!model.setWidgetProps(key, patch)) return;
          markDirty();
          apresStructure(key);
        },
        widgetOp: (key, op, arg) => widgetOp(key, op, arg),
        widgetElement: (key) => model.doc.querySelector(`[data-admin-widget="${key}"]`),
      },
    });

    guide = createGuide({
      vue: vueGuide, t,
      actions: {
        pageId: () => `${config.siteId}:${state.pageId}`,
        etapes: () => etapesDuGuide(model),
        theme: () => model.reglages?.theme || null,
        setTheme: (reglage) => {
          model.setReglage('theme', reglage);
          markDirty();
          overlay.reposition();
        },
        // Un site qui a déjà son propre code ne doit pas être repeint sans
        // qu'on le demande : le thème s'y limite aux blocs ajoutés.
        siteExistant: () => model.entries.size > 0,
        illustrations: () => illustrations(model.reglages?.theme),
        liens: () => (model.reglages?.pages || [])
          .map((page) => ({ libelle: page.label || page.path, href: page.path })),
        setWidgetProps: (key, patch) => {
          if (!model.setWidgetProps(key, patch)) return;
          markDirty();
          overlay.refresh(model);
          navigator.render(model);
        },
        setValue: (entry, patch) => setValue(entry, patch),
        pickMedia: (rappel, accept) => { shell.showView('medias'); library.pick(rappel, accept); },
        reveal: (ref) => {
          const etape = guide.etapes.find((e) => e.ref === ref);
          if (!etape?.el) return;
          etape.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          overlay.setActive(etape.el);
        },
        addSection: () => ouvrirNouvelleSection(null),
        openPages: () => ouvrirPages(),
        openLegal: () => ouvrirLegal(),
        publish: () => publish(),
      },
    });

    navigator = createNavigator({
      vue: vueStructure, t,
      onSelect: (sel) => { select(sel, { reveal: true }); },
      onHover: (el) => { if (el) overlay.setActive(el); },
      onAddSection: (afterRef) => ouvrirNouvelleSection(afterRef),
      onRestoreSection: (ref) => sectionOp(ref, 'show'),
    });

    library = createLibrary({
      vue: vueMedias, t, backend, media,
      onPicked: () => shell.showView('elements'),
    });

    overlay = createOverlay({
      layer: shell.layer, origin: () => shell.origine(), t,
      onSelect: (sel) => select(sel),
      onCollectionOp: (id, op, ...args) => collectionOp(id, op, ...args),
      onSectionOp: (ref, op, ...args) => sectionOp(ref, op, ...args),
      onAddSection: (afterRef) => ouvrirNouvelleSection(afterRef),
      onReposition: () => textEditor?.reposition(),
      onWidgetSelect: (key) => selectWidget(key),
      onWidgetOp: (key, op, arg) => widgetOp(key, op, arg),
      onWidgetDrop: (type, parentKey, index) => {
        const key = model.insertWidget(type, parentKey, index);
        if (!key) return;
        markDirty();
        apresStructure(key);
      },
    });

    textEditor = createTextEditor({
      layer: shell.layer, origin: () => shell.origine(), t,
      onCommit: (entry, valeur) => setValue(entry, valeur),
    });

    // Les modèles de page vivent dans le pied du panneau : ils portent sur
    // toute la page, pas sur la sélection courante.
    // Le nom de la page ouvre la liste des pages du site.
    shell.onPageClick(() => ouvrirPages());

    shell.setFootExtra([
      h('div', { class: 'row row--wrap', style: { marginBottom: '10px' } },
        h('button', {
          class: 'btn btn--sect', type: 'button',
          onclick: () => openPageTemplates({
            root, t,
            onApply: (id, remplacer) => appliquerModelePage(id, remplacer),
            onWizard: () => ouvrirAssistant(),
          }),
        }, icon('pages', 13), t('pageTemplates')),
        h('button', {
          class: 'btn', type: 'button', title: t('themeTitre'), onclick: () => ouvrirTheme(),
        }, icon('palette', 13), t('themeCourt')),
        h('button', {
          class: 'btn', type: 'button', title: t('legalTitle'), onclick: () => ouvrirLegal(),
        }, icon('code', 13), t('legalCourt')),
        h('button', {
          class: 'btn', type: 'button', title: t('boutiqueTitre'), onclick: () => ouvrirBoutique(),
        }, icon('grid', 13), t('boutiqueCourt')),
      ),
    ]);

    shell.setActions([
      publishButton,
      previewButton,
      h('button', { class: 'btn btn--icon', type: 'button', title: t('history'), onclick: history }, icon('history', 13)),
      h('button', { class: 'btn btn--icon', type: 'button', title: t('exportSite'), onclick: exporter }, icon('download', 13)),
      h('button', { class: 'btn btn--icon', type: 'button', title: t('signOut'), onclick: quit }, icon('close', 13)),
    ]);
  }

  let guide = null;
  let hoteBibliotheque = null;
  let hoteInspecteur = null;
  let retourBibliotheque = null;

  function showLibrary() {
    if (!hoteBibliotheque) return;
    hoteBibliotheque.style.display = '';
    hoteInspecteur.style.display = 'none';
    overlay?.setActive(null);
    shell.showView('elements');
  }

  function showInspector() {
    hoteBibliotheque.style.display = 'none';
    hoteInspecteur.style.display = '';
    shell.showView('elements');
  }

  /** Conteneur qui reçoit un widget ajouté par un clic sur sa vignette. */
  function conteneurActif() {
    const choisi = inspector.selection?.widget;
    if (choisi) {
      const cible = model.findWidgetNode(choisi.key);
      if (cible?.noeud.children) return choisi.key;
      const parent = cible?.parent;
      if (parent?.key) return parent.key;
      if (cible?.record) return cible.record.tree.key;
    }
    const sections = model.widgetSections();
    return sections.length ? sections[sections.length - 1].tree.key : null;
  }

  async function insererWidget(type) {
    let parent = conteneurActif();
    if (!parent) {
      // Aucune section à remplir : on en crée une, puis on y dépose.
      parent = await ajouterSectionVide(null, { silencieux: true });
      if (!parent) return;
    }
    const key = model.insertWidget(type, parent, -1);
    if (!key) return;
    markDirty();
    apresStructure(key);
  }

  function widgetOp(key, op, arg) {
    let change = false;
    if (op === 'remove') change = model.removeWidgetNode(key);
    else if (op === 'move') change = model.moveWidgetNode(key, arg);
    if (!change) return;
    markDirty();
    if (op === 'remove') { overlay.refresh(model); navigator.render(model); showLibrary(); }
    else apresStructure(key);
  }

  /** Rafraîchit l'aperçu après une modification d'arbre, puis resélectionne. */
  function apresStructure(key) {
    overlay.refresh(model);
    navigator.render(model);
    guide?.render();
    if (key) selectWidget(key);
  }

  function selectWidget(key) {
    const cible = model.findWidgetNode(key);
    if (!cible) return;
    const el = model.doc.querySelector(`[data-admin-widget="${key}"]`);
    if (el) overlay.setActive(el);
    inspector.render({ widget: cible.noeud, el });
    showInspector();
  }

  const publishButton = h('button', {
    class: 'btn btn--primary', type: 'button', onclick: () => publish(),
  }, icon('check', 13), t('publish'));

  const previewButton = h('button', {
    class: 'btn btn--icon', type: 'button', title: t('preview'), onclick: () => togglePreview(),
  }, icon('eye', 13));

  // ================================================================
  //  Aperçu et modèle
  // ================================================================
  async function loadPage(url, options = {}) {
    // Recharger l'aperçu ramènerait le client en haut de page : après une
    // opération de structure, il ne verrait rien de ce qu'il vient de faire.
    const defilement = options.keepScroll === false
      ? 0
      : (shell.frame?.contentWindow?.scrollY || 0);

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

    // L'en-tête et le pied de page viennent d'un document commun à tout le
    // site : ils sont appliqués avant le contenu propre à la page.
    const charger = async (id) => {
      let brouillon = null;
      try { brouillon = await backend.loadDraft(id); } catch { brouillon = null; }
      if (brouillon && aDuContenu(brouillon)) return { instantane: brouillon, brouillon: true };
      let publie = null;
      try { publie = await backend.loadPublished(id); } catch { publie = null; }
      return { instantane: publie, brouillon: false };
    };

    const commun = await charger(PAGE_COMMUNE);
    if (commun.instantane && aDuContenu(commun.instantane)) {
      model.applySnapshot(commun.instantane);
    }

    const propre = await charger(state.pageId);
    const instantane = propre.instantane;
    state.hasDraft = propre.brouillon || commun.brouillon;
    const enregistre = !!(instantane && aDuContenu(instantane));
    if (enregistre) {
      model.applySnapshot(instantane, { cumuler: true });
      state.savedAt = instantane.updatedAt || null;
    }

    // Une page vierge, c'est une page de départ : presque rien à éditer, et
    // rien d'enregistré. Sur un site existant, cette condition est fausse —
    // le code du client reste intact, le module s'y accroche.
    state.pageVierge = !enregistre
      && model.entries.size <= 6
      && model.sectionList().filter((x) => !x.ref.startsWith('ins:')).length <= 3;

    memoriserPage();

    overlay.refresh(model);
    overlay.enable();
    navigator.render(model);
    guide?.render();
    inspector.render(null);
    surveillerNavigation(doc.location.href);
    if (defilement) doc.defaultView.scrollTo({ top: defilement });
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

  /**
   * Un instantané porte-t-il quelque chose ? La structure compte autant que
   * le contenu : un brouillon qui n'ajoute qu'une section n'est pas vide.
   */
  function aDuContenu(instantane) {
    if (!instantane) return false;
    const structure = instantane.sections || {};
    return Object.keys(instantane.content || {}).length > 0
      || Object.keys(instantane.collections || {}).length > 0
      || (structure.add || []).length > 0
      || (structure.hide || []).length > 0
      || (structure.order || []).length > 0
      // Un document commun peut ne porter que les réglages du site.
      || !!instantane.reglages
      || !!instantane.meta;
  }

  /**
   * Le client peut se déplacer dans son site : on suit l'aperçu.
   *
   * L'aperçu est considéré prêt avant son évènement `load` — on n'attend pas
   * les dernières images. Ce `load` arrive donc APRÈS le branchement, et le
   * confondre avec une navigation ferait recharger la page en boucle. On
   * compare donc l'adresse : seule une adresse différente est une navigation.
   */
  function surveillerNavigation(urlApercu) {
    const frame = shell.frame;
    if (!frame || frame.dataset.adminWatched) return;
    frame.dataset.adminWatched = '1';
    frame.addEventListener('load', async () => {
      const doc = frame.contentDocument;
      if (!doc) return;
      const url = doc.location.href;
      if (!url || url === 'about:blank' || url === urlApercu) return;
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
    // Sur téléphone, le panneau va recouvrir le bas de l'écran : on remonte
    // l'élément choisi dans la bande qui reste visible.
    else if (shell.isCompact()) overlay.reveal(sel.el, 'start');
    showInspector();

    const section = model.sectionList().find((x) => x.el === sel.el) || null;
    const item = { ...sel, ...(sel.collection ? {} : trouverBloc(sel.el)), section };
    inspector.render(item);

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
    if (entry.sectionKey != null) {
      model.setSectionField(entry.sectionKey, entry.fieldKey, patch, entry.el, entry.role);
      markDirty();
      overlay.reposition();
      return;
    }
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
      await loadPage(urlCourante());
      return;
    }
    if (!model.applyCollectionOp(id, op, ...args)) return;
    markDirty();
    overlay.refresh(model);
    navigator.render(model);
    inspector.render(null);
  }

  /** Ouvre le choix du modèle avant de créer la section. */
  function ouvrirNouvelleSection(afterRef) {
    const ref = afterRef || model.sectionList().slice(-1)[0]?.ref || null;
    showInspector();
    inspector.showNewSection(ref);
  }

  /**
   * Garde trace des pages visitées, dans les réglages du site.
   *
   * La découverte par les liens ne suffit pas quand on part de zéro : une
   * page créée à l'instant n'est encore liée de nulle part, et on ne pourrait
   * plus y revenir. Le module se souvient donc de ce qu'il a ouvert.
   */
  function memoriserPage() {
    const chemin = filePathOf(urlCourante());
    const connues = model.reglages?.pages || [];
    if (connues.some((p) => p.path === chemin)) return;
    // Une page créée hérite du titre de sa page modèle : deux entrées
    // portant le même nom ne se distingueraient pas. Le nom du fichier
    // prend alors le relais.
    const titre = (model.doc.title || '').split(/[—|–-]/)[0].trim().slice(0, 40);
    const doublon = !titre || connues.some((p) => p.label === titre);
    model.setReglage('pages', [...connues, { path: chemin, label: doublon ? labelOf(chemin) : titre }]);
    markDirty();
  }

  /** Liste des pages du site : changer de page, ou en créer une. */
  function ouvrirPages() {
    openPages({
      root, t, doc: model.doc, hosting,
      connues: model.reglages?.pages || [],
      meta: {
        lire: () => model.pageMetaCourant(),
        ecrire: (patch) => {
          model.setPageMeta(patch);
          // Le nom de la page sert aussi de libellé dans la liste et dans un
          // menu : on le répercute au lieu de garder l'ancien.
          if (typeof patch.titre === 'string' && patch.titre.trim()) {
            const chemin = filePathOf(urlCourante());
            const connues = (model.reglages?.pages || [])
              .map((p) => (p.path === chemin ? { ...p, label: patch.titre.trim().slice(0, 40) } : p));
            model.setReglage('pages', connues);
          }
          markDirty();
        },
      },
      onOpen: async (url) => {
        await autosave.flush();
        await loadPage(url, { keepScroll: false });
        showLibrary();
        proposerAssistant();
      },
      onCreate: async (chemin, depuis) => {
        // Sans ça, ce qui vient d'être saisi — le nom de la page, par
        // exemple — serait perdu au rechargement qui suit.
        await autosave.flush();
        await hosting.createPage(chemin, depuis);
        const base = urlCourante().replace(/[^/]*$/, '');
        await loadPage(base + chemin, { keepScroll: false });
        showLibrary();
        notify(t('pageCreated'));
        proposerAssistant();
      },
    });
  }

  /** L'ambiance du site : polices, couleurs, formes, rythme. */
  function ouvrirTheme() {
    openTheme({
      root, t,
      valeur: model.reglages?.theme || null,
      siteExistant: model.entries.size > 0,
      onChange: (reglage) => {
        model.setReglage('theme', reglage);
        markDirty();
        overlay.reposition();
        guide?.render();
      },
    });
  }

  /** Catalogue du site : fiches produits et façon d'encaisser. */
  function ouvrirBoutique() {
    openBoutique({
      root, t,
      produits: model.reglages?.produits || [],
      boutique: model.reglages?.boutique || {},
      pickMedia: (rappel, accept) => { shell.showView('medias'); library.pick(rappel, accept); },
      onSave: async ({ produits, boutique }) => {
        model.setReglage('produits', produits);
        model.setReglage('boutique', boutique);
        markDirty();
        // Les vitrines déjà posées dans la page suivent le catalogue.
        for (const record of model.widgetSections()) model.rerenderSection(record.key);
        overlay.reposition();
      },
    });
  }

  /**
   * Pages légales. Les réponses au questionnaire sont conservées dans le
   * document commun du site : elles ne dépendent d'aucune page, et servent
   * aux trois documents.
   */
  function ouvrirLegal() {
    openLegal({
      root, t,
      etat: model.reglages?.legal || null,
      peutCreerPages: hosting.enabled,
      onSave: (etat) => { model.setReglage('legal', etat); markDirty(); },
      onApply: async (documents) => {
        for (const document of documents) {
          await poserDocumentLegal(document);
        }
        notify(t('legalFait', documents.length));
      },
    });
  }

  /**
   * Pose un document légal : dans une page dédiée quand l'hébergement sait
   * en créer une, sinon à la suite de la page ouverte.
   */
  async function poserDocumentLegal(document) {
    if (hosting.enabled) {
      const base = urlCourante().replace(/[^/]*$/, '');
      try {
        // L'endpoint attend un chemin relatif au site, pas une URL.
        await hosting.createPage(document.fichier, filePathOf(urlCourante()));
        await autosave.flush();
        await loadPage(base + document.fichier, { keepScroll: false });
        model.applyTrees(document.sections, true);
        markDirty();
        // La page vient d'être créée en copiant celle-ci : la laisser en
        // brouillon mettrait en ligne une page « mentions légales » qui
        // affiche l'accueil. On publie donc tout de suite ; l'avertissement
        // du panneau rappelle qu'il faut relire.
        await publish();
        await loadPage(base + document.fichier, { keepScroll: false });
        showLibrary();
        return;
      } catch (err) {
        // La page existe déjà, ou l'écriture est refusée : on retombe sur
        // l'insertion dans la page ouverte plutôt que d'abandonner.
        debug('création de page légale impossible', err);
      }
    }
    model.applyTrees(document.sections, false);
    markDirty();
    await autosave.flush();
    await loadPage(urlCourante(), { keepScroll: false });
    showLibrary();
  }

  /** Pose la trame d'une page entière. */
  async function appliquerModelePage(id, remplacer) {
    if (!model.applyPageTemplate(id, remplacer)) return;
    markDirty();
    await autosave.flush();
    await loadPage(urlCourante(), { keepScroll: false });
    showLibrary();
    notify(t('pageTplApplied'));
  }

  /**
   * Assistant de démarrage. Ne s'ouvre de lui-même que sur une page vierge,
   * et une seule fois : refermé, il ne revient pas à chaque chargement.
   */
  function ouvrirAssistant() {
    openWizard({
      root, t,
      peutCreerPages: hosting.enabled,
      theme: model.reglages?.theme || null,
      onSkip: () => marquerAssistantVu(),
      onApply: async (trees, theme) => {
        marquerAssistantVu();
        if (!model.applyTrees(trees, true)) return;
        if (theme?.id) model.setReglage('theme', theme);
        markDirty();
        await autosave.flush();
        await loadPage(urlCourante(), { keepScroll: false });
        shell.showView('guide');
        notify(t('pageTplApplied'));
      },
    });
  }

  const cleAssistant = () => `admin:assistant:${config.siteId}:${state.pageId}`;

  function marquerAssistantVu() {
    try { localStorage.setItem(cleAssistant(), '1'); } catch { /* stockage refusé */ }
  }

  function assistantDejaVu() {
    try { return localStorage.getItem(cleAssistant()) === '1'; } catch { return false; }
  }

  /**
   * Ouvre l'assistant si la page ouverte est vierge. Appelé à l'entrée dans
   * l'éditeur et après chaque changement de page : une page qu'on vient de
   * créer est vierge elle aussi, et c'est là qu'on a le plus besoin d'aide.
   */
  function proposerAssistant() {
    if (state.pageVierge && !assistantDejaVu()) ouvrirAssistant();
  }

  /** Insère une section construite depuis un modèle. */
  async function ajouterModele(id, afterRef) {
    const ref = afterRef || model.sectionList().slice(-1)[0]?.ref || null;
    const key = model.addTemplateSection(id, ref);
    if (!key) return;
    markDirty();
    await autosave.flush();
    await loadPage(urlCourante());
    const el = model.doc.querySelector(`[data-admin-section="${key}"]`);
    if (el) { overlay.reveal(el); overlay.setActive(el); }
    notify(t('templateAdded'));
  }

  /** Crée une section vide, prête à recevoir des widgets. */
  async function ajouterSectionVide(afterRef, options = {}) {
    const ref = afterRef || model.sectionList().slice(-1)[0]?.ref || null;
    const key = model.addBlankSection(ref);
    markDirty();
    await autosave.flush();
    await loadPage(urlCourante());
    const record = model.sections.add.find((r) => r.key === key);

    // La nouvelle section est ajoutée en bas de page : sans amener l'aperçu
    // dessus, l'utilisateur ne verrait rien se passer.
    const el = model.doc.querySelector(`[data-admin-section="${key}"]`);
    if (el) {
      overlay.reveal(el);
      overlay.setActive(el);
    }
    if (!options.silencieux) {
      showLibrary();
      notify(t('sectionAdded'));
    }
    return record ? record.tree.key : null;
  }

  /**
   * Opérations de structure. Une section ajoutée, retirée ou déplacée change
   * la page : on repart de la source et on réapplique tout, plutôt que
   * d'empiler les transformations sur un DOM déjà modifié.
   */
  async function sectionOp(ref, op, ...args) {
    let change = false;
    if (op === 'add') change = model.sectionOp('add', ref, args[0] || ref);
    else if (op === 'duplicate') change = model.sectionOp('add', ref, ref);
    else if (op === 'hide') {
      const section = model.sectionList().find((x) => x.ref === ref);
      change = model.sectionOp('hide', ref, section ? section.label : '');
    } else if (op === 'show') change = model.sectionOp('show', ref);
    else if (op === 'move') change = model.sectionOp('move', ...args);
    if (!change) return;

    markDirty();
    await autosave.flush();
    await loadPage(urlCourante());

    // Amener l'aperçu sur la section concernée : dupliquer une section en bas
    // de page sans montrer le résultat donne l'impression que rien ne s'est
    // passé — le panneau s'est juste refermé.
    const cible = op === 'duplicate'
      ? model.sectionList().find((x) => x.ref === 'ins:' + model.sections.add.slice(-1)[0]?.key)
      : model.sectionList().find((x) => x.ref === ref);
    if (cible) {
      overlay.reveal(cible.el);
      overlay.setActive(cible.el);
    }
    notify(t(op === 'hide' ? 'sectionRemoved' : op === 'duplicate' ? 'sectionDuplicated' : 'sectionMoved'));
  }

  function urlCourante() {
    const doc = shell.frame?.contentDocument;
    return doc ? doc.location.href.split('?')[0] : location.pathname;
  }

  // ================================================================
  //  Brouillon et publication
  // ================================================================
  const autosave = debounce(async () => {
    if (!state.dirty || !model) return;
    state.saving = true;
    render();
    try {
      await Promise.all([
        backend.saveDraft(state.pageId, model.toSnapshot({ portee: 'page' })),
        backend.saveDraft(PAGE_COMMUNE, model.toSnapshot({ portee: 'commun' })),
      ]);
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
    // La jauge du guide suit la frappe ; le rendu complet, lui, attendrait la
    // fin de la saisie — il ferait perdre le curseur à chaque caractère.
    guide?.majAvancement();
    autosave();
  }

  async function publish() {
    autosave.cancel();
    textEditor.commit();
    publishButton.disabled = true;
    try {
      const instantane = model.toSnapshot({ portee: 'page' });
      const commun = model.toSnapshot({ portee: 'commun' });
      await backend.publish(state.pageId, instantane);
      await backend.publish(PAGE_COMMUNE, commun);
      safe(() => localStorage.setItem(cacheKey({ ...config, pageId: state.pageId }), JSON.stringify(instantane)));
      safe(() => localStorage.setItem(cacheKey({ ...config, pageId: PAGE_COMMUNE }), JSON.stringify(commun)));
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
    // La page régénérée est celle qu'on édite, pas celle par laquelle on est
    // entré : sans ça, publier depuis une autre page écraserait l'accueil.
    const chemin = filePathOf(urlCourante());
    const { sourceUrl } = await hosting.ensureSource(chemin);
    const scanOptions = { ...model.scanOptions };
    delete scanOptions.doc;
    const { html, orphans } = await bakePage({
      sourceUrl, snapshot: model.toSnapshot(), scanOptions, pageId: state.pageId,
    });
    if (orphans.length) notify(t('orphans', orphans.length), true);
    await hosting.writePage(html, chemin);
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

    shell.setState([pastille, h('span', {}, details.join(' · '))]);

    previewButton.replaceChildren(icon(state.editing ? 'eye' : 'pencil', 13));
    previewButton.title = state.editing ? t('preview') : t('edit');
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
    proposerAssistant();
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
        sectionOp, widgetOp, appliquerModelePage,
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
