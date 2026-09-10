/**
 * Surcouche de sélection posée sur l'aperçu.
 *
 * Le site vit dans une iframe : les contours sont dessinés à côté, dans le
 * panneau, jamais dans la page. Rien n'est ajouté au DOM du site, donc
 * quitter l'édition ne laisse aucune trace.
 * @module ui/overlay
 */
import { h, icon, clear } from './el.js';
import { applyStyleObject } from '../core/style.js';
import { reperesDe, accrocher, ecarts, translater, TOLERANCE } from '../core/reperes.js';

const LABELS = { text: 'text', image: 'image', link: 'link', background: 'background' };

export function createOverlay({ layer, origin, t, onSelect, onCollectionOp, onSectionOp, onAddSection, onReposition, onWidgetOp, onWidgetDrop, onWidgetSelect, onWidgetMove, widgetStyle }) {
  let doc = null;
  let win = null;
  let model = null;
  let actif = false;
  let survole = null;
  let selectionne = null;
  let parElement = new Map();
  let parItem = new Map();

  const cadre = h('div', { class: 'hl' });
  const etiquette = h('span', { class: 'hl__tag' });
  cadre.appendChild(etiquette);
  const cadreActif = h('div', { class: 'hl hl--active' });
  const outilsBloc = h('div', { class: 'itembar' });
  const cadreSection = h('div', { class: 'sect' });
  const outilsSection = h('div', { class: 'secttools' });
  const pointAjout = h('div', { class: 'addhere' });
  layer.append(cadreSection, cadre, cadreActif, outilsBloc, pointAjout, outilsSection);
  for (const n of [cadre, cadreActif, outilsBloc, cadreSection, outilsSection, pointAjout]) cacher(n);

  let sections = [];
  let sectionSurvolee = null;

  // --- Widgets : sélection et dépôt ------------------------------------
  const cadreWidget = h('div', { class: 'wsel' });
  const outilsWidget = h('div', { class: 'wtools' });
  const ligneDepot = h('div', { class: 'dropline' });
  const zonesVides = [];
  const mesure = h('span', { class: 'dragnum' });
  // Les repères d'alignement : deux lignes, et jusqu'à quatre mesures
  // d'écart. Toutes sont créées une fois et réutilisées — en créer à chaque
  // mouvement de souris ferait ramer le glissement.
  const ligneX = h('span', { class: 'guide guide--v' });
  const ligneY = h('span', { class: 'guide guide--h' });
  const cotes = Array.from({ length: 4 }, () => ({
    trait: h('span', { class: 'cote' }),
    valeur: h('span', { class: 'cote__n' }),
  }));
  layer.append(cadreWidget, outilsWidget, ligneDepot, ligneX, ligneY, mesure);
  for (const c of cotes) layer.append(c.trait, c.valeur);
  cacher(cadreWidget); cacher(outilsWidget); cacher(ligneDepot); cacher(mesure);
  cacher(ligneX); cacher(ligneY);
  for (const c of cotes) { cacher(c.trait); cacher(c.valeur); }

  /** Efface tous les repères du glissement. */
  function effacerReperes() {
    cacher(ligneX); cacher(ligneY);
    for (const c of cotes) { cacher(c.trait); cacher(c.valeur); }
  }

  let widgetSurvole = null;
  let typeEnCours = null;

  const CONTENEURS = new Set(['section', 'columns', 'column']);

  /**
   * Maintien du chrome flottant.
   *
   * Les barres d'outils sont dessinées dans le document de l'éditeur, au-dessus
   * de l'iframe. Aller les cliquer fait donc SORTIR le pointeur de l'aperçu, ce
   * qui masquait la barre juste avant qu'on l'atteigne. Toutes les barres
   * annulent donc le masquage quand on entre dedans, et le reprogramment quand
   * on en sort.
   */
  const FLOTTANTS = [outilsBloc, outilsSection, outilsWidget, pointAjout];
  let minuteurMasquage = null;

  const garder = () => clearTimeout(minuteurMasquage);
  const programmerMasquage = () => {
    clearTimeout(minuteurMasquage);
    minuteurMasquage = setTimeout(() => {
      survole = null;
      widgetSurvole = null;
      sectionSurvolee = null;
      itemSurvole = null;
      for (const n of [cadre, cadreWidget, cadreSection, ...FLOTTANTS]) cacher(n);
    }, 400);
  };

  for (const noeud of FLOTTANTS) {
    noeud.addEventListener('mouseenter', garder);
    noeud.addEventListener('mouseleave', programmerMasquage);
  }

  let itemSurvole = null;

  function cacher(n) { n.style.display = 'none'; }
  function montrer(n) { n.style.display = ''; }

  /** Reconstruit les tables de correspondance après un scan. */
  function refresh(prochainModel) {
    if (prochainModel) {
      const nouveauDoc = prochainModel.doc;
      // L'aperçu est rechargé à chaque changement de structure ou de page :
      // sans rebrancher, les écouteurs resteraient sur le document détruit.
      if (nouveauDoc !== doc) {
        const etait = actif;
        if (etait) debrancher();
        model = prochainModel;
        doc = nouveauDoc;
        win = doc.defaultView;
        if (etait) brancher();
      } else {
        model = prochainModel;
      }
    }
    if (!model) return;

    parElement = new Map();
    for (const entry of model.entries.values()) parElement.set(entry.el, entry);

    sections = model.sectionList ? model.sectionList() : [];

    // Les champs des sections ajoutées sont éditables comme les autres.
    for (const [cle, el] of model.insertedSections || []) {
      for (const [champCle, champ] of model.sectionFieldsIn(el)) {
        parElement.set(champ.el, { ...champ, sectionKey: cle, fieldKey: champCle });
      }
    }

    parItem = new Map();
    for (const collection of model.collections) {
      collection.items.forEach((item, index) => {
        parItem.set(item, { collection, index });
        for (const [cle, champ] of model.fieldsIn(item)) {
          parElement.set(champ.el, { ...champ, collectionId: collection.id, itemIndex: index, fieldKey: cle });
        }
      });
    }
    reposition();
  }

  function entreeSous(noeud) {
    let courant = noeud;
    while (courant && courant !== doc.body) {
      if (parElement.has(courant)) return parElement.get(courant);
      courant = courant.parentElement;
    }
    return null;
  }

  function itemSous(noeud) {
    let courant = noeud;
    while (courant && courant !== doc.body) {
      if (parItem.has(courant)) return parItem.get(courant);
      courant = courant.parentElement;
    }
    return null;
  }

  /**
   * L'élément est-il assez visible pour qu'on n'ait pas à bouger ?
   *
   * « Assez » et non « entièrement » : un bloc plus haut que la fenêtre ne
   * serait jamais entièrement visible, et on le ferait défiler sans fin.
   */
  function estBienVisible(el) {
    if (!win) return false;
    const rect = el.getBoundingClientRect();
    const hauteur = win.innerHeight || 0;
    if (!hauteur) return false;
    const haut = Math.max(rect.top, 0);
    const bas = Math.min(rect.bottom, hauteur);
    const dedans = bas - haut;
    // Visible d'au moins la moitié de sa hauteur, ou d'un tiers d'écran.
    return dedans > 0 && (dedans >= rect.height * 0.5 || dedans >= hauteur / 3);
  }

  function placer(noeud, el) {
    if (!el || !el.isConnected) { cacher(noeud); return; }
    const decalage = origin();
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) { cacher(noeud); return; }
    noeud.style.left = (decalage.x + rect.left) + 'px';
    noeud.style.top = (decalage.y + rect.top) + 'px';
    noeud.style.width = rect.width + 'px';
    noeud.style.height = rect.height + 'px';
    montrer(noeud);
  }

  function peindreSurvol(entry) {
    if (!entry) { cacher(cadre); return; }
    placer(cadre, entry.el);
    clear(etiquette);
    etiquette.append(
      icon(entry.role === 'link' ? 'link' : entry.role === 'text' ? 'pencil' : 'image', 11),
      t(LABELS[entry.role] || 'text'),
    );
    cadre.appendChild(etiquette);
  }

  function peindreOutilsBloc(cible) {
    if (!cible) { cacher(outilsBloc); return; }
    const { collection, index } = cible;
    const el = collection.items[index];
    if (!el || !el.isConnected) { cacher(outilsBloc); return; }

    const decalage = origin();
    const rect = el.getBoundingClientRect();
    clear(outilsBloc);

    const bouton = (nom, titre, op, ...args) => h('button', {
      class: 'btn btn--sm btn--icon', type: 'button', title: titre,
      onclick: (e) => { e.preventDefault(); e.stopPropagation(); onCollectionOp(collection.id, op, ...args); },
    }, icon(nom, 13));

    outilsBloc.append(
      bouton('copy', t('duplicate'), 'duplicate', index),
      bouton('up', t('moveUp'), 'move', index, index - 1),
      bouton('down', t('moveDown'), 'move', index, index + 1),
      h('button', {
        class: 'btn btn--sm btn--icon btn--danger', type: 'button', title: t('remove'),
        onclick: (e) => {
          e.preventDefault(); e.stopPropagation();
          if (confirm(t('removeConfirm'))) onCollectionOp(collection.id, 'remove', index);
        },
      }, icon('trash', 13)),
    );
    outilsBloc.style.left = (decalage.x + Math.max(rect.left, rect.right - 132)) + 'px';
    outilsBloc.style.top = (decalage.y + Math.max(rect.top + 5, 4)) + 'px';
    montrer(outilsBloc);
  }

  /** Élément de widget le plus proche au-dessus d'un nœud. */
  function widgetSous(noeud) {
    let courant = noeud;
    while (courant && courant !== doc.body) {
      if (courant.hasAttribute && courant.hasAttribute('data-admin-widget')) return courant;
      courant = courant.parentElement;
    }
    return null;
  }

  /** Conteneur de widgets le plus proche, et l'enfant direct visé. */
  function conteneurSous(el) {
    let enfant = null;
    let courant = el;
    while (courant && courant !== doc.body) {
      if (courant.hasAttribute && courant.hasAttribute('data-admin-widget')) {
        if (CONTENEURS.has(courant.getAttribute('data-admin-type'))) {
          return { conteneur: courant, enfant };
        }
        enfant = courant;
      }
      courant = courant.parentElement;
    }
    return null;
  }

  /** Enfants widgets directs d'un conteneur. */
  function enfantsDe(conteneur) {
    const type = conteneur.getAttribute('data-admin-type');
    // Une section enveloppe ses enfants dans un div de mise en page.
    const hote = type === 'section' ? conteneur.firstElementChild : conteneur;
    return hote ? Array.from(hote.children).filter((n) => n.hasAttribute('data-admin-widget')) : [];
  }

  function peindreWidget(el) {
    if (!el || !el.isConnected) { cacher(cadreWidget); cacher(outilsWidget); return; }
    placer(cadreWidget, el);

    const decalage = origin();
    const rect = el.getBoundingClientRect();
    const key = el.getAttribute('data-admin-widget');
    const type = el.getAttribute('data-admin-type');

    clear(outilsWidget);
    const bouton = (nom, titre, action) => h('button', {
      class: 'btn btn--sm', type: 'button', title: titre,
      onclick: (e) => { e.preventDefault(); e.stopPropagation(); action(); },
    }, icon(nom, 12));

    outilsWidget.append(
      poigneeDeplacement(key, el),
      h('span', { class: 'wtools__name' }, t('w_' + type)),
      bouton('up', t('moveUp'), () => onWidgetOp(key, 'move', -1)),
      bouton('down', t('moveDown'), () => onWidgetOp(key, 'move', 1)),
      bouton('trash', t('remove'), () => onWidgetOp(key, 'remove')),
    );
    outilsWidget.style.left = (decalage.x + rect.left) + 'px';
    outilsWidget.style.top = (decalage.y + Math.max(rect.top - 27, 2)) + 'px';
    montrer(outilsWidget);
  }

  /**
   * La poignée : on attrape le bloc et on le pose où on veut dans sa section.
   *
   * Le déplacement est une TRANSFORMÉE, pas une marge — c'est ce qui permet
   * de bouger un bloc sans que la mise en page autour ne bronche, et donc
   * sans casser le site. Pendant le geste, on écrit directement dans le DOM
   * de l'aperçu : régénérer la section à chaque pixel serait saccadé. Le
   * modèle n'est mis à jour qu'au relâchement.
   */
  function poigneeDeplacement(key, el) {
    const poignee = h('button', {
      class: 'btn btn--sm btn--icon wtools__grab', type: 'button',
      title: t('dragMove'), 'aria-label': t('dragMove'),
    }, icon('drag', 13));

    let geste = null;

    const styleDe = () => ({ ...(widgetStyle?.(key) || {}) });
    const borne = (v) => Math.max(-400, Math.min(400, Math.round(v)));

    poignee.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const base = styleDe();

      // Les voisins et la section ne bougent pas pendant le geste : on les
      // mesure une fois. Lire la mise en page à chaque pixel serait le seul
      // vrai coût de ce mécanisme, et il est évitable.
      const section = el.closest('[data-admin-section], section') || el.parentElement;
      const freres = [];
      for (const voisin of el.parentElement?.children || []) {
        if (voisin === el) continue;
        const r = voisin.getBoundingClientRect();
        if (r.width && r.height) freres.push(r);
      }

      geste = {
        x: event.clientX, y: event.clientY,
        dx: Number(base.decalageX) || 0,
        dy: Number(base.decalageY) || 0,
        base,
        rect: el.getBoundingClientRect(),
        freres,
        reperes: reperesDe(section?.getBoundingClientRect(), freres),
        section: section?.getBoundingClientRect(),
      };
      poignee.setPointerCapture(event.pointerId);
      poignee.classList.add('wtools__grab--on');
      montrer(mesure);
    });

    poignee.addEventListener('pointermove', (event) => {
      if (!geste) return;
      // Maj enfoncée : on ne bouge que sur un axe, comme partout ailleurs.
      const brutX = geste.dx + (event.clientX - geste.x);
      const brutY = geste.dy + (event.clientY - geste.y);
      const horizontal = Math.abs(event.clientX - geste.x) >= Math.abs(event.clientY - geste.y);
      let x = borne(event.shiftKey && !horizontal ? geste.dx : brutX);
      let y = borne(event.shiftKey && horizontal ? geste.dy : brutY);

      // Où le bloc serait s'il suivait la souris sans rien d'autre.
      let vise = translater(geste.rect, x - geste.dx, y - geste.dy);

      // Alt enfoncée : on veut poser le bloc exactement là, sans aimant.
      const prise = event.altKey
        ? { dx: 0, dy: 0, ligneX: null, ligneY: null }
        : accrocher(vise, geste.reperes, TOLERANCE);
      if (prise.dx) x = borne(x + prise.dx);
      if (prise.dy) y = borne(y + prise.dy);
      vise = translater(geste.rect, x - geste.dx, y - geste.dy);

      geste.dernier = { decalageX: x, decalageY: y };
      applyStyleObject(el, { ...geste.base, ...geste.dernier });

      const decalage = origin();
      mesure.textContent = `${x > 0 ? '+' : ''}${x} · ${y > 0 ? '+' : ''}${y}`;
      mesure.style.left = (decalage.x + vise.left) + 'px';
      mesure.style.top = (decalage.y + vise.top - 26) + 'px';

      dessinerReperes(prise, vise, geste, decalage);
      placer(cadreWidget, el);
    });

    const finir = (event) => {
      if (!geste) return;
      const fini = geste.dernier;
      geste = null;
      poignee.classList.remove('wtools__grab--on');
      cacher(mesure);
      effacerReperes();
      try { poignee.releasePointerCapture(event.pointerId); } catch { /* déjà relâché */ }
      // Rien n'a bougé : on ne salit pas l'historique pour un simple clic.
      if (fini) onWidgetMove?.(key, fini);
      reposition();
    };
    poignee.addEventListener('pointerup', finir);
    poignee.addEventListener('pointercancel', finir);

    return poignee;
  }

  /**
   * Dessine les repères du glissement : les lignes d'alignement et les
   * distances aux voisins d'en face.
   */
  function dessinerReperes(prise, vise, geste, decalage) {
    const section = geste.section;

    if (prise.ligneX && section) {
      ligneX.style.left = (decalage.x + prise.ligneX.ligne) + 'px';
      ligneX.style.top = (decalage.y + Math.min(section.top, vise.top) - 12) + 'px';
      ligneX.style.height = (Math.max(section.bottom, vise.bottom)
        - Math.min(section.top, vise.top) + 24) + 'px';
      ligneX.classList.toggle('guide--centre', prise.ligneX.type === 'centre');
      montrer(ligneX);
    } else cacher(ligneX);

    if (prise.ligneY && section) {
      ligneY.style.top = (decalage.y + prise.ligneY.ligne) + 'px';
      ligneY.style.left = (decalage.x + Math.min(section.left, vise.left) - 12) + 'px';
      ligneY.style.width = (Math.max(section.right, vise.right)
        - Math.min(section.left, vise.left) + 24) + 'px';
      ligneY.classList.toggle('guide--centre', prise.ligneY.type === 'centre');
      montrer(ligneY);
    } else cacher(ligneY);

    const mesures = ecarts(vise, geste.freres);
    cotes.forEach((cote, i) => {
      const e = mesures[i];
      if (!e) { cacher(cote.trait); cacher(cote.valeur); return; }
      const taille = Math.round(e.taille);
      if (e.axe === 'v') {
        cote.trait.style.left = (decalage.x + e.centre) + 'px';
        cote.trait.style.top = (decalage.y + e.de) + 'px';
        cote.trait.style.height = (e.a - e.de) + 'px';
        cote.trait.style.width = '';
        cote.valeur.style.left = (decalage.x + e.centre + 6) + 'px';
        cote.valeur.style.top = (decalage.y + (e.de + e.a) / 2 - 9) + 'px';
      } else {
        cote.trait.style.top = (decalage.y + e.centre) + 'px';
        cote.trait.style.left = (decalage.x + e.de) + 'px';
        cote.trait.style.width = (e.a - e.de) + 'px';
        cote.trait.style.height = '';
        cote.valeur.style.left = (decalage.x + (e.de + e.a) / 2 - 12) + 'px';
        cote.valeur.style.top = (decalage.y + e.centre - 22) + 'px';
      }
      cote.trait.classList.toggle('cote--h', e.axe === 'h');
      cote.valeur.textContent = taille + ' px';
      montrer(cote.trait); montrer(cote.valeur);
    });
  }

  /** Dessine une invite de dépôt sur chaque conteneur vide. */
  function peindreZonesVides() {
    for (const zone of zonesVides) zone.remove();
    zonesVides.length = 0;
    if (!doc) return;

    const decalage = origin();
    for (const conteneur of doc.querySelectorAll('[data-admin-widget]')) {
      const type = conteneur.getAttribute('data-admin-type');
      if (!CONTENEURS.has(type) || type === 'columns') continue;
      if (enfantsDe(conteneur).length) continue;

      const hote = type === 'section' ? conteneur.firstElementChild : conteneur;
      if (!hote) continue;
      const rect = hote.getBoundingClientRect();
      if (rect.width < 40) continue;

      const key = conteneur.getAttribute('data-admin-widget');
      const zone = h('div', {
        class: 'drop drop--empty',
        onclick: () => onWidgetSelect?.(key),
        style: {
          left: (decalage.x + rect.left) + 'px',
          top: (decalage.y + rect.top) + 'px',
          width: rect.width + 'px',
          height: Math.max(rect.height, 92) + 'px',
        },
      }, icon('plus', 14), t('dropHere'));
      layer.appendChild(zone);
      zonesVides.push(zone);
    }
  }

  /** Section de premier niveau contenant un nœud. */
  function sectionSous(noeud) {
    for (const section of sections) {
      if (section.el === noeud || section.el.contains(noeud)) return section;
    }
    return null;
  }

  function peindreSection(section) {
    if (!section || !section.el.isConnected) {
      cacher(cadreSection); cacher(outilsSection); cacher(pointAjout);
      return;
    }
    placer(cadreSection, section.el);

    const decalage = origin();
    const rect = section.el.getBoundingClientRect();
    const index = sections.indexOf(section);
    const centre = decalage.x + rect.left + rect.width / 2;

    clear(outilsSection);
    const bouton = (nom, titre, action, danger) => h('button', {
      class: 'btn btn--sm' + (danger ? ' btn--danger' : ''), type: 'button', title: titre,
      onclick: (e) => { e.preventDefault(); e.stopPropagation(); action(); },
    }, icon(nom, 13));

    outilsSection.append(
      h('span', { class: 'secttools__name' }, section.label),
      bouton('up', t('moveUp'), () => onSectionOp(section.ref, 'move', index, index - 1)),
      bouton('down', t('moveDown'), () => onSectionOp(section.ref, 'move', index, index + 1)),
      bouton('copy', t('duplicateSection'), () => onSectionOp(section.ref, 'duplicate')),
      bouton('trash', t('hideSection'), () => {
        if (confirm(t('hideSectionConfirm'))) onSectionOp(section.ref, 'hide');
      }, true),
    );
    outilsSection.style.left = centre + 'px';
    outilsSection.style.top = (decalage.y + Math.max(rect.top + 10, 10)) + 'px';
    montrer(outilsSection);

    clear(pointAjout);
    pointAjout.appendChild(h('button', {
      type: 'button',
      onclick: (e) => { e.preventDefault(); e.stopPropagation(); onAddSection(section.ref); },
    }, icon('plus', 12), t('addSectionHere')));
    pointAjout.style.left = (decalage.x + rect.left) + 'px';
    pointAjout.style.width = rect.width + 'px';
    pointAjout.style.top = (decalage.y + rect.bottom) + 'px';
    montrer(pointAjout);
  }

  /**
   * Décide ce qu'il faut montrer sous le pointeur.
   *
   * Une seule barre à la fois, du plus précis au plus large : un widget, sinon
   * un bloc répétable, sinon la section. Sans cette règle, la racine d'une
   * section ajoutée affichait deux barres superposées — celle du widget et
   * celle de la section — et on ne savait plus laquelle agissait sur quoi.
   */
  const surMouvement = (event) => {
    if (!actif) return;
    garder();

    const cibleWidget = widgetSous(event.target);
    // La racine d'une section ajoutée est gérée comme une section, pas comme
    // un widget : c'est la même chose vue de deux endroits.
    const widget = cibleWidget && !cibleWidget.hasAttribute('data-admin-section') ? cibleWidget : null;
    const item = widget ? null : itemSous(event.target);
    const section = sectionSous(event.target);

    const entry = entreeSous(event.target);
    if (entry !== survole) { survole = entry; peindreSurvol(entry); }

    if (widget !== widgetSurvole) {
      widgetSurvole = widget;
      peindreWidget(widget);
    }

    if (item !== itemSurvole) {
      itemSurvole = item;
      peindreOutilsBloc(item);
    }

    if (section !== sectionSurvolee) {
      sectionSurvolee = section;
      peindreSection(section);
    }
  };

  // Sortir de l'aperçu ne masque pas tout de suite : le pointeur est
  // peut-être en route vers une barre d'outils.
  const surSortie = () => programmerMasquage();

  const surClic = (event) => {
    if (!actif) return;
    // Ce qui appartient au module dans l'aperçu — la fenêtre d'un appel à
    // l'action qu'on prévisualise — garde ses propres commandes.
    if (event.target.closest?.('[data-admin-ui]')) return;
    const widget = widgetSous(event.target);
    if (widget) {
      event.preventDefault();
      event.stopPropagation();
      onWidgetSelect?.(widget.getAttribute('data-admin-widget'));
      return;
    }
    // En édition, un lien se modifie ; il ne se suit pas.
    event.preventDefault();
    event.stopPropagation();
    const entry = entreeSous(event.target);
    const item = itemSous(event.target);
    onSelect(entry
      ? { el: entry.el, entry, collection: item?.collection, itemIndex: item?.index }
      : { el: event.target, collection: item?.collection, itemIndex: item?.index });
  };

  const reposition = () => {
    if (!actif) {
      for (const n of [cadre, cadreActif, cadreWidget, cadreSection, ...FLOTTANTS]) cacher(n);
      effacerReperes();
      return;
    }
    placer(cadre, survole?.el);
    placer(cadreActif, selectionne);
    if (itemSurvole) peindreOutilsBloc(itemSurvole); else cacher(outilsBloc);
    if (widgetSurvole) peindreWidget(widgetSurvole); else { cacher(cadreWidget); cacher(outilsWidget); }
    if (sectionSurvolee) peindreSection(sectionSurvolee); else { cacher(cadreSection); cacher(outilsSection); cacher(pointAjout); }
    peindreZonesVides();
    onReposition?.();
  };

  // ================= Glisser-déposer =================
  // Tout est traité dans le document de l'éditeur : la couche passe au
  // premier plan pendant le glissement et retrouve la cible par ses
  // coordonnées. Pas de transfert entre documents, donc pas de surprise.
  function pointDansApercu(event) {
    const cadreEl = layer.parentElement.querySelector('iframe');
    if (!cadreEl) return null;
    const r = cadreEl.getBoundingClientRect();
    return { x: event.clientX - r.left, y: event.clientY - r.top };
  }

  function cibleDepot(event) {
    const point = pointDansApercu(event);
    if (!point || !doc) return null;
    const sous = doc.elementFromPoint(point.x, point.y);
    if (!sous) return null;

    const trouve = conteneurSous(sous);
    if (!trouve) return null;

    const { conteneur, enfant } = trouve;
    const enfants = enfantsDe(conteneur);
    const key = conteneur.getAttribute('data-admin-widget');

    if (!enfants.length) {
      const type = conteneur.getAttribute('data-admin-type');
      const hote = type === 'section' ? conteneur.firstElementChild : conteneur;
      return { parentKey: key, index: 0, rect: hote.getBoundingClientRect(), pleine: true };
    }

    const voisin = enfant && enfants.includes(enfant) ? enfant : enfants[enfants.length - 1];
    const rect = voisin.getBoundingClientRect();
    const avant = point.y < rect.top + rect.height / 2;
    const index = enfants.indexOf(voisin) + (avant ? 0 : 1);
    return { parentKey: key, index, rect, avant };
  }

  function montrerLigne(cible) {
    if (!cible) { cacher(ligneDepot); return; }
    const decalage = origin();
    if (cible.pleine) {
      ligneDepot.style.left = (decalage.x + cible.rect.left + 10) + 'px';
      ligneDepot.style.top = (decalage.y + cible.rect.top + cible.rect.height / 2) + 'px';
      ligneDepot.style.width = Math.max(0, cible.rect.width - 20) + 'px';
    } else {
      ligneDepot.style.left = (decalage.x + cible.rect.left) + 'px';
      ligneDepot.style.top = (decalage.y + (cible.avant ? cible.rect.top : cible.rect.bottom)) + 'px';
      ligneDepot.style.width = cible.rect.width + 'px';
    }
    montrer(ligneDepot);
  }

  const surGlisse = (event) => {
    if (!typeEnCours) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    montrerLigne(cibleDepot(event));
  };

  const surDepot = (event) => {
    if (!typeEnCours) return;
    event.preventDefault();
    const cible = cibleDepot(event);
    const type = typeEnCours;
    endDrag();
    if (cible) onWidgetDrop?.(type, cible.parentKey, cible.index);
  };

  function beginDrag(type) {
    typeEnCours = type;
    layer.style.pointerEvents = 'auto';
    layer.addEventListener('dragover', surGlisse);
    layer.addEventListener('drop', surDepot);
  }

  function endDrag() {
    typeEnCours = null;
    layer.style.pointerEvents = '';
    layer.removeEventListener('dragover', surGlisse);
    layer.removeEventListener('drop', surDepot);
    cacher(ligneDepot);
  }

  function brancher() {
    if (!doc) return;
    doc.addEventListener('mousemove', surMouvement, true);
    doc.addEventListener('mouseleave', surSortie);
    doc.addEventListener('click', surClic, true);
    win.addEventListener('scroll', reposition, true);
    win.addEventListener('resize', reposition);
    doc.documentElement.setAttribute('data-admin-editable', '');
  }

  function debrancher() {
    if (!doc) return;
    doc.removeEventListener('mousemove', surMouvement, true);
    doc.removeEventListener('mouseleave', surSortie);
    doc.removeEventListener('click', surClic, true);
    win.removeEventListener('scroll', reposition, true);
    win.removeEventListener('resize', reposition);
    doc.documentElement.removeAttribute('data-admin-editable');
  }

  return {
    refresh,
    reposition,
    enable() { if (actif) return; actif = true; brancher(); reposition(); },
    disable() { debrancher(); actif = false; survole = null; sectionSurvolee = null; reposition(); },
    beginDrag,
    endDrag,
    /** Sections de la page, telles que l'aperçu les voit. */
    get sections() { return sections; },
    setActive(el) { selectionne = el || null; placer(cadreActif, selectionne); },
    /**
     * Amène un élément à l'écran — mais SEULEMENT s'il n'y est pas déjà.
     *
     * Faire défiler à chaque fois est ce qui donne l'impression que la page
     * saute sous les doigts : on entre dans un champ, l'aperçu bouge, on
     * perd de vue ce qu'on était en train de regarder. Un élément déjà
     * visible n'a aucune raison d'être « révélé ».
     *
     * @param {Element} el
     * @param {string} block
     * @param {{force?:boolean}} [options] force le défilement même si
     *   l'élément est visible — utile quand on vient de le créer.
     */
    reveal(el, block = 'center', options = {}) {
      if (!el || !el.isConnected) return;
      if (!options.force && estBienVisible(el)) { reposition(); return; }
      el.scrollIntoView({ block, behavior: 'smooth' });
      // Le défilement est animé : on repositionne pendant et après, sinon
      // les contours et les zones de dépôt resteraient à l'ancienne place.
      const debut = Date.now();
      const suivre = setInterval(() => {
        reposition();
        if (Date.now() - debut > 700) clearInterval(suivre);
      }, 60);
    },
    get document() { return doc; },
  };
}
