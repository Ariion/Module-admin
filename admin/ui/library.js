/**
 * Bibliothèque média, intégrée au panneau.
 *
 * Deux sources fusionnées : l'index tenu dans Firestore (ce qui a été
 * téléversé depuis l'éditeur) et, si l'adaptateur sait lister, le contenu
 * réel du dossier hébergé chez le client — ce qui rend visibles les images
 * déposées en FTP par le développeur.
 *
 * Sert aussi de sélecteur : quand un réglage demande une image, on bascule
 * sur cet onglet et le clic suivant renvoie le choix.
 * @module ui/library
 */
import { h, icon, clear } from './el.js';
import { safeImageUrl } from '../core/sanitize.js';

export function createLibrary({ vue, t, backend, media, onPicked }) {
  let enAttente = null;
  let elements = [];

  const message = h('p', { class: 'hint', style: { marginTop: '0' } });
  const grille = h('div', { class: 'grid' });
  const fichier = h('input', {
    type: 'file', accept: 'image/*', multiple: true, style: { display: 'none' },
    onchange: async (e) => {
      const choisis = Array.from(e.target.files || []);
      e.target.value = '';
      for (const f of choisis) await envoyer(f);
      await charger();
    },
  });

  const boutonAjout = h('button', {
    class: 'btn btn--wide', type: 'button', style: { marginBottom: '12px' },
    onclick: () => fichier.click(),
  }, icon('upload', 13), t('addMedia'));

  vue.append(boutonAjout, message, grille, fichier);
  if (!media.primary.canUpload) boutonAjout.remove();

  async function envoyer(f) {
    message.textContent = t('uploading') + ' ' + f.name;
    try {
      const resultat = await media.primary.upload(f);
      await backend.addMedia(resultat);
      message.textContent = '';
    } catch (err) {
      message.textContent = err.message || String(err);
    }
  }

  async function charger() {
    message.textContent = '…';
    const vus = new Set();
    elements = [];

    const ajouter = (item) => {
      const url = safeImageUrl(item.url);
      if (!url || vus.has(url)) return;
      vus.add(url);
      elements.push({ ...item, url });
    };

    try { (await backend.listMedia()).forEach(ajouter); } catch { /* index illisible */ }
    if (media.primary.list) {
      try { (await media.primary.list()).forEach(ajouter); } catch { /* dossier illisible */ }
    }
    dessiner();
  }

  function dessiner() {
    clear(grille);
    message.textContent = elements.length
      ? (enAttente ? t('pickHint') : '')
      : t('emptyLibrary');

    for (const item of elements) {
      grille.appendChild(h('button', {
        class: 'tile', type: 'button', title: item.name || item.url,
        onclick: () => choisir(item),
      },
        h('img', { src: item.url, alt: item.name || '', loading: 'lazy' }),
        h('div', { class: 'tile__name' }, item.name || item.url.split('/').pop()),
      ));
    }
  }

  function choisir(item) {
    if (!enAttente) {
      // Hors sélection, un clic recopie l'adresse : pratique pour la coller
      // dans un champ ou la partager.
      navigator.clipboard?.writeText(item.url).catch(() => {});
      message.textContent = t('urlCopied');
      return;
    }
    const rappel = enAttente;
    enAttente = null;
    rappel(item);
    onPicked?.();
    dessiner();
  }

  /** Passe en mode sélection : le prochain clic renvoie l'image choisie. */
  function pick(rappel) {
    enAttente = rappel;
    dessiner();
    if (!elements.length) charger();
  }

  return { charger, pick, render: charger };
}
