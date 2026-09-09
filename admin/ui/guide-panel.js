/**
 * Le Guide : la page de haut en bas, une étape après l'autre.
 *
 * C'est la vue par défaut, et elle s'adresse à quelqu'un qui n'a jamais fait
 * de site. Pas de bibliothèque d'éléments, pas de vocabulaire de métier : une
 * liste d'étapes dans l'ordre où on lit la page, et dans chacune les champs à
 * remplir, nommés comme on les nommerait à l'oral. Une barre dit ce qu'il
 * reste à faire ; le client descend, et quand il arrive en bas, la page est
 * finie.
 *
 * Les vues Éléments et Structure restent là pour qui veut aller plus loin.
 * @module ui/guide-panel
 */
import { h, icon, clear } from './el.js';
import { avancement, estExemple } from '../core/guide.js';
import { rendreChoixTheme } from './theme-panel.js';

/** Étape « ambiance » : elle vient avant tout le reste. */
const PAS_THEME = '__theme';
/** Étape finale : ce qu'il reste à faire une fois la page remplie. */
const PAS_FIN = '__fin';

export function createGuide({ vue, t, actions }) {
  let ouvert = PAS_THEME;
  let etapes = [];

  const tete = h('div', { class: 'guide__tete' });
  const barre = h('span', { class: 'guide__jauge' });
  const compte = h('div', { class: 'guide__compte' });
  const liste = h('div', { class: 'guide__liste' });
  tete.append(h('div', { class: 'guide__prog' }, barre), compte);
  vue.append(tete, liste);

  /** Étapes validées à la main, retenues d'une session à l'autre. */
  const cleValide = () => 'admin:guide:' + actions.pageId();
  function lues() {
    try { return new Set(JSON.parse(localStorage.getItem(cleValide()) || '[]')); } catch { return new Set(); }
  }
  function marquer(ref, valide) {
    const set = lues();
    if (valide) set.add(ref); else set.delete(ref);
    try { localStorage.setItem(cleValide(), JSON.stringify([...set])); } catch { /* refusé */ }
  }

  // ------------------------------------------------------------ progression
  function majAvancement() {
    const { total, faits, part } = avancement(etapes);
    barre.style.width = part + '%';
    compte.textContent = total ? t('guideProgres', faits, total) : t('guideVide');
  }

  // ----------------------------------------------------------------- champs
  /** Applique une valeur, quelle que soit l'origine du champ. */
  function ecrire(champ, valeur, quoi = 'valeur') {
    if (champ.source === 'widget') {
      const patch = quoi === 'lien' ? champ.patchLien?.(valeur)
        : quoi === 'alt' ? champ.patchAlt?.(valeur)
          : champ.patch(valeur);
      if (patch) actions.setWidgetProps(champ.key, patch);
      return;
    }
    if (quoi === 'lien') { actions.setValue(champ.entry, { href: valeur }); return; }
    if (quoi === 'alt') { actions.setValue(champ.entry, { alt: valeur }); return; }
    if (champ.genre === 'image' || champ.genre === 'fond') {
      actions.setValue(champ.entry, { src: valeur });
      return;
    }
    actions.setValue(champ.entry, champ.entry.value?.html !== undefined ? { html: valeur } : { text: valeur });
  }

  /** Bandeau « c'est encore le texte d'exemple ». */
  function alerteExemple(champ, saisie) {
    if (!estExemple(champ)) return null;
    const ligne = h('div', { class: 'champ__exemple' },
      icon('warn', 12), h('span', {}, t('guideExemple')),
      h('button', {
        class: 'lien', type: 'button',
        onclick: () => {
          saisie.value = '';
          saisie.focus();
          champ.valeur = '';
          champ.exemple = false;
          ecrire(champ, '');
          ligne.remove();
          majAvancement();
        },
      }, t('guideEffacer')),
    );
    return ligne;
  }

  /**
   * Entrer dans un champ met en évidence, dans l'aperçu, l'élément qu'il
   * pilote. Sans cela on remplit un formulaire d'un côté pendant que la page
   * change de l'autre, sans savoir où : c'est ce qui donne l'impression de
   * deux outils au lieu d'un.
   */
  function relier(saisie, champ) {
    saisie.addEventListener('focus', () => actions.viser?.(champ));
    return saisie;
  }

  function champTexte(champ, multi) {
    const saisie = relier(multi
      ? h('textarea', { class: 'input input--multi', rows: 3, value: champ.valeur })
      : h('input', { class: 'input', type: 'text', value: champ.valeur }), champ);
    const alerte = alerteExemple(champ, saisie);
    saisie.addEventListener('input', () => {
      champ.valeur = saisie.value;
      champ.exemple = false;
      ecrire(champ, saisie.value);
      // Le texte n'est plus celui du modèle : l'avertissement n'a plus lieu d'être.
      alerte?.remove();
      majAvancement();
    });
    return { saisie, extra: alerte };
  }

  function champImage(champ) {
    const vignette = h('span', { class: 'guide__vign' });
    const peindre = () => {
      vignette.style.backgroundImage = champ.valeur ? `url("${champ.valeur}")` : '';
      vignette.classList.toggle('guide__vign--vide', !champ.valeur);
      vignette.textContent = champ.valeur ? '' : t('guideAucuneImage');
    };
    peindre();

    const poser = (url) => {
      champ.valeur = url;
      ecrire(champ, url);
      peindre();
      majAvancement();
    };

    vignette.addEventListener('click', () => actions.viser?.(champ));

    const exemples = h('div', { class: 'guide__exemples', hidden: true },
      actions.illustrations().map((image) => h('button', {
        class: 'guide__exemple', type: 'button', title: t('guideExempleImage'),
        style: { backgroundImage: `url("${image.url}")` },
        onclick: () => poser(image.url),
      })));

    return {
      saisie: h('div', { class: 'guide__image' },
        vignette,
        h('div', { class: 'guide__imageActions' },
          h('button', {
            class: 'btn btn--wide', type: 'button',
            onclick: () => actions.pickMedia((media) => poser(media.url), 'image'),
          }, icon('image', 13), t('guideMesImages')),
          h('button', {
            class: 'btn btn--wide', type: 'button',
            onclick: () => { exemples.hidden = !exemples.hidden; },
          }, icon('palette', 13), t('guideImagesExemple')),
        ),
      ),
      extra: exemples,
    };
  }

  function champBouton(champ) {
    const { saisie, extra } = champTexte(champ, false);
    const pages = actions.liens();
    const dest = relier(h('input', {
      class: 'input', type: 'text', value: champ.lien || '',
      placeholder: 'contact.html', list: 'guide-liens',
    }), champ);
    dest.addEventListener('input', () => ecrire(champ, dest.value, 'lien'));

    const raccourcis = h('div', { class: 'guide__dest' }, pages.slice(0, 4).map((page) => h('button', {
      class: 'puce', type: 'button',
      onclick: () => { dest.value = page.href; ecrire(champ, page.href, 'lien'); },
    }, page.libelle)));

    return {
      saisie,
      extra: h('div', {}, extra,
        h('span', { class: 'champ__nom champ__nom--sous' }, t('guideDestination')),
        h('span', { class: 'champ__aide' }, t('guideDestinationAide')),
        dest, pages.length ? raccourcis : null),
    };
  }

  const CONSTRUCTEURS = {
    titre: (c) => champTexte(c, false),
    texte: (c) => champTexte(c, true),
    liste: (c) => champTexte(c, true),
    adresse: (c) => champTexte(c, false),
    video: (c) => champTexte(c, false),
    image: champImage,
    fond: champImage,
    bouton: champBouton,
  };

  /**
   * Un champ. L'aide n'est écrite qu'une fois par genre et par étape : la
   * même phrase répétée sous cinq champs devient du bruit, et on cesse de la
   * lire — donc elle cesse d'aider.
   */
  function rendreChamp(champ, rang, dejaExplique) {
    const fabrique = CONSTRUCTEURS[champ.genre] || ((c) => champTexte(c, false));
    const { saisie, extra } = fabrique(champ);
    return h('label', { class: 'champ' },
      h('span', { class: 'champ__nom' }, t('guideChamp_' + champ.genre, rang)),
      dejaExplique ? null : h('span', { class: 'champ__aide' }, t('guideAide_' + champ.genre)),
      saisie,
      extra || null,
    );
  }

  // ----------------------------------------------------------------- étapes
  function enTete(id, numero, nom, etat) {
    return h('button', {
      class: 'pas__tete', type: 'button',
      'aria-expanded': ouvert === id ? 'true' : 'false',
      onclick: () => {
        ouvert = ouvert === id ? null : id;
        render();
        if (ouvert === id) actions.reveal?.(id);
      },
    },
      h('span', { class: 'pas__num' + (etat === 'ok' ? ' pas__num--ok' : '') },
        etat === 'ok' ? icon('check', 12) : String(numero)),
      h('span', { class: 'pas__nom' }, nom),
      icon(ouvert === id ? 'up' : 'down', 12),
    );
  }

  function pasTheme(numero) {
    const corps = h('div', { class: 'pas__corps' });
    const valide = !!actions.theme()?.id;
    const bloc = h('section', { class: 'pas' + (ouvert === PAS_THEME ? ' pas--on' : '') },
      enTete(PAS_THEME, numero, t('guideTheme'), valide ? 'ok' : ''));

    if (ouvert === PAS_THEME) {
      corps.append(h('p', { class: 'champ__aide', style: { marginTop: '0' } }, t('guideThemeAide')));
      const hote = h('div', {});
      corps.appendChild(hote);
      rendreChoixTheme({
        hote, t,
        valeur: actions.theme(),
        siteExistant: actions.siteExistant(),
        onChange: (reglage) => { actions.setTheme(reglage); majAvancement(); },
      });
      bloc.appendChild(corps);
    }
    return bloc;
  }

  /** Nom affiché d'une étape, pour éviter de le répéter en intertitre. */
  function nom2(etape) {
    return etape.titre || t('guideRepli_' + etape.repli, etape.index + 1);
  }

  function pasSection(etape, numero) {
    const valide = etape.restants === 0 || lues().has(etape.ref);
    const nom = nom2(etape);
    const bloc = h('section', { class: 'pas' + (ouvert === etape.ref ? ' pas--on' : '') },
      enTete(etape.ref, numero, nom, valide ? 'ok' : ''));

    if (!valide && etape.total) {
      bloc.querySelector('.pas__nom').after(
        h('span', { class: 'pas__reste' }, t('guideReste', etape.restants)));
    }

    if (ouvert !== etape.ref) return bloc;

    const corps = h('div', { class: 'pas__corps' });
    if (!etape.champs.length) {
      corps.appendChild(h('p', { class: 'hint', style: { marginTop: '0' } }, t('guideRienARemplir')));
    }
    // Les champs sont rendus groupe par groupe — une colonne de la page fait
    // un groupe — et le rang repart à 1 dans chacun : « Le titre » de la
    // deuxième colonne n'est pas « Titre 4 ».
    let groupeCourant = null;
    let rangs = {};
    const expliques = new Set();
    // Un intertitre n'a de sens qu'à partir de deux groupes, et il ne répète
    // pas le nom de l'étape : « Nous trouver » sous « Nous trouver » n'apprend
    // rien à personne.
    const groupes = new Set(etape.champs.map((c) => c.groupe || 0));
    const montrerGroupes = groupes.size > 1;

    for (const champ of etape.champs) {
      const groupe = champ.groupe || 0;
      if (groupe !== groupeCourant) {
        groupeCourant = groupe;
        rangs = {};
        const nom = champ.groupeNom || '';
        if (groupe && montrerGroupes && nom.toLowerCase() !== nom2(etape).toLowerCase()) {
          corps.appendChild(h('div', { class: 'champ__groupe' },
            h('span', {}, nom || t('guideGroupe', groupe))));
        }
      }
      rangs[champ.genre] = (rangs[champ.genre] || 0) + 1;
      corps.appendChild(rendreChamp(champ, rangs[champ.genre], expliques.has(champ.genre)));
      expliques.add(champ.genre);
    }

    corps.append(
      h('label', { class: 'guide__fait' },
        h('input', {
          type: 'checkbox', checked: lues().has(etape.ref),
          onchange: (e) => { marquer(etape.ref, e.target.checked); render(); },
        }),
        h('span', {}, t('guideFait')),
      ),
      h('div', { class: 'row' },
        h('button', {
          class: 'btn btn--primary btn--wide', type: 'button',
          onclick: () => {
            marquer(etape.ref, true);
            const suivant = etapes[etape.index + 1];
            ouvert = suivant ? suivant.ref : PAS_FIN;
            render();
            actions.reveal?.(ouvert);
          },
        }, t('guideSuivant'), icon('down', 12)),
      ),
    );
    bloc.appendChild(corps);
    return bloc;
  }

  function pasFin(numero) {
    const bloc = h('section', { class: 'pas pas--fin' + (ouvert === PAS_FIN ? ' pas--on' : '') },
      enTete(PAS_FIN, numero, t('guideFin'), ''));
    if (ouvert !== PAS_FIN) return bloc;

    const corps = h('div', { class: 'pas__corps' },
      h('p', { class: 'champ__aide', style: { marginTop: '0' } }, t('guideFinAide')),
      h('button', {
        class: 'btn btn--wide', type: 'button', onclick: () => actions.brief(),
      }, icon('pencil', 13), t('guideBrief')),
      h('button', {
        class: 'btn btn--wide', type: 'button', onclick: () => actions.addSection(),
      }, icon('plus', 13), t('guideAjouterSection')),
      h('button', {
        class: 'btn btn--wide', type: 'button', onclick: () => actions.openPages(),
      }, icon('pages', 13), t('guideAutrePage')),
      h('button', {
        class: 'btn btn--wide', type: 'button', onclick: () => actions.openLegal(),
      }, icon('code', 13), t('guideLegal')),
      h('button', {
        class: 'btn btn--primary btn--wide', type: 'button', onclick: () => actions.publish(),
      }, icon('upload', 13), t('guidePublier')),
    );
    bloc.appendChild(corps);
    return bloc;
  }

  // ------------------------------------------------------------------ rendu
  function render() {
    etapes = actions.etapes();
    clear(liste);

    let numero = 1;
    liste.appendChild(pasTheme(numero++));
    for (const etape of etapes) liste.appendChild(pasSection(etape, numero++));
    liste.appendChild(pasFin(numero));

    majAvancement();
  }

  /** Ouvre l'étape correspondant à une section, sans rien remplir d'office. */
  function ouvrirEtape(ref) {
    ouvert = ref;
    render();
  }

  return { render, ouvrirEtape, majAvancement, get etapes() { return etapes; } };
}
