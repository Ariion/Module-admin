/**
 * Runtime public — le seul fichier chargé par les visiteurs du site.
 *
 * Rôle : appliquer le contenu publié au HTML existant, le plus tôt possible,
 * et ouvrir l'éditeur si la personne est administratrice. Il ne contient
 * aucune interface : le code de l'éditeur n'est téléchargé qu'à l'ouverture.
 *
 * Règle absolue : si quoi que ce soit échoue (réseau, base vide, contenu
 * illisible), la page reste telle que le développeur l'a écrite.
 *
 * @module runtime
 */
import { resolveConfig, cacheKey, isPassive } from './core/config.js';
import { PageModel } from './core/model.js';
import { getDocument } from './data/rest.js';
import { paths } from './data/schema.js';
import { setDebug, debug, safe } from './core/log.js';
import { actionsDe, attacherActions } from './core/actions.js';
import { ready, emitter } from './core/util.js';

const EDITOR_SESSION_KEY = 'admin:editing';

function readCache(config) {
  if (!config.cache) return null;
  return safe(() => {
    const raw = localStorage.getItem(cacheKey(config));
    return raw ? JSON.parse(raw) : null;
  }, null, 'cache');
}

function writeCache(config, snapshot) {
  if (!config.cache) return;
  safe(() => localStorage.setItem(cacheKey(config), JSON.stringify(snapshot)), null, 'cache');
}

function hasContent(snapshot) {
  if (!snapshot) return false;
  const structure = snapshot.sections || {};
  return Object.keys(snapshot.content || {}).length > 0
    || Object.keys(snapshot.collections || {}).length > 0
    || (structure.add || []).length > 0
    || (structure.hide || []).length > 0
    || (structure.order || []).length > 0;
}

/** L'éditeur doit-il s'ouvrir ? (paramètre d'URL, ou session déjà ouverte) */
function editorRequested(config) {
  const trigger = config.editor.trigger;
  const params = new URLSearchParams(location.search);
  if (trigger && (params.has(trigger) || location.hash === '#' + trigger)) return true;
  return safe(() => sessionStorage.getItem(EDITOR_SESSION_KEY) === '1', false);
}

class AdminRuntime {
  constructor(config) {
    this.config = config;
    this.events = emitter();
    this.model = null;
    this.snapshot = null;
    this.editor = null;
  }

  /** Construit le modèle de page à la demande (coûteux : un parcours du DOM). */
  getModel() {
    if (!this.model) {
      this.model = new PageModel({
        roots: this.config.scan.roots,
        exclude: this.config.scan.exclude,
        backgrounds: this.config.scan.backgrounds,
        minBackgroundArea: this.config.scan.minBackgroundArea,
        visibleOnly: this.config.scan.visibleOnly,
        minItems: this.config.scan.minItems,
        requireClass: this.config.scan.requireClass,
      }).refresh();
    }
    return this.model;
  }

  apply(snapshot, origin) {
    if (!hasContent(snapshot)) return null;
    const result = this.getModel().applySnapshot(snapshot);
    // Les appels à l'action qui ouvrent une fenêtre : on rebranche à chaque
    // application, les éléments ayant pu être reconstruits.
    safe(() => {
      this.detacherActions?.();
      this.detacherActions = attacherActions(document, actionsDe(this.model));
    }, null, 'actions');
    this.snapshot = snapshot;
    debug('contenu appliqué depuis', origin, result);
    this.events.emit('applied', { snapshot, origin, ...result });
    safe(() => this.config.onApplied?.({ origin, ...result }), null, 'onApplied');
    return result;
  }

  /** Récupère le contenu publié (lecture publique, sans SDK). */
  async fetchPublished() {
    const { firebase, siteId, pageId } = this.config;
    if (!firebase?.projectId || !siteId) return null;
    const data = await getDocument(firebase, paths.page(siteId, pageId));
    if (!data) return null;
    return {
      v: data.v || 1,
      content: data.content || {},
      collections: data.collections || {},
      sections: data.sections || null,
    };
  }

  /** Charge le code de l'éditeur (uniquement pour les administrateurs). */
  async openEditor() {
    if (this.editor) return this.editor;
    const module = await import('./ui/editor.js');
    this.editor = await module.startEditor(this);
    return this.editor;
  }

  markEditing(value) {
    safe(() => {
      if (value) sessionStorage.setItem(EDITOR_SESSION_KEY, '1');
      else sessionStorage.removeItem(EDITOR_SESSION_KEY);
    });
  }
}

/** Mode démonstration : le contenu « publié » vit dans le localStorage. */
async function loadDemoPublished(config) {
  const { MemoryBackend } = await import('./data/memory.js');
  const data = await new MemoryBackend(config).loadPublished(config.pageId);
  if (!data) return null;
  return {
    v: data.v || 1,
    content: data.content || {},
    collections: data.collections || {},
    sections: data.sections || null,
  };
}

/**
 * Marque les balises <script> du module pour que l'export puisse les retirer,
 * quel que soit le chemin choisi par l'intégrateur.
 */
function tagOwnScripts() {
  safe(() => {
    const self = new URL(import.meta.url).href;
    for (const script of document.querySelectorAll('script[src]')) {
      const href = new URL(script.getAttribute('src'), document.baseURI).href;
      if (href === self || /admin-config\.js$/.test(href)) {
        script.setAttribute('data-admin-script', '');
      }
    }
  }, null, 'tagOwnScripts');
}

async function boot() {
  const config = resolveConfig(window.ADMIN_CONFIG || {});
  setDebug(config.debug);

  // Chargement passif : la page est affichée dans une iframe de l'éditeur
  // (aperçu) ou sert de base à la régénération du HTML. Dans les deux cas
  // c'est l'éditeur qui pilote le contenu — le module ne fait rien ici.
  if (isPassive()) {
    debug('chargement passif : module neutralisé');
    window.Admin = { passive: true, config };
    return;
  }

  const runtime = new AdminRuntime(config);
  window.Admin = runtime;
  tagOwnScripts();

  // 1. Cache local : le contenu déjà connu est appliqué sans attendre le
  //    réseau, ce qui évite de voir l'ancien texte pendant un instant.
  const cached = readCache(config);
  ready(() => {
    if (cached) safe(() => runtime.apply(cached, 'cache'), null, 'apply-cache');
    if (editorRequested(config)) runtime.openEditor().catch((err) => console.error('[admin]', err));
  });

  // 2. Version publiée, en tâche de fond.
  if (config.siteId) {
    const published = config.backend === 'demo'
      ? await loadDemoPublished(config)
      : await runtime.fetchPublished();
    if (published) {
      writeCache(config, published);
      ready(() => {
        if (JSON.stringify(published) !== JSON.stringify(cached)) {
          safe(() => runtime.apply(published, 'firestore'), null, 'apply-remote');
        }
      });
    }
  }

  runtime.events.emit('ready', runtime);
}

boot().catch((err) => console.error('[admin] démarrage impossible', err));
