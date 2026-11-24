/**
 * Choix du thème : l'allure générale du site, en une image.
 *
 * On ne demande pas au client de composer une palette — il n'a aucune raison
 * de savoir le faire. On lui montre neuf ambiances toutes faites et il en
 * désigne une ; le module en déduit polices, couleurs, formes et rythme.
 *
 * Reste le client qui arrive avec un logo et deux couleurs imposées. L'ambiance
 * lui sert alors de point de départ : sous la grille, il impose ses couleurs et
 * son couple de polices, et le reste de l'accord tient toujours. Ici l'aperçu
 * n'a pas à être fabriqué — la feuille du thème est réécrite à chaque
 * changement, donc c'est la page ouverte qui montre le résultat.
 * @module ui/theme-panel
 */
import { h, icon, clear, rendreSansSauter } from './el.js';
import { openModal } from './modal.js';
import { THEMES, themeById, marqueDe, fusionnerMarque } from '../core/theme.js';
import { fontStack, FONTS, GROUPES_POLICE } from '../core/fonts.js';

/** Vignette d'un thème : une page miniature peinte avec sa palette. */
function vignette(theme) {
  const { couleurs: c, formes: f } = theme;
  return h('span', { class: 'theme__vue', style: { background: c.fond } },
    h('span', {
      class: 'theme__titre',
      style: { fontFamily: fontStack(theme.police.titres) || 'serif', color: c.encre },
    }, 'Aa'),
    h('span', { class: 'theme__ligne', style: { background: c.doux } }),
    h('span', { class: 'theme__ligne theme__ligne--court', style: { background: c.doux } }),
    h('span', {
      class: 'theme__btn',
      style: {
        background: f.bouton === 'plein' ? c.accent : 'transparent',
        border: f.bouton === 'plein' ? '0' : `2px solid ${c.accent}`,
        borderRadius: Math.min(f.rayonBouton, 12) + 'px',
      },
    }),
    h('span', { class: 'theme__bande', style: { background: c.fondDoux } }),
  );
}

/**
 * Pose la grille de thèmes dans un hôte quelconque (panneau ou fenêtre).
 *
 * @param {object} options
 * @param {HTMLElement} options.hote
 * @param {Function} options.t
 * @param {{id?:string, portee?:string, marque?:object}|null} options.valeur réglage courant
 * @param {boolean} options.siteExistant le site a-t-il déjà son propre code
 * @param {Function} options.onChange reçoit le nouveau réglage
 */
export function rendreChoixTheme({ hote, t, valeur, siteExistant, onChange }) {
  let etat = { portee: siteExistant ? 'blocs' : 'site', ...(valeur || {}) };

  // Choisir un thème redessine la grille : sans garde, le panneau du guide
  // remonterait en haut à chaque essai de palette.
  const dessiner = () => rendreSansSauter(hote, peindre);

  const peindre = () => {
    clear(hote);

    const grille = h('div', { class: 'themes' }, THEMES.map((theme) => h('button', {
      class: 'theme', type: 'button',
      'aria-pressed': etat.id === theme.id ? 'true' : 'false',
      onclick: () => { etat = { ...etat, id: theme.id }; onChange(etat); dessiner(); },
    },
      vignette(theme),
      h('span', { class: 'theme__nom' }, t('theme_' + theme.id)),
    )));

    // La portée n'a de sens que sur un site qui a déjà son propre style : sur
    // une page vierge, il n'y a rien à préserver.
    const portee = siteExistant && etat.id
      ? h('div', { class: 'theme__portee' },
        h('div', { class: 'hint', style: { marginTop: '0', marginBottom: '8px' } }, t('themePorteeAide')),
        h('div', { class: 'seg' }, ['blocs', 'site'].map((p) => h('button', {
          class: 'seg__btn', type: 'button',
          'aria-pressed': (etat.portee || 'blocs') === p ? 'true' : 'false',
          onclick: () => { etat = { ...etat, portee: p }; onChange(etat); dessiner(); },
        }, t('themePortee_' + p)))),
      )
      : null;

    const retirer = etat.id
      ? h('button', {
        class: 'btn btn--ghost btn--wide', type: 'button',
        style: { marginTop: '10px' },
        onclick: () => { etat = { portee: etat.portee }; onChange(etat); dessiner(); },
      }, icon('close', 13), t('themeAucun'))
      : null;

    hote.append(grille, ...[marque(), portee, retirer].filter(Boolean));
  };

  /**
   * Écrit une surcharge de marque. Une valeur vidée retire la clé : l'ambiance
   * reprend la main, et le réglage n'en garde aucune trace.
   */
  const ecrireMarque = (patch) => {
    const fusion = fusionnerMarque(marqueDe(etat), patch);
    etat = { ...etat, marque: fusion };
    if (!fusion) delete etat.marque;
    onChange(etat);
  };

  /** Les couleurs et les polices du client, par-dessus l'ambiance choisie. */
  const marque = () => {
    const theme = themeById(etat.id);
    if (!theme) return null;
    const pose = marqueDe(etat);

    // Pastille native et saisie libre : une charte graphique donne un code
    // hexadécimal, et le retaper est plus rapide que de viser une teinte.
    const couleur = (cle, defaut) => {
      const texte = h('input', {
        class: 'input', type: 'text', value: pose[cle] || '',
        placeholder: t('marqueCommeAmbiance'),
        onchange: (e) => {
          // La validation est celle du module qui fera foi : une couleur
          // refusée là-bas ne doit pas rester affichée ici comme un acquis.
          const v = marqueDe({ marque: { [cle]: e.target.value } })[cle] || '';
          e.target.value = v;
          pastille.value = v || defaut;
          ecrireMarque({ [cle]: v });
        },
      });
      const pastille = h('input', {
        class: 'color__swatch', type: 'color', value: pose[cle] || defaut,
        oninput: (e) => { texte.value = e.target.value; ecrireMarque({ [cle]: e.target.value }); },
      });
      return h('label', { class: 'field' },
        h('span', { class: 'field__label' }, t('marque' + majuscule(cle))),
        h('div', { class: 'color' }, pastille, texte),
      );
    };

    const police = (cle, defaut) => h('label', { class: 'field' },
      h('span', { class: 'field__label' }, t('marque' + majuscule(cle))),
      h('select', {
        class: 'input', onchange: (e) => ecrireMarque({ [cle]: e.target.value }),
      }, [
        h('option', { value: '', selected: !pose[cle] }, t('marqueCommeAmbiance') + ' — ' + defaut),
        // Rangées par famille : à plus de quarante entrées, une liste à plat
        // ne se parcourt plus.
        ...GROUPES_POLICE.map((groupe) => h('optgroup', { label: t('fontGroup_' + groupe) },
          FONTS.filter((f) => f.groupe === groupe).map((f) => h('option', {
            value: f.name, selected: f.name === pose[cle],
            style: { fontFamily: `"${f.name}", ${f.stack}` },
          }, f.name)))),
      ]),
    );

    return h('div', { class: 'theme__perso' },
      h('div', { class: 'hint', style: { margin: '2px 0 10px' } }, t('marquePersoAide')),
      couleur('principale', theme.couleurs.accent),
      couleur('secondaire', theme.couleurs.fondDoux),
      police('policeTitres', theme.police.titres),
      police('policeTexte', theme.police.textes),
      Object.keys(pose).length
        ? h('button', {
          class: 'btn btn--ghost btn--wide', type: 'button',
          onclick: () => {
            etat = { ...etat };
            delete etat.marque;
            onChange(etat);
            dessiner();
          },
        }, icon('close', 13), t('marqueReprendre'))
        : null,
    );
  };

  const majuscule = (mot) => mot[0].toUpperCase() + mot.slice(1);

  dessiner();
  return { get valeur() { return etat; } };
}

/** La même grille, en fenêtre, pour la barre d'outils. */
export function openTheme({ root, t, valeur, siteExistant, onChange }) {
  const corps = h('div', {});
  const modal = openModal({
    root, title: t('themeTitre'), body: corps,
    actions: [h('span', { style: { flex: '1' } }), h('button', {
      class: 'btn btn--primary', type: 'button', onclick: () => modal.close(),
    }, icon('check', 13), t('done'))],
  });
  corps.append(h('p', { class: 'hint', style: { marginTop: '0' } }, t('themeAide')));
  const hote = h('div', {});
  corps.appendChild(hote);
  rendreChoixTheme({ hote, t, valeur, siteExistant, onChange });
  return modal;
}

export { themeById };
