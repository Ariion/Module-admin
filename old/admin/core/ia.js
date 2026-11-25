/**
 * Rédaction assistée par IA — optionnelle, et seulement en mieux.
 *
 * Le module écrit déjà la page sans elle (voir core/redacteur.js) : l'IA ne
 * remplace pas ce mécanisme, elle en remplace les PHRASES. Le plan de la
 * page, les images, la structure des sections restent décidés par le module.
 * Conséquence directe : une clé absente, un quota dépassé, une réponse
 * illisible, et la page se construit quand même. Il n'y a pas de chemin où
 * le client se retrouve devant rien.
 *
 * Où vit la clé — c'est la seule question qui compte :
 *
 *   1. `endpoint` (recommandé) — la clé est écrite dans admin-endpoint.php,
 *      sur l'hébergement du client. Le navigateur ne la voit jamais ; le
 *      script vérifie le jeton Firebase avant d'appeler le fournisseur.
 *
 *   2. `navigateur` (repli) — la clé est saisie dans l'éditeur et rangée dans
 *      le localStorage de CETTE machine. Elle ne part ni dans Firestore, ni
 *      dans admin-config.js, ni dans le HTML publié : un visiteur du site ne
 *      peut pas la lire. Elle reste toutefois lisible par qui a la main sur
 *      l'ordinateur du client, et l'éditeur le dit.
 *
 * Ce qui n'existe pas, volontairement : mettre la clé dans admin-config.js.
 * Ce fichier est servi à tout le monde.
 *
 * @module core/ia
 */
import { debug, warn } from './log.js';

/** Où la clé est rangée sur cette machine (mode « navigateur »). */
const CLE_LOCALE = 'admin:ia:cle';

/** Fournisseurs acceptés en mode « navigateur ». */
export const FOURNISSEURS = [
  {
    id: 'anthropic',
    url: 'https://api.anthropic.com/v1/messages',
    modele: 'claude-sonnet-5',
    entetes: (cle) => ({
      'content-type': 'application/json',
      'x-api-key': cle,
      'anthropic-version': '2023-06-01',
      // Sans cet en-tête, l'API refuse les appels venant d'un navigateur.
      'anthropic-dangerous-direct-browser-access': 'true',
    }),
    corps: (modele, invite) => ({
      model: modele, max_tokens: 1200,
      messages: [{ role: 'user', content: invite }],
    }),
    texte: (json) => (json?.content || []).map((b) => b.text || '').join(''),
  },
  {
    id: 'openai',
    url: 'https://api.openai.com/v1/chat/completions',
    modele: 'gpt-4o-mini',
    entetes: (cle) => ({ 'content-type': 'application/json', authorization: 'Bearer ' + cle }),
    corps: (modele, invite) => ({
      model: modele, max_tokens: 1200,
      messages: [{ role: 'user', content: invite }],
    }),
    texte: (json) => json?.choices?.[0]?.message?.content || '',
  },
  {
    id: 'mistral',
    url: 'https://api.mistral.ai/v1/chat/completions',
    modele: 'mistral-small-latest',
    entetes: (cle) => ({ 'content-type': 'application/json', authorization: 'Bearer ' + cle }),
    corps: (modele, invite) => ({
      model: modele, max_tokens: 1200,
      messages: [{ role: 'user', content: invite }],
    }),
    texte: (json) => json?.choices?.[0]?.message?.content || '',
  },
];

const PAR_ID = new Map(FOURNISSEURS.map((f) => [f.id, f]));

/** Clé rangée sur cette machine, ou ''. */
export function cleLocale() {
  try { return localStorage.getItem(CLE_LOCALE) || ''; } catch { return ''; }
}

export function poserCleLocale(valeur) {
  try {
    if (valeur) localStorage.setItem(CLE_LOCALE, String(valeur));
    else localStorage.removeItem(CLE_LOCALE);
    return true;
  } catch { return false; }
}

/**
 * L'invite. Elle demande du JSON strict et donne toutes les contraintes de
 * longueur : la page a une mise en forme, et un paragraphe de 900 signes la
 * casserait aussi sûrement qu'un texte vide.
 */
export function construireInvite(brief, prestations) {
  const faits = [
    `Nom : ${brief.activite}`,
    `Secteur : ${brief.metier}`,
    brief.ville && `Ville : ${brief.ville}`,
    brief.phrase && `En une phrase : ${brief.phrase}`,
    prestations.length && `Prestations : ${prestations.map((p) => p.titre).join(' ; ')}`,
    brief.depuis && `Depuis : ${brief.depuis}`,
    brief.horaires && `Horaires : ${brief.horaires}`,
  ].filter(Boolean).join('\n');

  return `Tu écris le texte du site vitrine d'une petite entreprise française.
Voici ce qu'elle nous a dit d'elle :

${faits}

Écris en français, à la première personne du pluriel, sur un ton ${brief.ton || 'chaleureux'}.
Pas de superlatif, pas de jargon commercial, pas d'emoji. Des phrases courtes.
N'invente aucun fait : ni prix, ni date, ni récompense, ni chiffre qui ne soit ci-dessus.

Réponds UNIQUEMENT par un objet JSON, sans texte autour, de cette forme exacte :
{
  "accroche": "une phrase de 90 à 140 signes qui dit ce que fait l'entreprise et pour qui",
  "presentation": "deux à trois phrases, 220 à 380 signes, qui présentent l'entreprise",
  "prestations": [
    {"titre": "3 à 4 mots", "texte": "une phrase de 80 à 140 signes"}
  ]
}
Donne exactement ${Math.max(1, Math.min(3, prestations.length || 3))} prestations,${
  prestations.length ? ' en gardant les titres fournis ci-dessus.' : ' que tu choisis.'}`;
}

/**
 * Lit la réponse du modèle. Tolérante sur la forme (un modèle enrobe souvent
 * son JSON), stricte sur le fond : ce qui ne rentre pas dans le moule est
 * ignoré, et le rédacteur reprend la main sur ces champs-là.
 */
export function lireReponse(texte) {
  const brut = String(texte || '');
  const debutJson = brut.indexOf('{');
  const finJson = brut.lastIndexOf('}');
  if (debutJson < 0 || finJson <= debutJson) return null;

  let objet;
  try { objet = JSON.parse(brut.slice(debutJson, finJson + 1)); } catch { return null; }
  if (!objet || typeof objet !== 'object') return null;

  const phrase = (valeur, max) => {
    const v = String(valeur ?? '').trim().replace(/\s+/g, ' ');
    return v && v.length <= max ? v : '';
  };

  const resultat = {
    accroche: phrase(objet.accroche, 240),
    presentation: phrase(objet.presentation, 700),
    prestations: Array.isArray(objet.prestations)
      ? objet.prestations
        .map((p) => ({ titre: phrase(p?.titre, 60), texte: phrase(p?.texte, 260) }))
        .filter((p) => p.titre && p.texte)
        .slice(0, 3)
      : [],
  };
  return (resultat.accroche || resultat.presentation || resultat.prestations.length)
    ? resultat : null;
}

/**
 * Demande les textes. Ne lève jamais : en cas d'échec elle renvoie null et
 * dit pourquoi, le rédacteur écrit alors la page tout seul.
 *
 * @returns {Promise<{textes:object|null, erreur:string}>}
 */
export async function redigerAvecIA(brief, prestations, reglage, backend) {
  const invite = construireInvite(brief, prestations);
  try {
    const texte = reglage?.mode === 'endpoint'
      ? await viaEndpoint(invite, reglage, backend)
      : await viaNavigateur(invite, reglage);
    const textes = lireReponse(texte);
    if (!textes) return { textes: null, erreur: 'reponse' };
    debug('IA : textes reçus', Object.keys(textes));
    return { textes, erreur: '' };
  } catch (err) {
    warn('IA indisponible', err?.message || err);
    return { textes: null, erreur: err?.code || 'reseau' };
  }
}

/** Appel passant par le script du client : la clé reste sur l'hébergement. */
async function viaEndpoint(invite, reglage, backend) {
  const jeton = await backend.idToken();
  const reponse = await fetch(reglage.endpoint + '?action=ia', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + jeton },
    body: JSON.stringify({ invite }),
  });
  const json = await reponse.json().catch(() => null);
  if (!reponse.ok) {
    const erreur = new Error(json?.error || `Le script a répondu ${reponse.status}.`);
    erreur.code = reponse.status === 501 ? 'nonconfigure' : 'endpoint';
    throw erreur;
  }
  return json?.texte || '';
}

/** Appel direct, avec la clé de cette machine. */
async function viaNavigateur(invite, reglage) {
  const fournisseur = PAR_ID.get(reglage?.fournisseur) || PAR_ID.get('anthropic');
  const cle = cleLocale();
  if (!cle) {
    const erreur = new Error('Aucune clé enregistrée sur cet ordinateur.');
    erreur.code = 'sanscle';
    throw erreur;
  }
  const reponse = await fetch(fournisseur.url, {
    method: 'POST',
    headers: fournisseur.entetes(cle),
    body: JSON.stringify(fournisseur.corps(reglage?.modele || fournisseur.modele, invite)),
  });
  if (!reponse.ok) {
    const erreur = new Error(`Le fournisseur a répondu ${reponse.status}.`);
    erreur.code = reponse.status === 401 ? 'clerefusee' : 'fournisseur';
    throw erreur;
  }
  return fournisseur.texte(await reponse.json());
}
