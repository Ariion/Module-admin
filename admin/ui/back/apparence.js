/**
 * Apparence : choisir l'allure du site, en la voyant.
 *
 * La galerie de thèmes de WordPress montre des captures d'écran. Une
 * capture ment deux fois : elle est prise sur un site qui n'est pas le
 * vôtre, et elle vieillit sans que personne s'en aperçoive. Ici la
 * prévisualisation est **le vrai rendu** — le même code que celui qui
 * s'appliquera, avec les mêmes couleurs et les mêmes polices.
 *
 * Et comme une page vide ne montre rien d'une ambiance, la démonstration
 * est peuplée : on choisit un métier, et la page se remplit de textes
 * plausibles — un restaurant, un garage, un cabinet. Pas de faux latin :
 * « Lorem ipsum » ne dit rien de ce à quoi ressemblera la page.
 *
 * Sous la galerie, la marque du client : ses couleurs, son couple de polices.
 * Son aperçu passe par le MÊME chemin que les vignettes — même document de
 * démonstration, même feuille de thème. C'est la seule raison pour laquelle on
 * peut se permettre d'appeler cela un aperçu.
 * @module ui/back/apparence
 */
import { h, icon, clear } from '../el.js';
import { teteEcran } from './shell-back.js';
import {
  THEMES, themeById, cssDuTheme, PORTEES_THEME, marqueDe, fusionnerMarque, policesDuTheme,
} from '../../core/theme.js';
import { FONTS, GROUPES_POLICE, writeFontLink } from '../../core/fonts.js';
import { metiersDemo } from '../../core/demo.js';

/**
 * @param {object} options
 * @param {Function} options.t
 * @param {Function} options.lire renvoie le réglage d'ambiance courant
 * @param {Function} options.appliquer reçoit { id, portee }
 * @param {Function} options.rendreDemo reçoit (metierId, theme), renvoie du HTML
 */
export function creerApparence({ t, lire, appliquer, rendreDemo }) {
  return async function dessiner(page) {
    const chargement = h('div', { class: 'charge' }, t('boChargement'));
    page.appendChild(chargement);
    const courant = (await lire()) || {};
    chargement.remove();

    let metier = 'restaurant';
    const etat = h('span', { class: 'table__meta' });

    const choixMetier = h('select', {
      class: 'saisie', style: { width: 'auto' },
      onchange: (e) => { metier = e.target.value; peindre(); redessinerMarque(); },
    }, metiersDemo(t).map((m) => h('option', { value: m.id, selected: m.id === metier }, m.nom)));

    page.appendChild(teteEcran(t('boApparence'), t('boApparenceAide'),
      h('label', { class: 'demo-choix' },
        h('span', {}, t('boDemoMetier')), choixMetier),
    ));

    // La portée : repeindre tout le site, ou seulement ce que le module a
    // posé. Sur un site qui a déjà son code, repeindre tout est rarement ce
    // qu'on veut — et jamais ce qu'on veut par surprise.
    // « Les blocs seulement » par défaut. Le back-office ne sait pas, sans
    // ouvrir une page, si le site a déjà son propre code — et repeindre le
    // code d'un client par surprise est la seule erreur irrattrapable ici.
    let portee = courant.portee || 'blocs';
    page.appendChild(h('div', { class: 'carte', style: { marginBottom: '20px' } },
      h('div', { class: 'carte__tete' }, icon('palette', 14), h('span', {}, t('themePortee')), etat),
      h('div', { class: 'carte__corps' },
        h('div', { class: 'onglets onglets--plein' }, PORTEES_THEME.map((p) => h('button', {
          class: 'onglet', type: 'button', 'aria-selected': p === portee ? 'true' : 'false',
          onclick: (e) => {
            portee = p;
            for (const b of e.currentTarget.parentElement.children) b.setAttribute('aria-selected', 'false');
            e.currentTarget.setAttribute('aria-selected', 'true');
            aide.textContent = t('themePortee_' + p + '_aide');
          },
        }, t('themePortee_' + p)))),
        h('p', { class: 'table__meta', style: { marginTop: '10px' } }, ''),
      ),
    ));
    const aide = page.querySelector('.carte__corps .table__meta');
    aide.textContent = t('themePortee_' + portee + '_aide');

    const grille = h('div', { class: 'themes-gal' });
    page.appendChild(grille);

    // Ce que le client impose par-dessus l'ambiance. Relu par `marqueDe` et
    // non pris tel quel : ce réglage vient d'un document, et une couleur qui
    // n'en est pas une n'a pas à traverser jusqu'à l'aperçu.
    let marque = marqueDe(courant);
    let redessinerMarque = () => {};
    // Une marque vide n'a pas à s'enregistrer vide : la clé disparaît, et
    // l'ambiance reprend la main sans laisser de trace dans le document.
    const marqueAEcrire = () => (Object.keys(marque).length ? marque : undefined);
    page.appendChild(carteMarque());

    function peindre() {
      clear(grille);
      for (const theme of THEMES) {
        const actif = courant.id === theme.id;

        // La vignette est le VRAI rendu, réduit — pas un dessin approchant.
        // Neuf documents `srcdoc` de même origine coûtent peu, et c'est la
        // seule façon d'être sûr que ce qu'on choisit est ce qu'on aura.
        const vignette = h('iframe', {
          class: 'theme-vignette', tabindex: '-1', 'aria-hidden': 'true',
          scrolling: 'no', srcdoc: rendreDemo(metier, { id: theme.id, portee: 'site' }),
        });

        const carte = h('div', { class: 'theme-carte' + (actif ? ' theme-carte--actif' : '') },
          h('div', { class: 'theme-carte__vue' }, vignette),
          h('div', { class: 'theme-carte__pied' },
            h('div', { class: 'theme-carte__main' },
              h('span', { class: 'theme-carte__nom' }, t('theme_' + theme.id)),
              h('span', { class: 'theme-carte__police' }, theme.police.titres),
            ),
            actif
              ? h('span', { class: 'etat etat--publie' }, icon('check', 11), t('boThemeActif'))
              : null,
          ),
          h('div', { class: 'theme-carte__actions' },
            h('button', { class: 'b b--sm', type: 'button', onclick: () => previsualiser(theme) },
              icon('eye', 12), t('boThemeVoir')),
            actif ? null : h('button', {
              class: 'b b--sm b--fort', type: 'button', onclick: () => poser(theme),
            }, icon('check', 12), t('boThemeAppliquer')),
          ),
        );
        grille.appendChild(carte);
      }
    }

    async function poser(theme) {
      etat.textContent = t('boEnregistrement');
      try {
        // La marque survit au changement d'ambiance : les couleurs du client ne
        // dépendent pas de l'accord qu'on essaie en dessous.
        await appliquer({ id: theme.id, portee, marque: marqueAEcrire() });
        courant.id = theme.id;
        courant.portee = portee;
        etat.textContent = t('boThemePose', t('theme_' + theme.id));
        peindre();
        redessinerMarque();
      } catch (err) { etat.textContent = String(err?.message || err); }
    }

    /**
     * Le panneau de marque : les deux couleurs, le couple de polices.
     *
     * Il n'a de sens qu'avec une ambiance en place — une surcharge n'a rien à
     * surcharger sur un site sans habillage — et il le dit plutôt que d'offrir
     * des champs qui ne changeraient rien.
     */
    function carteMarque() {
      const compte = h('span', { class: 'table__meta' });
      const corps = h('div', { class: 'carte__corps' });
      const carte = h('div', { class: 'carte', style: { marginTop: '22px' } },
        h('div', { class: 'carte__tete' },
          icon('palette', 14), h('span', {}, t('marquePerso')), compte,
          h('button', {
            class: 'b b--sm b--nu', type: 'button',
            onclick: () => { marque = {}; redessinerMarque(); enregistrerMarque(); },
          }, icon('close', 12), t('marqueReprendre')),
          h('button', {
            class: 'b b--sm', type: 'button',
            onclick: () => {
              const theme = themeById(courant.id);
              if (theme) previsualiser(theme, marque);
            },
          }, icon('eye', 12), t('boThemeVoir')),
          h('button', {
            class: 'b b--sm b--fort', type: 'button', onclick: () => enregistrerMarque(),
          }, icon('check', 12), t('marqueEnregistrer')),
        ),
        corps,
      );

      const apercu = h('iframe', {
        class: 'perso-vue', title: t('marquePerso'), loading: 'lazy',
        scrolling: 'no', tabindex: '-1',
      });
      let attente = null;

      // Rendre la page de démonstration à chaque pixel du sélecteur de couleur
      // coûterait plus cher que ce que l'œil peut suivre.
      const rafraichir = () => {
        const n = Object.keys(marque).length;
        compte.textContent = n ? t('marqueCompte', n) : t('marqueAucune');
        clearTimeout(attente);
        attente = setTimeout(() => {
          apercu.srcdoc = rendreDemo(metier, { id: courant.id, portee: 'site', marque });
        }, 140);
      };

      /** Écrit une surcharge, ou la retire si la valeur est vide ou fautive. */
      const ecrire = (patch) => {
        marque = fusionnerMarque(marque, patch) || {};
        rafraichir();
      };

      // Faire valider la saisie par le module qui fera foi : deux règles
      // écrites à deux endroits finiraient par ne plus dire la même chose.
      const propre = (cle, valeur) => marqueDe({ marque: { [cle]: valeur } })[cle] || '';
      const libelle = (cle, suffixe = '') => t('marque' + cle[0].toUpperCase() + cle.slice(1) + suffixe);

      redessinerMarque = () => {
        clear(corps);
        const theme = themeById(courant.id);
        if (!theme) {
          corps.appendChild(h('div', { class: 'note' }, icon('warn', 14), t('marqueSansAmbiance')));
          return;
        }
        corps.append(
          h('p', { class: 'table__meta', style: { margin: '0 0 14px' } }, t('marquePersoAide')),
          h('div', { class: 'perso-champs' },
            champCouleur('principale', theme.couleurs.accent),
            champCouleur('secondaire', theme.couleurs.fondDoux),
            champPolice('policeTitres', theme.police.titres),
            champPolice('policeTexte', theme.police.textes),
          ),
          h('p', { class: 'table__meta', style: { margin: '16px 0 8px' } }, t('marqueVignettesAide')),
          apercu,
        );
        rafraichir();
      };

      /** Pastille native et saisie hexadécimale : la charte donne un code. */
      function champCouleur(cle, defaut) {
        const texte = h('input', {
          class: 'saisie', type: 'text', value: marque[cle] || '',
          placeholder: t('marqueCommeAmbiance') + ' — ' + defaut,
          onchange: (e) => {
            const v = propre(cle, e.target.value);
            e.target.value = v;
            pastille.value = v || defaut;
            ecrire({ [cle]: v });
          },
        });
        const pastille = h('input', {
          class: 'perso-pastille', type: 'color', value: marque[cle] || defaut,
          'aria-label': libelle(cle),
          oninput: (e) => { texte.value = e.target.value; ecrire({ [cle]: e.target.value }); },
        });
        return h('label', { class: 'champ' },
          h('span', { class: 'champ__nom' }, libelle(cle)),
          h('div', { class: 'perso-couleur' }, pastille, texte),
          h('span', { class: 'perso-aide' }, libelle(cle, 'Aide')),
        );
      }

      function champPolice(cle, defaut) {
        return h('label', { class: 'champ' },
          h('span', { class: 'champ__nom' }, libelle(cle)),
          h('select', {
            class: 'saisie', onchange: (e) => ecrire({ [cle]: e.target.value }),
          }, [
            h('option', { value: '', selected: !marque[cle] },
              t('marqueCommeAmbiance') + ' — ' + defaut),
            // Rangées par famille : à plus de quarante entrées, une liste à
            // plat ne se parcourt plus.
            ...GROUPES_POLICE.map((groupe) => h('optgroup', { label: t('fontGroup_' + groupe) },
              FONTS.filter((police) => police.groupe === groupe).map((police) => h('option', {
                value: police.name, selected: police.name === marque[cle],
                style: { fontFamily: `"${police.name}", ${police.stack}` },
              }, police.name)))),
          ]),
        );
      }

      async function enregistrerMarque() {
        if (!courant.id) return;
        compte.textContent = t('boEnregistrement');
        try {
          await appliquer({ id: courant.id, portee, marque: marqueAEcrire() });
          courant.portee = portee;
          courant.marque = marqueAEcrire();
          compte.textContent = t('marqueFait');
        } catch (err) { compte.textContent = String(err?.message || err); }
      }

      redessinerMarque();
      return carte;
    }

    /**
     * La prévisualisation : une vraie page, dans une iframe isolée.
     *
     * `srcdoc` plutôt qu'une adresse : la démonstration n'existe nulle part
     * sur le disque, et n'a pas à y exister. Elle ne charge rien du site —
     * donc rien ne peut être confondu avec le contenu réel.
     */
    function previsualiser(theme, marqueVue = null) {
      const reglage = { id: theme.id, portee: 'site', marque: marqueVue || undefined };
      const cadre = h('iframe', {
        class: 'demo-cadre', title: t('boThemeVoir'), loading: 'lazy',
        srcdoc: rendreDemo(metier, reglage),
      });

      const voile = h('div', {
        class: 'voile voile--large',
        onclick: (e) => { if (e.target === voile) voile.remove(); },
      }, h('div', { class: 'voile__boite voile__boite--large' },
        h('div', { class: 'carte__tete' },
          icon('palette', 14),
          h('span', {}, t('theme_' + theme.id)),
          h('span', { class: 'table__meta' }, t('boDemoAvertissement')),
          h('button', {
            class: 'b b--sm b--fort', type: 'button',
            onclick: () => { voile.remove(); poser(theme); },
          }, icon('check', 12), t('boThemeAppliquer')),
          h('button', {
            class: 'b b--sm b--nu b--icone', type: 'button', onclick: () => voile.remove(),
          }, icon('close', 13)),
        ),
        cadre,
      ));
      document.body.appendChild(voile);
    }

    peindre();
  };
}

/**
 * Le document d'une page de démonstration, en une chaîne.
 *
 * Le rendu des éléments demande un vrai document : on en fabrique un hors
 * écran, on y rend les sections, et on renvoie son HTML. C'est le même
 * `renderWidget` que celui du site — une démonstration qui mentirait sur ce
 * point ne servirait à rien.
 *
 * @param {Function} renderWidget
 * @param {object[]} sections arbres de widgets
 * @param {object} reglageTheme
 */
export function documentDemo(renderWidget, sections, reglageTheme) {
  const doc = document.implementation.createHTMLDocument('demo');
  for (const arbre of sections) {
    const el = renderWidget(arbre, doc, {});
    if (el) doc.body.appendChild(el);
  }
  // `cssDuTheme` attend le THÈME, pas le réglage qui le désigne : lui
  // passer { id, portee } le laissait sans polices ni couleurs.
  const style = doc.createElement('style');
  const theme = themeById(reglageTheme?.id);
  style.textContent = BASE_DEMO
    + (theme ? '\n' + cssDuTheme(theme, 'site', reglageTheme?.marque) : '');
  doc.head.appendChild(style);
  // La même balise que celle du site : sans elle, la démonstration nommait des
  // polices que le document n'a pas, et les montrait toutes en Times. Juger un
  // couple de polices sur un rendu qui ne les charge pas n'a aucun sens.
  writeFontLink(doc, policesDuTheme(reglageTheme));
  return '<!DOCTYPE html>' + doc.documentElement.outerHTML;
}

/**
 * Le strict minimum pour que la démonstration ressemble à un site.
 *
 * Un site réel apporte sa propre feuille de style ; la démonstration n'en a
 * pas, et sans ces quelques règles les sections s'empileraient sans marges,
 * ce qui ferait juger l'ambiance sur un défaut qui n'est pas le sien.
 */
const BASE_DEMO = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font:16px/1.65 system-ui,sans-serif}
  section{padding:64px 24px}
  section>*{max-width:1040px;margin-left:auto;margin-right:auto}
  h1,h2,h3{line-height:1.15;margin-bottom:14px}
  h1{font-size:2.6rem} h2{font-size:1.9rem} h3{font-size:1.25rem}
  p{margin-bottom:14px}
  img{max-width:100%;height:auto;display:block}
  a{color:inherit}
`;
