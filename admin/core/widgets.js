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
import { catalogueFiltre, prixLisible, boutonAchat } from './boutique.js';

/** Catégories affichées dans le panneau, dans l'ordre. */
/** Hauteurs du bandeau d'accueil. « plein » vise la hauteur de l'écran. */
const HAUTEURS_HERO = { moyenne: '46vh', grande: '70vh', plein: '100vh' };

/** Proportions possibles pour deux colonnes. */
const RATIOS = { '1-2': '1fr 2fr', '2-1': '2fr 1fr', '1-3': '1fr 3fr', '3-1': '3fr 1fr' };

/** Les pistes d'une grille de colonnes, selon le nombre et la proportion. */
function pistesColonnes(p) {
  const nombre = Math.max(1, Math.min(4, p.count || 2));
  // Une proportion ne veut rien dire au-delà de deux colonnes.
  if (nombre === 2 && RATIOS[p.ratio]) return RATIOS[p.ratio];
  return `repeat(${nombre}, minmax(0, 1fr))`;
}

export const CATEGORIES = ['mise-en-page', 'structure', 'basique', 'media', 'boutique'];

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

  /**
   * Le bandeau d'accueil : une image plein cadre, un voile, du texte par
   * dessus. C'est ce qui manquait le plus — toutes les mises en page qu'on
   * admire commencent par là, et une section ordinaire ne sait pas le faire :
   * elle centre une boîte sur un fond uni.
   */
  hero: {
    category: 'mise-en-page', icon: 'image', container: true,
    defaults: () => ({
      image: '', voile: 45, hauteur: 'grande', align: 'center', texte: 'clair',
      maxWidth: 900, padding: 24,
    }),
    fields: [
      { key: 'image', type: 'media', label: 'heroImage', accept: 'image' },
      { key: 'hauteur', type: 'select', label: 'heroHauteur',
        options: ['moyenne', 'grande', 'plein'] },
      { key: 'voile', type: 'number', label: 'heroVoile', min: 0, max: 90, step: 5 },
      { key: 'texte', type: 'select', label: 'heroTexte', options: ['clair', 'sombre'] },
      { key: 'align', type: 'align', label: 'alignLabel' },
      { key: 'maxWidth', type: 'number', label: 'blockWidth', min: 320, max: 1600, step: 20 },
    ],
  },

  /**
   * Une carte média : l'image ET son titre, en un seul bloc, le texte posé
   * sur le bas de l'image. Empiler « image » puis « titre » donne autre
   * chose — deux blocs qui se suivent, pas une carte.
   */
  carte: {
    category: 'mise-en-page', icon: 'image',
    defaults: () => ({
      image: '', titre: 'Un lieu', sousTitre: 'PAYS', href: '', hauteur: 300,
    }),
    fields: [
      { key: 'image', type: 'media', label: 'carteImage', accept: 'image' },
      { key: 'titre', type: 'text', label: 'carteTitre' },
      { key: 'sousTitre', type: 'text', label: 'carteSousTitre' },
      { key: 'hauteur', type: 'number', label: 'carteHauteur', min: 140, max: 700, step: 10 },
      { key: 'href', type: 'text', label: 'linkHref' },
    ],
  },

  /**
   * L'étiquette : trois mots en capitales espacées au-dessus d'un titre.
   * C'est un détail, et c'est le détail qui sépare une page d'un document.
   */
  etiquette: {
    category: 'mise-en-page', icon: 'text',
    defaults: () => ({ text: 'Depuis 1974', align: 'left' }),
    fields: [
      { key: 'text', type: 'text', label: 'textLabel' },
      { key: 'align', type: 'align', label: 'alignLabel' },
    ],
  },

  column: {
    category: 'structure', icon: 'columns', container: true, hidden: true,
    defaults: () => ({}),
    fields: [],
  },

  columns: {
    category: 'structure', icon: 'columns', container: true, columns: true,
    defaults: () => ({ count: 2, gap: 28, ratio: 'egal' }),
    fields: [
      { key: 'count', type: 'select', label: 'columnCount', options: [2, 3, 4] },
      // Deux colonnes strictement égales sont ce qui donne l'air « gabarit ».
      // Un texte à côté d'une image veut presque toujours un déséquilibre.
      { key: 'ratio', type: 'select', label: 'columnRatio',
        options: ['egal', '1-2', '2-1', '1-3', '3-1'] },
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
    fields: [{ key: 'url', type: 'media', label: 'videoUrl', placeholder: 'https://www.youtube.com/watch?v=…' }],
  },

  audio: {
    category: 'media', icon: 'music',
    defaults: () => ({ src: '', title: '' }),
    fields: [
      { key: 'src', type: 'audio', label: 'audioUrl' },
      { key: 'title', type: 'text', label: 'audioTitle' },
    ],
  },

  catalogue: {
    category: 'boutique', icon: 'grid',
    defaults: () => ({ categorie: '', colonnes: 3, libelle: 'Acheter', montrerPrix: true }),
    fields: [
      { key: 'categorie', type: 'text', label: 'catalogueCategorie', placeholder: 'Toutes' },
      { key: 'colonnes', type: 'number', label: 'colCount', min: 1, max: 4, step: 1 },
      { key: 'libelle', type: 'text', label: 'catalogueLibelle' },
    ],
  },

  produit: {
    category: 'boutique', icon: 'button',
    defaults: () => ({ produit: '', libelle: 'Acheter', montrerPrix: true }),
    fields: [
      { key: 'produit', type: 'produit', label: 'produitChoisi' },
      { key: 'libelle', type: 'text', label: 'catalogueLibelle' },
    ],
  },

  menu: {
    category: 'basique', icon: 'list',
    defaults: () => ({ liens: '', align: 'center' }),
    fields: [
      { key: 'liens', type: 'lines', label: 'menuLiens' },
      { key: 'align', type: 'align', label: 'alignLabel' },
    ],
  },

  copyright: {
    category: 'basique', icon: 'pages',
    defaults: () => ({ nom: '', depuis: '', mention: 'Tous droits réservés', align: 'center' }),
    fields: [
      { key: 'nom', type: 'text', label: 'copyrightNom', placeholder: 'Nom du site ou de la société' },
      { key: 'depuis', type: 'number', label: 'copyrightDepuis', min: 1900, max: 2200, step: 1 },
      { key: 'mention', type: 'text', label: 'copyrightMention' },
      { key: 'align', type: 'align', label: 'alignLabel' },
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
/**
 * @param {object} noeud arbre du widget
 * @param {Document} doc document cible
 * @param {{produits?:object[], boutique?:object}} [contexte] données du site
 *   dont certains widgets ont besoin — le catalogue, par exemple.
 */
export function renderWidget(noeud, doc, contexte = {}) {
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
      rendreEnfants(noeud.children, interieur, doc, contexte);
      break;
    }

    case 'hero': {
      el = doc.createElement('section');
      el.style.position = 'relative';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.minHeight = HAUTEURS_HERO[p.hauteur] || HAUTEURS_HERO.grande;
      el.style.overflow = 'hidden';
      // La feuille du site met presque toujours du rembourrage sur `section`
      // et contraint `section > *` à une largeur maximale. Sur un bandeau
      // plein cadre, cela laisserait le voile au centre et l'image nue sur
      // les bords. On neutralise donc les deux, ici seulement.
      el.style.padding = '0';

      const fond = safeImageUrl(p.image);
      if (fond) {
        el.style.backgroundImage = `url("${fond.replace(/"/g, '%22')}")`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
      }

      // Le voile est ce qui rend le texte lisible sur n'importe quelle photo.
      // Sans lui, une image claire avale un titre blanc.
      const voile = Math.max(0, Math.min(90, Number(p.voile ?? 45)));
      if (fond && voile) {
        const rideau = doc.createElement('div');
        rideau.setAttribute('aria-hidden', 'true');
        rideau.style.cssText = 'position:absolute;inset:0;max-width:none;margin:0;';
        rideau.style.background = p.texte === 'sombre'
          ? `rgba(255,255,255,${voile / 100})`
          : `rgba(0,0,0,${voile / 100})`;
        el.appendChild(rideau);
      }

      const dedans = doc.createElement('div');
      dedans.style.position = 'relative';
      dedans.style.width = '100%';
      dedans.style.maxWidth = (p.maxWidth || 900) + 'px';
      dedans.style.margin = '0 auto';
      dedans.style.padding = '64px 24px';
      appliquerAlignement(dedans, p.align || 'center');
      rendreEnfants(noeud.children, dedans, doc, contexte);
      el.appendChild(dedans);

      // La feuille de style du site fixe la couleur des titres : hériter ne
      // suffirait pas. On la pose donc sur chaque descendant qui n'en a pas
      // déjà une à lui.
      if (fond) {
        const encre = p.texte === 'sombre' ? '#12141a' : '#ffffff';
        dedans.style.color = encre;
        for (const enfant of dedans.querySelectorAll('*')) {
          if (!enfant.style.color) enfant.style.color = 'inherit';
        }
      }

      // Un titre de bandeau n'a pas la taille d'un titre de section. La
      // feuille du site plafonne les h2 autour de 35 px ; sur une image plein
      // cadre, c'est ce qui fait « document » plutôt que « page ». On grossit,
      // sans écraser une taille que le client aurait choisie lui-même.
      for (const titre of dedans.querySelectorAll('h1, h2, h3')) {
        if (titre.style.fontSize) continue;
        titre.style.fontSize = 'clamp(2.4rem, 6.5vw, 4.8rem)';
        titre.style.lineHeight = '1.05';
      }
      break;
    }

    case 'carte': {
      const lien = safeUrl(p.href);
      el = doc.createElement(lien ? 'a' : 'div');
      if (lien) { el.setAttribute('href', lien); el.style.textDecoration = 'none'; }
      el.style.position = 'relative';
      el.style.display = 'flex';
      el.style.flexDirection = 'column';
      el.style.justifyContent = 'flex-end';
      el.style.minHeight = Math.max(140, Math.min(700, Number(p.hauteur) || 300)) + 'px';
      el.style.overflow = 'hidden';
      el.style.color = '#fff';

      const visuel = safeImageUrl(p.image);
      if (visuel) {
        el.style.backgroundImage = `url("${visuel.replace(/"/g, '%22')}")`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
      } else {
        el.style.background = '#20242c';
      }

      // Un dégradé plutôt qu'un voile uniforme : l'image reste visible en
      // haut, le texte reste lisible en bas.
      const ombre = doc.createElement('span');
      ombre.setAttribute('aria-hidden', 'true');
      ombre.style.cssText = 'position:absolute;inset:0;'
        + 'background:linear-gradient(transparent 35%, rgba(0,0,0,.72));';
      el.appendChild(ombre);

      const pied = doc.createElement('span');
      pied.style.cssText = 'position:relative;display:block;padding:22px 22px 20px;';
      if (p.titre) {
        const titre = doc.createElement('strong');
        titre.textContent = remplacerJetons(p.titre);
        titre.style.cssText = 'display:block;font-size:1.3em;line-height:1.2;color:inherit;';
        pied.appendChild(titre);
      }
      if (p.sousTitre) {
        const sous = doc.createElement('span');
        sous.textContent = remplacerJetons(p.sousTitre);
        sous.style.cssText = 'display:block;margin-top:6px;font-size:.72em;'
          + 'letter-spacing:.16em;text-transform:uppercase;opacity:.82;color:inherit;';
        pied.appendChild(sous);
      }
      el.appendChild(pied);
      break;
    }

    case 'etiquette': {
      el = doc.createElement('p');
      el.textContent = remplacerJetons(p.text);
      el.style.cssText = 'font-size:.74em;letter-spacing:.18em;text-transform:uppercase;'
        + 'margin:0 0 14px;opacity:.7;';
      appliquerAlignement(el, p.align);
      break;
    }

    case 'column': {
      el = doc.createElement('div');
      el.style.minWidth = '0';
      rendreEnfants(noeud.children, el, doc, contexte);
      break;
    }

    case 'columns': {
      el = doc.createElement('div');
      el.style.display = 'grid';
      el.style.gridTemplateColumns = pistesColonnes(p);
      el.style.gap = (p.gap ?? 28) + 'px';
      rendreEnfants(noeud.children, el, doc, contexte);
      break;
    }

    case 'heading': {
      el = doc.createElement(['h2', 'h3', 'h4'].includes(p.level) ? p.level : 'h2');
      el.textContent = remplacerJetons(p.text);
      appliquerAlignement(el, p.align);
      break;
    }

    case 'text': {
      el = doc.createElement('div');
      el.innerHTML = safeHtml(remplacerJetons(p.html));
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
      const fichierVideo = src ? '' : fichierMedia(p.url, VIDEO_EXT);
      if (fichierVideo) {
        // Vidéo déposée dans la bibliothèque du site : lecteur natif.
        const lecteur = doc.createElement('video');
        lecteur.setAttribute('controls', '');
        lecteur.setAttribute('playsinline', '');
        lecteur.setAttribute('preload', 'metadata');
        lecteur.setAttribute('src', fichierVideo);
        lecteur.style.cssText = 'width:100%;height:auto;display:block;';
        el.appendChild(lecteur);
      } else if (src) {
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
        el.appendChild(placeholder(doc, 'Ajoutez l’adresse d’une vidéo (YouTube, Vimeo ou fichier MP4).'));
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

    case 'catalogue':
    case 'produit': {
      // Le catalogue vit dans les réglages du site, pas dans le widget : un
      // produit corrigé l'est partout où il apparaît.
      const catalogue = contexte.produits || [];
      const liste = noeud.type === 'produit'
        ? catalogueFiltre(catalogue).filter((x) => x.id === p.produit).slice(0, 1)
        : catalogueFiltre(catalogue, p.categorie);

      el = doc.createElement('div');
      if (!liste.length) {
        el.appendChild(placeholder(doc, noeud.type === 'produit'
          ? 'Choisissez un produit dans les réglages.'
          : 'Aucun produit. Ajoutez-en depuis le panneau Boutique.'));
        break;
      }

      if (noeud.type === 'catalogue') {
        const colonnes = Math.max(1, Math.min(4, Number(p.colonnes) || 3));
        el.style.display = 'grid';
        el.style.gridTemplateColumns = `repeat(${colonnes}, minmax(0, 1fr))`;
        el.style.gap = '28px';
      }

      for (const produit of liste) {
        const carte = doc.createElement('div');
        if (produit.image) {
          const img = doc.createElement('img');
          img.setAttribute('src', produit.image);
          img.setAttribute('alt', produit.nom);
          img.setAttribute('loading', 'lazy');
          img.style.cssText = 'width:100%;height:auto;display:block;margin-bottom:14px;';
          carte.appendChild(img);
        }
        const titre = doc.createElement('h3');
        titre.textContent = produit.nom;
        carte.appendChild(titre);

        if (produit.description) {
          const texte = doc.createElement('p');
          texte.textContent = produit.description;
          carte.appendChild(texte);
        }
        if (p.montrerPrix !== false) {
          const prix = doc.createElement('p');
          prix.textContent = prixLisible(produit);
          prix.style.fontWeight = '600';
          carte.appendChild(prix);
        }
        const achat = doc.createElement('div');
        achat.appendChild(boutonAchat(doc, produit, contexte.boutique, String(p.libelle || 'Acheter')));
        carte.appendChild(achat);
        el.appendChild(carte);
      }
      break;
    }

    case 'menu': {
      // Une ligne par entrée : « Libellé | adresse ». Sans adresse, on
      // déduit un nom de fichier du libellé — c'est ce qu'attend quelqu'un
      // qui tape juste « Contact ».
      el = doc.createElement('nav');
      appliquerAlignement(el, p.align);
      el.style.display = 'flex';
      el.style.flexWrap = 'wrap';
      el.style.gap = '22px';
      if (p.align === 'center') el.style.justifyContent = 'center';
      if (p.align === 'right') el.style.justifyContent = 'flex-end';

      for (const ligne of String(p.liens ?? '').split('\n')) {
        const brut = ligne.trim();
        if (!brut) continue;
        const [libelle, adresse] = brut.split('|').map((x) => x.trim());
        if (!libelle) continue;
        const lien = doc.createElement('a');
        lien.textContent = libelle;
        const href = safeUrl(adresse || fichierDepuisLibelle(libelle));
        if (href) lien.setAttribute('href', href);
        el.appendChild(lien);
      }
      if (!el.childNodes.length) el.appendChild(placeholder(doc, 'Une ligne par entrée : Accueil | index.html'));
      break;
    }

    case 'copyright': {
      // L'année est recalculée à chaque affichage : le pied de page d'un
      // site vitrine ne devrait jamais afficher une année périmée.
      el = doc.createElement('p');
      appliquerAlignement(el, p.align);
      const annee = new Date().getFullYear();
      const depuis = parseInt(p.depuis, 10);
      const periode = Number.isFinite(depuis) && depuis > 1900 && depuis < annee
        ? depuis + '–' + annee
        : String(annee);
      el.textContent = ['©', periode, remplacerJetons(p.nom).trim(), remplacerJetons(p.mention).trim() ? '— ' + remplacerJetons(p.mention) : '']
        .filter(Boolean).join(' ');
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

function rendreEnfants(enfants, parent, doc, contexte = {}) {
  for (const enfant of enfants || []) {
    const el = renderWidget(enfant, doc, contexte);
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

/** « Nos tarifs » → « nos-tarifs.html ». */
function fichierDepuisLibelle(libelle) {
  const slug = String(libelle).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug ? slug + '.html' : '';
}

const VIDEO_EXT = /\.(mp4|webm|ogv|mov|m4v)$/i;

/**
 * Adresse d'un fichier média servi tel quel (bibliothèque du site ou lien
 * direct), par opposition à une page d'hébergeur.
 */
function fichierMedia(url, extensions) {
  const valeur = String(url || '').trim();
  if (!valeur) return '';
  const chemin = valeur.split(/[?#]/)[0];
  if (!extensions.test(chemin)) return '';
  return /^https?:/i.test(valeur) || /^[/.]/.test(valeur) ? valeur : '';
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

const JETONS = /\{\{\s*(année|annee|year)\s*\}\}/gi;

/**
 * Remplace les jetons d'un texte de widget. Seuls les widgets en profitent :
 * ils sont reconstruits depuis leurs réglages à chaque affichage, alors qu'un
 * texte du site est relu depuis la page quand le client le modifie — le jeton
 * y serait remplacé par sa valeur, et l'année figerait sans prévenir.
 */
export function remplacerJetons(texte) {
  return String(texte ?? '').replace(JETONS, String(new Date().getFullYear()));
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
