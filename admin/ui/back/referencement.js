/**
 * L'écran qui dit, page par page, ce qui manque.
 *
 * Un audit de référencement ordinaire rend une note sur 100 et une liste de
 * sigles. Ici le client ne code pas : « balise meta description absente » ne
 * lui apprend rien, et 74/100 ne lui dit pas quoi faire. Chaque constat est
 * donc une phrase — « cette page n'a pas de description », « deux titres de
 * niveau 1 » — accompagnée de l'endroit où c'est, et d'un bouton pour y aller.
 *
 * Deux paquets, pas une note : ce qui empêche, et ce qui aiderait. Un chiffre
 * rond ferait travailler pour le chiffre.
 *
 * L'écran doit CHARGER chaque page, comme celui de la structure : une
 * description, un niveau de titre, un contraste ne se lisent nulle part
 * ailleurs que dans la page rendue. On les ouvre donc une par une, hors écran,
 * et on referme derrière soi — le coût est payé à la visite de l'écran, pas à
 * chaque geste.
 * @module ui/back/referencement
 */
import { h, icon, clear } from '../el.js';
import { teteEcran } from './shell-back.js';
import { auditerPage, auditerSite, GRAVITES } from '../../core/audit.js';
import { referencementDe, ficheEtablissement, adressePublique, racineDe } from '../../core/referencement.js';

/** Les langues proposées. Le champ reste libre : une liste ne les tient pas toutes. */
const LANGUES = ['fr', 'en', 'de', 'es', 'it', 'nl', 'pt'];

/**
 * @param {object} options
 * @param {Function} options.t
 * @param {Function} options.lister renvoie les pages connues
 * @param {Function} options.ouvrirPage charge une page, renvoie { pageId, model, fermer }
 * @param {Function} options.enregistrerPage reçoit (pageId, instantané)
 * @param {Function} options.reglages renvoie les réglages du site
 * @param {Function} options.enregistrerReglages reçoit un correctif de réglages
 * @param {Function} options.choisirMedia ouvre la médiathèque, renvoie une URL
 * @param {Function} options.ecrirePlan reçoit ({ adresse, pages }), écrit les fichiers
 * @param {Function} options.peutEcrire l'hébergement sait-il écrire ?
 * @param {Function} options.onAller ouvre l'éditeur en direct sur un constat
 */
export function creerReferencement({
  t, lister, ouvrirPage, enregistrerPage, reglages, enregistrerReglages,
  choisirMedia, ecrirePlan, peutEcrire, onAller,
}) {
  return async function dessiner(page) {
    let annule = false;
    let sessionOuverte = null;

    const etat = h('span', { class: 'table__meta' });
    page.appendChild(teteEcran(
      t('boReferencement'),
      t('boReferencementAide'),
      etat,
      h('button', { class: 'b', type: 'button', onclick: () => { clear(page); dessiner(page); } },
        icon('history', 14), t('boAuditRefaire')),
    ));

    const carteSite = h('div', { class: 'carte' });
    const cartesPages = h('div', {});
    page.append(carteSite, cartesPages);

    const reglagesSite = (await reglages()) || {};
    const pages = await lister().catch(() => []);
    dessinerSite(reglagesSite, pages);

    etat.textContent = t('boAuditEnCours', 0, pages.length);
    for (const [index, cible] of pages.entries()) {
      if (annule) break;
      etat.textContent = t('boAuditEnCours', index + 1, pages.length);
      cartesPages.appendChild(await auditer(cible, reglagesSite));
    }
    etat.textContent = '';

    // L'écran a pu être quitté pendant l'analyse : le châssis appelle ceci
    // avant de vider sa vue, et une iframe laissée derrière continuerait de
    // charger des images pour personne.
    return () => { annule = true; sessionOuverte?.fermer(); };

    // ------------------------------------------------------------ le site
    function dessinerSite(reglagesCourants, liste) {
      clear(carteSite);
      const reglage = referencementDe(reglagesCourants);
      const bilan = auditerSite({ reglages: reglagesCourants, pages: liste });

      carteSite.appendChild(h('div', { class: 'carte__tete' },
        icon('search', 14), h('span', {}, t('boAuditSite')),
        ...pastilles(bilan),
      ));

      const corps = h('div', { class: 'carte__corps' });
      carteSite.appendChild(corps);
      if (bilan.constats.length) corps.appendChild(listeConstats(bilan.constats, null));
      else corps.appendChild(h('p', { class: 'table__meta' }, icon('check', 13), ' ', t('boAuditRienSite')));

      const message = h('p', { class: 'table__meta' });
      const adresse = h('input', {
        class: 'saisie', type: 'text', value: reglage.adresse, placeholder: 'exemple.fr',
      });
      const langue = h('input', {
        class: 'saisie', type: 'text', value: reglage.langue, placeholder: 'fr',
        list: 'admin-langues', maxLength: 12,
      });
      const plan = h('input', { type: 'checkbox', checked: reglage.plan !== false });

      corps.append(
        champ(t('boSeoAdresse'), t('boSeoAdresseAide'), adresse),
        champ(t('boSeoLangue'), t('boSeoLangueAide'), langue),
        h('datalist', { id: 'admin-langues' }, LANGUES.map((l) => h('option', { value: l }))),
        h('label', { class: 'champ', style: { display: 'flex', gap: '9px', alignItems: 'flex-start' } },
          plan,
          h('span', {},
            h('span', { class: 'champ__nom' }, t('boSeoPlan')),
            h('span', { class: 'table__meta' }, t('boSeoPlanAide')),
          ),
        ),
        h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } },
          h('button', {
            class: 'b b--fort', type: 'button',
            onclick: async (e) => {
              e.target.disabled = true;
              await enregistrerReglages({
                referencement: {
                  ...reglage,
                  adresse: adresse.value.trim(),
                  langue: langue.value.trim(),
                  plan: plan.checked,
                },
              });
              message.textContent = t('boSeoEnregistre');
              e.target.disabled = false;
            },
          }, icon('check', 13), t('boSeoEnregistrer')),
          boutonPlan(reglage, liste, message),
          message,
        ),
        fiche(reglagesCourants),
        apercuPlan(reglage, liste),
      );
    }

    /**
     * Le bouton qui dépose les deux fichiers tout de suite.
     *
     * Ils partent aussi à chaque publication, et c'est le chemin normal. Ce
     * bouton sert au client qui vient de renseigner son adresse : sans lui, il
     * faudrait republier une page pour voir le plan apparaître, ce qui n'a
     * aucun rapport avec ce qu'il vient de faire.
     */
    function boutonPlan(reglage, liste, message) {
      if (!peutEcrire()) {
        message.textContent = t('boSeoPlanSansHote');
        return null;
      }
      return h('button', {
        class: 'b', type: 'button',
        onclick: async (e) => {
          const adresse = racineDe(reglage.adresse);
          if (!adresse) { message.textContent = t('boSeoPlanSansAdresse'); return; }
          e.target.disabled = true;
          try {
            const bilan = await ecrirePlan({ adresse, pages: liste });
            message.textContent = t('boSeoPlanEcrit', bilan?.pages ?? liste.length);
          } catch (err) {
            message.textContent = String(err?.message || err);
          } finally {
            e.target.disabled = false;
          }
        },
      }, icon('upload', 13), t('boSeoPlanEcrire'));
    }

    /** Ce que le plan listera, en clair : une liste d'adresses se vérifie à l'œil. */
    function apercuPlan(reglage, liste) {
      const racine = racineDe(reglage.adresse);
      if (!racine || reglage.plan === false) return null;
      const adresses = liste.map((p) => adressePublique(racine, p.chemin));
      if (!adresses.length) return null;
      return h('div', { style: { marginTop: '14px' } },
        h('span', { class: 'champ__nom' }, t('boSeoPlanApercu')),
        h('div', { class: 'table__meta' }, adresses.map((a) => h('div', {}, a))),
      );
    }

    /** La fiche d'établissement telle qu'elle partira, ou ce qui lui manque. */
    function fiche(reglagesCourants) {
      const donnees = ficheEtablissement(reglagesCourants);
      return h('div', { style: { marginTop: '16px' } },
        h('span', { class: 'champ__nom' }, t('boSeoFiche')),
        h('p', { class: 'table__meta' }, t('boSeoFicheAide')),
        donnees
          ? h('div', { class: 'table__meta', style: { whiteSpace: 'pre-wrap' } },
            resumeFiche(donnees))
          : h('div', { class: 'note' }, icon('warn', 14), h('span', {}, t('boSeoFicheAbsente'))),
      );
    }

    // ------------------------------------------------------------ une page
    /**
     * Charge une page, l'audite, referme, et rend sa carte.
     *
     * On ne garde pas la session ouverte : douze iframes vivantes, c'est douze
     * fois les images du site en mémoire. Les valeurs relevées suffisent à
     * remplir les champs, et la sauvegarde rouvrira la page — un chargement
     * au moment où l'on corrige, plutôt que douze en permanence.
     */
    async function auditer(cible, reglagesCourants) {
      const carte = h('div', { class: 'carte', style: { marginTop: '14px' } });
      let session = null;
      try {
        session = await ouvrirPage(cible);
        sessionOuverte = session;
        const bilan = auditerPage({ model: session.model, chemin: cible.chemin, nom: cible.nom });
        const meta = session.model.pageMetaCourant();
        dessinerPage(carte, cible, bilan, meta, reglagesCourants);
      } catch (err) {
        carte.appendChild(h('div', { class: 'carte__tete' }, icon('pages', 14), h('span', {}, cible.nom)));
        carte.appendChild(h('div', { class: 'carte__corps' },
          h('div', { class: 'note' }, icon('warn', 14),
            h('span', {}, t('boAuditEchec', String(err?.message || err))))));
      } finally {
        session?.fermer();
        sessionOuverte = null;
      }
      return carte;
    }

    function dessinerPage(carte, cible, bilan, meta, reglagesCourants) {
      clear(carte);
      carte.appendChild(h('div', { class: 'carte__tete' },
        icon('pages', 14),
        h('span', {}, cible.nom),
        h('span', { class: 'table__meta' }, cible.chemin),
        ...pastilles(bilan),
        h('button', {
          class: 'b b--sm', type: 'button', style: { marginLeft: 'auto' },
          onclick: () => ouvrirReglagesPage(cible, meta, carte, bilan, reglagesCourants),
        }, icon('sliders', 13), t('boSeoPage')),
      ));

      const corps = h('div', { class: 'carte__corps' });
      carte.appendChild(corps);
      if (!bilan.constats.length) {
        corps.appendChild(h('p', { class: 'table__meta' }, icon('check', 13), ' ', t('boAuditRien')));
        return;
      }
      corps.appendChild(listeConstats(bilan.constats, cible));
    }

    /**
     * Les champs d'une page, dans une fenêtre.
     *
     * Le titre et la description ne sont pas dans le corps de la carte, et ce
     * n'est pas une coquetterie : à dix pages, dix formulaires dépliés font un
     * écran où l'on ne voit plus les constats — c'est-à-dire la raison d'être
     * de l'écran.
     */
    function ouvrirReglagesPage(cible, meta, carte, bilan, reglagesCourants) {
      const titre = h('input', { class: 'saisie', type: 'text', value: meta.titre || '' });
      const description = h('textarea', { class: 'saisie', rows: 3 }, meta.description || '');
      const partage = h('input', {
        class: 'saisie', type: 'text', value: meta.partage || '', placeholder: 'https://…',
      });
      const canonique = h('input', {
        class: 'saisie', type: 'text', value: meta.canonique || '', placeholder: 'https://…',
      });
      const message = h('p', { class: 'table__meta' });

      const valider = h('button', { class: 'b b--fort', type: 'button' },
        icon('check', 13), t('boSeoEnregistrer'));
      valider.addEventListener('click', async () => {
        valider.disabled = true;
        message.textContent = t('boSeoEnregistrer') + '…';
        let session = null;
        try {
          session = await ouvrirPage(cible);
          session.model.setPageMeta({
            titre: titre.value.trim(),
            description: description.value.trim(),
            partage: partage.value.trim(),
            canonique: canonique.value.trim(),
          });
          await enregistrerPage(session.pageId, session.model.toSnapshot({ portee: 'page' }));
          const suivant = session.model.pageMetaCourant();
          const refait = auditerPage({ model: session.model, chemin: cible.chemin, nom: cible.nom });
          voile.remove();
          dessinerPage(carte, cible, refait, suivant, reglagesCourants);
        } catch (err) {
          message.textContent = String(err?.message || err);
          valider.disabled = false;
        } finally {
          session?.fermer();
        }
      });

      const voile = h('div', {
        class: 'voile', onclick: (e) => { if (e.target === voile) voile.remove(); },
      }, h('div', { class: 'voile__boite', style: { width: 'min(620px, 100%)' } },
        h('div', { class: 'carte__tete' }, icon('sliders', 14), h('span', {}, cible.nom),
          h('button', {
            class: 'b b--sm b--nu b--icone', type: 'button', onclick: () => voile.remove(),
          }, icon('close', 13))),
        h('div', { class: 'carte__corps', style: { maxHeight: '64vh', overflow: 'auto' } },
          champ(t('boSeoTitre'), t('boSeoTitreAide'), titre),
          champ(t('boSeoDescription'), t('boSeoDescriptionAide'), description),
          champ(t('boSeoPartage'), t('boSeoPartageAide'), partage,
            h('div', { style: { display: 'flex', gap: '8px', marginTop: '7px', flexWrap: 'wrap' } },
              h('button', {
                class: 'b b--sm', type: 'button',
                onclick: async () => {
                  const url = await choisirMedia();
                  if (url) partage.value = url;
                },
              }, icon('image', 13), t('boSeoChoisirImage')),
              h('button', {
                class: 'b b--sm b--nu', type: 'button', onclick: () => { partage.value = ''; },
              }, icon('close', 13), t('boSeoRetirerImage')),
            )),
          champ(t('boSeoCanonique'), t('boSeoCanoniqueAide'), canonique),
          message,
          h('div', { style: { display: 'flex', gap: '8px', marginTop: '6px' } },
            valider,
            h('button', { class: 'b', type: 'button', onclick: () => voile.remove() }, t('cancel')),
          ),
        ),
      ));
      document.body.appendChild(voile);
      titre.focus();
    }

    // ------------------------------------------------------------ constats
    /** Les constats, en deux paquets : ce qui empêche, puis ce qui aiderait. */
    function listeConstats(constats, cible) {
      const bloc = h('div', {});
      for (const gravite of GRAVITES) {
        const lot = constats.filter((c) => c.gravite === gravite);
        if (!lot.length) continue;
        bloc.append(
          h('div', { class: 'champ__nom', style: { marginTop: '12px' } },
            t('boAuditGravite_' + gravite),
            h('span', { class: 'table__meta', style: { fontWeight: '400', marginLeft: '8px' } },
              t('boAuditGraviteAide_' + gravite)),
          ),
          h('div', { class: 'pile' }, lot.map((c) => ligneConstat(c, cible))),
        );
      }
      return bloc;
    }

    function ligneConstat(constat, cible) {
      const lieux = [
        constat.ou ? t('boAuditOu', constat.ou) : '',
        constat.zone ? t('boAuditZone_' + constat.zone) : '',
      ].filter(Boolean).join(' — ');

      return h('div', { class: 'rang' },
        h('span', { class: 'etat ' + (constat.gravite === 'bloquant' ? 'etat--brouillon' : 'etat--neutre') },
          t('boAuditFamille_' + constat.famille)),
        h('div', { class: 'rang__main' },
          h('div', {}, t(constat.cle, ...constat.args)),
          lieux ? h('div', { class: 'table__meta' }, lieux) : null,
        ),
        // « S'y rendre » n'a de sens que pour un constat posé sur un élément :
        // une description absente ne se montre pas du doigt dans la page.
        constat.ancre && cible
          ? h('button', {
            class: 'b b--sm', type: 'button',
            onclick: () => onAller(cible.chemin, constat.ancre),
          }, icon('eye', 13), t('boAuditAller'))
          : null,
      );
    }

    function pastilles(bilan) {
      return [
        bilan.bloquants
          ? h('span', { class: 'etat etat--brouillon' }, icon('warn', 11), t('boAuditBloquants', bilan.bloquants))
          : null,
        bilan.souhaitables
          ? h('span', { class: 'etat etat--neutre' }, t('boAuditSouhaitables', bilan.souhaitables))
          : null,
        !bilan.bloquants && !bilan.souhaitables
          ? h('span', { class: 'etat etat--publie' }, icon('check', 11), t('boAuditRien'))
          : null,
      ].filter(Boolean);
    }
  };
}

/** Un champ étiqueté, avec sa phrase d'aide. */
function champ(nom, aide, saisie, ...suite) {
  return h('label', { class: 'champ' },
    h('span', { class: 'champ__nom' }, nom),
    aide ? h('span', { class: 'table__meta', style: { display: 'block', marginBottom: '5px' } }, aide) : null,
    saisie,
    ...suite,
  );
}

/**
 * La fiche, telle qu'un client peut la relire.
 *
 * Pas du JSON : ce n'est pas à lui de vérifier des accolades. Il doit pouvoir
 * constater que son adresse est la bonne, et rien de plus.
 */
function resumeFiche(fiche) {
  const adresse = fiche.address || {};
  return [
    fiche.name,
    fiche.telephone,
    fiche.email,
    [adresse.streetAddress, adresse.postalCode, adresse.addressLocality].filter(Boolean).join(' '),
    fiche.url,
  ].filter(Boolean).join('\n');
}
