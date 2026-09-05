/**
 * Édition de texte directement dans l'aperçu (contenteditable).
 *
 * Le collage est toujours converti en texte brut : sans cela, un copier-coller
 * depuis Word injecterait des dizaines de balises de mise en forme. La mise en
 * forme reste limitée à gras / italique / lien, ce qui suffit pour un site
 * vitrine et protège le design du développeur.
 * @module ui/text-edit
 */
import { h, icon } from './el.js';
import { readCurrent } from '../core/model.js';
import { safeUrl } from '../core/sanitize.js';

export function createTextEditor({ layer, origin, t, onCommit }) {
  let courant = null;
  let avant = null;
  let doc = null;

  const barre = h('div', { class: 'rtb' });
  barre.style.display = 'none';
  layer.appendChild(barre);

  const commande = (nom) => (event) => {
    event.preventDefault();
    if (doc) doc.execCommand(nom);
    courant?.el.focus();
  };

  const poserLien = (event) => {
    event.preventDefault();
    const saisie = prompt(t('linkUrl'), 'https://');
    if (saisie === null) return;
    const url = safeUrl(saisie);
    if (url && doc) doc.execCommand('createLink', false, url);
    courant?.el.focus();
  };

  barre.append(
    h('button', { class: 'btn btn--sm btn--icon', type: 'button', title: t('bold'), onmousedown: commande('bold') }, icon('bold', 13)),
    h('button', { class: 'btn btn--sm btn--icon', type: 'button', title: t('italic'), onmousedown: commande('italic') }, icon('italic', 13)),
    h('button', { class: 'btn btn--sm btn--icon', type: 'button', title: t('linkUrl'), onmousedown: poserLien }, icon('link', 13)),
  );

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
    el.addEventListener('blur', commit, { once: true });
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
