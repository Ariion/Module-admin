/**
 * Régénération du fichier HTML avec le contenu publié.
 *
 * C'est ce qui rend le module réellement optionnel : à chaque publication, le
 * fichier `.html` posé sur l'hébergement est réécrit avec le contenu à
 * l'intérieur. Le client peut supprimer le module quand il veut — son site
 * garde tout, sans aucune manipulation de sa part.
 *
 * Le point important est de NE PAS repartir du DOM affiché, qui a déjà subi
 * une application de contenu (et parfois les scripts du site). On recharge la
 * SOURCE d'origine dans une iframe cachée, on lui applique l'instantané
 * publié, et on sérialise. Chaque publication repart donc du code écrit par le
 * développeur : aucune dérive ne s'accumule au fil des enregistrements.
 *
 * @module core/bake
 */
import { PageModel } from './model.js';
import { BAKE_PARAM } from './config.js';
import { loadFrame } from './frame.js';
import { debug, warn } from './log.js';

/** Marqueur qui distingue un fichier régénéré du code source d'origine. */
export const BAKED_META = 'admin-baked';

/**
 * Charge une source dans une iframe cachée et retourne son document.
 * L'iframe est rendue (hors écran) et non `display:none` : la mise en page
 * doit être calculée pour que les images de fond CSS soient détectables.
 */
/** Retire du document régénéré tout ce que le module y a laissé. */
function clean(doc, pageId) {
  for (const node of doc.querySelectorAll('[data-admin-ui]')) node.remove();
  for (const node of doc.querySelectorAll('#admin-document-style')) node.remove();
  for (const node of doc.querySelectorAll('*')) {
    for (const attr of Array.from(node.attributes)) {
      if (attr.name.startsWith('data-admin-')) node.removeAttribute(attr.name);
    }
  }
  doc.documentElement.removeAttribute('data-admin-active');
  doc.documentElement.style.removeProperty('--admin-bar-h');
  if (!doc.documentElement.getAttribute('style')) doc.documentElement.removeAttribute('style');

  for (const stale of doc.querySelectorAll('meta[name="' + BAKED_META + '"]')) stale.remove();
  const meta = doc.createElement('meta');
  meta.setAttribute('name', BAKED_META);
  meta.setAttribute('content', pageId + '|' + new Date().toISOString());
  doc.head.appendChild(meta);
}

/**
 * Régénère le HTML d'une page à partir de sa source et d'un instantané publié.
 *
 * @param {object} options
 * @param {string} options.sourceUrl  URL du code d'origine de la page
 * @param {object} options.snapshot   contenu publié
 * @param {object} options.scanOptions options de détection (mêmes qu'en édition)
 * @param {string} options.pageId
 * @param {number} [options.timeout] abandon au-delà de ce délai (ms)
 * @param {number} [options.settle]  attente après analyse du HTML (ms)
 * @returns {Promise<{html:string, applied:number, orphans:object[]}>}
 */
export async function bakePage({ sourceUrl, snapshot, scanOptions = {}, pageId, timeout = 20000, settle = 500 }) {
  const { doc, frame, sourceDoc } = await loadFrame({
    url: sourceUrl,
    param: BAKE_PARAM,
    style: 'position:fixed;left:-20000px;top:0;width:1280px;height:900px;'
      + 'opacity:0;pointer-events:none;border:0;',
    timeout,
    settle,
  });
  if (!doc) throw new Error('Source illisible.');
  try {
    const model = new PageModel({ ...scanOptions, doc }).refresh();
    const result = model.applySnapshot(snapshot);
    clean(doc, pageId);

    const html = serialize(doc, sourceDoc);
    debug('régénération', pageId, result.applied, 'valeurs,', result.orphans.length, 'orphelins');

    if (result.orphans.length) {
      warn('régénération : contenus non replacés', result.orphans.map((o) => o.sample));
    }
    return { html, applied: result.applied, orphans: result.orphans };
  } finally {
    frame.remove();
  }
}

/**
 * Sérialise le document régénéré, en recollant la fin du <body> que
 * l'analyseur de l'iframe n'aurait pas atteinte. Sans cela, les balises
 * <script> du module — donc la capacité du client à continuer à éditer —
 * disparaîtraient du fichier réécrit.
 */
function serialize(doc, sourceDoc) {
  let tail = '';
  if (sourceDoc) {
    const missing = Array.from(sourceDoc.body.children).slice(doc.body.children.length);
    tail = missing.map((node) => node.outerHTML).join('\n');
  }
  let html = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML + '\n';
  if (tail) {
    debug('fin de page recollée :', tail.length, 'octets');
    html = html.replace(/<\/body>/i, tail + '\n</body>');
  }
  return html;
}

/** Le document courant est-il un rendu régénéré ? (informatif) */
export function isBaked(doc = document) {
  return !!doc.querySelector('meta[name="' + BAKED_META + '"]');
}
