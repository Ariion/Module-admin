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
import { TYPES_ACTION, MODELES_ACTION, normaliserAction, actionActive } from '../core/actions.js';
import { STYLE_FIELDS, STYLE_GROUPS, readStyleValues } from '../core/style.js';
import { TEMPLATES } from '../core/templates.js';
import { FONTS, GROUPES_POLICE } from '../core/fonts.js';

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

    const zone = actions.zoneDe?.(el) || null;
    vue.appendChild(h('div', { class: 'sel' + (zone ? ' sel--commun' : '') },
      h('span', { class: 'sel__icon' }, icon(zone ? 'pages' : (entry ? iconeDe(entry.role) : 'section'), 15)),
      h('div', { class: 'sel__main' },
        h('div', { class: 'sel__title' }, entry ? t(TITRES[entry.role] || 'text') : t('container')),
        h('div', { class: 'sel__meta' }, '<' + el.tagName.toLowerCase() + '>'),
      ),
    ));
    // Une modification d'en-tête ou de pied vaut pour toutes les pages : le
    // dire ici évite la mauvaise surprise.
    if (zone) {
      vue.appendChild(h('p', { class: 'commun' },
        icon('warn', 13),
        h('span', {}, t(zone === 'pied' ? 'communPied' : 'communEntete')),
      ));
    }

    if (entry) vue.appendChild(groupe(t('content'), 'text', () => champsContenu(entry), true));
    for (const bloc of champsStyle(el)) vue.appendChild(bloc);
    if (collection) vue.appendChild(groupe(t('block'), 'layers', () => champsBloc(collection, itemIndex), true));
    if (selection.section) {
      vue.appendChild(groupe(t('sectionGroup'), 'section', () => champsSection(selection.section), !entry, true));
    }
  }

  /**
   * Création d'une section : le choix du modèle vient AVANT l'insertion.
   * Créer une section vide puis aller chercher un modèle ailleurs faisait
   * parcourir deux fois le même chemin.
   */
  function showNewSection(afterRef) {
    clear(vue);
    vue.appendChild(h('div', { class: 'field' },
      h('span', { class: 'field__label' }, t('newSection')),
      h('p', { class: 'hint', style: { marginTop: '0' } }, t('newSectionHint')),
    ));

    vue.appendChild(h('button', {
      class: 'btn btn--wide btn--sect', type: 'button', style: { marginBottom: '14px' },
      onclick: () => actions.addBlankSection(afterRef),
    }, icon('plus', 13), t('addBlankSection')));

    vue.appendChild(h('div', { class: 'field__label', style: { marginBottom: '7px' } }, t('orFromTemplate')));
    vue.appendChild(h('div', { class: 'tpls' }, TEMPLATES.map((modele) => h('button', {
      class: 'tpl', type: 'button',
      onclick: () => actions.addTemplateSection(modele.id, afterRef),
    },
      h('span', { class: 'tpl__preview' },
        h('span', { class: 'tpl__bar' }),
        h('span', { class: 'tpl__cols' }, modele.colonnes.map(() => h('span', { class: 'tpl__col' }))),
      ),
      h('span', { class: 'tpl__label' }, t('tpl_' + modele.id)),
    ))));

    const copiables = actions.sections();
    if (copiables.length) {
      vue.appendChild(h('div', { class: 'field__label', style: { margin: '16px 0 7px' } }, t('orCopySection')));
      vue.appendChild(h('div', { class: 'sections' }, copiables.map((section) => h('button', {
        class: 'sectcard', type: 'button',
        onclick: () => actions.addSection(section.ref, afterRef),
      },
        h('span', { class: 'sectcard__icon' }, icon('section', 16)),
        h('span', { class: 'sectcard__main' },
          h('span', { class: 'sectcard__title' }, section.label),
          h('span', { class: 'sectcard__meta' }, t('sectionCopy')),
        ),
        icon('plus', 14),
      ))));
    }

    vue.appendChild(h('button', {
      class: 'btn btn--wide', type: 'button', style: { marginTop: '14px' },
      onclick: () => render(selection),
    }, t('cancel')));
  }

  // ------------------------------------------------------------ widgets
  /** Réglages d'un widget, décrits par son entrée du catalogue. */
  function renderWidgetFields(noeud) {
    const def = WIDGETS[noeud.type];
    if (!def) { vue.appendChild(h('p', { class: 'empty' }, t('selectHint'))); return; }

    vue.appendChild(h('div', { class: 'sel' },
      h('span', { class: 'sel__icon' }, icon(def.icon, 15)),
      h('div', { class: 'sel__main' },
        h('div', { class: 'sel__title' }, t('w_' + noeud.type)),
        h('div', { class: 'sel__meta' }, t('selection')),
      ),
    ));

    if (def.fields.length) {
      vue.appendChild(groupe(t('content'), def.icon, () => def.fields.map((f) => champWidget(noeud, f)), true));
    }
    // Un bouton inséré peut, lui aussi, ouvrir une fenêtre plutôt que partir.
    if (noeud.type === 'button') {
      vue.appendChild(groupe(t('actionGroup'), 'grid',
        () => champsAction(
          () => noeud.props.action,
          (action) => actions.setWidgetProps(noeud.key, { action })),
        actionActive(normaliserAction(noeud.props.action))));
    }
    for (const bloc of champsStyleWidget(noeud)) vue.appendChild(bloc);

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

      case 'media':
      case 'audio':
        return champ(t(f.label), h('div', { class: 'row' },
          h('input', {
            class: 'input', type: 'text', value: valeur ?? '', placeholder: f.placeholder || '/medias/musique.mp3',
            onchange: (e) => ecrire(e.target.value),
          }),
          h('button', {
            class: 'btn btn--icon', type: 'button', title: t('library'),
            onclick: () => actions.pickMedia((item) => { ecrire(item.url); render(selection); }, f.type === 'media' ? 'video' : 'audio'),
          }, icon('folder', 13)),
        ));

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
              onclick: () => actions.pickMedia((item) => { adresse.value = item.url; montrer(item.url); ecrire(item.url); }, 'image'),
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

  /** Habillage d'un widget : même panneau, stocké dans ses propriétés. */
  function champsStyleWidget(noeud) {
    return panneauStyle(
      () => {
        const el = actions.widgetElement?.(noeud.key);
        const effectifs = el ? readStyleValues(el) : {};
        return { ...effectifs, ...(noeud.props.style || {}) };
      },
      (patch) => actions.setWidgetProps(noeud.key, { style: patch }),
    );
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
        onclick: () => showNewSection(section.ref),
      }, icon('plus', 13), t('addSectionAfter')),
    ];
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
      groupe(t('actionGroup'), 'grid',
        () => champsAction(() => valeur.action, (action) => actions.setContent(entry, { action })),
        actionActive(normaliserAction(valeur.action))),
    ];
  }

  /**
   * Réglages d'un appel à l'action : ce qui se passe au clic.
   *
   * Le lien reste renseigné quoi qu'il arrive — c'est le repli quand le
   * module n'est pas là — et la fenêtre vient par-dessus.
   *
   * @param {Function} lire renvoie l'action courante
   * @param {Function} ecrire reçoit l'action complète à enregistrer
   */
  function champsAction(lire, ecrire) {
    const action = normaliserAction(lire());
    const maj = (patch) => { ecrire(normaliserAction({ ...action, ...patch })); render(selection); };

    const blocs = [
      champ(t('actionType'), h('select', {
        class: 'input', onchange: (e) => maj({ type: e.target.value }),
      }, TYPES_ACTION.map((type) => h('option', {
        value: type, selected: type === action.type,
      }, t('actionType_' + type))))),
    ];

    if (!actionActive(action)) {
      blocs.push(h('p', { class: 'hint', style: { marginTop: '0' } }, t('actionHintLien')));
      return blocs;
    }

    blocs.push(
      h('p', { class: 'hint', style: { marginTop: '0' } }, t('actionHintFenetre')),
      champ(t('actionModele'), h('div', { class: 'assist__coches' }, MODELES_ACTION.map((modele) => h('button', {
        class: 'tpl', type: 'button',
        style: modele.id === action.modele ? { borderColor: 'var(--accent)' } : null,
        onclick: () => maj({ modele: modele.id, ...modele.contenu() }),
      },
        h('span', { class: 'tpl__label' },
          h('strong', {}, t('actionModele_' + modele.id)),
          h('span', { class: 'assist__cocheAide', style: { display: 'block' } },
            t('actionModele_' + modele.id + '_aide')),
        ),
      )))),

      champ(t('actionTitre'), h('input', {
        class: 'input', type: 'text', value: action.titre,
        onchange: (e) => ecrire(normaliserAction({ ...action, titre: e.target.value })),
      })),
      champ(t('actionTexte'), h('textarea', {
        class: 'textarea', value: String(action.texte).replace(/<br\s*\/?>/gi, '\n'),
        oninput: (e) => ecrire(normaliserAction({ ...action, texte: e.target.value.replace(/\n/g, '<br>') })),
      })),
      champ(t('actionImage'), h('div', { class: 'row' },
        h('input', {
          class: 'input', type: 'text', value: action.image, placeholder: t('noImage'),
          onchange: (e) => ecrire(normaliserAction({ ...action, image: e.target.value })),
        }),
        h('button', {
          class: 'btn btn--icon', type: 'button', title: t('library'),
          onclick: () => actions.pickMedia((item) => maj({ image: item.url }), 'image'),
        }, icon('folder', 13)),
      )),
      champ(t('actionIntegration'), h('input', {
        class: 'input', type: 'text', value: action.integration,
        placeholder: 'https://… (réservation, formulaire, carte, vidéo)',
        onchange: (e) => ecrire(normaliserAction({ ...action, integration: e.target.value })),
      })),
      h('p', { class: 'hint', style: { marginTop: '-6px' } }, t('actionIntegrationHint')),
    );

    // Les boutons de la fenêtre.
    const liste = h('div', {});
    action.boutons.forEach((b, index) => {
      const ecrireBouton = (patch) => {
        const boutons = action.boutons.map((x, i) => (i === index ? { ...x, ...patch } : x));
        ecrire(normaliserAction({ ...action, boutons }));
      };
      liste.appendChild(h('div', { class: 'row', style: { marginBottom: '7px' } },
        h('input', {
          class: 'input', type: 'text', value: b.texte, placeholder: t('actionBoutonTexte'),
          onchange: (e) => ecrireBouton({ texte: e.target.value }),
        }),
        h('input', {
          class: 'input', type: 'text', value: b.href, placeholder: 'https://…',
          onchange: (e) => ecrireBouton({ href: e.target.value }),
        }),
        h('button', {
          class: 'btn btn--icon btn--danger', type: 'button', title: t('remove'),
          onclick: () => maj({ boutons: action.boutons.filter((x, i) => i !== index) }),
        }, icon('trash', 12)),
      ));
    });
    if (action.boutons.length < 4) {
      liste.appendChild(h('button', {
        class: 'btn btn--wide', type: 'button',
        onclick: () => maj({ boutons: [...action.boutons, { texte: t('actionBoutonNouveau'), href: '' }] }),
      }, icon('plus', 13), t('actionAjouterBouton')));
    }
    blocs.push(champ(t('actionBoutons'), liste));

    blocs.push(champ(t('actionLargeur'), h('input', {
      class: 'input', type: 'number', min: 280, max: 1200, step: 20, value: action.largeur,
      onchange: (e) => ecrire(normaliserAction({ ...action, largeur: e.target.value })),
    })));

    blocs.push(h('button', {
      class: 'btn btn--wide btn--primary', type: 'button', style: { marginTop: '4px' },
      onclick: () => actions.previewAction(action),
    }, icon('eye', 13), t('actionApercu')));

    return blocs;
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
          }, 'image'),
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
  /**
   * Panneau d'habillage, construit à partir du schéma partagé. Le même code
   * sert aux éléments du site et aux widgets : seules les fonctions de
   * lecture et d'écriture changent.
   */
  function panneauStyle(lire, ecrire, ouvertPremier) {
    const valeurs = lire();
    const groupes = [];

    for (const nom of STYLE_GROUPS) {
      const champs = STYLE_FIELDS.filter((f) => f.group === nom);
      if (!champs.length) continue;
      groupes.push(groupe(t('grp_' + nom), iconeGroupe(nom),
        () => [
          nom === 'place' ? h('p', { class: 'hint', style: { margin: '0 0 12px' } }, t('placeHint')) : null,
          ...champs.map((f) => champStyle(f, valeurs[f.key], ecrire)),
        ],
        nom === 'colors' ? ouvertPremier !== false : false));
    }

    groupes.push(groupe(t('grp_css'), 'code', () => [
      h('textarea', {
        class: 'textarea code', spellcheck: 'false', value: valeurs.customCss || '',
        placeholder: 'selector { border-radius: 12px; }\nselector:hover { transform: translateY(-4px); }',
        onchange: (e) => ecrire({ customCss: e.target.value }),
      }),
      h('p', { class: 'hint' }, t('cssHint')),
    ], false));

    groupes.push(h('button', {
      class: 'btn btn--wide', type: 'button', style: { marginTop: '4px' },
      onclick: () => { ecrire(remiseAZero()); render(selection); },
    }, icon('history', 13), t('resetStyle')));

    return groupes;
  }

  function remiseAZero() {
    const vide = { customCss: '' };
    for (const f of STYLE_FIELDS) vide[f.key] = '';
    return vide;
  }

  function iconeGroupe(nom) {
    return { colors: 'palette', type: 'heading', space: 'spacer', border: 'section', place: 'drag' }[nom] || 'palette';
  }

  function champStyle(f, valeur, ecrire) {
    const ecrit = (v) => ecrire({ [f.key]: v });
    switch (f.type) {
      case 'color':
        return champ(t(f.label), couleur(valeur, ecrit));
      case 'font':
        return champ(t(f.label), h('select', {
          class: 'input', onchange: (e) => { ecrit(e.target.value); render(selection); },
        }, [
          h('option', { value: '', selected: !valeur }, t('siteFont')),
          // Rangées par famille : à plus de quarante entrées, une liste à
          // plat ne se parcourt plus.
          ...GROUPES_POLICE.map((groupe) => h('optgroup', { label: t('fontGroup_' + groupe) },
            FONTS.filter((police) => police.groupe === groupe).map((police) => h('option', {
              value: police.name, selected: police.name === valeur,
              style: { fontFamily: `"${police.name}", ${police.stack}` },
            }, police.name)))),
        ]));
      case 'select':
        return champ(t(f.label), h('select', {
          class: 'input', onchange: (e) => ecrit(e.target.value),
        }, f.options.map((o) => h('option', {
          value: o, selected: String(o) === String(valeur ?? ''),
        }, o === '' ? t('inherited') : etiquetteOption(o)))));
      case 'align':
        return champ(t(f.label), h('div', { class: 'seg' },
          ['left', 'center', 'right'].map((a) => h('button', {
            class: 'seg__btn', type: 'button', 'aria-pressed': valeur === a ? 'true' : 'false',
            onclick: () => { ecrit(a); render(selection); },
          }, t('align_' + a)))));
      case 'image':
        return champ(t(f.label), h('div', { class: 'row' },
          h('input', {
            class: 'input', type: 'text', value: valeur || '', placeholder: t('noImage'),
            onchange: (e) => ecrit(e.target.value),
          }),
          h('button', {
            class: 'btn btn--icon', type: 'button', title: t('library'),
            onclick: () => actions.pickMedia((item) => { ecrit(item.url); render(selection); }, 'image'),
          }, icon('folder', 13)),
        ));
      default:
        return champ(t(f.label), h('input', {
          class: 'input', type: 'number', value: valeur ?? '',
          min: f.min, max: f.max, step: f.step, placeholder: t('inherited'),
          onchange: (e) => ecrit(e.target.value),
        }));
    }
  }

  function etiquetteOption(o) {
    if (['gauche', 'centre', 'droite'].includes(o)) return t('placement_' + o);
    const court = String(o);
    return court.length > 22 ? t('shadowPreset') : court;
  }

  function champsStyle(el) {
    return panneauStyle(
      () => actions.styleOf(el),
      (patch) => actions.setStyle(el, patch),
    );
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

  return { render, showNewSection, get selection() { return selection; } };
}
