/**
 * Configuration : valeurs par défaut, fusion et vérifications.
 * Un site n'a normalement qu'à fournir `siteId` et les clés Firebase.
 * @module core/config
 */
import { pageKeyFromLocation } from './dom.js';
import { warn } from './log.js';

export const DEFAULTS = {
  /** Identifiant du site dans la base. Obligatoire. */
  siteId: '',
  /** Clés du projet Firebase (console Firebase > Paramètres du projet). */
  firebase: null,
  /** 'firebase' en production, 'demo' pour essayer sans backend. */
  backend: 'firebase',
  /** Langue de l'interface d'administration : 'fr' ou 'en'. */
  lang: 'fr',
  /** Journalisation détaillée dans la console. */
  debug: false,
  /** Clé de la page. Par défaut déduite de l'URL. */
  pageId: null,
  /** Mémorise le contenu publié pour un affichage immédiat au rechargement. */
  cache: true,

  editor: {
    /** Paramètre d'URL qui ouvre l'éditeur : /index.html?admin */
    trigger: 'admin',
    /** Raccourci clavier d'ouverture. */
    hotkey: 'ctrl+alt+e',
    /** Délai d'enregistrement automatique du brouillon (ms). */
    autosave: 2500,
  },

  scan: {
    /** Zones analysées. Restreindre accélère et évite les faux positifs. */
    roots: ['body'],
    /** Sélecteurs à ne jamais rendre éditables. */
    exclude: [],
    /** Détecter les images de fond CSS. */
    backgrounds: true,
    /** Aire minimale (px²) d'une image de fond éditable. */
    minBackgroundArea: 12000,
    /** Ignorer ce qui n'est pas affiché au moment du scan. */
    visibleOnly: true,
    /** Nombre minimal de blocs pour reconnaître une liste répétable. */
    minItems: 2,
    /** N'accepter comme bloc répétable que des éléments portant une classe. */
    requireClass: true,
  },

  media: {
    /** 'firebase' | 'endpoint' | 'url' */
    adapter: 'firebase',
    /** URL du script de dépôt hébergé chez le client (adaptateur endpoint). */
    endpoint: '',
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.82,
    format: 'auto',
  },

  /** Appelée après chaque application de contenu : réinitialiser un slider… */
  onApplied: null,
};

function merge(base, override) {
  const out = { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    if (value === undefined) continue;
    out[key] = value && typeof value === 'object' && !Array.isArray(value) && base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])
      ? merge(base[key], value)
      : value;
  }
  return out;
}

/** Normalise la configuration fournie par le site. */
export function resolveConfig(input = {}) {
  const config = merge(DEFAULTS, input);
  config.pageId = config.pageId || pageKeyFromLocation();

  if (!config.siteId) {
    warn('siteId manquant : le module reste inactif.');
  }
  if (config.backend === 'firebase' && !config.firebase?.projectId) {
    warn('Configuration Firebase incomplète : le site s’affichera avec son contenu d’origine.');
  }
  if (config.media.adapter === 'endpoint' && !config.media.endpoint) {
    warn('media.adapter = "endpoint" mais media.endpoint n’est pas renseigné.');
  }
  return config;
}

/** Clé de cache local du contenu publié. */
export function cacheKey(config) {
  return `admin:content:${config.siteId}:${config.pageId}`;
}
