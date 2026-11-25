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
      label: 'Titre', icone: '🔤', categorie: 'Basique',
      defaut: () => ({ texte: 'Un titre percutant', balise: 'h2', alignement: 'gauche' }),
      rendre(w) {
        return el(w.contenu.balise, { style: { textAlign: alignCss(w.contenu.alignement), margin: 0 }, html: w.contenu.texte });
      },
      champs(w) {
        return [
          champTexte('Texte', w.contenu.texte, (v) => { w.contenu.texte = v; rendrePage(); }),
          champSelect('Balise', ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'], w.contenu.balise, (v) => { w.contenu.balise = v; rendrePage(); }),
          champSelect('Alignement', ['gauche', 'centre', 'droite'], w.contenu.alignement, (v) => { w.contenu.alignement = v; rendrePage(); }),
        ];
      },
      editableEnLigne: true, champTexteCle: 'texte',
    },
    texte: {
      label: 'Texte', icone: '📝', categorie: 'Basique',
      defaut: () => ({ html: 'Un paragraphe de texte éditable. Remplacez-le par votre propre contenu.' }),
      rendre(w) { return el('p', { style: { margin: 0 }, html: w.contenu.html }); },
      champs(w) {
        return [champTextarea('Contenu', w.contenu.html, (v) => { w.contenu.html = v; rendrePage(); })];
      },
      editableEnLigne: true, champTexteCle: 'html',
    },
    editeur_texte: {
      label: 'Éditeur de texte', icone: '🖋️', categorie: 'Basique',
      defaut: () => ({ html: '<strong>Un texte riche</strong>, mis en forme directement dans la mise en page.' }),
      rendre(w) { return el('div', { class: 'rendu-editeur-texte', html: w.contenu.html }); },
      champs(w) {
        return [champTextarea('Contenu (HTML)', w.contenu.html, (v) => { w.contenu.html = v; rendrePage(); })];
      },
      editableEnLigne: true, champTexteCle: 'html',
    },
    image: {
      label: 'Image', icone: '🖼️', categorie: 'Basique',
      defaut: () => ({ src: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80', alt: 'Image' }),
      rendre(w) { return el('img', { src: w.contenu.src, alt: w.contenu.alt, style: { width: '100%', display: 'block' } }); },
      champs(w) {
        return [
          champTexte("Adresse de l'image", w.contenu.src, (v) => { w.contenu.src = v; rendrePage(); }),
          champTexte('Texte alternatif', w.contenu.alt, (v) => { w.contenu.alt = v; rendrePage(); }),
        ];
      },
    },
    video: {
      label: 'Vidéo', icone: '🎬', categorie: 'Basique',
      defaut: () => ({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }),
      rendre(w) {
        const src = videoEmbedUrl(w.contenu.url);
        if (!src) return el('div', { class: 'rendu-video-invalide' }, 'URL vidéo invalide');
        if (src.type === 'iframe') return el('div', { class: 'rendu-video' }, el('iframe', { src: src.url, allowfullscreen: 'true' }));
        return el('div', { class: 'rendu-video' }, el('video', { src: src.url, controls: 'true' }));
      },
      champs(w) {
        return [champTexte('URL (YouTube ou .mp4)', w.contenu.url, (v) => { w.contenu.url = v; rendrePage(); })];
      },
    },
    bouton: {
      label: 'Bouton', icone: '🔘', categorie: 'Basique',
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
      label: 'Séparateur', icone: '➖', categorie: 'Basique',
      defaut: () => ({ style: 'ligne' }),
      rendre(w) { return el('hr', { class: 'rendu-separateur rendu-separateur--' + w.contenu.style }); },
      champs(w) {
        return [champSelect('Style', ['ligne', 'pointille'], w.contenu.style, (v) => { w.contenu.style = v; rendrePage(); })];
      },
    },
    espaceur: {
      label: 'Espaceur', icone: '↕️', categorie: 'Basique',
      defaut: () => ({ hauteur: 40 }),
      rendre(w) { return el('div', { style: { height: w.contenu.hauteur + 'px' } }); },
      champs(w) {
        return [champNombre('Hauteur (px)', w.contenu.hauteur, (v) => { w.contenu.hauteur = v; rendrePage(); })];
      },
    },
    icone: {
      label: 'Icône', icone: '✦', categorie: 'Général',
      defaut: () => ({ icone: '★', taille: 32, couleur: '#93003f', forme: 'cercle' }),
      rendre(w) {
        const inner = el('span', { style: { fontSize: w.contenu.taille + 'px', color: w.contenu.couleur, lineHeight: '1' } }, w.contenu.icone);
        if (w.contenu.forme === 'aucun') return inner;
        return el('div', { class: 'rendu-icone-forme rendu-icone-forme--' + w.contenu.forme, style: { width: (w.contenu.taille * 2) + 'px', height: (w.contenu.taille * 2) + 'px', borderColor: w.contenu.couleur } }, inner);
      },
      champs(w) {
        return [
          champTexte('Icône (emoji)', w.contenu.icone, (v) => { w.contenu.icone = v; rendrePage(); }),
          champNombre('Taille (px)', w.contenu.taille, (v) => { w.contenu.taille = v; rendrePage(); }),
          champCouleur('Couleur', w.contenu.couleur, (v) => { w.contenu.couleur = v; rendrePage(); }),
          champSelect('Forme', ['aucun', 'cercle', 'carre'], w.contenu.forme, (v) => { w.contenu.forme = v; rendrePage(); }),
        ];
      },
    },
    icone_bloc: {
      label: 'Icon Box', icone: '⭐', categorie: 'Général',
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
      label: 'Image Box', icone: '🏞️', categorie: 'Général',
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
    liste_icones: {
      label: 'Liste à puces', icone: '☑️', categorie: 'Général',
      defaut: () => ({ items: [{ icone: '✓', texte: 'Premier élément' }, { icone: '✓', texte: 'Deuxième élément' }, { icone: '✓', texte: 'Troisième élément' }] }),
      rendre(w) {
        return el('div', { class: 'rendu-liste-icones' }, ...w.contenu.items.map((it) => el('div', { class: 'rendu-liste-icones__item' }, el('span', {}, it.icone), el('span', {}, it.texte))));
      },
      champs(w) {
        const c = [];
        w.contenu.items.forEach((it, i) => {
          c.push(champTexte(`Icône ${i + 1}`, it.icone, (v) => { it.icone = v; rendrePage(); }));
          c.push(champTexte(`Texte ${i + 1}`, it.texte, (v) => { it.texte = v; rendrePage(); }));
        });
        return c;
      },
    },
    galerie_images: {
      label: 'Galerie', icone: '🖼️', categorie: 'Général',
      defaut: () => ({ images: [
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=300&q=80',
        'https://images.unsplash.com/photo-1528712306091-ed0763094c98?w=300&q=80',
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&q=80',
        'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=300&q=80',
      ] }),
      rendre(w) { return el('div', { class: 'rendu-galerie' }, ...w.contenu.images.map((src) => el('img', { src }))); },
      champs(w) {
        return w.contenu.images.map((src, i) => champTexte(`Image ${i + 1}`, src, (v) => { w.contenu.images[i] = v; rendrePage(); }));
      },
    },
    carrousel_images: {
      label: 'Carrousel', icone: '🎠', categorie: 'Général',
      defaut: () => ({ actif: 0, images: [
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=700&q=80',
        'https://images.unsplash.com/photo-1528712306091-ed0763094c98?w=700&q=80',
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=700&q=80',
      ] }),
      rendre(w) {
        const n = w.contenu.images.length;
        return el('div', { class: 'rendu-carrousel' },
          el('button', { onclick: (e) => { e.stopPropagation(); w.contenu.actif = (w.contenu.actif - 1 + n) % n; rendrePage(); } }, '‹'),
          el('img', { src: w.contenu.images[w.contenu.actif] }),
          el('button', { onclick: (e) => { e.stopPropagation(); w.contenu.actif = (w.contenu.actif + 1) % n; rendrePage(); } }, '›'));
      },
      champs(w) {
        return w.contenu.images.map((src, i) => champTexte(`Image ${i + 1}`, src, (v) => { w.contenu.images[i] = v; rendrePage(); }));
      },
    },
    note: {
      label: 'Note', icone: '⭐', categorie: 'Général',
      defaut: () => ({ valeur: 4, libelle: '(128 avis)' }),
      rendre(w) {
        const pleines = Math.round(w.contenu.valeur);
        const etoiles = '★'.repeat(pleines) + '☆'.repeat(Math.max(0, 5 - pleines));
        return el('div', { class: 'rendu-note' }, el('span', { class: 'rendu-note__etoiles' }, etoiles), el('span', { class: 'rendu-note__libelle' }, w.contenu.libelle));
      },
      champs(w) {
        return [
          champNombre('Valeur (0 à 5)', w.contenu.valeur, (v) => { w.contenu.valeur = Math.max(0, Math.min(5, v)); rendrePage(); }),
          champTexte('Libellé', w.contenu.libelle, (v) => { w.contenu.libelle = v; rendrePage(); }),
        ];
      },
    },
    alerte: {
      label: 'Alerte', icone: '🚨', categorie: 'Général',
      defaut: () => ({ type: 'info', titre: 'Information', texte: 'Un message important pour vos visiteurs.' }),
      rendre(w) {
        return el('div', { class: 'rendu-alerte rendu-alerte--' + w.contenu.type }, el('strong', {}, w.contenu.titre), el('span', {}, ' — ' + w.contenu.texte));
      },
      champs(w) {
        return [
          champSelect('Type', ['succes', 'info', 'avertissement', 'danger'], w.contenu.type, (v) => { w.contenu.type = v; rendrePage(); }),
          champTexte('Titre', w.contenu.titre, (v) => { w.contenu.titre = v; rendrePage(); }),
          champTextarea('Texte', w.contenu.texte, (v) => { w.contenu.texte = v; rendrePage(); }),
        ];
      },
    },
    temoignage: {
      label: 'Témoignage', icone: '💬', categorie: 'Général',
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
      label: 'Onglets', icone: '🗂️', categorie: 'Général',
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
      label: 'Accordéon', icone: '📚', categorie: 'Général',
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
      label: 'Compteur', icone: '🔢', categorie: 'Général',
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
      label: 'Progression', icone: '📊', categorie: 'Général',
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
      label: 'Réseaux sociaux', icone: '🔗', categorie: 'Général',
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
    google_maps: {
      label: 'Google Maps', icone: '🗺️', categorie: 'Avancé',
      defaut: () => ({ adresse: 'Paris, France', hauteur: 300 }),
      rendre(w) {
        return el('iframe', { class: 'rendu-carte', src: 'https://maps.google.com/maps?q=' + encodeURIComponent(w.contenu.adresse) + '&output=embed', style: { width: '100%', height: w.contenu.hauteur + 'px', border: '0' }, loading: 'lazy' });
      },
      champs(w) {
        return [
          champTexte('Adresse', w.contenu.adresse, (v) => { w.contenu.adresse = v; rendrePage(); }),
          champNombre('Hauteur (px)', w.contenu.hauteur, (v) => { w.contenu.hauteur = v; rendrePage(); }),
        ];
      },
    },
    ancre_menu: {
      label: 'Ancre de menu', icone: '⚓', categorie: 'Avancé',
      defaut: () => ({ idAncre: 'section-1' }),
      rendre(w) { return el('div', { id: w.contenu.idAncre, class: 'rendu-ancre' }, '⚓ Ancre : #' + w.contenu.idAncre); },
      champs(w) {
        return [champTexte('ID de l’ancre', w.contenu.idAncre, (v) => { w.contenu.idAncre = v; rendrePage(); })];
      },
    },
    html: {
      label: 'HTML', icone: '🔖', categorie: 'Avancé',
      defaut: () => ({ code: '<p style="color:#93003f"><strong>Code HTML personnalisé.</strong></p>' }),
      // Volontairement non assaini : comme dans Elementor, c'est le rôle de ce widget, et l'auteur
      // du code ici est le développeur de l'outil interne, pas un visiteur du site public.
      rendre(w) { return el('div', { class: 'rendu-html', html: w.contenu.code }); },
      champs(w) {
        return [champTextarea('Code HTML', w.contenu.code, (v) => { w.contenu.code = v; rendrePage(); })];
      },
    },
    table_matieres: {
      label: 'Table des matières', icone: '📑', categorie: 'Avancé',
      defaut: () => ({ items: [{ texte: 'Introduction', ancre: 'intro' }, { texte: 'Nos services', ancre: 'services' }, { texte: 'Contact', ancre: 'contact' }] }),
      rendre(w) {
        return el('ol', { class: 'rendu-table-matieres' }, ...w.contenu.items.map((it) => el('li', {}, el('a', { href: '#' + it.ancre, onclick: (e) => e.preventDefault() }, it.texte))));
      },
      champs(w) {
        const c = [];
        w.contenu.items.forEach((it, i) => {
          c.push(champTexte(`Titre ${i + 1}`, it.texte, (v) => { it.texte = v; rendrePage(); }));
          c.push(champTexte(`Ancre ${i + 1}`, it.ancre, (v) => { it.ancre = v; rendrePage(); }));
        });
        return c;
      },
    },
    barre_recherche: {
      label: 'Barre de recherche', icone: '🔍', categorie: 'Avancé',
      defaut: () => ({ placeholder: 'Rechercher…' }),
      rendre(w) {
        return el('form', { class: 'rendu-recherche', onsubmit: (e) => e.preventDefault() }, el('input', { type: 'search', placeholder: w.contenu.placeholder }), el('button', { type: 'submit' }, '🔍'));
      },
      champs(w) {
        return [champTexte('Texte indicatif', w.contenu.placeholder, (v) => { w.contenu.placeholder = v; rendrePage(); })];
      },
    },
    barre_laterale: {
      label: 'Zone latérale', icone: '📎', categorie: 'Avancé',
      defaut: () => ({ titre: 'Articles récents' }),
      rendre(w) {
        return el('div', { class: 'rendu-sidebar' }, el('h4', {}, w.contenu.titre),
          el('ul', {}, el('li', {}, 'Premier article'), el('li', {}, 'Deuxième article'), el('li', {}, 'Troisième article')));
      },
      champs(w) {
        return [champTexte('Titre', w.contenu.titre, (v) => { w.contenu.titre = v; rendrePage(); })];
      },
    },
  };

  function videoEmbedUrl(url) {
    if (!url) return null;
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (yt) return { type: 'iframe', url: 'https://www.youtube.com/embed/' + yt[1] };
    if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return { type: 'video', url };
    if (/^https?:\/\//.test(url)) return { type: 'iframe', url };
    return null;
  }

  const FORMES_SVG = {
    Mountains: 'M0,100 L200,20 L400,80 L600,10 L800,70 L1000,30 L1200,90 L1200,120 L0,120 Z',
    Waves: 'M0,60 C150,120 350,0 500,60 C650,120 850,0 1000,60 C1100,90 1150,70 1200,60 L1200,120 L0,120 Z',
    Zigzag: 'M0,100 L100,40 L200,100 L300,40 L400,100 L500,40 L600,100 L700,40 L800,100 L900,40 L1000,100 L1100,40 L1200,100 L1200,120 L0,120 Z',
    Triangle: 'M0,120 L0,60 L600,110 L1200,60 L1200,120 Z',
    Curve: 'M0,0 C400,120 800,120 1200,0 L1200,120 L0,120 Z',
    Clouds: 'M0,100 Q75,40 150,100 Q225,40 300,100 Q375,40 450,100 Q525,40 600,100 Q675,40 750,100 Q825,40 900,100 Q975,40 1050,100 Q1125,40 1200,100 L1200,120 L0,120 Z',
    Arrow: 'M0,120 L0,90 L550,90 L600,30 L650,90 L1200,90 L1200,120 Z',
    Tilt: 'M0,120 L0,90 L1200,10 L1200,120 Z',
  };
  // Les variantes "Asymmetrical / Brush / Pattern / Opacity" et quelques types proches (Drops,
  // Pyramids, Split, Book…) réutilisent la forme de base la plus proche plutôt qu'un tracé dédié —
  // simplification assumée, documentée plutôt que cachée.
  const FORMES_ALIAS = {
    Mountains: 'Mountains', Drops: 'Clouds', Clouds: 'Clouds', Zigzag: 'Zigzag', Pyramids: 'Mountains',
    Triangle: 'Triangle', 'Triangle Asymmetrical': 'Triangle', Tilt: 'Tilt', 'Tilt Opacity': 'Tilt',
    'Fan Opacity': 'Arrow', Curve: 'Curve', 'Curve Asymmetrical': 'Curve', Waves: 'Waves',
    'Waves Brush': 'Waves', 'Waves Pattern': 'Waves', Arrow: 'Arrow', Split: 'Zigzag', Book: 'Mountains',
  };
  function rendreFormeSeparation(section, cote) {
    const s = section.style;
    if (!s.formeType || s.formeType === 'Aucun') return null;
    if ((s.formeCote || 'haut') !== cote) return null;
    const cle = FORMES_ALIAS[s.formeType];
    if (!cle) return null;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 1200 120');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('class', 'forme-separation forme-separation--' + cote);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', FORMES_SVG[cle]);
    path.setAttribute('fill', '#ffffff');
    if (/Opacity/.test(s.formeType)) path.setAttribute('fill-opacity', '0.55');
    svg.appendChild(path);
    return svg;
  }

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
  // obj[cle] peut être un objet plat {haut,droite,bas,gauche} ou, dès qu'une rupture autre que
  // "bureau" est utilisée, {bureau:{…}, tablette:{…}, mobile:{…}} — voir estParAppareil/valeurAppareil.
  function champMarges(label, obj, cle, unite) {
    let appareilChamp = 'bureau';
    const cles = ['haut', 'droite', 'bas', 'gauche'];
    const libelles = ['Haut', 'Droite', 'Bas', 'Gauche'];
    let lie = false;
    const conteneur = el('div', { class: 'champ' });
    function valeursActuelles() {
      const brut = obj[cle];
      if (estParAppareil(brut)) return brut[appareilChamp] || {};
      return appareilChamp === 'bureau' ? (brut || {}) : {};
    }
    function ecrire(c, v) {
      if (appareilChamp === 'bureau' && !estParAppareil(obj[cle])) {
        obj[cle] = obj[cle] || {};
        obj[cle][c] = v;
      } else {
        if (!estParAppareil(obj[cle])) obj[cle] = { bureau: obj[cle] || {} };
        obj[cle][appareilChamp] = obj[cle][appareilChamp] || {};
        obj[cle][appareilChamp][c] = v;
      }
      rendrePage();
    }
    function rerendre() {
      conteneur.innerHTML = '';
      const vals = valeursActuelles();
      const grille = el('div', { class: 'champ-marges__grille' });
      cles.forEach((c) => {
        const input = el('input', { type: 'number', value: vals[c] ?? '' });
        input.addEventListener('input', () => {
          const v = input.value === '' ? null : Number(input.value);
          if (lie) { cles.forEach((cc) => ecrire(cc, v)); rerendre(); }
          else ecrire(c, v);
        });
        grille.appendChild(input);
      });
      const lienBtn = el('button', { class: 'champ-marges__lien' + (lie ? ' actif' : ''), type: 'button', title: 'Lier les 4 côtés' }, '🔗');
      lienBtn.addEventListener('click', () => { lie = !lie; rerendre(); });
      grille.appendChild(lienBtn);
      const libellesRow = el('div', { class: 'champ-marges__libelles' });
      libelles.forEach((l) => libellesRow.appendChild(el('span', {}, l)));
      libellesRow.appendChild(el('span', {}, ''));
      const icones = el('div', { class: 'champ-responsive__icones' },
        ...['bureau', 'tablette', 'mobile'].map((a) => el('button', {
          class: 'champ-responsive__icone' + (a === appareilChamp ? ' actif' : ''),
          title: a, type: 'button', onclick: (e) => { e.preventDefault(); appareilChamp = a; rerendre(); },
        }, a === 'bureau' ? '🖥' : a === 'tablette' ? '▤' : '▯')));
      conteneur.appendChild(el('div', { class: 'champ-marges__entete' },
        el('label', { style: { margin: 0 } }, label, icones),
        el('div', { class: 'champ-marges__unites' }, el('span', { class: 'actif' }, unite[0]), ...unite.slice(1).map((u) => el('span', {}, u)))));
      conteneur.appendChild(grille);
      conteneur.appendChild(libellesRow);
    }
    rerendre();
    return conteneur;
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
    return { sections: [section, modeleTroisIconBox(), modeleImageTexte(), modeleTemoignage(), modeleCompteurs()] };
  }

  const PERSISTANCE_CLE = 'constructeur:page';

  const state = {
    page: chargerPageSauvegardee() || pageInitiale(), selection: null, ongletActif: null, mode: 'edition',
    appareil: 'bureau', navigateurOuvert: false,
    modaleStructure: null, // { sectionCible: id|null }
    modaleBibliotheque: null, // { cible: colonne|null, onglet: 'predefinis'|'liste' }
  };

  function chargerPageSauvegardee() {
    try {
      const brut = localStorage.getItem(PERSISTANCE_CLE);
      return brut ? JSON.parse(brut) : null;
    } catch (e) { return null; }
  }
  let sauvegardeEnAttente = null;
  function sauvegarderPage() {
    clearTimeout(sauvegardeEnAttente);
    sauvegardeEnAttente = setTimeout(() => {
      try { localStorage.setItem(PERSISTANCE_CLE, JSON.stringify(state.page)); } catch (e) { /* stockage indisponible : tant pis */ }
    }, 250);
  }

  // noeud.widgets peut contenir, en plus de vrais widgets, des sections imbriquées
  // (type:'section', ajoutées via ajouterSectionInterne) — on descend dedans récursivement.
  function trouverDans(section, type, id, parentSection) {
    if (type === 'section' && section.id === id) return { noeud: section, parent: parentSection || null };
    for (const colonne of section.colonnes) {
      if (type === 'colonne' && colonne.id === id) return { noeud: colonne, parent: section };
      for (const item of colonne.widgets) {
        if (item.type === 'section') {
          const r = trouverDans(item, type, id, colonne);
          if (r.noeud) return r;
        } else if (type === 'widget' && item.id === id) {
          return { noeud: item, parent: colonne };
        }
      }
    }
    return { noeud: null, parent: null };
  }
  function trouver(type, id) {
    for (const section of state.page.sections) {
      const r = trouverDans(section, type, id, null);
      if (r.noeud) return r;
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

  // NB historique : snapshot() se prend TOUJOURS après la mutation (jamais avant), de sorte que
  // historique.pile[historique.index] représente en permanence l'état courant de state.page —
  // c'est cet invariant que annuler()/retablir() supposent.
  function creerSectionDepuisStructure(poids, sectionCible) {
    if (sectionCible) {
      const { noeud } = trouver('section', sectionCible);
      if (noeud) { noeud.colonnes = poids.map((p) => creerColonne(p)); rendrePage(); snapshot(); return; }
    }
    state.page.sections.push(creerSection(poids));
    rendrePage();
    snapshot();
  }
  function insererModele(template, cible) {
    const section = template.fabrique();
    if (cible && cible.sectionCible) {
      const { noeud } = trouver('section', cible.sectionCible);
      if (noeud) { noeud.colonnes = section.colonnes; rendrePage(); fermerModaleBibliotheque(); snapshot(); return; }
    }
    state.page.sections.push(section);
    fermerModaleBibliotheque();
    rendrePage();
    snapshot();
  }
  function ajouterColonne(section) {
    section.colonnes.push(creerColonne());
    rendrePage();
    snapshot();
  }
  function dupliquer(type, id) {
    const { noeud, parent } = trouver(type, id);
    if (!noeud) return;
    const copie = cloner(noeud);
    if (type === 'section' && !parent) {
      const i = state.page.sections.indexOf(noeud);
      state.page.sections.splice(i + 1, 0, copie);
    } else if (type === 'colonne') {
      const i = parent.colonnes.indexOf(noeud);
      parent.colonnes.splice(i + 1, 0, copie);
    } else {
      // widget, ou section imbriquée (parent = colonne, vit dans colonne.widgets)
      const i = parent.widgets.indexOf(noeud);
      parent.widgets.splice(i + 1, 0, copie);
    }
    rendrePage();
  }
  function supprimer(type, id) {
    const { noeud, parent } = trouver(type, id);
    if (!noeud) return;
    if (type === 'section' && !parent) {
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
    if (window.innerWidth <= 900) basculerPanneau(true);
  }
  function basculerPanneau(forcer) {
    const atelier = document.querySelector('.atelier');
    const ouvrir = forcer !== undefined ? forcer : !atelier.classList.contains('panneau-ouvert');
    atelier.classList.toggle('panneau-ouvert', ouvrir);
  }

  function deselectionner() {
    state.selection = null;
    if (window.innerWidth <= 900) basculerPanneau(false);
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

  // valeur éventuellement différenciée par appareil ({bureau,tablette,mobile}) → valeur active.
  // Un objet n'est traité comme "par appareil" que s'il porte au moins une de ces trois clés,
  // pour ne pas confondre avec un objet "plat" ordinaire (ex: {haut,droite,bas,gauche}).
  function estParAppareil(v) {
    return v != null && typeof v === 'object' && !Array.isArray(v) && ('bureau' in v || 'tablette' in v || 'mobile' in v);
  }
  function valeurAppareil(champ) {
    if (champ == null) return null;
    if (estParAppareil(champ)) return champ[state.appareil] ?? champ.bureau ?? null;
    return champ;
  }

  // enrobe un champ simple (scalaire) d'un sélecteur bureau/tablette/mobile : la valeur peut alors
  // être {bureau,tablette,mobile} au lieu d'une valeur plate, et s'applique seulement quand ce
  // point de rupture est actif dans la toile (voir valeurAppareil/appliquerStyleCommun).
  function champResponsive(obj, cle, construireChamp) {
    let appareilChamp = 'bureau';
    const conteneur = el('div', {});
    function valeurPour(a) {
      const brut = obj[cle];
      if (estParAppareil(brut)) return brut[a];
      return a === 'bureau' ? brut : undefined;
    }
    function ecrire(a, v) {
      const brut = obj[cle];
      if (a === 'bureau' && !estParAppareil(brut)) { obj[cle] = v; }
      else {
        if (!estParAppareil(obj[cle])) obj[cle] = { bureau: brut ?? null };
        obj[cle][a] = v;
      }
      rendrePage();
    }
    function rerendre() {
      conteneur.innerHTML = '';
      const champ = construireChamp(valeurPour(appareilChamp), (v) => ecrire(appareilChamp, v));
      const label = champ.querySelector(':scope > label');
      const icones = el('div', { class: 'champ-responsive__icones' },
        ...['bureau', 'tablette', 'mobile'].map((a) => el('button', {
          class: 'champ-responsive__icone' + (a === appareilChamp ? ' actif' : '') + (estParAppareil(obj[cle]) && obj[cle][a] != null && a !== 'bureau' ? ' override' : ''),
          title: a, type: 'button', onclick: (e) => { e.preventDefault(); appareilChamp = a; rerendre(); },
        }, a === 'bureau' ? '🖥' : a === 'tablette' ? '▤' : '▯')));
      if (label) label.appendChild(icones);
      conteneur.appendChild(champ);
    }
    rerendre();
    return conteneur;
  }

  function appliquerStyleCommun(dom, noeud) {
    const s = noeud.style || {};
    if (s.couleur) dom.style.color = s.couleur;
    if (s.typeArrierePlan) {
      if (s.typeArrierePlan === 'couleur' && s.fond) dom.style.backgroundColor = s.fond;
      if (s.typeArrierePlan === 'degrade' && s.degradeCouleur1 && s.degradeCouleur2) {
        dom.style.backgroundImage = `linear-gradient(${s.degradeAngle ?? 135}deg, ${s.degradeCouleur1}, ${s.degradeCouleur2})`;
      }
    } else if (s.fond) {
      dom.style.backgroundColor = s.fond;
    }
    const taille = valeurAppareil(s.taillePolice);
    if (taille) dom.style.fontSize = taille + 'px';
    const alignement = valeurAppareil(s.alignementTexte);
    if (alignement) dom.style.textAlign = alignCss(alignement);
    const a = noeud.avance || {};
    const m = valeurAppareil(a.marge) || {};
    const p = valeurAppareil(a.margeInterne) || {};
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

  // fil d'ariane flottant : segment actif (foncé, avec icônes) + chaîne complète des ancêtres
  // (clairs, cliquables) — ex. Widget › Colonne › Section, chaque segment sélectionne son élément.
  function filAriane(type, id, label, parents) {
    const actif = el('div', { class: 'fil-ariane__actif' },
      el('span', { class: 'fil-ariane__label' }, label),
      el('button', { title: 'Dupliquer', onclick: (e) => { e.stopPropagation(); dupliquer(type, id); snapshot(); } }, '⧉'),
      el('button', { title: 'Enregistrer' }, '🔖'),
      el('button', { title: 'Supprimer', onclick: (e) => { e.stopPropagation(); supprimer(type, id); snapshot(); } }, '✕'));
    const segments = [actif];
    (parents || []).forEach((p) => {
      segments.push(el('button', { class: 'fil-ariane__parent', onclick: (e) => { e.stopPropagation(); selectionner(p.type, p.id); } }, p.label + ' ›'));
    });
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
    if (section.style.typeArrierePlan === 'video' && section.style.videoUrl) {
      div.style.overflow = 'hidden';
      div.insertBefore(el('video', { src: section.style.videoUrl, autoplay: 'true', muted: 'true', loop: 'true', playsinline: 'true', class: 'section-video-fond' }), div.firstChild);
    }
    const formeHaut = rendreFormeSeparation(section, 'haut');
    if (formeHaut) div.appendChild(formeHaut);
    const formeBas = rendreFormeSeparation(section, 'bas');
    if (formeBas) div.appendChild(formeBas);
    if (state.mode === 'edition') div.appendChild(filAriane('section', section.id, 'Section', []));
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
    if (state.mode === 'edition') {
      const filColonne = filAriane('colonne', colonne.id, 'Colonne', [{ type: 'section', id: sectionId, label: 'Section' }]);
      const actifSeg = filColonne.querySelector('.fil-ariane__actif');
      actifSeg.insertBefore(el('button', { title: 'Ajouter une section interne', onclick: (e) => { e.stopPropagation(); ajouterSectionInterne(colonne); } }, '➕'), actifSeg.lastChild);
      div.appendChild(filColonne);
    }

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
    colonne.widgets.forEach((item) => widgets.appendChild(item.type === 'section' ? rendreSection(item) : rendreWidget(item, colonne.id, sectionId)));
    brancherDepot(widgets, colonne);
    div.appendChild(widgets);
    return div;
  }

  function ajouterSectionInterne(colonne) {
    const section = creerSection([1, 1]);
    colonne.widgets.push(section);
    selectionner('section', section.id);
    snapshot();
  }

  function rendreWidget(widget, colonneId, sectionId) {
    const def = WIDGETS[widget.type];
    const div = el('div', {
      class: 'bloc bloc--widget' + (estSelectionne('widget', widget.id) ? ' selectionne' : ''),
      'data-type': 'widget', 'data-id': widget.id, draggable: state.mode === 'edition' ? 'true' : undefined,
      onclick: (e) => { e.stopPropagation(); if (state.mode === 'edition') selectionner('widget', widget.id); },
    });
    appliquerStyleCommun(div, widget);
    appliquerLibre(div, widget);
    if (state.mode === 'edition') {
      div.appendChild(filAriane('widget', widget.id, def.label, [{ type: 'colonne', id: colonneId, label: 'Colonne' }, { type: 'section', id: sectionId, label: 'Section' }]));
      brancherDragReorder(div, widget);
    }
    const rendu = def.rendre(widget);
    if (state.mode === 'edition' && def.editableEnLigne) brancherEditionEnLigne(div, rendu, widget);
    div.appendChild(rendu);
    return div;
  }

  function rendrePage() {
    const toile = document.getElementById('toile');
    toile.innerHTML = '';
    state.page.sections.forEach((s) => toile.appendChild(rendreSection(s)));
    if (state.mode === 'edition') {
      toile.appendChild(el('button', {
        class: 'toile__ajouter-apres',
        onclick: (e) => { e.stopPropagation(); ouvrirModaleStructure(); },
      }, '+ Ajouter une section'));
    }
    rafraichirPoignees();
    rafraichirNavigateur();
    sauvegarderPage();
  }

  // -------------------------------------------------- glisser-déposer depuis la bibliothèque

  // cherche un widget OU une section imbriquée (vit dans colonne.widgets) par id, sans connaître
  // son type à l'avance — utilisé par le glisser-déposer structurel.
  function trouverElementParId(id) {
    let r = trouver('widget', id);
    if (r.noeud) return { noeud: r.noeud, parent: r.parent, type: 'widget' };
    r = trouver('section', id);
    if (r.noeud && r.parent) return { noeud: r.noeud, parent: r.parent, type: 'section' };
    return { noeud: null, parent: null, type: null };
  }

  function brancherDepot(conteneurWidgets, colonne) {
    let indicateur = null;
    function retirerIndicateur() { if (indicateur) { indicateur.remove(); indicateur = null; } }
    function indexDepot(e) {
      const enfants = Array.from(conteneurWidgets.querySelectorAll(':scope > .bloc'));
      let index = enfants.length;
      for (let i = 0; i < enfants.length; i++) {
        const r = enfants[i].getBoundingClientRect();
        if (e.clientY < r.top + r.height / 2) { index = i; break; }
      }
      return { index, enfants };
    }
    conteneurWidgets.addEventListener('dragover', (e) => {
      if (state.mode !== 'edition') return;
      e.preventDefault();
      conteneurWidgets.classList.add('survol-depot');
      const { index, enfants } = indexDepot(e);
      if (!indicateur) indicateur = el('div', { class: 'indicateur-depot' });
      if (index >= enfants.length) conteneurWidgets.appendChild(indicateur);
      else conteneurWidgets.insertBefore(indicateur, enfants[index]);
    });
    conteneurWidgets.addEventListener('dragleave', (e) => {
      if (e.target === conteneurWidgets) { conteneurWidgets.classList.remove('survol-depot'); retirerIndicateur(); }
    });
    conteneurWidgets.addEventListener('drop', (e) => {
      if (state.mode !== 'edition') return;
      e.preventDefault();
      conteneurWidgets.classList.remove('survol-depot');
      retirerIndicateur();
      const { index } = indexDepot(e);
      const typeNouveau = e.dataTransfer.getData('text/widget-type');
      const idDeplace = e.dataTransfer.getData('text/widget-move-id');
      if (typeNouveau && WIDGETS[typeNouveau]) {
        const nouveau = creerWidget(typeNouveau);
        colonne.widgets.splice(index, 0, nouveau);
        selectionner('widget', nouveau.id);
        snapshot();
      } else if (idDeplace) {
        const { noeud, parent: ancienParent, type } = trouverElementParId(idDeplace);
        if (noeud && ancienParent) {
          const indexActuel = ancienParent.widgets.indexOf(noeud);
          if (indexActuel !== -1) ancienParent.widgets.splice(indexActuel, 1);
          let indexCible = index;
          if (ancienParent === colonne && indexActuel !== -1 && indexActuel < index) indexCible -= 1;
          colonne.widgets.splice(indexCible, 0, noeud);
          selectionner(type, noeud.id);
          snapshot();
        }
      }
    });
  }

  // glisser l'élément PAR SON CORPS le réordonne parmi ses frères/sœurs ou le déplace vers une
  // autre colonne (distinct du geste bord/coin, qui bascule en position libre absolue).
  function brancherDragReorder(div, widget) {
    div.addEventListener('dragstart', (e) => {
      e.stopPropagation();
      e.dataTransfer.setData('text/widget-move-id', widget.id);
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => div.classList.add('en-deplacement'), 0);
    });
    div.addEventListener('dragend', () => div.classList.remove('en-deplacement'));
  }

  // -------------------------------------------------- édition de texte en ligne (contenteditable + barre flottante)

  let toolbarFlottante = null;
  function fermerToolbarFlottante() {
    if (toolbarFlottante) { toolbarFlottante.remove(); toolbarFlottante = null; }
  }

  function brancherEditionEnLigne(div, rendu, widget) {
    rendu.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      // Un double-clic déclenche d'abord deux 'click' natifs (gérés par l'onclick du bloc, qui
      // sélectionne et donc rendrePage() reconstruit la toile) avant le 'dblclick' lui-même : par
      // prudence on ne fait jamais confiance aux `div`/`rendu` capturés à l'attache du listener et
      // on requête les nœuds réellement en vie au moment où l'événement se déclenche.
      const divFrais = document.querySelector(`[data-type="widget"][data-id="${widget.id}"]`);
      if (!divFrais) return;
      const renduFrais = divFrais.querySelector(':scope > :not(.fil-ariane)');
      if (!renduFrais) return;
      // Important : on ne passe PAS par selectionner() ici, car il déclenche rendrePage(), qui
      // reconstruirait la toile une fois de plus et détruirait ce nœud tout juste trouvé, juste
      // avant qu'on lui donne le focus. On met à jour la sélection "à la main", sans y toucher.
      state.selection = { type: 'widget', id: widget.id };
      state.ongletActif = ongletsPourType('widget')[0][0];
      rafraichirPanneau();
      divFrais.classList.add('selectionne');
      rafraichirPoignees();
      demarrerEditionEnLigne(divFrais, renduFrais, widget);
    });
  }

  function demarrerEditionEnLigne(div, rendu, widget) {
    const def = WIDGETS[widget.type];
    div.draggable = false;
    rendu.setAttribute('contenteditable', 'true');
    rendu.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(rendu);
    sel.removeAllRanges();
    sel.addRange(range);

    fermerToolbarFlottante();
    function boutonFormat(label, commande, valeur) {
      return el('button', { onmousedown: (e) => e.preventDefault(), onclick: () => document.execCommand(commande, false, valeur || null) }, label);
    }
    const barre = el('div', { class: 'toolbar-inline' },
      boutonFormat('B', 'bold'), boutonFormat('I', 'italic'), boutonFormat('U', 'underline'),
      el('button', { onmousedown: (e) => e.preventDefault(), onclick: () => { const url = window.prompt('Lien (URL) :', 'https://'); if (url) document.execCommand('createLink', false, url); } }, '🔗'),
      boutonFormat('⟸', 'justifyLeft'), boutonFormat('≡', 'justifyCenter'), boutonFormat('⟹', 'justifyRight'));
    document.body.appendChild(barre);
    toolbarFlottante = barre;
    const r = rendu.getBoundingClientRect();
    const auDessus = r.top - barre.offsetHeight - 10;
    barre.style.top = (window.scrollY + Math.max(8, auDessus < 8 ? r.bottom + 8 : auDessus)) + 'px';
    barre.style.left = (window.scrollX + Math.max(8, r.left)) + 'px';

    function fin() {
      rendu.removeEventListener('blur', fin);
      fermerToolbarFlottante();
      rendu.removeAttribute('contenteditable');
      div.draggable = true;
      if (def.champTexteCle) widget.contenu[def.champTexteCle] = rendu.innerHTML.trim();
      rendrePage();
      snapshot();
    }
    rendu.addEventListener('blur', fin);
  }

  // -------------------------------------------------- panneau gauche : bibliothèque ou propriétés

  function rendreBibliotheque() {
    const categories = {};
    Object.keys(WIDGETS).forEach((type) => {
      const def = WIDGETS[type];
      (categories[def.categorie] = categories[def.categorie] || []).push(type);
    });
    const corps = el('div', { class: 'bibliotheque-corps' });
    ['Basique', 'Général', 'Avancé'].forEach((cat) => {
      if (!categories[cat]) return;
      const grille = el('div', { class: 'grille-widgets' });
      categories[cat].forEach((type) => {
        const def = WIDGETS[type];
        const tuile = el('div', {
          class: 'tuile-widget', draggable: 'true', 'data-label': def.label.toLowerCase(),
          ondragstart: (e) => e.dataTransfer.setData('text/widget-type', type),
        }, el('span', { class: 'tuile-widget__icone' }, def.icone), el('span', { class: 'tuile-widget__label' }, def.label));
        grille.appendChild(tuile);
      });
      corps.appendChild(el('div', { class: 'categorie-widgets' }, el('div', { class: 'categorie-widgets__titre' }, cat), grille));
    });

    const recherche = el('input', { class: 'panneau__recherche', placeholder: 'Rechercher un élément…', type: 'text' });
    recherche.addEventListener('input', () => {
      const q = recherche.value.trim().toLowerCase();
      corps.querySelectorAll('.categorie-widgets').forEach((groupe) => {
        let visibles = 0;
        groupe.querySelectorAll('.tuile-widget').forEach((t) => {
          const ok = !q || t.dataset.label.includes(q);
          t.style.display = ok ? '' : 'none';
          if (ok) visibles++;
        });
        groupe.style.display = visibles ? '' : 'none';
      });
    });

    return el('div', {}, el('div', { class: 'panneau__entete' }, recherche), corps);
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
        s.typeArrierePlan === 'couleur' ? champCouleur('Couleur de fond', s.fond, (v) => { s.fond = v; rendrePage(); }) : null,
        s.typeArrierePlan === 'degrade' ? champCouleur('Couleur 1', s.degradeCouleur1 || '#93003f', (v) => { s.degradeCouleur1 = v; rendrePage(); }) : null,
        s.typeArrierePlan === 'degrade' ? champCouleur('Couleur 2', s.degradeCouleur2 || '#1c5fa8', (v) => { s.degradeCouleur2 = v; rendrePage(); }) : null,
        s.typeArrierePlan === 'degrade' ? champNombre('Angle (°)', s.degradeAngle ?? 135, (v) => { s.degradeAngle = v; rendrePage(); }) : null,
        s.typeArrierePlan === 'video' ? champTexte('URL de la vidéo (.mp4)', s.videoUrl || '', (v) => { s.videoUrl = v; rendrePage(); }) : null),
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
        champResponsive(s, 'taillePolice', (valeur, onChange) => champNombre('Taille de police (px)', valeur || '', (v) => onChange(v || null)))),
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
        champResponsive(s, 'taillePolice', (valeur, onChange) => champNombre('Taille de police (px)', valeur || '', (v) => onChange(v || null)))),
    ];
  }

  function champsStyleWidget(noeud) {
    const s = noeud.style;
    return [
      champCouleur('Couleur du texte', s.couleur, (v) => { s.couleur = v; rendrePage(); }),
      champCouleur('Couleur de fond', s.fond, (v) => { s.fond = v; rendrePage(); }),
      champResponsive(s, 'taillePolice', (valeur, onChange) => champNombre('Taille de police (px)', valeur || '', (v) => onChange(v || null))),
      champResponsive(s, 'alignementTexte', (valeur, onChange) => champSelect('Alignement du texte', ['gauche', 'centre', 'droite'], valeur || 'gauche', onChange)),
    ];
  }

  // ---- onglet "Avancé"

  function champsAvanceSection(noeud) {
    const a = noeud.avance;
    a.marge = a.marge || {}; a.margeInterne = a.margeInterne || {};
    return [
      champMarges('Marge', a, 'marge', ['PX', '%']),
      champMarges('Marge interne', a, 'margeInterne', ['PX', 'EM', '%']),
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
      champMarges('Marge', a, 'marge', ['PX', '%']),
      champMarges('Marge interne', a, 'margeInterne', ['PX', 'EM', '%']),
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
      el('button', { class: 'panneau-proprietes__icone-bouton', title: 'Bibliothèque', onclick: () => ouvrirModaleBibliotheque() }, '⊞'));

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
      snapshot();
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  // -------------------------------------------------- historique (annuler/rétablir)

  const historique = { pile: [], index: -1 };
  function snapshot() {
    historique.pile = historique.pile.slice(0, historique.index + 1);
    historique.pile.push(JSON.stringify(state.page));
    historique.index++;
    if (historique.pile.length > 60) { historique.pile.shift(); historique.index--; }
    majBoutonsHistorique();
  }
  function annuler() {
    if (historique.index <= 0) return;
    historique.index--;
    state.page = JSON.parse(historique.pile[historique.index]);
    state.selection = null;
    rafraichirPanneau(); rendrePage(); majBoutonsHistorique();
  }
  function retablir() {
    if (historique.index >= historique.pile.length - 1) return;
    historique.index++;
    state.page = JSON.parse(historique.pile[historique.index]);
    state.selection = null;
    rafraichirPanneau(); rendrePage(); majBoutonsHistorique();
  }
  function majBoutonsHistorique() {
    const annulerBtn = document.getElementById('bouton-annuler');
    const retablirBtn = document.getElementById('bouton-retablir');
    if (annulerBtn) annulerBtn.disabled = historique.index <= 0;
    if (retablirBtn) retablirBtn.disabled = historique.index >= historique.pile.length - 1;
  }

  // -------------------------------------------------- navigateur (arborescence de la page)

  function rendreNavigateur() {
    const liste = el('div', { class: 'navigateur__corps' });
    function ligne(type, id, label, profondeur, icone) {
      return el('div', {
        class: 'navigateur__ligne' + (estSelectionne(type, id) ? ' selectionne' : ''),
        style: { paddingLeft: (14 + profondeur * 18) + 'px' },
        onclick: () => selectionner(type, id),
      }, el('span', { class: 'navigateur__icone' }, icone), el('span', {}, label));
    }
    function parcourirSection(section, profondeur, numero) {
      liste.appendChild(ligne('section', section.id, 'Section ' + numero, profondeur, '▭'));
      section.colonnes.forEach((c, ci) => {
        liste.appendChild(ligne('colonne', c.id, 'Colonne ' + (ci + 1), profondeur + 1, '▥'));
        let n = 0;
        c.widgets.forEach((item) => {
          if (item.type === 'section') { parcourirSection(item, profondeur + 2, ++n); }
          else { liste.appendChild(ligne('widget', item.id, WIDGETS[item.type].label, profondeur + 2, WIDGETS[item.type].icone)); }
        });
      });
    }
    state.page.sections.forEach((s, si) => parcourirSection(s, 0, si + 1));
    return el('div', { class: 'navigateur' },
      el('div', { class: 'navigateur__entete' }, el('span', {}, 'Navigateur'), el('button', { onclick: basculerNavigateur }, '✕')),
      liste);
  }
  function rafraichirNavigateur() {
    const conteneur = document.getElementById('navigateur-conteneur');
    if (!conteneur) return;
    conteneur.classList.toggle('ouvert', state.navigateurOuvert);
    conteneur.innerHTML = '';
    if (state.navigateurOuvert) conteneur.appendChild(rendreNavigateur());
  }
  function basculerNavigateur() {
    state.navigateurOuvert = !state.navigateurOuvert;
    rafraichirNavigateur();
  }

  // -------------------------------------------------- bascule bureau / tablette / mobile

  function appliquerAppareil() {
    const conteneur = document.getElementById('toile-conteneur');
    conteneur.classList.remove('appareil-bureau', 'appareil-tablette', 'appareil-mobile');
    conteneur.classList.add('appareil-' + state.appareil);
    document.querySelectorAll('.barre-haute__appareil button').forEach((b) => b.classList.toggle('actif', b.dataset.appareil === state.appareil));
    rendrePage();
    requestAnimationFrame(rafraichirPoignees);
  }

  // -------------------------------------------------- notification brève ("toast")

  function toast(msg) {
    const existant = document.getElementById('toast');
    if (existant) existant.remove();
    const t = el('div', { id: 'toast', class: 'toast' }, msg);
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('visible'));
    setTimeout(() => { t.classList.remove('visible'); setTimeout(() => t.remove(), 300); }, 1600);
  }

  // -------------------------------------------------- menu hamburger (coin haut-gauche)

  function basculerMenu() {
    const existant = document.getElementById('menu-hamburger');
    if (existant) { existant.remove(); return; }
    const menu = el('div', { id: 'menu-hamburger', class: 'menu-hamburger' },
      el('button', {
        onclick: () => {
          if (window.confirm('Repartir d’une page vide ? Cette action est annulable (↶).')) {
            state.page = pageInitiale(); state.selection = null; rafraichirPanneau(); rendrePage(); snapshot();
          }
          menu.remove();
        },
      }, '📄 Nouvelle page'),
      el('button', { onclick: () => { toast('Export indisponible dans cette démo'); menu.remove(); } }, '⇩ Exporter'));
    document.querySelector('.barre-haute__gauche').appendChild(menu);
    setTimeout(() => document.addEventListener('mousedown', function fermer(e) {
      if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('mousedown', fermer); }
    }), 0);
  }

  // -------------------------------------------------- copier / coller / nudge clavier

  let presse_papiers = null;
  function copierSelection() {
    if (!state.selection) return;
    const { noeud } = trouver(state.selection.type, state.selection.id);
    if (noeud) { presse_papiers = { type: state.selection.type, donnees: cloner(noeud) }; toast('Copié'); }
  }
  function collerSelection() {
    if (!presse_papiers) return;
    const { parent } = state.selection ? trouver(state.selection.type, state.selection.id) : { parent: null };
    const copie = cloner(presse_papiers.donnees);
    if (presse_papiers.type === 'section' && (!state.selection || state.selection.type === 'section')) {
      const i = state.selection ? state.page.sections.findIndex((s) => s.id === state.selection.id) : state.page.sections.length - 1;
      state.page.sections.splice(i + 1, 0, copie);
    } else if (parent && parent.widgets) {
      const { noeud: actuel } = trouver(state.selection.type, state.selection.id);
      const i = parent.widgets.indexOf(actuel);
      parent.widgets.splice(i + 1, 0, copie);
    } else {
      state.page.sections.push(copie.colonnes ? copie : creerSection([1]));
    }
    selectionner(presse_papiers.type === 'section' ? 'section' : copie.type || 'widget', copie.id);
    snapshot();
  }
  document.addEventListener('keydown', (e) => {
    const cible = e.target;
    const editionTexteActive = cible && (cible.tagName === 'INPUT' || cible.tagName === 'TEXTAREA' || cible.isContentEditable);
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key.toLowerCase() === 'z' && !editionTexteActive) { e.preventDefault(); annuler(); return; }
    if (ctrl && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z')) && !editionTexteActive) { e.preventDefault(); retablir(); return; }
    if (editionTexteActive) return; // le reste des raccourcis ne doit pas gêner la frappe normale
    if (ctrl && e.key.toLowerCase() === 'c' && state.selection) { e.preventDefault(); copierSelection(); return; }
    if (ctrl && e.key.toLowerCase() === 'v' && presse_papiers) { e.preventDefault(); collerSelection(); return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && state.selection) {
      e.preventDefault(); supprimer(state.selection.type, state.selection.id); snapshot(); return;
    }
    if (state.selection && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      const { noeud } = trouver(state.selection.type, state.selection.id);
      const dom = document.querySelector(`[data-type="${state.selection.type}"][data-id="${state.selection.id}"]`);
      if (noeud && dom) {
        e.preventDefault();
        const libre = assurerLibre(noeud, dom);
        const pas = e.shiftKey ? 10 : 1;
        if (e.key === 'ArrowUp') libre.y -= pas;
        if (e.key === 'ArrowDown') libre.y += pas;
        if (e.key === 'ArrowLeft') libre.x -= pas;
        if (e.key === 'ArrowRight') libre.x += pas;
        rendrePage();
      }
    }
  });

  // -------------------------------------------------- amorçage

  document.getElementById('bouton-ajouter-section').addEventListener('click', () => ouvrirModaleStructure(null));
  document.getElementById('toile-conteneur').addEventListener('click', deselectionner);
  document.getElementById('bouton-mode').addEventListener('click', basculerMode);
  document.getElementById('bouton-hamburger').addEventListener('click', basculerMenu);
  document.getElementById('bouton-bascule-panneau').addEventListener('click', () => basculerPanneau());
  document.getElementById('panneau-scrim').addEventListener('click', () => basculerPanneau(false));
  document.getElementById('bouton-annuler').addEventListener('click', annuler);
  document.getElementById('bouton-retablir').addEventListener('click', retablir);
  document.getElementById('bouton-navigateur').addEventListener('click', basculerNavigateur);
  document.getElementById('bouton-publier').addEventListener('click', () => toast('✓ Enregistré'));
  document.querySelectorAll('.barre-haute__appareil button').forEach((b) => b.addEventListener('click', () => { state.appareil = b.dataset.appareil; appliquerAppareil(); }));
  window.addEventListener('resize', rafraichirPoignees);

  snapshot();
  rafraichirPanneau();
  rendrePage();
})();
