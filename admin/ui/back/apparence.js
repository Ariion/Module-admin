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
 * @module ui/back/apparence
 */
import { h, icon, clear } from '../el.js';
import { teteEcran } from './shell-back.js';
import { THEMES, themeById, cssDuTheme, PORTEES_THEME } from '../../core/theme.js';
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
      onchange: (e) => { metier = e.target.value; peindre(); },
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
        await appliquer({ id: theme.id, portee });
        courant.id = theme.id;
        courant.portee = portee;
        etat.textContent = t('boThemePose', t('theme_' + theme.id));
        peindre();
      } catch (err) { etat.textContent = String(err?.message || err); }
    }

    /**
     * La prévisualisation : une vraie page, dans une iframe isolée.
     *
     * `srcdoc` plutôt qu'une adresse : la démonstration n'existe nulle part
     * sur le disque, et n'a pas à y exister. Elle ne charge rien du site —
     * donc rien ne peut être confondu avec le contenu réel.
     */
    function previsualiser(theme) {
      const reglage = { id: theme.id, portee: 'site' };
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
  style.textContent = BASE_DEMO + (theme ? '\n' + cssDuTheme(theme, 'site') : '');
  doc.head.appendChild(style);
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
