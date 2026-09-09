/**
 * Bibliothèque média interne, intégrée au panneau.
 *
 * Trois sources fusionnées :
 *  - l'index tenu côté données (ce qui a été téléversé depuis l'éditeur, et
 *    les adresses ajoutées à la main) ;
 *  - le contenu réel du dossier hébergé chez le client, si l'adaptateur sait
 *    lister — ce qui rend visibles les fichiers déposés en FTP ;
 *  - ce que le client dépose ici même, par glisser-déposer.
 *
 * Deux façons d'alimenter la bibliothèque, pour ne dépendre d'aucun
 * abonnement : le téléversement (quand le stockage le permet) et l'ajout
 * par adresse, toujours disponible — une image déjà sur le site, une vidéo
 * YouTube, un MP3 hébergé ailleurs.
 *
 * Sert aussi de sélecteur : quand un réglage demande un média, on bascule
 * sur cet onglet et le clic suivant renvoie le choix.
 * @module ui/library
 */
import { h, icon, clear } from './el.js';
import { safeImageUrl, safeUrl } from '../core/sanitize.js';

/** Extensions reconnues, par famille. */
const EXTENSIONS = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg', 'bmp', 'ico'],
  video: ['mp4', 'webm', 'ogv', 'mov', 'm4v'],
  audio: ['mp3', 'ogg', 'oga', 'wav', 'm4a', 'aac', 'flac'],
};

const FAMILLES = ['image', 'video', 'audio', 'file'];
const ICONES = { image: 'image', video: 'video', audio: 'music', file: 'pages' };
const ACCEPT_FICHIER = 'image/*,video/*,audio/*,.pdf';

/** Famille d'un média, déduite du type MIME puis de l'extension. */
export function mediaKind(item) {
  if (item?.kind && FAMILLES.includes(item.kind)) return item.kind;

  const type = String(item?.type || '');
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';

  const url = String(item?.url || '');
  if (/(?:youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com)/i.test(url)) return 'video';

  const chemin = url.split(/[?#]/)[0];
  const ext = (chemin.match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase();
  for (const famille of ['image', 'video', 'audio']) {
    if (EXTENSIONS[famille].includes(ext)) return famille;
  }
  return 'file';
}

/** Nom lisible pour un média qui n'en porte pas. */
function nomDeplie(url) {
  const valeur = String(url);
  const brut = decodeURIComponent(valeur.split(/[?#]/)[0].split('/').pop() || '');

  // Une page d'hébergeur (YouTube, Vimeo) n'a pas de nom de fichier
  // exploitable : on montre le domaine et l'identifiant de la vidéo.
  if (!/\.[a-z0-9]{2,5}$/i.test(brut) && /^https?:/i.test(valeur)) {
    try {
      const u = new URL(valeur);
      const id = u.searchParams.get('v') || brut;
      return u.hostname.replace(/^www\./, '') + (id ? ' · ' + id : '');
    } catch { /* URL illisible */ }
  }
  return brut || valeur;
}

export function createLibrary({ vue, t, backend, media, onPicked }) {
  const banque = media.banque;
  let source = 'site';        // 'site' = la bibliothèque du client, 'banque' = les images libres
  let resultats = [];
  let chercheEnCours = false;
  let enAttente = null;
  let attendu = null;      // famille demandée par le réglage qui a ouvert la sélection
  let elements = [];
  let filtre = 'all';
  let recherche = '';

  // ---------------------------------------------------------------- barre
  const champRecherche = h('input', {
    class: 'input', type: 'search', placeholder: t('searchMedia'),
    oninput: (e) => { recherche = e.target.value.trim().toLowerCase(); dessiner(); },
  });

  const filtres = h('div', { class: 'seg ml-filters' });
  const boutonsFiltre = new Map();
  for (const [id, cle] of [['all', 'filterAll'], ['image', 'filterImages'], ['video', 'filterVideos'], ['audio', 'filterAudio'], ['file', 'filterFiles']]) {
    const bouton = h('button', {
      class: 'seg__btn', type: 'button', 'aria-pressed': id === 'all' ? 'true' : 'false',
      onclick: () => { filtre = id; dessiner(); },
    }, t(cle));
    boutonsFiltre.set(id, bouton);
    filtres.appendChild(bouton);
  }

  // ------------------------------------------------------------ dépôt
  const fichier = h('input', {
    type: 'file', accept: ACCEPT_FICHIER, multiple: true, style: { display: 'none' },
    onchange: async (e) => {
      const choisis = Array.from(e.target.files || []);
      e.target.value = '';
      await envoyerTout(choisis);
    },
  });

  const zone = h('button', {
    class: 'ml-drop', type: 'button',
    onclick: () => { if (media.primary.canUpload) fichier.click(); },
  },
    icon('upload', 18),
    h('span', {}, media.primary.canUpload ? t('dropMedia') : t('dropMediaNoUpload')),
  );

  // ------------------------------------------------------- ajout par URL
  const champUrl = h('input', {
    class: 'input', type: 'text', placeholder: t('mediaUrlPlaceholder'),
    onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); ajouterUrl(); } },
  });

  const formulaireUrl = h('div', { class: 'row', style: { marginBottom: '10px' } },
    champUrl,
    h('button', { class: 'btn ml-add', type: 'button', onclick: () => ajouterUrl() }, icon('link', 13), t('add')),
  );

  const barrePick = h('div', { class: 'ml-pick', hidden: true });
  const message = h('p', { class: 'hint', style: { marginTop: '0' } });
  const grille = h('div', { class: 'grid' });

  // Bascule entre la bibliothèque du site et la banque d'images libres.
  const sources = h('div', { class: 'seg', style: { marginBottom: '10px' } },
    ['site', 'banque'].map((id) => h('button', {
      class: 'seg__btn', type: 'button', 'aria-pressed': id === source ? 'true' : 'false',
      onclick: () => { source = id; dessiner(); },
    }, t(id === 'site' ? 'sourceSite' : 'sourceBanque'))));

  // Ce qui n'appartient qu'à la bibliothèque du site.
  const blocSite = h('div', {}, zone, formulaireUrl);

  const champBanque = h('input', {
    class: 'input', type: 'search', placeholder: t('banquePlaceholder'),
    onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); chercherBanque(); } },
  });
  const blocBanque = h('div', { hidden: true },
    h('div', { class: 'row', style: { marginBottom: '9px' } },
      champBanque,
      h('button', { class: 'btn ml-add', type: 'button', onclick: () => chercherBanque() },
        icon('search', 13), t('banqueChercher')),
    ),
    h('p', { class: 'hint', style: { margin: '0 0 10px' } }, t('banqueHint')),
  );

  vue.append(
    barrePick,
    sources,
    h('div', { class: 'row', style: { marginBottom: '9px' } }, champRecherche),
    filtres,
    blocSite,
    blocBanque,
    message,
    grille,
    fichier,
  );
  if (!banque) sources.remove();

  brancherDepot();

  // ------------------------------------------------------------ dépôt OS
  function brancherDepot() {
    let profondeur = 0;
    const stop = (e) => { e.preventDefault(); e.stopPropagation(); };

    vue.addEventListener('dragenter', (e) => {
      stop(e);
      profondeur += 1;
      zone.classList.add('ml-drop--over');
    });
    vue.addEventListener('dragover', (e) => {
      stop(e);
      e.dataTransfer.dropEffect = media.primary.canUpload ? 'copy' : 'none';
    });
    vue.addEventListener('dragleave', (e) => {
      stop(e);
      profondeur = Math.max(0, profondeur - 1);
      if (!profondeur) zone.classList.remove('ml-drop--over');
    });
    vue.addEventListener('drop', async (e) => {
      stop(e);
      profondeur = 0;
      zone.classList.remove('ml-drop--over');

      const fichiers = Array.from(e.dataTransfer?.files || []);
      if (fichiers.length) { await envoyerTout(fichiers); return; }

      // Glisser une image depuis un autre onglet dépose une adresse.
      const texte = e.dataTransfer?.getData('text/uri-list') || e.dataTransfer?.getData('text/plain');
      if (texte) { champUrl.value = texte.split('\n')[0]; await ajouterUrl(); }
    });
  }

  // --------------------------------------------------------- alimentation
  async function envoyerTout(fichiers) {
    if (!fichiers.length) return;
    if (!media.primary.canUpload) {
      message.textContent = t('dropMediaNoUpload');
      return;
    }
    let erreur = '';
    for (let i = 0; i < fichiers.length; i += 1) {
      message.textContent = `${t('uploading')} ${fichiers[i].name} (${i + 1}/${fichiers.length})`;
      erreur = (await envoyer(fichiers[i])) || erreur;
    }
    await charger();
    // La relecture efface le message : on remet l'échec sous les yeux.
    message.textContent = erreur || t('mediaAdded');
  }

  /** @returns {Promise<string>} message d'erreur, ou chaîne vide si tout va bien */
  async function envoyer(f) {
    try {
      const resultat = await media.primary.upload(f);
      await backend.addMedia({ kind: mediaKind({ type: f.type, url: resultat.url }), ...resultat });
      return '';
    } catch (err) {
      return err.message || String(err);
    }
  }

  async function ajouterUrl() {
    const saisie = champUrl.value.trim();
    if (!saisie) return;

    const url = safeUrl(saisie);
    if (!url) { message.textContent = t('badUrl'); return; }

    const kind = mediaKind({ url });
    // Une image doit rester affichable : on repasse par le filtre dédié.
    if (kind === 'image' && !safeImageUrl(url)) { message.textContent = t('badUrl'); return; }

    try {
      await backend.addMedia({ url, name: nomDeplie(url), kind, source: 'url' });
      champUrl.value = '';
      await charger();
      message.textContent = t('mediaAdded');
    } catch (err) {
      message.textContent = err.message || String(err);
    }
  }

  async function chercherBanque() {
    if (!banque?.disponible || chercheEnCours) return;
    const requete = champBanque.value.trim();
    if (!requete) return;
    chercheEnCours = true;
    message.textContent = t('banqueRecherche');
    try {
      const { images, total } = await banque.chercher(requete);
      resultats = images;
      message.textContent = images.length ? t('banqueResultats', total) : t('banqueRien');
    } catch (err) {
      resultats = [];
      message.textContent = err.message || String(err);
    } finally {
      chercheEnCours = false;
      dessiner();
    }
  }

  /** Range une image de la banque dans la bibliothèque du site. */
  async function prendreDansBanque(image) {
    message.textContent = t('banqueImport');
    try {
      const item = await banque.importer(image);
      await backend.addMedia(item);
      await charger();
      message.textContent = banque.peutImporter ? t('banqueImporte') : t('banqueLie');
      if (enAttente) {
        source = 'site';
        choisir({ ...item, url: safeImageUrl(item.url) || item.url });
      }
    } catch (err) {
      message.textContent = err.message || String(err);
    }
  }

  async function supprimer(item) {
    if (!confirm(t('deleteMediaConfirm'))) return;
    try {
      if (item.path && media.primary.remove) await media.primary.remove(item);
      if (item.id && backend.deleteMedia) await backend.deleteMedia(item.id);
      await charger();
    } catch (err) {
      message.textContent = err.message || String(err);
    }
  }

  function copier(item) {
    navigator.clipboard?.writeText(item.url).catch(() => {});
    message.textContent = t('urlCopied');
  }

  // ------------------------------------------------------------- lecture
  async function charger() {
    message.textContent = '…';
    const parUrl = new Map();
    const ajouter = (item) => {
      // Les vidéos et les fichiers n'ont pas à passer par le filtre image.
      const kind = mediaKind(item);
      const url = kind === 'image' ? safeImageUrl(item.url) : safeUrl(item.url);
      if (!url) return;

      const connu = parUrl.get(url);
      if (connu) {
        // Même fichier vu deux fois : on complète (l'index apporte l'id, le
        // dossier apporte le chemin réel).
        for (const [cle, valeur] of Object.entries(item)) {
          if (connu[cle] === undefined || connu[cle] === '') connu[cle] = valeur;
        }
        return;
      }
      parUrl.set(url, { ...item, url, kind });
    };

    try { (await backend.listMedia()).forEach(ajouter); } catch { /* index illisible */ }
    if (media.primary.list) {
      try { (await media.primary.list()).forEach(ajouter); } catch { /* dossier illisible */ }
    }

    elements = [...parUrl.values()];
    dessiner();
  }

  function visibles() {
    return elements.filter((item) => {
      if (filtre !== 'all' && item.kind !== filtre) return false;
      if (!recherche) return true;
      return `${item.name || ''} ${item.url}`.toLowerCase().includes(recherche);
    });
  }

  // ------------------------------------------------------------- rendu
  function dessiner() {
    for (const [id, bouton] of boutonsFiltre) {
      bouton.setAttribute('aria-pressed', id === filtre ? 'true' : 'false');
    }

    clear(barrePick);
    barrePick.hidden = !enAttente;
    if (enAttente) {
      barrePick.append(
        h('span', {}, t('pickHint')),
        h('button', {
          class: 'btn btn--ghost', type: 'button',
          onclick: () => { enAttente = null; attendu = null; dessiner(); },
        }, t('cancel')),
      );
    }

    const dansBanque = source === 'banque' && banque;
    blocSite.hidden = dansBanque;
    blocBanque.hidden = !dansBanque;
    champRecherche.parentElement.hidden = dansBanque;
    filtres.hidden = dansBanque;
    for (const bouton of sources.children) {
      bouton.setAttribute('aria-pressed', bouton.textContent === t(source === 'site' ? 'sourceSite' : 'sourceBanque') ? 'true' : 'false');
    }

    clear(grille);

    if (dansBanque) {
      if (!banque.disponible) {
        message.textContent = '';
        grille.appendChild(h('p', { class: 'hint', style: { gridColumn: '1 / -1', margin: '0' } },
          t('banqueSansCle')));
        return;
      }
      for (const image of resultats) grille.appendChild(tuileBanque(image));
      return;
    }

    const liste = visibles();
    if (!elements.length) message.textContent = t('emptyLibrary');
    else if (!liste.length) message.textContent = t('noMatch');
    else if (message.textContent === '…') message.textContent = '';

    for (const item of liste) grille.appendChild(tuile(item));
  }

  /** Une image de la banque : un clic la range dans la bibliothèque. */
  function tuileBanque(image) {
    return h('div', { class: 'tile', title: image.etiquettes },
      h('button', {
        class: 'tile__pick', type: 'button', onclick: () => prendreDansBanque(image),
      },
        h('img', { src: image.apercu, alt: '', loading: 'lazy' }),
        h('div', { class: 'tile__name' }, image.auteur ? '© ' + image.auteur : image.etiquettes),
      ),
    );
  }

  function tuile(item) {
    const nom = item.name || nomDeplie(item.url);
    const apercu = item.kind === 'image'
      ? h('img', { src: item.url, alt: '', loading: 'lazy' })
      : h('div', { class: 'tile__icon' }, icon(ICONES[item.kind] || 'pages', 20));

    return h('div', { class: 'tile', title: nom + ' — ' + item.url },
      h('button', {
        class: 'tile__pick', type: 'button', onclick: () => choisir(item),
      }, apercu, h('div', { class: 'tile__name' }, nom)),
      h('div', { class: 'tile__acts' },
        h('button', {
          class: 'btn btn--sm btn--icon', type: 'button', title: t('copyUrl'),
          onclick: (e) => { e.stopPropagation(); copier(item); },
        }, icon('copy', 12)),
        h('button', {
          class: 'btn btn--sm btn--icon btn--danger', type: 'button', title: t('remove'),
          onclick: (e) => { e.stopPropagation(); supprimer(item); },
        }, icon('trash', 12)),
      ),
    );
  }

  function choisir(item) {
    if (!enAttente) {
      // Hors sélection, un clic recopie l'adresse : pratique pour la coller
      // dans un champ ou la partager.
      copier(item);
      return;
    }
    const rappel = enAttente;
    enAttente = null;
    attendu = null;
    rappel(item);
    onPicked?.();
    dessiner();
  }

  /**
   * Passe en mode sélection : le prochain clic renvoie le média choisi.
   * @param {Function} rappel appelé avec l'élément choisi
   * @param {string} [accept] famille attendue ('image', 'video', 'audio')
   */
  function pick(rappel, accept) {
    enAttente = rappel;
    message.textContent = '';
    attendu = FAMILLES.includes(accept) ? accept : null;
    filtre = attendu || 'all';
    dessiner();
    if (!elements.length) charger();
  }

  /**
   * La source d'images a changé (une clé vient d'être saisie) : on redessine
   * l'onglet pour que le nouvel état — et le nom de la banque — s'y voient.
   */
  function rafraichirBanque() {
    if (source === 'banque') dessiner();
  }

  return {
    charger, pick, render: charger, rafraichirBanque,
    get pending() { return attendu; },
  };
}
