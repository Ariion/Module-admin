(function () {
  'use strict';

  // -------------------------------------------------- utilitaires DOM (même idiome que constructeur/app.js)

  function el(tag, props, ...enfants) {
    const noeud = document.createElement(tag);
    if (props) {
      for (const k in props) {
        if (k === 'class') noeud.className = props[k];
        else if (k === 'html') noeud.innerHTML = props[k];
        else if (k.startsWith('on') && typeof props[k] === 'function') noeud.addEventListener(k.slice(2), props[k]);
        else if (k === 'style' && typeof props[k] === 'object') Object.assign(noeud.style, props[k]);
        else if (props[k] !== undefined && props[k] !== null) noeud.setAttribute(k, props[k]);
      }
    }
    enfants.flat().forEach((c) => {
      if (c == null) return;
      noeud.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(c) : c);
    });
    return noeud;
  }

  function uid() { return 'id' + Math.random().toString(36).slice(2, 10); }

  function champTexte(label, valeur, onChange, type) {
    const input = el('input', { type: type || 'text', value: valeur ?? '' });
    input.addEventListener('input', () => onChange(input.value));
    return el('div', { class: 'champ' }, el('label', {}, label), input);
  }
  function champNombre(label, valeur, onChange) {
    const input = el('input', { type: 'number', value: valeur ?? 0 });
    input.addEventListener('input', () => onChange(Number(input.value)));
    return el('div', { class: 'champ' }, el('label', {}, label), input);
  }
  function champTextarea(label, valeur, onChange, longue) {
    const input = el('textarea', { class: longue ? 'textarea-longue' : '' }, valeur ?? '');
    input.addEventListener('input', () => onChange(input.value));
    return el('div', { class: 'champ' }, el('label', {}, label), input);
  }
  function champSelect(label, options, valeur, onChange) {
    const select = el('select', {});
    options.forEach((o) => {
      const lib = typeof o === 'object' ? o.label : o;
      const val = typeof o === 'object' ? o.valeur : o;
      select.appendChild(el('option', { value: val, selected: val === valeur ? 'selected' : undefined }, lib));
    });
    select.addEventListener('change', () => onChange(select.value));
    return el('div', { class: 'champ' }, el('label', {}, label), select);
  }
  function champToggle(label, valeur, onChange) {
    const sw = el('div', { class: 'champ-toggle__switch' + (valeur ? ' actif' : '') });
    sw.addEventListener('click', () => onChange(!valeur));
    return el('div', { class: 'champ-toggle' }, el('span', {}, label), sw);
  }
  function champAide(texte) { return el('div', { class: 'champ-aide-texte' }, texte); }

  function deplacer(tableau, index, delta) {
    const cible = index + delta;
    if (cible < 0 || cible >= tableau.length) return;
    const [item] = tableau.splice(index, 1);
    tableau.splice(cible, 0, item);
  }

  // -------------------------------------------------- persistance (même esprit que constructeur/app.js)

  const PERSISTANCE_CLE = 'backoffice:etat';
  let sauvegardeEnAttente = null;
  let sauvegardeMinuteur = null;

  function chargerEtatSauvegarde() {
    try {
      const brut = localStorage.getItem(PERSISTANCE_CLE);
      return brut ? JSON.parse(brut) : null;
    } catch (e) { return null; }
  }

  function marquerModifie() {
    const indicateur = document.getElementById('etat-sauvegarde');
    indicateur.textContent = 'Enregistrement…';
    indicateur.className = 'etat-sauvegarde en-attente';
    clearTimeout(sauvegardeEnAttente);
    sauvegardeEnAttente = setTimeout(flusherSauvegarde, 350);
  }

  function flusherSauvegarde() {
    clearTimeout(sauvegardeEnAttente);
    try { localStorage.setItem(PERSISTANCE_CLE, JSON.stringify(state)); } catch (e) { /* stockage indisponible : tant pis */ }
    const indicateur = document.getElementById('etat-sauvegarde');
    if (indicateur) { indicateur.textContent = 'Enregistré'; indicateur.className = 'etat-sauvegarde ok'; }
  }

  function toast(msg) {
    const existant = document.getElementById('toast');
    if (existant) existant.remove();
    const t = el('div', { id: 'toast', class: 'toast' }, msg);
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('visible'));
    setTimeout(() => { t.classList.remove('visible'); setTimeout(() => t.remove(), 300); }, 1600);
  }

  // -------------------------------------------------- données de départ

  function etatInitial() {
    const idPageAccueil = uid();
    const idPageVente = uid();
    const idCatArticleNews = uid();
    const idCatArticleConseils = uid();
    const idCatProduitBois = uid();
    const idCatProduitCuir = uid();

    return {
      reglages: {
        nomSite: 'Le Fournil de Claire',
        description: 'Boulangerie artisanale, pain au levain et viennoiseries maison.',
      },
      pages: [
        {
          id: idPageAccueil, titre: 'Accueil', slug: '/', type: 'standard', statut: 'publie',
          contenu: 'Bienvenue sur notre site. Cette page est gérée depuis le back-office.',
          metaTitre: 'Le Fournil de Claire — Boulangerie artisanale', metaDescription: 'Pain au levain, viennoiseries et pâtisseries faites main, tous les jours.',
          ctaTexte: '', ctaLien: '', dateModif: Date.now() - 86400000,
        },
        {
          id: idPageVente, titre: 'Offre de lancement', slug: '/offre-lancement', type: 'vente', statut: 'publie',
          contenu: 'Profitez de -20% sur votre première commande en ligne.',
          metaTitre: 'Offre de lancement — Le Fournil de Claire', metaDescription: "Profitez d'une remise de bienvenue sur votre première commande.",
          ctaTexte: 'J’en profite', ctaLien: '/boutique', dateModif: Date.now() - 3600000,
        },
      ],
      categoriesArticles: [
        { id: idCatArticleNews, nom: 'Actualités' },
        { id: idCatArticleConseils, nom: 'Conseils' },
      ],
      articles: [
        {
          id: uid(), titre: 'Nouvelle fournée de pains spéciaux', categorieId: idCatArticleNews, auteur: 'Claire',
          contenu: 'Dès ce samedi, retrouvez nos nouveaux pains aux graines et au levain naturel.',
          extrait: 'Trois nouvelles recettes arrivent en boutique ce week-end.',
          imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80',
          statut: 'publie', datePublication: '2026-11-20', dateModif: Date.now() - 172800000,
        },
        {
          id: uid(), titre: 'Comment bien conserver son pain', categorieId: idCatArticleConseils, auteur: 'Claire',
          contenu: 'Quelques astuces simples pour garder votre pain frais plus longtemps.',
          extrait: 'Nos conseils pour profiter de votre pain plusieurs jours.',
          imageUrl: 'https://images.unsplash.com/photo-1549931319-a545319b2e58?w=600&q=80',
          statut: 'brouillon', datePublication: '', dateModif: Date.now() - 7200000,
        },
      ],
      categoriesProduits: [
        { id: idCatProduitBois, nom: 'Pains' },
        { id: idCatProduitCuir, nom: 'Viennoiseries' },
      ],
      produits: [
        {
          id: uid(), nom: 'Pain de campagne', sku: 'PAIN-CAMP-500', prix: 4.2, prixBarre: '',
          descriptionCourte: 'Levain naturel, 24h de fermentation.', descriptionLongue: 'Notre pain de campagne est pétri à la main et cuit au feu de bois, pour une croûte croustillante et une mie alvéolée.',
          images: ['https://images.unsplash.com/photo-1549931319-a545319b2e58?w=400&q=80'],
          stock: 24, statut: 'actif', categorieId: idCatProduitBois,
          declinaisons: [{ id: uid(), nom: 'Poids', valeurs: '500g, 1kg' }],
          dateModif: Date.now() - 50000,
        },
        {
          id: uid(), nom: 'Croissant pur beurre', sku: 'VIEN-CROIS', prix: 1.3, prixBarre: '',
          descriptionCourte: 'Croustillant et feuilleté, pur beurre AOP.', descriptionLongue: 'Préparé chaque matin selon une recette traditionnelle, notre croissant pur beurre est feuilleté à la main.',
          images: ['https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400&q=80'],
          stock: 40, statut: 'actif', categorieId: idCatProduitCuir,
          declinaisons: [],
          dateModif: Date.now() - 20000,
        },
      ],
      apparence: {
        header: {
          logoTexte: 'Le Fournil de Claire', logoUrl: '/',
          menu: [
            { id: uid(), label: 'Accueil', url: '/' },
            { id: uid(), label: 'Nos pains', url: '/#pains' },
            { id: uid(), label: 'Contact', url: '/#contact' },
          ],
        },
        footer: {
          colonnes: [
            { id: uid(), titre: 'La boutique', liens: [{ id: uid(), label: 'Nos pains', url: '/#pains' }, { id: uid(), label: 'Nos viennoiseries', url: '/#viennoiseries' }] },
            { id: uid(), titre: 'Informations', liens: [{ id: uid(), label: 'Contact', url: '/#contact' }, { id: uid(), label: 'Horaires', url: '/#horaires' }] },
          ],
          copyright: '© 2026 Le Fournil de Claire — fait à la main, tous les jours.',
          reseaux: [{ id: uid(), plateforme: 'Instagram', url: 'https://instagram.com' }, { id: uid(), plateforme: 'Facebook', url: 'https://facebook.com' }],
        },
      },
    };
  }

  const state = Object.assign({ vue: 'tableau-de-bord', edition: null }, etatInitial());
  const sauvegarde = chargerEtatSauvegarde();
  if (sauvegarde) Object.assign(state, sauvegarde, { vue: 'tableau-de-bord', edition: null });

  // -------------------------------------------------- navigation / rendu général

  function allerA(vue, edition) {
    state.vue = vue;
    state.edition = edition || null;
    rafraichirContenu();
    document.querySelectorAll('.nav-laterale__item').forEach((b) => b.classList.toggle('actif', b.dataset.vue === vue));
    document.getElementById('contenu').scrollTop = 0;
    document.querySelector('.admin').classList.remove('nav-ouverte');
    mettreAJourLienVoirSite();
  }

  function mettreAJourLienVoirSite() {
    const lien = document.getElementById('lien-voir-site');
    if (state.vue === 'pages-edition' && state.edition) {
      const page = state.pages.find((p) => p.id === state.edition.id);
      lien.href = page ? '/demo/index.html' + (page.slug && page.slug !== '/' ? page.slug : '') : '/demo/index.html';
    } else {
      lien.href = '/demo/index.html';
    }
  }

  function rafraichirContenu() {
    const conteneur = document.getElementById('contenu');
    conteneur.innerHTML = '';
    const rendus = {
      'tableau-de-bord': rendreTableauDeBord,
      pages: rendreListePages,
      'pages-edition': rendreEditionPage,
      articles: rendreListeArticles,
      'articles-edition': rendreEditionArticle,
      produits: rendreListeProduits,
      'produits-edition': rendreEditionProduit,
      apparence: rendreApparence,
      reglages: rendreReglages,
    };
    (rendus[state.vue] || rendreTableauDeBord)(conteneur);
    document.getElementById('nom-site-barre').textContent = state.reglages.nomSite;
  }

  function formaterDate(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // -------------------------------------------------- tableau de bord

  function rendreTableauDeBord(c) {
    c.appendChild(el('div', { class: 'entete-vue' }, el('h1', {}, 'Tableau de bord')));
    c.appendChild(el('div', { class: 'grille-stats' },
      carteStat(state.pages.length, 'Pages'),
      carteStat(state.articles.length, 'Articles'),
      carteStat(state.produits.length, 'Produits'),
      carteStat(state.produits.reduce((s, p) => s + (p.stock || 0), 0), 'Unités en stock')));

    const recents = [
      ...state.pages.map((p) => ({ titre: p.titre, type: 'Page', date: p.dateModif, vue: 'pages-edition', id: p.id })),
      ...state.articles.map((a) => ({ titre: a.titre, type: 'Article', date: a.dateModif, vue: 'articles-edition', id: a.id })),
      ...state.produits.map((p) => ({ titre: p.nom, type: 'Produit', date: p.dateModif, vue: 'produits-edition', id: p.id })),
    ].sort((a, b) => (b.date || 0) - (a.date || 0)).slice(0, 6);

    const liste = el('ul', { class: 'liste-recents' });
    recents.forEach((r) => {
      liste.appendChild(el('li', {},
        el('a', { href: '#', onclick: (e) => { e.preventDefault(); allerA(r.vue, { id: r.id }); } }, r.titre),
        el('span', { class: 'type' }, r.type + ' · ' + formaterDate(r.date))));
    });
    c.appendChild(el('div', { class: 'carte' }, el('h2', {}, 'Derniers éléments modifiés'), liste));
  }
  function carteStat(valeur, libelle) {
    return el('div', { class: 'carte-stat' }, el('div', { class: 'carte-stat__valeur' }, String(valeur)), el('div', { class: 'carte-stat__libelle' }, libelle));
  }

  // -------------------------------------------------- liste générique (pages/articles/produits)

  function rendreBarreOutils(c, { recherche, onRecherche, filtres }) {
    const barre = el('div', { class: 'barre-outils' });
    const champRecherche = el('input', { type: 'search', placeholder: 'Rechercher…', value: recherche || '' });
    champRecherche.addEventListener('input', () => onRecherche(champRecherche.value));
    barre.appendChild(champRecherche);
    if (filtres) filtres.forEach((f) => barre.appendChild(f));
    barre.appendChild(el('div', { class: 'barre-outils__spacer' }));
    c.appendChild(barre);
  }

  // -------------------------------------------------- PAGES

  let rechercheStock = { pages: '', articles: '', produits: '' };

  function rendreListePages(c) {
    c.appendChild(el('div', { class: 'entete-vue' },
      el('h1', {}, 'Pages'),
      el('button', { class: 'bouton-principal', onclick: () => creerPage() }, '+ Ajouter une page')));

    rendreBarreOutils(c, { recherche: rechercheStock.pages, onRecherche: (v) => { rechercheStock.pages = v; rafraichirContenu(); } });

    const q = rechercheStock.pages.toLowerCase();
    const items = state.pages.filter((p) => !q || p.titre.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q));

    const tableCarte = el('div', { class: 'table-carte' });
    if (!items.length) { tableCarte.appendChild(el('div', { class: 'vide-liste' }, 'Aucune page pour le moment.')); c.appendChild(tableCarte); return; }

    const table = el('table', { class: 'table-liste' },
      el('thead', {}, el('tr', {}, el('th', {}, 'Titre'), el('th', {}, 'Type'), el('th', {}, 'URL'), el('th', {}, 'Statut'), el('th', {}, 'Modifiée'), el('th', {}, 'Actions'))));
    const corps = el('tbody', {});
    items.forEach((p) => {
      corps.appendChild(el('tr', {},
        el('td', {}, el('a', { class: 'titre-lien', href: '#', onclick: (e) => { e.preventDefault(); allerA('pages-edition', { id: p.id }); } }, p.titre)),
        el('td', {}, p.type === 'vente' ? el('span', { class: 'badge type-vente' }, 'Page de vente') : 'Standard'),
        el('td', {}, p.slug),
        el('td', {}, el('span', { class: 'badge ' + p.statut }, p.statut === 'publie' ? 'Publiée' : 'Brouillon')),
        el('td', {}, formaterDate(p.dateModif)),
        el('td', {}, el('div', { class: 'actions-ligne' },
          el('a', { href: '#', onclick: (e) => { e.preventDefault(); allerA('pages-edition', { id: p.id }); } }, 'Modifier'),
          el('button', { class: 'suppr', onclick: () => supprimerPage(p.id) }, 'Supprimer')))));
    });
    table.appendChild(corps);
    tableCarte.appendChild(table);
    c.appendChild(tableCarte);
  }

  function creerPage() {
    const page = { id: uid(), titre: 'Nouvelle page', slug: '/nouvelle-page', type: 'standard', statut: 'brouillon', contenu: '', metaTitre: '', metaDescription: '', ctaTexte: '', ctaLien: '', dateModif: Date.now() };
    state.pages.push(page);
    marquerModifie();
    allerA('pages-edition', { id: page.id });
  }
  function supprimerPage(id) {
    if (!window.confirm('Supprimer cette page ?')) return;
    state.pages = state.pages.filter((p) => p.id !== id);
    marquerModifie();
    rafraichirContenu();
  }

  let ongletEditionActif = 'contenu';

  function rendreEditionPage(c) {
    const page = state.pages.find((p) => p.id === state.edition.id);
    if (!page) { allerA('pages'); return; }
    const maj = () => { page.dateModif = Date.now(); marquerModifie(); };

    c.appendChild(el('div', { class: 'fil-ariane' }, el('a', { href: '#', onclick: (e) => { e.preventDefault(); allerA('pages'); } }, 'Pages'), ' / ' + page.titre));
    c.appendChild(el('div', { class: 'entete-vue' },
      el('h1', {}, page.titre || 'Sans titre'),
      el('div', {}, el('a', { class: 'bouton-secondaire', href: page.slug, target: '_blank', rel: 'noopener', style: { marginRight: '8px' } }, '↗ Aperçu'),
        el('button', { class: 'bouton-principal', onclick: () => { flusherSauvegarde(); toast('✓ Page enregistrée'); } }, 'Enregistrer'))));

    const mise = el('div', { class: 'mise-en-page-edition' });
    const onglets = ['contenu', 'seo'];
    const libellesOnglets = { contenu: 'Contenu', seo: 'Référencement (SEO)' };
    const ongletsDiv = el('div', { class: 'onglets-form' });
    onglets.forEach((o) => ongletsDiv.appendChild(el('button', { class: ongletEditionActif === o ? 'actif' : '', onclick: () => { ongletEditionActif = o; rafraichirContenu(); } }, libellesOnglets[o])));

    const panneau = el('div', { class: 'panneau-form' });
    if (ongletEditionActif === 'contenu') {
      panneau.appendChild(champTexte('Titre', page.titre, (v) => { page.titre = v; maj(); }));
      panneau.appendChild(champTexte('URL (slug)', page.slug, (v) => { page.slug = v; maj(); }));
      panneau.appendChild(champTextarea('Contenu', page.contenu, (v) => { page.contenu = v; maj(); }, true));
      if (page.type === 'vente') {
        panneau.appendChild(el('div', { class: 'champ-inline' },
          champTexte("Texte du bouton d'appel à l'action", page.ctaTexte, (v) => { page.ctaTexte = v; maj(); }),
          champTexte("Lien de l'appel à l'action", page.ctaLien, (v) => { page.ctaLien = v; maj(); })));
      }
    } else {
      panneau.appendChild(champTexte('Méta-titre', page.metaTitre, (v) => { page.metaTitre = v; maj(); }));
      panneau.appendChild(champTextarea('Méta-description', page.metaDescription, (v) => { page.metaDescription = v; maj(); }));
      panneau.appendChild(champAide('Affichés dans les résultats des moteurs de recherche.'));
    }
    mise.appendChild(el('div', {}, ongletsDiv, panneau));

    const lateral = el('div', {});
    const widgetPublication = el('div', { class: 'widget-lateral' },
      el('h3', {}, 'Publication'),
      champSelect('Statut', [{ valeur: 'brouillon', label: 'Brouillon' }, { valeur: 'publie', label: 'Publiée' }], page.statut, (v) => { page.statut = v; maj(); rafraichirContenu(); }),
      champSelect('Type de page', [{ valeur: 'standard', label: 'Standard' }, { valeur: 'vente', label: 'Page de vente' }], page.type, (v) => { page.type = v; maj(); rafraichirContenu(); }));
    lateral.appendChild(widgetPublication);
    mise.appendChild(lateral);
    c.appendChild(mise);
  }

  // -------------------------------------------------- ARTICLES

  function rendreListeArticles(c) {
    c.appendChild(el('div', { class: 'entete-vue' },
      el('h1', {}, 'Articles'),
      el('button', { class: 'bouton-principal', onclick: () => creerArticle() }, '+ Ajouter un article')));

    const filtreCategorie = el('select', {},
      el('option', { value: '' }, 'Toutes les catégories'),
      ...state.categoriesArticles.map((cat) => el('option', { value: cat.id }, cat.nom)));
    filtreCategorie.addEventListener('change', () => { filtreCategorieArticle = filtreCategorie.value; rafraichirContenu(); });
    filtreCategorie.value = filtreCategorieArticle || '';

    rendreBarreOutils(c, { recherche: rechercheStock.articles, onRecherche: (v) => { rechercheStock.articles = v; rafraichirContenu(); }, filtres: [filtreCategorie] });

    const q = rechercheStock.articles.toLowerCase();
    const items = state.articles.filter((a) => (!q || a.titre.toLowerCase().includes(q)) && (!filtreCategorieArticle || a.categorieId === filtreCategorieArticle));

    const tableCarte = el('div', { class: 'table-carte' });
    if (!items.length) { tableCarte.appendChild(el('div', { class: 'vide-liste' }, 'Aucun article pour le moment.')); c.appendChild(tableCarte); return; }
    const table = el('table', { class: 'table-liste' },
      el('thead', {}, el('tr', {}, el('th', {}, 'Titre'), el('th', {}, 'Catégorie'), el('th', {}, 'Auteur'), el('th', {}, 'Statut'), el('th', {}, 'Modifié'), el('th', {}, 'Actions'))));
    const corps = el('tbody', {});
    items.forEach((a) => {
      const cat = state.categoriesArticles.find((cc) => cc.id === a.categorieId);
      corps.appendChild(el('tr', {},
        el('td', {}, el('a', { class: 'titre-lien', href: '#', onclick: (e) => { e.preventDefault(); allerA('articles-edition', { id: a.id }); } }, a.titre)),
        el('td', {}, cat ? cat.nom : '—'),
        el('td', {}, a.auteur || '—'),
        el('td', {}, el('span', { class: 'badge ' + a.statut }, a.statut === 'publie' ? 'Publié' : 'Brouillon')),
        el('td', {}, formaterDate(a.dateModif)),
        el('td', {}, el('div', { class: 'actions-ligne' },
          el('a', { href: '#', onclick: (e) => { e.preventDefault(); allerA('articles-edition', { id: a.id }); } }, 'Modifier'),
          el('button', { class: 'suppr', onclick: () => supprimerArticle(a.id) }, 'Supprimer')))));
    });
    table.appendChild(corps);
    tableCarte.appendChild(table);
    c.appendChild(tableCarte);
  }
  let filtreCategorieArticle = '';

  function creerArticle() {
    const article = { id: uid(), titre: 'Nouvel article', categorieId: state.categoriesArticles[0] ? state.categoriesArticles[0].id : null, auteur: '', contenu: '', extrait: '', imageUrl: '', statut: 'brouillon', datePublication: '', dateModif: Date.now() };
    state.articles.push(article);
    marquerModifie();
    allerA('articles-edition', { id: article.id });
  }
  function supprimerArticle(id) {
    if (!window.confirm('Supprimer cet article ?')) return;
    state.articles = state.articles.filter((a) => a.id !== id);
    marquerModifie();
    rafraichirContenu();
  }

  function rendreEditionArticle(c) {
    const article = state.articles.find((a) => a.id === state.edition.id);
    if (!article) { allerA('articles'); return; }
    const maj = () => { article.dateModif = Date.now(); marquerModifie(); };

    c.appendChild(el('div', { class: 'fil-ariane' }, el('a', { href: '#', onclick: (e) => { e.preventDefault(); allerA('articles'); } }, 'Articles'), ' / ' + article.titre));
    c.appendChild(el('div', { class: 'entete-vue' },
      el('h1', {}, article.titre || 'Sans titre'),
      el('button', { class: 'bouton-principal', onclick: () => { flusherSauvegarde(); toast('✓ Article enregistré'); } }, 'Enregistrer')));

    const mise = el('div', { class: 'mise-en-page-edition' });
    const panneau = el('div', { class: 'panneau-form' },
      champTexte('Titre', article.titre, (v) => { article.titre = v; maj(); }),
      champTexte('Résumé / extrait', article.extrait, (v) => { article.extrait = v; maj(); }),
      champTextarea('Contenu', article.contenu, (v) => { article.contenu = v; maj(); }, true),
      champTexte("Adresse de l'image à la une", article.imageUrl, (v) => { article.imageUrl = v; maj(); }));
    mise.appendChild(el('div', {}, el('div', { class: 'onglets-form' }, el('button', { class: 'actif' }, 'Contenu')), panneau));

    const lateral = el('div', {});
    lateral.appendChild(el('div', { class: 'widget-lateral' },
      el('h3', {}, 'Publication'),
      champSelect('Statut', [{ valeur: 'brouillon', label: 'Brouillon' }, { valeur: 'publie', label: 'Publié' }], article.statut, (v) => { article.statut = v; maj(); rafraichirContenu(); }),
      champTexte('Date de publication', article.datePublication, (v) => { article.datePublication = v; maj(); }, 'date'),
      champTexte('Auteur', article.auteur, (v) => { article.auteur = v; maj(); })));

    const widgetCat = el('div', { class: 'widget-lateral' }, el('h3', {}, 'Catégorie'));
    widgetCat.appendChild(champSelect('', state.categoriesArticles.map((cat) => ({ valeur: cat.id, label: cat.nom })), article.categorieId, (v) => { article.categorieId = v; maj(); }));
    widgetCat.appendChild(gestionCategoriesWidget(state.categoriesArticles, (nom) => {
      const cat = { id: uid(), nom };
      state.categoriesArticles.push(cat);
      article.categorieId = cat.id;
      maj();
      rafraichirContenu();
    }));
    lateral.appendChild(widgetCat);
    mise.appendChild(lateral);
    c.appendChild(mise);
  }

  function gestionCategoriesWidget(liste, onAjouter) {
    const conteneur = el('div', {});
    const champ = el('input', { type: 'text', placeholder: 'Nouvelle catégorie…' });
    const bouton = el('button', { class: 'bouton-secondaire' }, 'Ajouter');
    const ajouter = () => { if (champ.value.trim()) { onAjouter(champ.value.trim()); champ.value = ''; } };
    bouton.addEventListener('click', ajouter);
    champ.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ajouter(); } });
    conteneur.appendChild(el('div', { class: 'ajout-categorie', style: { marginTop: '10px' } }, champ, bouton));
    return conteneur;
  }

  // -------------------------------------------------- PRODUITS

  function rendreListeProduits(c) {
    c.appendChild(el('div', { class: 'entete-vue' },
      el('h1', {}, 'Produits'),
      el('button', { class: 'bouton-principal', onclick: () => creerProduit() }, '+ Ajouter un produit')));

    rendreBarreOutils(c, { recherche: rechercheStock.produits, onRecherche: (v) => { rechercheStock.produits = v; rafraichirContenu(); } });

    const q = rechercheStock.produits.toLowerCase();
    const items = state.produits.filter((p) => !q || p.nom.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));

    const tableCarte = el('div', { class: 'table-carte' });
    if (!items.length) { tableCarte.appendChild(el('div', { class: 'vide-liste' }, 'Aucun produit pour le moment.')); c.appendChild(tableCarte); return; }
    const table = el('table', { class: 'table-liste' },
      el('thead', {}, el('tr', {}, el('th', {}, ''), el('th', {}, 'Nom'), el('th', {}, 'Référence'), el('th', {}, 'Prix'), el('th', {}, 'Stock'), el('th', {}, 'Statut'), el('th', {}, 'Actions'))));
    const corps = el('tbody', {});
    items.forEach((p) => {
      corps.appendChild(el('tr', {},
        el('td', {}, p.images[0] ? el('img', { class: 'vignette-produit', src: p.images[0], alt: '' }) : el('div', { class: 'vignette-produit' })),
        el('td', {}, el('a', { class: 'titre-lien', href: '#', onclick: (e) => { e.preventDefault(); allerA('produits-edition', { id: p.id }); } }, p.nom)),
        el('td', {}, p.sku),
        el('td', {}, Number(p.prix).toFixed(2) + ' €'),
        el('td', {}, String(p.stock)),
        el('td', {}, el('span', { class: 'badge ' + (p.statut === 'actif' ? 'publie' : 'inactif') }, p.statut === 'actif' ? 'Actif' : 'Inactif')),
        el('td', {}, el('div', { class: 'actions-ligne' },
          el('a', { href: '#', onclick: (e) => { e.preventDefault(); allerA('produits-edition', { id: p.id }); } }, 'Modifier'),
          el('button', { class: 'suppr', onclick: () => supprimerProduit(p.id) }, 'Supprimer')))));
    });
    table.appendChild(corps);
    tableCarte.appendChild(table);
    c.appendChild(tableCarte);
  }

  function creerProduit() {
    const produit = { id: uid(), nom: 'Nouveau produit', sku: '', prix: 0, prixBarre: '', descriptionCourte: '', descriptionLongue: '', images: [], stock: 0, statut: 'inactif', categorieId: state.categoriesProduits[0] ? state.categoriesProduits[0].id : null, declinaisons: [], dateModif: Date.now() };
    state.produits.push(produit);
    marquerModifie();
    allerA('produits-edition', { id: produit.id });
  }
  function supprimerProduit(id) {
    if (!window.confirm('Supprimer ce produit ?')) return;
    state.produits = state.produits.filter((p) => p.id !== id);
    marquerModifie();
    rafraichirContenu();
  }

  function rendreEditionProduit(c) {
    const produit = state.produits.find((p) => p.id === state.edition.id);
    if (!produit) { allerA('produits'); return; }
    const maj = () => { produit.dateModif = Date.now(); marquerModifie(); };

    c.appendChild(el('div', { class: 'fil-ariane' }, el('a', { href: '#', onclick: (e) => { e.preventDefault(); allerA('produits'); } }, 'Produits'), ' / ' + produit.nom));
    c.appendChild(el('div', { class: 'entete-vue' },
      el('h1', {}, produit.nom || 'Sans titre'),
      el('button', { class: 'bouton-principal', onclick: () => { flusherSauvegarde(); toast('✓ Produit enregistré'); } }, 'Enregistrer')));

    const mise = el('div', { class: 'mise-en-page-edition' });
    const panneau = el('div', { class: 'panneau-form' });
    panneau.appendChild(champTexte('Nom du produit', produit.nom, (v) => { produit.nom = v; maj(); rafraichirContenu(); }));
    panneau.appendChild(el('div', { class: 'champ-inline' },
      champTexte('Référence (SKU)', produit.sku, (v) => { produit.sku = v; maj(); }),
      champNombre('Stock', produit.stock, (v) => { produit.stock = v; maj(); })));
    panneau.appendChild(el('div', { class: 'champ-inline' },
      champNombre('Prix (€)', produit.prix, (v) => { produit.prix = v; maj(); }),
      champNombre('Prix barré (€, optionnel)', produit.prixBarre, (v) => { produit.prixBarre = v; maj(); })));
    panneau.appendChild(champTextarea('Description courte', produit.descriptionCourte, (v) => { produit.descriptionCourte = v; maj(); }));
    panneau.appendChild(champTextarea('Description longue', produit.descriptionLongue, (v) => { produit.descriptionLongue = v; maj(); }, true));

    panneau.appendChild(el('div', { class: 'champ' }, el('label', {}, 'Images'), rendreBlocImagesProduit(produit, maj)));
    panneau.appendChild(el('div', { class: 'champ' }, el('label', {}, 'Déclinaisons'), rendreBlocDeclinaisons(produit, maj)));

    mise.appendChild(el('div', {}, el('div', { class: 'onglets-form' }, el('button', { class: 'actif' }, 'Fiche produit')), panneau));

    const lateral = el('div', {});
    lateral.appendChild(el('div', { class: 'widget-lateral' },
      el('h3', {}, 'Publication'),
      champSelect('Statut', [{ valeur: 'actif', label: 'Actif' }, { valeur: 'inactif', label: 'Inactif' }], produit.statut, (v) => { produit.statut = v; maj(); rafraichirContenu(); })));
    const widgetCat = el('div', { class: 'widget-lateral' }, el('h3', {}, 'Catégorie'));
    widgetCat.appendChild(champSelect('', state.categoriesProduits.map((cat) => ({ valeur: cat.id, label: cat.nom })), produit.categorieId, (v) => { produit.categorieId = v; maj(); }));
    widgetCat.appendChild(gestionCategoriesWidget(state.categoriesProduits, (nom) => {
      const cat = { id: uid(), nom };
      state.categoriesProduits.push(cat);
      produit.categorieId = cat.id;
      maj();
      rafraichirContenu();
    }));
    lateral.appendChild(widgetCat);
    mise.appendChild(lateral);
    c.appendChild(mise);
  }

  function rendreBlocImagesProduit(produit, maj) {
    const conteneur = el('div', {});
    const grille = el('div', { class: 'bloc-images-produit' });
    produit.images.forEach((src, i) => {
      grille.appendChild(el('div', { class: 'image-item' },
        el('img', { src, alt: '' }),
        el('button', { onclick: () => { produit.images.splice(i, 1); maj(); rafraichirContenu(); } }, '✕')));
    });
    conteneur.appendChild(grille);
    const champUrl = el('input', { type: 'url', placeholder: "Adresse de l'image (URL)" });
    const ajouter = () => { if (champUrl.value.trim()) { produit.images.push(champUrl.value.trim()); maj(); rafraichirContenu(); } };
    const bouton = el('button', { class: 'bouton-secondaire' }, 'Ajouter');
    bouton.addEventListener('click', ajouter);
    champUrl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ajouter(); } });
    conteneur.appendChild(el('div', { class: 'ajout-categorie' }, champUrl, bouton));
    return conteneur;
  }

  function rendreBlocDeclinaisons(produit, maj) {
    const conteneur = el('div', {});
    produit.declinaisons.forEach((d, i) => {
      const carte = el('div', { class: 'declinaison-carte' });
      const nomInput = el('input', { type: 'text', placeholder: "Nom de l'option (ex. Taille)", value: d.nom });
      nomInput.addEventListener('input', () => { d.nom = nomInput.value; maj(); });
      const retirer = el('button', { class: 'retirer' }, '✕');
      retirer.addEventListener('click', () => { produit.declinaisons.splice(i, 1); maj(); rafraichirContenu(); });
      carte.appendChild(el('div', { class: 'declinaison-carte__entete' }, nomInput, retirer));
      const valeursInput = el('input', { type: 'text', placeholder: 'Valeurs séparées par une virgule (ex. S, M, L)', value: d.valeurs });
      valeursInput.addEventListener('input', () => { d.valeurs = valeursInput.value; maj(); });
      carte.appendChild(el('div', { class: 'champ' }, valeursInput));
      conteneur.appendChild(carte);
    });
    const ajouter = el('button', { class: 'lien-ajouter' }, '+ Ajouter une déclinaison');
    ajouter.addEventListener('click', () => { produit.declinaisons.push({ id: uid(), nom: '', valeurs: '' }); maj(); rafraichirContenu(); });
    conteneur.appendChild(ajouter);
    return conteneur;
  }

  // -------------------------------------------------- APPARENCE (header / footer / menus)

  function rendreApparence(c) {
    c.appendChild(el('div', { class: 'entete-vue' }, el('h1', {}, 'Apparence'),
      el('button', { class: 'bouton-principal', onclick: () => { flusherSauvegarde(); toast('✓ Apparence enregistrée'); } }, 'Enregistrer')));

    const header = state.apparence.header;
    const footer = state.apparence.footer;
    const maj = () => marquerModifie();

    const carteHeader = el('div', { class: 'carte' }, el('h2', {}, 'En-tête du site'));
    carteHeader.appendChild(el('div', { class: 'champ-inline' },
      champTexte('Texte du logo', header.logoTexte, (v) => { header.logoTexte = v; maj(); }),
      champTexte('Lien du logo', header.logoUrl, (v) => { header.logoUrl = v; maj(); })));
    carteHeader.appendChild(el('div', { class: 'champ' }, el('label', {}, 'Menu de navigation'), rendreListeLiensReordonnable(header.menu, maj)));
    c.appendChild(carteHeader);

    const carteFooter = el('div', { class: 'carte' }, el('h2', {}, 'Pied de page'));
    const colonnesConteneur = el('div', {});
    footer.colonnes.forEach((colonne, i) => {
      const carteColonne = el('div', { class: 'colonne-footer-carte' });
      const titreInput = el('input', { type: 'text', placeholder: 'Titre de la colonne', value: colonne.titre });
      titreInput.addEventListener('input', () => { colonne.titre = titreInput.value; maj(); });
      const retirerColonne = el('button', { class: 'retirer' }, '✕');
      retirerColonne.addEventListener('click', () => { footer.colonnes.splice(i, 1); maj(); rafraichirContenu(); });
      carteColonne.appendChild(el('div', { class: 'colonne-footer-carte__entete' }, titreInput, retirerColonne));
      carteColonne.appendChild(rendreListeLiensReordonnable(colonne.liens, maj));
      colonnesConteneur.appendChild(carteColonne);
    });
    const ajouterColonne = el('button', { class: 'lien-ajouter' }, '+ Ajouter une colonne');
    ajouterColonne.addEventListener('click', () => { footer.colonnes.push({ id: uid(), titre: 'Nouvelle colonne', liens: [] }); maj(); rafraichirContenu(); });
    carteFooter.appendChild(el('div', { class: 'champ' }, el('label', {}, 'Colonnes de liens'), colonnesConteneur, ajouterColonne));
    carteFooter.appendChild(champTexte('Texte de copyright', footer.copyright, (v) => { footer.copyright = v; maj(); }));
    carteFooter.appendChild(el('div', { class: 'champ' }, el('label', {}, 'Réseaux sociaux'), rendreListeReseaux(footer.reseaux, maj)));
    c.appendChild(carteFooter);
  }

  function rendreListeLiensReordonnable(liste, maj) {
    const conteneur = el('div', {});
    liste.forEach((lien, i) => {
      const labelInput = el('input', { type: 'text', placeholder: 'Libellé', value: lien.label });
      labelInput.addEventListener('input', () => { lien.label = labelInput.value; maj(); });
      const urlInput = el('input', { type: 'text', placeholder: 'URL', value: lien.url });
      urlInput.addEventListener('input', () => { lien.url = urlInput.value; maj(); });
      const haut = el('button', { title: 'Monter' }, '▲');
      haut.addEventListener('click', () => { deplacer(liste, i, -1); maj(); rafraichirContenu(); });
      const bas = el('button', { title: 'Descendre' }, '▼');
      bas.addEventListener('click', () => { deplacer(liste, i, 1); maj(); rafraichirContenu(); });
      const retirer = el('button', { class: 'retirer' }, '✕');
      retirer.addEventListener('click', () => { liste.splice(i, 1); maj(); rafraichirContenu(); });
      conteneur.appendChild(el('div', { class: 'liste-repetee__item' }, el('div', { class: 'poignees-ordre' }, haut, bas), labelInput, urlInput, retirer));
    });
    const ajouter = el('button', { class: 'lien-ajouter' }, '+ Ajouter un lien');
    ajouter.addEventListener('click', () => { liste.push({ id: uid(), label: 'Nouveau lien', url: '#' }); maj(); rafraichirContenu(); });
    conteneur.appendChild(ajouter);
    return conteneur;
  }

  function rendreListeReseaux(liste, maj) {
    const conteneur = el('div', {});
    liste.forEach((r, i) => {
      const plateformeInput = el('input', { type: 'text', placeholder: 'Plateforme (ex. Instagram)', value: r.plateforme });
      plateformeInput.addEventListener('input', () => { r.plateforme = plateformeInput.value; maj(); });
      const urlInput = el('input', { type: 'text', placeholder: 'URL', value: r.url });
      urlInput.addEventListener('input', () => { r.url = urlInput.value; maj(); });
      const retirer = el('button', { class: 'retirer' }, '✕');
      retirer.addEventListener('click', () => { liste.splice(i, 1); maj(); rafraichirContenu(); });
      conteneur.appendChild(el('div', { class: 'liste-repetee__item' }, plateformeInput, urlInput, retirer));
    });
    const ajouter = el('button', { class: 'lien-ajouter' }, '+ Ajouter un réseau social');
    ajouter.addEventListener('click', () => { liste.push({ id: uid(), plateforme: '', url: '' }); maj(); rafraichirContenu(); });
    conteneur.appendChild(ajouter);
    return conteneur;
  }

  // -------------------------------------------------- RÉGLAGES

  function rendreReglages(c) {
    c.appendChild(el('div', { class: 'entete-vue' }, el('h1', {}, 'Réglages'),
      el('button', { class: 'bouton-principal', onclick: () => { flusherSauvegarde(); toast('✓ Réglages enregistrés'); } }, 'Enregistrer')));
    const maj = () => { marquerModifie(); document.getElementById('nom-site-barre').textContent = state.reglages.nomSite; };
    c.appendChild(el('div', { class: 'carte' }, el('h2', {}, 'Identité du site'),
      champTexte('Nom du site', state.reglages.nomSite, (v) => { state.reglages.nomSite = v; maj(); }),
      champTextarea('Description / slogan', state.reglages.description, (v) => { state.reglages.description = v; maj(); }),
      champAide("La charte graphique (couleurs, police) du contenu publié se règle dans le Constructeur, onglet « Réglages du site ».")));
  }

  // -------------------------------------------------- amorçage

  document.querySelectorAll('.nav-laterale__item').forEach((b) => {
    b.addEventListener('click', () => allerA(b.dataset.vue));
  });
  document.getElementById('bouton-bascule-nav').addEventListener('click', () => document.querySelector('.admin').classList.toggle('nav-ouverte'));
  document.getElementById('bouton-enregistrer').addEventListener('click', () => { flusherSauvegarde(); toast('✓ Enregistré'); });

  allerA('tableau-de-bord');
  document.getElementById('nom-site-barre').textContent = state.reglages.nomSite;
})();
