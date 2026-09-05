/**
 * Dialogue avec l'hébergement du site (script `admin-endpoint.php`).
 *
 * Sert à deux choses, toutes deux nécessaires pour que le module reste
 * optionnel :
 *   1. conserver une copie intacte du code d'origine de chaque page, pour que
 *      chaque régénération reparte du travail du développeur ;
 *   2. réécrire le fichier `.html` publié avec le contenu à l'intérieur.
 *
 * Sans hébergement capable d'écrire (Netlify et autres statiques purs), tout
 * continue de fonctionner : le contenu est simplement servi par le module,
 * comme avant, et l'export manuel reste disponible.
 * @module data/host
 */
import { debug, warn } from '../core/log.js';

/** Chemin du fichier correspondant à l'URL courante. */
export function defaultPagePath(pathname = location.pathname) {
  let path = decodeURIComponent(pathname || '/').replace(/^\/+/, '');
  if (path === '' || path.endsWith('/')) return path + 'index.html';
  const last = path.split('/').pop();
  return last.includes('.') ? path : path + '/index.html';
}

export function createHost(config, backend) {
  const endpoint = config.host?.endpoint || '';
  const pagePath = config.host?.pagePath || defaultPagePath();
  const enabled = !!endpoint && config.host?.autoBake !== false;

  async function call(action, body) {
    const token = await backend.idToken();
    const response = await fetch(endpoint + '?action=' + action, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* réponse non JSON */ }
    if (!response.ok || !json || json.error) {
      throw new Error(json?.error || `Hébergement : réponse ${response.status}. ${text.slice(0, 140)}`);
    }
    return json;
  }

  return {
    enabled,
    endpoint,
    pagePath,

    /**
     * Garantit qu'une copie intacte du code d'origine existe et retourne son
     * URL. Si le développeur a redéployé sa page entre-temps, l'hébergement
     * remplace la copie par la nouvelle version — le code reste maître.
     */
    async ensureSource() {
      const result = await call('source', { path: pagePath });
      debug('source du site', result.sourceUrl, result.refreshed ? '(rafraîchie)' : '');
      return result;
    },

    /** Écrit le HTML régénéré à la place de la page publiée. */
    async writePage(html) {
      const result = await call('page', { path: pagePath, html });
      debug('page réécrite', result.bytes, 'octets');
      return result;
    },

    /** Diagnostic : l'hébergement répond-il et sait-il écrire ? */
    async check() {
      try {
        return { ok: true, ...(await call('check', { path: pagePath })) };
      } catch (err) {
        warn('hébergement injoignable', err);
        return { ok: false, error: err.message };
      }
    },
  };
}
