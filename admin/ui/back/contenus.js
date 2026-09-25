/**
 * Les contenus : articles, portraits, réalisations — ce qu'un site publie.
 *
 * Un contenu n'est pas une page, du point de vue de celui qui écrit. Il a
 * une forme (« un portrait »), il vit dans une galerie, et il a une fiche à
 * lui. Que le module fabrique tout ça avec un fichier .html copié d'un
 * modèle est un détail d'implémentation : le client ne doit jamais avoir à
 * le savoir, et le mot « page » n'apparaît nulle part sur cet écran.
 *
 * Les types sont déclarés par le développeur dans `admin-config.js`. Sans
 * déclaration, l'écran ne montre pas une liste vide : il explique ce qui
 * manque et à qui le demander.
 * @module ui/back/contenus
 */
import { h, icon, clear } from '../el.js';
import { teteEcran } from './shell-back.js';

/**
 * @param {object} options
 * @param {Function} options.t
 * @param {Function} options.types renvoie les types déclarés
 * @param {Function} options.lister reçoit un type, renvoie ses contenus
 * @param {Function} options.peutCreer l'hébergement sait-il écrire un fichier
 * @param {Function} options.onCreer reçoit (type, sousType, titre)
 * @param {Function} options.onEcrire ouvre l'éditeur en direct sur un contenu
 * @param {Function} options.onGalerie ouvre la page qui porte la galerie
 */
export function creerContenus({ t, types, lister, peutCreer, onCreer, onEcrire, onGalerie }) {
  return async function dessiner(page, typeVise = null) {
    const declares = types();

    if (!declares.length) {
      page.appendChild(teteEcran(t('boContenus'), null));
      page.appendChild(h('div', { class: 'carte' }, h('div', { class: 'carte__corps' },
        h('div', { class: 'vide' },
          icon('list', 30),
          h('p', {}, t('boContenusNonDeclares')),
          h('p', { class: 'table__meta', style: { maxWidth: '54ch', margin: '0 auto' } },
            t('boContenusNonDeclaresAide')),
        ),
      )));
      return;
    }

    const actif = declares.find((x) => x.id === typeVise) || declares[0];

    page.appendChild(teteEcran(actif.nom, t('boContenusAide'),
      h('button', { class: 'b', type: 'button', onclick: () => onGalerie(actif) },
        icon('eye', 14), t('boVoirGalerie')),
    ));

    // Plusieurs formes de contenu ? On les montre en onglets : un menu
    // déroulant cacherait ce que le site sait faire.
    if (declares.length > 1) {
      page.appendChild(h('div', { class: 'onglets' }, declares.map((type) => h('button', {
        class: 'onglet', type: 'button',
        'aria-selected': type.id === actif.id ? 'true' : 'false',
        onclick: () => dessiner(videEt(page), type.id),
      }, type.nom))));
    }

    // Le nom de la forme, tel qu'il est déclaré, et rien d'autre : « nouvel
    // interview » ou « nouvelle interview » dépend d'un genre que la
    // déclaration ne donne pas. L'intention est dans le titre au-dessus.
    page.appendChild(h('div', { class: 'forme__titre' }, t('boCreerUn')));
    page.appendChild(h('div', { class: 'formes' }, actif.sousTypes.map((sousType) => h('button', {
      class: 'forme', type: 'button', disabled: !peutCreer(),
      onclick: () => demanderTitre(actif, sousType),
    },
      h('span', { class: 'forme__icone' }, icon(sousType.icone || 'text', 16)),
      h('span', { class: 'forme__main' },
        h('span', { class: 'forme__nom' }, sousType.nom),
        h('span', { class: 'forme__aide' }, sousType.modele),
      ),
      h('span', { class: 'forme__plus' }, icon('plus', 14)),
    ))));

    if (!peutCreer()) {
      page.appendChild(h('div', { class: 'note', style: { marginBottom: '18px' } },
        icon('warn', 14), h('span', {}, t('boContenusSansHote'))));
    }

    const carte = h('div', { class: 'carte' });
    page.appendChild(carte);
    carte.appendChild(h('div', { class: 'charge' }, t('boChargement')));

    let contenus = [];
    try {
      contenus = await lister(actif);
    } catch (err) {
      clear(carte);
      carte.appendChild(h('div', { class: 'carte__corps' },
        h('div', { class: 'note' }, icon('warn', 14),
          h('span', {}, t('boStructureEchec', String(err?.message || err))))));
      return;
    }

    clear(carte);
    carte.appendChild(h('div', { class: 'carte__tete' },
      icon('list', 14), h('span', {}, t('boNbContenus', contenus.length))));

    if (!contenus.length) {
      carte.appendChild(h('div', { class: 'vide' },
        icon('list', 30), h('p', {}, t('boContenusVideLong'))));
      return;
    }

    carte.appendChild(h('table', { class: 'table' },
      h('thead', {}, h('tr', {},
        h('th', {}, t('boColTitre')),
        h('th', {}, t('boColFichier')),
        h('th', { style: { textAlign: 'right' } }, t('boColActions')),
      )),
      h('tbody', {}, contenus.map((c) => h('tr', {},
        h('td', { class: 'table__nom' },
          h('button', { type: 'button', onclick: () => onEcrire(c) }, c.titre || t('boSansTitre'))),
        h('td', { class: 'table__meta' }, c.chemin || '—'),
        h('td', { class: 'table__actions' },
          h('button', { class: 'b b--sm', type: 'button', onclick: () => onEcrire(c) },
            icon('pencil', 13), t('boEcrire')),
        ),
      ))),
    ));

    /** Le titre décide du nom du fichier : on le demande avant de créer. */
    function demanderTitre(type, sousType) {
      const saisie = h('input', { class: 'saisie', type: 'text', placeholder: t('contenuTitreAide') });
      const erreur = h('p', { class: 'erreur' });

      const bouton = h('button', { class: 'b b--fort', type: 'button' },
        icon('plus', 13), t('contenuCreer'));

      const valider = async () => {
        const titre = saisie.value.trim();
        if (!titre) { erreur.textContent = t('boTitreManquant'); saisie.focus(); return; }
        // La fenêtre ne se ferme qu'une fois la page créée. Fermer d'abord,
        // c'est laisser quelqu'un devant un écran inchangé quand le nom est
        // déjà pris ou que l'hébergement refuse.
        erreur.textContent = '';
        bouton.disabled = true;
        saisie.disabled = true;
        bouton.replaceChildren(icon('upload', 13), document.createTextNode(t('boCreationEnCours')));
        try {
          await onCreer(type, sousType, titre);
          voile.remove();
        } catch (err) {
          erreur.textContent = String(err?.message || err);
          bouton.disabled = false;
          saisie.disabled = false;
          bouton.replaceChildren(icon('plus', 13), document.createTextNode(t('contenuCreer')));
          saisie.focus();
        }
      };
      bouton.addEventListener('click', valider);

      const voile = h('div', {
        class: 'voile', onclick: (e) => { if (e.target === voile) voile.remove(); },
      }, h('div', { class: 'voile__boite', style: { width: 'min(460px, 100%)' } },
        h('div', { class: 'carte__tete' },
          icon(sousType.icone || 'text', 14),
          h('span', {}, sousType.nom),
          h('button', { class: 'b b--sm b--nu b--icone', type: 'button', onclick: () => voile.remove() },
            icon('close', 13)),
        ),
        h('div', { class: 'carte__corps' },
          h('label', { class: 'champ' },
            h('span', { class: 'champ__nom' }, t('contenuTitre')),
            saisie),
          erreur,
          h('p', { class: 'table__meta' }, t('boCreationAide')),
          h('div', { class: 'row', style: { display: 'flex', gap: '8px', marginTop: '14px' } },
            bouton,
            h('button', { class: 'b', type: 'button', onclick: () => voile.remove() }, t('cancel')),
          ),
        ),
      ));

      saisie.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); valider(); }
      });
      document.body.appendChild(voile);
      saisie.focus();
    }
  };
}

/** Vide la vue et la renvoie : redessiner un écran sur lui-même. */
function videEt(page) { clear(page); return page; }
