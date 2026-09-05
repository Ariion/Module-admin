<?php
/**
 * Dépôt d'images sur l'hébergement du client (OVH, o2switch, tout hébergeur
 * mutualisé avec PHP).
 *
 * Pourquoi ce fichier : Firebase Storage impose le plan Blaze, donc une carte
 * bancaire par projet. Ici, les images restent chez le client, dans un simple
 * dossier servi par son propre domaine. Aucun abonnement supplémentaire, et
 * la bibliothèque reste consultable en FTP.
 *
 * Sécurité : seul un utilisateur authentifié sur VOTRE projet Firebase peut
 * écrire. Le script vérifie la signature du jeton d'identité (RS256) contre
 * les certificats publics de Google — il ne se contente pas de le décoder.
 *
 * INSTALLATION
 *   1. Renseignez $PROJECT_ID ci-dessous (identifiant du projet Firebase).
 *   2. Déposez ce fichier à la racine du site, par exemple /admin-media.php
 *   3. Créez le dossier /medias (chmod 755) à côté.
 *   4. Dans admin-config.js :
 *        media: { adapter: 'endpoint', endpoint: '/admin-media.php' }
 */

// ---------------------------------------------------------------- réglages
$PROJECT_ID   = 'mon-projet-firebase';   // OBLIGATOIRE
$MEDIA_DIR    = __DIR__ . '/medias';     // dossier de destination
$MEDIA_URL    = '/medias';               // URL publique de ce dossier
$MAX_BYTES    = 8 * 1024 * 1024;         // 8 Mo
$ALLOWED_UIDS = [];                      // vide = tout compte du projet
$ALLOWED_ORIGINS = [];                   // vide = même origine uniquement

$ALLOWED_TYPES = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/gif'  => 'gif',
    'image/webp' => 'webp',
    'image/avif' => 'avif',
    'image/svg+xml' => 'svg',
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

function currentUid(string $projectId, array $allowedUids): string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
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
    if ($upload['size'] > $MAX_BYTES) {
        fail('Fichier trop volumineux.');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = (string) $finfo->file($upload['tmp_name']);
    if (!isset($ALLOWED_TYPES[$mime])) {
        fail('Type de fichier refusé : ' . $mime);
    }
    // Un SVG peut contenir du script : on ne l'accepte pas par défaut.
    if ($mime === 'image/svg+xml') {
        fail('Les fichiers SVG ne sont pas acceptés.');
    }
    if (@getimagesize($upload['tmp_name']) === false) {
        fail('Le fichier n’est pas une image valide.');
    }

    $base = pathinfo((string) $upload['name'], PATHINFO_FILENAME);
    $base = strtolower(preg_replace('/[^A-Za-z0-9_-]+/', '-', $base) ?? '');
    $base = trim($base, '-');
    if ($base === '') {
        $base = 'image';
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

fail('Action inconnue.', 404);
