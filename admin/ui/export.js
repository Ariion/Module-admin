/**
 * Sortie de secours : figer le contenu dans le HTML.
 *
 * Le module ne doit jamais devenir un point de blocage. À tout moment on peut
 * récupérer la page telle qu'elle s'affiche, contenu publié inclus, et la
 * déposer sur l'hébergement : le site continue de vivre sans Firebase et sans
 * ce module. Le contenu peut aussi être exporté en JSON pour être réimporté
 * ailleurs.
 * @module ui/export
 */
import { h } from './el.js';
import { openModal } from './modal.js';

function download(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = h('a', { href: url, download: filename });
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Sérialise la page courante en retirant toute trace du module.
 * @param {object} options
 * @param {Document} options.doc document à figer (défaut : la page courante)
 * @param {string[]} options.scriptMarkers fragments d'URL des scripts à retirer
 */
export function freezePage({ doc = document, scriptMarkers = ['/admin/', 'admin-config', 'admin/runtime'] } = {}) {
  const clone = doc.documentElement.cloneNode(true);

  for (const node of clone.querySelectorAll('[data-admin-ui]')) node.remove();
  for (const node of clone.querySelectorAll('#admin-document-style')) node.remove();
  for (const node of clone.querySelectorAll('[contenteditable]')) node.removeAttribute('contenteditable');

  // Les éléments fixes du site ont été décalés sous la barre d'administration.
  // On leur rend leur position d'origine, sinon l'export garderait un en-tête
  // collé 48 px trop bas.
  for (const node of clone.querySelectorAll('[data-admin-shifted]')) {
    const original = node.getAttribute('data-admin-shifted');
    if (original) node.style.top = original;
    else node.style.removeProperty('top');
    if (!node.getAttribute('style')) node.removeAttribute('style');
  }

  // `querySelectorAll('*')` ne renvoie pas l'élément racine : sans l'ajouter
  // explicitement, les attributs posés sur <html> survivraient à l'export.
  for (const node of [clone, ...clone.querySelectorAll('*')]) {
    for (const attr of Array.from(node.attributes)) {
      if (attr.name.startsWith('data-admin-')) node.removeAttribute(attr.name);
    }
  }

  for (const script of Array.from(clone.querySelectorAll('script'))) {
    const src = script.getAttribute('src') || '';
    const inline = script.textContent || '';
    if (script.hasAttribute('data-admin-script')
      || scriptMarkers.some((marker) => src.includes(marker))
      || /ADMIN_CONFIG/.test(inline)) script.remove();
  }

  // Un commentaire d'intégration laissé seul n'aurait plus de sens.
  const walker = doc.createTreeWalker(clone, NodeFilter.SHOW_COMMENT);
  const stale = [];
  while (walker.nextNode()) {
    if (/admin/i.test(walker.currentNode.nodeValue || '')) stale.push(walker.currentNode);
  }
  for (const comment of stale) comment.remove();

  clone.style.removeProperty('--admin-bar-h');
  if (!clone.getAttribute('style')) clone.removeAttribute('style');

  return '<!DOCTYPE html>\n' + clone.outerHTML + '\n';
}

export function openExport({ root, t, pageId, snapshot, doc }) {
  const body = h('div', {},
    h('p', { class: 'hint', style: { marginTop: '0' } }, t('exportHelp')),
    h('ul', { class: 'list' },
      h('li', {},
        h('div', { class: 'list__main' },
          h('div', {}, pageId + '.html'),
          h('div', { class: 'list__meta' }, 'HTML complet, contenu publié intégré'),
        ),
        h('button', {
          class: 'btn btn--sm btn--primary',
          onclick: () => download(pageId + '.html', freezePage({ doc }), 'text/html;charset=utf-8'),
        }, t('exportSite')),
      ),
      h('li', {},
        h('div', { class: 'list__main' },
          h('div', {}, pageId + '.json'),
          h('div', { class: 'list__meta' }, 'Sauvegarde du contenu (réimportable)'),
        ),
        h('button', {
          class: 'btn btn--sm',
          onclick: () => download(pageId + '.json', JSON.stringify(snapshot(), null, 2), 'application/json'),
        }, 'JSON'),
      ),
    ),
    h('p', { class: 'hint' },
      'Exportez de préférence juste après un rechargement de la page : le fichier '
      + 'reprend le DOM tel qu’il est à cet instant, y compris ce que les scripts du site ont pu y ajouter.'),
  );

  return openModal({ root, title: t('exportSite'), body });
}
