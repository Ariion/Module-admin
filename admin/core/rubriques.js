/**
 * Les rubriques du site : ce que le client voit dans son menu.
 *
 * Un site vitrine n'a rien à faire d'un catalogue de produits, et une
 * boutique n'a pas besoin d'une galerie d'articles. Montrer les deux à tout
 * le monde, c'est demander à quelqu'un qui n'a jamais fait de site de
 * deviner lesquelles des huit entrées le concernent — et la réponse est
 * souvent « deux ».
 *
 * On part donc du GENRE de site. On coche « je vends des produits », et la
 * rubrique Produits apparaît. Le genre n'est qu'un raccourci : il allume
 * des rubriques, il ne les verrouille pas. Tout se décoche ensuite, une par
 * une, dans les paramètres — parce qu'un site change, et qu'un raccourci
 * qui enferme est pire que pas de raccourci du tout.
 *
 * Trois rubriques ne s'éteignent jamais : les pages, les médias et les
 * paramètres. Sans elles il n'y a plus de site à administrer, et un client
 * qui les décocherait par curiosité n'aurait plus de quoi les rallumer.
 * @module core/rubriques
 */

/**
 * Le catalogue. `ecran` est l'identifiant de l'écran du back-office, `toujours`
 * marque ce qui ne se décoche pas, et `besoin` dit ce que la rubrique exige
 * du site pour être utile — sans quoi l'écran explique ce qui manque.
 */
export const RUBRIQUES = [
  { id: 'pages', ecran: 'pages', icone: 'pages', groupe: 'contenu', toujours: true },
  { id: 'contenus', ecran: 'contenus', icone: 'list', groupe: 'contenu', besoin: 'types' },
  { id: 'produits', ecran: 'produits', icone: 'grid', groupe: 'contenu' },
  { id: 'medias', ecran: 'medias', icone: 'image', groupe: 'contenu', toujours: true },
  { id: 'apparence', ecran: 'apparence', icone: 'palette', groupe: 'allure', aVenir: true },
  { id: 'reglages', ecran: 'reglages', icone: 'sliders', groupe: 'module', toujours: true },
];

/**
 * Les genres de site proposés à la première visite. Plusieurs peuvent être
 * cochés : une boutique qui tient aussi un journal est un cas courant, pas
 * une exception à traiter à part.
 */
export const GENRES = [
  { id: 'vitrine', allume: [] },
  { id: 'boutique', allume: ['produits'] },
  { id: 'presse', allume: ['contenus'] },
  { id: 'portfolio', allume: ['contenus'] },
  { id: 'association', allume: ['contenus'] },
];

/** Les rubriques qui ne se décochent pas. */
export const SOCLE = RUBRIQUES.filter((r) => r.toujours).map((r) => r.id);

/**
 * Les rubriques actives, d'après les réglages du site.
 *
 * Tant que rien n'a été choisi, on ne montre que le socle : un menu qui
 * s'allonge quand on répond vaut mieux qu'un menu qu'il faut élaguer.
 *
 * @param {object|null} reglages réglages du site (document commun)
 * @returns {string[]} identifiants, dans l'ordre du catalogue
 */
export function rubriquesActives(reglages) {
  const choisies = Array.isArray(reglages?.rubriques) ? reglages.rubriques : null;
  const actives = new Set(SOCLE);
  if (choisies) for (const id of choisies) actives.add(id);
  else for (const id of rubriquesDesGenres(reglages?.genres)) actives.add(id);
  return RUBRIQUES.filter((r) => actives.has(r.id)).map((r) => r.id);
}

/** Ce que des genres cochés allument, sans tenir compte du reste. */
export function rubriquesDesGenres(genres) {
  const coches = Array.isArray(genres) ? genres : [];
  const allumees = new Set();
  for (const genre of GENRES) {
    if (!coches.includes(genre.id)) continue;
    for (const id of genre.allume) allumees.add(id);
  }
  return [...allumees];
}

/**
 * Applique un choix de genres : les rubriques qu'ils allument s'ajoutent à
 * celles déjà retenues. Cocher un genre de plus n'éteint donc jamais ce
 * qu'on avait allumé à la main — décocher se fait dans les paramètres, où
 * l'on voit ce qu'on décoche.
 */
export function appliquerGenres(reglages, genres) {
  const gardees = new Set(rubriquesActives(reglages));
  for (const id of rubriquesDesGenres(genres)) gardees.add(id);
  for (const id of SOCLE) gardees.add(id);
  return RUBRIQUES.filter((r) => gardees.has(r.id)).map((r) => r.id);
}

/** Le site a-t-il déjà répondu ? */
export function genreChoisi(reglages) {
  return Array.isArray(reglages?.genres) && reglages.genres.length > 0;
}

/** La rubrique portant cet identifiant, ou null. */
export function rubrique(id) {
  return RUBRIQUES.find((r) => r.id === id) || null;
}
