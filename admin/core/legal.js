/**
 * Rédaction des pages légales : mentions légales, politique de
 * confidentialité, conditions générales de vente.
 *
 * Le principe : on ne livre pas un texte à trous. Le client répond à des
 * questions — ce qu'il collecte, ce qu'il vend, qui l'héberge — et chaque
 * réponse décide des clauses qui apparaissent et de ce qui les remplit. Une
 * chambre d'hôtes n'a pas de droit de rétractation à mentionner, un site
 * sans formulaire n'a pas de données à déclarer : ces paragraphes ne sont
 * pas écrits du tout plutôt que laissés vides.
 *
 * Ce n'est pas un conseil juridique, et le panneau le dit. C'est un point de
 * départ sérieux, à relire.
 * @module core/legal
 */
import { w, section } from './templates.js';

const T = (html) => ({ html });

/** Ce qu'on demande sur l'éditeur du site. */
export const CHAMPS_LEGAUX = [
  { key: 'denomination', requis: true, exemple: 'Domaine de Lamartine' },
  { key: 'formeJuridique', exemple: 'SARL, SAS, auto-entrepreneur…' },
  { key: 'capital', exemple: '10 000 €' },
  { key: 'adresse', requis: true, exemple: '1 route de la Forêt, 30130 Pont-Saint-Esprit' },
  { key: 'email', requis: true, exemple: 'contact@exemple.fr' },
  { key: 'telephone', exemple: '04 00 00 00 00' },
  { key: 'siret', exemple: '000 000 000 00000' },
  { key: 'rcs', exemple: 'Nîmes B 000 000 000' },
  { key: 'tva', exemple: 'FR00000000000' },
  { key: 'directeur', exemple: 'Prénom Nom' },
  { key: 'activite', exemple: 'chambres d’hôtes et gîtes' },
];

/**
 * Hébergeurs courants, avec la mention exacte qu'attend la loi. C'est la
 * question sur laquelle tout le monde se trompe, et elle a une réponse.
 */
export const HEBERGEURS = [
  { id: 'ovh', nom: 'OVH SAS', adresse: '2 rue Kellermann, 59100 Roubaix, France — ovhcloud.com' },
  { id: 'o2switch', nom: 'o2switch SAS', adresse: '222-224 boulevard Gustave Flaubert, 63000 Clermont-Ferrand, France — o2switch.fr' },
  { id: 'infomaniak', nom: 'Infomaniak Network SA', adresse: 'Rue Eugène-Marziano 25, 1227 Genève, Suisse — infomaniak.com' },
  { id: 'ionos', nom: '1&1 IONOS SARL', adresse: '7 place de la Gare, 57200 Sarreguemines, France — ionos.fr' },
  { id: 'planethoster', nom: 'PlanetHoster', adresse: '4416 Louis B. Mayer, Laval, QC H7P 0G1, Canada — planethoster.com' },
  { id: 'scaleway', nom: 'Scaleway SAS', adresse: '8 rue de la Ville l’Évêque, 75008 Paris, France — scaleway.com' },
  { id: 'vercel', nom: 'Vercel Inc.', adresse: '440 N Barranca Ave #4133, Covina, CA 91723, États-Unis — vercel.com' },
  { id: 'netlify', nom: 'Netlify Inc.', adresse: '512 2nd Street, Suite 200, San Francisco, CA 94107, États-Unis — netlify.com' },
  { id: 'cloudflare', nom: 'Cloudflare Inc.', adresse: '101 Townsend St., San Francisco, CA 94107, États-Unis — cloudflare.com' },
  { id: 'autre', nom: '', adresse: '' },
];

/**
 * Les cases à cocher. `docs` dit quels documents la réponse influence, ce
 * qui permet de ne montrer que les questions utiles.
 */
export const OPTIONS_LEGALES = [
  { key: 'formulaire', docs: ['mentions', 'confidentialite'] },
  { key: 'reservation', docs: ['confidentialite', 'cgv'] },
  { key: 'newsletter', docs: ['confidentialite'] },
  { key: 'compte', docs: ['confidentialite', 'cgv'] },
  { key: 'paiement', docs: ['confidentialite', 'cgv'] },
  { key: 'livraison', docs: ['cgv'] },
  { key: 'sansRetractation', docs: ['cgv'] },
  { key: 'analytics', docs: ['confidentialite'] },
  { key: 'cookiesTiers', docs: ['confidentialite'] },
  { key: 'mediateur', docs: ['cgv'] },
];

export const DOCUMENTS = [
  { id: 'mentions', fichier: 'mentions-legales.html' },
  { id: 'confidentialite', fichier: 'politique-de-confidentialite.html' },
  { id: 'cgv', fichier: 'conditions-generales-de-vente.html' },
];

/** Valeurs par défaut d'un questionnaire vierge. */
export function donneesVides() {
  const donnees = { hebergeur: 'ovh', hebergeurNom: '', hebergeurAdresse: '', mediateurNom: '', mediateurUrl: '' };
  for (const champ of CHAMPS_LEGAUX) donnees[champ.key] = '';
  const options = {};
  for (const option of OPTIONS_LEGALES) options[option.key] = false;
  return { donnees, options };
}

// ------------------------------------------------------------------ rendu
const vide = (valeur) => !String(valeur ?? '').trim();

/** Une ligne « Étiquette : valeur », omise si la valeur manque. */
function ligne(etiquette, valeur) {
  return vide(valeur) ? '' : `<strong>${etiquette} :</strong> ${valeur}<br>`;
}

function hebergeurDe(d) {
  const connu = HEBERGEURS.find((h) => h.id === d.hebergeur);
  if (connu && connu.id !== 'autre') return connu;
  return { nom: d.hebergeurNom || '—', adresse: d.hebergeurAdresse || '' };
}

function identite(d) {
  const forme = [d.formeJuridique, vide(d.capital) ? '' : `au capital de ${d.capital}`]
    .filter(Boolean).join(' ');
  return [
    ligne('Raison sociale', d.denomination),
    ligne('Forme juridique', forme),
    ligne('Adresse', d.adresse),
    ligne('Courriel', d.email),
    ligne('Téléphone', d.telephone),
    ligne('SIRET', d.siret),
    ligne('RCS', d.rcs),
    ligne('N° de TVA intracommunautaire', d.tva),
  ].join('');
}

/** Les données personnelles réellement collectées, d'après les cases cochées. */
function donneesCollectees(o) {
  const lignes = [];
  if (o.formulaire) lignes.push('<strong>Formulaire de contact</strong> — nom, adresse électronique, message. Pour répondre à votre demande.');
  if (o.reservation) lignes.push('<strong>Demande de réservation</strong> — nom, coordonnées, dates et nombre de personnes. Pour traiter la réservation.');
  if (o.newsletter) lignes.push('<strong>Lettre d’information</strong> — adresse électronique. Envoyée avec votre consentement, retirable à tout moment.');
  if (o.compte) lignes.push('<strong>Compte client</strong> — identifiants et historique. Pour vous donner accès à votre espace.');
  if (o.paiement) lignes.push('<strong>Paiement</strong> — les coordonnées bancaires sont saisies chez le prestataire de paiement et ne transitent jamais par ce site.');
  if (o.analytics) lignes.push('<strong>Mesure d’audience</strong> — pages consultées et données techniques, en statistiques.');
  if (!lignes.length) {
    lignes.push('Ce site ne collecte aucune donnée personnelle : il n’a ni formulaire, ni compte, ni suivi d’audience.');
  }
  return lignes;
}

// -------------------------------------------------------------- documents
function mentions(d, o) {
  const hebergeur = hebergeurDe(d);
  const sections = [
    section([
      w('heading', { text: 'Mentions légales', level: 'h2' }),
      w('text', T('Conformément à l’article 6-III de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l’économie numérique.')),
    ], { padding: 64 }),

    section([
      w('heading', { text: 'Éditeur du site', level: 'h3' }),
      w('text', T(identite(d) || 'À compléter.')),
      ...(vide(d.directeur) ? [] : [w('text', T(`<strong>Directeur de la publication :</strong> ${d.directeur}`))]),
    ]),

    section([
      w('heading', { text: 'Hébergement', level: 'h3' }),
      w('text', T(`Ce site est hébergé par <strong>${hebergeur.nom}</strong>${hebergeur.adresse ? `<br>${hebergeur.adresse}` : ''}`)),
    ]),

    section([
      w('heading', { text: 'Propriété intellectuelle', level: 'h3' }),
      w('text', T('L’ensemble de ce site — textes, images, mise en page — est protégé par le droit d’auteur. Toute reproduction, même partielle, est interdite sans autorisation écrite préalable.')),
    ]),
  ];

  if (o.formulaire || o.reservation || o.newsletter || o.compte || o.analytics) {
    sections.push(section([
      w('heading', { text: 'Données personnelles et cookies', level: 'h3' }),
      w('text', T('Le traitement des données personnelles et l’usage des cookies sont détaillés dans notre politique de confidentialité.')),
      w('button', { text: 'Politique de confidentialité', href: 'politique-de-confidentialite.html' }),
    ]));
  }

  return sections;
}

function confidentialite(d, o) {
  const sections = [
    section([
      w('heading', { text: 'Politique de confidentialité', level: 'h2' }),
      w('text', T('Cette page explique quelles données nous recueillons, pourquoi, combien de temps nous les gardons, et comment exercer vos droits.')),
    ], { padding: 64 }),

    section([
      w('heading', { text: 'Responsable du traitement', level: 'h3' }),
      w('text', T(identite(d) || 'À compléter.')),
    ]),

    section([
      w('heading', { text: 'Données recueillies et pourquoi', level: 'h3' }),
      w('list', { items: donneesCollectees(o).join('\n') }),
    ]),

    section([
      w('heading', { text: 'Base légale', level: 'h3' }),
      w('text', T([
        o.formulaire || o.reservation ? 'Les données de contact et de réservation sont traitées pour répondre à votre demande et exécuter le contrat qui en découle.' : '',
        o.newsletter ? 'L’envoi de la lettre d’information repose sur votre consentement.' : '',
        o.analytics ? 'La mesure d’audience repose sur notre intérêt légitime à connaître la fréquentation du site.' : '',
        !o.formulaire && !o.reservation && !o.newsletter && !o.analytics ? 'Aucun traitement n’est réalisé sur ce site.' : '',
      ].filter(Boolean).join('<br><br>'))),
    ]),

    section([
      w('heading', { text: 'Durée de conservation', level: 'h3' }),
      w('list', {
        items: [
          o.formulaire || o.reservation ? 'Demandes de contact et réservations : 3 ans après le dernier échange.' : '',
          o.newsletter ? 'Lettre d’information : jusqu’au retrait de votre consentement.' : '',
          o.compte ? 'Compte client : le temps de la relation, puis 3 ans.' : '',
          o.paiement ? 'Pièces comptables : 10 ans, comme l’exige la loi.' : '',
          o.analytics ? 'Mesure d’audience : 13 mois au plus.' : '',
        ].filter(Boolean).join('\n') || 'Sans objet : aucune donnée n’est conservée.',
      }),
    ]),

    section([
      w('heading', { text: 'Qui a accès à vos données', level: 'h3' }),
      w('text', T([
        'Vos données ne sont ni vendues ni échangées.',
        `Elles sont conservées chez notre hébergeur, ${hebergeurDe(d).nom}.`,
        o.paiement ? 'Le paiement est traité par notre prestataire de paiement, qui reçoit les seules informations nécessaires à la transaction.' : '',
        o.reservation ? 'Une plateforme de réservation peut recevoir les informations de séjour nécessaires.' : '',
        o.analytics ? 'Notre outil de mesure d’audience reçoit des données de navigation.' : '',
      ].filter(Boolean).join(' '))),
    ]),

    section([
      w('heading', { text: 'Vos droits', level: 'h3' }),
      w('text', T('Vous disposez d’un droit d’accès, de rectification, d’effacement, d’opposition, de limitation et de portabilité sur vos données.')),
      w('text', T(`Pour les exercer, écrivez à <strong>${d.email || 'notre adresse de contact'}</strong>. Une réponse vous sera apportée dans un délai d’un mois.`)),
      w('text', T('Si la réponse ne vous satisfait pas, vous pouvez saisir la CNIL : 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07 — cnil.fr')),
    ]),
  ];

  if (o.analytics || o.cookiesTiers) {
    sections.push(section([
      w('heading', { text: 'Cookies', level: 'h3' }),
      w('list', {
        items: [
          'Cookies nécessaires au fonctionnement du site : déposés sans consentement, ils ne servent qu’à l’afficher correctement.',
          o.analytics ? 'Cookies de mesure d’audience : déposés seulement après votre accord, retirable à tout moment.' : '',
          o.cookiesTiers ? 'Contenus intégrés (vidéos, cartes, réseaux sociaux) : ces services peuvent déposer leurs propres cookies lorsque le contenu est affiché.' : '',
        ].filter(Boolean).join('\n'),
      }),
      w('text', T('Vous pouvez à tout moment supprimer les cookies déposés depuis les réglages de votre navigateur.')),
    ]));
  }

  return sections;
}

function cgv(d, o) {
  const quoi = o.livraison ? 'des produits' : (o.reservation ? 'des séjours et prestations' : 'des prestations');
  const sections = [
    section([
      w('heading', { text: 'Conditions générales de vente', level: 'h2' }),
      w('text', T(`Les présentes conditions régissent la vente ${quoi} proposés sur ce site${vide(d.denomination) ? '' : ` par ${d.denomination}`}. Toute commande vaut acceptation.`)),
    ], { padding: 64 }),

    section([
      w('heading', { text: 'Le vendeur', level: 'h3' }),
      w('text', T(identite(d) || 'À compléter.')),
    ]),

    section([
      w('heading', { text: 'Prix', level: 'h3' }),
      w('text', T('Les prix sont indiqués en euros, toutes taxes comprises. Ils peuvent être modifiés à tout moment, le prix applicable étant celui affiché au moment de la commande.')),
    ]),

    section([
      w('heading', { text: o.reservation ? 'Réservation et confirmation' : 'Commande', level: 'h3' }),
      w('text', T(o.reservation
        ? 'La réservation devient ferme à réception de notre confirmation écrite. Un acompte peut être demandé ; il s’impute sur le prix du séjour.'
        : 'La commande est ferme dès validation par le client et confirmation par nos soins. Un courriel récapitulatif est adressé au client.')),
    ]),
  ];

  if (o.paiement) {
    sections.push(section([
      w('heading', { text: 'Paiement', level: 'h3' }),
      w('text', T('Le paiement s’effectue par les moyens proposés lors de la commande. Les données bancaires sont traitées directement par notre prestataire de paiement, dans un environnement sécurisé, et ne sont jamais conservées par nos soins.')),
    ]));
  }

  if (o.livraison) {
    sections.push(section([
      w('heading', { text: 'Livraison', level: 'h3' }),
      w('text', T('Les produits sont expédiés à l’adresse indiquée lors de la commande, dans le délai annoncé. En cas de retard, le client en est informé et peut demander l’annulation de la commande dans les conditions prévues par la loi.')),
    ]));
  }

  sections.push(section([
    w('heading', { text: 'Droit de rétractation', level: 'h3' }),
    w('text', T(o.sansRetractation
      ? 'Conformément à l’article L221-28 du code de la consommation, le droit de rétractation ne s’applique pas aux prestations d’hébergement, de transport, de restauration et de loisirs fournies à une date ou selon une périodicité déterminée. Les conditions d’annulation propres à votre réservation vous sont communiquées lors de la confirmation.'
      : 'Le client dispose de quatorze jours à compter de la réception du produit, ou de la conclusion du contrat pour une prestation, pour exercer son droit de rétractation sans avoir à se justifier. Il lui suffit de nous en informer par courriel ou par courrier.')),
  ]));

  sections.push(section([
    w('heading', { text: 'Garanties', level: 'h3' }),
    w('text', T('Le client bénéficie de la garantie légale de conformité (articles L217-4 et suivants du code de la consommation) et de la garantie contre les vices cachés (articles 1641 et suivants du code civil).')),
  ]));

  sections.push(section([
    w('heading', { text: 'Réclamations et litiges', level: 'h3' }),
    w('text', T([
      `Toute réclamation peut être adressée à ${d.email || 'notre adresse de contact'}.`,
      o.mediateur
        ? `À défaut d’accord, le client peut recourir gratuitement au médiateur de la consommation : ${d.mediateurNom || '[nom du médiateur]'}${d.mediateurUrl ? ` — ${d.mediateurUrl}` : ''}.`
        : 'Le client peut également recourir à un médiateur de la consommation.',
      'Les présentes conditions sont soumises au droit français.',
    ].join(' '))),
  ]));

  return sections;
}

const CONSTRUCTEURS = { mentions, confidentialite, cgv };

/**
 * Construit un document légal.
 * @param {'mentions'|'confidentialite'|'cgv'} id
 * @param {object} donnees réponses d'identité
 * @param {object} options cases cochées
 * @returns {object[]} sections de widgets, prêtes à poser dans la page
 */
export function construireDocument(id, donnees, options) {
  const construire = CONSTRUCTEURS[id];
  return construire ? construire(donnees || {}, options || {}) : [];
}

/** Ce qui manque encore pour que le document tienne debout. */
export function champsManquants(donnees) {
  return CHAMPS_LEGAUX.filter((c) => c.requis && vide(donnees?.[c.key])).map((c) => c.key);
}
