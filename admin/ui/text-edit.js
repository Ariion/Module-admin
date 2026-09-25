/**
 * Édition de texte directement dans l'aperçu (contenteditable).
 *
 * Le collage est toujours converti en texte brut : sans cela, un copier-coller
 * depuis Word injecterait des dizaines de balises de mise en forme. La mise
 * en forme se limite à gras, italique, souligné, couleur et lien — de quoi
 * écrire, sans de quoi défaire le design du développeur.
 *
 * La sélection est le point délicat. Cliquer dans la barre, ou ouvrir un
 * champ, retire le focus de l'aperçu et efface la sélection : la commande
 * n'a alors plus rien sur quoi s'appliquer. On la retient donc avant chaque
 * geste, et on la repose avant d'exécuter.
 * @module ui/text-edit
 */
import { h, icon } from './el.js';
import { readCurrent } from '../core/model.js';
import { safeUrl } from '../core/sanitize.js';

/** Palette de repli, quand le site n'en déclare pas. */
const COULEURS = ['#112338', '#509ea4', '#3a5068', '#b3261e', '#1d7a3e', '#8a5cf6'];

export function createTextEditor({ layer, origin, t, onCommit, couleurs = null }) {
  let courant = null;
  let avant = null;
  let doc = null;
  let plageRetenue = null;

  const barre = h('div', { class: 'rtb' });
  barre.style.display = 'none';
  layer.appendChild(barre);

  /** Retient la sélection de l'aperçu avant qu'un clic ailleurs ne l'efface. */
  function retenir() {
    const selection = doc?.defaultView?.getSelection();
    if (selection && selection.rangeCount) plageRetenue = selection.getRangeAt(0).cloneRange();
  }

  /** La repose, pour que la commande s'applique au bon endroit. */
  function reposer() {
    if (!doc || !plageRetenue) return false;
    const selection = doc.defaultView.getSelection();
    if (!selection) return false;
    selection.removeAllRanges();
    selection.addRange(plageRetenue);
    return true;
  }

  /**
   * Exécute une commande sur la sélection retenue.
   *
   * styleWithCSS décide de ce que produit le navigateur : des balises (<b>,
   * <i>, <u>) ou des styles en ligne. On veut des balises pour la mise en
   * forme — le nettoyeur ne garde du style que la couleur — et du style pour
   * la couleur, qui n'a pas de balise.
   */
  function executer(nom, valeur = null, parCss = false) {
    if (!doc) return;
    courant?.el.focus();
    reposer();
    try { doc.execCommand('styleWithCSS', false, parCss); } catch { /* vieux moteur */ }
    doc.execCommand(nom, false, valeur);
    retenir();
    majEtat();
  }

  const commande = (nom, parCss = false, valeur = null) => (event) => {
    event.preventDefault();
    executer(nom, valeur, parCss);
  };

  /** Une sélection vide ne donne rien à colorer ni à lier : on le dit. */
  function riendeSelectionne() {
    return !plageRetenue || plageRetenue.collapsed;
  }

  /**
   * Bouton de barre. Il ne prend JAMAIS le focus : l'aperçu garde le sien,
   * donc sa sélection, et l'édition ne se referme pas. C'est ce qui manquait
   * aux pastilles de couleur — cliquer l'une d'elles refermait l'éditeur.
   */
  function boutonBarre(props, ...enfants) {
    return h('button', {
      type: 'button', ...props,
      onmousedown: (e) => { e.preventDefault(); retenir(); },
    }, ...enfants);
  }

  // Le champ d'adresse, lui, a besoin du focus. On le signale pour que la
  // sortie de l'aperçu ne soit pas prise pour une fin d'édition.
  let saisieEnCours = false;

  // ---------------------------------------------------------------- lien
  const champLien = h('input', {
    class: 'rtb__url', type: 'text', placeholder: 'https://…',
    onfocus: () => { saisieEnCours = true; },
    onblur: () => { setTimeout(() => { saisieEnCours = false; }, 120); },
    onkeydown: (e) => {
      if (e.key === 'Enter') { e.preventDefault(); validerLien(); }
      else if (e.key === 'Escape') { e.preventDefault(); volet.style.display = 'none'; courant?.el.focus(); }
    },
  });
  const volet = h('div', { class: 'rtb__volet' });
  volet.style.display = 'none';

  function ouvrirLien() {
    if (riendeSelectionne()) { annoncer(t('selectionVide')); return; }
    volet.replaceChildren(
      h('div', { class: 'rtb__ligne' },
        champLien,
        boutonBarre({ class: 'btn btn--sm btn--primary', onclick: validerLien }, t('ok')),
        boutonBarre({ class: 'btn btn--sm', title: t('linkRemove'), onclick: retirerLien }, icon('close', 12)),
      ),
      h('p', { class: 'hint', style: { margin: '6px 0 0' } }, t('linkHint')),
    );
    champLien.value = lienSousSelection() || 'https://';
    volet.style.display = '';
    setTimeout(() => { champLien.focus(); champLien.select(); }, 20);
  }

  function lienSousSelection() {
    const noeud = plageRetenue?.commonAncestorContainer;
    const el = noeud?.nodeType === 1 ? noeud : noeud?.parentElement;
    return el?.closest?.('a[href]')?.getAttribute('href') || '';
  }

  function validerLien() {
    const url = safeUrl(champLien.value.trim());
    if (!url) { annoncer(t('linkInvalide')); champLien.focus(); return; }
    executer('createLink', url);
    volet.style.display = 'none';
  }

  function retirerLien() {
    executer('unlink');
    volet.style.display = 'none';
  }

  // ------------------------------------------------------------- couleur
  const nuancier = h('div', { class: 'rtb__volet rtb__nuancier' });
  nuancier.style.display = 'none';

  function ouvrirCouleurs() {
    if (riendeSelectionne()) { annoncer(t('selectionVide')); return; }
    const palette = (Array.isArray(couleurs) && couleurs.length ? couleurs : COULEURS).slice(0, 10);
    nuancier.replaceChildren(
      ...palette.map((c) => boutonBarre({
        class: 'rtb__pastille', title: c, style: { background: c },
        onclick: () => { executer('foreColor', c, true); nuancier.style.display = 'none'; },
      })),
      boutonBarre({
        class: 'btn btn--sm', style: { marginLeft: '6px' },
        onclick: () => { executer('removeFormat'); nuancier.style.display = 'none'; },
      }, t('couleurDefaut')),
    );
    nuancier.style.display = '';
  }

  // ------------------------------------------------------------- annonce
  const mot = h('p', { class: 'rtb__mot' });
  mot.style.display = 'none';
  let minuteur = null;
  function annoncer(texte) {
    mot.textContent = texte;
    mot.style.display = '';
    clearTimeout(minuteur);
    minuteur = setTimeout(() => { mot.style.display = 'none'; }, 2600);
  }

  // -------------------------------------------------------------- boutons
  const bouton = (nom, titre, icone, action) => boutonBarre({
    class: 'btn btn--sm btn--icon', title: titre, 'data-cmd': nom,
    onclick: (e) => { e.preventDefault(); action(e); },
  }, icon(icone, 13));

  const boutons = [
    bouton('bold', t('bold'), 'bold', commande('bold')),
    bouton('italic', t('italic'), 'italic', commande('italic')),
    bouton('underline', t('underline'), 'underline', commande('underline')),
    bouton('color', t('couleurTexte'), 'palette', () => { volet.style.display = 'none'; ouvrirCouleurs(); }),
    bouton('link', t('linkUrl'), 'link', () => { nuancier.style.display = 'none'; ouvrirLien(); }),
  ];
  barre.append(h('div', { class: 'rtb__outils' }, ...boutons), nuancier, volet, mot);

  /** Le bouton s'allume quand la sélection porte déjà cette mise en forme. */
  function majEtat() {
    if (!doc) return;
    for (const b of boutons) {
      const nom = b.getAttribute('data-cmd');
      if (nom !== 'bold' && nom !== 'italic' && nom !== 'underline') continue;
      let actif = false;
      try { actif = doc.queryCommandState(nom); } catch { actif = false; }
      b.classList.toggle('btn--actif', actif);
    }
  }

  /**
   * Cliquer dans la barre retire le focus de la page. Ce n'est pas sortir de
   * l'édition : sans ce détour, saisir une adresse de lien refermerait
   * l'éditeur avant d'avoir pu la valider.
   */
  function surSortie() {
    setTimeout(() => {
      if (!courant) return;
      if (saisieEnCours || barre.contains(elementActif())) return;
      commit();
    }, 0);
  }

  /**
   * L'élément réellement actif, en traversant les shadow roots.
   *
   * Le module vit dans un shadow root : document.activeElement s'arrête à son
   * hôte et ne voit jamais un bouton de la barre. Sans cette descente, cliquer
   * dans la barre passait pour une sortie d'édition, et le champ d'adresse se
   * refermait avant qu'on ait pu taper dedans.
   */
  function elementActif() {
    let actif = document.activeElement;
    while (actif?.shadowRoot?.activeElement) actif = actif.shadowRoot.activeElement;
    return actif;
  }

  function placerBarre(el) {
    const decalage = origin();
    const rect = el.getBoundingClientRect();
    barre.style.left = (decalage.x + rect.left) + 'px';
    barre.style.top = (decalage.y + Math.max(rect.top - 36, 4)) + 'px';
    barre.style.display = '';
  }

  const surCollage = (event) => {
    event.preventDefault();
    const texte = (event.clipboardData || doc.defaultView.clipboardData).getData('text/plain');
    doc.execCommand('insertText', false, texte);
  };

  const surTouche = (event) => {
    if (!courant) return;
    if (event.key === 'Escape') { event.preventDefault(); cancel(); }
    else if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); commit(); }
  };

  function start(entry) {
    if (courant && courant.el === entry.el) return;
    commit();

    const { el } = entry;
    doc = el.ownerDocument;
    avant = readCurrent(el, entry.role);
    courant = entry;

    el.setAttribute('contenteditable', 'true');
    el.setAttribute('spellcheck', 'true');
    el.setAttribute('data-admin-editing', '');
    el.addEventListener('paste', surCollage);
    el.addEventListener('keydown', surTouche);
    el.addEventListener('mouseup', retenir);
    el.addEventListener('keyup', retenir);
    el.addEventListener('blur', surSortie);
    el.focus();

    const selection = doc.defaultView.getSelection();
    if (selection && selection.rangeCount === 0) {
      const plage = doc.createRange();
      plage.selectNodeContents(el);
      plage.collapse(false);
      selection.addRange(plage);
    }
    // Donner le focus fait défiler l'aperçu : on place la barre au cadre
    // suivant, sinon elle resterait à l'ancienne position de l'élément.
    doc.defaultView.requestAnimationFrame(() => { if (courant) placerBarre(el); });
  }

  function demonter() {
    if (!courant) return null;
    const entry = courant;
    const { el } = entry;
    el.removeAttribute('contenteditable');
    el.removeAttribute('spellcheck');
    el.removeAttribute('data-admin-editing');
    el.removeEventListener('paste', surCollage);
    el.removeEventListener('keydown', surTouche);
    el.removeEventListener('mouseup', retenir);
    el.removeEventListener('keyup', retenir);
    el.removeEventListener('blur', surSortie);
    volet.style.display = 'none';
    nuancier.style.display = 'none';
    mot.style.display = 'none';
    plageRetenue = null;
    barre.style.display = 'none';
    courant = null;
    return entry;
  }

  function commit() {
    const entry = demonter();
    if (!entry) return;
    const valeur = readCurrent(entry.el, entry.role);
    // Un lien garde son adresse : seul le libellé se modifie ici.
    if (entry.role === 'link') delete valeur.href;
    if (JSON.stringify(valeur) !== JSON.stringify(sansHref(avant))) onCommit(entry, valeur);
  }

  function cancel() {
    const entry = demonter();
    if (!entry || !avant) return;
    if (typeof avant.html === 'string') entry.el.innerHTML = avant.html;
    else if (typeof avant.text === 'string') entry.el.textContent = avant.text;
  }

  function sansHref(valeur) {
    if (!valeur) return valeur;
    const copie = { ...valeur };
    delete copie.href;
    return copie;
  }

  return {
    start, commit, cancel,
    get active() { return courant; },
    reposition() { if (courant) placerBarre(courant.el); },
  };
}
