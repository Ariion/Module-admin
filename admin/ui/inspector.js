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
import { WIDGETS } from '../core/widgets.js';

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
    if (selection.widget) { renderWidgetFields(selection.widget); return; }

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
    if (selection.section) {
      vue.appendChild(groupe(t('sectionGroup'), 'section', () => champsSection(selection.section), !entry, true));
    }
  }

  // ------------------------------------------------------------ widgets
  /** Réglages d'un widget, décrits par son entrée du catalogue. */
  function renderWidgetFields(noeud) {
    const def = WIDGETS[noeud.type];
    if (!def) { vue.appendChild(h('p', { class: 'empty' }, t('selectHint'))); return; }

    vue.appendChild(h('div', { class: 'field', style: { marginBottom: '4px' } },
      h('span', { class: 'field__label' }, t('selection')),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '7px' } },
        icon(def.icon, 13), h('strong', {}, t('w_' + noeud.type)),
      ),
    ));

    if (def.fields.length) {
      vue.appendChild(groupe(t('content'), def.icon, () => def.fields.map((f) => champWidget(noeud, f)), true));
    }
    vue.appendChild(groupe(t('style'), 'palette', () => champsStyleWidget(noeud), !def.fields.length));

    vue.appendChild(h('div', { class: 'row', style: { marginTop: '4px' } },
      h('button', {
        class: 'btn', type: 'button',
        onclick: () => actions.widgetOp(noeud.key, 'move', -1),
      }, icon('up', 13), t('moveUp')),
      h('button', {
        class: 'btn', type: 'button',
        onclick: () => actions.widgetOp(noeud.key, 'move', 1),
      }, icon('down', 13), t('moveDown')),
    ));
    vue.appendChild(h('button', {
      class: 'btn btn--wide btn--danger', type: 'button', style: { marginTop: '7px' },
      onclick: () => actions.widgetOp(noeud.key, 'remove'),
    }, icon('trash', 13), t('remove')));
  }

  function champWidget(noeud, f) {
    const valeur = noeud.props[f.key];
    const ecrire = (v) => actions.setWidgetProps(noeud.key, { [f.key]: v });

    switch (f.type) {
      case 'select':
        return champ(t(f.label), h('select', {
          class: 'input', onchange: (e) => ecrire(e.target.value),
        }, f.options.map((o) => h('option', { value: o, selected: String(o) === String(valeur) }, String(o)))));

      case 'number':
        return champ(t(f.label), h('input', {
          class: 'input', type: 'number', value: valeur ?? '',
          min: f.min, max: f.max, step: f.step,
          oninput: (e) => ecrire(Number(e.target.value)),
        }));

      case 'checkbox':
        return h('label', { class: 'check' },
          h('input', {
            type: 'checkbox', checked: valeur === f.on,
            onchange: (e) => ecrire(e.target.checked ? f.on : ''),
          }), t(f.label));

      case 'align':
        return champ(t(f.label), h('div', { class: 'seg' },
          ['left', 'center', 'right'].map((a) => h('button', {
            class: 'seg__btn', type: 'button', 'aria-pressed': valeur === a ? 'true' : 'false',
            onclick: () => { ecrire(a); render(selection); },
          }, t('align_' + a)))));

      case 'lines':
        return champ(t(f.label), h('textarea', {
          class: 'textarea', value: valeur ?? '',
          oninput: (e) => ecrire(e.target.value),
        }));

      case 'richtext':
        return champ(t(f.label), h('textarea', {
          class: 'textarea', value: String(valeur ?? '').replace(/<br\s*\/?>/gi, '\n'),
          oninput: (e) => ecrire(e.target.value.replace(/\n/g, '<br>')),
        }));

      case 'image': {
        const image = h('img', { alt: '' });
        const apercu = h('div', { class: 'preview' }, image);
        const montrer = (src) => {
          const sur = safeImageUrl(src);
          if (sur) image.setAttribute('src', sur); else image.removeAttribute('src');
        };
        montrer(valeur);
        const adresse = h('input', {
          class: 'input', type: 'text', value: valeur ?? '', placeholder: '/images/photo.jpg',
          onchange: (e) => { montrer(e.target.value); ecrire(e.target.value); },
        });
        const fichier = h('input', {
          type: 'file', accept: 'image/*', style: { display: 'none' },
          onchange: async (e) => {
            const f2 = e.target.files?.[0];
            e.target.value = '';
            if (!f2) return;
            const r = await actions.upload(f2);
            adresse.value = r.url; montrer(r.url); ecrire(r.url);
          },
        });
        return h('div', {}, apercu,
          h('div', { class: 'row', style: { marginBottom: '11px' } },
            h('button', { class: 'btn', type: 'button', onclick: () => fichier.click() }, icon('upload', 13), t('chooseFile')),
            h('button', {
              class: 'btn', type: 'button',
              onclick: () => actions.pickMedia((item) => { adresse.value = item.url; montrer(item.url); ecrire(item.url); }),
            }, icon('folder', 13), t('library')),
          ),
          fichier, champ(t(f.label), adresse));
      }

      default:
        return champ(t(f.label), h('input', {
          class: 'input', type: 'text', value: valeur ?? '', placeholder: f.placeholder || '',
          oninput: (e) => ecrire(e.target.value),
        }));
    }
  }

  /** Couleurs d'un widget : stockées dans ses propres propriétés. */
  function champsStyleWidget(noeud) {
    return [
      champ(t('textColor'), couleur(noeud.props.color, (v) => actions.setWidgetProps(noeud.key, { color: v }))),
      champ(t('bgColor'), couleur(noeud.props.background, (v) => actions.setWidgetProps(noeud.key, { background: v }))),
    ];
  }

  // ---------------------------------------------------------- structure
  function champsSection(section) {
    const index = actions.sectionIndex(section.ref);
    const total = actions.sectionCount();
    const bouton = (nomIcone, libelle, op, ...args) => h('button', {
      class: 'btn', type: 'button',
      onclick: () => actions.sectionOp(section.ref, op, ...args),
    }, icon(nomIcone, 13), libelle);

    return [
      h('p', { class: 'hint', style: { marginTop: '0' } }, t('sectionPosition', index + 1, total)),
      h('div', { class: 'row', style: { marginTop: '10px' } },
        bouton('up', t('moveUp'), 'move', index, index - 1),
        bouton('down', t('moveDown'), 'move', index, index + 1),
      ),
      h('div', { class: 'row', style: { marginTop: '7px' } },
        bouton('copy', t('duplicate'), 'duplicate'),
        h('button', {
          class: 'btn btn--danger', type: 'button',
          onclick: () => { if (confirm(t('hideSectionConfirm'))) actions.sectionOp(section.ref, 'hide'); },
        }, icon('trash', 13), t('hideSection')),
      ),
      h('button', {
        class: 'btn btn--wide btn--sect', type: 'button', style: { marginTop: '9px' },
        onclick: () => showSections(section.ref),
      }, icon('plus', 13), t('addSectionAfter')),
    ];
  }

  /**
   * Bibliothèque de sections : celles de la page elle-même.
   * Ajouter une section, c'est dupliquer une section existante — le rendu
   * reste donc celui écrit par le développeur.
   */
  function showSections(afterRef) {
    clear(vue);
    vue.append(
      h('div', { class: 'field' },
        h('span', { class: 'field__label' }, t('addSection')),
        h('p', { class: 'hint', style: { marginTop: '0' } }, t('addSectionHint')),
      ),
    );

    const liste = h('div', { class: 'sections' });
    for (const section of actions.sections()) {
      liste.appendChild(h('button', {
        class: 'sectcard', type: 'button',
        onclick: () => actions.addSection(section.ref, afterRef),
      },
        h('span', { class: 'sectcard__icon' }, icon('section', 16)),
        h('span', { class: 'sectcard__main' },
          h('span', { class: 'sectcard__title' }, section.label),
          h('span', { class: 'sectcard__meta' }, t('sectionCopy')),
        ),
        icon('plus', 14),
      ));
    }
    vue.appendChild(liste.children.length ? liste : h('p', { class: 'empty' }, t('emptyStructure')));
    vue.appendChild(h('button', {
      class: 'btn btn--wide', type: 'button', style: { marginTop: '12px' },
      onclick: () => render(selection),
    }, t('cancel')));
  }

  function iconeDe(role) {
    if (role === 'link') return 'link';
    if (role === 'image' || role === 'background') return 'image';
    return 'text';
  }

  /** Section repliable. */
  function groupe(titre, nomIcone, contenu, ouvert, structure) {
    const corps = h('div', { class: 'group__body' }, contenu());
    const bloc = h('div', { class: 'group' + (structure ? ' group--sect' : ''), 'data-open': ouvert ? 'true' : 'false' },
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

  return { render, showSections, get selection() { return selection; } };
}
