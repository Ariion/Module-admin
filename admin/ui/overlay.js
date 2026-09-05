/**
 * Surcouche de sélection posée sur l'aperçu.
 *
 * Le site vit dans une iframe : les contours sont dessinés à côté, dans le
 * panneau, jamais dans la page. Rien n'est ajouté au DOM du site, donc
 * quitter l'édition ne laisse aucune trace.
 * @module ui/overlay
 */
import { h, icon, clear } from './el.js';

const LABELS = { text: 'text', image: 'image', link: 'link', background: 'background' };

export function createOverlay({ layer, origin, t, onSelect, onCollectionOp, onSectionOp, onAddSection, onReposition, onWidgetOp, onWidgetDrop, onWidgetSelect }) {
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

  // Le pointeur qui passe sur une barre d'outils quitte l'iframe : sans ce
  // délai, la barre disparaîtrait avant d'être cliquable.
  let minuteurSection = null;
  const garderSection = () => clearTimeout(minuteurSection);
  const lacherSection = () => {
    clearTimeout(minuteurSection);
    minuteurSection = setTimeout(() => {
      sectionSurvolee = null;
      cacher(cadreSection); cacher(outilsSection); cacher(pointAjout);
    }, 260);
  };
  for (const n of [outilsSection, pointAjout]) {
    n.addEventListener('mouseenter', garderSection);
    n.addEventListener('mouseleave', lacherSection);
  }

  let sections = [];
  let sectionSurvolee = null;

  // --- Widgets : sélection et dépôt ------------------------------------
  const cadreWidget = h('div', { class: 'wsel' });
  const outilsWidget = h('div', { class: 'wtools' });
  const ligneDepot = h('div', { class: 'dropline' });
  const zonesVides = [];
  layer.append(cadreWidget, outilsWidget, ligneDepot);
  cacher(cadreWidget); cacher(outilsWidget); cacher(ligneDepot);

  let widgetSurvole = null;
  let typeEnCours = null;

  const CONTENEURS = new Set(['section', 'columns', 'column']);

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
    outilsBloc.style.left = (decalage.x + Math.max(rect.left, rect.right - 128)) + 'px';
    outilsBloc.style.top = (decalage.y + rect.top + 5) + 'px';
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
      h('span', { class: 'wtools__name' }, t('w_' + type)),
      bouton('up', t('moveUp'), () => onWidgetOp(key, 'move', -1)),
      bouton('down', t('moveDown'), () => onWidgetOp(key, 'move', 1)),
      bouton('trash', t('remove'), () => onWidgetOp(key, 'remove')),
    );
    outilsWidget.style.left = (decalage.x + rect.left) + 'px';
    outilsWidget.style.top = (decalage.y + Math.max(rect.top - 27, 2)) + 'px';
    montrer(outilsWidget);
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

  const surMouvement = (event) => {
    if (!actif) return;
    const entry = entreeSous(event.target);
    if (entry !== survole) { survole = entry; peindreSurvol(entry); }
    peindreOutilsBloc(itemSous(event.target));

    const widget = widgetSous(event.target);
    if (widget !== widgetSurvole) {
      widgetSurvole = widget;
      peindreWidget(widget);
    }

    const section = sectionSous(event.target);
    if (section !== sectionSurvolee) {
      garderSection();
      sectionSurvolee = section;
      peindreSection(section);
    }
  };

  const surSortie = () => { survole = null; cacher(cadre); cacher(outilsBloc); lacherSection(); };

  const surClic = (event) => {
    if (!actif) return;
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
      for (const n of [cadre, cadreActif, outilsBloc, cadreSection, outilsSection, pointAjout]) cacher(n);
      return;
    }
    placer(cadre, survole?.el);
    placer(cadreActif, selectionne);
    cacher(outilsBloc);
    if (widgetSurvole) peindreWidget(widgetSurvole); else { cacher(cadreWidget); cacher(outilsWidget); }
    if (sectionSurvolee) peindreSection(sectionSurvolee); else cacher(cadreSection);
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
    /** Fait défiler l'aperçu jusqu'à un élément et le met en évidence. */
    reveal(el) {
      if (!el || !el.isConnected) return;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
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
