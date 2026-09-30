<?php
/**
 * Script serveur du module d'administration.
 *
 * Un seul fichier à déposer à la racine du site. Il rend trois services :
 *
 *   1. BIBLIOTHÈQUE MÉDIA — les images du client restent sur SON hébergement,
 *      dans un dossier /medias, sans abonnement supplémentaire.
 *
 *   2. RÉGÉNÉRATION DU HTML — à chaque publication, le fichier .html du site
 *      est réécrit avec le contenu à l'intérieur. C'est ce qui rend le module
 *      réellement optionnel : le client peut le supprimer quand il veut, son
 *      site garde tout ce qu'il a saisi.
 *
 *   3. ENVOIS DU FORMULAIRE, COMPTÉS (facultatif, éteint par défaut) — les
 *      messages du formulaire de contact passent par ici, qui les compte, au
 *      lieu d'aller droit dans Firestore, qui ne sait pas compter. C'est le
 *      seul service ouvert sans compte, et le seul moyen de borner le NOMBRE
 *      de messages qu'un inconnu peut déposer. Voir docs/FORMULAIRE-DEBIT.md.
 *
 * Une copie intacte du code d'origine (`page.src.html`) est conservée à côté
 * de chaque page, et chaque régénération repart de cette copie — jamais du
 * fichier déjà régénéré. Aucune dérive ne s'accumule. Si le développeur
 * redéploie sa page, le script s'en aperçoit (absence du marqueur
 * `admin-baked`) et rafraîchit la copie : le code reste maître.
 *
 * Sécurité : seul un utilisateur authentifié sur VOTRE projet Firebase peut
 * écrire. Le script vérifie la signature du jeton d'identité (RS256) contre
 * les certificats publics de Google — il ne se contente pas de le décoder.
 *
 * INSTALLATION
 *   1. Renseignez $PROJECT_ID ci-dessous (identifiant du projet Firebase).
 *   2. Déposez ce fichier à la racine du site : /admin-endpoint.php
 *   3. Créez le dossier /medias (chmod 755) à côté.
 *   4. Dans admin-config.js :
 *        host:  { endpoint: '/admin-endpoint.php' },
 *        media: { adapter: 'endpoint', endpoint: '/admin-endpoint.php' }
 *   5. Le dossier du site doit être accessible en écriture par PHP.
 */

// ---------------------------------------------------------------- réglages
$PROJECT_ID   = 'mon-projet-firebase';   // OBLIGATOIRE
$MEDIA_DIR    = __DIR__ . '/medias';     // dossier de destination
$MEDIA_URL    = '/medias';               // URL publique de ce dossier
$MAX_BYTES    = 8 * 1024 * 1024;         // 8 Mo (images)
$MAX_AV_BYTES = 48 * 1024 * 1024;        // 48 Mo (audio et vidéo)
$ALLOWED_UIDS = [];                      // vide = tout compte du projet
$ALLOWED_ORIGINS = [];                   // vide = même origine uniquement

$SITE_ROOT    = __DIR__;                 // racine du site (ce dossier)
$ALLOW_BAKE   = true;                    // autoriser la réécriture des .html
$MAX_HTML     = 4 * 1024 * 1024;         // 4 Mo par page
$BAKED_MARKER = 'name="admin-baked"';    // marque une page déjà régénérée

// --- Rédaction assistée (facultative) -----------------------------------
// La clé est ici, sur VOTRE hébergement, et jamais dans le navigateur : c'est
// tout l'intérêt de passer par ce script. Laissez vide pour ne rien activer —
// l'éditeur écrit alors les textes tout seul, sans rien demander à personne.
//
// Dans admin-config.js, côté site :  ia: { endpoint: '/admin-endpoint.php' }
$IA_CLE        = '';                 // vide = rédaction assistée désactivée
$IA_FOURNISSEUR = 'anthropic';       // 'anthropic' | 'openai' | 'mistral'
$IA_MODELE     = '';                 // vide = le modèle par défaut ci-dessous
$IA_MAX_JOUR   = 60;                 // garde-fou : appels par jour et par compte

// Clé renseignée depuis l'éditeur (action=config). Elle prime sur celle
// écrite ci-dessus, ce qui permet au client de la poser lui-même sans jamais
// ouvrir ce fichier. Le fichier produit est du PHP : demandé par HTTP, il est
// exécuté et ne renvoie rien — la clé n'est donc pas téléchargeable.
$IA_FICHIER = __DIR__ . '/admin-ia-cle.php';
if (is_file($IA_FICHIER)) {
    $enregistre = @include $IA_FICHIER;
    if (is_array($enregistre)) {
        $IA_CLE         = (string) ($enregistre['cle'] ?? $IA_CLE);
        $IA_FOURNISSEUR = (string) ($enregistre['fournisseur'] ?? $IA_FOURNISSEUR);
        $IA_MODELE      = (string) ($enregistre['modele'] ?? $IA_MODELE);
    }
}

// --- Formulaire de contact : les envois comptés (facultatif) --------------
// Le seul point de ce script ouvert SANS COMPTE. Il existe pour une raison
// unique : aucune règle Firestore ne sait limiter un débit. Qui lit la page de
// contact connaît la destination et peut y déposer des milliers de messages
// parfaitement conformes — boîte noyée, quota consommé, facture. Ici, on
// compte.
//
// Laissé à false, rien ne change : le formulaire écrit directement dans
// Firestore, comme avant, et son débit n'est borné par rien.
//
// Pour l'activer, voir docs/FORMULAIRE-DEBIT.md — l'ORDRE des étapes compte.
// En deux mots : créez un compte Firebase dédié, donnez-lui le rôle
// « facteur » sur le site, renseignez les six lignes ci-dessous, ajoutez
// `formulaire: { relais: '/admin-endpoint.php' }` à admin-config.js,
// republiez les pages, et seulement ALORS posez le document
// sites/{siteId}/reglages/relais qui ferme le chemin direct.
$CONTACT_ACTIF   = false;
$CONTACT_SITE_ID = '';                  // le siteId, côté SERVEUR : jamais celui de la requête
$CONTACT_CLE_API = '';                  // clé web du projet (la même qu'admin-config.js)
$CONTACT_BASE    = '(default)';
$CONTACT_FACTEUR = '';                  // adresse du compte dédié
$CONTACT_MOT_DE_PASSE = '';             // son mot de passe

// Les bornes. Généreuses pour un visiteur, étroites pour une machine : un
// humain qui écrit trois fois en une heure est déjà rare.
$CONTACT_MAX_HEURE_IP = 3;
$CONTACT_MAX_JOUR_IP  = 10;
$CONTACT_MAX_JOUR_SITE = 150;           // le plafond qui protège la facture
$CONTACT_MAX_IP_SUIVIES = 4000;         // au-delà, on ne grossit plus le fichier

// Où vivent les compteurs et le jeton du facteur. Rien de durable : le jour
// où ce dossier est vidé, les compteurs repartent de zéro, ce qui est sans
// conséquence.
$CONTACT_DOSSIER = sys_get_temp_dir();

// Ces deux lignes n'ont pas à être changées. Elles existent pour que
// `tools/essai-debit.mjs` puisse faire répondre un bouchon local à la place de
// Google, et éprouver ce fichier pour de vrai au lieu de le relire.
$CONTACT_HOTE_FIRESTORE = 'https://firestore.googleapis.com/v1';
$CONTACT_HOTE_AUTH = 'https://identitytoolkit.googleapis.com/v1';

// Hôtes d'où l'on accepte de rapatrier une image (action=import). Tout le
// reste est refusé : ce script ne doit pas devenir un aspirateur à URL.
$IMPORT_HOSTS = [
    'pixabay.com',
    'cdn.pixabay.com',
    // Openverse ne sert pas les fichiers lui-même : il pointe vers les sites
    // d'origine. Ce sont donc ces hôtes-là qu'il faut autoriser.
    'openverse.org',
    'wikimedia.org',
    'wikipedia.org',
    'staticflickr.com',
    'flickr.com',
    'smithsonianmag.com',
    'si.edu',
    'nasa.gov',
    'rawpixel.com',
    'stocksnap.io',
];

$ALLOWED_TYPES = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/gif'  => 'gif',
    'image/webp' => 'webp',
    'image/avif' => 'avif',
    'image/svg+xml' => 'svg',
    // Bibliothèque média : audio, vidéo et documents servis depuis le site.
    'audio/mpeg' => 'mp3',
    'audio/ogg'  => 'ogg',
    'audio/wav'  => 'wav',
    'audio/x-wav' => 'wav',
    'audio/mp4'  => 'm4a',
    'video/mp4'  => 'mp4',
    'video/webm' => 'webm',
    'video/ogg'  => 'ogv',
    'video/quicktime' => 'mov',
    'application/pdf' => 'pdf',
];

// ------------------------------------------------------------------- socle
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if ($ALLOWED_ORIGINS && isset($_SERVER['HTTP_ORIGIN'])
    && in_array($_SERVER['HTTP_ORIGIN'], $ALLOWED_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function fail(string $message, int $status = 400, array $extra = []): void
{
    http_response_code($status);
    echo json_encode(['error' => $message] + $extra, JSON_UNESCAPED_UNICODE);
    exit;
}

function ok(array $payload): void
{
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// ------------------------------------------------- vérification du jeton
function base64UrlDecode(string $value): string
{
    return base64_decode(strtr($value, '-_', '+/') . str_repeat('=', (4 - strlen($value) % 4) % 4));
}

/** Certificats publics Google, mis en cache 12 h sur le disque. */
function googleCertificates(): array
{
    $cacheFile = sys_get_temp_dir() . '/admin-media-certs.json';
    if (is_readable($cacheFile) && (time() - filemtime($cacheFile)) < 43200) {
        $cached = json_decode((string) file_get_contents($cacheFile), true);
        if (is_array($cached) && $cached) {
            return $cached;
        }
    }
    $url = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
    $raw = @file_get_contents($url, false, stream_context_create([
        'http' => ['timeout' => 8],
        'ssl'  => ['verify_peer' => true, 'verify_peer_name' => true],
    ]));
    $certificates = $raw ? json_decode($raw, true) : null;
    if (!is_array($certificates) || !$certificates) {
        fail('Certificats Google indisponibles.', 503);
    }
    @file_put_contents($cacheFile, json_encode($certificates));
    return $certificates;
}

/** Vérifie un jeton d'identité Firebase et retourne son uid. */
function verifyIdToken(string $token, string $projectId): string
{
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        fail('Jeton mal formé.', 401);
    }
    [$rawHeader, $rawPayload, $rawSignature] = $parts;

    $header  = json_decode(base64UrlDecode($rawHeader), true);
    $payload = json_decode(base64UrlDecode($rawPayload), true);
    if (!is_array($header) || !is_array($payload)) {
        fail('Jeton illisible.', 401);
    }
    if (($header['alg'] ?? '') !== 'RS256' || empty($header['kid'])) {
        fail('Algorithme de signature refusé.', 401);
    }

    $certificates = googleCertificates();
    if (empty($certificates[$header['kid']])) {
        fail('Clé de signature inconnue.', 401);
    }
    $publicKey = openssl_pkey_get_public($certificates[$header['kid']]);
    if (!$publicKey) {
        fail('Certificat illisible.', 500);
    }
    $verified = openssl_verify(
        $rawHeader . '.' . $rawPayload,
        base64UrlDecode($rawSignature),
        $publicKey,
        OPENSSL_ALGO_SHA256
    );
    if ($verified !== 1) {
        fail('Signature invalide.', 401);
    }

    $now = time();
    if (($payload['aud'] ?? '') !== $projectId) {
        fail('Jeton émis pour un autre projet.', 401);
    }
    if (($payload['iss'] ?? '') !== 'https://securetoken.google.com/' . $projectId) {
        fail('Émetteur inattendu.', 401);
    }
    if (($payload['exp'] ?? 0) < $now) {
        fail('Jeton expiré.', 401);
    }
    if (($payload['iat'] ?? 0) > $now + 300) {
        fail('Jeton daté dans le futur.', 401);
    }
    if (empty($payload['sub'])) {
        fail('Jeton sans utilisateur.', 401);
    }
    return (string) $payload['sub'];
}

/**
 * Récupère l'en-tête Authorization.
 * Apache en CGI/FastCGI le supprime silencieusement : on passe alors par
 * getallheaders(). Si rien ne remonte, ajoutez dans le .htaccess du site :
 *   SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1
 */
function authorizationHeader(): string
{
    foreach (['HTTP_AUTHORIZATION', 'REDIRECT_HTTP_AUTHORIZATION'] as $key) {
        if (!empty($_SERVER[$key])) {
            return (string) $_SERVER[$key];
        }
    }
    if (function_exists('getallheaders')) {
        foreach (getallheaders() as $name => $value) {
            if (strcasecmp($name, 'Authorization') === 0) {
                return (string) $value;
            }
        }
    }
    return '';
}

function currentUid(string $projectId, array $allowedUids): string
{
    $header = authorizationHeader();
    if (!preg_match('/^Bearer\s+(.+)$/i', trim($header), $matches)) {
        fail('Authentification requise.', 401);
    }
    $uid = verifyIdToken(trim($matches[1]), $projectId);
    if ($allowedUids && !in_array($uid, $allowedUids, true)) {
        fail('Compte non autorisé sur ce site.', 403);
    }
    return $uid;
}

// ------------------------------------------------------------------ actions
if ($PROJECT_ID === 'mon-projet-firebase') {
    fail('Le script n’est pas configuré : renseignez $PROJECT_ID.', 500);
}
if (!is_dir($MEDIA_DIR) && !@mkdir($MEDIA_DIR, 0755, true)) {
    fail('Dossier de destination introuvable et impossible à créer.', 500);
}

$action = $_GET['action'] ?? 'list';

if ($action === 'list') {
    currentUid($PROJECT_ID, $ALLOWED_UIDS);
    $files = [];
    foreach (glob($MEDIA_DIR . '/*') ?: [] as $path) {
        if (!is_file($path)) {
            continue;
        }
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        if (!in_array($extension, $ALLOWED_TYPES, true)) {
            continue;
        }
        $name = basename($path);
        $files[] = [
            'url'  => rtrim($MEDIA_URL, '/') . '/' . rawurlencode($name),
            'path' => $name,
            'name' => $name,
            'size' => filesize($path),
            'createdAt' => filemtime($path) * 1000,
        ];
    }
    usort($files, fn ($a, $b) => $b['createdAt'] <=> $a['createdAt']);
    ok(['files' => $files]);
}

if ($action === 'upload') {
    currentUid($PROJECT_ID, $ALLOWED_UIDS);
    if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        fail('Aucun fichier reçu.');
    }
    $upload = $_FILES['file'];

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = (string) $finfo->file($upload['tmp_name']);
    if (!isset($ALLOWED_TYPES[$mime])) {
        fail('Type de fichier refusé : ' . $mime);
    }
    // Un SVG peut contenir du script : on ne l'accepte pas par défaut.
    if ($mime === 'image/svg+xml') {
        fail('Les fichiers SVG ne sont pas acceptés.');
    }

    $estImage = str_starts_with($mime, 'image/');
    $plafond = $estImage ? $MAX_BYTES : $MAX_AV_BYTES;
    if ($upload['size'] > $plafond) {
        fail('Fichier trop volumineux (maximum ' . round($plafond / 1048576) . ' Mo).');
    }
    // Une image doit vraiment en être une ; pour l'audio et la vidéo, le
    // type MIME réel relevé ci-dessus fait foi.
    if ($estImage && @getimagesize($upload['tmp_name']) === false) {
        fail('Le fichier n’est pas une image valide.');
    }

    $base = pathinfo((string) $upload['name'], PATHINFO_FILENAME);
    $base = strtolower(preg_replace('/[^A-Za-z0-9_-]+/', '-', $base) ?? '');
    $base = trim($base, '-');
    if ($base === '') {
        $base = $estImage ? 'image' : 'media';
    }
    $name = substr($base, 0, 60) . '-' . bin2hex(random_bytes(4)) . '.' . $ALLOWED_TYPES[$mime];
    $target = $MEDIA_DIR . '/' . $name;

    if (!move_uploaded_file($upload['tmp_name'], $target)) {
        fail('Écriture impossible : vérifiez les droits du dossier.', 500);
    }
    @chmod($target, 0644);

    ok([
        'url'  => rtrim($MEDIA_URL, '/') . '/' . rawurlencode($name),
        'path' => $name,
        'name' => $name,
        'size' => filesize($target),
        'type' => $mime,
    ]);
}

if ($action === 'import') {
    currentUid($PROJECT_ID, $ALLOWED_UIDS);
    $entree = json_decode((string) file_get_contents('php://input'), true);
    $source = is_array($entree) ? (string) ($entree['url'] ?? '') : '';

    $parties = parse_url($source);
    if (!$parties || ($parties['scheme'] ?? '') !== 'https' || empty($parties['host'])) {
        fail('Adresse invalide.');
    }
    $hote = strtolower($parties['host']);
    $autorise = false;
    foreach ($IMPORT_HOSTS as $permis) {
        if ($hote === $permis || str_ends_with($hote, '.' . $permis)) {
            $autorise = true;
            break;
        }
    }
    if (!$autorise) {
        fail('Cet hébergeur d’images n’est pas autorisé : ' . $hote);
    }

    $brut = @file_get_contents($source, false, stream_context_create([
        'http' => ['timeout' => 15, 'follow_location' => 0,
                   'header' => "User-Agent: module-admin\r\n"],
        'ssl'  => ['verify_peer' => true, 'verify_peer_name' => true],
    ]));
    if ($brut === false || $brut === '') {
        fail('Image introuvable chez ' . $hote, 502);
    }
    if (strlen($brut) > $MAX_BYTES) {
        fail('Image trop volumineuse.');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = (string) $finfo->buffer($brut);
    if (!isset($ALLOWED_TYPES[$mime]) || !str_starts_with($mime, 'image/') || $mime === 'image/svg+xml') {
        fail('Type de fichier refusé : ' . $mime);
    }

    $base = strtolower(preg_replace('/[^A-Za-z0-9_-]+/', '-', (string) ($entree['name'] ?? 'image')) ?? '');
    $base = trim($base, '-');
    if ($base === '') {
        $base = 'image';
    }
    $name = substr($base, 0, 60) . '-' . bin2hex(random_bytes(4)) . '.' . $ALLOWED_TYPES[$mime];
    $target = $MEDIA_DIR . '/' . $name;
    if (@file_put_contents($target, $brut) === false) {
        fail('Écriture impossible : vérifiez les droits du dossier.', 500);
    }
    @chmod($target, 0644);

    ok([
        'url'  => rtrim($MEDIA_URL, '/') . '/' . rawurlencode($name),
        'path' => $name,
        'name' => $name,
        'size' => strlen($brut),
        'type' => $mime,
    ]);
}

if ($action === 'delete') {
    currentUid($PROJECT_ID, $ALLOWED_UIDS);
    $body = json_decode((string) file_get_contents('php://input'), true);
    $name = basename((string) ($body['path'] ?? ''));
    if ($name === '' || $name === '.' || $name === '..') {
        fail('Chemin invalide.');
    }
    $target = $MEDIA_DIR . '/' . $name;
    // realpath empêche toute sortie du dossier par lien symbolique.
    $real = realpath($target);
    if (!$real || strpos($real, realpath($MEDIA_DIR) . DIRECTORY_SEPARATOR) !== 0) {
        fail('Chemin invalide.');
    }
    @unlink($real);
    ok(['deleted' => $name]);
}

// ------------------------------------------------- régénération des pages
/**
 * Résout un chemin de page relatif en chemin absolu, en refusant tout ce qui
 * sort de la racine du site.
 */
function resolvePagePath(string $relative, string $root): array
{
    $relative = str_replace('\\', '/', trim($relative));
    if ($relative === '' || $relative[0] === '/' || strpos($relative, '..') !== false) {
        fail('Chemin de page invalide.');
    }
    if (!preg_match('/\.html?$/i', $relative)) {
        fail('Seuls les fichiers .html peuvent être réécrits.');
    }

    $target = $root . '/' . $relative;
    $dir = realpath(dirname($target));
    $rootReal = realpath($root);
    if (!$dir || !$rootReal || strpos($dir . DIRECTORY_SEPARATOR, $rootReal . DIRECTORY_SEPARATOR) !== 0) {
        fail('Chemin de page hors du site.');
    }

    $name = basename($target);
    $source = $dir . '/' . preg_replace('/\.html?$/i', '', $name) . '.src.html';
    return [
        'file'      => $dir . '/' . $name,
        'source'    => $source,
        'sourceUrl' => dirname('/' . $relative) === '/'
            ? '/' . basename($source)
            : rtrim(dirname('/' . $relative), '/') . '/' . basename($source),
    ];
}

/**
 * Enregistre la clé de rédaction assistée, envoyée depuis l'éditeur.
 *
 * Le client n'a ainsi aucun fichier à ouvrir. La clé est écrite dans un
 * fichier PHP à côté de ce script : servi par HTTP il est exécuté, donc il
 * ne renvoie rien. Elle n'est JAMAIS relue vers le navigateur — l'éditeur
 * sait seulement si une clé est en place, pas laquelle.
 */
if ($action === 'config') {
    currentUid($PROJECT_ID, $ALLOWED_UIDS);
    $body = json_decode((string) file_get_contents('php://input'), true) ?: [];

    $cle = trim((string) ($body['cle'] ?? ''));
    $fournisseur = (string) ($body['fournisseur'] ?? 'anthropic');
    if (!in_array($fournisseur, ['anthropic', 'openai', 'mistral'], true)) {
        fail('Fournisseur inconnu.');
    }
    $modele = trim((string) ($body['modele'] ?? ''));
    if (strlen($cle) > 400 || strlen($modele) > 120) {
        fail('Valeur trop longue.');
    }

    // Chaîne vide = on retire la clé.
    if ($cle === '') {
        if (is_file($IA_FICHIER) && !@unlink($IA_FICHIER)) {
            fail('Impossible de retirer la clé enregistrée.', 500);
        }
        ok(['enregistre' => false]);
    }

    $contenu = "<?php\n// Écrit par le module Admin. Ne pas publier ce fichier.\nreturn "
        . var_export(['cle' => $cle, 'fournisseur' => $fournisseur, 'modele' => $modele], true)
        . ";\n";

    if (!@file_put_contents($IA_FICHIER, $contenu, LOCK_EX)) {
        fail('Impossible d’écrire la clé : le dossier du site n’est pas inscriptible.', 500);
    }
    // Lisible par PHP seulement. Si l'hébergeur refuse, le fichier reste du
    // PHP : demandé par HTTP il ne renvoie toujours rien.
    @chmod($IA_FICHIER, 0600);

    ok(['enregistre' => true, 'fournisseur' => $fournisseur]);
}

/**
 * Rédaction assistée. Le navigateur envoie une invite, le script y ajoute la
 * clé et relaie la réponse. Trois raisons d'exister :
 *   - la clé reste sur l'hébergement, invisible du navigateur ;
 *   - seul un compte Firebase du projet peut appeler (comme le reste) ;
 *   - un quota journalier borne la dépense en cas de compte compromis.
 */
if ($action === 'ia') {
    $uid = currentUid($PROJECT_ID, $ALLOWED_UIDS);
    if ($IA_CLE === '') {
        fail('La rédaction assistée n’est pas configurée sur cet hébergement.', 501);
    }

    $body = json_decode((string) file_get_contents('php://input'), true) ?: [];
    $invite = trim((string) ($body['invite'] ?? ''));
    if ($invite === '' || strlen($invite) > 8000) {
        fail('Demande absente ou trop longue.');
    }

    if (!iaQuotaOk($uid, $IA_MAX_JOUR)) {
        fail('Quota de rédaction atteint pour aujourd’hui.', 429);
    }

    $reponse = iaAppeler($IA_FOURNISSEUR, $IA_CLE, $IA_MODELE, $invite);
    if ($reponse === null) {
        fail('Le fournisseur n’a pas répondu.', 502);
    }
    ok(['texte' => $reponse]);
}

/** Compte les appels du jour, par compte, dans un fichier à côté des médias. */
function iaQuotaOk(string $uid, int $max): bool
{
    if ($max <= 0) {
        return true;
    }
    $fichier = sys_get_temp_dir() . '/admin-ia-' . substr(hash('sha256', $uid), 0, 24) . '.json';
    $jour = gmdate('Y-m-d');
    $etat = ['jour' => $jour, 'n' => 0];
    if (is_file($fichier)) {
        $lu = json_decode((string) @file_get_contents($fichier), true);
        if (is_array($lu) && ($lu['jour'] ?? '') === $jour) {
            $etat = ['jour' => $jour, 'n' => (int) ($lu['n'] ?? 0)];
        }
    }
    if ($etat['n'] >= $max) {
        return false;
    }
    $etat['n']++;
    @file_put_contents($fichier, json_encode($etat));
    return true;
}

/** Appelle le fournisseur et retourne le texte, ou null. */
function iaAppeler(string $fournisseur, string $cle, string $modele, string $invite): ?string
{
    $profils = [
        'anthropic' => [
            'url'     => 'https://api.anthropic.com/v1/messages',
            'modele'  => 'claude-sonnet-5',
            'entetes' => ['content-type: application/json', 'x-api-key: ' . $cle, 'anthropic-version: 2023-06-01'],
            'corps'   => static fn(string $m, string $i): array => [
                'model' => $m, 'max_tokens' => 1200,
                'messages' => [['role' => 'user', 'content' => $i]],
            ],
            'texte'   => static function (array $j): string {
                $out = '';
                foreach (($j['content'] ?? []) as $bloc) {
                    $out .= (string) ($bloc['text'] ?? '');
                }
                return $out;
            },
        ],
        'openai' => [
            'url'     => 'https://api.openai.com/v1/chat/completions',
            'modele'  => 'gpt-4o-mini',
            'entetes' => ['content-type: application/json', 'authorization: Bearer ' . $cle],
            'corps'   => static fn(string $m, string $i): array => [
                'model' => $m, 'max_tokens' => 1200,
                'messages' => [['role' => 'user', 'content' => $i]],
            ],
            'texte'   => static fn(array $j): string => (string) ($j['choices'][0]['message']['content'] ?? ''),
        ],
        'mistral' => [
            'url'     => 'https://api.mistral.ai/v1/chat/completions',
            'modele'  => 'mistral-small-latest',
            'entetes' => ['content-type: application/json', 'authorization: Bearer ' . $cle],
            'corps'   => static fn(string $m, string $i): array => [
                'model' => $m, 'max_tokens' => 1200,
                'messages' => [['role' => 'user', 'content' => $i]],
            ],
            'texte'   => static fn(array $j): string => (string) ($j['choices'][0]['message']['content'] ?? ''),
        ],
    ];

    $profil = $profils[$fournisseur] ?? $profils['anthropic'];
    $corps = json_encode(($profil['corps'])($modele !== '' ? $modele : $profil['modele'], $invite));

    $ch = curl_init($profil['url']);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => $profil['entetes'],
        CURLOPT_POSTFIELDS     => $corps,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 45,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    $brut = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($brut === false || $code < 200 || $code >= 300) {
        return null;
    }
    $json = json_decode((string) $brut, true);
    if (!is_array($json)) {
        return null;
    }
    return ($profil['texte'])($json);
}

if ($action === 'check') {
    currentUid($PROJECT_ID, $ALLOWED_UIDS);
    $body = json_decode((string) file_get_contents('php://input'), true) ?: [];
    $paths = resolvePagePath((string) ($body['path'] ?? 'index.html'), $SITE_ROOT);
    ok([
        'bake'       => $ALLOW_BAKE,
        'pageExists' => is_file($paths['file']),
        'writable'   => is_writable(dirname($paths['file'])) && (!is_file($paths['file']) || is_writable($paths['file'])),
        'media'      => is_dir($MEDIA_DIR) && is_writable($MEDIA_DIR),
        // Une clé est-elle en place ? Jamais laquelle.
        'ia'         => $IA_CLE !== '',
        // Les envois du formulaire passent-ils par ici ? Le back-office peut
        // ainsi dire au client ce qui protège sa boîte, ou ne la protège pas.
        'contact'    => $CONTACT_ACTIF,
        'iaEcrivable' => is_writable(__DIR__),
    ]);
}

if ($action === 'source') {
    currentUid($PROJECT_ID, $ALLOWED_UIDS);
    if (!$ALLOW_BAKE) {
        fail('La réécriture des pages est désactivée sur ce site.', 403);
    }
    $body = json_decode((string) file_get_contents('php://input'), true) ?: [];
    $paths = resolvePagePath((string) ($body['path'] ?? ''), $SITE_ROOT);

    if (!is_file($paths['file'])) {
        fail('Page introuvable : ' . basename($paths['file']), 404);
    }

    $current = (string) file_get_contents($paths['file']);
    $isBaked = strpos($current, $BAKED_MARKER) !== false;
    $refreshed = false;

    // Le fichier en ligne n'a pas été produit par le module : c'est le code
    // du développeur, il devient la nouvelle référence.
    if (!$isBaked || !is_file($paths['source'])) {
        if (!@file_put_contents($paths['source'], $current)) {
            fail('Impossible d’écrire la copie du code d’origine.', 500);
        }
        @chmod($paths['source'], 0644);
        $refreshed = true;
    }

    ok(['sourceUrl' => $paths['sourceUrl'], 'refreshed' => $refreshed]);
}

if ($action === 'page') {
    currentUid($PROJECT_ID, $ALLOWED_UIDS);
    if (!$ALLOW_BAKE) {
        fail('La réécriture des pages est désactivée sur ce site.', 403);
    }
    $body = json_decode((string) file_get_contents('php://input'), true) ?: [];
    $paths = resolvePagePath((string) ($body['path'] ?? ''), $SITE_ROOT);
    $html = (string) ($body['html'] ?? '');

    if ($html === '' || strlen($html) > $MAX_HTML) {
        fail('Contenu HTML absent ou trop volumineux.');
    }
    // Garde-fou : on n'écrase une page qu'avec un rendu produit par le module.
    if (strpos($html, $BAKED_MARKER) === false) {
        fail('Le HTML reçu ne porte pas la marque du module.');
    }
    if (!is_file($paths['source'])) {
        fail('Aucune copie du code d’origine : appelez d’abord action=source.', 409);
    }

    $temp = $paths['file'] . '.tmp';
    if (@file_put_contents($temp, $html) === false || !@rename($temp, $paths['file'])) {
        @unlink($temp);
        fail('Écriture impossible : vérifiez les droits du dossier.', 500);
    }
    @chmod($paths['file'], 0644);

    ok(['written' => true, 'bytes' => strlen($html), 'path' => basename($paths['file'])]);
}

if ($action === 'create') {
    currentUid($PROJECT_ID, $ALLOWED_UIDS);
    if (!$ALLOW_BAKE) {
        fail('La création de pages est désactivée sur ce site.', 403);
    }
    $body = json_decode((string) file_get_contents('php://input'), true) ?: [];
    $cible = resolvePagePath((string) ($body['path'] ?? ''), $SITE_ROOT);
    $source = resolvePagePath((string) ($body['from'] ?? 'index.html'), $SITE_ROOT);

    if (is_file($cible['file'])) {
        fail('Une page porte déjà ce nom.', 409);
    }
    // On part de la copie du code d'origine si elle existe : la nouvelle page
    // hérite ainsi du site tel que le développeur l'a écrit, sans le contenu
    // déjà saisi sur la page modèle.
    $modele = is_file($source['source']) ? $source['source'] : $source['file'];
    if (!is_file($modele)) {
        fail('Page modèle introuvable.', 404);
    }
    if (!@copy($modele, $cible['file'])) {
        fail('Écriture impossible : vérifiez les droits du dossier.', 500);
    }
    @chmod($cible['file'], 0644);

    ok(['created' => true, 'path' => basename($cible['file'])]);
}

/**
 * Fichiers de service écrits à la racine du site.
 *
 * Deux noms, et pas un de plus. C'est la liste elle-même qui fait
 * l'autorisation : sans elle, « écrire un fichier à la racine » voudrait dire
 * écrire n'importe quoi, y compris un .php — donc offrir l'hébergement au
 * premier compte compromis. L'action `page` ne pouvait pas servir : elle exige
 * un .html, la marque du module et une copie du code d'origine, ce qu'un plan
 * du site n'a pas.
 */
$FICHIERS_SERVICE = ['sitemap.xml', 'robots.txt'];

if ($action === 'fichier') {
    currentUid($PROJECT_ID, $ALLOWED_UIDS);
    if (!$ALLOW_BAKE) {
        fail('L’écriture de fichiers est désactivée sur ce site.', 403);
    }
    $body = json_decode((string) file_get_contents('php://input'), true) ?: [];
    $nom = basename(str_replace('\\', '/', (string) ($body['path'] ?? '')));
    if (!in_array($nom, $FICHIERS_SERVICE, true)) {
        fail('Ce fichier ne fait pas partie de ceux que le module écrit.');
    }
    $contenu = (string) ($body['content'] ?? '');
    if ($contenu === '' || strlen($contenu) > 512 * 1024) {
        fail('Contenu absent ou trop volumineux.');
    }

    $racine = realpath($SITE_ROOT);
    if (!$racine) {
        fail('Racine du site introuvable.', 500);
    }
    $cible = $racine . '/' . $nom;
    $temp = $cible . '.tmp';
    if (@file_put_contents($temp, $contenu) === false || !@rename($temp, $cible)) {
        @unlink($temp);
        fail('Écriture impossible : vérifiez les droits du dossier.', 500);
    }
    @chmod($cible, 0644);

    ok(['written' => true, 'bytes' => strlen($contenu), 'path' => $nom]);
}

// La suppression d'une PAGE, à ne pas confondre avec « delete », qui retire
// un média. Deux fichiers, deux dossiers, deux garde-fous : les mélanger
// laisserait un chemin de page atteindre le dossier des médias.
if ($action === 'delete-page') {
    currentUid($PROJECT_ID, $ALLOWED_UIDS);
    if (!$ALLOW_BAKE) {
        fail('La suppression de pages est désactivée sur ce site.', 403);
    }
    $body = json_decode((string) file_get_contents('php://input'), true) ?: [];
    $cible = resolvePagePath((string) ($body['path'] ?? ''), $SITE_ROOT);

    if (basename($cible['file']) === 'index.html') {
        fail('La page d’accueil ne peut pas être supprimée.', 403);
    }
    if (!is_file($cible['file'])) {
        fail('Page introuvable.', 404);
    }
    if (!@unlink($cible['file'])) {
        fail('Suppression impossible : vérifiez les droits du dossier.', 500);
    }
    // La copie du code d'origine part avec la page : la garder ferait
    // réapparaître un fantôme si une page du même nom était recréée.
    if (is_file($cible['source'])) @unlink($cible['source']);

    ok(['deleted' => true, 'path' => basename($cible['file'])]);
}

// ------------------------------------- formulaire de contact : les envois
/**
 * Dépose un message de formulaire, après l'avoir COMPTÉ.
 *
 * C'est le seul endroit de ce fichier qu'un inconnu peut appeler, et il est
 * écrit dans cet esprit. Rien de ce que la requête raconte n'est cru sur la
 * destination : le site, la base, le projet et le compte viennent des réglages
 * en tête de fichier. Une requête qui mentirait sur son siteId n'obtiendrait
 * pas d'écrire dans la boîte d'un autre site — elle écrirait dans celle de
 * CELUI-CI, ou nulle part.
 *
 * Ce qui est vérifié, dans cet ordre, et pourquoi :
 *
 *   1. POST, corps borné            un GET n'écrit rien ; 24 Ko suffisent au
 *                                   plus long message que le formulaire
 *                                   accepte, accents compris.
 *   2. même origine                 l'envoi vient d'une page du site. Ça
 *                                   n'arrête pas un `curl` qui pose l'en-tête
 *                                   à la main, et ce n'est pas prétendu :
 *                                   c'est le tri du tout-venant.
 *   3. l'appât                      rempli, on répond « reçu » sans écrire.
 *                                   Le robot croit avoir réussi et ne
 *                                   réessaie pas.
 *   4. la forme                     exactement les dix clés du document, aux
 *                                   longueurs de `admin/core/formulaire.js`.
 *                                   Les règles Firestore le revérifieront :
 *                                   ce relais est un compteur, pas une
 *                                   autorité.
 *   5. les compteurs                par adresse et par jour, et un plafond
 *                                   pour le site entier — celui qui protège
 *                                   la facture même le jour où l'attaque
 *                                   arrive de mille adresses.
 *
 * Puis, seulement, l'écriture, sous le compte « facteur » : les règles ne
 * laissent plus passer un dépôt direct dès que le site a posé son témoin.
 */
if ($action === 'message') {
    if (!$CONTACT_ACTIF) {
        fail('Les envois de formulaire ne passent pas par cet hébergement.', 501);
    }
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        fail('Méthode refusée.', 405);
    }
    if ($CONTACT_SITE_ID === '' || $CONTACT_CLE_API === ''
        || $CONTACT_FACTEUR === '' || $CONTACT_MOT_DE_PASSE === '') {
        fail('Envois de formulaire mal configurés sur cet hébergement.', 500);
    }
    if (!contactMemeOrigine()) {
        fail('Envoi refusé.', 403);
    }

    $brut = (string) file_get_contents('php://input', false, null, 0, 24 * 1024 + 1);
    if (strlen($brut) > 24 * 1024) {
        fail('Message trop volumineux.', 413);
    }
    $recu = json_decode($brut, true);
    if (!is_array($recu)) {
        fail('Message illisible.');
    }

    // L'appât. On répond comme si tout s'était bien passé : un robot à qui
    // l'on dit non revient, un robot à qui l'on dit oui s'en va.
    if (trim((string) ($recu['_'] ?? '')) !== '') {
        ok(['recu' => true]);
    }

    $champs = contactDocument($recu);
    if ($champs === null) {
        fail('Message vide.');
    }

    $borne = contactDebit(
        $CONTACT_DOSSIER,
        $CONTACT_SITE_ID,
        contactEmpreinteIp($CONTACT_SITE_ID),
        $CONTACT_MAX_HEURE_IP,
        $CONTACT_MAX_JOUR_IP,
        $CONTACT_MAX_JOUR_SITE,
        $CONTACT_MAX_IP_SUIVIES
    );
    if ($borne !== '') {
        // Le visiteur, lui, lira le message d'échec réglé dans le formulaire :
        // « réessayez dans un instant ». C'est la bonne phrase pour ce cas.
        fail('Trop d’envois. Réessayez plus tard.', 429, ['borne' => $borne]);
    }

    $jeton = contactJetonFacteur(
        $CONTACT_HOTE_AUTH,
        $CONTACT_CLE_API,
        $CONTACT_FACTEUR,
        $CONTACT_MOT_DE_PASSE,
        $CONTACT_DOSSIER
    );
    if ($jeton === null) {
        fail('Le compte de dépôt n’a pas pu être ouvert.', 502);
    }

    $url = $CONTACT_HOTE_FIRESTORE
        . '/projects/' . rawurlencode($PROJECT_ID)
        . '/databases/' . rawurlencode($CONTACT_BASE)
        . '/documents/sites/' . rawurlencode($CONTACT_SITE_ID) . '/messages'
        . '?key=' . rawurlencode($CONTACT_CLE_API);

    [$code, $reponse] = contactAppel($url, json_encode(['fields' => $champs], JSON_UNESCAPED_UNICODE), [
        'content-type: application/json',
        'authorization: Bearer ' . $jeton,
    ]);
    if ($code < 200 || $code >= 300) {
        // On ne renvoie pas ce que Firestore a répondu : ce serait décrire la
        // base à un inconnu.
        error_log('admin-endpoint : dépôt du message refusé (' . $code . ') ' . substr((string) $reponse, 0, 300));
        fail('Le message n’a pas pu être enregistré.', 502);
    }
    ok(['recu' => true]);
}

/**
 * L'envoi vient-il d'une page de ce site ?
 *
 * Un navigateur pose `Origin` sur un POST et `Referer` par défaut. Les deux
 * absents, on refuse : c'est la signature d'un appel fabriqué. Que ce soit
 * clair — un attaquant qui pose l'en-tête lui-même passe. Ce contrôle ne
 * remplace pas les compteurs, il leur épargne du travail.
 */
function contactMemeOrigine(): bool
{
    $hote = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
    if ($hote === '') {
        return false;
    }
    foreach (['HTTP_ORIGIN', 'HTTP_REFERER'] as $entete) {
        $valeur = (string) ($_SERVER[$entete] ?? '');
        if ($valeur === '') {
            continue;
        }
        $lu = parse_url($valeur, PHP_URL_HOST);
        if (is_string($lu) && strtolower($lu) === preg_replace('/:\d+$/', '', $hote)) {
            return true;
        }
        // Un en-tête présent mais qui désigne ailleurs est un refus net : on
        // ne va pas chercher l'autre en espérant qu'il dise oui.
        return false;
    }
    return false;
}

/**
 * Le document à écrire, ou null s'il ne veut rien dire.
 *
 * Les dix clés, et rien d'autre : ce qui arrive en plus est jeté sans être
 * signalé. Les longueurs sont celles de `admin/core/formulaire.js`, et on
 * TRONQUE plutôt que de refuser — un message trop long doit arriver
 * raccourci, pas se perdre. Deux valeurs ne viennent jamais de la requête :
 * `lu`, qui appartient au client, et `envoye`, que le serveur date lui-même.
 * C'est même un progrès sur le dépôt direct : ici, l'horloge du visiteur ne
 * peut plus faire refuser son message.
 */
function contactDocument(array $recu): ?array
{
    $bornes = [
        'page' => 200, 'formulaire' => 64, 'nom' => 120, 'courriel' => 200,
        'telephone' => 40, 'message' => 5000, 'cases' => 500, 'liste' => 120,
    ];
    $champs = [];
    foreach ($bornes as $cle => $max) {
        $valeur = $recu[$cle] ?? '';
        if (!is_string($valeur)) {
            $valeur = '';
        }
        $champs[$cle] = ['stringValue' => mb_substr($valeur, 0, $max)];
    }
    $champs['envoye'] = ['integerValue' => (string) (int) round(microtime(true) * 1000)];
    $champs['lu'] = ['booleanValue' => false];

    $utile = mb_strlen($champs['nom']['stringValue']) + mb_strlen($champs['courriel']['stringValue'])
        + mb_strlen($champs['telephone']['stringValue']) + mb_strlen($champs['message']['stringValue']);
    return $utile > 0 ? $champs : null;
}

/**
 * L'empreinte de l'adresse du demandeur.
 *
 * On ne garde pas les adresses des visiteurs d'un site vitrine : une
 * empreinte salée par le siteId suffit à compter, et le fichier de compteurs
 * n'est alors pas une liste de qui a écrit au client.
 */
function contactEmpreinteIp(string $sel): string
{
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
    return substr(hash('sha256', $sel . '|' . $ip), 0, 24);
}

/**
 * Compte cet envoi et dit quelle borne il dépasse, ou '' s'il passe.
 *
 * Le fichier est verrouillé pendant la lecture ET l'écriture : deux envois
 * simultanés qui liraient tous les deux « 2 » écriraient tous les deux « 3 »,
 * et la troisième borne ne servirait plus à rien.
 *
 * Le plafond du site est examiné d'abord, exprès : c'est lui qui protège la
 * facture, et c'est le seul qui tienne quand l'attaque arrive de mille
 * adresses différentes.
 */
function contactDebit(
    string $dossier,
    string $site,
    string $empreinte,
    int $maxHeure,
    int $maxJour,
    int $maxSite,
    int $maxSuivies
): string {
    $fichier = rtrim($dossier, '/') . '/admin-debit-' . substr(hash('sha256', $site), 0, 24) . '.json';
    $poignee = @fopen($fichier, 'c+');
    if ($poignee === false) {
        // Sans compteur possible, on préfère refuser : accepter reviendrait à
        // promettre une limite qu'on ne tient pas.
        return 'compteur';
    }
    try {
        if (!flock($poignee, LOCK_EX)) {
            return 'compteur';
        }
        $taille = (int) (fstat($poignee)['size'] ?? 0);
        $lu = $taille > 0 ? json_decode((string) fread($poignee, $taille), true) : null;
        $jour = gmdate('Y-m-d');
        $heure = gmdate('Y-m-d\TH');

        $etat = is_array($lu) && ($lu['jour'] ?? '') === $jour
            ? ['jour' => $jour, 'site' => (int) ($lu['site'] ?? 0), 'ip' => (array) ($lu['ip'] ?? [])]
            : ['jour' => $jour, 'site' => 0, 'ip' => []];

        if ($maxSite > 0 && $etat['site'] >= $maxSite) {
            return 'site-jour';
        }
        $connue = isset($etat['ip'][$empreinte]);
        if (!$connue && $maxSuivies > 0 && count($etat['ip']) >= $maxSuivies) {
            // Le plafond du site n'a pas encore parlé et le fichier est déjà
            // plein d'adresses distinctes : c'est une dispersion qu'un site
            // vitrine ne produit pas. On s'arrête là plutôt que de laisser
            // grossir un fichier sans fin.
            return 'dispersion';
        }

        $ligne = $connue ? (array) $etat['ip'][$empreinte] : ['h' => $heure, 'nh' => 0, 'nj' => 0];
        if (($ligne['h'] ?? '') !== $heure) {
            $ligne = ['h' => $heure, 'nh' => 0, 'nj' => (int) ($ligne['nj'] ?? 0)];
        }
        if ($maxHeure > 0 && (int) $ligne['nh'] >= $maxHeure) {
            return 'ip-heure';
        }
        if ($maxJour > 0 && (int) $ligne['nj'] >= $maxJour) {
            return 'ip-jour';
        }

        $ligne['nh'] = (int) $ligne['nh'] + 1;
        $ligne['nj'] = (int) $ligne['nj'] + 1;
        $etat['ip'][$empreinte] = $ligne;
        $etat['site']++;

        ftruncate($poignee, 0);
        rewind($poignee);
        fwrite($poignee, (string) json_encode($etat));
        fflush($poignee);
        return '';
    } finally {
        @flock($poignee, LOCK_UN);
        @fclose($poignee);
    }
}

/**
 * Le jeton du compte « facteur », pris au cache ou renouvelé.
 *
 * Pourquoi un compte plutôt que le dépôt anonyme : tant que le dépôt anonyme
 * est ouvert, ce relais ne limite rien — il suffit de l'ignorer et d'écrire
 * dans Firestore en direct. Le compte permet aux règles de FERMER ce chemin
 * tout en gardant le nôtre ouvert. Son rôle est « facteur » : il pose des
 * messages et ne sait rien lire.
 */
function contactJetonFacteur(
    string $hoteAuth,
    string $cle,
    string $courriel,
    string $motDePasse,
    string $dossier
): ?string {
    $cache = rtrim($dossier, '/') . '/admin-facteur-' . substr(hash('sha256', $courriel), 0, 24) . '.json';
    if (is_file($cache)) {
        $lu = json_decode((string) @file_get_contents($cache), true);
        if (is_array($lu) && (int) ($lu['expire'] ?? 0) > time() && ($lu['jeton'] ?? '') !== '') {
            return (string) $lu['jeton'];
        }
    }

    [$code, $reponse] = contactAppel(
        $hoteAuth . '/accounts:signInWithPassword?key=' . rawurlencode($cle),
        (string) json_encode([
            'email' => $courriel, 'password' => $motDePasse, 'returnSecureToken' => true,
        ]),
        ['content-type: application/json']
    );
    if ($code < 200 || $code >= 300) {
        error_log('admin-endpoint : le compte facteur a été refusé (' . $code . ')');
        return null;
    }
    $json = json_decode((string) $reponse, true);
    $jeton = is_array($json) ? (string) ($json['idToken'] ?? '') : '';
    if ($jeton === '') {
        return null;
    }
    // Cinq minutes de marge : un jeton qui expire pendant la requête ferait
    // perdre le message sans raison.
    $duree = max(60, (int) ($json['expiresIn'] ?? 3600) - 300);
    @file_put_contents($cache, (string) json_encode(['jeton' => $jeton, 'expire' => time() + $duree]));
    @chmod($cache, 0600);
    return $jeton;
}

/** Un POST JSON, et ce qu'il a répondu. */
function contactAppel(string $url, string $corps, array $entetes): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => $entetes,
        CURLOPT_POSTFIELDS     => $corps,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    $brut = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$code, $brut === false ? '' : (string) $brut];
}

fail('Action inconnue.', 404);
