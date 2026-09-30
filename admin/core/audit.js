/**
 * Audit d'une page : référencement et accessibilité, dans le même passage.
 *
 * Les deux sont le même travail. « Cette image n'a pas de texte de
 * remplacement » est une phrase d'accessibilité et une phrase de
 * référencement ; l'ordre des niveaux de titre dit à un lecteur d'écran par où
 * entrer et à un moteur de quoi parle la page. Séparer les deux écrans aurait
 * voulu dire parcourir deux fois le même arbre pour reprocher deux fois la
 * même chose.
 *
 * Trois règles ont dessiné ce fichier :
 *
 *   1. **On dit où.** Un constat qui annonce qu'il manque quelque chose sans
 *      dire où est une punition, pas un outil. Chaque constat porte donc un
 *      extrait du contenu fautif, la zone où il se trouve, et l'empreinte de
 *      l'élément — de quoi proposer d'y aller.
 *   2. **On ne crie pas pour rien.** Un audit qui se plaint à tort ne sera
 *      plus jamais ouvert, et le vrai défaut du lendemain ne sera pas vu. À
 *      chaque fois qu'on ne peut pas conclure — une couleur illisible, un
 *      texte posé sur une photo — on se tait plutôt que de supposer.
 *   3. **Pas de note sur 100.** Un chiffre rond fait travailler pour le
 *      chiffre : on monte à 92 en corrigeant ce qui compte pour trois points
 *      et on laisse le titre manquant, qui en coûte un. Il y a donc deux
 *      paquets, « à corriger » et « à améliorer », et rien d'autre.
 *
 * L'audit ne réanalyse pas le HTML à sa façon : il demande au scanner les
 * mêmes éléments que l'éditeur, et au modèle le titre, la description et les
 * zones communes. Ce qui n'est pas éditable n'est pas audité — c'est la même
 * frontière partout, et elle est explicable au client.
 *
 * @module core/audit
 */
import { scan, ignore } from './scanner.js';
import { isVisible } from './dom.js';
import { referencementDe, ficheEtablissement, racineDe } from './referencement.js';

/** Les deux paquets. L'ordre est celui de l'affichage. */
export const GRAVITES = ['bloquant', 'souhaitable'];

/** Les deux familles de constats. Un même écran, deux étiquettes. */
export const FAMILLES = ['referencement', 'accessibilite'];

/**
 * Les rapports de contraste exigés par WCAG en niveau AA.
 *
 * `grand` s'applique à partir de 24px, ou de 18,66px en gras : un texte grand
 * reste lisible avec moins de contraste, et exiger 4,5 partout condamnerait
 * tous les gros titres clairs sur fond de couleur — donc l'audit entier.
 */
export const SEUILS = { normal: 4.5, grand: 3 };

/** Longueurs au-delà desquelles un moteur coupe. Ce sont des repères, pas des lois. */
const LONGUEURS = { titre: 60, description: 160 };

/** Taille minimale d'une cible tactile, en pixels (WCAG 2.2, critère 2.5.8). */
const CIBLE_MIN = 24;

/**
 * Les textes de lien qui ne disent pas où ils mènent.
 *
 * Lus hors contexte — ce que fait un lecteur d'écran quand il énumère les
 * liens d'une page — ils ne veulent rien dire. La liste reste courte et
 * volontairement en deux langues : un site français porte souvent des
 * « read more » venus d'un thème.
 */
const LIENS_VAGUES = new Set([
  'ici', 'cliquez ici', 'cliquer ici', 'clic ici', 'voir', 'voir plus',
  'en savoir plus', 'savoir plus', 'lire la suite', 'la suite', 'suite',
  'plus', 'détails', 'détail', 'ce lien', 'lien', 'télécharger', 'continuer',
  'here', 'click here', 'read more', 'more', 'learn more', 'this link',
  'link', 'download', 'continue', 'see more',
]);

/**
 * Audite une page déjà chargée et modélisée.
 *
 * @param {object} options
 * @param {import('./model.js').PageModel} options.model modèle de la page
 * @param {string} [options.chemin] chemin du fichier, pour le rapport
 * @param {string} [options.nom] nom lisible de la page
 * @returns {{chemin:string, nom:string, constats:object[], bloquants:number, souhaitables:number}}
 */
export function auditerPage({ model, chemin = '', nom = '' }) {
  const doc = model.doc;
  const exclude = (model.scanOptions?.exclude || []).filter(Boolean).join(',');
  const constats = [];
  const ajouter = (constat) => { constats.push(constat); };

  // Le scanner rend les mêmes éléments qu'à l'édition, blocs répétables
  // compris : c'est ce qui garantit que l'audit et l'éditeur parlent de la
  // même page.
  const trouves = scan({ ...(model.scanOptions || {}), doc });

  verifierEnTete(model, ajouter);
  verifierTitres(doc, exclude, ajouter);
  verifierImages(trouves, model, ajouter);
  verifierLiens(trouves, model, ajouter);
  verifierContraste(trouves, model, ajouter);
  verifierChamps(doc, exclude, model, ajouter);
  verifierCibles(doc, exclude, model, ajouter);

  return {
    chemin,
    nom: nom || chemin,
    constats,
    bloquants: constats.filter((c) => c.gravite === 'bloquant').length,
    souhaitables: constats.filter((c) => c.gravite === 'souhaitable').length,
  };
}

/**
 * Ce qui ne dépend pas d'une page : l'adresse du site, la fiche
 * d'établissement. Le dire une fois, sur l'écran, plutôt que sur chacune des
 * douze pages — répéter douze fois le même reproche revient à le cacher.
 */
export function auditerSite({ reglages, pages = [] }) {
  const constats = [];
  const reglage = referencementDe(reglages);
  const racine = racineDe(reglage.adresse);

  if (!racine) {
    constats.push(constat('auditSansAdresse', 'bloquant', 'referencement'));
  }
  if (!reglage.langue) {
    constats.push(constat('auditSansLangue', 'bloquant', 'accessibilite'));
  }
  if (!ficheEtablissement(reglages)) {
    constats.push(constat('auditSansFiche', 'souhaitable', 'referencement'));
  }
  if (racine && reglage.plan && !pages.length) {
    constats.push(constat('auditPlanVide', 'souhaitable', 'referencement'));
  }

  return {
    constats,
    bloquants: constats.filter((c) => c.gravite === 'bloquant').length,
    souhaitables: constats.filter((c) => c.gravite === 'souhaitable').length,
  };
}

// ------------------------------------------------------------- vérifications

/** Le titre et la description, tels que la page les porte réellement. */
function verifierEnTete(model, ajouter) {
  const meta = model.pageMetaCourant();

  if (!String(meta.titre || '').trim()) {
    ajouter(constat('auditTitreAbsent', 'bloquant', 'referencement'));
  } else if (meta.titre.length > LONGUEURS.titre) {
    ajouter(constat('auditTitreLong', 'souhaitable', 'referencement', { args: [meta.titre.length] }));
  }

  if (!String(meta.description || '').trim()) {
    ajouter(constat('auditDescriptionAbsente', 'bloquant', 'referencement'));
  } else if (meta.description.length > LONGUEURS.description) {
    ajouter(constat('auditDescriptionLongue', 'souhaitable', 'referencement',
      { args: [meta.description.length] }));
  }

  if (!String(meta.partage || '').trim()
    && !model.doc.querySelector('meta[property="og:image"]')) {
    ajouter(constat('auditPartageAbsent', 'souhaitable', 'referencement'));
  }

  if (!String(model.doc.documentElement.getAttribute('lang') || '').trim()) {
    ajouter(constat('auditLangueAbsente', 'bloquant', 'accessibilite'));
  }
}

/**
 * Les niveaux de titre.
 *
 * Deux choses seulement, et ce sont les deux qui comptent : un seul titre de
 * niveau 1, parce que c'est le sujet de la page ; et pas de niveau sauté,
 * parce qu'un lecteur d'écran s'en sert comme d'un sommaire.
 */
function verifierTitres(doc, exclude, ajouter) {
  const titres = [...doc.querySelectorAll('h1, h2, h3, h4, h5, h6')]
    .filter((el) => !ignore(el, exclude) && isVisible(el));

  const premiers = titres.filter((el) => el.tagName === 'H1');
  if (!premiers.length) {
    ajouter(constat('auditH1Absent', 'bloquant', 'accessibilite'));
  } else if (premiers.length > 1) {
    ajouter(constat('auditH1Multiple', 'bloquant', 'accessibilite', {
      args: [premiers.length], ou: extrait(premiers[1]),
    }));
  }

  let precedent = 0;
  for (const el of titres) {
    const niveau = Number(el.tagName[1]);
    if (precedent && niveau > precedent + 1) {
      ajouter(constat('auditNiveauSaute', 'souhaitable', 'accessibilite', {
        args: [precedent, niveau], ou: extrait(el),
      }));
    }
    precedent = niveau;
  }
}

/**
 * Les textes de remplacement.
 *
 * `alt=""` n'est pas un oubli : c'est la façon de déclarer qu'une image est
 * décorative, et un lecteur d'écran la passe alors sans rien dire. Ce qui
 * manque, c'est l'attribut absent — là, le lecteur lit le nom du fichier.
 */
function verifierImages(trouves, model, ajouter) {
  for (const entree of trouves) {
    if (entree.role !== 'image') continue;
    if (entree.el.getAttribute('alt') !== null) continue;
    ajouter(constat('auditAltAbsent', 'bloquant', 'accessibilite', {
      ou: nomDeFichier(entree.el.getAttribute('src')),
      ancre: entree.print.id,
      zone: model.zoneDe(entree.el),
    }));
  }
}

/** Ce que dit un lien, lu tout seul. */
function verifierLiens(trouves, model, ajouter) {
  for (const entree of trouves) {
    if (entree.role !== 'link') continue;
    const el = entree.el;
    const nom = nomAccessible(el);
    const commun = {
      ancre: entree.print.id,
      zone: model.zoneDe(el),
      ou: nom || nomDeFichier(el.getAttribute('href')),
    };

    if (!nom) { ajouter(constat('auditLienMuet', 'bloquant', 'accessibilite', commun)); continue; }
    if (LIENS_VAGUES.has(nom.toLowerCase().replace(/[.…!?:]+$/, '').trim())) {
      ajouter(constat('auditLienVague', 'souhaitable', 'accessibilite', { ...commun, args: [nom] }));
    }
    // Un lien qui s'ouvre ailleurs sans le dire fait perdre le site à qui
    // navigue au clavier : le retour arrière ne ramène plus rien.
    if (el.getAttribute('target') === '_blank' && !/nouvel|onglet|new (tab|window)/i.test(
      nom + ' ' + (el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('title') || ''))) {
      ajouter(constat('auditLienNouvelOnglet', 'souhaitable', 'accessibilite', { ...commun, args: [nom] }));
    }
  }
}

/**
 * Le contraste du texte sur son fond.
 *
 * Il se CALCULE — c'est une formule, pas une impression : la luminance
 * relative des deux couleurs, telle que WCAG la définit. Le module écrit des
 * couleurs de texte et des couleurs de fond ; il peut donc dire avec un
 * chiffre qu'un gris clair sur blanc ne sera pas lu, au lieu de laisser
 * quelqu'un s'en apercevoir sur le site publié.
 *
 * On se TAIT dans deux cas : quand la couleur n'est pas lisible dans une forme
 * qu'on sait interpréter, et quand le texte est posé sur une image. Un texte
 * sur photo peut être parfaitement lisible ou illisible selon le pixel, et
 * personne ne peut en juger d'ici. Deux angles morts assumés valent mieux
 * qu'un verdict inventé.
 */
function verifierContraste(trouves, model, ajouter) {
  const vue = model.doc.defaultView;
  if (!vue) return;

  for (const entree of trouves) {
    if (entree.role !== 'text' && entree.role !== 'link') continue;
    const el = entree.el;
    if (!String(el.textContent || '').trim()) continue;

    const mesure = mesurerContraste(el, vue);
    if (!mesure) continue;
    if (mesure.rapport >= mesure.seuil - 0.005) continue;

    ajouter(constat('auditContraste', 'bloquant', 'accessibilite', {
      args: [format(mesure.rapport), format(mesure.seuil)],
      ou: extrait(el),
      ancre: entree.print.id,
      zone: model.zoneDe(el),
    }));
  }
}

/**
 * Les libellés de champ.
 *
 * Un placeholder n'est pas un libellé : il disparaît à la première lettre
 * tapée, et on ne sait plus ce qu'on remplissait. C'est donc un constat à
 * part, moins grave qu'un champ muet mais bien réel.
 */
function verifierChamps(doc, exclude, model, ajouter) {
  const champs = [...doc.querySelectorAll('input, select, textarea')]
    .filter((el) => !ignore(el, exclude) && isVisible(el)
      && !/^(hidden|submit|button|reset|image)$/i.test(el.getAttribute('type') || ''));

  for (const el of champs) {
    const commun = { zone: model.zoneDe(el), ou: repereDeChamp(el) };
    if (libelleDe(el)) continue;
    const marque = String(el.getAttribute('placeholder') || '').trim();
    ajouter(marque
      ? constat('auditChampPlaceholder', 'souhaitable', 'accessibilite', { ...commun, args: [marque] })
      : constat('auditChampMuet', 'bloquant', 'accessibilite', commun));
  }
}

/**
 * La taille des cibles tactiles.
 *
 * Un lien de douze pixels de haut se rate au doigt, et se rate deux fois plus
 * quand la main tremble. WCAG demande 24px ; on ne compte pas les liens posés
 * au milieu d'une phrase, que la norme exclut elle-même — les souligner
 * suffit, et les grossir casserait le texte.
 */
function verifierCibles(doc, exclude, model, ajouter) {
  const cibles = [...doc.querySelectorAll('a[href], button, select, [role="button"], input[type="submit"]')]
    .filter((el) => !ignore(el, exclude) && isVisible(el) && !dansUnePhrase(el));

  for (const el of cibles) {
    const boite = el.getBoundingClientRect();
    if (!boite.width || !boite.height) continue;
    if (boite.width >= CIBLE_MIN && boite.height >= CIBLE_MIN) continue;
    ajouter(constat('auditCiblePetite', 'souhaitable', 'accessibilite', {
      args: [Math.round(boite.width), Math.round(boite.height), CIBLE_MIN],
      ou: nomAccessible(el) || extrait(el),
      zone: model.zoneDe(el),
    }));
  }
}

// ------------------------------------------------------------ contraste WCAG

/**
 * Une couleur CSS, en composantes. `null` pour tout ce qu'on ne sait pas lire.
 *
 * Les navigateurs rendent `rgb()` et `rgba()` pour une couleur calculée ; on
 * accepte aussi l'écriture hexadécimale, parce que c'est celle que le module
 * enregistre et celle qu'on éprouve. Les espaces modernes — `oklch`, `lab` —
 * ne sont pas convertis : mal les convertir donnerait un rapport faux, et un
 * rapport faux est pire qu'un silence.
 */
export function couleurDe(valeur) {
  const brut = String(valeur || '').trim().toLowerCase();
  if (!brut) return null;
  if (brut === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };

  const hexa = /^#([0-9a-f]{3,8})$/.exec(brut);
  if (hexa) {
    const chiffres = hexa[1];
    const court = chiffres.length === 3 || chiffres.length === 4;
    const pas = court ? 1 : 2;
    const lire = (i) => {
      const morceau = chiffres.substr(i * pas, pas);
      return parseInt(court ? morceau + morceau : morceau, 16);
    };
    if (chiffres.length === 5 || chiffres.length === 7) return null;
    return {
      r: lire(0), g: lire(1), b: lire(2),
      a: chiffres.length === 4 || chiffres.length === 8 ? lire(3) / 255 : 1,
    };
  }

  const fonction = /^rgba?\(([^)]+)\)$/.exec(brut);
  if (fonction) {
    const parts = fonction[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const nombre = (v, max) => (v.endsWith('%') ? (parseFloat(v) / 100) * max : parseFloat(v));
    const couleur = {
      r: nombre(parts[0], 255), g: nombre(parts[1], 255), b: nombre(parts[2], 255),
      a: parts[3] == null ? 1 : nombre(parts[3], 1),
    };
    return [couleur.r, couleur.g, couleur.b, couleur.a].some((v) => Number.isNaN(v)) ? null : couleur;
  }

  return null;
}

/** Luminance relative, telle que la définit WCAG. */
export function luminanceRelative({ r, g, b }) {
  const canal = (valeur) => {
    const part = Math.min(255, Math.max(0, valeur)) / 255;
    return part <= 0.03928 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/**
 * Le rapport de contraste entre deux couleurs opaques, de 1 à 21.
 *
 * Blanc sur blanc donne 1, noir sur blanc 21 : ce sont les deux bornes, et
 * elles se vérifient. Une couleur semi-transparente doit être aplatie avant
 * d'arriver ici — `aplatir()` s'en charge — sinon son alpha serait ignoré en
 * silence et le rapport serait faux.
 */
export function rapportContraste(premiere, seconde) {
  const a = typeof premiere === 'string' ? couleurDe(premiere) : premiere;
  const b = typeof seconde === 'string' ? couleurDe(seconde) : seconde;
  if (!a || !b) return null;
  const la = luminanceRelative(a);
  const lb = luminanceRelative(b);
  const haut = Math.max(la, lb);
  const bas = Math.min(la, lb);
  return Math.round(((haut + 0.05) / (bas + 0.05)) * 100) / 100;
}

/** Une couleur semi-transparente posée sur une autre. */
export function aplatir(dessus, dessous) {
  const alpha = dessus.a == null ? 1 : dessus.a;
  if (alpha >= 1) return { ...dessus, a: 1 };
  return {
    r: dessus.r * alpha + dessous.r * (1 - alpha),
    g: dessus.g * alpha + dessous.g * (1 - alpha),
    b: dessus.b * alpha + dessous.b * (1 - alpha),
    a: 1,
  };
}

/**
 * Le contraste réel d'un élément : sa couleur de texte, le fond effectif, et
 * le seuil qui s'applique à sa taille.
 *
 * @returns {{rapport:number, seuil:number}|null} null quand on ne peut pas
 *   conclure — c'est un résultat, pas un échec.
 */
export function mesurerContraste(el, vue = el.ownerDocument.defaultView) {
  const style = vue.getComputedStyle(el);
  const texte = couleurDe(style.color);
  if (!texte) return null;

  const fond = fondEffectif(el, vue);
  if (!fond) return null;

  const rapport = rapportContraste(aplatir(texte, fond), fond);
  if (rapport == null) return null;

  const taille = parseFloat(style.fontSize) || 16;
  const graisse = parseInt(style.fontWeight, 10) || 400;
  const grand = taille >= 24 || (taille >= 18.66 && graisse >= 700);
  return { rapport, seuil: grand ? SEUILS.grand : SEUILS.normal, taille, grand };
}

/**
 * Le fond sur lequel un texte se détache vraiment.
 *
 * Un élément n'a presque jamais sa propre couleur de fond : elle vient d'un
 * parent, parfois trois niveaux plus haut. On remonte donc, en empilant les
 * couches semi-transparentes rencontrées, jusqu'à une couleur opaque. Deux
 * choses arrêtent tout : une image de fond, sur laquelle aucun calcul ne veut
 * dire quoi que ce soit, et la racine — où l'on prend le blanc du navigateur.
 */
export function fondEffectif(el, vue = el.ownerDocument.defaultView) {
  const couches = [];
  for (let noeud = el; noeud; noeud = noeud.parentElement) {
    const style = vue.getComputedStyle(noeud);
    // Toute image de fond arrête le calcul, dégradé compris : un texte sur un
    // dégradé est lisible d'un côté et pas de l'autre, et donner le rapport du
    // premier pixel serait mentir avec un chiffre à l'appui.
    if (style.backgroundImage && style.backgroundImage !== 'none') return null;
    const couleur = couleurDe(style.backgroundColor);
    if (!couleur) return null;
    if (couleur.a === 0) continue;
    if (couleur.a >= 1) {
      return couches.reduceRight((dessous, dessus) => aplatir(dessus, dessous), couleur);
    }
    couches.push(couleur);
  }
  // Rien d'opaque jusqu'en haut : le navigateur peint alors du blanc.
  const blanc = { r: 255, g: 255, b: 255, a: 1 };
  return couches.reduceRight((dessous, dessus) => aplatir(dessus, dessous), blanc);
}

// -------------------------------------------------------------- petits outils

function constat(cle, gravite, famille, extra = {}) {
  return {
    cle, gravite, famille,
    args: extra.args || [],
    ou: extra.ou || '',
    zone: extra.zone || null,
    ancre: extra.ancre || null,
  };
}

/**
 * Le nom qu'un lecteur d'écran annonce.
 *
 * On reste sur les quatre sources que l'on rencontre vraiment : le texte, le
 * texte de remplacement d'une image enveloppée, `aria-label` et `title`. Le
 * calcul complet de la norme est autrement plus long, et le reste de ses
 * chemins ne s'écrit pas à la main sur un site vitrine.
 */
export function nomAccessible(el) {
  const propre = (valeur) => String(valeur || '').replace(/\s+/g, ' ').trim();
  const texte = propre(el.textContent);
  if (texte) return texte;
  const aria = propre(el.getAttribute('aria-label'));
  if (aria) return aria;
  const decrit = el.getAttribute('aria-labelledby');
  if (decrit) {
    const cible = el.ownerDocument.getElementById(decrit.split(/\s+/)[0]);
    if (cible) { const nom = propre(cible.textContent); if (nom) return nom; }
  }
  const image = el.querySelector?.('img[alt]');
  if (image) { const alt = propre(image.getAttribute('alt')); if (alt) return alt; }
  return propre(el.getAttribute('title'));
}

/** Le libellé d'un champ, s'il en a un. Le placeholder n'en est pas un. */
function libelleDe(el) {
  const propre = (valeur) => String(valeur || '').replace(/\s+/g, ' ').trim();
  const aria = propre(el.getAttribute('aria-label'));
  if (aria) return aria;
  const decrit = el.getAttribute('aria-labelledby');
  if (decrit) {
    const cible = el.ownerDocument.getElementById(decrit.split(/\s+/)[0]);
    if (cible) { const nom = propre(cible.textContent); if (nom) return nom; }
  }
  if (el.id) {
    for (const label of el.ownerDocument.querySelectorAll(`label[for="${cssEchappe(el.id)}"]`)) {
      const nom = propre(label.textContent);
      if (nom) return nom;
    }
  }
  const enveloppe = el.closest('label');
  if (enveloppe) {
    const nom = propre(enveloppe.textContent);
    if (nom) return nom;
  }
  return propre(el.getAttribute('title'));
}

/** Un identifiant utilisable dans un sélecteur, même écrit de travers. */
function cssEchappe(valeur) {
  const brut = String(valeur);
  if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(brut);
  return brut.replace(/["\\]/g, '\\$&');
}

/** De quoi reconnaître un champ sans libellé : son nom, son type, sa place. */
function repereDeChamp(el) {
  return el.getAttribute('name') || el.getAttribute('id')
    || el.getAttribute('placeholder') || el.getAttribute('type') || el.tagName.toLowerCase();
}

/**
 * Ce lien est-il posé au milieu d'une phrase ?
 *
 * La norme exclut ces liens de la règle de taille, et c'est justifié : on ne
 * grossit pas un mot au milieu d'un paragraphe. Le test est celui du bon sens
 * — le parent porte-t-il, autour du lien, plus de texte que le lien lui-même ?
 */
function dansUnePhrase(el) {
  if (el.tagName !== 'A') return false;
  const parent = el.parentElement;
  if (!parent) return false;
  const autour = String(parent.textContent || '').trim().length;
  const propre = String(el.textContent || '').trim().length;
  return autour > propre + 12;
}

/** Un extrait du contenu, pour retrouver l'élément à l'œil. */
function extrait(el, max = 60) {
  const propre = String(el.textContent || '').replace(/\s+/g, ' ').trim();
  if (!propre) return '';
  return propre.length > max ? propre.slice(0, max - 1) + '…' : propre;
}

/** Le nom du fichier d'une adresse : c'est ce que le client reconnaît. */
function nomDeFichier(adresse) {
  const brut = String(adresse || '').split(/[?#]/)[0];
  const dernier = brut.split('/').filter(Boolean).pop() || brut;
  try { return decodeURIComponent(dernier); } catch { return dernier; }
}

/** Un rapport de contraste tel qu'on l'écrit : « 4,5 ». */
function format(valeur) {
  return String(Math.round(valeur * 10) / 10).replace('.', ',');
}
