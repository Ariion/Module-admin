/**
 * Constructeur — clone du geste Elementor (sections > colonnes > widgets),
 * plus une capacité qui n'existe pas dans Elementor : agripper un coin pour
 * redimensionner, agripper un bord pour déplacer librement n'importe où.
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
    options.forEach((o) => select.appendChild(el('option', { value: o, selected: o === valeur ? 'selected' : undefined }, o)));
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

  // -------------------------------------------------- modèle de page

  function noeudVide() { return { style: {}, avance: {}, libre: null }; }

  function creerColonne() {
    return { id: uid(), type: 'colonne', ...noeudVide(), contenu: { largeur: null }, widgets: [] };
  }
  function creerSection() {
    return { id: uid(), type: 'section', ...noeudVide(), colonnes: [creerColonne()] };
  }
  function creerWidget(type) {
    return { id: uid(), type, ...noeudVide(), contenu: WIDGETS[type].defaut() };
  }

  function pageInitiale() {
    const section = creerSection();
    const colonne = section.colonnes[0];
    const titre = creerWidget('titre');
    titre.contenu.texte = 'Bienvenue dans le constructeur';
    const texte = creerWidget('texte');
    texte.contenu.html = "Faites glisser des éléments depuis la bibliothèque à gauche. Cliquez sur un bloc pour le modifier, ou agrippez un de ses coins (redimensionner) ou un de ses bords (déplacer librement).";
    const bouton = creerWidget('bouton');
    colonne.widgets.push(titre, texte, bouton);
    return { sections: [section] };
  }

  const state = { page: pageInitiale(), selection: null, ongletActif: 'mise-en-page' };

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

  function ajouterSection() {
    state.page.sections.push(creerSection());
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
    if (state.selection && state.selection.id === id) state.selection = null;
    rendrePage();
  }

  function selectionner(type, id) {
    state.selection = { type, id };
    state.ongletActif = 'mise-en-page';
    rafraichirPanneau();
    rendrePage();
  }
  function deselectionner() {
    state.selection = null;
    rafraichirPanneau();
    rendrePage();
  }

  // -------------------------------------------------- style commun (section/colonne/widget)

  function appliquerStyleCommun(dom, noeud) {
    const s = noeud.style || {};
    if (s.couleur) dom.style.color = s.couleur;
    if (s.fond) dom.style.backgroundColor = s.fond;
    if (s.taillePolice) dom.style.fontSize = s.taillePolice + 'px';
    if (s.alignementTexte) dom.style.textAlign = alignCss(s.alignementTexte);
    const a = noeud.avance || {};
    if (a.margeHaut) dom.style.marginTop = a.margeHaut + 'px';
    if (a.margeBas) dom.style.marginBottom = a.margeBas + 'px';
    if (a.remplissage) dom.style.padding = a.remplissage + 'px';
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

  function barreOutils(type, id, label) {
    return el('div', { class: 'barre-flottante' },
      el('span', { class: 'barre-flottante__label' }, label),
      el('button', { title: 'Dupliquer', onclick: (e) => { e.stopPropagation(); dupliquer(type, id); } }, '⧉'),
      el('button', { title: 'Supprimer', onclick: (e) => { e.stopPropagation(); supprimer(type, id); } }, '✕'));
  }

  // -------------------------------------------------- rendu

  function estSelectionne(type, id) {
    return !!state.selection && state.selection.type === type && state.selection.id === id;
  }

  function rendreSection(section) {
    const div = el('div', {
      class: 'bloc bloc--section' + (estSelectionne('section', section.id) ? ' selectionne' : ''),
      'data-type': 'section', 'data-id': section.id,
      onclick: (e) => { e.stopPropagation(); selectionner('section', section.id); },
    });
    appliquerStyleCommun(div, section);
    appliquerLibre(div, section);
    div.appendChild(barreOutils('section', section.id, 'Section'));
    const colonnes = el('div', { class: 'section__colonnes' });
    section.colonnes.forEach((c) => colonnes.appendChild(rendreColonne(c)));
    div.appendChild(colonnes);
    return div;
  }

  function rendreColonne(colonne) {
    const div = el('div', {
      class: 'bloc bloc--colonne' + (estSelectionne('colonne', colonne.id) ? ' selectionne' : ''),
      'data-type': 'colonne', 'data-id': colonne.id,
      onclick: (e) => { e.stopPropagation(); selectionner('colonne', colonne.id); },
    });
    appliquerStyleCommun(div, colonne);
    appliquerLibre(div, colonne);
    if (!colonne.libre && colonne.contenu.largeur) div.style.flex = `0 0 ${colonne.contenu.largeur}%`;
    div.appendChild(barreOutils('colonne', colonne.id, 'Colonne'));
    const widgets = el('div', { class: 'colonne__widgets' });
    colonne.widgets.forEach((w) => widgets.appendChild(rendreWidget(w)));
    brancherDepot(widgets, colonne);
    div.appendChild(widgets);
    return div;
  }

  function rendreWidget(widget) {
    const def = WIDGETS[widget.type];
    const div = el('div', {
      class: 'bloc bloc--widget' + (estSelectionne('widget', widget.id) ? ' selectionne' : ''),
      'data-type': 'widget', 'data-id': widget.id,
      onclick: (e) => { e.stopPropagation(); selectionner('widget', widget.id); },
    });
    appliquerStyleCommun(div, widget);
    appliquerLibre(div, widget);
    div.appendChild(barreOutils('widget', widget.id, def.label));
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
      e.preventDefault();
      conteneurWidgets.classList.add('survol-depot');
    });
    conteneurWidgets.addEventListener('dragleave', () => conteneurWidgets.classList.remove('survol-depot'));
    conteneurWidgets.addEventListener('drop', (e) => {
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

  function champsMiseEnPage(type, noeud) {
    if (type === 'section') {
      return [champBouton('+ Ajouter une colonne', () => ajouterColonne(noeud))];
    }
    if (type === 'colonne') {
      return [champNombre('Largeur (%, vide = auto)', noeud.contenu.largeur || '', (v) => { noeud.contenu.largeur = v || null; rendrePage(); })];
    }
    return WIDGETS[noeud.type].champs(noeud);
  }

  function champsStyle(noeud) {
    const s = noeud.style;
    return [
      champCouleur('Couleur du texte', s.couleur, (v) => { s.couleur = v; rendrePage(); }),
      champCouleur('Couleur de fond', s.fond, (v) => { s.fond = v; rendrePage(); }),
      champNombre('Taille de police (px)', s.taillePolice || '', (v) => { s.taillePolice = v || null; rendrePage(); }),
      champSelect('Alignement du texte', ['gauche', 'centre', 'droite'], s.alignementTexte || 'gauche', (v) => { s.alignementTexte = v; rendrePage(); }),
    ];
  }

  function champsAvance(noeud) {
    const a = noeud.avance;
    return [
      champNombre('Marge haute (px)', a.margeHaut || '', (v) => { a.margeHaut = v || null; rendrePage(); }),
      champNombre('Marge basse (px)', a.margeBas || '', (v) => { a.margeBas = v || null; rendrePage(); }),
      champNombre('Remplissage (px)', a.remplissage || '', (v) => { a.remplissage = v || null; rendrePage(); }),
      champTexte('Classe CSS personnalisée', a.classe || '', (v) => { a.classe = v; rendrePage(); }),
    ];
  }

  function rafraichirPanneau() {
    const panneau = document.getElementById('panneau');
    panneau.innerHTML = '';
    if (!state.selection) { panneau.appendChild(rendreBibliotheque()); return; }
    const { noeud } = trouver(state.selection.type, state.selection.id);
    if (!noeud) { panneau.appendChild(rendreBibliotheque()); return; }
    const label = state.selection.type === 'widget' ? WIDGETS[noeud.type].label
      : state.selection.type === 'colonne' ? 'Colonne' : 'Section';

    const entete = el('div', { class: 'panneau-proprietes__entete' },
      el('button', { class: 'panneau-proprietes__retour', onclick: deselectionner }, '←'),
      el('span', { class: 'panneau-proprietes__titre' }, label));

    const onglets = el('div', { class: 'onglets-panneau' });
    [['mise-en-page', 'Mise en page'], ['style', 'Style'], ['avance', 'Avancé']].forEach(([cle, lib]) => {
      const b = el('button', { class: state.ongletActif === cle ? 'actif' : '', onclick: () => { state.ongletActif = cle; rafraichirPanneau(); } }, lib);
      onglets.appendChild(b);
    });

    const champs = el('div', { class: 'champs' });
    const liste = state.ongletActif === 'mise-en-page' ? champsMiseEnPage(state.selection.type, noeud)
      : state.ongletActif === 'style' ? champsStyle(noeud) : champsAvance(noeud);
    liste.forEach((c) => champs.appendChild(c));

    panneau.appendChild(entete);
    panneau.appendChild(onglets);
    panneau.appendChild(champs);
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
    if (!state.selection) return;
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

  document.getElementById('bouton-ajouter-section').addEventListener('click', ajouterSection);
  document.getElementById('toile-conteneur').addEventListener('click', deselectionner);
  window.addEventListener('resize', rafraichirPoignees);

  rafraichirPanneau();
  rendrePage();
})();
