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

  /**
   * Hébergement du client. Renseigné, le module réécrit le fichier .html à
   * chaque publication : le contenu est alors DANS le HTML, et retirer le
   * module ne fait rien perdre. Laissé vide (Netlify, hébergement statique
   * pur), le contenu reste servi par le module au chargement.
   */
  host: {
    /** URL du script déposé sur l'hébergement (tools/admin-endpoint.php). */
    endpoint: '',
    /** Réécrire le HTML à chaque publication. */
    autoBake: true,
    /** Fichier à réécrire. Par défaut déduit de l'URL. */
    pagePath: '',
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
  // Un seul script sert le média et la régénération : on relie les deux si
  // l'intégrateur n'en a renseigné qu'un.
  if (!config.host.endpoint && config.media.endpoint) config.host.endpoint = config.media.endpoint;
  if (!config.media.endpoint && config.host.endpoint) config.media.endpoint = config.host.endpoint;
  return config;
}

/**
 * Paramètre d'URL qui neutralise le module : utilisé par l'iframe de
 * régénération, qui a besoin de la page NUE pour repartir du code d'origine.
 */
export const BAKE_PARAM = 'admin-bake';

/**
 * Paramètre d'URL de l'aperçu : la page est affichée dans l'iframe de
 * l'éditeur, qui pilote lui-même le contenu. Le module ne doit donc rien y
 * appliquer ni y rouvrir une interface.
 */
export const PREVIEW_PARAM = 'admin-preview';

/** L'URL courante demande-t-elle un chargement passif du module ? */
export function isPassive(search = location.search) {
  const params = new URLSearchParams(search);
  return params.has(BAKE_PARAM) || params.has(PREVIEW_PARAM);
}

/** Clé de cache local du contenu publié. */
export function cacheKey(config) {
  return `admin:content:${config.siteId}:${config.pageId}`;
}
