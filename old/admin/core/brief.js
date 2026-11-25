/**
 * Le brief : les quelques faits à partir desquels tout est écrit.
 *
 * « Je ne sais pas quoi mettre » est la vraie difficulté de quelqu'un qui
 * n'a jamais fait de site. Lui proposer une page vide, même bien découpée,
 * ne l'aide pas : il lui manque les phrases, pas les blocs.
 *
 * On lui demande donc le peu qu'il sait forcément dire — son métier, sa
 * ville, ce qu'il propose, comment on le joint — et le module écrit la page
 * à partir de ça. Rien n'est deviné : chaque phrase produite vient soit de
 * ses mots, soit d'un texte prévu pour son métier, et le guide distingue
 * ensuite les deux.
 *
 * @module core/brief
 */

/**
 * Les métiers proposés.
 *
 * Chacun porte de quoi écrire : une accroche, un paragraphe de présentation,
 * trois prestations plausibles, et les mots-clés qui serviront à chercher
 * des photos. La liste est courte et volontairement large — « autre » n'est
 * pas un aveu d'échec, c'est le cas de beaucoup de gens.
 */
export const METIERS = [
  {
    id: 'restaurant',
    photos: ['restaurant table', 'cuisine plat', 'salle restaurant'],
    accroche: (b) => `Une cuisine faite maison, à ${b.ville || 'deux pas de chez vous'}.`,
    presentation: () => 'Nous cuisinons chaque jour des produits frais, choisis auprès de '
      + 'producteurs que nous connaissons. La carte change au fil des saisons.',
    prestations: [
      ['Le midi', 'Une formule courte, servie rapidement, pour la pause déjeuner.'],
      ['Le soir', 'Une carte plus longue, à partager ou non, dans une salle calme.'],
      ['À emporter', 'Commandez par téléphone, récupérez sur place à l’heure convenue.'],
    ],
  },
  {
    id: 'alimentaire',
    photos: ['boulangerie pain', 'pâtisserie', 'artisan alimentaire'],
    accroche: (b) => `Le goût du fait maison, ${b.ville ? 'à ' + b.ville : 'près de chez vous'}.`,
    presentation: () => 'Tout est préparé sur place, chaque matin. Des matières premières '
      + 'simples, des recettes que l’on ne change pas, et le temps qu’il faut.',
    prestations: [
      ['Nos classiques', 'Ce que l’on prépare tous les jours, depuis toujours.'],
      ['Les commandes', 'Pour une fête, un buffet, une occasion : prévenez-nous à l’avance.'],
      ['Les saisons', 'Des recettes qui reviennent à leur moment, et pas avant.'],
    ],
  },
  {
    id: 'beaute',
    photos: ['salon coiffure', 'soin beauté', 'institut'],
    accroche: (b) => `Prendre soin de vous, ${b.ville ? 'à ' + b.ville : 'sans se presser'}.`,
    presentation: () => 'On prend le temps de comprendre ce que vous voulez avant de commencer. '
      + 'Le résultat doit tenir chez vous, pas seulement en sortant.',
    prestations: [
      ['Les essentiels', 'Les prestations du quotidien, sur rendez-vous ou en passant.'],
      ['Les soins', 'Un moment plus long, pour souffler autant que pour le résultat.'],
      ['Les grandes occasions', 'Mariage, cérémonie, entretien : on prépare ensemble, à l’avance.'],
    ],
  },
  {
    id: 'batiment',
    photos: ['chantier artisan', 'menuiserie atelier', 'travaux maison'],
    accroche: (b) => `Un travail soigné, ${b.ville ? 'à ' + b.ville + ' et alentour' : 'chez vous'}.`,
    presentation: () => 'Nous intervenons du devis à la finition, avec les mêmes personnes '
      + 'du début à la fin du chantier. Les délais annoncés sont tenus.',
    prestations: [
      ['Le neuf', 'Un projet complet, suivi de bout en bout.'],
      ['La rénovation', 'On intervient sur l’existant, sans tout casser quand ce n’est pas utile.'],
      ['Le dépannage', 'Une réparation ponctuelle, rapidement planifiée.'],
    ],
  },
  {
    id: 'sante',
    photos: ['cabinet soin', 'bien-être massage', 'thérapie'],
    accroche: (b) => `Un accompagnement à votre rythme${b.ville ? ', à ' + b.ville : ''}.`,
    presentation: () => 'Chaque séance part de là où vous en êtes. Rien n’est imposé : '
      + 'on avance à un rythme dont vous décidez.',
    prestations: [
      ['Première séance', 'Un temps d’échange pour comprendre votre demande.'],
      ['Le suivi', 'Des rendez-vous réguliers, espacés selon vos besoins.'],
      ['Sur demande', 'Des séances plus longues ou à domicile, selon les situations.'],
    ],
  },
  {
    id: 'conseil',
    photos: ['bureau réunion', 'travail équipe', 'ordinateur bureau'],
    accroche: (b) => `${b.activite || 'Nous'} vous accompagne, concrètement.`,
    presentation: () => 'Nous travaillons avec un petit nombre de clients à la fois, '
      + 'ce qui nous permet d’être vraiment disponibles. Les livrables sont clairs, les délais aussi.',
    prestations: [
      ['Le diagnostic', 'Un premier regard extérieur, chiffré, sur votre situation.'],
      ['L’accompagnement', 'Un suivi dans la durée, avec des points réguliers.'],
      ['La formation', 'Vos équipes deviennent autonomes sur le sujet.'],
    ],
  },
  {
    id: 'boutique',
    photos: ['boutique vitrine', 'commerce local', 'produits étagère'],
    accroche: (b) => `Une sélection choisie une par une${b.ville ? ', à ' + b.ville : ''}.`,
    presentation: () => 'Nous ne vendons que ce que nous aimons. Chaque référence est '
      + 'essayée avant d’entrer en rayon, et nous savons vous dire pourquoi.',
    prestations: [
      ['La sélection', 'Ce que nous avons en rayon, renouvelé régulièrement.'],
      ['Le conseil', 'On prend le temps de vous orienter, sans vous vendre l’inutile.'],
      ['Les commandes', 'Ce que nous n’avons pas, nous pouvons souvent le faire venir.'],
    ],
  },
  {
    id: 'creatif',
    photos: ['photographe studio', 'création design', 'atelier créatif'],
    accroche: (b) => `${b.activite || 'Un travail'} qui vous ressemble.`,
    presentation: () => 'Chaque projet commence par une discussion : ce que vous voulez '
      + 'montrer, à qui, et pourquoi. Le reste en découle.',
    prestations: [
      ['Les projets', 'Une commande complète, du premier échange à la livraison.'],
      ['Les tirages', 'Des formats disponibles à la demande, sur beau papier.'],
      ['Les ateliers', 'Des séances en petit groupe, pour apprendre en faisant.'],
    ],
  },
  {
    id: 'hebergement',
    photos: ['maison hôtes', 'chambre hôtel', 'jardin terrasse'],
    accroche: (b) => `Un lieu où l’on se pose${b.ville ? ', à ' + b.ville : ''}.`,
    presentation: () => 'La maison se prête au calme. Peu de chambres, beaucoup d’espace, '
      + 'et tout ce qu’il faut pour ne rien avoir à organiser.',
    prestations: [
      ['Les chambres', 'Chacune différente, toutes avec leur salle de bain.'],
      ['Les petits-déjeuners', 'Servis tard, avec ce que l’on trouve autour.'],
      ['Les alentours', 'Ce qu’il y a à voir, à quelle distance, et quand y aller.'],
    ],
  },
  {
    id: 'association',
    photos: ['bénévoles association', 'groupe solidarité', 'atelier collectif'],
    accroche: (b) => `${b.activite || 'Notre association'}, et ce qu’elle défend.`,
    presentation: () => 'L’association vit grâce à ses bénévoles. Toutes les bonnes '
      + 'volontés sont utiles, même quelques heures par mois.',
    prestations: [
      ['Nos actions', 'Ce que nous faisons concrètement, sur le terrain.'],
      ['Nous rejoindre', 'Devenir bénévole, adhérer, ou simplement venir voir.'],
      ['Nous soutenir', 'Les dons servent directement aux actions décrites ici.'],
    ],
  },
  {
    id: 'sport',
    photos: ['coach sport', 'salle entraînement', 'cours collectif'],
    accroche: (b) => `Progresser sans se décourager${b.ville ? ', à ' + b.ville : ''}.`,
    presentation: () => 'On part de votre niveau, pas d’un programme tout fait. '
      + 'L’objectif est que vous reveniez la semaine suivante.',
    prestations: [
      ['Les séances individuelles', 'Un programme fait pour vous, ajusté à chaque séance.'],
      ['Les cours collectifs', 'Des petits groupes, pour l’émulation sans la cohue.'],
      ['Le suivi', 'Un point régulier sur ce qui avance et ce qui bloque.'],
    ],
  },
  {
    id: 'autre',
    photos: ['bureau moderne', 'travail artisanat', 'ville commerce'],
    accroche: (b) => `${b.activite || 'Bienvenue'}${b.ville ? ' — ' + b.ville : ''}.`,
    presentation: () => 'Dites ici qui vous êtes, depuis quand, et ce qui vous distingue. '
      + 'Trois ou quatre phrases suffisent.',
    prestations: [
      ['Première prestation', 'Décrivez-la en une phrase.'],
      ['Deuxième prestation', 'Décrivez-la en une phrase.'],
      ['Troisième prestation', 'Décrivez-la en une phrase.'],
    ],
  },
];

const PAR_ID = new Map(METIERS.map((m) => [m.id, m]));

export function metierById(id) {
  return PAR_ID.get(String(id || '').trim()) || PAR_ID.get('autre');
}

/**
 * Les atouts cochables. Chacun donne une phrase, écrite d'avance, qui parle
 * de LEUR entreprise : c'est ce que le client n'arrive pas à formuler seul.
 */
export const ATOUTS = [
  { id: 'anciennete', phrase: (b) => `Nous exerçons depuis ${b.depuis || 'plusieurs années'}.` },
  { id: 'devis', phrase: () => 'Le devis est gratuit et sans engagement.' },
  { id: 'deplacement', phrase: (b) => `Nous nous déplaçons ${b.zone || 'dans tout le secteur'}.` },
  { id: 'local', phrase: () => 'Nous travaillons avec des fournisseurs locaux.' },
  { id: 'surmesure', phrase: () => 'Chaque demande est traitée sur mesure.' },
  { id: 'urgence', phrase: () => 'Nous intervenons en urgence quand c’est nécessaire.' },
  { id: 'livraison', phrase: () => 'La livraison est possible, renseignez-vous.' },
  { id: 'rdv', phrase: () => 'Nous recevons uniquement sur rendez-vous.' },
  { id: 'handicap', phrase: () => 'Le local est accessible aux personnes à mobilité réduite.' },
  { id: 'langues', phrase: () => 'We also speak English.' },
];

/**
 * L'ambiance qui va avec le métier.
 *
 * Quelqu'un qui passe par le questionnaire ne choisit pas d'ambiance : il a
 * dit « je ne sais pas quoi mettre », et lui poser une question de plus sur
 * la typographie serait absurde. On en pose donc une pour lui, cohérente
 * avec son secteur ; l'étape 1 du guide reste là pour en changer.
 *
 * Le ton l'emporte quand il a été déplacé de sa valeur par défaut : c'est un
 * choix explicite, il doit se voir.
 */
const THEME_PAR_METIER = {
  restaurant: 'chaleureux', alimentaire: 'chaleureux', beaute: 'elegant',
  batiment: 'pro', sante: 'naturel', conseil: 'pro', boutique: 'sobre',
  creatif: 'magazine', hebergement: 'naturel', association: 'naturel',
  sport: 'pep', autre: 'sobre',
};

export function themeSuggere(brief) {
  if (brief?.ton === 'dynamique') return 'pep';
  if (brief?.ton === 'sobre') return 'sobre';
  return THEME_PAR_METIER[brief?.metier] || 'sobre';
}

/** Brief vide : la forme attendue partout ailleurs. */
export function briefVide() {
  return {
    activite: '', metier: 'autre', ville: '', phrase: '',
    prestations: '', atouts: [], depuis: '', zone: '',
    telephone: '', courriel: '', adresse: '', horaires: '',
    ton: 'chaleureux',
  };
}

/** Le brief contient-il assez pour écrire une page ? */
export function briefUtilisable(brief) {
  return !!(brief && String(brief.activite || '').trim());
}

/**
 * Les prestations saisies, une par ligne. « Titre | description » est accepté,
 * mais un simple titre suffit : la description viendra du métier.
 */
export function prestationsDuBrief(brief) {
  const metier = metierById(brief.metier);
  const lignes = String(brief.prestations || '')
    .split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 6);

  if (!lignes.length) {
    return metier.prestations.map(([titre, texte]) => ({ titre, texte, propre: false }));
  }
  return lignes.map((ligne, i) => {
    const [titre, ...reste] = ligne.split('|');
    const texte = reste.join('|').trim();
    return {
      titre: titre.trim(),
      texte: texte || metier.prestations[i % metier.prestations.length][1],
      // « propre » : écrit par le client. Le guide ne le réclamera pas.
      propre: !!texte,
    };
  });
}

/** Les phrases correspondant aux atouts cochés. */
export function phrasesDesAtouts(brief) {
  const choisis = new Set(brief.atouts || []);
  return ATOUTS.filter((a) => choisis.has(a.id)).map((a) => a.phrase(brief));
}

/**
 * Mots-clés pour la recherche de photos.
 *
 * Ce que le client a écrit passe d'abord : « boulangerie levain » vaut mieux
 * que le mot-clé générique du métier. Celui-ci reste en repli.
 */
export function motsClesPhotos(brief) {
  const metier = metierById(brief.metier);
  const propres = [brief.activite, brief.phrase]
    .map((v) => String(v || '').toLowerCase())
    .join(' ')
    .replace(/[^a-zàâäéèêëïîôöùûüç\s-]/g, ' ')
    .split(/\s+/)
    .filter((mot) => mot.length > 4 && !MOTS_VIDES.has(mot));

  const requetes = [];
  if (propres.length) requetes.push(propres.slice(0, 2).join(' '));
  requetes.push(...metier.photos);
  return [...new Set(requetes)].slice(0, 4);
}

const MOTS_VIDES = new Set([
  'notre', 'votre', 'nous', 'vous', 'chez', 'avec', 'pour', 'dans', 'sans',
  'depuis', 'toute', 'toutes', 'tous', 'plus', 'très', 'entre', 'leurs',
  'cette', 'sont', 'être', 'faire', 'comme', 'aussi', 'bien', 'entreprise',
]);
