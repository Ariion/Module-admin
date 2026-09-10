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
import { resolveConfig, cacheKey, isPassive, PAGE_COMMUNE } from './core/config.js';
import { PageModel } from './core/model.js';
import { getDocument } from './data/rest.js';
import { paths } from './data/schema.js';
import { setDebug, debug, safe } from './core/log.js';
import { actionsDe, attacherActions } from './core/actions.js';
import { poserPanier } from './core/boutique.js';
import { animerApparitions } from './core/effets.js';
import { ready, emitter } from './core/util.js';

const EDITOR_SESSION_KEY = 'admin:editing';

function readCache(config, pageId = config.pageId) {
  if (!config.cache) return null;
  return safe(() => {
    const raw = localStorage.getItem(cacheKey({ ...config, pageId }));
    return raw ? JSON.parse(raw) : null;
  }, null, 'cache');
}

function writeCache(config, snapshot, pageId = config.pageId) {
  if (!config.cache) return;
  safe(() => localStorage.setItem(cacheKey({ ...config, pageId }), JSON.stringify(snapshot)), null, 'cache');
}

function hasContent(snapshot) {
  if (!snapshot) return false;
  const structure = snapshot.sections || {};
  return Object.keys(snapshot.content || {}).length > 0
    || Object.keys(snapshot.collections || {}).length > 0
    || (structure.add || []).length > 0
    || (structure.hide || []).length > 0
    || (structure.order || []).length > 0
    // Un document commun peut ne porter que les réglages du site.
    || !!snapshot.reglages
      || !!snapshot.meta;
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
    // Le commun et la page se succèdent : le second cumule ce que le premier
    // n'a pas retrouvé, au lieu de repartir de zéro.
    const estCommun = String(origin).includes('commun');
    const result = this.getModel().applySnapshot(snapshot, { cumuler: !estCommun });
    // Les appels à l'action qui ouvrent une fenêtre : on rebranche à chaque
    // application, les éléments ayant pu être reconstruits.
    safe(() => {
      this.detacherActions?.();
      this.detacherActions = attacherActions(document, actionsDe(this.model));
    }, null, 'actions');
    // Le panier n'est chargé que si le site en a un, et une seule fois.
    safe(() => poserPanier(document, this.model.reglages?.boutique), null, 'panier');
    // Du contenu vient d'arriver : il a pu apporter de nouveaux blocs animés.
    this.animer();
    this.snapshot = snapshot;
    debug('contenu appliqué depuis', origin, result);
    this.events.emit('applied', { snapshot, origin, ...result });
    safe(() => this.config.onApplied?.({ origin, ...result }), null, 'onApplied');
    return result;
  }

  /**
   * Fait apparaître les blocs animés quand ils entrent dans l'écran.
   *
   * Appelée au démarrage ET après chaque application de contenu : sur une
   * page régénérée les blocs sont déjà dans le HTML, sur une page vivante ils
   * arrivent avec l'instantané. Rien n'est masqué si le navigateur ne sait pas
   * observer, ou si le visiteur a demandé moins d'animations.
   */
  animer() {
    safe(() => {
      this.detacherAnimations?.();
      this.detacherAnimations = animerApparitions(document);
    }, null, 'animations');
  }

  /** Récupère le contenu publié (lecture publique, sans SDK). */
  async fetchPublished(pageId = this.config.pageId) {
    const { firebase, siteId } = this.config;
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

  /**
   * Contenu de l'en-tête et du pied de page, commun à toutes les pages.
   * Une requête de plus, mais c'est ce qui évite au client de corriger son
   * numéro de téléphone page par page.
   */
  fetchCommun() {
    return this.fetchPublished(PAGE_COMMUNE);
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
async function loadDemoPublished(config, pageId = config.pageId) {
  const { MemoryBackend } = await import('./data/memory.js');
  const data = await new MemoryBackend(config).loadPublished(pageId);
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
  const cachedCommun = readCache(config, PAGE_COMMUNE);
  ready(() => {
    // L'en-tête et le pied d'abord : la page a le dernier mot sur ce qui la
    // concerne, mais les deux visent des éléments distincts.
    if (cachedCommun) safe(() => runtime.apply(cachedCommun, 'cache-commun'), null, 'apply-cache-commun');
    if (cached) safe(() => runtime.apply(cached, 'cache'), null, 'apply-cache');
    // Les apparitions ne dépendent pas du contenu : sur une page régénérée,
    // les blocs animés sont DÉJÀ dans le HTML et il n'y a rien à appliquer.
    // Les installer ici, c'est les faire marcher même sans réseau.
    if (!editorRequested(config)) runtime.animer();
    if (editorRequested(config)) runtime.openEditor().catch((err) => console.error('[admin]', err));
  });

  // 2. Version publiée, en tâche de fond.
  if (config.siteId) {
    const demo = config.backend === 'demo';
    const [commun, published] = await Promise.all([
      demo ? loadDemoPublished(config, PAGE_COMMUNE) : runtime.fetchCommun(),
      demo ? loadDemoPublished(config) : runtime.fetchPublished(),
    ]);
    if (commun) {
      writeCache(config, commun, PAGE_COMMUNE);
      ready(() => {
        if (JSON.stringify(commun) !== JSON.stringify(cachedCommun)) {
          safe(() => runtime.apply(commun, 'firestore-commun'), null, 'apply-commun');
        }
      });
    }
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
