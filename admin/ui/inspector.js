/**
 * Inspecteur : les réglages de l'élément sélectionné, dans le panneau.
 *
 * Trois sections selon ce qui est sélectionné — le contenu, l'habillage, et
 * le bloc répétable auquel il appartient. Le style se limite volontairement
 * aux couleurs et à l'image de fond : le client habille, il ne redimensionne
 * ni ne repositionne rien. La mise en page reste au développeur.
 * @module ui/inspector
 */
import { h, icon, clear } from './el.js';
import { safeImageUrl } from '../core/sanitize.js';

const TITRES = { text: 'text', link: 'link', image: 'image', background: 'background' };

export function createInspector({ vue, t, actions }) {
  let selection = null;

  function render(prochaine) {
    selection = prochaine;
    clear(vue);

    if (!selection) {
      vue.appendChild(h('p', { class: 'empty' }, t('selectHint')));
      return;
    }
    const { entry, collection, itemIndex, el } = selection;

    vue.appendChild(h('div', { class: 'field', style: { marginBottom: '4px' } },
      h('span', { class: 'field__label' }, t('selection')),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '7px' } },
        icon(entry ? iconeDe(entry.role) : 'section', 13),
        h('strong', {}, entry ? t(TITRES[entry.role] || 'text') : t('container')),
        h('span', { class: 'hint', style: { margin: '0' } }, '<' + el.tagName.toLowerCase() + '>'),
      ),
    ));

    if (entry) vue.appendChild(groupe(t('content'), 'text', () => champsContenu(entry), true));
    vue.appendChild(groupe(t('style'), 'palette', () => champsStyle(el), !entry));
    if (collection) vue.appendChild(groupe(t('block'), 'layers', () => champsBloc(collection, itemIndex), true));
  }

  function iconeDe(role) {
    if (role === 'link') return 'link';
    if (role === 'image' || role === 'background') return 'image';
    return 'text';
  }

  /** Section repliable. */
  function groupe(titre, nomIcone, contenu, ouvert) {
    const corps = h('div', { class: 'group__body' }, contenu());
    const bloc = h('div', { class: 'group', 'data-open': ouvert ? 'true' : 'false' },
      h('button', {
        class: 'group__head', type: 'button',
        onclick: () => bloc.setAttribute('data-open', bloc.getAttribute('data-open') === 'true' ? 'false' : 'true'),
      }, icon(nomIcone, 13), h('span', {}, titre), icon('down', 12)),
      corps,
    );
    return bloc;
  }

  // ------------------------------------------------------------ contenu
  function champsContenu(entry) {
    const valeur = actions.valueOf(entry);
    if (entry.role === 'image' || entry.role === 'background') return champsImage(entry, valeur);
    if (entry.role === 'link') return champsLien(entry, valeur);
    return champsTexte(entry, valeur);
  }

  function champsTexte(entry, valeur) {
    const texte = typeof valeur.html === 'string' ? entry.el.textContent : (valeur.text ?? '');
    const zone = h('textarea', {
      class: 'textarea', value: texte,
      oninput: (e) => actions.setContent(entry, { text: e.target.value, html: undefined }),
    });
    return [
      h('div', { class: 'field' }, h('label', { class: 'field__label' }, t('textContent')), zone),
      h('p', { class: 'hint' }, t('textInlineHint')),
      boutonRevert(() => actions.revertContent(entry)),
    ];
  }

  function champsLien(entry, valeur) {
    const libelle = typeof valeur.html === 'string' ? entry.el.textContent : (valeur.text ?? '');
    return [
      champ(t('linkUrl'), h('input', {
        class: 'input', type: 'text', value: valeur.href || '',
        placeholder: 'https://…, /page.html, #ancre, mailto:…',
        onchange: (e) => actions.setContent(entry, { href: e.target.value }),
      })),
      champ(t('linkLabel'), h('input', {
        class: 'input', type: 'text', value: libelle,
        onchange: (e) => actions.setContent(entry, { text: e.target.value, html: undefined }),
      })),
      h('label', { class: 'check' },
        h('input', {
          type: 'checkbox', checked: valeur.target === '_blank',
          onchange: (e) => actions.setContent(entry, { target: e.target.checked ? '_blank' : '' }),
        }),
        t('linkTarget'),
      ),
      boutonRevert(() => actions.revertContent(entry)),
    ];
  }

  function champsImage(entry, valeur) {
    const image = h('img', { alt: '' });
    const apercu = h('div', { class: 'preview' }, image);
    const barre = h('i');
    const progression = h('div', { class: 'progress', style: { display: 'none' } }, barre);
    const message = h('p', { class: 'hint' });

    const adresse = h('input', {
      class: 'input', type: 'text', value: valeur.src || '', placeholder: '/images/photo.jpg',
      onchange: (e) => { montrer(e.target.value); actions.setContent(entry, { src: e.target.value }); },
    });

    function montrer(src) {
      const sur = safeImageUrl(src);
      if (sur) image.setAttribute('src', sur); else image.removeAttribute('src');
    }
    montrer(valeur.src);

    const fichier = h('input', {
      type: 'file', accept: 'image/*', style: { display: 'none' },
      onchange: (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) envoyer(f); },
    });

    async function envoyer(f) {
      message.textContent = t('uploading');
      progression.style.display = '';
      barre.style.width = '6%';
      try {
        const r = await actions.upload(f, (ratio) => { barre.style.width = Math.round(ratio * 100) + '%'; });
        adresse.value = r.url;
        montrer(r.url);
        actions.setContent(entry, { src: r.url });
        message.textContent = '';
      } catch (err) {
        message.textContent = err.message || String(err);
      } finally {
        progression.style.display = 'none';
      }
    }

    apercu.addEventListener('dragover', (e) => { e.preventDefault(); apercu.classList.add('preview--drop'); });
    apercu.addEventListener('dragleave', () => apercu.classList.remove('preview--drop'));
    apercu.addEventListener('drop', (e) => {
      e.preventDefault();
      apercu.classList.remove('preview--drop');
      const f = e.dataTransfer.files?.[0];
      if (f) envoyer(f);
    });

    return [
      apercu,
      h('div', { class: 'row', style: { marginBottom: '11px' } },
        h('button', { class: 'btn', type: 'button', onclick: () => fichier.click() }, icon('upload', 13), t('chooseFile')),
        h('button', {
          class: 'btn', type: 'button',
          onclick: () => actions.pickMedia((item) => {
            adresse.value = item.url;
            montrer(item.url);
            actions.setContent(entry, { src: item.url });
          }),
        }, icon('folder', 13), t('library')),
      ),
      progression, message, fichier,
      champ(t('imageUrl'), adresse),
      entry.role === 'image' && champ(t('altText'), h('input', {
        class: 'input', type: 'text', value: valeur.alt || '',
        onchange: (e) => actions.setContent(entry, { alt: e.target.value }),
      })),
      boutonRevert(() => actions.revertContent(entry)),
    ];
  }

  // -------------------------------------------------------------- style
  function champsStyle(el) {
    const style = actions.styleOf(el);
    const fond = h('input', {
      class: 'input', type: 'text', value: style.backgroundImage || '',
      placeholder: t('noImage'),
      onchange: (e) => actions.setStyle(el, { backgroundImage: e.target.value }),
    });

    return [
      champ(t('textColor'), couleur(style.color, (v) => actions.setStyle(el, { color: v }))),
      champ(t('bgColor'), couleur(style.background, (v) => actions.setStyle(el, { background: v }))),
      champ(t('bgImage'), fond),
      h('div', { class: 'row', style: { marginBottom: '11px' } },
        h('button', {
          class: 'btn', type: 'button',
          onclick: () => actions.pickMedia((item) => {
            fond.value = item.url;
            actions.setStyle(el, { backgroundImage: item.url });
          }),
        }, icon('folder', 13), t('library')),
        h('button', {
          class: 'btn', type: 'button',
          onclick: () => { fond.value = ''; actions.setStyle(el, { backgroundImage: 'none' }); },
        }, t('removeImage')),
      ),
      h('button', {
        class: 'btn btn--wide', type: 'button',
        onclick: () => { actions.resetStyle(el); render(selection); },
      }, icon('history', 13), t('resetStyle')),
    ];
  }

  /** Pastille native + saisie libre : hexadécimal, rgb() ou nom CSS. */
  function couleur(valeur, onChange) {
    const texte = h('input', {
      class: 'input', type: 'text', value: valeur || '', placeholder: t('inherited'),
      onchange: (e) => { const v = e.target.value.trim(); pastille.value = versHex(v) || pastille.value; onChange(v); },
    });
    const pastille = h('input', {
      class: 'color__swatch', type: 'color', value: versHex(valeur) || '#000000',
      oninput: (e) => { texte.value = e.target.value; onChange(e.target.value); },
    });
    return h('div', { class: 'color' }, pastille, texte);
  }

  function versHex(valeur) {
    if (!valeur) return null;
    const brut = String(valeur).trim();
    if (/^#[0-9a-f]{6}$/i.test(brut)) return brut.toLowerCase();
    const rgb = brut.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i);
    if (!rgb) return null;
    return '#' + [rgb[1], rgb[2], rgb[3]]
      .map((n) => Number(n).toString(16).padStart(2, '0')).join('');
  }

  // --------------------------------------------------------------- bloc
  function champsBloc(collection, index) {
    const total = collection.items.length;
    const bouton = (nomIcone, libelle, op, ...args) => h('button', {
      class: 'btn', type: 'button', title: libelle,
      onclick: () => actions.collectionOp(collection.id, op, ...args),
    }, icon(nomIcone, 13), libelle);

    return [
      h('p', { class: 'hint', style: { marginTop: '0' } }, t('blockPosition', index + 1, total)),
      h('div', { class: 'row', style: { marginTop: '10px' } },
        bouton('up', t('moveUp'), 'move', index, index - 1),
        bouton('down', t('moveDown'), 'move', index, index + 1),
      ),
      h('div', { class: 'row', style: { marginTop: '7px' } },
        bouton('copy', t('duplicate'), 'duplicate', index),
        h('button', {
          class: 'btn btn--danger', type: 'button', disabled: total <= 1,
          onclick: () => { if (confirm(t('removeConfirm'))) actions.collectionOp(collection.id, 'remove', index); },
        }, icon('trash', 13), t('remove')),
      ),
      h('button', {
        class: 'btn btn--wide', type: 'button', style: { marginTop: '7px' },
        onclick: () => actions.collectionOp(collection.id, 'duplicate', total - 1),
      }, icon('plus', 13), t('addBlock')),
      h('button', {
        class: 'btn btn--wide', type: 'button', style: { marginTop: '7px' },
        onclick: () => { if (confirm(t('resetBlocksConfirm'))) actions.collectionOp(collection.id, 'reset'); },
      }, icon('history', 13), t('resetBlocks')),
    ];
  }

  // ------------------------------------------------------------- outils
  function champ(libelle, controle) {
    return h('div', { class: 'field' }, h('label', { class: 'field__label' }, libelle), controle);
  }

  function boutonRevert(onClick) {
    return h('button', { class: 'btn btn--wide', type: 'button', onclick: onClick }, icon('history', 13), t('revert'));
  }

  return { render, get selection() { return selection; } };
}
