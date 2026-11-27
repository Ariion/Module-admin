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
  function champRadioGroup(label, options, valeur, onChange) {
    const nomGroupe = 'radio-' + uid();
    const groupe = el('div', { class: 'champ champ-radio-groupe' }, el('label', {}, label));
    options.forEach((o) => {
      const input = el('input', { type: 'radio', name: nomGroupe, checked: o.valeur === valeur ? 'checked' : undefined });
      input.addEventListener('change', () => { if (input.checked) onChange(o.valeur); });
      groupe.appendChild(el('label', { class: 'option-radio' }, input, o.label));
    });
    return groupe;
  }

  function slugify(texte) {
    return (texte || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'sans-titre';
  }

  // Bloc Référencement (SEO) partagé par Pages, Articles et Produits : aperçu Google en direct + compteurs de caractères.
  function rendreOngletSEO(panneau, { titre, url, metaTitre, metaDescription, onMetaTitre, onMetaDescription }) {
    const apercuTitre = el('div', { class: 'apercu-google__titre' }, metaTitre || titre || '(Sans titre)');
    const apercuUrl = el('div', { class: 'apercu-google__url' }, url);
    const apercuDesc = el('div', { class: 'apercu-google__description' }, metaDescription || 'Aucune description renseignée.');
    panneau.appendChild(el('div', { class: 'apercu-google' },
      el('div', { class: 'apercu-google__libelle' }, 'Aperçu dans les résultats de recherche'),
      apercuTitre, apercuUrl, apercuDesc));

    const MAX_TITRE = 70, MAX_DESC = 160;
    const champMetaTitre = el('input', { type: 'text', value: metaTitre ?? '' });
    const compteurTitre = el('span', { class: 'compteur-champ' }, (metaTitre || '').length + ' / ' + MAX_TITRE);
    champMetaTitre.addEventListener('input', () => {
      onMetaTitre(champMetaTitre.value);
      compteurTitre.textContent = champMetaTitre.value.length + ' / ' + MAX_TITRE;
      compteurTitre.classList.toggle('depasse', champMetaTitre.value.length > MAX_TITRE);
      apercuTitre.textContent = champMetaTitre.value || titre || '(Sans titre)';
    });
    panneau.appendChild(el('div', { class: 'champ' }, el('label', {}, 'Méta-titre'), champMetaTitre, compteurTitre));

    const champMetaDesc = el('textarea', {}, metaDescription ?? '');
    const compteurDesc = el('span', { class: 'compteur-champ' }, (metaDescription || '').length + ' / ' + MAX_DESC);
    champMetaDesc.addEventListener('input', () => {
      onMetaDescription(champMetaDesc.value);
      compteurDesc.textContent = champMetaDesc.value.length + ' / ' + MAX_DESC;
      compteurDesc.classList.toggle('depasse', champMetaDesc.value.length > MAX_DESC);
      apercuDesc.textContent = champMetaDesc.value || 'Aucune description renseignée.';
    });
    panneau.appendChild(el('div', { class: 'champ' }, el('label', {}, 'Méta-description'), champMetaDesc, compteurDesc));
    panneau.appendChild(champAide('Affichés dans les résultats des moteurs de recherche.'));
  }
  function selectBrut(options, valeur, onChange) {
    const select = el('select', {});
    options.forEach((o) => {
      const lib = typeof o === 'object' ? o.label : o;
      const val = typeof o === 'object' ? o.valeur : o;
      select.appendChild(el('option', { value: val, selected: val === valeur ? 'selected' : undefined }, lib));
    });
    select.addEventListener('change', () => onChange(select.value));
    return select;
  }

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
    const idProduitPain = uid();
    const idProduitCroissant = uid();
    const idClientSophie = uid();
    const idClientMarc = uid();
    const idClientJulie = uid();
    const idClientThomas = uid();

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
          id: idProduitPain, nom: 'Pain de campagne', sku: 'PAIN-CAMP-500', prix: 4.2, prixBarre: '',
          descriptionCourte: 'Levain naturel, 24h de fermentation.', descriptionLongue: 'Notre pain de campagne est pétri à la main et cuit au feu de bois, pour une croûte croustillante et une mie alvéolée.',
          images: ['https://images.unsplash.com/photo-1549931319-a545319b2e58?w=400&q=80'],
          stock: 24, statut: 'actif', categorieId: idCatProduitBois,
          avecDeclinaisons: true, declinaisons: [{ id: uid(), nom: 'Poids', valeurs: '500g, 1kg' }],
          dateModif: Date.now() - 50000,
        },
        {
          id: idProduitCroissant, nom: 'Croissant pur beurre', sku: 'VIEN-CROIS', prix: 1.3, prixBarre: '',
          descriptionCourte: 'Croustillant et feuilleté, pur beurre AOP.', descriptionLongue: 'Préparé chaque matin selon une recette traditionnelle, notre croissant pur beurre est feuilleté à la main.',
          images: ['https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400&q=80'],
          stock: 40, statut: 'actif', categorieId: idCatProduitCuir,
          avecDeclinaisons: false, declinaisons: [],
          dateModif: Date.now() - 20000,
        },
      ],
      clients: [
        {
          id: idClientSophie, prenom: 'Sophie', nom: 'Lambert', email: 'sophie.lambert@email.fr', telephone: '06 12 34 56 78',
          adresse: { rue: '12 rue des Lilas', ville: 'Lyon', codePostal: '69000', pays: 'France' },
          notes: 'Cliente fidèle, commande tous les samedis.', dateInscription: '2026-08-02',
        },
        {
          id: idClientMarc, prenom: 'Marc', nom: 'Perrin', email: 'marc.perrin@email.fr', telephone: '06 98 76 54 32',
          adresse: { rue: '5 avenue Victor Hugo', ville: 'Lyon', codePostal: '69006', pays: 'France' },
          notes: '', dateInscription: '2026-09-15',
        },
        {
          id: idClientJulie, prenom: 'Julie', nom: 'Moreau', email: 'julie.moreau@email.fr', telephone: '07 11 22 33 44',
          adresse: { rue: '8 rue de la République', ville: 'Villeurbanne', codePostal: '69100', pays: 'France' },
          notes: 'Allergique aux fruits à coque — à signaler en cuisine.', dateInscription: '2026-10-05',
        },
        {
          id: idClientThomas, prenom: 'Thomas', nom: 'Girard', email: 'thomas.girard@email.fr', telephone: '06 55 44 33 22',
          adresse: { rue: '3 place Bellecour', ville: 'Lyon', codePostal: '69002', pays: 'France' },
          notes: '', dateInscription: '2026-11-01',
        },
      ],
      commandes: [
        {
          id: uid(), numero: 'CMD-2026-0001', clientId: idClientSophie, date: '2026-11-18',
          lignes: [{ produitId: idProduitPain, nom: 'Pain de campagne', prixUnitaire: 4.2, quantite: 2 }, { produitId: idProduitCroissant, nom: 'Croissant pur beurre', prixUnitaire: 1.3, quantite: 4 }],
          statut: 'livree', notesInternes: '',
        },
        {
          id: uid(), numero: 'CMD-2026-0002', clientId: idClientMarc, date: '2026-11-20',
          lignes: [{ produitId: idProduitCroissant, nom: 'Croissant pur beurre', prixUnitaire: 1.3, quantite: 6 }],
          statut: 'expediee', notesInternes: '',
        },
        {
          id: uid(), numero: 'CMD-2026-0003', clientId: idClientJulie, date: '2026-11-22',
          lignes: [{ produitId: idProduitPain, nom: 'Pain de campagne', prixUnitaire: 4.2, quantite: 1 }],
          statut: 'en-preparation', notesInternes: 'Sans fruits à coque, cf. fiche client.',
        },
        {
          id: uid(), numero: 'CMD-2026-0004', clientId: idClientSophie, date: '2026-11-24',
          lignes: [{ produitId: idProduitPain, nom: 'Pain de campagne', prixUnitaire: 4.2, quantite: 3 }, { produitId: idProduitCroissant, nom: 'Croissant pur beurre', prixUnitaire: 1.3, quantite: 2 }],
          statut: 'paiement-accepte', notesInternes: '',
        },
        {
          id: uid(), numero: 'CMD-2026-0005', clientId: idClientThomas, date: '2026-11-25',
          lignes: [{ produitId: idProduitCroissant, nom: 'Croissant pur beurre', prixUnitaire: 1.3, quantite: 12 }],
          statut: 'attente-paiement', notesInternes: 'Commande pour un petit-déjeuner d’équipe.',
        },
        {
          id: uid(), numero: 'CMD-2026-0006', clientId: idClientMarc, date: '2026-11-10',
          lignes: [{ produitId: idProduitPain, nom: 'Pain de campagne', prixUnitaire: 4.2, quantite: 2 }],
          statut: 'annulee', notesInternes: 'Client annulé avant préparation.',
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
      commandes: rendreListeCommandes,
      'commandes-edition': rendreEditionCommande,
      clients: rendreListeClients,
      'clients-edition': rendreEditionClient,
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
      carteStat(state.produits.reduce((s, p) => s + (p.stock || 0), 0), 'Unités en stock'),
      carteStat(state.commandes.length, 'Commandes'),
      carteStat(state.clients.length, 'Clients'),
      carteStat(state.commandes.filter((cmd) => cmd.statut !== 'annulee').reduce((s, cmd) => s + montantCommande(cmd), 0).toFixed(2) + ' €', 'Chiffre d’affaires')));

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

    const grille = el('div', { class: 'grille-widgets-tdb' });
    grille.appendChild(el('div', { class: 'carte' }, el('h2', {}, 'Derniers éléments modifiés'), liste));
    grille.appendChild(rendreWidgetBrouillonRapide());
    c.appendChild(grille);
  }

  // Widget "Brouillon rapide" façon WordPress : crée directement un article en brouillon sans quitter le tableau de bord.
  function rendreWidgetBrouillonRapide() {
    const champTitre = el('input', { type: 'text', placeholder: 'Titre' });
    const champContenu = el('textarea', { placeholder: "Qu'avez-vous en tête ?" });
    const enregistrer = () => {
      if (!champTitre.value.trim() && !champContenu.value.trim()) return;
      const article = {
        id: uid(), titre: champTitre.value.trim() || 'Sans titre',
        categorieId: state.categoriesArticles[0] ? state.categoriesArticles[0].id : null,
        auteur: '', contenu: champContenu.value, extrait: '', imageUrl: '', statut: 'brouillon', datePublication: '',
        metaTitre: '', metaDescription: '', dateModif: Date.now(),
      };
      state.articles.push(article);
      marquerModifie();
      champTitre.value = '';
      champContenu.value = '';
      toast('✓ Brouillon enregistré');
      rafraichirContenu();
    };
    const bouton = el('button', { class: 'bouton-principal', onclick: enregistrer }, 'Enregistrer le brouillon');
    return el('div', { class: 'carte' },
      el('h2', {}, 'Brouillon rapide'),
      el('div', { class: 'champ' }, el('label', {}, 'Titre'), champTitre),
      el('div', { class: 'champ' }, el('label', {}, 'Contenu'), champContenu),
      bouton);
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

  // -------------------------------------------------- sélection en masse (listes Pages/Articles/Produits, comme PrestaShop)

  function caseSelectionEntete(selection, ids) {
    const cb = el('input', { type: 'checkbox' });
    cb.checked = ids.length > 0 && ids.every((id) => selection.has(id));
    cb.addEventListener('change', () => { ids.forEach((id) => { if (cb.checked) selection.add(id); else selection.delete(id); }); rafraichirContenu(); });
    return el('th', { class: 'case-selection' }, cb);
  }
  function caseSelectionLigne(selection, id) {
    const cb = el('input', { type: 'checkbox' });
    cb.checked = selection.has(id);
    cb.addEventListener('change', () => { if (cb.checked) selection.add(id); else selection.delete(id); rafraichirContenu(); });
    return el('td', { class: 'case-selection' }, cb);
  }
  function rendreBarreSelection(c, selection, { onSupprimer, pluriel }) {
    if (!selection.size) return;
    const n = selection.size;
    c.appendChild(el('div', { class: 'barre-selection' },
      el('span', {}, n + ' ' + (n > 1 ? (pluriel || 'éléments sélectionnés') : 'élément sélectionné')),
      el('button', { class: 'bouton-danger-plein', onclick: () => {
        if (!window.confirm('Supprimer ' + n + ' élément(s) ? Cette action est irréversible.')) return;
        onSupprimer(Array.from(selection));
        selection.clear();
        marquerModifie();
        rafraichirContenu();
      } }, '🗑 Supprimer la sélection')));
  }

  // -------------------------------------------------- PAGES

  let rechercheStock = { pages: '', articles: '', produits: '', commandes: '', clients: '' };
  let selectionStock = { pages: new Set(), articles: new Set(), produits: new Set() };

  function rendreListePages(c) {
    c.appendChild(el('div', { class: 'entete-vue' },
      el('h1', {}, 'Pages'),
      el('button', { class: 'bouton-principal', onclick: () => creerPage() }, '+ Ajouter une page')));

    rendreBarreOutils(c, { recherche: rechercheStock.pages, onRecherche: (v) => { rechercheStock.pages = v; rafraichirContenu(); } });

    const q = rechercheStock.pages.toLowerCase();
    const items = state.pages.filter((p) => !q || p.titre.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q));

    rendreBarreSelection(c, selectionStock.pages, {
      pluriel: 'pages sélectionnées',
      onSupprimer: (ids) => { state.pages = state.pages.filter((p) => !ids.includes(p.id)); },
    });

    const tableCarte = el('div', { class: 'table-carte' });
    if (!items.length) { tableCarte.appendChild(el('div', { class: 'vide-liste' }, 'Aucune page pour le moment.')); c.appendChild(tableCarte); return; }

    const table = el('table', { class: 'table-liste' },
      el('thead', {}, el('tr', {}, caseSelectionEntete(selectionStock.pages, items.map((p) => p.id)), el('th', {}, 'Titre'), el('th', {}, 'Type'), el('th', {}, 'URL'), el('th', {}, 'Statut'), el('th', {}, 'Modifiée'), el('th', {}, 'Actions'))));
    const corps = el('tbody', {});
    items.forEach((p) => {
      corps.appendChild(el('tr', {},
        caseSelectionLigne(selectionStock.pages, p.id),
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
      rendreOngletSEO(panneau, {
        titre: page.titre, url: page.slug, metaTitre: page.metaTitre, metaDescription: page.metaDescription,
        onMetaTitre: (v) => { page.metaTitre = v; maj(); }, onMetaDescription: (v) => { page.metaDescription = v; maj(); },
      });
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

    rendreBarreSelection(c, selectionStock.articles, {
      pluriel: 'articles sélectionnés',
      onSupprimer: (ids) => { state.articles = state.articles.filter((a) => !ids.includes(a.id)); },
    });

    const tableCarte = el('div', { class: 'table-carte' });
    if (!items.length) { tableCarte.appendChild(el('div', { class: 'vide-liste' }, 'Aucun article pour le moment.')); c.appendChild(tableCarte); return; }
    const table = el('table', { class: 'table-liste' },
      el('thead', {}, el('tr', {}, caseSelectionEntete(selectionStock.articles, items.map((a) => a.id)), el('th', {}, 'Titre'), el('th', {}, 'Catégorie'), el('th', {}, 'Auteur'), el('th', {}, 'Statut'), el('th', {}, 'Modifié'), el('th', {}, 'Actions'))));
    const corps = el('tbody', {});
    items.forEach((a) => {
      const cat = state.categoriesArticles.find((cc) => cc.id === a.categorieId);
      corps.appendChild(el('tr', {},
        caseSelectionLigne(selectionStock.articles, a.id),
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
    const article = { id: uid(), titre: 'Nouvel article', categorieId: state.categoriesArticles[0] ? state.categoriesArticles[0].id : null, auteur: '', contenu: '', extrait: '', imageUrl: '', statut: 'brouillon', datePublication: '', metaTitre: '', metaDescription: '', dateModif: Date.now() };
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

  let ongletArticleActif = 'contenu';

  function rendreEditionArticle(c) {
    const article = state.articles.find((a) => a.id === state.edition.id);
    if (!article) { allerA('articles'); return; }
    const maj = () => { article.dateModif = Date.now(); marquerModifie(); };

    c.appendChild(el('div', { class: 'fil-ariane' }, el('a', { href: '#', onclick: (e) => { e.preventDefault(); allerA('articles'); } }, 'Articles'), ' / ' + article.titre));
    c.appendChild(el('div', { class: 'entete-vue' },
      el('h1', {}, article.titre || 'Sans titre'),
      el('button', { class: 'bouton-principal', onclick: () => { flusherSauvegarde(); toast('✓ Article enregistré'); } }, 'Enregistrer')));

    const mise = el('div', { class: 'mise-en-page-edition' });
    const onglets = ['contenu', 'seo'];
    const libellesOnglets = { contenu: 'Contenu', seo: 'Référencement (SEO)' };
    const ongletsDiv = el('div', { class: 'onglets-form' });
    onglets.forEach((o) => ongletsDiv.appendChild(el('button', { class: ongletArticleActif === o ? 'actif' : '', onclick: () => { ongletArticleActif = o; rafraichirContenu(); } }, libellesOnglets[o])));

    const panneau = el('div', { class: 'panneau-form' });
    if (ongletArticleActif === 'contenu') {
      panneau.appendChild(champTexte('Titre', article.titre, (v) => { article.titre = v; maj(); }));
      panneau.appendChild(champTexte('Résumé / extrait', article.extrait, (v) => { article.extrait = v; maj(); }));
      panneau.appendChild(champTextarea('Contenu', article.contenu, (v) => { article.contenu = v; maj(); }, true));
      panneau.appendChild(champTexte("Adresse de l'image à la une", article.imageUrl, (v) => { article.imageUrl = v; maj(); }));
    } else {
      rendreOngletSEO(panneau, {
        titre: article.titre, url: '/articles/' + slugify(article.titre), metaTitre: article.metaTitre, metaDescription: article.metaDescription,
        onMetaTitre: (v) => { article.metaTitre = v; maj(); }, onMetaDescription: (v) => { article.metaDescription = v; maj(); },
      });
    }
    mise.appendChild(el('div', {}, ongletsDiv, panneau));

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

    rendreBarreSelection(c, selectionStock.produits, {
      pluriel: 'produits sélectionnés',
      onSupprimer: (ids) => { state.produits = state.produits.filter((p) => !ids.includes(p.id)); },
    });

    const tableCarte = el('div', { class: 'table-carte' });
    if (!items.length) { tableCarte.appendChild(el('div', { class: 'vide-liste' }, 'Aucun produit pour le moment.')); c.appendChild(tableCarte); return; }
    const table = el('table', { class: 'table-liste' },
      el('thead', {}, el('tr', {}, caseSelectionEntete(selectionStock.produits, items.map((p) => p.id)), el('th', {}, ''), el('th', {}, 'Nom'), el('th', {}, 'Référence'), el('th', {}, 'Prix'), el('th', {}, 'Stock'), el('th', {}, 'Statut'), el('th', {}, 'Actions'))));
    const corps = el('tbody', {});
    items.forEach((p) => {
      corps.appendChild(el('tr', {},
        caseSelectionLigne(selectionStock.produits, p.id),
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
    const produit = { id: uid(), nom: 'Nouveau produit', sku: '', prix: 0, prixBarre: '', descriptionCourte: '', descriptionLongue: '', images: [], stock: 0, statut: 'inactif', categorieId: state.categoriesProduits[0] ? state.categoriesProduits[0].id : null, avecDeclinaisons: false, declinaisons: [], metaTitre: '', metaDescription: '', dateModif: Date.now() };
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

  let ongletProduitActif = 'essentiel';

  function rendreEditionProduit(c) {
    const produit = state.produits.find((p) => p.id === state.edition.id);
    if (!produit) { allerA('produits'); return; }
    const maj = () => { produit.dateModif = Date.now(); marquerModifie(); };

    c.appendChild(el('div', { class: 'fil-ariane' }, el('a', { href: '#', onclick: (e) => { e.preventDefault(); allerA('produits'); } }, 'Produits'), ' / ' + produit.nom));
    c.appendChild(el('div', { class: 'entete-vue' },
      el('h1', {}, produit.nom || 'Sans titre'),
      el('button', { class: 'bouton-principal', onclick: () => { flusherSauvegarde(); toast('✓ Produit enregistré'); } }, 'Enregistrer')));

    const mise = el('div', { class: 'mise-en-page-edition' });
    const onglets = ['essentiel', 'declinaisons', 'prix', 'seo'];
    const libellesOnglets = { essentiel: 'Essentiel', declinaisons: 'Déclinaisons', prix: 'Prix', seo: 'Référencement (SEO)' };
    const ongletsDiv = el('div', { class: 'onglets-form' });
    onglets.forEach((o) => ongletsDiv.appendChild(el('button', { class: ongletProduitActif === o ? 'actif' : '', onclick: () => { ongletProduitActif = o; rafraichirContenu(); } }, libellesOnglets[o])));

    const panneau = el('div', { class: 'panneau-form' });
    if (ongletProduitActif === 'essentiel') {
      panneau.appendChild(champTexte('Nom du produit', produit.nom, (v) => { produit.nom = v; maj(); }));
      panneau.appendChild(el('div', { class: 'champ-inline' },
        champTexte('Référence (SKU)', produit.sku, (v) => { produit.sku = v; maj(); }),
        champNombre('Stock', produit.stock, (v) => { produit.stock = v; maj(); })));
      panneau.appendChild(champTextarea('Description courte', produit.descriptionCourte, (v) => { produit.descriptionCourte = v; maj(); }));
      panneau.appendChild(champTextarea('Description longue', produit.descriptionLongue, (v) => { produit.descriptionLongue = v; maj(); }, true));
      panneau.appendChild(el('div', { class: 'champ' }, el('label', {}, 'Images'), rendreBlocImagesProduit(produit, maj)));
    } else if (ongletProduitActif === 'declinaisons') {
      const avecDeclinaisons = produit.avecDeclinaisons ?? produit.declinaisons.length > 0;
      panneau.appendChild(champRadioGroup('Type de produit', [
        { valeur: false, label: 'Produit simple' },
        { valeur: true, label: 'Produit avec déclinaisons (ex. tailles, couleurs…)' },
      ], avecDeclinaisons, (v) => { produit.avecDeclinaisons = v; maj(); rafraichirContenu(); }));
      if (avecDeclinaisons) {
        panneau.appendChild(el('div', { class: 'champ' }, el('label', {}, 'Déclinaisons'), rendreBlocDeclinaisons(produit, maj)));
      }
    } else if (ongletProduitActif === 'prix') {
      const infoPrix = el('div', { class: 'info-prix-final' });
      const majApercuPrix = () => {
        const prix = Number(produit.prix) || 0;
        const prixBarre = Number(produit.prixBarre) || 0;
        infoPrix.textContent = '';
        infoPrix.appendChild(document.createTextNode('Prix de vente final : '));
        infoPrix.appendChild(el('strong', {}, prix.toFixed(2) + ' €'));
        if (prixBarre > prix) infoPrix.appendChild(el('span', { class: 'prix-barre-info' }, ' au lieu de ' + prixBarre.toFixed(2) + ' €'));
      };
      panneau.appendChild(el('div', { class: 'champ-inline' },
        champNombre('Prix (€)', produit.prix, (v) => { produit.prix = v; maj(); majApercuPrix(); }),
        champNombre('Prix barré (€, optionnel)', produit.prixBarre, (v) => { produit.prixBarre = v; maj(); majApercuPrix(); })));
      majApercuPrix();
      panneau.appendChild(infoPrix);
    } else {
      rendreOngletSEO(panneau, {
        titre: produit.nom, url: '/produits/' + slugify(produit.nom), metaTitre: produit.metaTitre, metaDescription: produit.metaDescription,
        onMetaTitre: (v) => { produit.metaTitre = v; maj(); }, onMetaDescription: (v) => { produit.metaDescription = v; maj(); },
      });
    }

    mise.appendChild(el('div', {}, ongletsDiv, panneau));

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

  // -------------------------------------------------- COMMANDES

  const STATUTS_COMMANDE = [
    { valeur: 'attente-paiement', label: 'En attente de paiement' },
    { valeur: 'paiement-accepte', label: 'Paiement accepté' },
    { valeur: 'en-preparation', label: 'En préparation' },
    { valeur: 'expediee', label: 'Expédiée' },
    { valeur: 'livree', label: 'Livrée' },
    { valeur: 'annulee', label: 'Annulée' },
  ];
  function libelleStatutCommande(v) { const s = STATUTS_COMMANDE.find((s) => s.valeur === v); return s ? s.label : v; }
  function montantCommande(cmd) { return cmd.lignes.reduce((s, l) => s + l.prixUnitaire * l.quantite, 0); }
  function commandesDuClient(clientId) { return state.commandes.filter((cmd) => cmd.clientId === clientId); }
  function totalDepenseClient(clientId) { return commandesDuClient(clientId).reduce((s, cmd) => s + montantCommande(cmd), 0); }
  function nomClient(client) { return client ? (client.prenom + ' ' + client.nom).trim() : 'Client supprimé'; }

  function rendreListeCommandes(c) {
    c.appendChild(el('div', { class: 'entete-vue' },
      el('h1', {}, 'Commandes'),
      el('button', { class: 'bouton-principal', onclick: () => creerCommande() }, '+ Ajouter une commande')));

    rendreBarreOutils(c, { recherche: rechercheStock.commandes, onRecherche: (v) => { rechercheStock.commandes = v; rafraichirContenu(); } });

    const q = rechercheStock.commandes.toLowerCase();
    const items = state.commandes.filter((cmd) => {
      if (!q) return true;
      const client = state.clients.find((cl) => cl.id === cmd.clientId);
      return cmd.numero.toLowerCase().includes(q) || (client && nomClient(client).toLowerCase().includes(q));
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    const tableCarte = el('div', { class: 'table-carte' });
    if (!items.length) { tableCarte.appendChild(el('div', { class: 'vide-liste' }, 'Aucune commande pour le moment.')); c.appendChild(tableCarte); return; }
    const table = el('table', { class: 'table-liste' },
      el('thead', {}, el('tr', {}, el('th', {}, 'Numéro'), el('th', {}, 'Client'), el('th', {}, 'Date'), el('th', {}, 'Montant'), el('th', {}, 'Statut'), el('th', {}, 'Actions'))));
    const corps = el('tbody', {});
    items.forEach((cmd) => {
      const client = state.clients.find((cl) => cl.id === cmd.clientId);
      corps.appendChild(el('tr', {},
        el('td', {}, el('a', { class: 'titre-lien', href: '#', onclick: (e) => { e.preventDefault(); allerA('commandes-edition', { id: cmd.id }); } }, cmd.numero)),
        el('td', {}, client ? el('a', { href: '#', onclick: (e) => { e.preventDefault(); allerA('clients-edition', { id: client.id }); } }, nomClient(client)) : 'Client supprimé'),
        el('td', {}, formaterDate(new Date(cmd.date).getTime())),
        el('td', {}, montantCommande(cmd).toFixed(2) + ' €'),
        el('td', {}, el('span', { class: 'badge ' + cmd.statut }, libelleStatutCommande(cmd.statut))),
        el('td', {}, el('div', { class: 'actions-ligne' },
          el('a', { href: '#', onclick: (e) => { e.preventDefault(); allerA('commandes-edition', { id: cmd.id }); } }, 'Modifier'),
          el('button', { class: 'suppr', onclick: () => supprimerCommande(cmd.id) }, 'Supprimer')))));
    });
    table.appendChild(corps);
    tableCarte.appendChild(table);
    c.appendChild(tableCarte);
  }

  function creerCommande() {
    const numero = 'CMD-' + new Date().getFullYear() + '-' + String(state.commandes.length + 1).padStart(4, '0');
    const commande = { id: uid(), numero, clientId: state.clients[0] ? state.clients[0].id : null, date: new Date().toISOString().slice(0, 10), lignes: [], statut: 'attente-paiement', notesInternes: '' };
    state.commandes.push(commande);
    marquerModifie();
    allerA('commandes-edition', { id: commande.id });
  }
  function supprimerCommande(id) {
    if (!window.confirm('Supprimer cette commande ?')) return;
    state.commandes = state.commandes.filter((cmd) => cmd.id !== id);
    marquerModifie();
    rafraichirContenu();
  }

  function rendreEditionCommande(c) {
    const commande = state.commandes.find((cmd) => cmd.id === state.edition.id);
    if (!commande) { allerA('commandes'); return; }
    const maj = () => marquerModifie();
    const client = state.clients.find((cl) => cl.id === commande.clientId);

    c.appendChild(el('div', { class: 'fil-ariane' }, el('a', { href: '#', onclick: (e) => { e.preventDefault(); allerA('commandes'); } }, 'Commandes'), ' / ' + commande.numero));
    c.appendChild(el('div', { class: 'entete-vue' },
      el('h1', {}, commande.numero),
      el('button', { class: 'bouton-principal', onclick: () => { flusherSauvegarde(); toast('✓ Commande enregistrée'); } }, 'Enregistrer')));

    const mise = el('div', { class: 'mise-en-page-edition' });
    const panneau = el('div', { class: 'panneau-form' });
    panneau.appendChild(el('div', { class: 'champ' }, el('label', {}, 'Articles commandés'), rendreLignesCommande(commande, maj)));
    panneau.appendChild(champTextarea('Notes internes', commande.notesInternes, (v) => { commande.notesInternes = v; maj(); }, true));
    mise.appendChild(el('div', {}, el('div', { class: 'onglets-form' }, el('button', { class: 'actif' }, 'Détail de la commande')), panneau));

    const lateral = el('div', {});
    lateral.appendChild(el('div', { class: 'widget-lateral' },
      el('h3', {}, 'Statut de la commande'),
      champSelect('', STATUTS_COMMANDE, commande.statut, (v) => { commande.statut = v; maj(); rafraichirContenu(); })));

    const widgetClient = el('div', { class: 'widget-lateral' }, el('h3', {}, 'Client'));
    widgetClient.appendChild(champSelect('', state.clients.map((cl) => ({ valeur: cl.id, label: nomClient(cl) })), commande.clientId, (v) => { commande.clientId = v; maj(); rafraichirContenu(); }));
    if (client) {
      widgetClient.appendChild(el('div', { class: 'champ-aide-texte' }, client.email));
      widgetClient.appendChild(el('a', { href: '#', style: { fontSize: '.84rem' }, onclick: (e) => { e.preventDefault(); allerA('clients-edition', { id: client.id }); } }, 'Voir la fiche client →'));
    }
    lateral.appendChild(widgetClient);

    lateral.appendChild(el('div', { class: 'widget-lateral' }, el('h3', {}, 'Informations'),
      champTexte('Date de la commande', commande.date, (v) => { commande.date = v; maj(); }, 'date')));

    mise.appendChild(lateral);
    c.appendChild(mise);
  }

  function rendreLignesCommande(cmd, maj) {
    const conteneur = el('div', {});
    const tableCarte = el('div', { class: 'table-carte' });
    if (!cmd.lignes.length) {
      tableCarte.appendChild(el('div', { class: 'vide-liste' }, 'Aucun article dans cette commande.'));
    } else {
      const table = el('table', { class: 'table-liste' },
        el('thead', {}, el('tr', {}, el('th', {}, 'Produit'), el('th', {}, 'Prix unitaire'), el('th', {}, 'Quantité'), el('th', {}, 'Sous-total'), el('th', {}, ''))));
      const corps = el('tbody', {});
      cmd.lignes.forEach((ligne, i) => {
        const optionsProduits = state.produits.map((p) => ({ valeur: p.id, label: p.nom }));
        const selectProduit = selectBrut(optionsProduits, ligne.produitId, (v) => {
          const p = state.produits.find((pp) => pp.id === v);
          ligne.produitId = v;
          if (p) { ligne.nom = p.nom; ligne.prixUnitaire = p.prix; }
          maj(); rafraichirContenu();
        });
        const qte = el('input', { type: 'number', value: ligne.quantite, min: '1' });
        qte.addEventListener('input', () => { ligne.quantite = Math.max(1, Number(qte.value) || 1); maj(); rafraichirContenu(); });
        const retirer = el('button', { class: 'suppr' }, 'Retirer');
        retirer.addEventListener('click', () => { cmd.lignes.splice(i, 1); maj(); rafraichirContenu(); });
        corps.appendChild(el('tr', {},
          el('td', {}, selectProduit),
          el('td', {}, Number(ligne.prixUnitaire).toFixed(2) + ' €'),
          el('td', {}, qte),
          el('td', {}, (ligne.prixUnitaire * ligne.quantite).toFixed(2) + ' €'),
          el('td', {}, retirer)));
      });
      table.appendChild(corps);
      tableCarte.appendChild(table);
    }
    conteneur.appendChild(tableCarte);
    const ajouter = el('button', { class: 'lien-ajouter', style: { marginTop: '10px' } }, '+ Ajouter une ligne');
    ajouter.addEventListener('click', () => {
      const premier = state.produits[0];
      if (!premier) return;
      cmd.lignes.push({ produitId: premier.id, nom: premier.nom, prixUnitaire: premier.prix, quantite: 1 });
      maj(); rafraichirContenu();
    });
    conteneur.appendChild(ajouter);
    conteneur.appendChild(el('div', { class: 'total-commande' }, 'Total : ' + montantCommande(cmd).toFixed(2) + ' €'));
    return conteneur;
  }

  // -------------------------------------------------- CLIENTS

  function rendreListeClients(c) {
    c.appendChild(el('div', { class: 'entete-vue' },
      el('h1', {}, 'Clients'),
      el('button', { class: 'bouton-principal', onclick: () => creerClient() }, '+ Ajouter un client')));

    rendreBarreOutils(c, { recherche: rechercheStock.clients, onRecherche: (v) => { rechercheStock.clients = v; rafraichirContenu(); } });

    const q = rechercheStock.clients.toLowerCase();
    const items = state.clients.filter((cl) => !q || nomClient(cl).toLowerCase().includes(q) || cl.email.toLowerCase().includes(q));

    const tableCarte = el('div', { class: 'table-carte' });
    if (!items.length) { tableCarte.appendChild(el('div', { class: 'vide-liste' }, 'Aucun client pour le moment.')); c.appendChild(tableCarte); return; }
    const table = el('table', { class: 'table-liste' },
      el('thead', {}, el('tr', {}, el('th', {}, 'Nom'), el('th', {}, 'Email'), el('th', {}, 'Commandes'), el('th', {}, 'Total dépensé'), el('th', {}, 'Inscrit le'), el('th', {}, 'Actions'))));
    const corps = el('tbody', {});
    items.forEach((cl) => {
      corps.appendChild(el('tr', {},
        el('td', {}, el('a', { class: 'titre-lien', href: '#', onclick: (e) => { e.preventDefault(); allerA('clients-edition', { id: cl.id }); } }, nomClient(cl))),
        el('td', {}, cl.email),
        el('td', {}, String(commandesDuClient(cl.id).length)),
        el('td', {}, totalDepenseClient(cl.id).toFixed(2) + ' €'),
        el('td', {}, formaterDate(new Date(cl.dateInscription).getTime())),
        el('td', {}, el('div', { class: 'actions-ligne' },
          el('a', { href: '#', onclick: (e) => { e.preventDefault(); allerA('clients-edition', { id: cl.id }); } }, 'Modifier'),
          el('button', { class: 'suppr', onclick: () => supprimerClient(cl.id) }, 'Supprimer')))));
    });
    table.appendChild(corps);
    tableCarte.appendChild(table);
    c.appendChild(tableCarte);
  }

  function creerClient() {
    const client = { id: uid(), prenom: '', nom: 'Nouveau client', email: '', telephone: '', adresse: { rue: '', ville: '', codePostal: '', pays: 'France' }, notes: '', dateInscription: new Date().toISOString().slice(0, 10) };
    state.clients.push(client);
    marquerModifie();
    allerA('clients-edition', { id: client.id });
  }
  function supprimerClient(id) {
    if (!window.confirm('Supprimer ce client ? Les commandes déjà passées resteront enregistrées.')) return;
    state.clients = state.clients.filter((cl) => cl.id !== id);
    marquerModifie();
    rafraichirContenu();
  }

  function rendreEditionClient(c) {
    const client = state.clients.find((cl) => cl.id === state.edition.id);
    if (!client) { allerA('clients'); return; }
    const maj = () => marquerModifie();

    c.appendChild(el('div', { class: 'fil-ariane' }, el('a', { href: '#', onclick: (e) => { e.preventDefault(); allerA('clients'); } }, 'Clients'), ' / ' + nomClient(client)));
    c.appendChild(el('div', { class: 'entete-vue' },
      el('h1', {}, nomClient(client) || 'Sans nom'),
      el('button', { class: 'bouton-principal', onclick: () => { flusherSauvegarde(); toast('✓ Client enregistré'); } }, 'Enregistrer')));

    const mise = el('div', { class: 'mise-en-page-edition' });
    const panneau = el('div', { class: 'panneau-form' });
    panneau.appendChild(el('div', { class: 'champ-inline' },
      champTexte('Prénom', client.prenom, (v) => { client.prenom = v; maj(); }),
      champTexte('Nom', client.nom, (v) => { client.nom = v; maj(); })));
    panneau.appendChild(el('div', { class: 'champ-inline' },
      champTexte('Email', client.email, (v) => { client.email = v; maj(); }),
      champTexte('Téléphone', client.telephone, (v) => { client.telephone = v; maj(); })));
    panneau.appendChild(champTexte('Adresse', client.adresse.rue, (v) => { client.adresse.rue = v; maj(); }));
    panneau.appendChild(el('div', { class: 'champ-inline' },
      champTexte('Ville', client.adresse.ville, (v) => { client.adresse.ville = v; maj(); }),
      champTexte('Code postal', client.adresse.codePostal, (v) => { client.adresse.codePostal = v; maj(); })));
    panneau.appendChild(champTexte('Pays', client.adresse.pays, (v) => { client.adresse.pays = v; maj(); }));
    panneau.appendChild(champTextarea('Notes internes', client.notes, (v) => { client.notes = v; maj(); }, true));
    mise.appendChild(el('div', {}, el('div', { class: 'onglets-form' }, el('button', { class: 'actif' }, 'Informations client')), panneau));

    const lateral = el('div', {});
    lateral.appendChild(el('div', { class: 'widget-lateral' }, el('h3', {}, 'Client depuis'),
      champTexte("Date d'inscription", client.dateInscription, (v) => { client.dateInscription = v; maj(); }, 'date')));

    const historique = commandesDuClient(client.id).sort((a, b) => new Date(b.date) - new Date(a.date));
    const widgetHisto = el('div', { class: 'widget-lateral' }, el('h3', {}, 'Historique des commandes'));
    if (!historique.length) {
      widgetHisto.appendChild(el('div', { class: 'champ-aide-texte' }, 'Aucune commande pour ce client.'));
    } else {
      const liste = el('ul', { class: 'liste-recents' });
      historique.forEach((cmd) => {
        liste.appendChild(el('li', {},
          el('a', { href: '#', onclick: (e) => { e.preventDefault(); allerA('commandes-edition', { id: cmd.id }); } }, cmd.numero),
          el('span', { class: 'type' }, formaterDate(new Date(cmd.date).getTime()) + ' · ' + montantCommande(cmd).toFixed(2) + ' € · ' + libelleStatutCommande(cmd.statut))));
      });
      widgetHisto.appendChild(liste);
    }
    lateral.appendChild(widgetHisto);
    mise.appendChild(lateral);
    c.appendChild(mise);
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
