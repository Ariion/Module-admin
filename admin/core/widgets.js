/**
 * Catalogue de widgets et rendu.
 *
 * Le problème d'un widget générique posé sur un site écrit à la main, c'est
 * qu'il jure avec le reste. La réponse tient dans le balisage : les widgets
 * émettent du HTML SÉMANTIQUE ET SANS CLASSES — un `<h2>`, un `<p>`, un
 * `<img>`. La feuille de style du site s'y applique donc d'elle-même, et un
 * titre inséré prend la police, la couleur et les marges du site. Seuls les
 * conteneurs portent quelques styles en ligne, pour la mise en grille.
 *
 * Un widget n'est jamais inséré dans le balisage du développeur : il vit dans
 * une section ajoutée. La mise en page du site reste intacte.
 * @module core/widgets
 */
import { uid } from './util.js';
import { safeHtml, safeUrl, safeImageUrl, safeText } from './sanitize.js';
import { applyStyleObject } from './style.js';

/** Catégories affichées dans le panneau, dans l'ordre. */
export const CATEGORIES = ['structure', 'basique', 'media'];

/**
 * Définition d'un widget.
 * `container` : accepte d'autres widgets. `fields` : réglages exposés.
 */
export const WIDGETS = {
  section: {
    category: 'structure', icon: 'section', container: true, hidden: true,
    defaults: () => ({ maxWidth: 1080, padding: 64, align: 'left' }),
    fields: [
      { key: 'maxWidth', type: 'number', label: 'widthLabel', min: 320, max: 2000, step: 20 },
      { key: 'padding', type: 'number', label: 'paddingLabel', min: 0, max: 200, step: 4 },
    ],
  },

  column: {
    category: 'structure', icon: 'columns', container: true, hidden: true,
    defaults: () => ({}),
    fields: [],
  },

  columns: {
    category: 'structure', icon: 'columns', container: true, columns: true,
    defaults: () => ({ count: 2, gap: 28 }),
    fields: [
      { key: 'count', type: 'select', label: 'columnCount', options: [2, 3, 4] },
      { key: 'gap', type: 'number', label: 'gapLabel', min: 0, max: 120, step: 4 },
    ],
  },

  heading: {
    category: 'basique', icon: 'heading',
    defaults: () => ({ text: 'Titre de section', level: 'h2', align: 'left' }),
    fields: [
      { key: 'text', type: 'text', label: 'textContent' },
      { key: 'level', type: 'select', label: 'levelLabel', options: ['h2', 'h3', 'h4'] },
      { key: 'align', type: 'align', label: 'alignLabel' },
    ],
  },

  text: {
    category: 'basique', icon: 'text',
    defaults: () => ({ html: 'Un paragraphe de texte. Cliquez pour le modifier.', align: 'left' }),
    fields: [
      { key: 'html', type: 'richtext', label: 'textContent' },
      { key: 'align', type: 'align', label: 'alignLabel' },
    ],
  },

  button: {
    category: 'basique', icon: 'button',
    defaults: () => ({ text: 'En savoir plus', href: '#', target: '', align: 'left' }),
    fields: [
      { key: 'text', type: 'text', label: 'linkLabel' },
      { key: 'href', type: 'text', label: 'linkUrl' },
      { key: 'target', type: 'checkbox', label: 'linkTarget', on: '_blank' },
      { key: 'align', type: 'align', label: 'alignLabel' },
    ],
  },

  list: {
    category: 'basique', icon: 'list',
    defaults: () => ({ items: 'Premier élément\nDeuxième élément\nTroisième élément' }),
    fields: [{ key: 'items', type: 'lines', label: 'itemsLabel' }],
  },

  divider: {
    category: 'basique', icon: 'divider',
    defaults: () => ({ width: 100 }),
    fields: [{ key: 'width', type: 'number', label: 'widthPercent', min: 10, max: 100, step: 5 }],
  },

  spacer: {
    category: 'basique', icon: 'spacer',
    defaults: () => ({ height: 48 }),
    fields: [{ key: 'height', type: 'number', label: 'heightLabel', min: 8, max: 400, step: 8 }],
  },

  image: {
    category: 'media', icon: 'image',
    defaults: () => ({ src: '', alt: '', align: 'left', width: 100 }),
    fields: [
      { key: 'src', type: 'image', label: 'imageUrl' },
      { key: 'alt', type: 'text', label: 'altText' },
      { key: 'width', type: 'number', label: 'widthPercent', min: 10, max: 100, step: 5 },
      { key: 'align', type: 'align', label: 'alignLabel' },
    ],
  },

  video: {
    category: 'media', icon: 'video',
    defaults: () => ({ url: '' }),
    fields: [{ key: 'url', type: 'text', label: 'videoUrl', placeholder: 'https://www.youtube.com/watch?v=…' }],
  },

  audio: {
    category: 'media', icon: 'music',
    defaults: () => ({ src: '', title: '' }),
    fields: [
      { key: 'src', type: 'audio', label: 'audioUrl' },
      { key: 'title', type: 'text', label: 'audioTitle' },
    ],
  },

  map: {
    category: 'media', icon: 'map',
    defaults: () => ({ query: '', height: 340 }),
    fields: [
      { key: 'query', type: 'text', label: 'mapQuery', placeholder: '14 route de la Forêt, Parentis' },
      { key: 'height', type: 'number', label: 'heightLabel', min: 160, max: 800, step: 20 },
    ],
  },
};

/** Crée un widget neuf, avec ses valeurs par défaut. */
export function createWidget(type) {
  const def = WIDGETS[type];
  if (!def) return null;
  const noeud = { key: uid('w'), type, props: { ...def.defaults(), style: {} } };
  if (def.container) {
    noeud.children = def.columns
      ? Array.from({ length: noeud.props.count }, () => ({ key: uid('c'), type: 'column', children: [] }))
      : [];
  }
  return noeud;
}

/** Aligne un élément selon la propriété `align`. */
function appliquerAlignement(el, align) {
  if (align && align !== 'left') el.style.textAlign = align;
}

/**
 * Construit le DOM d'un widget.
 * @param {object} noeud
 * @param {Document} doc
 * @returns {Element|null}
 */
export function renderWidget(noeud, doc) {
  if (!noeud || !noeud.type) return null;
  const p = noeud.props || {};
  let el = null;

  switch (noeud.type) {
    case 'section': {
      el = doc.createElement('section');
      const interieur = doc.createElement('div');
      interieur.style.maxWidth = (p.maxWidth || 1080) + 'px';
      interieur.style.margin = '0 auto';
      interieur.style.padding = (p.padding ?? 64) + 'px 24px';
      el.appendChild(interieur);
      rendreEnfants(noeud.children, interieur, doc);
      break;
    }

    case 'column': {
      el = doc.createElement('div');
      el.style.minWidth = '0';
      rendreEnfants(noeud.children, el, doc);
      break;
    }

    case 'columns': {
      el = doc.createElement('div');
      el.style.display = 'grid';
      el.style.gridTemplateColumns = `repeat(${Math.max(1, Math.min(4, p.count || 2))}, minmax(0, 1fr))`;
      el.style.gap = (p.gap ?? 28) + 'px';
      rendreEnfants(noeud.children, el, doc);
      break;
    }

    case 'heading': {
      el = doc.createElement(['h2', 'h3', 'h4'].includes(p.level) ? p.level : 'h2');
      el.textContent = String(p.text ?? '');
      appliquerAlignement(el, p.align);
      break;
    }

    case 'text': {
      el = doc.createElement('div');
      el.innerHTML = safeHtml(p.html ?? '');
      appliquerAlignement(el, p.align);
      break;
    }

    case 'button': {
      el = doc.createElement('div');
      appliquerAlignement(el, p.align);
      const lien = doc.createElement('a');
      lien.textContent = String(p.text ?? '');
      const href = safeUrl(p.href);
      if (href) lien.setAttribute('href', href);
      if (p.target === '_blank') {
        lien.setAttribute('target', '_blank');
        lien.setAttribute('rel', 'noopener noreferrer');
      }
      el.appendChild(lien);
      break;
    }

    case 'list': {
      el = doc.createElement('ul');
      for (const ligne of String(p.items ?? '').split('\n')) {
        if (!ligne.trim()) continue;
        const item = doc.createElement('li');
        item.textContent = ligne.trim();
        el.appendChild(item);
      }
      break;
    }

    case 'divider': {
      el = doc.createElement('hr');
      el.style.width = Math.max(10, Math.min(100, p.width ?? 100)) + '%';
      el.style.marginLeft = '0';
      break;
    }

    case 'spacer': {
      el = doc.createElement('div');
      el.style.height = Math.max(0, p.height ?? 48) + 'px';
      el.setAttribute('aria-hidden', 'true');
      break;
    }

    case 'image': {
      el = doc.createElement('div');
      appliquerAlignement(el, p.align);
      const img = doc.createElement('img');
      const src = safeImageUrl(p.src);
      if (src) img.setAttribute('src', src);
      img.setAttribute('alt', safeText(p.alt || '').replace(/&lt;|&gt;/g, ''));
      img.style.width = Math.max(10, Math.min(100, p.width ?? 100)) + '%';
      img.style.display = 'inline-block';
      el.appendChild(img);
      break;
    }

    case 'video': {
      el = doc.createElement('div');
      const src = urlIntegration(p.url);
      if (src) {
        el.style.position = 'relative';
        el.style.paddingBottom = '56.25%';
        const cadre = doc.createElement('iframe');
        cadre.setAttribute('src', src);
        cadre.setAttribute('title', 'Vidéo');
        cadre.setAttribute('loading', 'lazy');
        cadre.setAttribute('allowfullscreen', '');
        cadre.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;';
        el.appendChild(cadre);
      } else {
        el.appendChild(placeholder(doc, 'Ajoutez l’adresse d’une vidéo YouTube ou Vimeo.'));
      }
      break;
    }

    case 'audio': {
      el = doc.createElement('div');
      const source = safeImageUrl(p.src) || (/^(https?:|\/|\.\/)/i.test(String(p.src || '')) ? String(p.src) : '');
      if (p.title) {
        const legende = doc.createElement('p');
        legende.textContent = String(p.title);
        el.appendChild(legende);
      }
      if (source) {
        const lecteur = doc.createElement('audio');
        lecteur.setAttribute('controls', '');
        lecteur.setAttribute('src', source);
        lecteur.style.width = '100%';
        el.appendChild(lecteur);
      } else {
        el.appendChild(placeholder(doc, 'Indiquez l’adresse d’un fichier audio (MP3, OGG).'));
      }
      break;
    }

    case 'map': {
      el = doc.createElement('div');
      const requete = String(p.query || '').trim();
      if (requete) {
        const cadre = doc.createElement('iframe');
        cadre.setAttribute('src', 'https://www.google.com/maps?output=embed&q=' + encodeURIComponent(requete));
        cadre.setAttribute('title', 'Carte');
        cadre.setAttribute('loading', 'lazy');
        cadre.style.cssText = `width:100%;height:${Math.max(160, p.height ?? 340)}px;border:0;`;
        el.appendChild(cadre);
      } else {
        el.appendChild(placeholder(doc, 'Indiquez une adresse à afficher sur la carte.'));
      }
      break;
    }

    default:
      return null;
  }

  // Habillage propre au widget : même schéma que pour les éléments du site.
  if (p.style) applyStyleObject(el, p.style);

  el.setAttribute('data-admin-widget', noeud.key);
  el.setAttribute('data-admin-type', noeud.type);
  return el;
}

function rendreEnfants(enfants, parent, doc) {
  for (const enfant of enfants || []) {
    const el = renderWidget(enfant, doc);
    if (el) parent.appendChild(el);
  }
}

/** Bloc d'attente affiché tant qu'un widget n'est pas renseigné. */
function placeholder(doc, texte) {
  const el = doc.createElement('p');
  el.textContent = texte;
  el.style.cssText = 'padding:26px;border:1px dashed currentColor;opacity:.45;text-align:center;margin:0;';
  return el;
}

/** N'accepte que des hébergeurs vidéo connus, en URL d'intégration. */
function urlIntegration(url) {
  const valeur = String(url || '').trim();
  if (!valeur) return '';
  try {
    const u = new URL(valeur, 'https://x/');
    if (/(^|\.)youtube\.com$/.test(u.hostname)) {
      const id = u.searchParams.get('v');
      return id ? 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) : '';
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.slice(1);
      return id ? 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) : '';
    }
    if (/(^|\.)vimeo\.com$/.test(u.hostname)) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      return /^\d+$/.test(id || '') ? 'https://player.vimeo.com/video/' + id : '';
    }
  } catch { /* URL illisible */ }
  return '';
}

/** Parcourt un arbre de widgets et retourne le nœud portant cette clé. */
export function findWidget(racines, key, parent = null) {
  for (const noeud of racines || []) {
    if (noeud.key === key) return { noeud, parent: parent || racines, liste: racines };
    if (noeud.children) {
      const trouve = findWidget(noeud.children, key, noeud);
      if (trouve) return trouve;
    }
  }
  return null;
}

/** Retire un widget de l'arbre. */
export function removeWidget(racines, key) {
  for (let i = 0; i < racines.length; i++) {
    if (racines[i].key === key) { racines.splice(i, 1); return true; }
    if (racines[i].children && removeWidget(racines[i].children, key)) return true;
  }
  return false;
}
