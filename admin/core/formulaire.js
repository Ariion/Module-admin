/**
 * Formulaire de contact : le rendu, et le peu de script qui l'accompagne.
 *
 * Un site vitrine sans formulaire n'est pas un site vitrine — et pourtant
 * c'est l'élément le plus difficile à poser ici, parce qu'il doit continuer à
 * marcher LE MODULE RETIRÉ. Tout le reste du module se contente de figer du
 * contenu dans le HTML à la publication : un titre publié est un titre, il
 * n'a besoin de personne. Un formulaire, lui, a besoin de quelqu'un pour
 * porter l'envoi.
 *
 * D'où le partage retenu :
 *
 *   le balisage  →  du HTML sémantique et sans classes, comme les autres
 *                   éléments, plus quelques attributs `data-formulaire-*`
 *                   qui disent OÙ écrire. Ils ne commencent pas par
 *                   `data-admin-` exprès : la régénération du HTML et
 *                   l'export manuel effacent ce préfixe, et effaceraient
 *                   donc l'adresse de la boîte de réception.
 *   le script    →  UNE balise, écrite dans le `<head>` par le modèle, au
 *                   même titre que la feuille du thème ou celle des effets.
 *                   Une quarantaine de lignes, aucun import, aucune
 *                   dépendance : c'est le strict minimum pour qu'un envoi
 *                   parte d'une page où le module n'existe plus.
 *
 * Le script n'est pas paramétré : il lit tout sur le formulaire qu'il traite.
 * Le formulaire et sa destination sont ainsi inséparables — on ne peut pas
 * garder l'un en perdant l'autre — et le même script sert tous les sites.
 *
 * L'envoi passe par l'API REST de Firestore, comme la lecture du contenu
 * publié : pas de SDK à télécharger, pas de serveur de courriel, pas de
 * service tiers. Le message se lit là où il est arrivé, dans la rubrique
 * « Messages » du back-office.
 *
 * Et si Firestore ne répond pas, le visiteur voit une phrase lisible sous le
 * bouton. Jamais une page cassée : c'est la règle du module, elle vaut ici
 * comme ailleurs.
 * @module core/formulaire
 */
import { BAKE_PARAM, PREVIEW_PARAM } from './config.js';

/** Identifiant de la balise portant le script d'envoi. */
export const FORMULAIRE_SCRIPT_ID = 'admin-formulaire';

/** Point d'entrée REST de Firestore — le même que celui de la lecture. */
const HOTE_REST = 'https://firestore.googleapis.com/v1';

/**
 * Ce qu'un champ peut valoir dans le panneau.
 *
 * Trois états plutôt que deux cases à cocher : « absent / facultatif /
 * obligatoire » se lit d'un coup d'œil, alors qu'une case « afficher » et une
 * case « obligatoire » laissent inventer la combinaison qui n'existe pas
 * (obligatoire mais absent).
 */
export const ETATS = ['absent', 'facultatif', 'obligatoire'];

/**
 * Les champs que le client peut poser, et RIEN d'autre.
 *
 * La liste est fermée, et c'est le point de sécurité du chantier : le
 * document écrit dans la base porte exactement ces clés, ce qui permet aux
 * règles Firestore de refuser tout le reste. Un formulaire à champs libres
 * obligerait à accepter des clés inconnues — donc à laisser n'importe qui
 * écrire n'importe quoi dans la base du client.
 *
 * `max` est la longueur retenue : le script tronque à cette valeur, et les
 * règles refusent au-delà. Les deux nombres doivent rester d'accord — celui
 * d'ici est la référence, `firebase/firestore.rules` le recopie.
 */
export const CHAMPS = [
  { id: 'nom', controle: 'text', max: 120 },
  { id: 'courriel', controle: 'email', max: 200 },
  { id: 'telephone', controle: 'tel', max: 40 },
  { id: 'message', controle: 'textarea', max: 5000 },
  { id: 'cases', controle: 'cases', max: 500, options: true },
  { id: 'liste', controle: 'liste', max: 120, options: true },
];

/** Les clés du document déposé dans la base, dans l'ordre. */
export const CLES_MESSAGE = [
  'page', 'formulaire', ...CHAMPS.map((c) => c.id), 'envoye', 'lu',
];

/** Longueur maximale par champ, telle que le script l'applique. */
const MAX_PAR_CHAMP = Object.fromEntries(CHAMPS.map((c) => [c.id, c.max]));

/**
 * Réglages d'un formulaire neuf.
 *
 * Nom, courriel et message suffisent à répondre à quelqu'un : ce sont les
 * trois qui sont allumés. Le téléphone et les choix existent, ils attendent
 * qu'on en ait besoin — un formulaire de six champs fait fuir.
 */
export function defautsFormulaire() {
  return {
    nom: 'obligatoire', nomLibelle: 'Nom',
    courriel: 'obligatoire', courrielLibelle: 'Adresse e-mail',
    telephone: 'absent', telephoneLibelle: 'Téléphone',
    message: 'obligatoire', messageLibelle: 'Votre message',
    cases: 'absent', casesLibelle: 'Je souhaite',
    casesOptions: 'Être rappelé\nRecevoir une documentation',
    liste: 'absent', listeLibelle: 'Sujet',
    listeOptions: 'Une question\nUne demande de devis\nAutre',
    bouton: 'Envoyer',
    merci: 'Merci, votre message est bien arrivé. Nous vous répondons vite.',
    erreur: 'L’envoi n’a pas abouti. Réessayez dans un instant.',
  };
}

/** Les réglages exposés dans le panneau, dans l'ordre d'affichage. */
export function champsPanneauFormulaire() {
  const lignes = [];
  for (const champ of CHAMPS) {
    lignes.push({
      key: champ.id, type: 'select', label: 'form_' + champ.id,
      options: ETATS, labelOptions: 'formEtat',
    });
    lignes.push({ key: champ.id + 'Libelle', type: 'text', label: 'formLibelle' });
    if (champ.options) lignes.push({ key: champ.id + 'Options', type: 'lines', label: 'formOptions' });
  }
  lignes.push({ key: 'bouton', type: 'text', label: 'formBouton' });
  lignes.push({ key: 'merci', type: 'text', label: 'formMerci' });
  lignes.push({ key: 'erreur', type: 'text', label: 'formErreur' });
  return lignes;
}

/** Les champs réellement posés, avec leur libellé et leurs choix. */
export function champsActifs(props = {}) {
  const actifs = [];
  for (const champ of CHAMPS) {
    const etat = ETATS.includes(props[champ.id]) ? props[champ.id] : 'absent';
    if (etat === 'absent') continue;
    actifs.push({
      ...champ,
      requis: etat === 'obligatoire',
      libelle: String(props[champ.id + 'Libelle'] ?? '').trim() || champ.id,
      choix: champ.options ? lignes(props[champ.id + 'Options']) : [],
    });
  }
  return actifs;
}

/** Une ligne par choix, les vides écartées. */
function lignes(valeur) {
  return String(valeur ?? '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 20);
}

/** Où le formulaire écrit. `null` si le site n'est pas relié à un projet. */
export function cibleDEnvoi(config) {
  const projet = config?.firebase?.projectId;
  const cle = config?.firebase?.apiKey;
  if (!projet || !cle || !config?.siteId) return null;
  return {
    projet, cle, site: config.siteId,
    base: config.firebase.databaseId || '(default)',
  };
}

/** Cet arbre de widgets porte-t-il un formulaire ? */
export function contientFormulaire(noeud) {
  if (!noeud || typeof noeud !== 'object') return false;
  if (noeud.type === 'formulaire') return true;
  return (noeud.children || []).some(contientFormulaire);
}

/**
 * Construit le formulaire.
 *
 * Aucune classe, aucun style d'apparence : un `<form>`, des `<label>`, des
 * `<input>`. La feuille du site s'y applique d'elle-même — c'est la règle de
 * tous les éléments du module, et elle vaut doublement ici : un formulaire
 * qui ne ressemble pas au site se voit tout de suite.
 *
 * La validation est celle du navigateur (`required`, `type="email"`) : elle
 * est traduite dans la langue du visiteur, elle ne coûte pas une ligne, et
 * elle fonctionne avant que le moindre script n'ait été chargé.
 *
 * @param {Document} doc
 * @param {object} noeud arbre du widget
 * @param {object|null} cible destination d'envoi (voir `cibleDEnvoi`)
 */
export function rendreFormulaire(doc, noeud, cible = null) {
  const p = noeud.props || {};
  const form = doc.createElement('form');
  form.setAttribute('data-formulaire', String(noeud.key || 'formulaire').slice(0, 64));
  form.setAttribute('data-formulaire-merci', String(p.merci ?? ''));
  form.setAttribute('data-formulaire-erreur', String(p.erreur ?? ''));
  // La clé d'API Firebase est déjà servie à tous les visiteurs dans
  // `admin-config.js` : la reposer ici ne dévoile rien. Ce sont les règles
  // Firestore qui protègent la base, jamais le secret d'une clé publique.
  if (cible) {
    form.setAttribute('data-formulaire-projet', cible.projet);
    form.setAttribute('data-formulaire-cle', cible.cle);
    form.setAttribute('data-formulaire-site', cible.site);
    if (cible.base && cible.base !== '(default)') form.setAttribute('data-formulaire-base', cible.base);
  }

  const actifs = champsActifs(p);
  for (const champ of actifs) form.appendChild(bloc(doc, champ));

  // Un appât : les robots qui remplissent tout ce qu'ils trouvent remplissent
  // aussi celui-ci, et l'envoi est alors abandonné sans bruit. Ça n'arrête
  // évidemment pas un envoi fabriqué à la main — rien côté navigateur ne
  // saurait le faire — mais ça coûte six lignes et ça écarte le tout-venant.
  const appat = doc.createElement('input');
  appat.setAttribute('type', 'text');
  appat.setAttribute('name', '_');
  appat.setAttribute('tabindex', '-1');
  appat.setAttribute('autocomplete', 'off');
  appat.setAttribute('aria-hidden', 'true');
  appat.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0;';
  form.appendChild(appat);

  const pied = doc.createElement('p');
  const bouton = doc.createElement('button');
  bouton.setAttribute('type', 'submit');
  bouton.textContent = String(p.bouton ?? '').trim() || 'Envoyer';
  pied.appendChild(bouton);
  form.appendChild(pied);

  // La réponse à l'envoi vit DANS le formulaire, annoncée aux lecteurs
  // d'écran. Une alerte de navigateur serait perdue par ceux qui les bloquent,
  // et un message posé ailleurs dans la page passerait inaperçu.
  const etat = doc.createElement('p');
  etat.setAttribute('data-formulaire-etat', '');
  etat.setAttribute('role', 'status');
  etat.setAttribute('aria-live', 'polite');
  etat.hidden = true;
  form.appendChild(etat);

  if (!actifs.length) {
    const vide = doc.createElement('p');
    vide.textContent = 'Choisissez au moins un champ dans les réglages du formulaire.';
    vide.style.cssText = 'padding:26px;border:1px dashed currentColor;opacity:.45;text-align:center;margin:0;';
    form.replaceChildren(vide);
  }
  return form;
}

/** Un champ : son libellé, et le contrôle qui va avec. */
function bloc(doc, champ) {
  if (champ.controle === 'cases') return casesACocher(doc, champ);

  const enveloppe = doc.createElement('p');
  const etiquette = doc.createElement('label');
  etiquette.appendChild(doc.createTextNode(champ.libelle));
  etiquette.appendChild(doc.createElement('br'));

  let controle;
  if (champ.controle === 'textarea') {
    controle = doc.createElement('textarea');
    controle.setAttribute('rows', '6');
  } else if (champ.controle === 'liste') {
    controle = doc.createElement('select');
    // Une liste déroulante dont la première ligne est déjà un choix valide
    // fait répondre « Une question » à qui n'a rien choisi. On ouvre donc sur
    // une ligne vide, que `required` refuse.
    const attente = doc.createElement('option');
    attente.setAttribute('value', '');
    attente.textContent = '—';
    controle.appendChild(attente);
    for (const choix of champ.choix) {
      const option = doc.createElement('option');
      option.setAttribute('value', choix);
      option.textContent = choix;
      controle.appendChild(option);
    }
  } else {
    controle = doc.createElement('input');
    controle.setAttribute('type', champ.controle);
  }
  controle.setAttribute('name', champ.id);
  if (champ.controle !== 'liste') controle.setAttribute('maxlength', String(champ.max));
  if (champ.requis) controle.setAttribute('required', '');
  etiquette.appendChild(controle);
  enveloppe.appendChild(etiquette);
  return enveloppe;
}

/** Un groupe de cases : un `<fieldset>`, qui dit exactement ce que c'est. */
function casesACocher(doc, champ) {
  const groupe = doc.createElement('fieldset');
  const titre = doc.createElement('legend');
  titre.textContent = champ.libelle;
  groupe.appendChild(titre);
  for (const choix of champ.choix) {
    const etiquette = doc.createElement('label');
    const boite = doc.createElement('input');
    boite.setAttribute('type', 'checkbox');
    boite.setAttribute('name', champ.id);
    boite.setAttribute('value', choix);
    // Une case obligatoire dans un groupe n'a pas de sens : le navigateur
    // exigerait CHAQUE case cochée. L'obligation porte sur le groupe, et le
    // seul moyen honnête de l'exprimer en HTML serait un script — qu'on ne
    // veut pas ici. Le groupe reste donc facultatif.
    etiquette.appendChild(boite);
    etiquette.appendChild(doc.createTextNode(' ' + choix));
    groupe.appendChild(etiquette);
  }
  return groupe;
}

/**
 * Le script d'envoi, tel qu'il est posé dans la page.
 *
 * Écrit à la main en vieux JavaScript, sans module ni syntaxe récente : il
 * sera lu par le navigateur du visiteur, pas par un outil de compilation, et
 * un formulaire de contact n'est pas l'endroit où exiger un navigateur
 * récent. Il tient dans une balise pour la même raison : rien à charger, donc
 * rien qui puisse manquer.
 */
const SOURCE_SCRIPT = `(function () {
  var doc = document;
  // Le script est réécrit à chaque application de contenu dans l'éditeur :
  // sans ce garde, chaque réécriture ajouterait un écouteur, et un envoi
  // partirait en double, en triple, en quadruple.
  if (doc.formulairesArmes) return;
  doc.formulairesArmes = true;

  var HOTE = '${HOTE_REST}';
  var MAX = ${JSON.stringify(MAX_PAR_CHAMP)};
  var EDITION = ['${PREVIEW_PARAM}', '${BAKE_PARAM}'];

  /** La page est-elle affichée dans l'éditeur ? Alors rien ne part. */
  function edition() {
    try {
      var params = new URLSearchParams(location.search);
      for (var i = 0; i < EDITION.length; i++) { if (params.has(EDITION[i])) return true; }
    } catch (e) { /* adresse illisible : on considère que non */ }
    return false;
  }

  function dire(form, texte, ok) {
    var zone = form.querySelector('[data-formulaire-etat]');
    if (!zone) return;
    zone.textContent = texte || '';
    zone.hidden = !texte;
    zone.setAttribute('data-formulaire-etat', texte ? (ok ? 'ok' : 'ko') : '');
  }

  function valeurs(form) {
    var saisi = {};
    for (var connu in MAX) { saisi[connu] = ''; }
    var cochees = [];
    var controles = form.querySelectorAll('[name]');
    for (var i = 0; i < controles.length; i++) {
      var controle = controles[i];
      var nom = controle.getAttribute('name');
      if (!Object.prototype.hasOwnProperty.call(MAX, nom)) continue;
      if (controle.type === 'checkbox') {
        if (controle.checked) cochees.push(controle.value);
        continue;
      }
      saisi[nom] = String(controle.value == null ? '' : controle.value);
    }
    if (cochees.length) saisi.cases = cochees.join(', ');
    // On tronque ici plutôt que de laisser les règles refuser : un message
    // trop long doit arriver raccourci, pas se perdre.
    for (var cle in saisi) { saisi[cle] = saisi[cle].slice(0, MAX[cle]); }
    return saisi;
  }

  function charge(form, saisi) {
    var champs = {
      page: { stringValue: String(location.pathname || '/').slice(0, 200) },
      formulaire: { stringValue: String(form.getAttribute('data-formulaire') || '').slice(0, 64) },
      envoye: { integerValue: String(Date.now()) },
      lu: { booleanValue: false }
    };
    for (var cle in MAX) { champs[cle] = { stringValue: saisi[cle] }; }
    return { fields: champs };
  }

  // Un seul écouteur, posé sur le document : il vaut pour les formulaires
  // déjà là ET pour ceux que le contenu publié apportera ensuite.
  doc.addEventListener('submit', function (evenement) {
    var form = evenement.target;
    // Les formulaires du développeur ne nous regardent pas : s'il a écrit une
    // recherche ou une inscription à sa lettre, elle doit continuer de partir
    // où il l'a prévu.
    if (!form || !form.hasAttribute || !form.hasAttribute('data-formulaire')) return;
    evenement.preventDefault();

    if (form.checkValidity && !form.checkValidity()) {
      if (form.reportValidity) form.reportValidity();
      return;
    }

    var merci = form.getAttribute('data-formulaire-merci') || '';
    var rate = form.getAttribute('data-formulaire-erreur') || '';
    var bouton = form.querySelector('button[type=submit], input[type=submit]');

    // Dans l'éditeur, on montre le remerciement sans rien écrire : le client
    // voit son texte, et sa boîte de réception ne se remplit pas d'essais.
    var appat = form.querySelector('[name="_"]');
    if (edition() || (appat && appat.value)) { dire(form, merci, true); return; }

    var projet = form.getAttribute('data-formulaire-projet');
    var cle = form.getAttribute('data-formulaire-cle');
    var site = form.getAttribute('data-formulaire-site');
    var base = form.getAttribute('data-formulaire-base') || '(default)';
    if (!projet || !cle || !site) { dire(form, rate, false); return; }

    var url = HOTE + '/projects/' + encodeURIComponent(projet)
      + '/databases/' + encodeURIComponent(base)
      + '/documents/sites/' + encodeURIComponent(site) + '/messages'
      + '?key=' + encodeURIComponent(cle);

    function fini(ok) {
      if (bouton) bouton.disabled = false;
      dire(form, ok ? merci : rate, ok);
      if (ok && form.reset) form.reset();
    }

    if (bouton) bouton.disabled = true;
    dire(form, '', true);
    // Quoi qu'il arrive — réseau coupé, règles qui refusent, base absente —
    // la page reste celle qu'elle était et le visiteur lit une phrase.
    try {
      fetch(url, {
        method: 'POST',
        credentials: 'omit',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(charge(form, valeurs(form)))
      }).then(function (reponse) { fini(!!reponse && reponse.ok); }, function () { fini(false); });
    } catch (erreur) { fini(false); }
  });
})();`;

/**
 * Pose ou retire la balise du script d'envoi.
 *
 * Même forme que la feuille du thème et celle des effets : une balise unique
 * dans le `<head>`, conservée par la régénération du HTML. Une page sans
 * formulaire n'emporte pas de script inutile, et une balise déjà posée n'est
 * pas remplacée — la remplacer rejouerait le script.
 */
export function writeFormulaireScript(doc, besoin) {
  const existante = doc.getElementById(FORMULAIRE_SCRIPT_ID);
  if (!besoin) { if (existante) existante.remove(); return; }
  if (existante) return;
  const balise = doc.createElement('script');
  balise.id = FORMULAIRE_SCRIPT_ID;
  balise.textContent = SOURCE_SCRIPT;
  (doc.head || doc.documentElement).appendChild(balise);
}
