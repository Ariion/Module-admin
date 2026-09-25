/**
 * admin-endpoint — portage Vercel de tools/admin-endpoint.php
 *
 * Le module d'administration a besoin d'un hébergement capable d'écrire un
 * fichier .html : c'est ce qui lui permet de créer des pages et de régénérer
 * le HTML avec le contenu publié dedans. Vercel sert un disque en lecture
 * seule, donc « écrire un fichier » veut dire ici « committer dans le dépôt
 * GitHub », ce qui déclenche un redéploiement.
 *
 * Le contrat est celui du script PHP, à l'identique :
 *   POST ?action=check   {path}         → {bake, pageExists, writable, media, ia}
 *   POST ?action=source  {path}         → {sourceUrl, refreshed}
 *   POST ?action=page    {path, html}   → {written, bytes, path}
 *   POST ?action=create  {path, from}   → {created, path}
 *   POST ?action=delete-page {path}     → {deleted, path}
 *   POST ?action=config  {...}          → 501 (voir plus bas)
 *
 * Authentification : jeton d'identité Firebase en Authorization: Bearer.
 * La signature est vérifiée contre les certificats publics de Google, puis
 * le compte doit être membre du site dans Firestore — exactement les règles
 * déjà publiées, aucune liste d'UID à tenir à jour ici.
 *
 * Variables d'environnement (Vercel → Settings → Environment Variables) :
 *   GITHUB_TOKEN         jeton fin, permission « Contents: read and write »
 *                        sur ce dépôt uniquement
 *   GITHUB_REPO          « Ariion/Procomsolution »
 *   GITHUB_BRANCH        « main » par défaut
 *   FIREBASE_PROJECT_ID  « procom-solution »
 *   SITE_ID              « procomsolution »
 */

const crypto = require('crypto');

const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const FIRESTORE = 'https://firestore.googleapis.com/v1';
const GITHUB = 'https://api.github.com';

/** Marque qu'une page a été régénérée par le module. */
const BAKED_MARKER = 'name="admin-baked"';
const MAX_HTML = 1024 * 1024;

/* ───────────────────────────── certificats Google ───────────────────────── */

let certsCache = null;
let certsFetchedAt = 0;

async function googleCertificates() {
  // Une instance de fonction sert plusieurs requêtes : on garde les
  // certificats douze heures, comme le fait le script PHP sur son disque.
  if (certsCache && Date.now() - certsFetchedAt < 12 * 3600 * 1000) return certsCache;
  const response = await fetch(CERTS_URL);
  if (!response.ok) throw httpError('Certificats Google indisponibles.', 503);
  certsCache = await response.json();
  certsFetchedAt = Date.now();
  return certsCache;
}

/* ───────────────────────────── jeton Firebase ───────────────────────────── */

function b64url(value) {
  return Buffer.from(String(value).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

/** Vérifie un jeton d'identité Firebase et retourne son uid. */
async function verifyIdToken(token, projectId) {
  const parts = String(token).split('.');
  if (parts.length !== 3) throw httpError('Jeton mal formé.', 401);
  const [rawHeader, rawPayload, rawSignature] = parts;

  let header;
  let payload;
  try {
    header = JSON.parse(b64url(rawHeader).toString('utf8'));
    payload = JSON.parse(b64url(rawPayload).toString('utf8'));
  } catch {
    throw httpError('Jeton illisible.', 401);
  }

  if (header.alg !== 'RS256' || !header.kid) throw httpError('Algorithme de signature refusé.', 401);

  const certificates = await googleCertificates();
  const pem = certificates[header.kid];
  if (!pem) throw httpError('Clé de signature inconnue.', 401);

  let publicKey;
  try {
    publicKey = new crypto.X509Certificate(pem).publicKey;
  } catch {
    throw httpError('Certificat illisible.', 500);
  }

  const verified = crypto.verify(
    'RSA-SHA256',
    Buffer.from(`${rawHeader}.${rawPayload}`),
    publicKey,
    b64url(rawSignature),
  );
  if (!verified) throw httpError('Signature invalide.', 401);

  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== projectId) throw httpError('Jeton émis pour un autre projet.', 401);
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw httpError('Émetteur inattendu.', 401);
  if ((payload.exp || 0) < now) throw httpError('Jeton expiré.', 401);
  if ((payload.iat || 0) > now + 300) throw httpError('Jeton daté dans le futur.', 401);
  if (!payload.sub) throw httpError('Jeton sans utilisateur.', 401);

  return String(payload.sub);
}

/**
 * Le compte a-t-il le droit d'écrire sur ce site ?
 *
 * On interroge Firestore avec le jeton de la personne elle-même : les règles
 * publiées autorisent chacun à lire sa propre fiche de membre, et rien de
 * plus. Aucun compte de service, et la liste des ayants droit reste au même
 * endroit que pour le reste du module.
 */
async function assertCanEdit(token, uid, projectId, siteId) {
  const base = `${FIRESTORE}/projects/${projectId}/databases/(default)/documents`;
  const headers = { Authorization: `Bearer ${token}` };

  const [member, superadmin] = await Promise.all([
    fetch(`${base}/sites/${encodeURIComponent(siteId)}/members/${encodeURIComponent(uid)}`, { headers })
      .then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch(`${base}/superadmins/${encodeURIComponent(uid)}`, { headers })
      .then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);

  if (superadmin && superadmin.fields) return 'superadmin';

  const role = member && member.fields && member.fields.role && member.fields.role.stringValue;
  if (role === 'owner' || role === 'editor') return role;

  throw httpError('Compte non autorisé sur ce site.', 403);
}

/* ─────────────────────────────── dépôt GitHub ───────────────────────────── */

function repoConfig() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) {
    throw httpError("L'écriture n'est pas configurée : GITHUB_TOKEN ou GITHUB_REPO manquant.", 500);
  }
  return { token, repo, branch: process.env.GITHUB_BRANCH || 'main' };
}

async function github(path, options = {}) {
  const { token, repo } = repoConfig();
  const response = await fetch(`${GITHUB}/repos/${repo}/contents/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  return response;
}

/** Contenu et sha d'un fichier du dépôt, ou null s'il n'existe pas. */
async function readFile(relative) {
  const { branch } = repoConfig();
  const response = await github(`${encodeURI(relative)}?ref=${encodeURIComponent(branch)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw httpError(`Lecture impossible (${response.status}).`, 502);
  const data = await response.json();
  if (Array.isArray(data)) throw httpError('Ce chemin est un dossier.', 400);
  return { text: Buffer.from(data.content || '', 'base64').toString('utf8'), sha: data.sha };
}

/**
 * Écrit un fichier dans le dépôt. Un push relance le déploiement Vercel :
 * la page est donc en ligne une trentaine de secondes plus tard.
 */
async function writeFile(relative, contents, message) {
  const { branch } = repoConfig();
  // Deux publications rapprochées peuvent se croiser : GitHub refuse alors
  // l'écriture faute du bon sha. On relit et on réessaie une fois.
  for (let essai = 0; essai < 2; essai += 1) {
    const existing = await readFile(relative);
    const response = await github(encodeURI(relative), {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content: Buffer.from(contents, 'utf8').toString('base64'),
        branch,
        ...(existing ? { sha: existing.sha } : {}),
      }),
    });
    if (response.ok) return true;
    if (response.status !== 409 || essai === 1) {
      const detail = await response.text();
      throw httpError(`Écriture refusée par GitHub (${response.status}). ${detail.slice(0, 160)}`, 502);
    }
  }
  return false;
}

/** Retire un fichier du dépôt. Silencieux s'il n'existe déjà plus. */
async function deleteFile(relative, message) {
  const { branch } = repoConfig();
  const existing = await readFile(relative);
  if (!existing) return false;
  const response = await github(encodeURI(relative), {
    method: 'DELETE',
    body: JSON.stringify({ message, sha: existing.sha, branch }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw httpError(`Suppression refusée par GitHub (${response.status}). ${detail.slice(0, 160)}`, 502);
  }
  return true;
}

/* ──────────────────────────────── chemins ───────────────────────────────── */

/**
 * Résout un chemin de page, comme resolvePagePath() côté PHP.
 *
 * Une subtilité propre à Vercel : cleanUrls sert /portfolio pour le fichier
 * portfolio.html, donc l'éditeur envoie souvent un chemin sans extension.
 * On la rétablit, sans quoi on écrirait dans portfolio/index.html.
 */
function resolvePagePath(relative) {
  let chemin = String(relative || '').replace(/\\/g, '/').trim();
  chemin = chemin.replace(/^\/+/, '').replace(/\?.*$/, '').replace(/#.*$/, '');
  if (chemin === '') chemin = 'index.html';
  if (chemin.endsWith('/')) chemin += 'index.html';
  if (chemin.includes('..')) throw httpError('Chemin de page invalide.', 400);

  if (!/\.html?$/i.test(chemin)) {
    // « portfolio » ou « portfolio/index » → portfolio.html
    chemin = chemin.replace(/\/index$/, '') + '.html';
  }
  if (!/^[A-Za-z0-9/_-]+\.html?$/i.test(chemin)) throw httpError('Chemin de page invalide.', 400);
  if (chemin.startsWith('api/') || chemin.startsWith('admin/')) {
    throw httpError('Chemin de page réservé.', 400);
  }

  const source = chemin.replace(/\.html?$/i, '.src.html');
  return { file: chemin, source, sourceUrl: `/${source}` };
}

/* ──────────────────────────────── utilitaires ───────────────────────────── */

function httpError(message, status) {
  const error = new Error(message);
  error.status = status || 400;
  return error;
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

/* ──────────────────────────────── actions ──────────────────────────────── */

const actions = {
  async check({ body }) {
    const paths = resolvePagePath(body.path || 'index.html');
    const page = await readFile(paths.file);
    return {
      bake: true,
      pageExists: !!page,
      writable: true,
      // Les médias passent par l'adaptateur « url » : rien à téléverser ici
      // pour l'instant.
      media: false,
      ia: false,
      iaEcrivable: false,
    };
  },

  async source({ body }) {
    const paths = resolvePagePath(body.path);
    const page = await readFile(paths.file);
    if (!page) throw httpError(`Page introuvable : ${paths.file}`, 404);

    const source = await readFile(paths.source);
    const dejaRegeneree = page.text.includes(BAKED_MARKER);

    // Le fichier en ligne ne vient pas du module : c'est le code écrit à la
    // main, il devient la nouvelle référence.
    if (!dejaRegeneree || !source) {
      await writeFile(paths.source, page.text, `Copie du code d'origine : ${paths.file}`);
      return { sourceUrl: paths.sourceUrl, refreshed: true };
    }
    return { sourceUrl: paths.sourceUrl, refreshed: false };
  },

  async page({ body }) {
    const paths = resolvePagePath(body.path);
    const html = String(body.html || '');

    if (html === '' || html.length > MAX_HTML) {
      throw httpError('Contenu HTML absent ou trop volumineux.', 400);
    }
    // Garde-fou : on n'écrase une page qu'avec un rendu produit par le module.
    if (!html.includes(BAKED_MARKER)) {
      throw httpError('Le HTML reçu ne porte pas la marque du module.', 400);
    }
    if (!(await readFile(paths.source))) {
      throw httpError("Aucune copie du code d'origine : appelez d'abord action=source.", 409);
    }

    await writeFile(paths.file, html, `Publication : ${paths.file}`);
    return { written: true, bytes: Buffer.byteLength(html, 'utf8'), path: paths.file };
  },

  async create({ body }) {
    const cible = resolvePagePath(body.path);
    const depuis = resolvePagePath(body.from || 'index.html');

    if (await readFile(cible.file)) throw httpError('Une page porte déjà ce nom.', 409);

    // On part de la copie d'origine quand elle existe : la nouvelle page
    // hérite du site tel qu'il a été écrit, sans le contenu déjà saisi sur
    // la page modèle.
    const modele = (await readFile(depuis.source)) || (await readFile(depuis.file));
    if (!modele) throw httpError('Page modèle introuvable.', 404);

    await writeFile(cible.file, modele.text, `Nouvelle page : ${cible.file}`);
    return { created: true, path: cible.file };
  },

  /**
   * Supprime une page et sa copie d'origine.
   *
   * Le nom est « delete-page » et non « delete » : côté PHP, `delete`
   * retire un MÉDIA. Deux endpoints qui donnent deux sens au même mot,
   * c'est un client qui marche sur l'un et échoue sur l'autre — ce qui est
   * exactement arrivé.
   *
   * Trois pages ne peuvent pas partir : l'accueil, parce qu'un site sans
   * accueil n'est plus un site ; les modèles, parce qu'ils servent à créer
   * les suivantes ; et tout ce qui n'est pas une page.
   */
  async ['delete-page']({ body }) {
    const paths = resolvePagePath(body.path);
    if (paths.file === 'index.html') {
      throw httpError("La page d'accueil ne peut pas être supprimée.", 400);
    }
    if (paths.file.startsWith('modeles/')) {
      throw httpError('Une page modèle ne se supprime pas depuis l’éditeur.', 400);
    }
    if (!(await readFile(paths.file))) throw httpError('Page introuvable.', 404);

    await deleteFile(paths.file, `Suppression : ${paths.file}`);
    await deleteFile(paths.source, `Suppression de la copie d'origine : ${paths.source}`);
    return { deleted: true, path: paths.file };
  },

  async config() {
    // La clé de rédaction assistée doit vivre côté serveur, hors du dépôt.
    // Sur Vercel elle se pose en variable d'environnement, pas depuis
    // l'éditeur : l'écrire ici reviendrait à la committer en clair.
    throw httpError(
      "La clé de rédaction se règle dans les variables d'environnement Vercel, pas depuis l'éditeur.",
      501,
    );
  },
};

/* ──────────────────────────────── handler ──────────────────────────────── */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée.' });

  try {
    const name = String((req.query && req.query.action) || '');
    const action = Object.prototype.hasOwnProperty.call(actions, name) ? actions[name] : null;
    if (!action) throw httpError('Action inconnue.', 404);

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const siteId = process.env.SITE_ID;
    if (!projectId || !siteId) {
      throw httpError('FIREBASE_PROJECT_ID ou SITE_ID manquant.', 500);
    }

    const header = String(req.headers.authorization || '');
    const bearer = header.match(/^Bearer\s+(.+)$/i);
    if (!bearer) throw httpError('Authentification requise.', 401);

    const token = bearer[1].trim();
    const uid = await verifyIdToken(token, projectId);
    const role = await assertCanEdit(token, uid, projectId, siteId);

    const result = await action({ body: readBody(req), uid, role });
    return res.status(200).json(result);
  } catch (error) {
    const status = error && error.status ? error.status : 500;
    if (status >= 500) console.error('[admin-endpoint]', error);
    return res.status(status).json({ error: error.message || 'Erreur interne.' });
  }
};
