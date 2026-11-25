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

  /**
   * Une même touche est relevée à QUATRE moments de sa course. Savoir
   * *quand* elle a été annulée dit *par qui* :
   *
   *   tot    tout début de la capture sur `window` — rien du code de la page
   *          n'a encore tourné. Annulée dès là = ce n'est pas la page.
   *   ici    à l'entrée du module.
   *   tard   remontée finie, tout le monde s'est exprimé.
   *   fin    au tour suivant, une fois le navigateur passé.
   */
  const suivi = new WeakMap();

  function jalon(event, nom) {
    const ligne = suivi.get(event);
    if (!ligne) return;
    ligne.etapes[nom] = event.defaultPrevented;
    // Vu depuis `window`, un événement né dans le panneau est réattribué à
    // l'hôte du shadow DOM : c'est ici, à l'intérieur, qu'on voit le champ.
    const champ = event.target;
    if (champ && champ !== ligne.cible && champ.getRootNode?.() !== document) {
      ligne.cible = champ;
      ligne.champ = nomDe(champ);
      ligne.avant = valeurDe(champ).length;
    }
  }

  function ecouter(cible, ou) {
    if (!cible) return;
    let attente = null;

    const surTouche = (event) => {
      // Une touche qui n'écrit pas un caractère ne nous intéresse pas ici.
      if (!event.key || event.key.length !== 1) return;
      if (suivi.has(event)) { jalon(event, 'ici'); return; }
      const champ = event.target;
      const ligne = {
        ou, touche: event.key, code: event.code, keyCode: event.keyCode,
        mods: [event.ctrlKey && 'Ctrl', event.altKey && 'Alt', event.metaKey && 'Cmd',
          event.shiftKey && 'Maj'].filter(Boolean).join('+'),
        cible: champ, champ: nomDe(champ), avant: valeurDe(champ).length,
        fiable: event.isTrusted !== false, compose: !!event.isComposing,
        etapes: { tot: event.defaultPrevented },
        annule: false, insere: false, apres: null,
      };
      suivi.set(event, ligne);
      attente = ligne;
      lignes.push(ligne);
      if (lignes.length > MEMOIRE) lignes.shift();

      // On regarde à la fin du tour : d'ici là, tout le monde s'est exprimé.
      setTimeout(() => {
        ligne.etapes.fin = event.defaultPrevented;
        ligne.annule = event.defaultPrevented;
        ligne.apres = valeurDe(ligne.cible).length;
        if (attente === ligne) attente = null;
        dessiner();
      }, 0);
      dessiner();
    };

    const surRemontee = (event) => jalon(event, 'tard');

    // Un événement « input » juste après la touche : le caractère est passé.
    const surSaisie = () => { if (attente) attente.insere = true; };

    cible.addEventListener('keydown', surTouche, true);
    cible.addEventListener('keydown', surRemontee, false);
    cible.addEventListener('input', surSaisie, true);
    listeners.push(() => {
      cible.removeEventListener('keydown', surTouche, true);
      cible.removeEventListener('keydown', surRemontee, false);
      cible.removeEventListener('input', surSaisie, true);
    });
  }

  function detacher() { for (const retirer of listeners) retirer(); listeners.length = 0; }

  // `window` en premier : personne d'autre de la page n'a encore vu la touche.
  ecouter(window, t('clavierOuPanneau'));
  ecouter(root, t('clavierOuPanneau'));
  ecouter(docApercu, t('clavierOuPage'));
  if (docApercu?.defaultView) ecouter(docApercu.defaultView, t('clavierOuPage'));

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
      if (!annulees.length) morceaux.push(t('clavierPasInserees'));
      // Annulée AVANT que le moindre code de la page ait tourné : la page
      // n'y est pour rien, module compris. Annulée seulement à la fin :
      // quelque chose qui écoute dans la page l'a prise — et ce quelque
      // chose n'est pas le module, qui n'annule aucune touche d'écriture.
      else if (annulees.some((l) => l.etapes.tot)) morceaux.push(t('clavierAnnuleesAvant'));
      else morceaux.push(t('clavierAnnuleesPendant'));
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
          t('clavierColQuand'), t('clavierColEtat')].map((titre) => h('th', {}, titre)))),
      h('tbody', {}, lignes.slice(-60).reverse().map((l) => {
        const perdue = !l.insere;
        return h('tr', {},
          h('td', {}, JSON.stringify(l.touche) + (l.mods ? ' [' + l.mods + ']' : '')
            + ' · ' + l.code),
          h('td', {}, l.ou),
          h('td', {}, l.champ),
          h('td', {}, quandDe(l)),
          h('td', { class: perdue ? 'clav__ko' : 'clav__ok' },
            l.annule ? t('clavierEtatAnnulee') : perdue ? t('clavierEtatRien') : t('clavierEtatOk')),
        );
      })),
    );
    corps.appendChild(tableau);
  }

  /** À quel moment de sa course la touche a-t-elle été annulée ? */
  function quandDe(l) {
    if (!l.annule) return '—';
    return l.etapes.tot ? t('clavierQuandAvant') : t('clavierQuandPage');
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
      'touche | où | champ | annulée | quand | insérée | avant→après | fiable',
    ];
    const corpsTexte = lignes.map((l) => [JSON.stringify(l.touche) + (l.mods ? ' [' + l.mods + ']' : ''),
      l.ou, l.champ, l.annule ? 'oui' : 'non', quandDe(l), l.insere ? 'oui' : 'non',
      l.avant + '→' + l.apres, l.fiable ? 'oui' : 'NON'].join(' | '));
    const rapport = entete.concat(corpsTexte).join('\n');
    navigator.clipboard?.writeText(rapport).catch(() => {});
  }

  dessiner();
  return { close: fermer };
}
