/**
 * Coque de l'éditeur : panneau de réglages à gauche, aperçu du site à droite.
 *
 * Le site est affiché dans une iframe, comme le font Elementor et les
 * éditeurs du même genre. C'est ce qui permet à l'interface et au site de ne
 * jamais se marcher dessus : plus d'en-tête collant à décaler, plus de CSS du
 * site qui déteint sur les panneaux, et l'aperçu par format d'écran devient
 * une simple largeur d'iframe.
 * @module ui/shell
 */
import { h, icon, clear } from './el.js';
import { loadFrame } from '../core/frame.js';
import { PREVIEW_PARAM } from '../core/config.js';

export const DEVICES = {
  desktop: { largeur: '100%', label: 'Ordinateur', icone: 'desktop' },
  tablet: { largeur: '820px', label: 'Tablette', icone: 'tablet' },
  mobile: { largeur: '390px', label: 'Mobile', icone: 'mobile' },
};

export function createShell({ root, t, config, onDevice }) {
  const vues = new Map();
  let vueActive = null;
  let iframe = null;

  // --- Panneau -------------------------------------------------------
  const onglets = h('div', { class: 'tabs', role: 'tablist' });
  const conteneurVues = h('div', { class: 'views' });
  const etat = h('div', { class: 'panel__state' });
  const actions = h('div', { class: 'panel__actions' });
  const avantEtat = h('div', {});

  // Poignée de la feuille : visible seulement en mode compact (téléphone),
  // où le panneau glisse par-dessus l'aperçu au lieu de lui voler la moitié
  // de l'écran.
  const poignee = h('button', {
    class: 'panel__grab', type: 'button', onclick: () => setSheet(!ouverte),
  },
    h('span', { class: 'panel__grab-label' }, t('panelTitle')),
    h('span', { class: 'panel__grab-hint' }, config.siteId),
    icon('down', 15),
  );

  const panel = h('div', { class: 'panel', 'data-sheet': 'closed' },
    poignee,
    h('div', { class: 'panel__head' },
      h('span', { class: 'panel__dot' }),
      h('span', { class: 'panel__name' }, t('panelTitle')),
      h('span', { class: 'panel__site' }, config.siteId),
    ),
    onglets,
    conteneurVues,
    h('div', { class: 'panel__foot' }, avantEtat, etat, actions),
  );

  // --- Barre de prévisualisation --------------------------------------
  // En prévisualisation, le panneau disparaît et le site occupe tout l'écran.
  // Il faut alors une marque non ambiguë de l'état où l'on se trouve, et le
  // moyen d'en sortir : sans cela on croit que l'éditeur s'est fermé.
  const previsuNote = h('span', { class: 'previs__note', hidden: true });
  const previsuBar = h('div', { class: 'previs', 'data-admin-ui': '' },
    h('span', { class: 'previs__pastille' }),
    h('span', { class: 'previs__titre' }, t('previewMode')),
    previsuNote,
    h('span', { style: { flex: '1' } }),
    // Deux libellés : sur un téléphone, la phrase complète mangerait le titre
    // de la barre, qui est précisément ce qui dit où l'on se trouve.
    h('button', {
      class: 'previs__btn', type: 'button', onclick: () => rappelsPrevisu.retour?.(),
    }, icon('pencil', 13),
      h('span', { class: 'previs__long' }, t('previewBack')),
      h('span', { class: 'previs__court' }, t('previewBackShort'))),
    h('button', {
      class: 'previs__btn previs__btn--fort', type: 'button',
      onclick: () => rappelsPrevisu.site?.(),
    }, icon('link', 13),
      h('span', { class: 'previs__long' }, t('previewLive')),
      h('span', { class: 'previs__court' }, t('previewLiveShort'))),
  );
  const rappelsPrevisu = {};

  // --- Scène ---------------------------------------------------------
  const nomPage = h('button', { class: 'stage__page', type: 'button', title: t('pages') },
    icon('pages', 13), h('span', {}, ''));
  const boutonsAppareil = h('div', { class: 'devices', role: 'group' });
  const outilsScene = h('div', { class: 'stage__bar' }, nomPage, boutonsAppareil);
  const couche = h('div', { class: 'layer' });
  const chargement = h('div', { class: 'loading' }, h('span', { class: 'spinner' }), t('loadingPreview'));
  chargement.style.display = 'none';
  const zoneFrame = h('div', { class: 'stage__frame', style: { position: 'relative' } }, couche, chargement);
  const stage = h('div', { class: 'stage' }, previsuBar, outilsScene, zoneFrame);

  const shell = h('div', { class: 'shell', 'data-previsu': 'off' }, panel, stage);
  root.appendChild(shell);

  // --- Formats d'écran ------------------------------------------------
  let appareil = 'desktop';
  let previsuAvant = null;
  for (const [cle, def] of Object.entries(DEVICES)) {
    boutonsAppareil.appendChild(h('button', {
      class: 'device', type: 'button', title: def.label,
      'aria-pressed': cle === appareil ? 'true' : 'false',
      onclick: () => setDevice(cle),
    }, icon(def.icone, 13)));
  }

  function setDevice(cle) {
    appareil = cle;
    for (const [index, bouton] of [...boutonsAppareil.children].entries()) {
      bouton.setAttribute('aria-pressed', Object.keys(DEVICES)[index] === cle ? 'true' : 'false');
    }
    if (iframe) iframe.style.width = DEVICES[cle].largeur;
    zoneFrame.classList.toggle('stage__frame--constrained', cle !== 'desktop');
    onDevice?.(cle);
  }

  // --- Feuille (mode compact) -----------------------------------------
  let ouverte = false;
  const compact = () => root.ownerDocument.defaultView
    .matchMedia('(max-width: 860px)').matches;

  /** Ouvre ou referme la feuille. Sans effet sur grand écran. */
  function setSheet(etatOuvert) {
    ouverte = etatOuvert;
    panel.setAttribute('data-sheet', ouverte ? 'open' : 'closed');
  }

  // Toucher l'aperçu referme la feuille : on veut revoir la page.
  outilsScene.addEventListener('click', (e) => {
    if (compact() && ouverte && e.target === outilsScene) setSheet(false);
  });

  // --- Onglets --------------------------------------------------------
  function addView(id, label, nomIcone) {
    const vue = h('div', { class: 'view', id: 'vue-' + id, role: 'tabpanel' });
    const onglet = h('button', {
      class: 'tab', type: 'button', role: 'tab', 'aria-selected': 'false',
      'aria-controls': 'vue-' + id,
      onclick: () => showView(id),
    }, icon(nomIcone, 13), label);
    onglets.appendChild(onglet);
    conteneurVues.appendChild(vue);
    vues.set(id, { vue, onglet });
    // Première vue : on l'active sans déplier la feuille — au démarrage, le
    // client doit voir son site, pas un panneau qui le recouvre.
    if (!vueActive) showView(id, { reveal: false });
    return vue;
  }

  function showView(id, { reveal = true } = {}) {
    vueActive = id;
    // Sur téléphone, demander une vue veut dire vouloir la voir.
    if (reveal && compact()) setSheet(true);
    for (const [cle, { vue, onglet }] of vues) {
      const actif = cle === id;
      vue.classList.toggle('view--on', actif);
      onglet.setAttribute('aria-selected', actif ? 'true' : 'false');
    }
  }

  // --- Aperçu ---------------------------------------------------------
  /**
   * Charge une page du site dans l'aperçu.
   * @returns {Promise<{doc:Document, frame:HTMLIFrameElement}>}
   */
  async function load(url) {
    chargement.style.display = '';
    if (iframe) iframe.remove();
    const resultat = await loadFrame({
      url,
      param: PREVIEW_PARAM,
      container: zoneFrame,
      style: `width:${DEVICES[appareil].largeur};height:100%;border:0;background:#fff;`,
      waitPaint: true,
    });
    iframe = resultat.frame;
    iframe.classList.add('viewport');
    zoneFrame.append(couche, chargement);
    nomPage.lastElementChild.textContent = pageLisible(resultat.doc);
    chargement.style.display = 'none';
    if (enPrevisu) ecouterEchap(true);
    return resultat;
  }

  function pageLisible(doc) {
    try {
      const titre = doc.title || '';
      const chemin = new URL(doc.location.href).pathname;
      return titre ? `${chemin} — ${titre}` : chemin;
    } catch {
      return '';
    }
  }

  /** Décalage de l'iframe dans la couche de surcouche. */
  function origine() {
    const cadre = zoneFrame.getBoundingClientRect();
    const vue = iframe ? iframe.getBoundingClientRect() : cadre;
    return { x: vue.left - cadre.left, y: vue.top - cadre.top };
  }

  /**
   * Entre ou sort de la prévisualisation : le panneau s'efface, la page
   * reprend toute la largeur, et la barre noire dit où l'on est.
   */
  /** Échap sort de la prévisualisation, où qu'on ait le curseur. */
  const surEchap = (event) => {
    if (event.key === 'Escape') rappelsPrevisu.retour?.();
  };

  /**
   * (Ré)installe l'écoute d'Échap. Le document de l'aperçu est remplacé à
   * chaque changement de page : sans ce rappel, suivre un lien en
   * prévisualisation ferait perdre le raccourci.
   */
  function ecouterEchap(actif) {
    const docs = [root.ownerDocument, iframe?.contentDocument].filter(Boolean);
    for (const doc of docs) {
      doc.removeEventListener('keydown', surEchap);
      if (actif) doc.addEventListener('keydown', surEchap);
    }
  }

  let enPrevisu = false;

  function setPreview(actif, rappels = {}) {
    Object.assign(rappelsPrevisu, rappels);
    enPrevisu = !!actif;
    shell.setAttribute('data-previsu', actif ? 'on' : 'off');
    ecouterEchap(enPrevisu);
    // Le site se regarde en entier : un cadre de téléphone n'a plus lieu
    // d'être, mais le format choisi est rendu à la sortie.
    if (actif) {
      if (appareil !== 'desktop') { previsuAvant = appareil; setDevice('desktop'); }
    } else if (previsuAvant) {
      setDevice(previsuAvant);
      previsuAvant = null;
    }
  }

  /** Signale, dans la barre, que ce qu'on voit n'est pas encore en ligne. */
  function setPreviewNote(texte) {
    previsuNote.textContent = texte || '';
    previsuNote.hidden = !texte;
  }

  return {
    panel, stage, layer: couche, views: conteneurVues,
    addView, showView, setPreview, setPreviewNote,
    load, setDevice, origine,
    get frame() { return iframe; },
    get device() { return appareil; },
    setState(noeuds) { clear(etat); etat.append(...noeuds); },
    setFootExtra(noeuds) { clear(avantEtat); avantEtat.append(...noeuds); },
    setActions(noeuds) { clear(actions); actions.append(...noeuds); },
    setSheet, isCompact: compact,
    onPageClick(fn) { nomPage.addEventListener('click', fn); },
    translate: t,
  };
}
