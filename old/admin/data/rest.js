/**
 * Lecture du contenu publié par l'API REST de Firestore.
 *
 * Le visiteur ne charge donc PAS le SDK Firebase (≈ 100 Ko) : une simple
 * requête `fetch` suffit, puisque les pages publiées sont en lecture
 * publique. Le SDK n'est chargé que par l'éditeur, pour les personnes
 * connectées.
 * @module data/rest
 */
import { debug, warn } from '../core/log.js';

const HOST = 'https://firestore.googleapis.com/v1';

/** Convertit une valeur typée Firestore en valeur JavaScript. */
export function decodeValue(value) {
  if (!value || typeof value !== 'object') return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return Date.parse(value.timestampValue) || null;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeValue);
  if ('mapValue' in value) return decodeFields(value.mapValue.fields);
  if ('bytesValue' in value) return null;
  if ('referenceValue' in value) return value.referenceValue;
  return null;
}

export function decodeFields(fields) {
  const out = {};
  for (const [key, value] of Object.entries(fields || {})) out[key] = decodeValue(value);
  return out;
}

/**
 * Lit un document. Retourne null si absent (404) ou si le réseau échoue :
 * l'appelant doit toujours pouvoir continuer avec le HTML d'origine.
 */
export async function getDocument(config, path, { signal } = {}) {
  const { projectId, apiKey, databaseId = '(default)' } = config;
  if (!projectId || !apiKey) return null;
  const url = `${HOST}/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(databaseId)}/documents/${path}?key=${encodeURIComponent(apiKey)}`;
  try {
    const response = await fetch(url, { signal, credentials: 'omit', cache: 'no-cache' });
    if (response.status === 404) return null;
    if (!response.ok) {
      warn('Firestore REST', response.status, path);
      return null;
    }
    const json = await response.json();
    debug('REST', path, 'ok');
    return decodeFields(json.fields);
  } catch (err) {
    warn('Firestore injoignable, le HTML d’origine est conservé', err);
    return null;
  }
}
