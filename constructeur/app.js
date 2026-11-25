/**
 * Constructeur — clone du geste Elementor/Creative Elements (sections > colonnes
 * > widgets, panneau Contenu/Style/Avancé, bibliothèque de modèles, bascule
 * aperçu avec édition au clic depuis le site), plus une capacité qui n'existe
 * pas dans Elementor : agripper un coin pour redimensionner, agripper un bord
 * pour déplacer librement n'importe où.
 * Outil interne, état en mémoire seulement (pas de Firebase, pas de build).
 */
(function () {
  'use strict';

  function uid() { return 'id' + Math.random().toString(36).slice(2, 9); }

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
      noeud.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return noeud;
  }

  // -------------------------------------------------- définitions des widgets

  const WIDGETS = {
    titre: {
      label: 'Titre', icone: '🔤',
      defaut: () => ({ texte: 'Un titre percutant', balise: 'h2', alignement: 'gauche' }),
      rendre(w) {
        return el(w.contenu.balise, { style: { textAlign: alignCss(w.contenu.alignement), margin: 0 } }, w.contenu.texte);
      },
      champs(w) {
        return [
          champTexte('Texte', w.contenu.texte, (v) => { w.contenu.texte = v; rendrePage(); }),
          champSelect('Balise', ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'], w.contenu.balise, (v) => { w.contenu.balise = v; rendrePage(); }),
          champSelect('Alignement', ['gauche', 'centre', 'droite'], w.contenu.alignement, (v) => { w.contenu.alignement = v; rendrePage(); }),
        ];
      },
    },
    texte: {
      label: 'Texte', icone: '📝',
      defaut: () => ({ html: 'Un paragraphe de texte éditable. Remplacez-le par votre propre contenu.' }),
      rendre(w) { return el('p', { style: { margin: 0 } }, w.contenu.html); },
      champs(w) {
        return [champTextarea('Contenu', w.contenu.html, (v) => { w.contenu.html = v; rendrePage(); })];
      },
    },
    image: {
      label: 'Image', icone: '🖼️',
      defaut: () => ({ src: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80', alt: 'Image' }),
      rendre(w) { return el('img', { src: w.contenu.src, alt: w.contenu.alt, style: { width: '100%', display: 'block' } }); },
      champs(w) {
        return [
          champTexte("Adresse de l'image", w.contenu.src, (v) => { w.contenu.src = v; rendrePage(); }),
          champTexte('Texte alternatif', w.contenu.alt, (v) => { w.contenu.alt = v; rendrePage(); }),
        ];
      },
    },
    bouton: {
      label: 'Bouton', icone: '🔘',
      defaut: () => ({ texte: 'Cliquez ici', lien: '#', style: 'plein' }),
      rendre(w) {
        return el('a', { href: w.contenu.lien, class: 'rendu-bouton rendu-bouton--' + w.contenu.style, onclick: (e) => e.preventDefault() }, w.contenu.texte);
      },
      champs(w) {
        return [
          champTexte('Texte', w.contenu.texte, (v) => { w.contenu.texte = v; rendrePage(); }),
          champTexte('Lien', w.contenu.lien, (v) => { w.contenu.lien = v; rendrePage(); }),
          champSelect('Style', ['plein', 'contour'], w.contenu.style, (v) => { w.contenu.style = v; rendrePage(); }),
        ];
      },
    },
    separateur: {
      label: 'Séparateur', icone: '➖',
      defaut: () => ({ style: 'ligne' }),
      rendre(w) { return el('hr', { class: 'rendu-separateur rendu-separateur--' + w.contenu.style }); },
      champs(w) {
        return [champSelect('Style', ['ligne', 'pointille'], w.contenu.style, (v) => { w.contenu.style = v; rendrePage(); })];
      },
    },
    espaceur: {
      label: 'Espaceur', icone: '↕️',
      defaut: () => ({ hauteur: 40 }),
      rendre(w) { return el('div', { style: { height: w.contenu.hauteur + 'px' } }); },
      champs(w) {
        return [champNombre('Hauteur (px)', w.contenu.hauteur, (v) => { w.contenu.hauteur = v; rendrePage(); })];
      },
    },
    icone_bloc: {
      label: 'Icon Box', icone: '⭐',
      defaut: () => ({ icone: '★', titre: 'Titre de la fonctionnalité', texte: 'Décrivez ici le bénéfice pour votre visiteur.' }),
      rendre(w) {
        return el('div', { class: 'rendu-iconebox' },
          el('span', { class: 'rendu-iconebox__icone' }, w.contenu.icone),
          el('div', {}, el('h4', {}, w.contenu.titre), el('p', {}, w.contenu.texte)));
      },
      champs(w) {
        return [
          champTexte('Icône (emoji)', w.contenu.icone, (v) => { w.contenu.icone = v; rendrePage(); }),
          champTexte('Titre', w.contenu.titre, (v) => { w.contenu.titre = v; rendrePage(); }),
          champTextarea('Texte', w.contenu.texte, (v) => { w.contenu.texte = v; rendrePage(); }),
        ];
      },
    },
    image_bloc: {
      label: 'Image Box', icone: '🏞️',
      defaut: () => ({ src: 'https://images.unsplash.com/photo-1528712306091-ed0763094c98?w=500&q=80', titre: 'Titre', texte: 'Description courte de cet élément.' }),
      rendre(w) {
        return el('div', { class: 'rendu-imagebox' },
          el('img', { src: w.contenu.src, alt: w.contenu.titre }),
          el('h4', {}, w.contenu.titre), el('p', {}, w.contenu.texte));
      },
      champs(w) {
        return [
          champTexte("Adresse de l'image", w.contenu.src, (v) => { w.contenu.src = v; rendrePage(); }),
          champTexte('Titre', w.contenu.titre, (v) => { w.contenu.titre = v; rendrePage(); }),
          champTextarea('Texte', w.contenu.texte, (v) => { w.contenu.texte = v; rendrePage(); }),
        ];
      },
    },
    temoignage: {
      label: 'Témoignage', icone: '💬',
      defaut: () => ({ texte: '« Un produit qui a changé notre façon de travailler. »', auteur: 'Claire Dupont', role: 'Fondatrice, Le Fournil', avatar: 'https://i.pravatar.cc/80?img=5' }),
      rendre(w) {
        return el('div', { class: 'rendu-temoignage' },
          el('p', { class: 'rendu-temoignage__texte' }, w.contenu.texte),
          el('div', { class: 'rendu-temoignage__auteur' },
            el('img', { src: w.contenu.avatar, alt: w.contenu.auteur }),
            el('span', {}, el('div', { class: 'rendu-temoignage__nom' }, w.contenu.auteur), el('div', { class: 'rendu-temoignage__role' }, w.contenu.role))));
      },
      champs(w) {
        return [
          champTextarea('Citation', w.contenu.texte, (v) => { w.contenu.texte = v; rendrePage(); }),
          champTexte('Auteur', w.contenu.auteur, (v) => { w.contenu.auteur = v; rendrePage(); }),
          champTexte('Rôle', w.contenu.role, (v) => { w.contenu.role = v; rendrePage(); }),
          champTexte('Avatar (URL)', w.contenu.avatar, (v) => { w.contenu.avatar = v; rendrePage(); }),
        ];
      },
    },
    onglets: {
      label: 'Onglets', icone: '🗂️',
      defaut: () => ({ actif: 0, items: [{ titre: 'Onglet 1', contenu: 'Contenu du premier onglet.' }, { titre: 'Onglet 2', contenu: 'Contenu du second onglet.' }] }),
      rendre(w) {
        const entetes = el('div', { class: 'rendu-onglets__entetes' });
        w.contenu.items.forEach((it, i) => {
          entetes.appendChild(el('button', { onclick: () => { w.contenu.actif = i; rendrePage(); } }, it.titre));
        });
        Array.from(entetes.children).forEach((b, i) => { if (i === w.contenu.actif) b.classList.add('actif'); });
        const corps = el('div', { class: 'rendu-onglets__corps' }, w.contenu.items[w.contenu.actif]?.contenu || '');
        return el('div', {}, entetes, corps);
      },
      champs(w) {
        const c = [];
        w.contenu.items.forEach((it, i) => {
          c.push(champTexte(`Titre onglet ${i + 1}`, it.titre, (v) => { it.titre = v; rendrePage(); }));
          c.push(champTextarea(`Contenu onglet ${i + 1}`, it.contenu, (v) => { it.contenu = v; rendrePage(); }));
        });
        return c;
      },
    },
    accordeon: {
      label: 'Accordéon', icone: '📚',
      defaut: () => ({ ouvert: 0, items: [{ titre: 'Question 1', contenu: 'Réponse à la première question.' }, { titre: 'Question 2', contenu: 'Réponse à la seconde question.' }] }),
      rendre(w) {
        const conteneur = el('div', {});
        w.contenu.items.forEach((it, i) => {
          const ouvert = i === w.contenu.ouvert;
          conteneur.appendChild(el('div', { class: 'rendu-accordeon__item' },
            el('button', { class: 'rendu-accordeon__entete', onclick: () => { w.contenu.ouvert = ouvert ? -1 : i; rendrePage(); } }, it.titre, el('span', {}, ouvert ? '−' : '+')),
            ouvert ? el('div', { class: 'rendu-accordeon__corps' }, it.contenu) : null));
        });
        return conteneur;
      },
      champs(w) {
        const c = [];
        w.contenu.items.forEach((it, i) => {
          c.push(champTexte(`Titre ${i + 1}`, it.titre, (v) => { it.titre = v; rendrePage(); }));
          c.push(champTextarea(`Réponse ${i + 1}`, it.contenu, (v) => { it.contenu = v; rendrePage(); }));
        });
        return c;
      },
    },
    compteur: {
      label: 'Compteur', icone: '🔢',
      defaut: () => ({ valeur: 120, suffixe: '+', libelle: 'Clients satisfaits' }),
      rendre(w) {
        return el('div', { class: 'rendu-compteur' },
          el('div', { class: 'rendu-compteur__valeur' }, w.contenu.valeur + w.contenu.suffixe),
          el('div', { class: 'rendu-compteur__libelle' }, w.contenu.libelle));
      },
      champs(w) {
        return [
          champNombre('Valeur', w.contenu.valeur, (v) => { w.contenu.valeur = v; rendrePage(); }),
          champTexte('Suffixe', w.contenu.suffixe, (v) => { w.contenu.suffixe = v; rendrePage(); }),
          champTexte('Libellé', w.contenu.libelle, (v) => { w.contenu.libelle = v; rendrePage(); }),
        ];
      },
    },
    barre_progression: {
      label: 'Progression', icone: '📊',
      defaut: () => ({ pourcentage: 70, libelle: 'Compétence' }),
      rendre(w) {
        return el('div', {},
          el('div', { class: 'rendu-barre-progression__libelle' }, el('span', {}, w.contenu.libelle), el('span', {}, w.contenu.pourcentage + '%')),
          el('div', { class: 'rendu-barre-progression__piste' }, el('div', { class: 'rendu-barre-progression__remplissage', style: { width: w.contenu.pourcentage + '%' } })));
      },
      champs(w) {
        return [
          champTexte('Libellé', w.contenu.libelle, (v) => { w.contenu.libelle = v; rendrePage(); }),
          champNombre('Pourcentage', w.contenu.pourcentage, (v) => { w.contenu.pourcentage = v; rendrePage(); }),
        ];
      },
    },
    reseaux_sociaux: {
      label: 'Réseaux sociaux', icone: '🔗',
      defaut: () => ({ liens: [{ reseau: 'Facebook', url: '#' }, { reseau: 'Instagram', url: '#' }, { reseau: 'LinkedIn', url: '#' }] }),
      rendre(w) {
        const conteneur = el('div', { class: 'rendu-reseaux' });
        w.contenu.liens.forEach((l) => conteneur.appendChild(el('a', { href: l.url, onclick: (e) => e.preventDefault() }, l.reseau.slice(0, 2))));
        return conteneur;
      },
      champs(w) {
        const c = [];
        w.contenu.liens.forEach((l, i) => {
          c.push(champTexte(`Réseau ${i + 1}`, l.reseau, (v) => { l.reseau = v; rendrePage(); }));
          c.push(champTexte(`Lien ${i + 1}`, l.url, (v) => { l.url = v; rendrePage(); }));
        });
        return c;
      },
    },
  };

  function alignCss(a) { return a === 'centre' ? 'center' : a === 'droite' ? 'right' : 'left'; }

  // -------------------------------------------------- champs de formulaire (panneau)

  function champTexte(label, valeur, onChange) {
    const input = el('input', { type: 'text', value: valeur ?? '' });
    input.addEventListener('input', () => onChange(input.value));
    return el('div', { class: 'champ' }, el('label', {}, label), input);
  }
  function champNombre(label, valeur, onChange) {
    const input = el('input', { type: 'number', value: valeur ?? 0 });
    input.addEventListener('input', () => onChange(Number(input.value)));
    return el('div', { class: 'champ' }, el('label', {}, label), input);
  }
  function champTextarea(label, valeur, onChange) {
    const input = el('textarea', {}, valeur ?? '');
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
  function champCouleur(label, valeur, onChange) {
    const input = el('input', { type: 'color', value: valeur || '#000000' });
    input.addEventListener('input', () => onChange(input.value));
    return el('div', { class: 'champ' }, el('label', {}, label), input);
  }
  function champBouton(label, onClick) {
    return el('button', { class: 'champ-bouton', onclick: onClick }, label);
  }
  function champAide(html) {
    return el('div', { class: 'champ-aide', html });
  }
  function champToggle(label, valeur, onChange) {
    const sw = el('div', { class: 'champ-toggle__switch' + (valeur ? ' actif' : '') });
    sw.addEventListener('click', () => { onChange(!valeur); });
    return el('div', { class: 'champ-toggle' }, el('span', { class: 'champ-toggle__libelle' }, label), sw);
  }
  function champIcones(label, options, valeur, onChange) {
    const rangee = el('div', { class: 'champ-icones' });
    options.forEach((o) => {
      const b = el('button', { class: o.valeur === valeur ? 'actif' : '', title: o.titre || '', onclick: () => onChange(o.valeur) }, o.icone);
      rangee.appendChild(b);
    });
    return el('div', { class: 'champ' }, el('label', {}, label), rangee);
  }
  function champMarges(label, obj, unite) {
    const cles = ['haut', 'droite', 'bas', 'gauche'];
    const libelles = ['Haut', 'Droite', 'Bas', 'Gauche'];
    let lie = false;
    const grille = el('div', { class: 'champ-marges__grille' });
    const inputs = [];
    cles.forEach((c, i) => {
      const input = el('input', { type: 'number', value: obj[c] ?? '' });
      input.addEventListener('input', () => {
        const v = input.value === '' ? null : Number(input.value);
        if (lie) { cles.forEach((cc) => { obj[cc] = v; }); inputs.forEach((ii) => { ii.value = v ?? ''; }); }
        else obj[c] = v;
        rendrePage();
      });
      inputs.push(input);
      grille.appendChild(input);
    });
    const lienBtn = el('button', { class: 'champ-marges__lien', type: 'button', title: 'Lier les 4 côtés' }, '🔗');
    lienBtn.addEventListener('click', () => { lie = !lie; lienBtn.classList.toggle('actif', lie); });
    grille.appendChild(lienBtn);
    const libellesRow = el('div', { class: 'champ-marges__libelles' });
    libelles.forEach((l) => libellesRow.appendChild(el('span', {}, l)));
    libellesRow.appendChild(el('span', {}, ''));
    return el('div', { class: 'champ' },
      el('div', { class: 'champ-marges__entete' }, el('label', { style: { margin: 0 } }, label), el('div', { class: 'champ-marges__unites' }, el('span', { class: 'actif' }, unite[0]), ...unite.slice(1).map((u) => el('span', {}, u)))),
      grille, libellesRow);
  }

  let compteurAccordions = 0;
  function champAccordion(titre, ouvertParDefaut, ...enfants) {
    const idAcc = 'acc' + (compteurAccordions++);
    let ouvert = ouvertParDefaut;
    const corps = el('div', { class: 'accordion__corps' + (ouvert ? '' : ' accordion__corps--ferme') }, ...enfants);
    const chevron = el('span', { class: 'accordion__chevron' }, '▸');
    const entete = el('button', { class: 'accordion__entete', type: 'button' }, titre, chevron);
    entete.addEventListener('click', () => {
      ouvert = !ouvert;
      corps.classList.toggle('accordion__corps--ferme', !ouvert);
      conteneur.classList.toggle('ouvert', ouvert);
    });
    const conteneur = el('div', { class: 'accordion' + (ouvert ? ' ouvert' : '') }, entete, corps);
    return conteneur;
  }

  // -------------------------------------------------- modèle de page

  function noeudVide() { return { style: {}, avance: {}, libre: null }; }

  function creerColonne(poids) {
    return { id: uid(), type: 'colonne', ...noeudVide(), contenu: { largeur: null, poids: poids || 1, positionContenu: 'defaut' }, widgets: [] };
  }
  function creerSection(poidsColonnes) {
    const poids = poidsColonnes && poidsColonnes.length ? poidsColonnes : [1];
    return {
      id: uid(), type: 'section', ...noeudVide(),
      miseEnPage: { etirer: false, largeurContenu: 'encadre', largeurValeur: 1140, ecartColonnes: 'aucun', hauteur: 'defaut', positionContenu: 'defaut' },
      colonnes: poids.map((p) => creerColonne(p)),
    };
  }
  function creerWidget(type) {
    return { id: uid(), type, ...noeudVide(), contenu: WIDGETS[type].defaut() };
  }

  // -------------------------------------------------- structures proposées (modale "Sélectionnez votre structure")

  const STRUCTURES = [
    [1], [1, 1], [1, 1, 1], [2, 1, 1], [2, 1], [1],
    [1, 1], [1, 2], [1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 2],
  ];

  // -------------------------------------------------- modèles prédéfinis (bibliothèque)

  function modeleTitreTexteBouton() {
    const s = creerSection([1]);
    const titre = creerWidget('titre'); titre.contenu.texte = 'Bienvenue sur votre page'; titre.contenu.alignement = 'centre';
    const texte = creerWidget('texte'); texte.contenu.html = 'Un paragraphe de présentation, à adapter selon votre contenu.';
    const bouton = creerWidget('bouton');
    s.colonnes[0].widgets.push(titre, texte, bouton);
    return s;
  }
  function modeleTroisIconBox() {
    const s = creerSection([1, 1, 1]);
    const textes = [['⚡', 'Rapide'], ['🔒', 'Sécurisé'], ['💶', 'Sans abonnement']];
    s.colonnes.forEach((c, i) => {
      const ib = creerWidget('icone_bloc');
      ib.contenu.icone = textes[i][0]; ib.contenu.titre = textes[i][1];
      ib.contenu.texte = 'Décrivez ici le bénéfice pour votre visiteur.';
      c.widgets.push(ib);
    });
    return s;
  }
  function modeleTemoignage() {
    const s = creerSection([1]);
    s.colonnes[0].widgets.push(creerWidget('temoignage'));
    return s;
  }
  function modeleImageTexte() {
    const s = creerSection([1, 1]);
    const img = creerWidget('image');
    const titre = creerWidget('titre'); titre.contenu.texte = 'Présentez votre activité';
    const texte = creerWidget('texte'); texte.contenu.html = 'Expliquez ici ce qui rend votre offre unique.';
    s.colonnes[0].widgets.push(img);
    s.colonnes[1].widgets.push(titre, texte);
    return s;
  }
  function modeleCompteurs() {
    const s = creerSection([1, 1, 1, 1]);
    const vals = [[15, 'Ans d’activité'], [1200, 'Clients'], [98, '% satisfaits'], [24, 'Pays livrés']];
    s.colonnes.forEach((c, i) => {
      const cpt = creerWidget('compteur');
      cpt.contenu.valeur = vals[i][0]; cpt.contenu.libelle = vals[i][1]; cpt.contenu.suffixe = i === 2 ? '%' : '+';
      c.widgets.push(cpt);
    });
    return s;
  }

  const TEMPLATES = [
    { id: 'tpl1', nom: 'Titre + texte + bouton', type: 'Section', icone: '🧱', fabrique: modeleTitreTexteBouton },
    { id: 'tpl2', nom: 'Trois atouts', type: 'Section', icone: '⭐', fabrique: modeleTroisIconBox },
    { id: 'tpl3', nom: 'Témoignage client', type: 'Section', icone: '💬', fabrique: modeleTemoignage },
    { id: 'tpl4', nom: 'Image et texte', type: 'Section', icone: '🖼️', fabrique: modeleImageTexte },
    { id: 'tpl5', nom: 'Chiffres clés', type: 'Section', icone: '🔢', fabrique: modeleCompteurs },
    { id: 'tpl6', nom: 'Page — Contact', type: 'Page', icone: '✉️', fabrique: modeleTitreTexteBouton },
    { id: 'tpl7', nom: 'Page — À propos', type: 'Page', icone: '📄', fabrique: modeleImageTexte },
    { id: 'tpl8', nom: 'Bannière promo', type: 'Section', icone: '🏷️', fabrique: modeleTitreTexteBouton },
  ];

  function pageInitiale() {
    const section = creerSection([1]);
    const colonne = section.colonnes[0];
    const titre = creerWidget('titre');
    titre.contenu.texte = 'Bienvenue dans le constructeur';
    const texte = creerWidget('texte');
    texte.contenu.html = "Faites glisser des éléments depuis la bibliothèque à gauche. Cliquez sur un bloc pour le modifier, ou agrippez un de ses coins (redimensionner) ou un de ses bords (déplacer librement).";
    const bouton = creerWidget('bouton');
    colonne.widgets.push(titre, texte, bouton);
    return { sections: [section] };
  }

  const state = {
    page: pageInitiale(), selection: null, ongletActif: null, mode: 'edition',
    modaleStructure: null, // { sectionCible: id|null }
    modaleBibliotheque: null, // { cible: colonne|null, onglet: 'predefinis'|'liste' }
  };

  function trouver(type, id) {
    for (const section of state.page.sections) {
      if (type === 'section' && section.id === id) return { noeud: section, parent: null };
      for (const colonne of section.colonnes) {
        if (type === 'colonne' && colonne.id === id) return { noeud: colonne, parent: section };
        for (const widget of colonne.widgets) {
          if (type === 'widget' && widget.id === id) return { noeud: widget, parent: colonne };
        }
      }
    }
    return { noeud: null, parent: null };
  }
  function trouverParentSection(colonneId) {
    return state.page.sections.find((s) => s.colonnes.some((c) => c.id === colonneId)) || null;
  }

  function cloner(noeud) {
    const copie = JSON.parse(JSON.stringify(noeud));
    (function reassigner(n) {
      n.id = uid();
      if (n.colonnes) n.colonnes.forEach(reassigner);
      if (n.widgets) n.widgets.forEach(reassigner);
    })(copie);
    return copie;
  }

  // -------------------------------------------------- actions de structure

  function ongletsPourType(type) {
    if (type === 'section') return [['mise-en-page', 'Mise en page'], ['style', 'Style'], ['avance', 'Avancé']];
    if (type === 'colonne') return [['style', 'Style'], ['avance', 'Avancé']];
    return [['contenu', 'Contenu'], ['style', 'Style'], ['avance', 'Avancé']];
  }

  function creerSectionDepuisStructure(poids, sectionCible) {
    if (sectionCible) {
      const { noeud } = trouver('section', sectionCible);
      if (noeud) { noeud.colonnes = poids.map((p) => creerColonne(p)); rendrePage(); return; }
    }
    state.page.sections.push(creerSection(poids));
    rendrePage();
  }
  function insererModele(template, cible) {
    const section = template.fabrique();
    if (cible && cible.sectionCible) {
      const { noeud } = trouver('section', cible.sectionCible);
      if (noeud) { noeud.colonnes = section.colonnes; rendrePage(); fermerModaleBibliotheque(); return; }
    }
    state.page.sections.push(section);
    fermerModaleBibliotheque();
    rendrePage();
  }
  function ajouterColonne(section) {
    section.colonnes.push(creerColonne());
    rendrePage();
  }
  function dupliquer(type, id) {
    const { noeud, parent } = trouver(type, id);
    if (!noeud) return;
    const copie = cloner(noeud);
    if (type === 'section') {
      const i = state.page.sections.indexOf(noeud);
      state.page.sections.splice(i + 1, 0, copie);
    } else if (type === 'colonne') {
      const i = parent.colonnes.indexOf(noeud);
      parent.colonnes.splice(i + 1, 0, copie);
    } else {
      const i = parent.widgets.indexOf(noeud);
      parent.widgets.splice(i + 1, 0, copie);
    }
    rendrePage();
  }
  function supprimer(type, id) {
    const { noeud, parent } = trouver(type, id);
    if (!noeud) return;
    if (type === 'section') {
      state.page.sections = state.page.sections.filter((s) => s.id !== id);
    } else if (type === 'colonne') {
      parent.colonnes = parent.colonnes.filter((c) => c.id !== id);
    } else {
      parent.widgets = parent.widgets.filter((w) => w.id !== id);
    }
    if (state.selection && state.selection.id === id) { state.selection = null; rafraichirPanneau(); }
    rendrePage();
  }

  function selectionner(type, id) {
    state.selection = { type, id };
    state.ongletActif = ongletsPourType(type)[0][0];
    rafraichirPanneau();
    rendrePage();
  }
  function deselectionner() {
    state.selection = null;
    rafraichirPanneau();
    rendrePage();
  }

  function basculerMode() {
    state.mode = state.mode === 'edition' ? 'apercu' : 'edition';
    if (state.mode === 'apercu') state.selection = null;
    document.querySelector('.atelier').classList.toggle('mode-apercu', state.mode === 'apercu');
    document.getElementById('toile-conteneur').classList.toggle('mode-apercu', state.mode === 'apercu');
    const btn = document.getElementById('bouton-mode');
    btn.textContent = state.mode === 'apercu' ? '✎ Revenir à l’édition' : '👁 Aperçu';
    btn.classList.toggle('actif', state.mode === 'apercu');
    rafraichirPanneau();
    rendrePage();
  }
  function editerDepuisApercu(type, id) {
    state.mode = 'edition';
    document.querySelector('.atelier').classList.remove('mode-apercu');
    document.getElementById('toile-conteneur').classList.remove('mode-apercu');
    const btn = document.getElementById('bouton-mode');
    btn.textContent = '👁 Aperçu';
    btn.classList.remove('actif');
    selectionner(type, id);
  }

  // -------------------------------------------------- style commun (section/colonne/widget)

  function appliquerStyleCommun(dom, noeud) {
    const s = noeud.style || {};
    if (s.couleur) dom.style.color = s.couleur;
    if (s.fond) dom.style.backgroundColor = s.fond;
    if (s.taillePolice) dom.style.fontSize = s.taillePolice + 'px';
    if (s.alignementTexte) dom.style.textAlign = alignCss(s.alignementTexte);
    const a = noeud.avance || {};
    const m = a.marge || {};
    const p = a.margeInterne || {};
    if (m.haut != null) dom.style.marginTop = m.haut + 'px';
    if (m.droite != null) dom.style.marginRight = m.droite + 'px';
    if (m.bas != null) dom.style.marginBottom = m.bas + 'px';
    if (m.gauche != null) dom.style.marginLeft = m.gauche + 'px';
    if (p.haut != null || p.droite != null || p.bas != null || p.gauche != null) {
      dom.style.paddingTop = (p.haut ?? 0) + 'px';
      dom.style.paddingRight = (p.droite ?? 0) + 'px';
      dom.style.paddingBottom = (p.bas ?? 0) + 'px';
      dom.style.paddingLeft = (p.gauche ?? 0) + 'px';
    }
    if (a.classe) a.classe.split(/\s+/).filter(Boolean).forEach((c) => dom.classList.add(c));
  }

  function appliquerLibre(dom, noeud) {
    if (!noeud.libre) return;
    dom.style.position = 'absolute';
    dom.style.left = noeud.libre.x + 'px';
    dom.style.top = noeud.libre.y + 'px';
    dom.style.width = noeud.libre.w + 'px';
    dom.style.height = noeud.libre.h + 'px';
    dom.style.overflow = 'visible';
  }

  // fil d'ariane flottant : segment actif (foncé, avec icônes) + segment(s) parent (clair, cliquable)
  function filAriane(type, id, label, parent) {
    const actif = el('div', { class: 'fil-ariane__actif' },
      el('span', { class: 'fil-ariane__label' }, label),
      el('button', { title: 'Dupliquer', onclick: (e) => { e.stopPropagation(); dupliquer(type, id); } }, '⧉'),
      el('button', { title: 'Enregistrer' }, '🔖'),
      el('button', { title: 'Supprimer', onclick: (e) => { e.stopPropagation(); supprimer(type, id); } }, '✕'));
    const segments = [actif];
    if (parent) {
      segments.push(el('button', { class: 'fil-ariane__parent', onclick: (e) => { e.stopPropagation(); selectionner(parent.type, parent.id); } }, parent.label + ' ›'));
    }
    return el('div', { class: 'fil-ariane' }, ...segments);
  }

  // -------------------------------------------------- rendu

  function estSelectionne(type, id) {
    return !!state.selection && state.selection.type === type && state.selection.id === id;
  }

  function affordanceApercu(type, id) {
    const pastille = el('div', { class: 'ce-affordance__pastille', onclick: (e) => { e.stopPropagation(); editerDepuisApercu(type, id); } },
      '☰', el('span', { class: 'ce-infobulle' }, 'Modifier avec Creative Elements'));
    return el('div', { class: 'ce-affordance' }, el('div', { class: 'ce-affordance__ligne' }), pastille);
  }

  function rendreSection(section) {
    const div = el('div', {
      class: 'bloc bloc--section' + (estSelectionne('section', section.id) ? ' selectionne' : ''),
      'data-type': 'section', 'data-id': section.id,
      onclick: (e) => { e.stopPropagation(); if (state.mode === 'edition') selectionner('section', section.id); },
    });
    appliquerStyleCommun(div, section);
    appliquerLibre(div, section);
    if (section.miseEnPage && section.miseEnPage.largeurContenu === 'encadre') {
      div.style.maxWidth = (section.miseEnPage.largeurValeur || 1140) + 'px';
      div.style.marginLeft = 'auto'; div.style.marginRight = 'auto';
    }
    if (state.mode === 'edition') div.appendChild(filAriane('section', section.id, 'Section', null));
    else div.appendChild(affordanceApercu('section', section.id));
    const colonnes = el('div', { class: 'section__colonnes' });
    if (section.miseEnPage && section.miseEnPage.ecartColonnes === 'aucun') colonnes.style.gap = '0';
    const estVide = section.colonnes.length === 1 && section.colonnes[0].widgets.length === 0;
    section.colonnes.forEach((c) => colonnes.appendChild(rendreColonne(c, estVide, section.id)));
    div.appendChild(colonnes);
    return div;
  }

  function rendreColonne(colonne, estSectionVide, sectionId) {
    const div = el('div', {
      class: 'bloc bloc--colonne' + (estSelectionne('colonne', colonne.id) ? ' selectionne' : ''),
      'data-type': 'colonne', 'data-id': colonne.id,
      onclick: (e) => { e.stopPropagation(); if (state.mode === 'edition') selectionner('colonne', colonne.id); },
    });
    appliquerStyleCommun(div, colonne);
    appliquerLibre(div, colonne);
    if (!colonne.libre) {
      if (colonne.contenu.largeur) div.style.flex = `0 0 ${colonne.contenu.largeur}%`;
      else div.style.flex = `${colonne.contenu.poids || 1} ${colonne.contenu.poids || 1} 0`;
    }
    if (colonne.contenu.positionContenu && colonne.contenu.positionContenu !== 'defaut') {
      div.style.alignItems = colonne.contenu.positionContenu === 'haut' ? 'flex-start' : colonne.contenu.positionContenu === 'bas' ? 'flex-end' : 'center';
    }
    if (state.mode === 'edition') div.appendChild(filAriane('colonne', colonne.id, 'Colonne', { type: 'section', id: sectionId, label: 'Section' }));

    if (estSectionVide && state.mode === 'edition') {
      const widgets = el('div', { class: 'colonne__widgets' });
      brancherDepot(widgets, colonne);
      widgets.appendChild(el('div', { class: 'placeholder-vide' },
        el('div', { class: 'placeholder-vide__boutons' },
          el('button', { class: 'placeholder-vide__ajouter-section', onclick: (e) => { e.stopPropagation(); ouvrirModaleStructure(sectionId); } }, 'AJOUTER UNE NOUVELLE SECTION'),
          el('button', { class: 'placeholder-vide__ajouter-modele', onclick: (e) => { e.stopPropagation(); ouvrirModaleBibliotheque({ sectionCible: sectionId }); } }, 'AJOUTER UN MODÈLE')),
        el('div', { class: 'placeholder-vide__ou' }, 'Ou glissez un widget ici')));
      div.appendChild(widgets);
      return div;
    }

    const widgets = el('div', { class: 'colonne__widgets' });
    colonne.widgets.forEach((w) => widgets.appendChild(rendreWidget(w, colonne.id)));
    brancherDepot(widgets, colonne);
    div.appendChild(widgets);
    return div;
  }

  function rendreWidget(widget, colonneId) {
    const def = WIDGETS[widget.type];
    const div = el('div', {
      class: 'bloc bloc--widget' + (estSelectionne('widget', widget.id) ? ' selectionne' : ''),
      'data-type': 'widget', 'data-id': widget.id,
      onclick: (e) => { e.stopPropagation(); if (state.mode === 'edition') selectionner('widget', widget.id); },
    });
    appliquerStyleCommun(div, widget);
    appliquerLibre(div, widget);
    if (state.mode === 'edition') div.appendChild(filAriane('widget', widget.id, def.label, { type: 'colonne', id: colonneId, label: 'Colonne' }));
    div.appendChild(def.rendre(widget));
    return div;
  }

  function rendrePage() {
    const toile = document.getElementById('toile');
    toile.innerHTML = '';
    state.page.sections.forEach((s) => toile.appendChild(rendreSection(s)));
    rafraichirPoignees();
  }

  // -------------------------------------------------- glisser-déposer depuis la bibliothèque

  function brancherDepot(conteneurWidgets, colonne) {
    conteneurWidgets.addEventListener('dragover', (e) => {
      if (state.mode !== 'edition') return;
      e.preventDefault();
      conteneurWidgets.classList.add('survol-depot');
    });
    conteneurWidgets.addEventListener('dragleave', () => conteneurWidgets.classList.remove('survol-depot'));
    conteneurWidgets.addEventListener('drop', (e) => {
      if (state.mode !== 'edition') return;
      e.preventDefault();
      conteneurWidgets.classList.remove('survol-depot');
      const type = e.dataTransfer.getData('text/widget-type');
      if (!type || !WIDGETS[type]) return;
      const nouveau = creerWidget(type);
      const enfants = Array.from(conteneurWidgets.querySelectorAll(':scope > .bloc--widget'));
      let index = colonne.widgets.length;
      for (let i = 0; i < enfants.length; i++) {
        const r = enfants[i].getBoundingClientRect();
        if (e.clientY < r.top + r.height / 2) { index = i; break; }
      }
      colonne.widgets.splice(index, 0, nouveau);
      selectionner('widget', nouveau.id);
    });
  }

  // -------------------------------------------------- panneau gauche : bibliothèque ou propriétés

  function rendreBibliotheque() {
    const grille = el('div', { class: 'grille-widgets' });
    Object.keys(WIDGETS).forEach((type) => {
      const def = WIDGETS[type];
      const tuile = el('div', {
        class: 'tuile-widget', draggable: 'true',
        ondragstart: (e) => e.dataTransfer.setData('text/widget-type', type),
      }, el('span', { class: 'tuile-widget__icone' }, def.icone), el('span', { class: 'tuile-widget__label' }, def.label));
      grille.appendChild(tuile);
    });
    return el('div', {},
      el('div', { class: 'panneau__entete' }, el('input', { class: 'panneau__recherche', placeholder: 'Rechercher un élément…', type: 'text' })),
      grille);
  }

  // ---- onglet "Contenu" (widgets) / "Mise en page" (section seulement)

  function champsContenuSection(section) {
    const mp = section.miseEnPage;
    const nbColonnes = section.colonnes.length;
    return [
      champToggle('Étirer la section', mp.etirer, (v) => { mp.etirer = v; rafraichirPanneau(); rendrePage(); }),
      champAide('Étire la section en pleine largeur en utilisant JS. <a href="#" onclick="return false">En savoir plus.</a>'),
      champSelect('Largeur du contenu', [{ valeur: 'encadre', label: 'Encadré' }, { valeur: 'pleine', label: 'Pleine largeur' }], mp.largeurContenu, (v) => { mp.largeurContenu = v; rendrePage(); }),
      (() => {
        const input = el('input', { type: 'range', min: 600, max: 1600, step: 10, value: mp.largeurValeur || 1140 });
        input.addEventListener('input', () => { mp.largeurValeur = Number(input.value); rendrePage(); });
        return el('div', { class: 'champ' }, input);
      })(),
      champSelect('Écart de colonnes', [{ valeur: 'aucun', label: 'Aucun écart' }, { valeur: 'defaut', label: 'Par défaut' }], mp.ecartColonnes, (v) => { mp.ecartColonnes = v; rendrePage(); }),
      champSelect('Hauteur', [{ valeur: 'defaut', label: 'Par défaut' }, { valeur: 'plein-ecran', label: 'Plein écran' }], mp.hauteur, (v) => { mp.hauteur = v; rendrePage(); }),
      champSelect('Position du contenu', [{ valeur: 'defaut', label: 'Par défaut' }, { valeur: 'haut', label: 'Haut' }, { valeur: 'milieu', label: 'Milieu' }, { valeur: 'bas', label: 'Bas' }], mp.positionContenu, (v) => { mp.positionContenu = v; rendrePage(); }),
      el('div', { class: 'champ' }, el('label', {}, 'Structure'),
        el('div', { class: 'champ-structure' },
          el('div', { class: 'champ-structure__apercu' }, ...section.colonnes.map(() => el('span'))),
          el('button', { class: 'champ-structure__reinit', type: 'button', onclick: () => { section.colonnes = [creerColonne()]; rendrePage(); rafraichirPanneau(); } }, 'Réinitialiser la structure'))),
      champBouton('+ Ajouter une colonne', () => { ajouterColonne(section); rafraichirPanneau(); }),
    ];
  }

  // ---- onglet "Style"

  function champsStyleSection(section) {
    const s = section.style;
    return [
      champAccordion('Arrière-plan', false,
        champIcones('Type d’arrière-plan', [{ valeur: 'aucun', icone: '⃠', titre: 'Aucun' }, { valeur: 'couleur', icone: '🖌️', titre: 'Couleur' }, { valeur: 'degrade', icone: '▥', titre: 'Dégradé' }, { valeur: 'video', icone: '🎥', titre: 'Vidéo' }], s.typeArrierePlan || 'aucun', (v) => { s.typeArrierePlan = v; rafraichirPanneau(); rendrePage(); }),
        s.typeArrierePlan === 'couleur' ? champCouleur('Couleur de fond', s.fond, (v) => { s.fond = v; rendrePage(); }) : null),
      champAccordion('Bordure', false,
        champNombre('Épaisseur (px)', s.bordureEpaisseur || '', (v) => { s.bordureEpaisseur = v || null; rendrePage(); }),
        champCouleur('Couleur de bordure', s.bordureCouleur, (v) => { s.bordureCouleur = v; rendrePage(); })),
      champAccordion('Forme de séparation', false,
        (() => {
          const cotes = el('div', { class: 'champ-icones' },
            el('button', { class: (s.formeCote || 'haut') === 'haut' ? 'actif' : '', onclick: () => { s.formeCote = 'haut'; rafraichirPanneau(); } }, 'HAUT'),
            el('button', { class: s.formeCote === 'bas' ? 'actif' : '', onclick: () => { s.formeCote = 'bas'; rafraichirPanneau(); } }, 'BAS'));
          return el('div', { class: 'champ' }, cotes);
        })(),
        champSelect('Type', ['Aucun', 'Mountains', 'Drops', 'Clouds', 'Zigzag', 'Pyramids', 'Triangle', 'Triangle Asymmetrical', 'Tilt', 'Tilt Opacity', 'Fan Opacity', 'Curve', 'Curve Asymmetrical', 'Waves', 'Waves Brush', 'Waves Pattern', 'Arrow', 'Split', 'Book'], s.formeType || 'Aucun', (v) => { s.formeType = v; rendrePage(); })),
      champAccordion('Typographie', false,
        champNombre('Taille de police (px)', s.taillePolice || '', (v) => { s.taillePolice = v || null; rendrePage(); })),
    ];
  }

  function champsStyleColonne(colonne) {
    const s = colonne.style;
    return [
      champAccordion('Arrière-plan & bordure', false,
        champCouleur('Couleur de fond', s.fond, (v) => { s.fond = v; rendrePage(); })),
      champAccordion('Mise en page', true,
        champSelect('Position du contenu', [{ valeur: 'defaut', label: 'Par défaut' }, { valeur: 'haut', label: 'Haut' }, { valeur: 'milieu', label: 'Milieu' }, { valeur: 'bas', label: 'Bas' }], colonne.contenu.positionContenu || 'defaut', (v) => { colonne.contenu.positionContenu = v; rendrePage(); })),
      champAccordion('Typographie', false,
        champNombre('Taille de police (px)', s.taillePolice || '', (v) => { s.taillePolice = v || null; rendrePage(); })),
    ];
  }

  function champsStyleWidget(noeud) {
    const s = noeud.style;
    return [
      champCouleur('Couleur du texte', s.couleur, (v) => { s.couleur = v; rendrePage(); }),
      champCouleur('Couleur de fond', s.fond, (v) => { s.fond = v; rendrePage(); }),
      champNombre('Taille de police (px)', s.taillePolice || '', (v) => { s.taillePolice = v || null; rendrePage(); }),
      champSelect('Alignement du texte', ['gauche', 'centre', 'droite'], s.alignementTexte || 'gauche', (v) => { s.alignementTexte = v; rendrePage(); }),
    ];
  }

  // ---- onglet "Avancé"

  function champsAvanceSection(noeud) {
    const a = noeud.avance;
    a.marge = a.marge || {}; a.margeInterne = a.margeInterne || {};
    return [
      champMarges('Marge', a.marge, ['PX', '%']),
      champMarges('Marge interne', a.margeInterne, ['PX', 'EM', '%']),
      champSelect('Animation d’accueil', ['Aucun', 'Fondu', 'Glissement', 'Zoom'], a.animation || 'Aucun', (v) => { a.animation = v; }),
      champTexte('ID de CSS', a.idCss || '', (v) => { a.idCss = v; rendrePage(); }),
      champTexte('Classes CSS', a.classe || '', (v) => { a.classe = v; rendrePage(); }),
      champAccordion('Responsive', false,
        champToggle('Inverser les colonnes', a.inverserColonnes, (v) => { a.inverserColonnes = v; rafraichirPanneau(); }),
        champAide("Inversion d’ordre des colonnes - Quand l’ordre des colonnes est inversé sur les mobiles, la dernière colonne apparaît en haut et vice-versa."),
        el('div', { class: 'champ', style: { fontWeight: '600', fontSize: '.76rem', textTransform: 'uppercase', color: 'var(--panneau-texte-discret)' } }, 'Visibilité'),
        champAide('Attention: les réglages d’affichage (afficher/masquer pour mobile, tablette ou bureau) ne prendront effet qu’une fois que vous êtes sur l’aperçu ou la page en direct, et pas pendant que vous êtes en mode modification dans le constructeur.'),
        champToggle('Masquer sur ordinateur', a.masquerOrdinateur, (v) => { a.masquerOrdinateur = v; rafraichirPanneau(); }),
        champToggle('Masquer sur tablette', a.masquerTablette, (v) => { a.masquerTablette = v; rafraichirPanneau(); }),
        champToggle('Masquer sur mobile', a.masquerMobile, (v) => { a.masquerMobile = v; rafraichirPanneau(); })),
      champAccordion('CSS personnalisé', false,
        champTextarea('CSS personnalisé', a.cssPerso || '', (v) => { a.cssPerso = v; })),
    ];
  }

  function champsAvanceGenerique(noeud) {
    const a = noeud.avance;
    a.marge = a.marge || {}; a.margeInterne = a.margeInterne || {};
    return [
      champMarges('Marge', a.marge, ['PX', '%']),
      champMarges('Marge interne', a.margeInterne, ['PX', 'EM', '%']),
      champTexte('Classe CSS personnalisée', a.classe || '', (v) => { a.classe = v; rendrePage(); }),
    ];
  }

  function rafraichirPanneau() {
    const panneau = document.getElementById('panneau');
    panneau.innerHTML = '';
    if (!state.selection) { panneau.appendChild(rendreBibliotheque()); return; }
    const { noeud, parent } = trouver(state.selection.type, state.selection.id);
    if (!noeud) { panneau.appendChild(rendreBibliotheque()); return; }
    const type = state.selection.type;
    const label = type === 'widget' ? WIDGETS[noeud.type].label : type === 'colonne' ? 'Colonne' : 'Section';

    const entete = el('div', { class: 'panneau-proprietes__entete' },
      el('button', { class: 'panneau-proprietes__icone-bouton', title: 'Retour', onclick: deselectionner }, '☰'),
      el('span', { class: 'panneau-proprietes__titre' }, 'Modifier ' + label),
      el('button', { class: 'panneau-proprietes__icone-bouton', title: 'Bibliothèque', onclick: deselectionner }, '⊞'));

    const onglets = ongletsPourType(type);
    if (!onglets.some(([cle]) => cle === state.ongletActif)) state.ongletActif = onglets[0][0];
    const ongletsDiv = el('div', { class: 'onglets-panneau' });
    onglets.forEach(([cle, lib]) => {
      ongletsDiv.appendChild(el('button', { class: state.ongletActif === cle ? 'actif' : '', onclick: () => { state.ongletActif = cle; rafraichirPanneau(); } }, lib));
    });

    const champs = el('div', { class: 'champs' });
    let liste;
    if (state.ongletActif === 'mise-en-page') liste = champsContenuSection(noeud);
    else if (state.ongletActif === 'contenu') liste = WIDGETS[noeud.type].champs(noeud);
    else if (state.ongletActif === 'style') liste = type === 'section' ? champsStyleSection(noeud) : type === 'colonne' ? champsStyleColonne(noeud) : champsStyleWidget(noeud);
    else liste = type === 'section' ? champsAvanceSection(noeud) : champsAvanceGenerique(noeud);
    liste.forEach((c) => c && champs.appendChild(c));

    panneau.appendChild(entete);
    panneau.appendChild(ongletsDiv);
    panneau.appendChild(champs);
  }

  // -------------------------------------------------- modale "Sélectionnez votre structure"

  function ouvrirModaleStructure(sectionCible) {
    state.modaleStructure = { sectionCible: sectionCible || null };
    rendreOverlay();
  }
  function fermerModaleStructure() { state.modaleStructure = null; rendreOverlay(); }

  function rendreModaleStructure() {
    const grille = el('div', { class: 'grille-structures' });
    STRUCTURES.forEach((poids, i) => {
      const icone = el('button', { class: 'structure-icone' + (i === 2 ? ' actif' : ''), type: 'button' });
      poids.forEach(() => icone.appendChild(el('span')));
      icone.addEventListener('click', () => { creerSectionDepuisStructure(poids, state.modaleStructure.sectionCible); fermerModaleStructure(); });
      grille.appendChild(icone);
    });
    return el('div', { class: 'modale-fond', onclick: (e) => { if (e.target.classList.contains('modale-fond')) fermerModaleStructure(); } },
      el('div', { class: 'modale-structure' },
        el('button', { class: 'modale-structure__fermer', onclick: fermerModaleStructure }, '✕'),
        el('div', { class: 'modale-structure__titre' }, 'Sélectionnez votre structure'),
        grille));
  }

  // -------------------------------------------------- modale "BIBLIOTHÈQUE"

  function ouvrirModaleBibliotheque(cible) {
    state.modaleBibliotheque = { cible: cible || null, onglet: 'predefinis' };
    rendreOverlay();
  }
  function fermerModaleBibliotheque() { state.modaleBibliotheque = null; rendreOverlay(); }

  function rendreModaleBibliotheque() {
    const mb = state.modaleBibliotheque;
    const onglets = el('div', { class: 'modale-bibliotheque__onglets' },
      el('button', { class: mb.onglet === 'predefinis' ? 'actif' : '', onclick: () => { mb.onglet = 'predefinis'; rendreOverlay(); } }, 'Modèles prédéfinis'),
      el('button', { class: mb.onglet === 'liste' ? 'actif' : '', onclick: () => { mb.onglet = 'liste'; rendreOverlay(); } }, 'Liste de modèles'));

    const entete = el('div', { class: 'modale-bibliotheque__entete' },
      el('div', { class: 'modale-bibliotheque__titre' }, '📑', 'BIBLIOTHÈQUE'),
      onglets,
      el('button', { class: 'modale-bibliotheque__action', title: 'Enregistrer' }, '💾'),
      el('button', { class: 'modale-bibliotheque__action', title: 'Fermer', onclick: fermerModaleBibliotheque }, '✕'));

    let corpsEnfant;
    if (mb.onglet === 'predefinis') {
      const grille = el('div', { class: 'grille-modeles' });
      TEMPLATES.forEach((t) => {
        grille.appendChild(el('div', { class: 'carte-modele', onclick: () => insererModele(t, mb.cible) },
          el('div', { class: 'carte-modele__vignette' }, t.icone),
          el('div', { class: 'carte-modele__legende' }, t.nom)));
      });
      corpsEnfant = grille;
    } else {
      const liste = el('div', {});
      TEMPLATES.forEach((t) => {
        liste.appendChild(el('div', { class: 'liste-modeles__ligne' },
          el('span', { class: 'liste-modeles__icone' }, t.type === 'Page' ? '📄' : '🧱'),
          el('span', { class: 'liste-modeles__nom' }, t.nom),
          el('span', { class: 'liste-modeles__type' }, t.type),
          el('div', { class: 'liste-modeles__actions' },
            el('a', {}, 'Aperçu'), ' · ', el('a', {}, 'Effacer'), ' · ', el('a', {}, 'Exporter'),
            el('button', { class: 'bouton-insertion', onclick: () => insererModele(t, mb.cible) }, 'Insertion'))));
      });
      corpsEnfant = liste;
    }

    return el('div', { class: 'modale-fond', onclick: (e) => { if (e.target.classList.contains('modale-fond')) fermerModaleBibliotheque(); } },
      el('div', { class: 'modale-bibliotheque' }, entete, el('div', { class: 'modale-bibliotheque__corps' }, corpsEnfant)));
  }

  function rendreOverlay() {
    let overlay = document.getElementById('overlay-modales');
    if (!overlay) {
      overlay = el('div', { id: 'overlay-modales' });
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = '';
    if (state.modaleStructure) overlay.appendChild(rendreModaleStructure());
    if (state.modaleBibliotheque) overlay.appendChild(rendreModaleBibliotheque());
  }

  // -------------------------------------------------- poignées : redimensionner (coins) / déplacer (bords)

  function assurerLibre(noeud, dom) {
    if (noeud.libre) return noeud.libre;
    const rDom = dom.getBoundingClientRect();
    const rParent = dom.parentElement.getBoundingClientRect();
    noeud.libre = {
      x: rDom.left - rParent.left + dom.parentElement.scrollLeft,
      y: rDom.top - rParent.top + dom.parentElement.scrollTop,
      w: rDom.width,
      h: rDom.height,
    };
    return noeud.libre;
  }

  function rafraichirPoignees() {
    const poignees = document.getElementById('poignees');
    poignees.innerHTML = '';
    if (state.mode !== 'edition' || !state.selection) return;
    const { type, id } = state.selection;
    const dom = document.querySelector(`[data-type="${type}"][data-id="${id}"]`);
    if (!dom) return;
    const conteneur = document.getElementById('toile-conteneur');
    const rDom = dom.getBoundingClientRect();
    const rConteneur = conteneur.getBoundingClientRect();
    const rect = {
      x: rDom.left - rConteneur.left + conteneur.scrollLeft,
      y: rDom.top - rConteneur.top + conteneur.scrollTop,
      w: rDom.width,
      h: rDom.height,
    };

    const cadre = el('div', { class: 'cadre-selection', style: { left: rect.x + 'px', top: rect.y + 'px', width: rect.w + 'px', height: rect.h + 'px' } });
    poignees.appendChild(cadre);

    const { noeud } = trouver(type, id);

    const coins = { nw: [0, 0], ne: [1, 0], se: [1, 1], sw: [0, 1] };
    const bords = { n: [0.5, 0], e: [1, 0.5], s: [0.5, 1], w: [0, 0.5] };

    function placerPoignee(classe, pos, fx, fy) {
      const p = el('div', { class: classe, 'data-pos': pos, style: { left: (rect.x + fx * rect.w) + 'px', top: (rect.y + fy * rect.h) + 'px' } });
      poignees.appendChild(p);
      p.addEventListener('pointerdown', (e) => demarrerGeste(e, pos, noeud, dom));
    }
    Object.entries(coins).forEach(([pos, [fx, fy]]) => placerPoignee('poignee poignee--coin', pos, fx, fy));
    Object.entries(bords).forEach(([pos, [fx, fy]]) => placerPoignee('poignee poignee--bord', pos, fx, fy));
  }

  function demarrerGeste(e, pos, noeud, dom) {
    e.preventDefault();
    e.stopPropagation();
    const libre = assurerLibre(noeud, dom);
    const depart = { ...libre };
    const souris0 = { x: e.clientX, y: e.clientY };
    const estDeplacement = pos.length === 1; // n/e/s/w = bord = déplacer

    function onMove(ev) {
      const dx = ev.clientX - souris0.x;
      const dy = ev.clientY - souris0.y;
      if (estDeplacement) {
        noeud.libre.x = depart.x + dx;
        noeud.libre.y = depart.y + dy;
      } else {
        if (pos.includes('e')) noeud.libre.w = Math.max(20, depart.w + dx);
        if (pos.includes('s')) noeud.libre.h = Math.max(20, depart.h + dy);
        if (pos.includes('w')) { noeud.libre.w = Math.max(20, depart.w - dx); noeud.libre.x = depart.x + dx; }
        if (pos.includes('n')) { noeud.libre.h = Math.max(20, depart.h - dy); noeud.libre.y = depart.y + dy; }
      }
      rendrePage();
    }
    function onUp() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  // -------------------------------------------------- amorçage

  document.getElementById('bouton-ajouter-section').addEventListener('click', () => ouvrirModaleStructure(null));
  document.getElementById('toile-conteneur').addEventListener('click', deselectionner);
  document.getElementById('bouton-mode').addEventListener('click', basculerMode);
  window.addEventListener('resize', rafraichirPoignees);

  rafraichirPanneau();
  rendrePage();
})();
