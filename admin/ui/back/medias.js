/**
 * La médiathèque, en pleine page.
 *
 * L'éditeur en direct a déjà une bibliothèque, dans un panneau de 340 px de
 * large : elle sert à CHOISIR une image quand un réglage en demande une.
 * Ici on ne choisit pas, on range — on cherche, on renomme l'idée qu'on se
 * fait de ses fichiers, on fait le tri. Ça demande de la place, et une
 * grille qui montre vraiment les images.
 *
 * Trois sources, fusionnées sur la clé qui compte — l'adresse : l'index
 * tenu en base, le dossier réellement hébergé chez le client quand
 * l'adaptateur sait le lister (ce qui rend visibles les fichiers déposés en
 * FTP), et ce qu'on dépose ici même.
 * @module ui/back/medias
 */
import { h, icon, clear } from '../el.js';
import { teteEcran, listeVide } from './shell-back.js';
import { mediaKind } from '../library.js';
import { safeImageUrl } from '../../core/sanitize.js';

const FAMILLES = ['all', 'image', 'video', 'audio', 'file'];
const ICONES = { image: 'image', video: 'video', audio: 'music', file: 'pages' };

/**
 * @param {object} options
 * @param {Function} options.t
 * @param {Function} options.lister renvoie les médias (asynchrone)
 * @param {Function} options.ajouterUrl reçoit une adresse
 * @param {Function} options.televerser reçoit (fichier, onProgress)
 * @param {Function} options.supprimer reçoit un média
 * @param {Function} options.peutTeleverser
 */
export function creerMedias({ t, lister, ajouterUrl, televerser, supprimer, peutTeleverser }) {
  return async function dessiner(page) {
    let medias = [];
    let famille = 'all';
    let recherche = '';

    const champ = h('input', {
      class: 'saisie', type: 'search', placeholder: t('searchMedia'),
      oninput: (e) => { recherche = e.target.value.trim().toLowerCase(); peindre(); },
    });

    const fichier = h('input', {
      type: 'file', multiple: true, accept: 'image/*,video/*,audio/*,.pdf', hidden: true,
      onchange: (e) => envoyer(Array.from(e.target.files || [])),
    });

    page.appendChild(teteEcran(t('boMedias'), t('boMediasAide'),
      h('button', { class: 'b', type: 'button', onclick: demanderUrl },
        icon('link', 14), t('boMediaParAdresse')),
      peutTeleverser()
        ? h('button', { class: 'b b--fort', type: 'button', onclick: () => fichier.click() },
          icon('upload', 14), t('boMediaTeleverser'))
        : null,
    ));
    page.appendChild(fichier);

    if (!peutTeleverser()) {
      page.appendChild(h('div', { class: 'note', style: { marginBottom: '18px' } },
        icon('warn', 14), h('span', {}, t('boMediasSansStockage'))));
    }

    const barre = h('div', { class: 'barre-medias' },
      h('div', { class: 'onglets onglets--plein' }, FAMILLES.map((f) => h('button', {
        class: 'onglet', type: 'button', 'aria-selected': f === famille ? 'true' : 'false',
        onclick: (e) => {
          famille = f;
          for (const b of barre.querySelectorAll('.onglet')) b.setAttribute('aria-selected', 'false');
          e.currentTarget.setAttribute('aria-selected', 'true');
          peindre();
        },
      }, t('boFamille_' + f)))),
      champ,
    );
    page.appendChild(barre);

    // La zone de dépôt couvre toute la grille : viser une petite cible avec
    // un fichier au bout du curseur est un exercice inutilement précis.
    const zone = h('div', { class: 'carte', style: { minHeight: '240px' } });
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('depot'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('depot'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('depot');
      if (peutTeleverser()) envoyer(Array.from(e.dataTransfer?.files || []));
    });
    page.appendChild(zone);

    async function recharger() {
      clear(zone);
      zone.appendChild(h('div', { class: 'charge' }, t('boChargement')));
      try { medias = await lister(); } catch { medias = []; }
      peindre();
    }

    function peindre() {
      clear(zone);
      const vus = medias.filter((m) => {
        if (famille !== 'all' && mediaKind(m) !== famille) return false;
        if (!recherche) return true;
        return (m.name || m.url || '').toLowerCase().includes(recherche);
      });

      zone.appendChild(h('div', { class: 'carte__tete' },
        icon('image', 14), h('span', {}, t('boNbMedias', vus.length))));

      if (!vus.length) {
        zone.appendChild(listeVide('image',
          medias.length ? t('boMediasAucunResultat') : t('boMediasVideLong')));
        return;
      }
      zone.appendChild(h('div', { class: 'grille-medias' }, vus.map(vignette)));
    }

    function vignette(m) {
      const genre = mediaKind(m);
      const src = genre === 'image' ? safeImageUrl(m.url) : '';

      return h('figure', { class: 'media' },
        h('div', { class: 'media__vue' },
          src ? h('img', { src, alt: m.name || '', loading: 'lazy' })
            : h('span', { class: 'media__genre' }, icon(ICONES[genre] || 'pages', 22)),
        ),
        h('figcaption', { class: 'media__pied' },
          h('span', { class: 'media__nom', title: m.name || m.url }, m.name || m.url),
          h('span', { class: 'media__actions' },
            h('button', {
              class: 'b b--sm b--icone', type: 'button', title: t('copyUrl'),
              onclick: (e) => copier(m.url, e.currentTarget),
            }, icon('copy', 12)),
            h('button', {
              class: 'b b--sm b--icone b--danger', type: 'button', title: t('remove'),
              onclick: () => retirer(m),
            }, icon('trash', 12)),
          ),
        ),
      );
    }

    async function copier(url, bouton) {
      try {
        await navigator.clipboard.writeText(new URL(url, location.href).href);
        bouton.replaceChildren(icon('check', 12));
        setTimeout(() => bouton.replaceChildren(icon('copy', 12)), 1400);
      } catch { /* presse-papiers refusé : le titre porte déjà l'adresse */ }
    }

    async function retirer(m) {
      // Retirer un média ne retire pas les images DÉJÀ posées dans les
      // pages : elles continueraient de s'afficher avec une adresse morte.
      // On le dit avant, pas après.
      if (!confirm(t('boMediaSupprimerSur'))) return;
      await supprimer(m);
      await recharger();
    }

    async function envoyer(fichiers) {
      if (!fichiers.length) return;
      const avance = h('div', { class: 'note', style: { marginBottom: '14px' } },
        icon('upload', 14), h('span', {}, t('boMediaEnvoi', fichiers.length)));
      barre.after(avance);
      for (const f of fichiers) {
        try { await televerser(f); }
        catch (err) { avance.replaceChildren(icon('warn', 14), h('span', {}, String(err?.message || err))); return; }
      }
      avance.remove();
      await recharger();
    }

    function demanderUrl() {
      const adresse = prompt(t('addByUrl'), 'https://');
      if (!adresse) return;
      Promise.resolve(ajouterUrl(adresse.trim())).then(recharger);
    }

    await recharger();
  };
}
