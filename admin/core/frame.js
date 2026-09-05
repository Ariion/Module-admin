/**
 * Chargement d'une page du site dans une iframe.
 *
 * Deux usages : l'aperçu de l'éditeur, et la régénération du HTML. Les deux
 * ont besoin d'un document COMPLET — analyser une page à moitié produirait
 * des empreintes fausses, donc un contenu enregistré au mauvais endroit.
 * @module core/frame
 */

/** Nombre d'enfants d'un <body> qui portent du contenu (hors <script>). */
function contentCount(body) {
  let n = 0;
  for (const child of body.children) if (child.tagName !== 'SCRIPT') n++;
  return n;
}

/** Feuilles de style du site lui-même, qu'il faut avoir chargées. */
function ownStylesheets(doc) {
  let n = doc.querySelectorAll('style').length;
  for (const link of doc.querySelectorAll('link[rel~="stylesheet"][href]')) {
    try {
      if (new URL(link.getAttribute('href'), doc.baseURI).origin === location.origin) n++;
    } catch { /* href illisible */ }
  }
  return n;
}

/**
 * Retire les feuilles de style d'un autre domaine qui n'ont pas répondu.
 * N'agit que sur le document d'aperçu, jamais sur le site publié.
 */
function dropForeignStylesheets(doc) {
  const retirees = [];
  for (const link of Array.from(doc.querySelectorAll('link[rel~="stylesheet"][href]'))) {
    try {
      const href = new URL(link.getAttribute('href'), doc.baseURI);
      if (href.origin === location.origin) continue;
      retirees.push(href.host);
      link.remove();
    } catch { /* href illisible */ }
  }
  return retirees;
}

/**
 * Charge une page dans une iframe. L'iframe doit être RENDUE (hors écran au
 * besoin, jamais `display:none`) : la mise en page doit être calculée pour
 * que les images de fond CSS soient détectables.
 *
 * Le point délicat est de savoir QUAND analyser. Attendre `readyState` n'est
 * pas tenable : un `<script src>` classique bloque l'analyseur tant qu'une
 * feuille de style distante n'a pas répondu, et une police de CDN lente fait
 * durer la publication dix secondes ou plus. Mais régénérer un document
 * analysé à moitié écraserait le fichier du site par une page tronquée.
 *
 * On tranche en comparant à la source, récupérée en parallèle : dès que
 * l'iframe contient tout le CONTENU annoncé, on peut analyser. La fin
 * éventuellement manquante — des balises <script> restées derrière le
 * blocage — est recollée telle quelle à la sérialisation.
 */
export function loadFrame({
  url, param, container = document.body, style,
  timeout = 20000, settle = 500, waitPaint = false, paintTimeout = 2000,
}) {
  const separator = url.includes('?') ? '&' : '?';
  const bakeUrl = url + separator + param + '=1';

  const reference = fetch(bakeUrl, { cache: 'no-cache' })
    .then((response) => response.text())
    .then((text) => new DOMParser().parseFromString(text, 'text/html'))
    .catch(() => null);

  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('data-admin-ui', '');
    frame.setAttribute('aria-hidden', 'true');
    frame.setAttribute('tabindex', '-1');
    if (style) frame.style.cssText = style;
    frame.src = bakeUrl;

    let sourceDoc = null;
    let done = false;
    let stableAt = 0;
    let sheets = -1;
    let paintSince = 0;

    reference.then((parsed) => { sourceDoc = parsed; });

    const finish = (error) => {
      if (done) return;
      done = true;
      clearInterval(poll);
      clearTimeout(timer);
      if (error) { frame.remove(); reject(error); }
      else resolve({ doc: frame.contentDocument, frame, sourceDoc });
    };

    const timer = setTimeout(
      () => finish(new Error('La source du site n’a pas répondu à temps.')),
      timeout,
    );

    const poll = setInterval(() => {
      let doc;
      try { doc = frame.contentDocument; } catch {
        finish(new Error('Source illisible (origine différente ?).'));
        return;
      }
      if (!doc || !doc.body || doc.location.href === 'about:blank') return;

      const complete = doc.readyState !== 'loading'
        || (sourceDoc && contentCount(doc.body) >= contentCount(sourceDoc.body));
      if (!complete) return;

      // Les styles du site doivent être appliqués pour que les images de fond
      // CSS soient vues. Les feuilles tierces (polices) ne bloquent pas.
      const loaded = doc.styleSheets.length;
      if (loaded !== sheets) { sheets = loaded; stableAt = Date.now(); return; }
      if (loaded < ownStylesheets(doc) && Date.now() - stableAt < settle) return;

      // Pour la régénération, la mise en page suffit. Pour l'aperçu, il faut
      // aussi que le navigateur ait PEINT — or une feuille de style distante
      // qui ne répond pas bloque le premier rendu : l'aperçu resterait blanc
      // alors que le document est complet. Passé un délai, on retire ces
      // feuilles tierces de l'aperçu, jamais du site ni du fichier régénéré.
      if (!waitPaint || doc.readyState !== 'loading') { finish(); return; }
      if (!paintSince) { paintSince = Date.now(); return; }
      if (Date.now() - paintSince < paintTimeout) return;

      const bloquantes = dropForeignStylesheets(doc);
      if (bloquantes.length) {
        console.warn('[admin] aperçu : feuille(s) de style distante(s) sans réponse, ignorée(s) —', bloquantes);
      }
      finish();
    }, 40);

    frame.addEventListener('error', () => finish(new Error('Source introuvable : ' + url)), { once: true });
    container.appendChild(frame);
  });
}

