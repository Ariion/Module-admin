/**
 * Actions des appels à l'action : ouvrir une fenêtre plutôt que partir.
 *
 * Un bouton « Réserver » qui envoie sur un autre site perd le visiteur. Une
 * fenêtre — au centre, sur le côté, en bas — le garde sur la page et lui
 * donne ce qu'il cherche : les disponibilités, un formulaire, un plan, un
 * numéro de téléphone.
 *
 * Trois principes :
 *  - le lien reste un lien. Sans JavaScript, ou si le module est retiré, le
 *    clic suit le `href` : rien n'est cassé, on perd seulement la fenêtre ;
 *  - la fenêtre est marquée `data-admin-ui`. L'éditeur la masque, l'export
 *    la retire : elle ne pollue jamais le code du site ;
 *  - l'habillage est neutre et hérite de la police du site, pour ne jurer
 *    avec aucune maquette.
 * @module core/actions
 */
import { safeUrl, safeImageUrl, safeText, safeHtml } from './sanitize.js';

/** Façons d'ouvrir. `lien` est le comportement d'origine : on suit le href. */
export const TYPES_ACTION = ['lien', 'popup', 'panneau-droite', 'panneau-gauche', 'bas', 'plein-ecran'];

/**
 * Modèles de remplissage : le client choisit ce qu'il veut mettre dans la
 * fenêtre, et repart avec un contenu déjà écrit qu'il n'a plus qu'à corriger.
 */
export const MODELES_ACTION = [
  {
    id: 'reservation',
    contenu: () => ({
      titre: 'Réserver votre séjour',
      texte: 'Choisissez vos dates et le nombre de personnes. La réservation en direct vous garantit notre meilleur tarif.',
      boutons: [{ texte: 'Voir les disponibilités', href: 'https://' }],
      integration: '',
    }),
  },
  {
    id: 'contact',
    contenu: () => ({
      titre: 'Nous contacter',
      texte: 'Nous répondons sous 24 heures ouvrées.<br>Téléphone : 00 00 00 00 00<br>Courriel : contact@exemple.fr',
      boutons: [{ texte: 'Écrire un message', href: 'mailto:contact@exemple.fr' },
        { texte: 'Appeler', href: 'tel:+33000000000' }],
      integration: '',
    }),
  },
  {
    id: 'horaires',
    contenu: () => ({
      titre: 'Horaires et accès',
      texte: 'Lundi au vendredi : 9 h – 18 h<br>Samedi : 10 h – 17 h<br>Dimanche : fermé<br><br>1 rue de l’Exemple, 00000 Ville',
      boutons: [{ texte: 'Itinéraire', href: 'https://maps.google.com/?q=' }],
      integration: '',
    }),
  },
  {
    id: 'carte',
    contenu: () => ({
      titre: 'Nous trouver',
      texte: '',
      boutons: [],
      integration: 'https://www.google.com/maps?output=embed&q=1+rue+de+l+Exemple',
    }),
  },
  {
    id: 'video',
    contenu: () => ({
      titre: 'En vidéo',
      texte: '',
      boutons: [],
      integration: 'https://www.youtube-nocookie.com/embed/',
    }),
  },
  { id: 'libre', contenu: () => ({ titre: '', texte: '', boutons: [], integration: '' }) },
];

const ACTION_VIDE = { type: 'lien', modele: 'libre', titre: '', texte: '', image: '', integration: '', boutons: [], largeur: 520 };

/** Ne laisse entrer que ce qui est décrit ici, et rien d'autre. */
export function normaliserAction(brut) {
  if (!brut || typeof brut !== 'object') return { ...ACTION_VIDE };
  const type = TYPES_ACTION.includes(brut.type) ? brut.type : 'lien';
  const largeur = Number(brut.largeur);
  return {
    type,
    modele: MODELES_ACTION.some((m) => m.id === brut.modele) ? brut.modele : 'libre',
    titre: safeText(brut.titre ?? '').slice(0, 160),
    texte: safeHtml(brut.texte ?? ''),
    image: safeImageUrl(brut.image ?? ''),
    integration: /^https?:/i.test(String(brut.integration || '')) ? safeUrl(brut.integration) : '',
    boutons: Array.isArray(brut.boutons)
      ? brut.boutons.slice(0, 4)
        .map((b) => ({ texte: safeText(b?.texte ?? '').slice(0, 80), href: safeUrl(b?.href ?? '') }))
        .filter((b) => b.texte)
      : [],
    largeur: Number.isFinite(largeur) ? Math.min(1200, Math.max(280, largeur)) : 520,
  };
}

/** Une action ouvre-t-elle vraiment quelque chose ? */
export function actionActive(action) {
  return !!action && action.type !== 'lien' && TYPES_ACTION.includes(action.type);
}

/**
 * Les cibles de la page : éléments du site porteurs d'une action, et widgets
 * boutons qui en déclarent une.
 * @param {object} model modèle de page
 * @returns {{el:Element, action:object}[]}
 */
export function actionsDe(model) {
  const cibles = [];
  const ajouter = (el, brut) => {
    if (!el) return;
    const action = normaliserAction(brut);
    if (actionActive(action)) cibles.push({ el, action });
  };

  for (const [id, entry] of model.entries) {
    ajouter(entry.el, model.valueOf(id)?.action);
  }

  // Champs de blocs répétables : un bouton par carte, chacun le sien.
  for (const collection of model.collections || []) {
    const data = model.collectionData(collection.id);
    if (!data?.items) continue;
    data.items.forEach((item, index) => {
      const itemEl = collection.items[index];
      if (!itemEl || !item.fields) return;
      const champs = model.fieldsIn(itemEl);
      for (const [cle, valeur] of Object.entries(item.fields)) {
        ajouter(champs.get(cle)?.el, valeur?.action);
      }
    });
  }

  // Widgets insérés.
  const parcourir = (noeuds) => {
    for (const noeud of noeuds || []) {
      if (noeud.props?.action) {
        ajouter(model.doc.querySelector(`[data-admin-widget="${noeud.key}"] a, [data-admin-widget="${noeud.key}"]`),
          noeud.props.action);
      }
      if (noeud.children) parcourir(noeud.children);
    }
  };
  for (const record of model.widgetSections?.() || []) parcourir([record.tree]);

  return cibles;
}

// ------------------------------------------------------------------ rendu
const ID_STYLE = 'admin-cta-style';

const CSS = `
.admin-cta{position:fixed;inset:0;z-index:2147483000;display:flex;font:inherit;color:inherit}
.admin-cta[hidden]{display:none}
.admin-cta__fond{position:absolute;inset:0;background:rgba(12,14,18,.55);
  opacity:0;transition:opacity .22s ease}
.admin-cta.admin-cta--ouvert .admin-cta__fond{opacity:1}
.admin-cta__boite{position:relative;display:flex;flex-direction:column;background:#fff;color:#15181d;
  max-width:100%;max-height:100%;overflow:auto;box-shadow:0 24px 70px rgba(0,0,0,.32);
  transition:transform .26s cubic-bezier(.32,.72,0,1),opacity .22s ease;opacity:0;
  -webkit-overflow-scrolling:touch}
/* Deux classes suffiraient, mais les règles de type qui suivent ont la même
   spécificité et gagneraient : le panneau ne rentrerait jamais. */
.admin-cta.admin-cta--ouvert .admin-cta__boite{opacity:1;transform:none}

.admin-cta--popup{align-items:center;justify-content:center;padding:24px}
.admin-cta--popup .admin-cta__boite{width:100%;border-radius:14px;transform:translateY(14px) scale(.98)}

.admin-cta--panneau-droite{justify-content:flex-end}
.admin-cta--panneau-droite .admin-cta__boite{height:100%;width:100%;transform:translateX(100%)}
.admin-cta--panneau-gauche{justify-content:flex-start}
.admin-cta--panneau-gauche .admin-cta__boite{height:100%;width:100%;transform:translateX(-100%)}

.admin-cta--bas{align-items:flex-end;justify-content:center}
.admin-cta--bas .admin-cta__boite{width:100%;border-radius:18px 18px 0 0;max-height:88%;transform:translateY(100%)}

.admin-cta--plein-ecran .admin-cta__boite{width:100%;height:100%;max-width:none}

.admin-cta__fermer{position:absolute;top:12px;right:12px;z-index:2;width:36px;height:36px;
  display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;
  background:rgba(255,255,255,.92);border:1px solid rgba(0,0,0,.08);border-radius:50%;
  color:#15181d;font:inherit;font-size:19px;line-height:1;box-shadow:0 2px 8px rgba(0,0,0,.12)}
.admin-cta__fermer:hover{background:#fff}
.admin-cta__image{width:100%;max-height:280px;object-fit:cover;display:block;flex:none}
.admin-cta__corps{padding:30px 32px 32px}
.admin-cta__titre{margin:0 0 12px;font-size:1.45rem;line-height:1.2;font-weight:600;letter-spacing:-.01em}
.admin-cta__texte{margin:0;line-height:1.6;color:#4b5563}
.admin-cta__texte a{color:inherit}
.admin-cta__cadre{width:100%;border:0;flex:1;min-height:420px;display:block}
.admin-cta--popup .admin-cta__cadre{min-height:380px}
.admin-cta__actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}
.admin-cta__bouton{display:inline-block;padding:12px 22px;border-radius:999px;text-decoration:none;
  background:#15181d;color:#fff;font-weight:500;line-height:1.2}
.admin-cta__bouton:hover{opacity:.88}
.admin-cta__bouton + .admin-cta__bouton{background:transparent;color:#15181d;border:1px solid rgba(0,0,0,.18)}
@media (max-width:640px){
  .admin-cta--panneau-droite .admin-cta__boite,
  .admin-cta--panneau-gauche .admin-cta__boite{height:auto;max-height:88%;width:100%;border-radius:18px 18px 0 0;
    transform:translateY(100%);margin-top:auto}
  .admin-cta.admin-cta--ouvert .admin-cta__boite{transform:none}
  .admin-cta--panneau-droite,.admin-cta--panneau-gauche{align-items:flex-end}
  .admin-cta__corps{padding:24px 20px 26px}
  .admin-cta--popup{padding:12px}
}
@media (prefers-reduced-motion:reduce){
  .admin-cta__fond,.admin-cta__boite{transition:none}
}
`;

function poserStyle(doc) {
  if (doc.getElementById(ID_STYLE)) return;
  const style = doc.createElement('style');
  style.id = ID_STYLE;
  style.setAttribute('data-admin-ui', '');
  style.textContent = CSS;
  doc.head.appendChild(style);
}

/** Construit la fenêtre. Rien n'est injecté en HTML brut sans assainissement. */
function construire(doc, action, fermer) {
  const couche = doc.createElement('div');
  couche.className = 'admin-cta admin-cta--' + action.type;
  couche.setAttribute('data-admin-ui', '');
  couche.setAttribute('role', 'dialog');
  couche.setAttribute('aria-modal', 'true');
  if (action.titre) couche.setAttribute('aria-label', action.titre);

  const fond = doc.createElement('div');
  fond.className = 'admin-cta__fond';
  fond.addEventListener('click', fermer);

  const boite = doc.createElement('div');
  boite.className = 'admin-cta__boite';
  if (action.type === 'popup') boite.style.maxWidth = action.largeur + 'px';
  if (action.type === 'panneau-droite' || action.type === 'panneau-gauche') boite.style.maxWidth = action.largeur + 'px';
  if (action.type === 'bas') boite.style.maxWidth = Math.max(action.largeur, 640) + 'px';

  const bouton = doc.createElement('button');
  bouton.type = 'button';
  bouton.className = 'admin-cta__fermer';
  bouton.setAttribute('aria-label', 'Fermer');
  bouton.textContent = '×';
  bouton.addEventListener('click', fermer);
  boite.appendChild(bouton);

  if (action.image) {
    const img = doc.createElement('img');
    img.className = 'admin-cta__image';
    img.setAttribute('src', action.image);
    img.setAttribute('alt', '');
    boite.appendChild(img);
  }

  const corps = doc.createElement('div');
  corps.className = 'admin-cta__corps';

  if (action.titre) {
    const titre = doc.createElement('h2');
    titre.className = 'admin-cta__titre';
    titre.textContent = action.titre;
    corps.appendChild(titre);
  }
  if (action.texte) {
    const texte = doc.createElement('div');
    texte.className = 'admin-cta__texte';
    texte.innerHTML = safeHtml(action.texte);
    corps.appendChild(texte);
  }
  if (action.boutons.length) {
    const actions = doc.createElement('div');
    actions.className = 'admin-cta__actions';
    for (const b of action.boutons) {
      const lien = doc.createElement('a');
      lien.className = 'admin-cta__bouton';
      lien.textContent = b.texte;
      if (b.href) {
        lien.setAttribute('href', b.href);
        if (/^https?:/i.test(b.href)) {
          lien.setAttribute('target', '_blank');
          lien.setAttribute('rel', 'noopener noreferrer');
        }
      }
      actions.appendChild(lien);
    }
    corps.appendChild(actions);
  }
  if (corps.childNodes.length) boite.appendChild(corps);

  if (action.integration) {
    const cadre = doc.createElement('iframe');
    cadre.className = 'admin-cta__cadre';
    cadre.setAttribute('src', action.integration);
    cadre.setAttribute('title', action.titre || 'Contenu');
    cadre.setAttribute('loading', 'lazy');
    cadre.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
    cadre.setAttribute('allowfullscreen', '');
    boite.appendChild(cadre);
  }

  couche.append(fond, boite);
  return { couche, boite, premier: bouton };
}

const FOCUSABLES = 'a[href],button:not([disabled]),input,select,textarea,iframe,[tabindex]:not([tabindex="-1"])';

/**
 * Ouvre une fenêtre. Utilisable seule pour la prévisualisation depuis
 * l'éditeur.
 * @returns {{close:Function}}
 */
export function ouvrirAction(doc, brut) {
  const action = normaliserAction(brut);
  if (!actionActive(action)) return { close() {} };

  poserStyle(doc);
  const vue = doc.defaultView;
  const rendu = doc.activeElement;
  const debordement = doc.documentElement.style.overflow;

  let ferme = false;
  const fermer = () => {
    if (ferme) return;
    ferme = true;
    couche.classList.remove('admin-cta--ouvert');
    doc.documentElement.style.overflow = debordement;
    doc.removeEventListener('keydown', surTouche, true);
    const retirer = () => couche.remove();
    if (vue?.matchMedia?.('(prefers-reduced-motion: reduce)').matches) retirer();
    else vue?.setTimeout(retirer, 260);
    try { rendu?.focus?.(); } catch { /* élément disparu */ }
  };

  const { couche, boite, premier } = construire(doc, action, fermer);

  function surTouche(e) {
    if (e.key === 'Escape') { e.preventDefault(); fermer(); return; }
    if (e.key !== 'Tab') return;
    // Le clavier ne doit pas sortir de la fenêtre tant qu'elle est ouverte.
    const cibles = [...boite.querySelectorAll(FOCUSABLES)].filter((n) => n.offsetParent !== null || n === premier);
    if (!cibles.length) return;
    const debut = cibles[0];
    const fin = cibles[cibles.length - 1];
    if (e.shiftKey && doc.activeElement === debut) { e.preventDefault(); fin.focus(); }
    else if (!e.shiftKey && doc.activeElement === fin) { e.preventDefault(); debut.focus(); }
  }

  doc.body.appendChild(couche);
  doc.documentElement.style.overflow = 'hidden';
  doc.addEventListener('keydown', surTouche, true);
  // Une image de fond posée dans la foulée n'animerait pas : on laisse un
  // cycle au navigateur avant d'ouvrir.
  vue?.requestAnimationFrame(() => couche.classList.add('admin-cta--ouvert'));
  vue?.setTimeout(() => premier.focus(), 40);

  return { close: fermer };
}

/**
 * Branche les actions sur les éléments de la page.
 * @returns {Function} détache tout
 */
export function attacherActions(doc, cibles) {
  const poses = [];
  for (const { el, action } of cibles) {
    const surClic = (e) => {
      // Un clic modifié (nouvel onglet, téléchargement) garde son sens.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      ouvrirAction(doc, action);
    };
    el.addEventListener('click', surClic);
    poses.push(() => el.removeEventListener('click', surClic));
  }
  return () => { for (const detacher of poses) detacher(); };
}
