#!/usr/bin/env node
/**
 * L'installeur : dix étapes manuelles ramenées à trois.
 *
 *   npm run installer                             installe essais/vercel
 *   npm run installer -- distribution/admin-config.js
 *
 * `docs/INSTALLATION.md` reste la vérité sur ce que le module a besoin de
 * trouver dans Firebase. Ce script ne change pas ce qu'il faut faire — il le
 * FAIT, pour tout ce que la ligne de commande de Firebase sait faire sans
 * qu'on ait à cliquer. Ce qui reste manuel est dit explicitement, à l'étape
 * où ça se présente, jamais découvert après coup dans un message d'erreur.
 *
 * À LANCER SUR VOTRE MACHINE, pas dans une session cloud : la connexion
 * Firebase ouvre un navigateur, et une session sans navigateur ne peut pas
 * la terminer. Node 18 ou plus récent, rien d'autre à installer à l'avance —
 * `npx` récupère `firebase-tools` tout seul au premier lancement.
 *
 * TROIS PALIERS, et le script avance jusqu'où il peut :
 *
 *   1. Toujours automatique, par la ligne de commande officielle de
 *      Firebase : connexion, projet, application web, les cinq clés écrites
 *      dans votre fichier, la base Firestore, le premier compte.
 *
 *   2. Automatique SI vous fournissez une clé de compte de service (un
 *      fichier JSON téléchargé une fois dans la console, détaillé le moment
 *      venu) : publier les règles de sécurité, autoriser la connexion par
 *      mot de passe, et donner l'accès au premier compte. Sans cette clé,
 *      le script imprime exactement le texte à coller, au bon endroit.
 *
 *   3. Resté manuel dans tous les cas, parce que ça ne prend pas plus
 *      longtemps à faire qu'à expliquer : brancher les deux balises
 *      <script> sur les pages du site, et choisir l'hébergement.
 *
 * Chaque étape se relance seule : une interruption au milieu ne force pas à
 * tout reprendre, le script retrouve ce qui existe déjà et continue.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createSign, randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ========================================================================
// Fonctions pures — testées par tools/essai-installeur.mjs sans rien
// toucher ni au réseau ni au disque de l'utilisateur.
// ========================================================================

/**
 * Remplace les cinq valeurs Firebase dans un fichier de configuration, SANS
 * toucher au reste.
 *
 * On ne régénère jamais le fichier en entier : il porte des commentaires,
 * parfois un réglage `host` que quelqu'un a déjà décommenté, et les deux
 * fichiers qui existent dans ce dépôt (`essais/vercel/admin-config.js`,
 * `distribution/admin-config.exemple.js`) n'ont pas la même forme autour des
 * cinq clés. Chercher `clé: 'valeur'` ligne par ligne fonctionne dans les
 * deux, et laisse tout le reste intact.
 *
 * @param {string} texte le fichier tel qu'il est
 * @param {{apiKey,authDomain,projectId,storageBucket,appId,siteId?}} valeurs
 * @returns {{texte: string, manquants: string[]}} le fichier patché, et les
 *   clés qu'on n'a pas trouvées dedans (le fichier a une forme inattendue)
 */
export function patcherConfig(texte, valeurs) {
  let sortie = texte;
  const manquants = [];
  const CLES = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'appId'];
  for (const cle of CLES) {
    if (!(cle in valeurs) || !valeurs[cle]) continue;
    // `([\s\S]*?)` s'arrête au premier guillemet simple qui suit — on ne
    // suppose rien sur ce qu'il y avait avant (À REMPLIR, une vraie valeur
    // d'un essai précédent, peu importe).
    const motif = new RegExp(`(${cle}\\s*:\\s*)'[^']*'`);
    if (!motif.test(sortie)) { manquants.push(cle); continue; }
    sortie = sortie.replace(motif, (_, prefixe) => `${prefixe}'${valeurs[cle]}'`);
  }
  if (valeurs.siteId) {
    const motifSite = /(siteId\s*:\s*)'[^']*'/;
    if (motifSite.test(sortie)) sortie = sortie.replace(motifSite, (_, p) => `${p}'${valeurs.siteId}'`);
  }
  return { texte: sortie, manquants };
}

/** Le siteId déjà écrit dans un fichier de configuration, ou null. */
export function siteIdDe(texte) {
  const m = /siteId\s*:\s*'([^']+)'/.exec(texte);
  return m ? m[1] : null;
}

/**
 * L'assertion JWT d'un compte de service, signée RS256.
 *
 * C'est la moitié « on se présente » du protocole OAuth2 server-to-server de
 * Google : on signe soi-même une déclaration d'identité avec la clé privée
 * du compte de service, et Google l'échange contre un jeton d'accès à
 * l'étape suivante (`echangerJeton`). Aucune dépendance : `node:crypto` sait
 * signer du RS256 depuis toujours, et c'est tout ce que demande ce protocole.
 *
 * @param {{client_email: string, private_key: string}} compteDeService
 * @param {string} scope séparé par des espaces, comme Google l'attend
 * @param {number} [maintenant] secondes Unix, injectable pour les essais
 */
export function assertionCompteDeService(compteDeService, scope, maintenant = Math.floor(Date.now() / 1000)) {
  const entete = { alg: 'RS256', typ: 'JWT' };
  const corps = {
    iss: compteDeService.client_email,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    // Une heure : le temps large d'une installation qui traîne, jamais au
    // point de laisser un jeton valide traîner après coup.
    exp: maintenant + 3600,
    iat: maintenant,
  };
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const aSigner = `${b64(entete)}.${b64(corps)}`;
  const signature = createSign('RSA-SHA256').update(aSigner).sign(compteDeService.private_key, 'base64url');
  return `${aSigner}.${signature}`;
}

/** Le corps de la requête qui échange l'assertion contre un jeton d'accès. */
export function corpsEchangeJeton(assertion) {
  return new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });
}

/**
 * La requête Firestore qui pose le document d'accès du premier compte.
 *
 * Une seule écriture : `sites/{siteId}/members/{uid}`. Le document parent
 * `sites/{siteId}` n'a besoin d'exister nulle part — une sous-collection
 * Firestore se crée d'elle-même au premier document qu'elle reçoit.
 */
export function requeteAccesPremierCompte(projectId, siteId, uid, role = 'owner') {
  return {
    url: `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`
      + `/sites/${encodeURIComponent(siteId)}/members/${encodeURIComponent(uid)}`,
    corps: { fields: { role: { stringValue: role } } },
  };
}

/** La requête qui active la connexion par adresse et mot de passe. */
export function requeteActiverMotDePasse(projectId) {
  return {
    url: `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`
      + '?updateMask=signIn.email.enabled,signIn.email.passwordRequired',
    corps: { signIn: { email: { enabled: true, passwordRequired: true } } },
  };
}

/** Crée le premier compte, avec la clé publique de l'application — aucun jeton requis. */
export function requeteCreerCompte(apiKey, email, motDePasse) {
  return {
    url: `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`,
    corps: { email, password: motDePasse, returnSecureToken: false },
  };
}

/**
 * Les deux appels qui publient un texte de règles : créer la version, puis
 * pointer la release dessus. Les règles ne changent jamais en une seule
 * requête — Google les versionne, et « publier » veut dire déplacer un
 * pointeur vers la version qu'on vient de créer.
 */
export function requetesPublierRegles(projectId, { release, source }) {
  return {
    creer: {
      url: `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`,
      corps: { source: { files: [{ name: 'regles.rules', content: source }] } },
    },
    publier: (rulesetName) => ({
      url: `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/${release}`
        + '?updateMask=rulesetName',
      corps: { name: `projects/${projectId}/releases/${release}`, rulesetName },
    }),
  };
}

// ========================================================================
// Le reste ne s'exécute que lorsqu'on lance le fichier directement — pas
// quand essai-installeur.mjs l'importe pour n'en prendre que les fonctions
// pures ci-dessus.
// ========================================================================

const LANCE_DIRECTEMENT = import.meta.url === `file://${process.argv[1]}`;

if (LANCE_DIRECTEMENT) {
  main().catch((erreur) => {
    console.error(`\n  ✗ ${erreur.message}\n`);
    process.exit(1);
  });
}

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const demander = async (question, defaut = '') => {
    const reponse = (await rl.question(defaut ? `${question} [${defaut}] ` : `${question} `)).trim();
    return reponse || defaut;
  };
  const motDePasse = async (question) => {
    // readline n'a pas de mode « masqué » sans dépendance : l'enjeu ici est
    // de ne jamais écrire ce mot de passe dans un fichier, pas de le cacher
    // à l'écran pendant qu'on le tape.
    return (await rl.question(`${question} `)).trim();
  };

  console.log(`
  Atelier — installeur
  ───────────────────
  Dix étapes manuelles, ramenées à trois. Ctrl+C à tout moment : rien n'est
  perdu, relancez pour reprendre où vous en étiez.
`);

  // --- la cible ----------------------------------------------------------
  const chemin = resolve(racine, process.argv[2] || 'essais/vercel/admin-config.js');
  if (!existsSync(chemin)) {
    console.error(`\n  ✗ Introuvable : ${chemin}\n`
      + '    npm run installer -- chemin/vers/admin-config.js\n');
    process.exit(1);
  }
  let texteConfig = readFileSync(chemin, 'utf8');
  console.log(`  Fichier ciblé : ${chemin}`);

  const siteIdActuel = siteIdDe(texteConfig);
  const siteId = await demander('  Identifiant du site', siteIdActuel && siteIdActuel !== 'nom-du-site' ? siteIdActuel : '');
  if (!siteId) throw new Error('Un identifiant de site est nécessaire.');

  // --- l'outil ------------------------------------------------------------
  const firebase = (args, { json = true, silencieux = true } = {}) => {
    const tousArgs = ['--yes', 'firebase-tools', ...args, ...(json ? ['--json'] : [])];
    const r = spawnSync('npx', tousArgs, {
      cwd: racine,
      encoding: 'utf8',
      stdio: json && silencieux ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    });
    if (!json) return r;
    let sortie;
    try { sortie = JSON.parse(r.stdout || '{}'); }
    catch { throw new Error(`Réponse illisible de firebase-tools : ${(r.stderr || r.stdout || '').slice(0, 300)}`); }
    if (sortie.status !== 'success') {
      throw new Error(sortie.error || `firebase ${args.join(' ')} a échoué.`);
    }
    return sortie.result;
  };

  // ======================================================================
  // 1. Connexion
  // ======================================================================
  console.log('\n  1. Connexion à Firebase');
  let connecte = false;
  try { firebase(['login:list']); connecte = true; } catch { /* pas encore connecté */ }
  if (!connecte) {
    console.log('     Un onglet va s’ouvrir dans votre navigateur. Revenez ici une fois connecté.');
    const r = spawnSync('npx', ['--yes', 'firebase-tools', 'login'], { cwd: racine, stdio: 'inherit' });
    if (r.status !== 0) throw new Error('La connexion a échoué ou a été annulée.');
  }
  console.log('     ✓ connecté');

  // ======================================================================
  // 2. Le projet
  // ======================================================================
  console.log('\n  2. Le projet Firebase');
  const projets = firebase(['projects:list']);
  let projectId;
  if (projets.length) {
    console.log('     Projets disponibles :');
    projets.forEach((p, i) => console.log(`       ${i + 1}. ${p.projectId}${p.displayName ? ` — ${p.displayName}` : ''}`));
    const choix = await demander('     Numéro à utiliser, ou "n" pour un nouveau', '1');
    if (choix.toLowerCase() === 'n') projectId = null;
    else projectId = projets[Number(choix) - 1]?.projectId;
  }
  if (!projectId) {
    const propose = `${siteId}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 25) || `site-${randomUUID().slice(0, 8)}`;
    const nouveau = await demander('     Identifiant du nouveau projet (minuscules, chiffres, tirets)', propose);
    console.log('     Création — ça prend une minute…');
    firebase(['projects:create', nouveau, '-n', siteId]);
    projectId = nouveau;
  }
  console.log(`     ✓ projet : ${projectId}`);

  // ======================================================================
  // 3. L'application web — les cinq clés
  // ======================================================================
  console.log('\n  3. L’application web');
  let apps = firebase(['apps:list', 'web', '--project', projectId]);
  let appId = apps[0]?.appId;
  if (!appId) {
    console.log('     Aucune application web : création…');
    const cree = firebase(['apps:create', 'web', siteId, '--project', projectId]);
    appId = cree.appId;
  }
  const sdk = firebase(['apps:sdkconfig', 'web', appId, '--project', projectId]);
  const cles = sdk.sdkConfig || sdk;
  const resultatPatch = patcherConfig(texteConfig, { ...cles, siteId });
  if (resultatPatch.manquants.length) {
    console.log(`     ! Le fichier n’a pas la forme attendue pour : ${resultatPatch.manquants.join(', ')}`);
    console.log('       Collez-les à la main depuis la console Firebase.');
  }
  texteConfig = resultatPatch.texte;
  writeFileSync(chemin, texteConfig, 'utf8');
  console.log(`     ✓ les clés sont écrites dans ${chemin}`);

  // ======================================================================
  // 4. Firestore
  // ======================================================================
  console.log('\n  4. La base Firestore');
  const bases = firebase(['firestore:databases:list', '--project', projectId]);
  if (!bases.length) {
    const region = await demander('     Région (eur3 couvre l’Europe)', 'eur3');
    console.log('     Création — ça prend une minute…');
    firebase(['firestore:databases:create', '(default)', '--location', region, '--project', projectId]);
  }
  console.log('     ✓ base Firestore prête');

  // ======================================================================
  // 5. Le premier compte
  // ======================================================================
  console.log('\n  5. Le compte du client');
  const email = await demander('     Son adresse e-mail');
  const motDePasseCompte = email ? await motDePasse('     Son mot de passe (12 caractères au moins)') : '';
  let uidCompte = null;
  if (email && motDePasseCompte) {
    const { url, corps } = requeteCreerCompte(cles.apiKey, email, motDePasseCompte);
    const reponse = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
    const json = await reponse.json().catch(() => null);
    if (reponse.ok && json?.localId) {
      uidCompte = json.localId;
      console.log(`     ✓ compte créé — UID ${uidCompte}`);
    } else {
      console.log(`     ! Création refusée : ${json?.error?.message || reponse.status}`);
      console.log('       Créez-le dans la console : Authentication ▸ Users ▸ Ajouter un utilisateur.');
      uidCompte = await demander('     UID du compte (noté dans la liste de la console), ou laissez vide');
    }
  }

  // ======================================================================
  // 6. Les règles, l'authentification, l'accès — avec ou sans compte de service
  // ======================================================================
  console.log('\n  6. Règles de sécurité et accès');
  console.log('     Deux voies : coller un peu de texte à la main (1 minute), ou fournir');
  console.log('     une clé de compte de service pour que le script s’en charge.');
  const voieAuto = (await demander('     Fournir une clé de compte de service ? (o/N)', 'N')).toLowerCase().startsWith('o');

  let jeton = null;
  if (voieAuto) {
    console.log(`
       Console Firebase ▸ ⚙ Paramètres du projet ▸ Comptes de service
       ▸ Générer une nouvelle clé privée ▸ un fichier .json se télécharge.
`);
    const cheminCle = await demander('     Chemin du fichier téléchargé');
    try {
      const compteDeService = JSON.parse(readFileSync(resolve(cheminCle), 'utf8'));
      const scope = 'https://www.googleapis.com/auth/cloud-platform';
      const assertion = assertionCompteDeService(compteDeService, scope);
      const reponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: corpsEchangeJeton(assertion),
      });
      const json = await reponse.json();
      if (!reponse.ok) throw new Error(json.error_description || json.error || 'jeton refusé');
      jeton = json.access_token;
      console.log('     ✓ clé acceptée — la suite se fait seule');
    } catch (erreur) {
      console.log(`     ! Clé inutilisable (${erreur.message}) : on repasse à la main.`);
    }
  }

  const appelAuth = async (url, corps) => fetch(url, {
    method: url.includes('config') ? 'PATCH' : 'POST',
    headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  });

  const regleFirestore = readFileSync(resolve(racine, 'firebase/firestore.rules'), 'utf8');
  const regleStorage = readFileSync(resolve(racine, 'firebase/storage.rules'), 'utf8');

  if (jeton) {
    // -- règles Firestore
    try {
      const { creer, publier } = requetesPublierRegles(projectId, { release: 'cloud.firestore', source: regleFirestore });
      const rs = await appelAuth(creer.url, creer.corps).then((r) => r.json());
      if (!rs.name) throw new Error(rs.error?.message || 'ruleset Firestore refusé');
      const pub = publier(rs.name);
      await appelAuth(pub.url, pub.corps);
      console.log('     ✓ règles Firestore publiées');
    } catch (e) {
      console.log(`     ! Règles Firestore non publiées (${e.message}). Collez-les à la main :`);
      console.log('       Firestore Database ▸ Règles ▸ tout remplacer ▸ Publier.');
    }
    // -- règles Storage (le nom de bucket vient du sdkconfig : pas de supposition)
    try {
      const bucket = cles.storageBucket;
      const { creer, publier } = requetesPublierRegles(projectId, { release: `firebase.storage/${bucket}`, source: regleStorage });
      const rs = await appelAuth(creer.url, creer.corps).then((r) => r.json());
      if (!rs.name) throw new Error(rs.error?.message || 'ruleset Storage refusé');
      const pub = publier(rs.name);
      await appelAuth(pub.url, pub.corps);
      console.log('     ✓ règles Storage publiées');
    } catch (e) {
      console.log(`     ! Règles Storage non publiées (${e.message}). Collez-les à la main :`);
      console.log('       Storage ▸ Règles ▸ tout remplacer ▸ Publier.');
    }
    // -- authentification par mot de passe
    try {
      const { url, corps } = requeteActiverMotDePasse(projectId);
      const r = await appelAuth(url, corps);
      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error?.message || String(r.status));
      console.log('     ✓ connexion par mot de passe activée');
    } catch (e) {
      console.log(`     ! Non activée (${e.message}). À la main :`);
      console.log('       Authentication ▸ Sign-in method ▸ E-mail/Mot de passe ▸ Activer.');
    }
    // -- l'accès du premier compte
    if (uidCompte) {
      try {
        const { url, corps } = requeteAccesPremierCompte(projectId, siteId, uidCompte);
        const r = await fetch(url, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(corps),
        });
        if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error?.message || String(r.status));
        console.log('     ✓ accès donné au compte');
      } catch (e) {
        console.log(`     ! Accès non donné (${e.message}). À la main, dans Firestore :`);
        console.log(`       sites/${siteId}/members/${uidCompte} — champ role (chaîne) = owner`);
      }
    }
  } else {
    console.log('\n     À coller dans la console Firebase :\n');
    console.log('     ── Firestore Database ▸ Règles ▸ tout remplacer, puis Publier ──');
    console.log(`     (le texte est dans firebase/firestore.rules — ${regleFirestore.split('\n').length} lignes)`);
    console.log('\n     ── Storage ▸ Règles ▸ tout remplacer, puis Publier ──');
    console.log(`     (le texte est dans firebase/storage.rules — ${regleStorage.split('\n').length} lignes)`);
    console.log('\n     ── Authentication ▸ Sign-in method ▸ E-mail/Mot de passe ▸ Activer ──');
    if (uidCompte) {
      console.log('\n     ── Firestore ▸ créer un document (donne l’accès au compte) ──');
      console.log(`       sites/${siteId}/members/${uidCompte} — champ role (chaîne) = owner`);
    }
  }

  // ======================================================================
  // 7. Le domaine autorisé — la panne la plus fréquente, et personne ne
  //    peut l'automatiser : c'est elle qui décide quelle adresse finale.
  // ======================================================================
  console.log(`
  7. Dernière chose, à ne pas sauter
     Authentication ▸ Settings ▸ Authorized domains ▸ Add domain
     Le domaine du site qui portera le module — sans lui, la connexion
     échoue même avec le bon mot de passe. C'est l'oubli le plus fréquent.
`);

  console.log(`  Terminé. ${chemin.replace(racine + '/', '')} est à jour.\n`);
  rl.close();
}
