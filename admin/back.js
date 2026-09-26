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
import { typesDe, cheminDepuisTitre } from './core/types.js';
import { poserCarte, attendrePage } from './core/contenus.js';
import { rubriquesActives, rubrique, appliquerGenres, genreChoisi } from './core/rubriques.js';
import { cibleDEnvoi } from './core/formulaire.js';
import { createHost } from './data/host.js';
import { canEdit } from './data/schema.js';
import { h, icon, clear } from './ui/el.js';
import { safeUrl } from './core/sanitize.js';
import { createTranslator } from './ui/i18n.js';
import { CSS_BACK } from './ui/back/styles-back.js';
import { creerChassis } from './ui/back/shell-back.js';
import { creerTableau } from './ui/back/tableau.js';
import { creerPagesListe } from './ui/back/pages-liste.js';
import { creerStructure } from './ui/back/structure.js';
import { creerContenus } from './ui/back/contenus.js';
import { creerReglagesBack, carteGenre } from './ui/back/reglages-back.js';
import { creerMedias } from './ui/back/medias.js';
import { creerMessages } from './ui/back/messages.js';
import { creerProduits } from './ui/back/produits.js';
import { creerApparence, documentDemo } from './ui/back/apparence.js';
import { pageDemo } from './core/demo.js';
import { renderWidget } from './core/widgets.js';
import { createMedia } from './media/index.js';

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
  const media = createMedia(config, backend);
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
  /** Les écrans que porte chaque rubrique. Une rubrique éteinte n'existe pas. */
  function ecransDe(chassis) {
    return {
      pages: () => creerPagesListe({
        t,
        lister: listerPages,
        peutCreer: () => etatHote.ok,
        onCreer: creerPage,
        onStructure: (p) => chassis.aller('structure', p),
        onEcrire: (p) => ouvrirEnDirect(p.chemin),
        onSupprimer: supprimerPage,
      }),
      contenus: () => creerContenus({
        t,
        types: () => types,
        lister: listerContenus,
        peutCreer: () => etatHote.ok,
        onCreer: creerContenu,
        onEcrire: (c) => ouvrirEnDirect(c.chemin),
        onGalerie: (type) => ouvrirEnDirect(type.index),
      }),
      produits: () => creerProduits({
        t,
        lire: async () => {
          const reglages = (await lireCommun())?.reglages || {};
          return { produits: reglages.produits || [], boutique: reglages.boutique || {} };
        },
        enregistrer: ({ produits, boutique }) => enregistrerReglages({ produits, boutique }),
        choisirMedia: choisirMedia,
      }),
      medias: () => creerMedias({
        t,
        lister: listerMedias,
        peutTeleverser: () => !!media.primary?.canUpload,
        televerser: async (f) => {
          const item = await media.primary.upload(f);
          try { await backend.addMedia(item); } catch { /* index indisponible */ }
          return item;
        },
        ajouterUrl: async (url) => {
          const propre = safeUrl(url);
          if (!propre) return;
          await backend.addMedia({ url: propre, name: propre.split('/').pop() || propre });
        },
        supprimer: async (m) => {
          if (m.id) await backend.deleteMedia(m.id).catch(() => {});
          if (media.primary?.remove) await media.primary.remove(m).catch(() => {});
        },
      }),
      messages: () => creerMessages({
        t, lang: config.lang,
        lister: () => backend.listMessages?.(200) ?? [],
        onLu: (m, lu) => backend.markMessage(m.id, lu),
        onSupprimer: (m) => backend.deleteMessage(m.id),
      }),
      apparence: () => creerApparence({
        t,
        lire: async () => (await lireCommun())?.reglages?.theme || null,
        appliquer: (theme) => enregistrerReglages({ theme }),
        rendreDemo: (metierId, reglage) =>
          documentDemo(renderWidget, pageDemo(metierId, reglage), reglage),
      }),
      reglages: () => creerReglagesBack({
        t,
        reglages: async () => (await lireCommun())?.reglages || null,
        aDesTypes: () => types.length > 0,
        enregistrer: enregistrerRubriques,
      }),
    };
  }

  async function ouvrirBackOffice() {
    const chassis = creerChassis({
      hote, t, nomSite: config.siteId,
      onQuitter: () => backend.signOut(),
      onVoirSite: () => window.open(RACINE, '_blank', 'noopener'),
    });

    // Le menu ne montre que ce que le site sait faire. Le reste n'est pas
    // grisé : il n'est pas là, et il apparaîtra le jour où on le cochera.
    const fabriques = ecransDe(chassis);

    async function poserMenu() {
      chassis.viderMenu();
      chassis.ajouterEcran('tableau', {
        libelle: t('boTableau'), icone: 'grid',
        dessiner: creerTableau({
          t, etat: inventaire, aller: chassis.aller,
          onGuide: () => ouvrirEnDirect('', { guide: true }),
          genre: () => carteGenre({ t, onChoisir: choisirGenres }),
        }),
      });
      let groupe = null;
      for (const id of rubriquesActives((await lireCommun())?.reglages)) {
        const r = rubrique(id);
        const fabrique = fabriques[id];
        if (!r || !fabrique) continue;
        if (r.groupe !== groupe) { chassis.ajouterGroupe(t('boGroupe_' + r.groupe)); groupe = r.groupe; }
        chassis.ajouterEcran(r.ecran, { libelle: t('rub_' + r.id), icone: r.icone, dessiner: fabrique() });
      }
    }
    chassisCourant = chassis;
    refaireMenu = poserMenu;
    await poserMenu();

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

    // La même prise que `window.Admin` côté site : de quoi inspecter, et de
    // quoi poser un jeton à la main quand on éprouve le module. Seulement
    // en mode bavard — rien à offrir à un visiteur de passage.
    if (config.debug) {
      window.AdminBack = {
        config, backend, hebergement, chassis, types,
        verifier: () => verifierHebergement(chassis),
      };
    }
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

      modele = new PageModel({ ...config.scan, doc, formulaire: cibleDEnvoi(config) }).refresh();

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

  /**
   * Retient le genre et les rubriques dans le document commun, puis remonte
   * le back-office : le menu est construit au démarrage, et une rubrique
   * qu'on vient d'allumer doit apparaître sans avoir à recharger la page.
   */
  /**
   * Écrit des réglages dans le document commun, en gardant le reste.
   *
   * Le commun porte l'en-tête, le pied, les pages connues, l'ambiance, le
   * catalogue et les rubriques : écraser le document au lieu d'y fondre le
   * changement ferait disparaître tout ce qu'on n'a pas nommé.
   */
  async function enregistrerReglages(patch) {
    const commun = await lireCommun();
    await backend.saveDraft(PAGE_COMMUNE, {
      ...(commun || { v: 1, content: {}, collections: {} }),
      reglages: { ...(commun?.reglages || {}), ...patch },
    });
  }

  async function enregistrerRubriques({ genres, rubriques }) {
    await enregistrerReglages({ genres, rubriques });
    await refaireMenu?.();
  }

  /**
   * Choisir une image depuis la médiathèque, sans quitter l'écran courant.
   * Une fiche produit à moitié remplie ne doit pas se perdre parce qu'on a
   * voulu poser une photo.
   */
  function choisirMedia() {
    return new Promise((resoudre) => {
      const voile = h('div', {
        class: 'voile', onclick: (e) => { if (e.target === voile) { voile.remove(); resoudre(null); } },
      });
      const corps = h('div', { class: 'carte__corps', style: { maxHeight: '58vh', overflow: 'auto' } });
      voile.appendChild(h('div', { class: 'voile__boite' },
        h('div', { class: 'carte__tete' }, icon('image', 14), h('span', {}, t('chooseMedia')),
          h('button', {
            class: 'b b--sm b--nu b--icone', type: 'button',
            onclick: () => { voile.remove(); resoudre(null); },
          }, icon('close', 13))),
        corps,
      ));
      document.body.appendChild(voile);

      listerMedias().then((medias) => {
        const images = medias.filter((m) => /\.(jpe?g|png|gif|webp|avif|svg)(\?|$)/i.test(m.url || ''));
        clear(corps);
        if (!images.length) {
          corps.appendChild(h('p', { class: 'table__meta' }, t('boMediasVideLong')));
          return;
        }
        corps.appendChild(h('div', { class: 'grille-medias', style: { padding: '0' } },
          images.map((m) => h('button', {
            class: 'media', type: 'button', style: { cursor: 'pointer', textAlign: 'left' },
            onclick: () => { voile.remove(); resoudre(m.url); },
          },
            h('div', { class: 'media__vue' }, h('img', { src: m.url, alt: '', loading: 'lazy' })),
            h('div', { class: 'media__pied' },
              h('span', { class: 'media__nom' }, m.name || m.url)),
          ))));
      });
    });
  }

  /** Posée par le back-office une fois ouvert : refait le menu sans plus. */
  let refaireMenu = null;

  /** Le choix fait depuis le tableau de bord, au premier passage. */
  async function choisirGenres(genres) {
    const commun = await lireCommun();
    await enregistrerRubriques({
      genres,
      rubriques: appliquerGenres(commun?.reglages, genres),
    });
    // Le tableau de bord vient de perdre sa raison d'être : on le redessine
    // pour qu'il montre l'inventaire au lieu de reposer la question.
    chassisCourant?.aller('tableau');
  }

  let chassisCourant = null;

  // --- Pages ----------------------------------------------------------
  /**
   * Crée une page, éventuellement en copiant une page existante.
   *
   * La page est retenue dans les réglages tout de suite : elle apparaît
   * dans la liste sans attendre que l'hébergement ait fini de remonter le
   * site, et on peut y revenir même si la mise en ligne tarde.
   */
  async function creerPage({ nom, chemin, depuis }) {
    if (depuis) await hebergement.ensureSource(depuis);
    await hebergement.createPage(chemin, depuis || undefined);

    const commun = await lireCommun();
    const retenues = [...(commun?.reglages?.pages || [])];
    if (!retenues.some((p) => p.path === chemin)) {
      retenues.push({ path: chemin, label: nom.slice(0, 40) });
      await enregistrerReglages({ pages: retenues });
    }
    await attendrePage(new URL(chemin, RACINE).href, 60000);
    chassisCourant?.aller('pages', chemin);
  }

  /**
   * Supprime une page : le fichier, puis son souvenir.
   *
   * Le brouillon et la version publiée restent en base. C'est voulu : ils
   * ne coûtent rien, et ils permettent de retrouver ce qu'il y avait
   * dessus si la suppression était une erreur.
   */
  async function supprimerPage(p) {
    await hebergement.deletePage(p.chemin);
    const commun = await lireCommun();
    const retenues = (commun?.reglages?.pages || []).filter((x) => x.path !== p.chemin);
    await enregistrerReglages({ pages: retenues });
    chassisCourant?.aller('pages');
  }

  // --- Contenus -------------------------------------------------------
  /**
   * Les contenus d'un type : les cartes de sa galerie.
   *
   * Ils n'existent dans aucune table — ce sont des blocs répétés dans le
   * HTML de la page d'index. On ouvre donc cette page comme pour la
   * structure, et on lit la collection déclarée.
   */
  async function listerContenus(type) {
    const session = await chargerPage({ chemin: type.index });
    try {
      const collection = trouverGalerie(session.model, type);
      if (!collection) return [];
      return collection.items.map((item) => {
        const lien = item.querySelector('a[href]');
        const titre = item.querySelector('h1, h2, h3, h4')?.textContent?.trim()
          || lien?.textContent?.trim() || '';
        const href = lien?.getAttribute('href') || '';
        return { titre, chemin: href.replace(/^\.?\//, '').split(/[?#]/)[0] };
      }).filter((c) => c.chemin);
    } finally {
      session.fermer();
    }
  }

  /** La collection déclarée par le type, dans un modèle déjà chargé. */
  function trouverGalerie(model, type) {
    return model.collections.find((c) => {
      if (!type.collection) return false;
      try { return c.container.matches(type.collection) || !!c.container.closest(type.collection); }
      catch { return false; }
    }) || null;
  }

  /**
   * Crée un contenu : le fichier, la carte dans la galerie, et l'entrée
   * dans la liste des pages. Exactement ce que fait l'éditeur en direct —
   * et par le même code, pour que le résultat soit le même des deux côtés.
   */
  async function creerContenu(type, sousType, titre) {
    const chemin = cheminDepuisTitre(titre, sousType);
    await hebergement.ensureSource(sousType.modele);
    await hebergement.createPage(chemin, sousType.modele);

    const session = await chargerPage({ chemin: type.index });
    try {
      if (poserCarte(session.model, { type, sousType, titre, chemin, resume: t('contenuResume') })) {
        await backend.saveDraft(session.pageId, session.model.toSnapshot({ portee: 'page' }));
      }
      // La page est retenue tout de suite : elle apparaît dans la liste sans
      // attendre la reconstruction du site, et on peut y revenir.
      const commun = await lireCommun();
      const retenues = [...(commun?.reglages?.pages || [])];
      if (!retenues.some((p) => p.path === chemin)) {
        retenues.push({ path: chemin, label: titre.slice(0, 40) });
        session.model.setReglage('pages', retenues);
        await backend.saveDraft(PAGE_COMMUNE, session.model.toSnapshot({ portee: 'commun' }));
      }
    } finally {
      session.fermer();
    }

    await attendrePage(new URL(chemin, RACINE).href, 60000);
    ouvrirEnDirect(chemin);
  }

  /**
   * Les médias, fusionnés sur l'adresse.
   *
   * L'index de la base ignore ce qui a été déposé en FTP ; le dossier
   * hébergé ignore les adresses ajoutées à la main. Il faut les deux, et
   * l'adresse est la seule clé que les deux partagent.
   */
  async function listerMedias() {
    const [index, dossier] = await Promise.all([
      backend.listMedia?.(300).catch(() => []) ?? [],
      media.primary?.list ? media.primary.list().catch(() => []) : [],
    ]);
    const parUrl = new Map();
    for (const item of [...index, ...dossier]) {
      if (!item?.url) continue;
      const cle = String(item.url);
      parUrl.set(cle, { ...(parUrl.get(cle) || {}), ...item });
    }
    return [...parUrl.values()];
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
      listerMedias().catch(() => []),
      lireCommun(),
    ]);
    const produits = commun?.reglages?.produits?.length || 0;
    const brouillons = pages.filter((p) => p.brouillon)
      .map((p) => ({ nom: p.nom, chemin: p.chemin }));
    const parType = await Promise.all(types.map((type) =>
      listerContenus(type).then((l) => l.length).catch(() => 0)));

    return {
      pages: pages.length,
      contenus: parType.reduce((a, b) => a + b, 0),
      types: types.map((x) => ({ id: x.id, nom: x.nom })),
      medias: medias.length,
      produits,
      brouillons,
      exemples: 0,
      vierge: !pages.some((p) => p.publie || p.brouillon),
      genreChoisi: genreChoisi(commun?.reglages),
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
