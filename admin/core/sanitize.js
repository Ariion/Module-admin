/**
 * Assainissement du contenu.
 *
 * Le contenu vient de Firestore : même si seul un client authentifié peut
 * écrire, on ne fait jamais confiance à ce qu'on relit. On assainit donc
 * DEUX fois : à l'enregistrement (ce qui sort de l'éditeur) et à l'affichage
 * (ce qui entre depuis la base). Un compte compromis ne doit pas permettre
 * d'injecter du script dans le site public.
 * @module core/sanitize
 */

const ALLOWED_TAGS = new Set([
  'B', 'STRONG', 'I', 'EM', 'U', 'SPAN', 'BR', 'SMALL', 'SUP', 'SUB',
  'MARK', 'A', 'CODE', 'ABBR', 'TIME', 'CITE', 'Q',
]);

const ALLOWED_ATTRS = {
  '*': new Set(['class', 'title', 'lang', 'dir']),
  A: new Set(['href', 'target', 'rel']),
  TIME: new Set(['datetime']),
  ABBR: new Set(['title']),
};

const SAFE_SCHEMES = new Set(['http', 'https', 'mailto', 'tel', 'sms']);

/**
 * Retire espaces, caractères de contrôle et caractères invisibles avant de
 * tester le schéma d'une URL : "java\tscript:alert(1)" ne doit pas passer.
 */
function flatten(value) {
  let out = '';
  for (const ch of value) {
    const code = ch.codePointAt(0);
    const invisible = code <= 0x20 || code === 0xa0 || code === 0xfeff
      || (code >= 0x200b && code <= 0x200f) || code === 0x2028 || code === 0x2029;
    if (!invisible) out += ch;
  }
  return out.toLowerCase();
}

/** Extensions de fichier : "contact.html" est un chemin, pas un domaine. */
const FILE_EXT = /\.(html?|php|aspx?|jsp|pdf|jpe?g|png|gif|svg|webp|avif|css|js|json|xml|txt|zip|docx?|xlsx?)$/i;
const BARE_DOMAIN = /^[\w-]+(\.[\w-]+)+(\/.*)?$/;

/** Schéma d'une URL, ou null si elle est relative. */
function schemeOf(value) {
  const match = flatten(value).match(/^([a-z][a-z0-9+.-]*):/);
  return match ? match[1] : null;
}

/**
 * Normalise une URL de lien. Accepte les chemins relatifs ("contact.html",
 * "images/photo.jpg"), les ancres et les schémas sûrs. Renvoie '' pour tout
 * le reste — javascript:, data:, blob:, etc.
 */
export function safeUrl(url) {
  const value = String(url ?? '').trim();
  if (!value) return '';

  const scheme = schemeOf(value);
  if (scheme) return SAFE_SCHEMES.has(scheme) ? value : '';

  // Sans schéma : chemin relatif ou absolu, ancre, paramètres.
  if (/^[/#?]/.test(value) || value.startsWith('./') || value.startsWith('../')) return value;

  // Saisie du type "monsite.fr/page" : on complète en lien externe. Un nom de
  // fichier ("contact.html") reste un chemin relatif.
  const firstSegment = value.split(/[/?#]/)[0];
  if (BARE_DOMAIN.test(value) && !FILE_EXT.test(firstSegment)) return 'https://' + value;

  return value;
}

/** Normalise une URL d'image (les data: image sont admises pour l'aperçu). */
export function safeImageUrl(url) {
  const value = String(url ?? '').trim();
  if (!value) return '';

  const scheme = schemeOf(value);
  if (scheme === 'data') {
    return /^data:image\/(png|jpe?g|gif|webp|avif);base64,/.test(flatten(value)) ? value : '';
  }
  if (scheme) return scheme === 'http' || scheme === 'https' ? value : '';
  return value;
}

/** Texte brut : on échappe les chevrons, aucune balise ne passe. */
export function safeText(value) {
  return String(value ?? '').replace(/[<>]/g, (c) => (c === '<' ? '&lt;' : '&gt;'));
}

/**
 * Assainit un fragment HTML riche : ne conserve qu'une liste blanche de
 * balises inline et d'attributs. Tout le reste est aplati en texte.
 */
export function safeHtml(html) {
  const input = String(html ?? '');
  if (!input) return '';
  if (!input.includes('<')) return input;

  const doc = new DOMParser().parseFromString('<div id="admin-sanitize-root"></div>', 'text/html');
  const root = doc.getElementById('admin-sanitize-root');
  if (!root) return '';
  root.innerHTML = input;
  cleanNode(root);
  return root.innerHTML;
}

function cleanNode(node) {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) continue;

    if (child.nodeType !== Node.ELEMENT_NODE) {
      child.remove();
      continue;
    }

    if (!ALLOWED_TAGS.has(child.tagName)) {
      // Balise interdite : on garde le texte, on jette l'enveloppe.
      child.replaceWith(child.ownerDocument.createTextNode(child.textContent || ''));
      continue;
    }

    for (const attr of Array.from(child.attributes)) {
      const name = attr.name.toLowerCase();
      const allowed = ALLOWED_ATTRS['*'].has(name) || ALLOWED_ATTRS[child.tagName]?.has(name);
      if (!allowed || name.startsWith('on')) child.removeAttribute(attr.name);
    }

    if (child.tagName === 'A') {
      const href = safeUrl(child.getAttribute('href'));
      if (href) child.setAttribute('href', href);
      else child.removeAttribute('href');
      if (child.getAttribute('target') === '_blank') {
        child.setAttribute('rel', 'noopener noreferrer');
      }
    }

    cleanNode(child);
  }
}
