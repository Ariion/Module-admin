/**
 * La boîte de réception : ce que les visiteurs ont envoyé.
 *
 * Le module n'envoie pas de courriel, et c'est un choix : un courriel demande
 * un serveur d'envoi, une réputation d'expéditeur, un domaine authentifié, et
 * il finit dans les indésirables le jour où l'un des trois bouge. Le message
 * se lit donc là où il est arrivé — dans la base du site.
 *
 * L'écran ne sait faire que quatre choses, et c'est assez : lister, lire,
 * marquer lu, supprimer. Répondre se fait depuis son courrielleur, par le
 * lien posé sur l'adresse du visiteur.
 *
 * Rien n'est jamais rendu en HTML : tout ce qui s'affiche ici a été écrit par
 * un inconnu non authentifié. On ne pose que du texte, jamais de balise.
 * @module ui/back/messages
 */
import { h, icon, clear } from '../el.js';
import { teteEcran, listeVide } from './shell-back.js';
import { CHAMPS } from '../../core/formulaire.js';
import { safeUrl } from '../../core/sanitize.js';

/**
 * @param {object} options
 * @param {Function} options.t
 * @param {Function} options.lister renvoie les messages (asynchrone)
 * @param {Function} options.onLu reçoit (message, lu)
 * @param {Function} options.onSupprimer reçoit un message
 */
export function creerMessages({ t, lister, onLu, onSupprimer, lang = 'fr' }) {
  return async function dessiner(page, cible = null) {
    page.appendChild(teteEcran(t('boMessages'), t('boMessagesAide')));

    const carte = h('div', { class: 'carte' });
    page.appendChild(carte);
    carte.appendChild(h('div', { class: 'charge' }, t('boChargement')));

    let messages = [];
    try {
      messages = await lister();
    } catch (err) {
      // Une boîte qu'on n'a pas pu lire n'est pas une boîte vide : le dire,
      // plutôt que de laisser croire que personne n'a écrit.
      clear(carte);
      carte.appendChild(h('div', { class: 'carte__corps' },
        h('div', { class: 'note' }, icon('warn', 14),
          h('span', {}, t('boMessagesEchec', String(err?.message || err))))));
      return;
    }

    clear(carte);
    const nonLus = messages.filter((m) => !m.lu).length;
    carte.appendChild(h('div', { class: 'carte__tete' },
      icon('mail', 14),
      h('span', {}, t('boNbMessages', messages.length)),
      nonLus ? h('span', { class: 'etat etat--brouillon', style: { marginLeft: 'auto' } },
        t('boNbNonLus', nonLus)) : null,
    ));

    if (!messages.length) {
      carte.appendChild(listeVide('mail', t('boMessagesVideLong')));
      return;
    }

    carte.appendChild(h('table', { class: 'table' },
      h('thead', {}, h('tr', {},
        h('th', {}, t('boColDe')),
        h('th', {}, t('boColMessage')),
        h('th', {}, t('boColRecu')),
        h('th', { style: { textAlign: 'right' } }, t('boColActions')),
      )),
      h('tbody', {}, messages.map((m) => ligne(m, m.id === cible))),
    ));

    function ligne(m, visee) {
      return h('tr', visee ? { style: { background: 'var(--accent-pale)' } } : {},
        h('td', { class: 'table__nom' },
          h('button', { type: 'button', onclick: () => ouvrir(m) },
            // Sans nom ni adresse, il reste le message : une ligne sans rien
            // d'affiché serait introuvable.
            m.nom || m.courriel || t('boSansTitre')),
          h('div', { class: 'table__meta' },
            [m.courriel, m.telephone, m.liste].filter(Boolean).join(' · ') || m.page || '—'),
        ),
        h('td', { class: 'table__meta', style: { maxWidth: '38ch' } }, extrait(m)),
        h('td', {}, h('div', {}, quand(m.envoye)),
          m.lu
            ? h('span', { class: 'etat etat--neutre' }, t('boMessageLu'))
            : h('span', { class: 'etat etat--brouillon' }, icon('warn', 11), t('boMessageNonLu'))),
        h('td', { class: 'table__actions' },
          h('button', { class: 'b b--sm', type: 'button', onclick: () => ouvrir(m) },
            icon('eye', 13), t('boMessageOuvrir')),
          h('button', {
            class: 'b b--sm', type: 'button',
            onclick: async () => { await onLu(m, !m.lu); redessiner(m.id); },
          }, icon('check', 13), m.lu ? t('boMessageMarquerNonLu') : t('boMessageMarquerLu')),
          h('button', {
            class: 'b b--sm b--danger b--icone', type: 'button',
            title: t('boMessageSupprimer'), 'aria-label': t('boMessageSupprimer'),
            onclick: () => confirmerSuppression(m),
          }, icon('trash', 13)),
        ),
      );
    }

    /** Recharge la liste en gardant la ligne sur laquelle on travaillait. */
    function redessiner(id) {
      clear(page);
      dessiner(page, id);
    }

    function extrait(m) {
      const brut = String(m.message || '').replace(/\s+/g, ' ').trim();
      if (!brut) return '—';
      return brut.length > 110 ? brut.slice(0, 110) + '…' : brut;
    }

    function quand(horodatage) {
      if (!horodatage) return '—';
      return new Date(Number(horodatage)).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
        dateStyle: 'medium', timeStyle: 'short',
      });
    }

    /**
     * Le message en entier.
     *
     * L'ouvrir le marque lu : c'est le geste, et demander en plus de cocher
     * une case ne renseignerait personne. On peut toujours le remettre en non
     * lu depuis la liste, pour le garder en vue.
     */
    function ouvrir(m) {
      if (!m.lu) onLu(m, true).catch(() => { /* la lecture vaut plus que la pastille */ });

      const corps = h('div', { class: 'carte__corps' });
      for (const champ of CHAMPS) {
        const valeur = String(m[champ.id] ?? '').trim();
        if (!valeur) continue;
        corps.appendChild(h('div', { class: 'champ' },
          h('span', { class: 'champ__nom' }, t('msg_' + champ.id)),
          // La seule action utile depuis ici : répondre. On pose un lien
          // plutôt qu'un bouton, pour que le courrielleur s'ouvre comme
          // partout ailleurs — et on le fait passer par l'assainisseur, parce
          // que cette adresse a été tapée par un inconnu.
          champ.id === 'courriel' && safeUrl('mailto:' + valeur)
            ? h('a', { href: safeUrl('mailto:' + valeur) }, valeur)
            : h('div', { style: { whiteSpace: 'pre-wrap' } }, valeur),
        ));
      }
      corps.appendChild(h('p', { class: 'table__meta' },
        t('msg_page') + ' : ' + (m.page || '—') + ' · ' + t('msg_recu') + ' : ' + quand(m.envoye)));

      const voile = h('div', {
        class: 'voile', onclick: (e) => { if (e.target === voile) fermer(); },
      }, h('div', { class: 'voile__boite', style: { width: 'min(560px, 100%)' } },
        h('div', { class: 'carte__tete' }, icon('mail', 14),
          h('span', {}, m.nom || m.courriel || t('boSansTitre')),
          h('button', {
            class: 'b b--sm b--nu b--icone', type: 'button', onclick: () => fermer(),
          }, icon('close', 13))),
        corps,
      ));
      const fermer = () => { voile.remove(); redessiner(m.id); };
      document.body.appendChild(voile);
    }

    /**
     * Supprimer un message efface une demande de quelqu'un : on demande
     * confirmation. Pas de nom à recopier, en revanche — ce n'est pas un
     * fichier du site, et la liste en compte souvent trente.
     */
    function confirmerSuppression(m) {
      const erreur = h('p', { class: 'erreur' });
      const bouton = h('button', { class: 'b b--danger', type: 'button' },
        icon('trash', 13), t('boMessageSupprimer'));

      bouton.addEventListener('click', async () => {
        bouton.disabled = true;
        try { await onSupprimer(m); voile.remove(); redessiner(null); }
        catch (err) { erreur.textContent = String(err?.message || err); bouton.disabled = false; }
      });

      const voile = h('div', {
        class: 'voile', onclick: (e) => { if (e.target === voile) voile.remove(); },
      }, h('div', { class: 'voile__boite', style: { width: 'min(460px, 100%)' } },
        h('div', { class: 'carte__tete' }, icon('warn', 14),
          h('span', {}, t('boMessageSupprimer')),
          h('button', {
            class: 'b b--sm b--nu b--icone', type: 'button', onclick: () => voile.remove(),
          }, icon('close', 13))),
        h('div', { class: 'carte__corps' },
          h('p', {}, t('boMessageSupprimerAvertissement', m.nom || m.courriel || '')),
          erreur,
          h('div', { style: { display: 'flex', gap: '8px', marginTop: '14px' } },
            bouton,
            h('button', { class: 'b', type: 'button', onclick: () => voile.remove() }, t('cancel')),
          ),
        ),
      ));
      document.body.appendChild(voile);
    }
  };
}
