/**
 * Le rédacteur : d'un brief à une page entière, écrite.
 *
 * Sans clé d'API, sans serveur, sans réseau. C'est le mode par défaut, et il
 * doit rester bon tout seul : la plupart des acquéreurs n'auront jamais de
 * clé, et un module qui ne sert à rien sans elle ne vaut pas d'être vendu.
 *
 * Ce n'est pas de la génération de texte : c'est un assemblage. Les phrases
 * sont écrites d'avance, par métier, et le brief y insère les mots du client.
 * Le module ne prétend donc jamais avoir « compris » l'activité — mais le
 * résultat est une page complète, cohérente et lisible, que le client n'a
 * plus qu'à relire.
 *
 * Chaque texte produit porte sa provenance : `exemple: true` quand la phrase
 * vient de nous, `exemple: false` quand elle vient de ses mots. Le guide s'en
 * sert pour dire exactement ce qu'il reste à relire.
 *
 * @module core/redacteur
 */
import { w, section } from './templates.js';
import {
  metierById, prestationsDuBrief, phrasesDesAtouts, motsClesPhotos, briefUtilisable,
} from './brief.js';

/** Rythme des sections selon le ton retenu. */
const TONS = {
  sobre: { heroPadding: 72, titrage: 'h2' },
  chaleureux: { heroPadding: 96, titrage: 'h2' },
  dynamique: { heroPadding: 88, titrage: 'h2' },
};

/**
 * Écrit la page à partir du brief.
 *
 * @param {object} brief
 * @param {object} [options]
 * @param {string[]} [options.images] adresses d'images, dans l'ordre où on les veut
 * @param {object} [options.textes] textes fournis par une IA, qui remplacent les nôtres
 * @returns {{sections: object[], besoinImages: number, requetes: string[]}}
 */
export function redigerPage(brief, { images = [], textes = null } = {}) {
  if (!briefUtilisable(brief)) return { sections: [], besoinImages: 0, requetes: [] };

  const metier = metierById(brief.metier);
  const ton = TONS[brief.ton] || TONS.chaleureux;
  const prestations = fusionnerPrestations(prestationsDuBrief(brief), textes?.prestations);
  const atouts = phrasesDesAtouts(brief);
  const image = (rang) => images[rang] || '';

  // Une phrase écrite par le client vaut toujours mieux que la nôtre.
  const propre = (valeur) => !!String(valeur || '').trim();
  const accroche = textes?.accroche || (propre(brief.phrase) ? brief.phrase : metier.accroche(brief));
  const accrocheEcrite = !!textes?.accroche || propre(brief.phrase);
  const presentation = textes?.presentation || metier.presentation(brief);

  const sections = [];

  // --- 1. L'accroche, en bandeau plein cadre --------------------------
  // Une section ordinaire poserait le titre sur un fond uni. C'est la
  // différence entre une page et un document : ici l'image porte la page et
  // le texte se pose dessus.
  sections.push(w('hero', {
    image: image(0), hauteur: 'grande', voile: 48, align: 'center', texte: 'clair',
  }, [
    ...(brief.ville ? [w('etiquette', { text: brief.ville, align: 'center', exemple: false })] : []),
    w('heading', { text: brief.activite, level: ton.titrage, align: 'center', exemple: false }),
    w('text', { html: echapper(accroche), align: 'center', exemple: !accrocheEcrite }),
    w('spacer', { height: 24 }),
    w('button', {
      text: 'Nous contacter', href: lienContact(brief), align: 'center', exemple: false,
    }),
  ]));

  // --- 2. Ce que vous proposez ---------------------------------------
  sections.push(section([
    w('etiquette', { text: nomMetier(brief), align: 'center', exemple: false }),
    w('heading', { text: titreOffres(brief), level: 'h2', align: 'center', exemple: false }),
    w('spacer', { height: 28 }),
    w('columns', { count: Math.min(3, prestations.length) || 1, gap: 20 },
      prestations.slice(0, 3).map((p, rang) => [
        // Une carte quand on a une image à mettre dessous : le titre se pose
        // sur le visuel au lieu de le suivre. Sinon, titre puis texte.
        ...(images[rang + 1]
          ? [w('carte', {
            image: images[rang + 1], titre: p.titre, sousTitre: '', hauteur: 320, exemple: false,
          })]
          : [w('heading', { text: p.titre, level: 'h3', exemple: !p.propre && !p.titre })]),
        w('text', { html: echapper(p.texte), exemple: !p.propre }),
      ])),
  ], { padding: 88 }));

  // --- 3. Qui vous êtes ----------------------------------------------
  sections.push(section([
    w('columns', { count: 2, gap: 54, ratio: '1-2' }, [
      [w('image', { src: image(4), alt: brief.activite, exemple: false })],
      [
        w('etiquette', { text: 'Notre histoire', exemple: false }),
        w('heading', { text: 'Qui nous sommes', level: 'h2', exemple: false }),
        w('text', { html: echapper(presentation), exemple: !textes?.presentation }),
        ...(atouts.length ? [
          w('spacer', { height: 10 }),
          w('list', { items: atouts.join('\n'), exemple: false }),
        ] : []),
      ],
    ]),
  ]));

  // Plus de section « En images » : les visuels sont désormais DANS les
  // cartes des prestations et dans le bandeau. Une galerie en plus ne faisait
  // que rallonger la page sans rien composer.

  // --- 5. Nous trouver -------------------------------------------------
  sections.push(section([
    w('columns', { count: 2, gap: 44 }, [
      [
        w('heading', { text: 'Nous trouver', level: 'h2', exemple: false }),
        w('text', { html: echapper(blocContact(brief)), exemple: !aDesCoordonnees(brief) }),
        w('spacer', { height: 14 }),
        w('button', { text: boutonContact(brief), href: lienContact(brief), exemple: false }),
      ],
      [w('map', { query: brief.adresse || brief.ville || '', height: 300 })],
    ]),
  ]));

  return {
    sections,
    besoinImages: 5,
    requetes: motsClesPhotos(brief),
  };
}

/**
 * Ce que l'IA a écrit vient remplacer NOS phrases, jamais celles du client.
 *
 * Le titre saisi reste le titre saisi : quelqu'un qui a écrit « Pains au
 * levain » ne veut pas le voir devenir « Nos pains d'exception ». Seule la
 * description de remplissage est remplacée.
 */
function fusionnerPrestations(prestations, proposees) {
  if (!Array.isArray(proposees) || !proposees.length) return prestations;
  return prestations.map((p, i) => {
    const proposee = proposees[i];
    if (!proposee || p.propre) return p;
    return {
      titre: p.titre || proposee.titre,
      texte: proposee.texte,
      propre: true,
    };
  });
}

/**
 * L'étiquette au-dessus du titre de section. La ville est déjà dans le
 * bandeau : la répéter deux écrans plus bas ne dit rien de neuf.
 */
function nomMetier(brief) {
  if (brief.metier === 'boutique') return 'Notre sélection';
  if (brief.metier === 'association') return 'Sur le terrain';
  if (brief.metier === 'hebergement') return 'Le lieu';
  if (brief.metier === 'restaurant' || brief.metier === 'alimentaire') return 'À la carte';
  return 'Nos prestations';
}

/** Titre de la section des prestations, adapté à ce qu'on vend. */
function titreOffres(brief) {
  if (brief.metier === 'boutique') return 'Ce que nous vendons';
  if (brief.metier === 'association') return 'Nos actions';
  if (brief.metier === 'hebergement') return 'Le lieu';
  return 'Ce que nous proposons';
}

function aDesCoordonnees(brief) {
  return !!(brief.telephone || brief.courriel || brief.adresse || brief.horaires);
}

/** Le bloc d'adresse, écrit avec ce qu'on nous a donné — et rien d'autre. */
function blocContact(brief) {
  const lignes = [];
  if (brief.adresse) lignes.push(brief.adresse);
  if (brief.telephone) lignes.push(brief.telephone);
  if (brief.courriel) lignes.push(brief.courriel);
  if (brief.horaires) lignes.push(brief.horaires);
  if (!lignes.length) return 'Adresse, téléphone, horaires d’ouverture.';
  return lignes.join('<br>');
}

function lienContact(brief) {
  if (brief.courriel) return 'mailto:' + brief.courriel;
  if (brief.telephone) return 'tel:' + String(brief.telephone).replace(/[^\d+]/g, '');
  return 'contact.html';
}

function boutonContact(brief) {
  if (brief.telephone && !brief.courriel) return 'Nous appeler';
  return 'Nous écrire';
}

/** Le brief est du texte saisi : il n'entre jamais tel quel dans du HTML. */
function echapper(valeur) {
  return String(valeur ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Le seul balisage admis est celui que nous posons nous-mêmes.
    .replace(/&lt;br&gt;/g, '<br>');
}
