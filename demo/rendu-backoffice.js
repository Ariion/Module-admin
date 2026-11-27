/**
 * Relie le site public (demo/index.html) au backoffice : quand des données existent dans
 * backoffice:etat (même navigateur que l'admin — tout est en localStorage, il n'y a pas de
 * serveur central ici), le site se rend à partir de ces données plutôt que du contenu statique
 * écrit dans le HTML. Sans backoffice:etat (premier visiteur, autre navigateur), la page reste
 * exactement la démonstration statique d'origine, éditable au clic par moteur/edit.js.
 *
 * Doit s'exécuter AVANT moteur/edit.js : les éléments repris ici perdent leur attribut
 * data-edit (ils sont désormais pilotés par le backoffice, pas par un clic direct sur la page).
 */
(function () {
  'use strict';

  function el(tag, props, ...enfants) {
    const noeud = document.createElement(tag);
    if (props) {
      for (const k in props) {
        if (k === 'class') noeud.className = props[k];
        else if (k === 'html') noeud.innerHTML = props[k];
        else if (props[k] !== undefined && props[k] !== null) noeud.setAttribute(k, props[k]);
      }
    }
    enfants.flat().forEach((c) => {
      if (c == null) return;
      noeud.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(c) : c);
    });
    return noeud;
  }

  function piloteParBackoffice(el) { el.removeAttribute('data-edit'); }

  let state;
  try {
    const brut = localStorage.getItem('backoffice:etat');
    if (!brut) return;
    state = JSON.parse(brut);
  } catch (e) { return; }
  if (!state || typeof state !== 'object') return;

  // -------------------------------------------------- en-tête (nom du site + menu)
  if (state.apparence && state.apparence.header) {
    const header = state.apparence.header;
    const marque = document.getElementById('marque-site');
    if (marque && header.logoTexte) {
      marque.textContent = header.logoTexte;
      piloteParBackoffice(marque);
    }
    const nav = document.getElementById('nav-principale');
    if (nav && Array.isArray(header.menu) && header.menu.length) {
      nav.innerHTML = '';
      header.menu.forEach((lien) => nav.appendChild(el('a', { href: lien.url || '#' }, lien.label || '')));
    }
  }

  // -------------------------------------------------- page affichée (contenu géré dans Pages)
  // Sans vrai serveur, impossible de router par chemin : la page demandée se passe en
  // ?page=<slug>, comme le génère le lien "↗ Aperçu" du backoffice. Sans paramètre, page d'accueil.
  const slugDemande = new URLSearchParams(location.search).get('page');
  const pageAffichee = Array.isArray(state.pages) && state.pages.find((p) =>
    !p.supprime && p.statut === 'publie' && p.slug === (slugDemande || '/'));
  if (pageAffichee && pageAffichee.contenu && pageAffichee.contenu.trim()) {
    const section = document.getElementById('a-propos-backoffice');
    const titre = document.getElementById('a-propos-titre');
    const contenu = document.getElementById('a-propos-contenu');
    if (section && titre && contenu) {
      titre.textContent = pageAffichee.titre || '';
      contenu.innerHTML = pageAffichee.contenu;
      if (pageAffichee.type === 'vente' && pageAffichee.ctaTexte) {
        contenu.appendChild(el('p', {}, el('a', { class: 'bouton', href: pageAffichee.ctaLien || '#' }, pageAffichee.ctaTexte)));
      }
      section.style.display = 'block';
    }
    if (pageAffichee.metaTitre) document.title = pageAffichee.metaTitre;
    if (pageAffichee.metaDescription) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) { meta = el('meta', { name: 'description' }); document.head.appendChild(meta); }
      meta.setAttribute('content', pageAffichee.metaDescription);
    }
  }

  // -------------------------------------------------- produits
  const grilleProduits = document.getElementById('grille-produits');
  if (grilleProduits && Array.isArray(state.produits)) {
    const produitsActifs = state.produits.filter((p) => !p.supprime && p.statut === 'actif');
    if (produitsActifs.length) {
      grilleProduits.innerHTML = '';
      produitsActifs.forEach((p) => {
        const corps = [];
        if (p.nouveaute) corps.push(el('span', { class: 'carte__badge' }, 'Nouveau'));
        corps.push(el('h3', {}, p.nom));
        corps.push(el('p', {}, p.descriptionCourte || ''));
        const prix = Number(p.prix) || 0;
        const prixBarre = Number(p.prixBarre) || 0;
        const ligneDePrix = el('p', { class: 'carte__prix' });
        if (prixBarre > prix) ligneDePrix.appendChild(el('span', { class: 'carte__prix-barre' }, prixBarre.toFixed(2) + ' €'));
        ligneDePrix.appendChild(document.createTextNode(prix.toFixed(2) + ' €'));
        corps.push(ligneDePrix);
        grilleProduits.appendChild(el('article', { class: 'carte' },
          el('img', { src: (p.images && p.images[0]) || '', alt: p.nom }),
          el('div', { class: 'carte__corps' }, ...corps)));
      });
    }
  }

  // -------------------------------------------------- articles
  const grilleArticles = document.getElementById('grille-articles');
  if (grilleArticles && Array.isArray(state.articles)) {
    const articlesPublies = state.articles
      .filter((a) => !a.supprime && a.statut === 'publie')
      .sort((a, b) => (b.dateModif || 0) - (a.dateModif || 0))
      .slice(0, 3);
    if (articlesPublies.length) {
      grilleArticles.innerHTML = '';
      articlesPublies.forEach((a) => {
        grilleArticles.appendChild(el('article', { class: 'carte' },
          el('img', { src: a.imageUrl || '', alt: a.titre }),
          el('div', { class: 'carte__corps' }, el('h3', {}, a.titre), el('p', {}, a.extrait || ''))));
      });
    }
  }

  // -------------------------------------------------- pied de page
  if (state.apparence && state.apparence.footer) {
    const footer = state.apparence.footer;
    const colonnesConteneur = document.getElementById('pied-colonnes');
    if (colonnesConteneur && Array.isArray(footer.colonnes)) {
      footer.colonnes.forEach((colonne) => {
        if (!colonne.liens || !colonne.liens.length) return;
        colonnesConteneur.appendChild(el('div', { class: 'pied-colonne' },
          el('h4', {}, colonne.titre || ''),
          ...colonne.liens.map((lien) => el('a', { href: lien.url || '#' }, lien.label || ''))));
      });
    }
    const reseauxConteneur = document.getElementById('pied-reseaux');
    if (reseauxConteneur && Array.isArray(footer.reseaux)) {
      footer.reseaux.forEach((r) => {
        if (!r.plateforme) return;
        reseauxConteneur.appendChild(el('a', { href: r.url || '#', target: '_blank', rel: 'noopener' }, r.plateforme));
      });
    }
    const copyright = document.getElementById('pied-copyright');
    if (copyright && footer.copyright) {
      copyright.textContent = footer.copyright;
      piloteParBackoffice(copyright);
    }
  }
})();
