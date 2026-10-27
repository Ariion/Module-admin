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
  // Le barré : trois balises pour une seule mise en forme, parce que les
  // navigateurs ne produisent pas la même. `S` est celle d'aujourd'hui,
  // `STRIKE` celle que rendent encore de vieux moteurs, `DEL` celle qu'un
  // développeur aura écrite à la main. Les trois disent « prix barré », et
  // n'en garder qu'une ferait disparaître la mise en forme d'un client sur
  // trois sans rien signaler.
  'S', 'STRIKE', 'DEL',
]);

const ALLOWED_ATTRS = {
  '*': new Set(['class', 'title', 'lang', 'dir']),
  A: new Set(['href', 'target', 'rel']),
  TIME: new Set(['datetime']),
  ABBR: new Set(['title']),
};

/**
 * Balises qui peuvent porter un style en ligne, et la seule propriété qu'on
 * y accepte : la couleur du texte.
 *
 * Colorer un mot n'a pas d'autre moyen — il n'y a pas de balise pour ça.
 * Mais `style` est une porte large : on n'ouvre que celle-là. Pas de
 * position, pas de display, pas d'image de fond, rien qui puisse recouvrir
 * la page ou en déplacer un morceau.
 */
const STYLABLE = new Set(['SPAN', 'B', 'STRONG', 'I', 'EM', 'U', 'MARK', 'A', 'SMALL']);
const PROPRIETES_STYLE = new Set(['color']);

/** Ne garde du style que les propriétés autorisées, et leur valeur si elle tient. */
export function safeStyle(valeur) {
  const brut = String(valeur ?? '');
  if (!brut || brut.length > 300) return '';
  const gardees = [];
  for (const regle of brut.split(';')) {
    const sep = regle.indexOf(':');
    if (sep < 0) continue;
    const nom = regle.slice(0, sep).trim().toLowerCase();
    const val = regle.slice(sep + 1).trim();
    if (!PROPRIETES_STYLE.has(nom)) continue;
    // Une couleur, et rien d'autre : pas de url(), pas d'expression, pas de
    // var() qui pourrait pointer ailleurs.
    if (!/^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%/]+\)|hsla?\([\d\s.,%/deg]+\)|[a-z]{3,20})$/i.test(val)) continue;
    gardees.push(`${nom}: ${val}`);
  }
  return gardees.join('; ');
}

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
    const plat = flatten(value);
    if (/^data:image\/(png|jpe?g|gif|webp|avif);base64,/.test(plat)) return value;
    // Les images d'exemple du guide sont des SVG écrits en clair. Un SVG
    // chargé comme IMAGE n'exécute jamais de script — aucun navigateur ne le
    // fait — mais on refuse quand même celui qui en contient : cette valeur
    // finit dans le HTML publié, et on ne veut pas qu'elle devienne
    // dangereuse le jour où elle servirait ailleurs.
    if (/^data:image\/svg\+xml[,;]/.test(plat)) {
      let texte = value;
      try { texte = decodeURIComponent(value); } catch { /* déjà en clair */ }
      return /<script|<foreignobject|\son\w+\s*=|javascript:/i.test(texte) ? '' : value;
    }
    return '';
  }
  if (scheme) return scheme === 'http' || scheme === 'https' ? value : '';
  return value;
}

/** Texte brut : on échappe les chevrons, aucune balise ne passe. */
export function safeText(value) {
  return String(value ?? '').replace(/[<>]/g, (c) => (c === '<' ? '&lt;' : '&gt;'));
}

/**
 * Balises dont on jette AUSSI le contenu, au lieu de le garder en texte.
 *
 * Partout ailleurs, une balise refusée laisse son texte : c'est ce qu'on veut
 * d'un `<div>` ou d'un `<p>`. Mais le « texte » d'un `<script>` est du code,
 * et celui d'un `<style>` des règles CSS. Les garder ne les rend pas
 * dangereux — ils arrivent comme texte, pas comme balise — seulement illisibles :
 * le client colle un bout de page web et voit apparaître `.menu{display:none}`
 * au milieu de sa phrase.
 */
const JETES = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'IFRAME', 'OBJECT', 'EMBED',
  'HEAD', 'TITLE', 'META', 'LINK', 'SVG', 'MATH', 'CANVAS', 'AUDIO', 'VIDEO',
]);

/**
 * Balises de bloc : en les retirant, on laisse une coupure de ligne.
 *
 * Sans elle, « <p>Bonjour</p><p>Madame</p> » devient « BonjourMadame ». Le
 * client colle depuis Word, retrouve ses mots soudés, et n'a aucun moyen de
 * comprendre d'où ça vient.
 */
const BLOCS = new Set([
  'DIV', 'P', 'LI', 'UL', 'OL', 'TR', 'TD', 'TH', 'TABLE', 'SECTION',
  'ARTICLE', 'HEADER', 'FOOTER', 'ASIDE', 'NAV', 'MAIN', 'BLOCKQUOTE',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'PRE', 'HR', 'FIGURE', 'FIGCAPTION',
]);

/**
 * Profondeur maximale explorée.
 *
 * `safeHtml` tourne aussi à l'AFFICHAGE, sur le site public. Un contenu
 * imbriqué quelques milliers de fois ferait déborder la pile, et la page du
 * client ne s'afficherait plus du tout. Au-delà de cette profondeur, on
 * aplatit en texte : on perd la mise en forme d'un cas que personne ne
 * rencontre honnêtement, et la page tient.
 */
const PROFONDEUR_MAX = 60;

/**
 * Assainit un fragment HTML riche : ne conserve qu'une liste blanche de
 * balises inline et d'attributs.
 *
 * Une balise refusée est DÉBALLÉE, pas aplatie : on jette l'enveloppe et on
 * garde ce qu'elle contenait, mise en forme comprise. L'aplatir en texte
 * faisait disparaître le gras, les liens et les couleurs de tout contenu
 * collé depuis un traitement de texte ou une autre page — c'est-à-dire de
 * presque tout ce qu'un client colle.
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

function cleanNode(node, profondeur = 0) {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) continue;

    if (child.nodeType !== Node.ELEMENT_NODE) {
      child.remove();
      continue;
    }

    if (JETES.has(child.tagName)) { child.remove(); continue; }

    if (profondeur >= PROFONDEUR_MAX) {
      child.replaceWith(child.ownerDocument.createTextNode(child.textContent || ''));
      continue;
    }

    if (!ALLOWED_TAGS.has(child.tagName)) {
      // On nettoie le contenu AVANT de déballer : une fois remonté d'un cran,
      // il ne sera plus parcouru par cette boucle-ci, qui travaille sur une
      // liste d'enfants figée avant la modification.
      cleanNode(child, profondeur + 1);
      const doc = child.ownerDocument;
      const morceaux = Array.from(child.childNodes);
      // Une coupure APRÈS le bloc, et seulement s'il reste quelque chose
      // derrière : sinon on termine le contenu par un retour à vide.
      if (BLOCS.has(child.tagName) && morceaux.length && child.nextSibling) {
        morceaux.push(doc.createElement('br'));
      }
      child.replaceWith(...morceaux);
      continue;
    }

    for (const attr of Array.from(child.attributes)) {
      const name = attr.name.toLowerCase();
      if (name === 'style' && STYLABLE.has(child.tagName)) {
        const style = safeStyle(attr.value);
        if (style) child.setAttribute('style', style);
        else child.removeAttribute('style');
        continue;
      }
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

    cleanNode(child, profondeur + 1);
  }
}
