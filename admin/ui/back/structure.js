/**
 * La structure d'une page : ses sections, dans l'ordre, et ce qu'on en fait.
 *
 * C'est l'écran qui justifie le back-office. Poser le châssis d'une page —
 * un bandeau, trois colonnes, une galerie, un pied d'appel — n'a pas besoin
 * de montrer les textes : ça se décide sur des formes. On empile ici, on
 * ira écrire ensuite.
 *
 * Contrairement aux autres écrans, celui-ci doit CHARGER la page. Les
 * sections écrites à la main n'existent nulle part ailleurs que dans le
 * HTML du site : aucune base ne les connaît. On ouvre donc le fichier dans
 * une iframe hors écran, on l'analyse comme le fait l'éditeur, et on ferme.
 * C'est le prix du « zéro modification du code client » — et c'est un prix
 * qu'on paie une fois par visite d'écran, pas à chaque geste.
 * @module ui/back/structure
 */
import { h, icon, clear } from '../el.js';
import { teteEcran } from './shell-back.js';
import { TEMPLATES } from '../../core/templates.js';

/**
 * @param {object} options
 * @param {Function} options.t
 * @param {Function} options.ouvrirPage charge la page, renvoie { model, fermer }
 * @param {Function} options.enregistrer reçoit (pageId, instantané)
 * @param {Function} options.onEcrire ouvre l'éditeur en direct
 * @param {Function} options.onRetour revient à la liste des pages
 */
export function creerStructure({ t, ouvrirPage, enregistrer, onEcrire, onRetour }) {
  return async function dessiner(page, cible) {
    if (!cible) { onRetour(); return; }

    page.appendChild(teteEcran(
      cible.nom,
      t('boStructureAide'),
      h('button', { class: 'b', type: 'button', onclick: () => onRetour() },
        icon('left', 14), t('boRetourPages')),
      h('button', { class: 'b b--fort', type: 'button', onclick: () => onEcrire(cible) },
        icon('pencil', 14), t('boEcrireTextes')),
    ));

    const carte = h('div', { class: 'carte' });
    page.appendChild(carte);
    carte.appendChild(h('div', { class: 'charge' }, t('boStructureChargement')));

    let session = null;
    try {
      session = await ouvrirPage(cible);
    } catch (err) {
      clear(carte);
      carte.appendChild(h('div', { class: 'carte__corps' },
        h('div', { class: 'note' }, icon('warn', 14),
          h('span', {}, t('boStructureEchec', String(err?.message || err))))));
      return;
    }

    const etatEnregistrement = h('span', { class: 'table__meta' });
    let occupe = false;

    /**
     * Enregistre, puis remonte la page depuis sa source.
     *
     * Les deux vont ensemble : une opération de structure n'existe que dans
     * l'instantané, et tant qu'on n'a pas réappliqué celui-ci sur le
     * document d'origine, la liste affichée montre encore l'état d'avant.
     */
    async function appliquer() {
      if (occupe) return;
      occupe = true;
      etatEnregistrement.textContent = t('boEnregistrement');
      const instantane = session.model.toSnapshot({ portee: 'page' });
      try {
        await enregistrer(session.pageId, instantane);
        await session.recharger(instantane);
        etatEnregistrement.textContent = t('boEnregistre');
      } catch (err) {
        etatEnregistrement.textContent = String(err?.message || err);
      } finally {
        occupe = false;
        redessiner();
      }
    }

    /** Redessine à partir du modèle, seule source de vérité de cet écran. */
    function redessiner() {
      clear(carte);
      const sections = session.model.sectionList();
      const masquees = session.model.sections?.hide || [];

      carte.appendChild(h('div', { class: 'carte__tete' },
        icon('layers', 14),
        h('span', {}, t('boNbSections', sections.length)),
        etatEnregistrement,
        h('button', { class: 'b b--sm b--fort', type: 'button', onclick: ouvrirModeles },
          icon('plus', 13), t('boAjouterSection')),
      ));

      if (!sections.length && !masquees.length) {
        carte.appendChild(h('div', { class: 'vide' },
          icon('section', 30),
          h('p', {}, t('boStructureVide')),
          h('button', { class: 'b b--fort', type: 'button', onclick: ouvrirModeles },
            icon('plus', 14), t('boAjouterSection')),
        ));
        return;
      }

      carte.appendChild(h('div', { class: 'pile' },
        sections.map((s, i) => rangee(s, i, sections.length))));

      // Une section masquée n'est plus dans la page, donc plus dans la
      // liste : sans ce rappel, elle serait perdue pour de bon.
      if (masquees.length) {
        carte.appendChild(h('div', { class: 'carte__corps', style: { borderTop: '1px solid var(--trait-doux)' } },
          h('div', { class: 'table__meta', style: { marginBottom: '8px' } }, t('boSectionsMasquees')),
          h('div', { class: 'retirees' }, masquees.map((m) => h('button', {
            class: 'b b--sm', type: 'button',
            onclick: () => { session.model.sectionOp('show', m.ref); appliquer(); },
          }, icon('eye', 12), m.label || m.ref))),
        ));
      }
    }

    function rangee(section, index, total) {
      const ajoutee = section.ref.startsWith('ins:');
      const bouton = (nomIcone, titre, action, desactive = false) => h('button', {
        class: 'b b--sm b--icone', type: 'button', title: titre, 'aria-label': titre,
        disabled: desactive, onclick: action,
      }, icon(nomIcone, 13));

      return h('div', { class: 'rang' },
        h('span', { class: 'rang__num' }, String(index + 1)),
        h('div', { class: 'rang__apercu' }, miniature(section.el)),
        h('div', { class: 'rang__main' },
          h('div', { class: 'rang__nom' }, section.label || t('boSectionSansNom')),
          h('div', { class: 'table__meta' },
            ajoutee ? t('boSectionAjoutee') : t('boSectionCode')),
        ),
        h('div', { class: 'rang__actions' },
          bouton('up', t('moveUp'), () => deplacer(section, index - 1), index === 0),
          bouton('down', t('moveDown'), () => deplacer(section, index + 1), index === total - 1),
          bouton('copy', t('duplicate'), () => {
            session.model.sectionOp('add', section.ref, section.ref);
            appliquer();
          }),
          bouton('trash', ajoutee ? t('remove') : t('hideSection'), () => {
            session.model.sectionOp('hide', section.ref, section.label || '');
            appliquer();
          }),
        ),
      );
    }

    function deplacer(section, versIndex) {
      const refs = session.model.sectionList().map((s) => s.ref);
      const depuis = refs.indexOf(section.ref);
      if (depuis < 0 || versIndex < 0 || versIndex >= refs.length) return;
      session.model.sectionOp('move', depuis, versIndex);
      appliquer();
    }

    /**
     * Le choix d'un modèle. On montre des FORMES, pas des noms : « Deux
     * colonnes » ne dit rien tant qu'on n'a pas vu à quoi ça ressemble.
     */
    function ouvrirModeles() {
      const grille = h('div', { class: 'modeles' }, TEMPLATES.map((modele) => h('button', {
        class: 'modele', type: 'button',
        onclick: () => {
          voile.remove();
          const derniere = session.model.sectionList().slice(-1)[0]?.ref || null;
          session.model.addTemplateSection(modele.id, derniere);
          appliquer();
        },
      },
        h('span', { class: 'modele__forme' },
          h('span', { class: 'modele__barre' }),
          h('span', { class: 'modele__cols' },
            modele.colonnes.map(() => h('span', { class: 'modele__col' }))),
        ),
        h('span', { class: 'modele__nom' }, t('tpl_' + modele.id)),
      )));

      const voile = h('div', {
        class: 'voile',
        onclick: (e) => { if (e.target === voile) voile.remove(); },
      }, h('div', { class: 'voile__boite' },
        h('div', { class: 'carte__tete' },
          icon('template', 14), h('span', {}, t('boChoisirModele')),
          h('button', { class: 'b b--sm b--nu b--icone', type: 'button', onclick: () => voile.remove() },
            icon('close', 13)),
        ),
        h('div', { class: 'carte__corps' },
          h('p', { class: 'table__meta', style: { marginBottom: '14px' } }, t('boChoisirModeleAide')),
          grille,
        ),
      ));
      document.body.appendChild(voile);
    }

    redessiner();
    // Le châssis appellera ceci en quittant l'écran : l'iframe d'analyse ne
    // doit pas survivre à la page qui l'a ouverte.
    return () => session.fermer();
  };
}

/**
 * Une vignette de section, dessinée à partir de ce qu'elle contient.
 *
 * Pas une capture d'écran : la page est chargée hors écran, sans image de
 * fond forcément résolue, et une capture coûterait bien plus qu'elle ne
 * rapporte. Trois traits suffisent à reconnaître un bandeau d'une grille.
 */
function miniature(el) {
  const boite = h('span', { class: 'mini' });
  if (!el) return boite;

  const titres = el.querySelectorAll('h1, h2, h3');
  const images = el.querySelectorAll('img, picture, svg');
  const enfants = Array.from(el.children).filter((n) => n.children.length > 1);
  const colonnes = enfants.length ? Math.min(enfants[0].children.length, 4) : 0;

  if (titres.length) boite.appendChild(h('span', { class: 'mini__titre' }));
  if (images.length && !colonnes) boite.appendChild(h('span', { class: 'mini__image' }));
  if (colonnes > 1) {
    boite.appendChild(h('span', { class: 'mini__cols' },
      Array.from({ length: colonnes }, () => h('span', { class: 'mini__col' }))));
  } else {
    boite.appendChild(h('span', { class: 'mini__ligne' }));
    boite.appendChild(h('span', { class: 'mini__ligne mini__ligne--court' }));
  }
  return boite;
}
