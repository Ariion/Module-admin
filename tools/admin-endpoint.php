<?php
/**
 * Script serveur du module d'administration.
 *
 * Un seul fichier à déposer à la racine du site. Il rend deux services :
 *
 *   1. BIBLIOTHÈQUE MÉDIA — les images du client restent sur SON hébergement,
 *      dans un dossier /medias, sans abonnement supplémentaire.
 *
 *   2. RÉGÉNÉRATION DU HTML — à chaque publication, le fichier .html du site
 *      est réécrit avec le contenu à l'intérieur. C'est ce qui rend le module
 *      réellement optionnel : le client peut le supprimer quand il veut, son
 *      site garde tout ce qu'il a saisi.
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

// Hôtes d'où l'on accepte de rapatrier une image (action=import). Tout le
// reste est refusé : ce script ne doit pas devenir un aspirateur à URL.
$IMPORT_HOSTS = [
    'pixabay.com',
    'cdn.pixabay.com',
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

function fail(string $message, int $status = 400): void
{
    http_response_code($status);
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
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

fail('Action inconnue.', 404);
