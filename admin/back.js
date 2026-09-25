/**
 * Back-office — la porte d'entrée du module.
 *
 * L'éditeur en direct (`?admin`) est excellent pour modifier ce qu'on voit.
 * Il est démuni pour tout le reste : on ne clique pas sur un article qui
 * n'existe pas encore, on ne retrouve pas une photo mise en ligne il y a
 * trois mois, on ne voit pas ses dix pages d'un coup d'œil. Ça, c'est de
 * l'inventaire, et l'inventaire veut une liste.
 *
 * Le partage est donc net, et il est visible jusque dans les boutons :
 *
 *   le back-office  →  le CHÂSSIS : créer les pages, poser les sections,
 *                      choisir les images. Le faux texte des modèles reste
 *                      en place, et il est signalé comme tel.
 *   l'éditeur direct → les VRAIS MOTS : titres, sous-titres, paragraphes,
 *                      écrits là où on les voit.
 *
 * Cette page est autonome : elle ne charge aucun site, donc `PageModel` et
 * l'overlay n'ont rien à faire ici. Elle parle à Firestore et à
 * l'hébergement, rien de plus, et elle n'ouvre un aperçu que lorsqu'un
 * écran en a besoin.
 * @module back
 */
import { resolveConfig, PREVIEW_PARAM, PAGE_COMMUNE } from './core/config.js';
import { loadFrame } from './core/frame.js';
import { PageModel } from './core/model.js';
import { setDebug, debug } from './core/log.js';
import { pageKeyFromLocation } from './core/dom.js';
import { typesDe } from './core/types.js';
import { createHost } from './data/host.js';
import { canEdit } from './data/schema.js';
import { h, icon, clear } from './ui/el.js';
import { createTranslator } from './ui/i18n.js';
import { CSS_BACK } from './ui/back/styles-back.js';
import { creerChassis } from './ui/back/shell-back.js';
import { creerTableau } from './ui/back/tableau.js';
import { creerPagesListe } from './ui/back/pages-liste.js';
import { creerStructure } from './ui/back/structure.js';

/** Où le site répond, vu depuis la page du back-office. */
const RACINE = new URL('.', new URL('..', import.meta.url)).href;

async function creerBackend(config) {
  if (config.backend === 'demo') {
    const { MemoryBackend } = await import('./data/memory.js');
    return new MemoryBackend(config).init();
  }
  const { FirebaseBackend } = await import('./data/firebase.js');
  return new FirebaseBackend(config).init();
}

async function demarrer() {
  const config = resolveConfig(window.ADMIN_CONFIG || {});
  setDebug(config.debug);
  const t = createTranslator(config.lang);

  document.head.appendChild(h('style', {}, CSS_BACK));
  document.title = t('boMarque') + ' — ' + (config.siteId || '');

  const hote = h('div', {});
  document.body.appendChild(hote);

  const backend = await creerBackend(config);
  const hebergement = createHost(config, backend);
  const types = typesDe(config);

  // --- Connexion ------------------------------------------------------
  // Tant que personne n'est identifié, il n'y a rien à montrer : pas de
  // squelette d'interface derrière une fenêtre, qui laisserait croire que
  // le site est accessible sans mot de passe.
  backend.onUser((user, access) => {
    clear(hote);
    if (!user) { ecranConnexion(); return; }
    if (!canEdit(access?.role)) { ecranRefus(user); return; }
    ouvrirBackOffice(user);
  });

  function ecranConnexion() {
    const email = h('input', { class: 'saisie', type: 'email', autocomplete: 'username', required: true });
    const motDePasse = h('input', { class: 'saisie', type: 'password', autocomplete: 'current-password', required: true });
    const erreur = h('p', { class: 'erreur' });
    const valider = h('button', { class: 'b b--fort', type: 'submit', style: { width: '100%' } }, t('signInAction'));

    const formulaire = h('form', {
      onsubmit: async (e) => {
        e.preventDefault();
        erreur.textContent = '';
        valider.disabled = true;
        try { await backend.signIn(email.value.trim(), motDePasse.value); }
        catch (err) { erreur.textContent = messageErreur(err); }
        finally { valider.disabled = false; }
      },
    },
      h('label', { class: 'champ' }, h('span', { class: 'champ__nom' }, t('email')), email),
      h('label', { class: 'champ' }, h('span', { class: 'champ__nom' }, t('password')), motDePasse),
      erreur,
      valider,
    );

    hote.appendChild(h('div', { class: 'entree' },
      h('div', { class: 'entree__boite' },
        h('div', { class: 'entree__marque' }, icon('sliders', 18), h('span', {}, t('boMarque'))),
        h('p', {}, t('boConnexionAide')),
        formulaire,
      ),
    ));
    email.focus();
  }

  function messageErreur(err) {
    const code = String(err?.code || err?.message || '');
    if (/wrong-password|invalid-credential|invalid-login/.test(code)) return t('signInWrong');
    if (/too-many-requests/.test(code)) return t('signInTooMany');
    return String(err?.message || err);
  }

  function ecranRefus(user) {
    hote.appendChild(h('div', { class: 'entree' },
      h('div', { class: 'entree__boite' },
        h('div', { class: 'entree__marque' }, icon('warn', 18), h('span', {}, t('noAccess'))),
        h('p', {}, t('boRefusAide', user.email || '')),
        h('button', { class: 'b', type: 'button', style: { width: '100%' }, onclick: () => backend.signOut() },
          t('signOut')),
      ),
    ));
  }

  // --- Le back-office lui-même ----------------------------------------
  function ouvrirBackOffice() {
    const chassis = creerChassis({
      hote, t, nomSite: config.siteId,
      onQuitter: () => backend.signOut(),
      onVoirSite: () => window.open(RACINE, '_blank', 'noopener'),
    });

    chassis.ajouterEcran('tableau', {
      libelle: t('boTableau'), icone: 'grid',
      dessiner: creerTableau({
        t, etat: inventaire, aller: chassis.aller,
        onGuide: () => ouvrirEnDirect('', { guide: true }),
      }),
    });

    chassis.ajouterGroupe(t('boGroupeContenu'));
    chassis.ajouterEcran('pages', {
      libelle: t('boPages'), icone: 'pages', badge: true,
      dessiner: creerPagesListe({
        t,
        lister: listerPages,
        peutCreer: () => etatHote.ok,
        onCreer: () => { /* écran de création : prochaine étape */ },
        onStructure: (p) => chassis.aller('structure', p),
        onEcrire: (p) => ouvrirEnDirect(p.chemin),
        onSupprimer: () => { /* confirmation : prochaine étape */ },
      }),
    });

    // La structure ne figure pas au menu : on y arrive depuis une page, et
    // une entrée de menu qui demanderait « laquelle ? » ne servirait à rien.
    chassis.ajouterEcran('structure', {
      libelle: t('boStructure'), icone: 'layers', cache: true,
      dessiner: creerStructure({
        t,
        ouvrirPage: chargerPage,
        enregistrer: (pageId, instantane) => backend.saveDraft(pageId, instantane),
        onEcrire: (p) => ouvrirEnDirect(p.chemin),
        onRetour: () => chassis.aller('pages'),
      }),
    });

    chassis.aller('tableau');
    verifierHebergement(chassis);
  }

  /** Ce que l'hébergement sait faire. Demandé une fois, au démarrage. */
  const etatHote = { ok: false, verifie: false };
  async function verifierHebergement(chassis) {
    try {
      const reponse = await hebergement.check();
      etatHote.ok = !!(reponse?.bake ?? reponse?.writable);
    } catch { etatHote.ok = false; }
    etatHote.verifie = true;
    debug('hébergement inscriptible :', etatHote.ok);
    if (chassis.courant === 'pages') chassis.rafraichir();
  }

  /**
   * Ouvre le site dans un onglet, sur l'éditeur en direct. C'est là qu'on
   * écrit : le back-office ne propose aucun champ de texte long, et ce
   * n'est pas un oubli.
   */
  function ouvrirEnDirect(chemin, options = {}) {
    const url = new URL(chemin || 'index.html', RACINE);
    url.searchParams.set(config.editor.trigger, '');
    if (options.guide) url.searchParams.set('guide', '');
    if (options.structure) url.searchParams.set('structure', '');
    window.open(url.href, '_blank', 'noopener');
  }

  /**
   * Charge une page hors écran et en construit le modèle — le même que
   * celui de l'éditeur, appliqué dans le même ordre : le document commun
   * d'abord (en-tête, pied), la page ensuite.
   *
   * L'iframe doit être RENDUE pour que la mise en page soit calculée : on
   * la pousse hors du cadre plutôt que de la masquer.
   */
  async function chargerPage(cible) {
    const url = new URL(cible.chemin || 'index.html', RACINE).href;
    const pageId = cleDePage(cible.chemin);
    const style = 'position:fixed;left:-20000px;top:0;width:1280px;height:900px;'
      + 'opacity:0;pointer-events:none;border:0;';

    let cadre = null;
    let modele = null;

    /**
     * (Re)construit le modèle à partir du FICHIER, puis réapplique tout.
     *
     * Une opération de structure — ajouter, déplacer, masquer — est
     * enregistrée dans l'instantané, pas jouée sur le DOM. Le seul moyen
     * honnête de voir le résultat est de repartir de la source et de tout
     * réappliquer, exactement comme le fait l'éditeur. Empiler les
     * transformations sur un document déjà modifié finirait de travers.
     */
    async function construire(instantane = null) {
      const precedent = cadre;
      const { doc, frame } = await loadFrame({ url, param: PREVIEW_PARAM, style });
      precedent?.remove();
      cadre = frame;
      if (!doc) throw new Error(t('boStructureIllisible'));

      modele = new PageModel({ ...config.scan, doc }).refresh();

      const commun = await lireCommun();
      if (commun) modele.applySnapshot(commun);
      const propre = instantane
        || await backend.loadDraft(pageId).catch(() => null)
        || await backend.loadPublished(pageId).catch(() => null);
      if (propre) modele.applySnapshot(propre, { cumuler: true });
      return modele;
    }

    await construire();

    return {
      pageId,
      get model() { return modele; },
      // On repart de l'instantané qu'on vient d'écrire, sans le relire :
      // la base a pu ne pas avoir fini d'enregistrer.
      recharger: (instantane) => construire(instantane),
      fermer: () => cadre?.remove(),
    };
  }

  // --- Inventaire -----------------------------------------------------
  /**
   * Les pages connues du site. Elles vivent dans le document commun, celui
   * qui porte aussi l'en-tête et le pied : c'est la seule liste que le
   * module tienne, et elle survit au rechargement de n'importe quelle page.
   */
  async function listerPages() {
    const commun = await lireCommun();
    const connues = commun?.reglages?.pages || [];
    const liste = connues.map((p) => ({
      nom: p.label || p.path, chemin: p.path,
      accueil: /^\/?index\.html?$/.test(p.path),
      sections: null, publie: false, brouillon: false,
    }));
    if (!liste.some((p) => p.accueil)) {
      liste.unshift({ nom: t('boPageAccueil'), chemin: 'index.html', accueil: true,
        sections: null, publie: false, brouillon: false });
    }
    // L'état de chaque page se lit dans sa propre fiche. On les demande en
    // parallèle : à dix pages, les faire l'une après l'autre se voit.
    await Promise.all(liste.map(async (p) => {
      const id = cleDePage(p.chemin);
      const [publie, brouillon] = await Promise.all([
        backend.loadPublished(id).catch(() => null),
        backend.loadDraft(id).catch(() => null),
      ]);
      p.publie = !!publie;
      p.brouillon = !!brouillon;
      p.sections = compterSections(brouillon || publie);
    }));
    return liste;
  }

  async function lireCommun() {
    const [brouillon, publie] = await Promise.all([
      backend.loadDraft(PAGE_COMMUNE).catch(() => null),
      backend.loadPublished(PAGE_COMMUNE).catch(() => null),
    ]);
    return brouillon || publie;
  }

  /** L'inventaire du tableau de bord, en une passe. */
  async function inventaire() {
    const [pages, medias, commun] = await Promise.all([
      listerPages().catch(() => []),
      backend.listMedia?.(200).catch(() => []) ?? [],
      lireCommun(),
    ]);
    const produits = commun?.reglages?.produits?.length || 0;
    const brouillons = pages.filter((p) => p.brouillon)
      .map((p) => ({ nom: p.nom, chemin: p.chemin }));
    return {
      pages: pages.length,
      contenus: 0,
      types: types.map((x) => ({ id: x.id, nom: x.nom })),
      medias: medias.length,
      produits,
      brouillons,
      exemples: 0,
      vierge: !pages.some((p) => p.publie || p.brouillon),
    };
  }

  function compterSections(instantane) {
    if (!instantane) return null;
    const ajouts = instantane.sections?.add?.length || 0;
    const masquees = instantane.sections?.hide?.length || 0;
    return ajouts || masquees ? ajouts : null;
  }

  /**
   * La clé d'une page dans la base. On passe par la même fonction que
   * l'éditeur et le runtime : deux calculs de clé qui divergent, et le
   * back-office lit des brouillons qui n'existent pas.
   */
  function cleDePage(chemin) {
    return pageKeyFromLocation(new URL(chemin || 'index.html', RACINE).pathname);
  }
}

demarrer().catch((err) => {
  console.error('[admin] back-office :', err);
  document.body.appendChild(h('div', { class: 'charge' }, String(err?.message || err)));
});
