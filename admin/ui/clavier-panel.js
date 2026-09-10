/**
 * Diagnostic clavier : où passe une touche qui ne s'écrit pas ?
 *
 * Un caractère qui n'arrive pas à l'écran peut se perdre à quatre endroits,
 * et la réponse change complètement selon lequel :
 *
 *   1. la touche n'atteint jamais la page — quelque chose l'a prise avant
 *      (extension du navigateur, logiciel de clavier, raccourci du système) ;
 *   2. elle atteint la page mais du code l'ANNULE ;
 *   3. elle n'est pas annulée, mais le navigateur n'insère rien ;
 *   4. le caractère est bien inséré, et c'est le module qui le perd ensuite.
 *
 * Seul le quatrième cas est de notre ressort — et c'est justement celui qu'on
 * ne peut pas deviner à distance. Cette fenêtre écoute les deux endroits où
 * l'on écrit (le panneau et la page), et le dit.
 * @module ui/clavier-panel
 */
import { h, icon, clear } from './el.js';

/** Combien de touches on garde : au-delà, la fenêtre devient illisible. */
const MEMOIRE = 400;

/**
 * @param {object} options
 * @param {HTMLElement} options.root racine (shadow) du module
 * @param {Function} options.t
 * @param {Document|null} options.docApercu document de l'aperçu, s'il est là
 */
export function openClavier({ root, t, docApercu }) {
  const lignes = [];
  const corps = h('div', { class: 'clav__corps' });
  const listeners = [];

  // Surtout PAS une fenêtre modale : il faut pouvoir continuer à taper dans
  // le panneau et dans la page pendant que le relevé se fait. Une fenêtre
  // flottante, dans un coin, qui ne prend le clic que sur elle-même.
  const fenetre = h('div', { class: 'clav' },
    h('div', { class: 'clav__tete' },
      icon('search', 13),
      h('span', { style: { flex: '1' } }, t('clavierTitre')),
      h('button', {
        class: 'btn btn--sm btn--icon', type: 'button', title: t('close'), onclick: fermer,
      }, icon('close', 13)),
    ),
    corps,
    h('div', { class: 'clav__pied' },
      h('button', { class: 'btn btn--sm', type: 'button', onclick: () => { lignes.length = 0; dessiner(); } },
        icon('history', 12), t('clavierVider')),
      h('span', { style: { flex: '1' } }),
      h('button', { class: 'btn btn--sm btn--primary', type: 'button', onclick: copier },
        icon('copy', 12), t('clavierCopier')),
    ),
  );
  root.appendChild(fenetre);

  function fermer() { detacher(); fenetre.remove(); }

  /** Le texte contenu par la cible d'un événement, quelle qu'elle soit. */
  const valeurDe = (cible) => {
    if (!cible) return '';
    if ('value' in cible && typeof cible.value === 'string') return cible.value;
    return cible.textContent || '';
  };

  const nomDe = (cible) => {
    if (!cible || !cible.tagName) return '?';
    const classe = typeof cible.className === 'string' && cible.className
      ? '.' + cible.className.split(/\s+/)[0] : '';
    return cible.tagName.toLowerCase() + classe;
  };

  function ecouter(cible, ou) {
    if (!cible) return;
    let attente = null;

    const surTouche = (event) => {
      // Une touche qui n'écrit pas un caractère ne nous intéresse pas ici.
      if (!event.key || event.key.length !== 1) return;
      const champ = event.target;
      const ligne = {
        ou, touche: event.key, code: event.code, keyCode: event.keyCode,
        mods: [event.ctrlKey && 'Ctrl', event.altKey && 'Alt', event.metaKey && 'Cmd',
          event.shiftKey && 'Maj'].filter(Boolean).join('+'),
        champ: nomDe(champ), avant: valeurDe(champ).length,
        annule: false, insere: false, apres: null,
      };
      attente = ligne;
      lignes.push(ligne);
      if (lignes.length > MEMOIRE) lignes.shift();

      // On regarde à la fin du tour : d'ici là, tout le monde s'est exprimé.
      setTimeout(() => {
        ligne.annule = event.defaultPrevented;
        ligne.apres = valeurDe(champ).length;
        if (attente === ligne) attente = null;
        dessiner();
      }, 0);
      dessiner();
    };

    // Un événement « input » juste après la touche : le caractère est passé.
    const surSaisie = () => { if (attente) attente.insere = true; };

    cible.addEventListener('keydown', surTouche, true);
    cible.addEventListener('input', surSaisie, true);
    listeners.push(() => {
      cible.removeEventListener('keydown', surTouche, true);
      cible.removeEventListener('input', surSaisie, true);
    });
  }

  function detacher() { for (const retirer of listeners) retirer(); listeners.length = 0; }

  ecouter(root, t('clavierOuPanneau'));
  ecouter(docApercu, t('clavierOuPage'));

  /**
   * Ce que les relevés permettent de conclure. On ne dit rien qu'on ne
   * puisse déduire : le silence sur une touche est lui-même une information.
   */
  function verdict() {
    if (!lignes.length) return t('clavierAttente');
    const perdues = lignes.filter((l) => !l.insere);
    const annulees = perdues.filter((l) => l.annule);
    const modifiees = lignes.filter((l) => /Ctrl|Alt|Cmd/.test(l.mods));

    const morceaux = [];
    if (!perdues.length) {
      morceaux.push(t('clavierToutPasse'));
    } else {
      const noms = [...new Set(perdues.map((l) => l.touche))].join(' ');
      morceaux.push(t('clavierPerdues', noms));
      morceaux.push(annulees.length ? t('clavierAnnulees') : t('clavierPasInserees'));
    }
    if (modifiees.length) morceaux.push(t('clavierModificateurs', modifiees.length));

    // Une touche qui ne déclenche AUCUN relevé n'est jamais parvenue jusqu'ici.
    morceaux.push(t('clavierAbsentes'));
    return morceaux.join('\n\n');
  }

  function dessiner() {
    clear(corps);
    corps.append(
      h('p', { class: 'hint', style: { marginTop: '0' } }, t('clavierAide')),
      h('div', { class: 'clav__verdict' }, verdict()),
    );

    if (!lignes.length) return;
    const tableau = h('table', { class: 'clav__table' },
      h('thead', {}, h('tr', {},
        ...[t('clavierColTouche'), t('clavierColOu'), t('clavierColChamp'),
          t('clavierColEtat')].map((titre) => h('th', {}, titre)))),
      h('tbody', {}, lignes.slice(-60).reverse().map((l) => {
        const perdue = !l.insere;
        return h('tr', {},
          h('td', {}, JSON.stringify(l.touche) + (l.mods ? ' [' + l.mods + ']' : '')
            + ' · ' + l.code),
          h('td', {}, l.ou),
          h('td', {}, l.champ),
          h('td', { class: perdue ? 'clav__ko' : 'clav__ok' },
            l.annule ? t('clavierEtatAnnulee') : perdue ? t('clavierEtatRien') : t('clavierEtatOk')),
        );
      })),
    );
    corps.appendChild(tableau);
  }

  /** Un rapport en texte brut, à coller tel quel dans un message. */
  function copier() {
    const entete = [
      'Diagnostic clavier — module admin',
      'navigateur : ' + navigator.userAgent,
      'langue : ' + navigator.language,
      'touches relevées : ' + lignes.length,
      '',
      verdict(),
      '',
      'touche | où | champ | annulée | insérée | longueur avant→après',
    ];
    const corpsTexte = lignes.map((l) => [JSON.stringify(l.touche) + (l.mods ? ' [' + l.mods + ']' : ''),
      l.ou, l.champ, l.annule ? 'oui' : 'non', l.insere ? 'oui' : 'non',
      l.avant + '→' + l.apres].join(' | '));
    const rapport = entete.concat(corpsTexte).join('\n');
    navigator.clipboard?.writeText(rapport).catch(() => {});
  }

  dessiner();
  return { close: fermer };
}
