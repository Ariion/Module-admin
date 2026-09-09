/**
 * Pages du site : changer de page, en créer une.
 *
 * La liste est déduite des liens de la page affichée. Créer une page copie le
 * code d'origine d'une page existante : la nouvelle hérite de l'en-tête, du
 * pied de page et du style du site, sans reprendre le contenu déjà saisi.
 * @module ui/pages-panel
 */
import { h, icon, clear } from './el.js';
import { openModal } from './modal.js';
import { discoverPages, slugPage } from '../core/pages.js';

export function openPages({ root, t, doc, hosting, onOpen, onCreate, connues = [], meta = null }) {
  const pages = discoverPages(doc);

  // Les pages déjà ouvertes depuis l'éditeur complètent la découverte par
  // les liens : sans ça, une page fraîchement créée — que rien ne pointe
  // encore — serait injoignable.
  const base = doc.location.href.replace(/[^/]*$/, '');
  for (const connue of connues) {
    if (pages.some((p) => p.path === connue.path)) continue;
    pages.push({
      url: base.replace(/[^/]*$/, '') + connue.path.split('/').pop(),
      path: connue.path,
      label: connue.label || connue.path,
      courante: false,
    });
  }

  const liste = h('ul', { class: 'list' });
  for (const page of pages) {
    liste.appendChild(h('li', {},
      icon(page.courante ? 'eye' : 'pages', 13),
      h('div', { class: 'list__main' },
        h('div', {}, page.label),
        h('div', { class: 'list__meta' }, '/' + page.path),
      ),
      page.courante
        ? h('span', { class: 'pill pill--ok' }, t('currentPage'))
        : h('button', {
          class: 'btn btn--sm', type: 'button',
          onclick: () => { modal.close(); onOpen(page.url); },
        }, t('openPage')),
    ));
  }

  // Nom et description de la page ouverte : c'est ce qui s'affiche dans
  // l'onglet du navigateur et dans les résultats de recherche.
  const metaCourant = meta ? meta.lire() : null;
  const blocMeta = metaCourant ? h('div', { style: { marginBottom: '18px' } },
    h('div', { class: 'field' },
      h('span', { class: 'field__label' }, t('pageTitre')),
      h('input', {
        class: 'input', type: 'text', value: metaCourant.titre || '',
        placeholder: t('pageTitrePlaceholder'),
        // À la frappe : le nom de l'onglet suit, on voit ce qu'on écrit.
        oninput: (e) => meta.ecrire({ titre: e.target.value }),
      })),
    h('div', { class: 'field' },
      h('span', { class: 'field__label' }, t('pageDescription')),
      h('textarea', {
        class: 'textarea', style: { minHeight: '54px' }, value: metaCourant.description || '',
        placeholder: t('pageDescriptionPlaceholder'),
        oninput: (e) => meta.ecrire({ description: e.target.value }),
      })),
  ) : null;

  const corps = h('div', {},
    blocMeta,
    h('p', { class: 'hint', style: { marginTop: '0' } }, t('pagesHint')),
    liste,
  );

  // --- Création -------------------------------------------------------
  const message = h('p', { class: 'error' });
  const nom = h('input', { class: 'input', type: 'text', placeholder: t('pageNamePlaceholder') });
  const apercu = h('span', { class: 'list__meta' });
  nom.addEventListener('input', () => { apercu.textContent = '/' + slugPage(nom.value); });

  const depuis = h('select', { class: 'input' },
    pages.map((p) => h('option', { value: p.path, selected: p.courante }, p.label)));

  const creation = h('div', { style: { marginTop: '18px', borderTop: '1px solid var(--line)', paddingTop: '16px' } },
    h('div', { class: 'field__label', style: { marginBottom: '8px' } }, t('newPage')),
  );

  if (!hosting.enabled) {
    creation.appendChild(h('p', { class: 'hint', style: { marginTop: '0' } }, t('newPageNoHost')));
  } else {
    const bouton = h('button', { class: 'btn btn--primary', type: 'button' }, icon('plus', 13), t('createPage'));
    bouton.addEventListener('click', async () => {
      const chemin = slugPage(nom.value);
      if (!nom.value.trim()) { nom.focus(); return; }
      bouton.disabled = true;
      message.textContent = '';
      try {
        await onCreate(chemin, depuis.value);
        modal.close();
      } catch (err) {
        message.textContent = err.message || String(err);
        bouton.disabled = false;
      }
    });

    creation.append(
      h('p', { class: 'hint', style: { marginTop: '0' } }, t('newPageHint')),
      h('div', { class: 'field' }, h('label', { class: 'field__label' }, t('pageName')), nom, apercu),
      h('div', { class: 'field' }, h('label', { class: 'field__label' }, t('copyFrom')), depuis),
      bouton,
      message,
    );
  }

  corps.appendChild(creation);
  const modal = openModal({ root, title: t('pages'), body: corps });
  return { modal, refresh: () => clear(liste) };
}
