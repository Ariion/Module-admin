/**
 * Paramètres : ce que le site sait faire, et donc ce qu'on voit à gauche.
 *
 * Deux niveaux, dans cet ordre. Le GENRE d'abord — « je vends des
 * produits », « je publie des articles » — parce que c'est la question
 * qu'on sait se poser quand on n'a jamais fait de site. Les RUBRIQUES
 * ensuite, une par une, pour qui veut reprendre la main.
 *
 * Le genre allume, il ne verrouille pas : rien de ce qui a été allumé à la
 * main ne s'éteint parce qu'on a coché un genre de plus. Un raccourci qui
 * enferme est pire que pas de raccourci.
 * @module ui/back/reglages-back
 */
import { h, icon } from '../el.js';
import { teteEcran } from './shell-back.js';
import { GENRES, RUBRIQUES, SOCLE, appliquerGenres, rubriquesActives } from '../../core/rubriques.js';

/**
 * @param {object} options
 * @param {Function} options.t
 * @param {Function} options.reglages renvoie les réglages du site (asynchrone)
 * @param {Function} options.enregistrer reçoit ({ genres, rubriques })
 * @param {Function} options.aDesTypes le développeur a-t-il déclaré des contenus
 */
export function creerReglagesBack({ t, reglages, enregistrer, aDesTypes }) {
  return async function dessiner(page) {
    page.appendChild(teteEcran(t('boReglages'), t('boReglagesAide')));

    const chargement = h('div', { class: 'charge' }, t('boChargement'));
    page.appendChild(chargement);
    const courants = await reglages();
    chargement.remove();

    const genres = new Set(Array.isArray(courants?.genres) ? courants.genres : []);
    let actives = new Set(rubriquesActives(courants));
    const etat = h('span', { class: 'table__meta' });

    async function sauver() {
      etat.textContent = t('boEnregistrement');
      try {
        await enregistrer({ genres: [...genres], rubriques: [...actives] });
        etat.textContent = t('boEnregistre');
      } catch (err) {
        etat.textContent = String(err?.message || err);
      }
    }

    // --- Le genre de site --------------------------------------------
    const grilleGenres = h('div', { class: 'genres' });
    for (const genre of GENRES) {
      const coche = h('input', {
        type: 'checkbox', checked: genres.has(genre.id),
        onchange: async (e) => {
          if (e.target.checked) genres.add(genre.id); else genres.delete(genre.id);
          // Cocher allume ; décocher ne retire rien de ce qui est en place.
          // Pour éteindre une rubrique, on la décoche plus bas, en la voyant.
          actives = new Set(appliquerGenres({ ...courants, rubriques: [...actives] }, [...genres]));
          await sauver();
          majRubriques();
        },
      });
      grilleGenres.appendChild(h('label', { class: 'genre' + (genres.has(genre.id) ? ' genre--on' : '') },
        coche,
        h('span', { class: 'genre__main' },
          h('span', { class: 'genre__nom' }, t('genre_' + genre.id)),
          h('span', { class: 'genre__aide' }, t('genreAide_' + genre.id)),
        ),
      ));
    }

    page.appendChild(h('div', { class: 'carte', style: { marginBottom: '20px' } },
      h('div', { class: 'carte__tete' }, icon('grid', 14), h('span', {}, t('boGenreTitre')), etat),
      h('div', { class: 'carte__corps' },
        h('p', { class: 'table__meta', style: { marginBottom: '14px' } }, t('boGenreAide')),
        grilleGenres,
      ),
    ));

    // --- Les rubriques, une par une ------------------------------------
    const listeRubriques = h('div', {});
    page.appendChild(h('div', { class: 'carte' },
      h('div', { class: 'carte__tete' }, icon('layers', 14), h('span', {}, t('boRubriquesTitre'))),
      h('div', { class: 'carte__corps' },
        h('p', { class: 'table__meta', style: { marginBottom: '14px' } }, t('boRubriquesAide')),
        listeRubriques,
      ),
    ));

    function majRubriques() {
      listeRubriques.replaceChildren();
      for (const r of RUBRIQUES) {
        const fixe = SOCLE.includes(r.id);
        // Une rubrique qui ne peut rien montrer se coche quand même : c'est
        // en l'ouvrant qu'on apprend ce qu'il manque, et à qui le demander.
        const manque = r.besoin === 'types' && !aDesTypes();

        const coche = h('input', {
          type: 'checkbox', checked: actives.has(r.id) || fixe, disabled: fixe,
          onchange: async (e) => {
            if (e.target.checked) actives.add(r.id); else actives.delete(r.id);
            await sauver();
          },
        });

        listeRubriques.appendChild(h('label', { class: 'rubrique' },
          coche,
          h('span', { class: 'rubrique__icone' }, icon(r.icone, 15)),
          h('span', { class: 'rubrique__main' },
            h('span', { class: 'rubrique__nom' }, t('rub_' + r.id),
              r.aVenir ? h('span', { class: 'etat etat--neutre', style: { marginLeft: '8px' } },
                t('boRubriqueAVenir')) : null),
            h('span', { class: 'rubrique__aide' },
              fixe ? t('boRubriqueToujours')
                : manque ? t('boRubriqueSansType')
                  : t('rubAide_' + r.id)),
          ),
        ));
      }
    }

    majRubriques();
  };
}

/**
 * La question posée au premier passage, sur le tableau de bord.
 *
 * Elle n'est pas un formulaire de plus : tant qu'on n'y a pas répondu, le
 * menu ne montre que le socle, et le client ne sait pas ce que son site
 * pourrait faire. C'est donc le premier geste, et il tient en trois clics.
 */
export function carteGenre({ t, onChoisir }) {
  const genres = new Set();

  const valider = h('button', {
    class: 'b', type: 'button', disabled: true,
    onclick: () => onChoisir([...genres]),
  }, icon('check', 14), t('boGenreValider'));

  const cases = h('div', { class: 'genres genres--clair' }, GENRES.map((genre) => {
    const coche = h('input', {
      type: 'checkbox',
      onchange: (e) => {
        if (e.target.checked) genres.add(genre.id); else genres.delete(genre.id);
        valider.disabled = genres.size === 0;
      },
    });
    return h('label', { class: 'genre' }, coche,
      h('span', { class: 'genre__main' },
        h('span', { class: 'genre__nom' }, t('genre_' + genre.id)),
        h('span', { class: 'genre__aide' }, t('genreAide_' + genre.id)),
      ));
  }));

  return h('div', { class: 'depart' },
    h('h2', {}, t('boGenreDepartTitre')),
    h('p', {}, t('boGenreDepartAide')),
    cases,
    h('div', { style: { marginTop: '14px' } }, valider),
  );
}
