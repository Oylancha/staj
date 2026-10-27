<?php
// backend_php/api.php

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('upload_max_filesize', '64M');
ini_set('post_max_size', '64M');
ini_set('memory_limit', '128M');

set_exception_handler(function($e) {
    http_response_code(500);
    echo json_encode([
        "detail" => "Internal Server Error",
        "message" => $e->getMessage(),
        "file" => $e->getFile(),
        "line" => $e->getLine()
    ]);
    exit;
});

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, HEAD");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Authorization, X-Admin-Token, X-HTTP-Method-Override, X-Method-Override, X-Requested-With, Accept");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS' || $_SERVER['REQUEST_METHOD'] === 'HEAD') {
    http_response_code(200);
    exit;
}

header("Content-Type: application/json; charset=UTF-8");

$db_candidates = [
    __DIR__ . '/sql_app.db',
    __DIR__ . '/backend_php/sql_app.db',
    __DIR__ . '/../backend_php/sql_app.db',
    __DIR__ . '/../sql_app.db'
];
$db_file = __DIR__ . '/sql_app.db';
foreach ($db_candidates as $cand) {
    if (file_exists($cand) && filesize($cand) > 0) {
        $db_file = $cand;
        break;
    }
}

try {
    $db = new PDO("sqlite:" . $db_file);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $db->exec("PRAGMA journal_mode = WAL;");
    $db->exec("PRAGMA busy_timeout = 5000;");
    @chmod($db_file, 0640);
    @chmod(dirname($db_file), 0755);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["detail" => "Database connection failed", "error" => $e->getMessage()]);
    exit;
}

// Initialize tables if they don't exist
$db->exec("CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    hashed_password TEXT
)");

$db->exec("CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    image_url TEXT,
    manual_url TEXT,
    parent_id INTEGER
)");

$db->exec("CREATE TABLE IF NOT EXISTS product_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0
)");

$db->exec("CREATE TABLE IF NOT EXISTS \"references\" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT,
    logo_url TEXT,
    description TEXT,
    product_ids TEXT,
    images TEXT
)");

try {
    $db->exec("ALTER TABLE \"references\" ADD COLUMN images TEXT");
} catch (Exception $e) {
    // Column already exists
}

try {
    $db->exec("ALTER TABLE products ADD COLUMN sort_order INTEGER DEFAULT 0");
} catch (Exception $e) {}

try {
    $db->exec("ALTER TABLE products ADD COLUMN manual_sort_order INTEGER DEFAULT 0");
} catch (Exception $e) {}

try {
    $db->exec("ALTER TABLE \"references\" ADD COLUMN sort_order INTEGER DEFAULT 0");
} catch (Exception $e) {}

$db->exec("CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    cart_json TEXT,
    created_at TEXT,
    email_sent INTEGER DEFAULT 0,
    email_error TEXT
)");

$db->exec("CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT
)");

// Create default admin or repair if hash is missing
$stmt = $db->prepare("SELECT * FROM admin_users WHERE username = 'admin'");
$stmt->execute();
$adminUser = $stmt->fetch();
if (!$adminUser) {
    $hashed = password_hash('Serdar1', PASSWORD_BCRYPT);
    $stmt = $db->prepare("INSERT INTO admin_users (username, hashed_password) VALUES ('admin', ?)");
    $stmt->execute([$hashed]);
} else {
    $h = trim($adminUser['hashed_password'] ?? '');
    if (empty($h)) {
        $hashed = password_hash('Serdar1', PASSWORD_BCRYPT);
        $stmt = $db->prepare("UPDATE admin_users SET hashed_password = ? WHERE username = 'admin'");
        $stmt->execute([$hashed]);
    }
}

// JWT Helpers - Load or initialize persistent secure secret key
$SECRET_KEY = getenv('JWT_SECRET');
if (empty($SECRET_KEY)) {
    try {
        $stKey = $db->prepare("SELECT value FROM site_settings WHERE key = 'jwt_secret_key'");
        $stKey->execute();
        $rowKey = $stKey->fetch();
        if (!empty($rowKey['value'])) {
            $SECRET_KEY = $rowKey['value'];
        } else {
            $SECRET_KEY = bin2hex(random_bytes(32));
            $stIns = $db->prepare("INSERT INTO site_settings (key, value) VALUES ('jwt_secret_key', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
            $stIns->execute([$SECRET_KEY]);
        }
    } catch (\Exception $e) {
        $SECRET_KEY = hash('sha256', __DIR__ . php_uname());
    }
}

function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode($data) {
    return base64_decode(str_pad(strtr($data, '-_', '+/'), strlen($data) % 4, '=', STR_PAD_RIGHT));
}

function create_access_token($username) {
    global $SECRET_KEY;
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    // 30 days token validity for seamless admin experience
    $payload = json_encode(['sub' => $username, 'exp' => time() + (86400 * 30)]);
    $base64UrlHeader = base64url_encode($header);
    $base64UrlPayload = base64url_encode($payload);
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $SECRET_KEY, true);
    $base64UrlSignature = base64url_encode($signature);
    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

function get_request_token() {
    $headers = function_exists('apache_request_headers') ? apache_request_headers() : [];
    foreach ($headers as $k => $v) {
        $lk = strtolower($k);
        if ($lk === 'authorization' || $lk === 'x-authorization') {
            if (preg_match('/Bearer\s+(\S+)/i', $v, $m)) return $m[1];
            return trim($v);
        }
        if ($lk === 'x-admin-token') {
            return trim($v);
        }
    }
    
    $serverKeys = [
        'HTTP_AUTHORIZATION',
        'REDIRECT_HTTP_AUTHORIZATION',
        'HTTP_X_AUTHORIZATION',
        'REDIRECT_HTTP_X_AUTHORIZATION',
        'HTTP_X_ADMIN_TOKEN',
        'REDIRECT_HTTP_X_ADMIN_TOKEN'
    ];
    foreach ($serverKeys as $sk) {
        if (!empty($_SERVER[$sk])) {
            $val = trim($_SERVER[$sk]);
            if (preg_match('/Bearer\s+(\S+)/i', $val, $m)) return $m[1];
            return $val;
        }
    }
    
    if (!empty($_GET['token'])) return trim($_GET['token']);
    if (!empty($_GET['access_token'])) return trim($_GET['access_token']);
    
    global $input;
    if (!empty($input['token'])) return trim($input['token']);
    if (!empty($input['access_token'])) return trim($input['access_token']);
    
    return null;
}

function verify_token() {
    global $SECRET_KEY;
    $token = get_request_token();
    
    if (empty($token)) {
        http_response_code(401);
        echo json_encode(["detail" => "Yetkilendirme hatası (Oturum açılmamış)."]);
        exit;
    }
    
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        http_response_code(401);
        echo json_encode(["detail" => "Geçersiz oturum belirteci formatı."]);
        exit;
    }
    
    $header = $parts[0];
    $payload = $parts[1];
    $signature_provided = $parts[2];
    
    // Verify signature against primary SECRET_KEY and legacy keys for active sessions
    $valid = false;
    $keys_to_check = array_unique(array_filter([
        $SECRET_KEY,
        "SUPER_SECRET_KEY_FOR_DRAFT",
        "4f8a9d123e4b7c89f012a345b6789cde87654321fedcba0987654321",
        hash('sha256', __DIR__ . php_uname())
    ]));

    foreach ($keys_to_check as $k) {
        $sig = hash_hmac('sha256', $header . "." . $payload, $k, true);
        if (hash_equals(base64url_encode($sig), $signature_provided)) {
            $valid = true;
            break;
        }
    }
    
    if (!$valid) {
        http_response_code(401);
        echo json_encode(["detail" => "Yetkilendirme imzası geçersiz. Lütfen tekrar giriş yapın."]);
        exit;
    }
    
    $payload_data = json_decode(base64url_decode($payload), true);
    if (!is_array($payload_data) || ($payload_data['exp'] ?? 0) < time()) {
        http_response_code(401);
        echo json_encode(["detail" => "Oturum süresi doldu. Lütfen tekrar giriş yapın."]);
        exit;
    }
    
    return $payload_data['sub'] ?? 'admin';
}

function process_image_url($url) {
    if (empty($url) || !is_string($url)) return $url;
    if (strpos($url, 'data:') === 0 && ($pos = strpos($url, ';base64,')) !== false) {
        $header = substr($url, 0, $pos);
        $base64_data = substr($url, $pos + 8);
        $ext = 'jpg';
        if (stripos($header, 'application/pdf') !== false) $ext = 'pdf';
        elseif (stripos($header, 'image/png') !== false) $ext = 'png';
        elseif (stripos($header, 'image/webp') !== false) $ext = 'webp';
        elseif (stripos($header, 'image/gif') !== false) $ext = 'gif';
        else return $url; // Disallow SVG or unknown formats via base64
        
        $data = base64_decode($base64_data);
        if ($data !== false && strlen($data) > 0) {
            $images_dir = get_images_dir();
            $filename = bin2hex(random_bytes(16)) . '.' . $ext;
            $dest = $images_dir . '/' . $filename;
            if (@file_put_contents($dest, $data)) {
                @chmod($dest, 0644);
                return 'images/' . $filename;
            }
        }
    }
    return $url;
}

// Router
$request_uri = $_GET['request'] ?? $_SERVER['PATH_INFO'] ?? '';
if (empty($request_uri) && !empty($_SERVER['REQUEST_URI'])) {
    $parsed_path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '';
    if (preg_match('#(?:backend_php/api\.php/|/api/)(.+)$#', $parsed_path, $matches)) {
        $request_uri = $matches[1];
    }
}
$request_uri = preg_replace('#^api/#', '', trim($request_uri, '/'));

// Strip any query parameters embedded in request parameter
if (strpos($request_uri, '?') !== false) {
    $parts = explode('?', $request_uri, 2);
    $request_uri = $parts[0];
    parse_str($parts[1], $extra_params);
    $_GET = array_merge($_GET, $extra_params);
}

$raw_input = file_get_contents('php://input');
$input = !empty($raw_input) ? json_decode($raw_input, true) : [];
if (!is_array($input) && !empty($_POST)) {
    $input = $_POST;
}
if (!is_array($input)) {
    $input = [];
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$methodOverride = $_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'] 
    ?? $_SERVER['HTTP_X_METHOD_OVERRIDE'] 
    ?? ($_GET['_method'] ?? ($input['_method'] ?? null));
if (!empty($methodOverride)) {
    $method = strtoupper(trim($methodOverride));
}

// Helper to fetch images for a product
function get_product_images($db, $product_id) {
    $stmt = $db->prepare("SELECT id, product_id, image_url, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, id ASC");
    $stmt->execute([(int)$product_id]);
    $images = $stmt->fetchAll();
    foreach ($images as &$img) {
        $img['id'] = (int)$img['id'];
        $img['product_id'] = (int)$img['product_id'];
        $img['sort_order'] = (int)$img['sort_order'];
    }
    return $images;
}

// ── Health / Diagnostic Ping Route ──
if ($request_uri === 'ping') {
    $db_writable = is_writable($db_file) && is_writable(dirname($db_file));
    $images_dir = get_images_dir();
    $images_writable = is_dir($images_dir) && is_writable($images_dir);

    echo json_encode([
        "status" => "ok",
        "time" => date('Y-m-d H:i:s'),
        "db_connected" => true,
        "db_writable" => $db_writable,
        "images_writable" => $images_writable
    ]);
    exit;
}

// ── Auth Routes ──

function verify_admin_password($password, $db_hash) {
    if (empty($password) || empty($db_hash)) return false;
    if (password_verify($password, $db_hash)) return true;
    if (strpos($db_hash, '$2b$') === 0) {
        $alt = '$2y$' . substr($db_hash, 4);
        if (password_verify($password, $alt)) return true;
    } else if (strpos($db_hash, '$2y$') === 0) {
        $alt = '$2b$' . substr($db_hash, 4);
        if (password_verify($password, $alt)) return true;
    } else if (strpos($db_hash, '$2a$') === 0) {
        $alt = '$2y$' . substr($db_hash, 4);
        if (password_verify($password, $alt)) return true;
    }
    return false;
}

if ($method === 'POST' && $request_uri === 'login') {
    $username = trim($input['username'] ?? '');
    $password = trim($input['password'] ?? '');
    
    if (empty($username) || empty($password)) {
        http_response_code(400);
        echo json_encode(["detail" => "Kullanıcı adı ve şifre gereklidir."]);
        exit;
    }

    $stmt = $db->prepare("SELECT * FROM admin_users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    
    $db_hash = $user ? ($user['hashed_password'] ?? '') : '';

    if ($user && verify_admin_password($password, $db_hash)) {
        if (password_needs_rehash($db_hash, PASSWORD_BCRYPT) || strpos($db_hash, '$2y$') !== 0) {
            $new_h = password_hash($password, PASSWORD_BCRYPT);
            try {
                $up = $db->prepare("UPDATE admin_users SET hashed_password = ? WHERE username = ?");
                $up->execute([$new_h, $username]);
            } catch (Exception $e) {}
        }
        $token = create_access_token($username);
        echo json_encode(["access_token" => $token, "token_type" => "bearer"]);
    } else {
        http_response_code(400);
        echo json_encode(["detail" => "Geçersiz kullanıcı adı veya şifre."]);
    }
    exit;
}

if ($method === 'POST' && $request_uri === 'change-password') {
    $username = trim($input['username'] ?? '');
    $current_password = trim($input['current_password'] ?? '');
    $new_password = trim($input['new_password'] ?? '');
    
    if (empty($username) || empty($current_password) || empty($new_password)) {
        http_response_code(400);
        echo json_encode(["detail" => "Tüm alanları doldurunuz."]);
        exit;
    }
    
    if (strlen($new_password) < 6) {
        http_response_code(400);
        echo json_encode(["detail" => "Yeni şifre en az 6 karakter olmalıdır."]);
        exit;
    }
    
    $stmt = $db->prepare("SELECT * FROM admin_users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    
    if (!$user) {
        http_response_code(400);
        echo json_encode(["detail" => "Kullanıcı bulunamadı."]);
        exit;
    }

    $db_hash = $user['hashed_password'] ?? '';
    if (!verify_admin_password($current_password, $db_hash)) {
        http_response_code(400);
        echo json_encode(["detail" => "Mevcut şifre hatalı."]);
        exit;
    }
    
    $new_hashed = password_hash($new_password, PASSWORD_BCRYPT);
    $stmt = $db->prepare("UPDATE admin_users SET hashed_password = ? WHERE username = ?");
    $stmt->execute([$new_hashed, $username]);
    
    echo json_encode(["message" => "Şifre başarıyla değiştirildi."]);
    exit;
}

// ── Product Routes ──

if ($method === 'GET' && $request_uri === 'products') {
    $with_images = isset($_GET['with_images']) && $_GET['with_images'] === '1';
    $stmt = $db->query("SELECT * FROM products ORDER BY CASE WHEN sort_order IS NOT NULL AND sort_order > 0 THEN sort_order ELSE id END ASC, id ASC");
    $products = $stmt->fetchAll();
    foreach ($products as &$p) {
        $p['id'] = (int)$p['id'];
        $p['parent_id'] = $p['parent_id'] !== null ? (int)$p['parent_id'] : null;
        $p['sort_order'] = isset($p['sort_order']) ? (int)$p['sort_order'] : 0;
        $p['manual_sort_order'] = isset($p['manual_sort_order']) ? (int)$p['manual_sort_order'] : 0;
        if ($with_images) {
            $p['images'] = get_product_images($db, $p['id']);
        }
    }
    echo json_encode($products);
    exit;
}

if ($method === 'POST' && $request_uri === 'products/reorder') {
    verify_token();
    $order = $input['order'] ?? $input;
    if (is_array($order)) {
        $stmt = $db->prepare("UPDATE products SET sort_order = ? WHERE id = ?");
        foreach ($order as $index => $item) {
            $pid = is_array($item) ? ($item['id'] ?? null) : $item;
            $sort = is_array($item) ? ($item['sort_order'] ?? $index) : $index;
            if ($pid !== null) {
                $stmt->execute([(int)$sort, (int)$pid]);
            }
        }
    }
    echo json_encode(["status" => "success", "message" => "Ürün sıralaması güncellendi."]);
    exit;
}

if ($method === 'POST' && $request_uri === 'products/reorder-manuals') {
    verify_token();
    $order = $input['order'] ?? $input;
    if (is_array($order)) {
        $stmt = $db->prepare("UPDATE products SET manual_sort_order = ? WHERE id = ?");
        foreach ($order as $index => $item) {
            $pid = is_array($item) ? ($item['id'] ?? null) : $item;
            $sort = is_array($item) ? ($item['manual_sort_order'] ?? $index) : $index;
            if ($pid !== null) {
                $stmt->execute([(int)$sort, (int)$pid]);
            }
        }
    }
    echo json_encode(["status" => "success", "message" => "Kılavuz sıralaması güncellendi."]);
    exit;
}

if ($method === 'GET' && preg_match('/^products\/(\d+)$/', $request_uri, $matches)) {
    $id = (int)$matches[1];
    $stmt = $db->prepare("SELECT * FROM products WHERE id = ?");
    $stmt->execute([$id]);
    $product = $stmt->fetch();
    if ($product) {
        $product['id'] = (int)$product['id'];
        $product['parent_id'] = $product['parent_id'] !== null ? (int)$product['parent_id'] : null;
        $product['sort_order'] = isset($product['sort_order']) ? (int)$product['sort_order'] : 0;
        $product['manual_sort_order'] = isset($product['manual_sort_order']) ? (int)$product['manual_sort_order'] : 0;
        $product['images'] = get_product_images($db, $product['id']);
        echo json_encode($product);
    } else {
        http_response_code(404);
        echo json_encode(["detail" => "Product not found"]);
    }
    exit;
}

if ($method === 'POST' && $request_uri === 'products') {
    verify_token();
    $name = trim($input['name'] ?? '');
    if (empty($name)) {
        http_response_code(400);
        echo json_encode(["detail" => "Ürün adı boş olamaz."]);
        exit;
    }
    $description = $input['description'] ?? '';
    $image_url = process_image_url($input['image_url'] ?? null);
    $manual_url = process_image_url($input['manual_url'] ?? null);
    $parent_id = !empty($input['parent_id']) ? (int)$input['parent_id'] : null;
    $sort_order = isset($input['sort_order']) ? (int)$input['sort_order'] : null;
    $manual_sort_order = isset($input['manual_sort_order']) ? (int)$input['manual_sort_order'] : null;
    
    try {
        $stmtMax = $db->query("SELECT MAX(sort_order) AS max_s, MAX(manual_sort_order) AS max_m FROM products");
        $maxRow = $stmtMax->fetch();
        if ($sort_order === null) $sort_order = ($maxRow && $maxRow['max_s'] !== null) ? ((int)$maxRow['max_s'] + 1) : 1;
        if ($manual_sort_order === null) $manual_sort_order = ($maxRow && $maxRow['max_m'] !== null) ? ((int)$maxRow['max_m'] + 1) : 1;

        $stmt = $db->prepare("INSERT INTO products (name, description, image_url, manual_url, parent_id, sort_order, manual_sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$name, $description, $image_url, $manual_url, $parent_id, $sort_order, $manual_sort_order]);
        $id = (int)$db->lastInsertId();
        
        // Save any extra images passed directly in payload
        $images = $input['images'] ?? [];
        if (is_array($images) && count($images) > 0) {
            $stmtImg = $db->prepare("INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, ?)");
            $cnt = 0;
            foreach ($images as $imgItem) {
                $u = is_array($imgItem) ? ($imgItem['image_url'] ?? '') : (string)$imgItem;
                $u = process_image_url(trim($u));
                if (!empty($u) && $u !== $image_url) {
                    $stmtImg->execute([$id, $u, $cnt++]);
                }
            }
        }
        
        $stmt = $db->prepare("SELECT * FROM products WHERE id = ?");
        $stmt->execute([$id]);
        $product = $stmt->fetch();
        $product['id'] = (int)$product['id'];
        $product['parent_id'] = $product['parent_id'] !== null ? (int)$product['parent_id'] : null;
        $product['images'] = get_product_images($db, $product['id']);
        echo json_encode($product);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["detail" => "Veritabanı kayıt hatası (sql_app.db yazma izinlerini kontrol edin): " . $e->getMessage()]);
    }
    exit;
}

if (($method === 'PUT' || $method === 'POST') && preg_match('/^products\/(\d+)$/', $request_uri, $matches)) {
    verify_token();
    $id = (int)$matches[1];
    
    try {
        $stmt = $db->prepare("SELECT * FROM products WHERE id = ?");
        $stmt->execute([$id]);
        $existing = $stmt->fetch();
        
        $name = isset($input['name']) && $input['name'] !== '' ? trim($input['name']) : ($existing ? $existing['name'] : '');
        $description = isset($input['description']) ? $input['description'] : ($existing ? $existing['description'] : '');
        $image_url = array_key_exists('image_url', $input) ? process_image_url($input['image_url']) : ($existing ? $existing['image_url'] : null);
        $manual_url = array_key_exists('manual_url', $input) ? process_image_url($input['manual_url']) : ($existing ? $existing['manual_url'] : null);
        $parent_id = array_key_exists('parent_id', $input) ? (!empty($input['parent_id']) ? (int)$input['parent_id'] : null) : ($existing ? $existing['parent_id'] : null);
        
        $sort_order = array_key_exists('sort_order', $input) ? (int)$input['sort_order'] : ($existing ? (int)($existing['sort_order'] ?? 0) : 0);
        $manual_sort_order = array_key_exists('manual_sort_order', $input) ? (int)$input['manual_sort_order'] : ($existing ? (int)($existing['manual_sort_order'] ?? 0) : 0);
        
        if (!$existing) {
            $stmt = $db->prepare("INSERT INTO products (id, name, description, image_url, manual_url, parent_id, sort_order, manual_sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$id, $name, $description, $image_url, $manual_url, $parent_id, $sort_order, $manual_sort_order]);
        } else {
            $stmt = $db->prepare("UPDATE products SET name = ?, description = ?, image_url = ?, manual_url = ?, parent_id = ?, sort_order = ?, manual_sort_order = ? WHERE id = ?");
            $stmt->execute([$name, $description, $image_url, $manual_url, $parent_id, $sort_order, $manual_sort_order, $id]);
        }

        if (isset($input['images']) && is_array($input['images'])) {
            $stmtDel = $db->prepare("DELETE FROM product_images WHERE product_id = ?");
            $stmtDel->execute([$id]);
            $stmtImg = $db->prepare("INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, ?)");
            $cnt = 0;
            foreach ($input['images'] as $imgItem) {
                $u = is_array($imgItem) ? ($imgItem['image_url'] ?? '') : (string)$imgItem;
                $u = process_image_url(trim($u));
                if (!empty($u) && $u !== $image_url) {
                    $stmtImg->execute([$id, $u, $cnt++]);
                }
            }
        }
        
        $stmt = $db->prepare("SELECT * FROM products WHERE id = ?");
        $stmt->execute([$id]);
        $product = $stmt->fetch();
        $product['id'] = (int)$product['id'];
        $product['parent_id'] = $product['parent_id'] !== null ? (int)$product['parent_id'] : null;
        $product['sort_order'] = isset($product['sort_order']) ? (int)$product['sort_order'] : 0;
        $product['manual_sort_order'] = isset($product['manual_sort_order']) ? (int)$product['manual_sort_order'] : 0;
        $product['images'] = get_product_images($db, $product['id']);
        echo json_encode($product);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["detail" => "Veritabanı güncelleme hatası: " . $e->getMessage()]);
    }
    exit;
}

if (($method === 'DELETE' || ($method === 'POST' && preg_match('/\/delete$/', $request_uri))) && preg_match('/^products\/(\d+)(?:\/delete)?$/', $request_uri, $matches)) {
    verify_token();
    $id = (int)$matches[1];
    
    try {
        $stmt = $db->prepare("UPDATE products SET parent_id = NULL WHERE parent_id = ?");
        $stmt->execute([$id]);
        $stmt = $db->prepare("DELETE FROM product_images WHERE product_id = ?");
        $stmt->execute([$id]);
        $stmt = $db->prepare("DELETE FROM products WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["message" => "Product deleted"]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["detail" => "Veritabanı silme hatası: " . $e->getMessage()]);
    }
    exit;
}

// ── Product Images (Task 1: Max 20 Photos) ──

if ($method === 'POST' && preg_match('/^products\/(\d+)\/images$/', $request_uri, $matches)) {
    verify_token();
    $product_id = (int)$matches[1];
    
    $stmt = $db->prepare("SELECT COUNT(*) as cnt FROM product_images WHERE product_id = ?");
    $stmt->execute([$product_id]);
    $row = $stmt->fetch();
    if (($row['cnt'] ?? 0) >= 20) {
        http_response_code(400);
        echo json_encode(["detail" => "Bir ürün için en fazla 20 adet görsel eklenebilir."]);
        exit;
    }
    
    $image_url = process_image_url($input['image_url'] ?? '');
    $sort_order = isset($input['sort_order']) ? (int)$input['sort_order'] : (int)($row['cnt'] ?? 0);
    
    if (empty($image_url)) {
        http_response_code(400);
        echo json_encode(["detail" => "Görsel URL gereklidir."]);
        exit;
    }
    
    $stmt = $db->prepare("INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, ?)");
    $stmt->execute([$product_id, $image_url, $sort_order]);
    $img_id = (int)$db->lastInsertId();
    
    echo json_encode([
        "id" => $img_id,
        "product_id" => $product_id,
        "image_url" => $image_url,
        "sort_order" => $sort_order
    ]);
    exit;
}

if ($method === 'POST' && preg_match('/^products\/(\d+)\/images\/batch$/', $request_uri, $matches)) {
    verify_token();
    $product_id = (int)$matches[1];
    
    $stmt = $db->prepare("SELECT COUNT(*) as cnt FROM product_images WHERE product_id = ?");
    $stmt->execute([$product_id]);
    $row = $stmt->fetch();
    $current_cnt = (int)($row['cnt'] ?? 0);
    
    $urls = $input['image_urls'] ?? [];
    if (!is_array($urls)) $urls = [];
    
    $available = max(0, 20 - $current_cnt);
    $urls = array_slice($urls, 0, $available);
    
    $results = [];
    $stmt = $db->prepare("INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, ?)");
    foreach ($urls as $idx => $u) {
        $u = process_image_url(trim((string)$u));
        if (empty($u)) continue;
        $order = $current_cnt + $idx;
        $stmt->execute([$product_id, $u, $order]);
        $results[] = [
            "id" => (int)$db->lastInsertId(),
            "product_id" => $product_id,
            "image_url" => $u,
            "sort_order" => $order
        ];
    }
    echo json_encode($results);
    exit;
}

if (($method === 'DELETE' || ($method === 'POST' && preg_match('/\/delete$/', $request_uri))) && preg_match('/^products\/(\d+)\/images\/(\d+)(?:\/delete)?$/', $request_uri, $matches)) {
    verify_token();
    $product_id = (int)$matches[1];
    $image_id = (int)$matches[2];
    
    $stmt = $db->prepare("DELETE FROM product_images WHERE id = ? AND product_id = ?");
    $stmt->execute([$image_id, $product_id]);
    
    echo json_encode(["message" => "Görsel silindi."]);
    exit;
}

// ── References Routes (Task 2 & 3) ──

if ($method === 'GET' && $request_uri === 'references') {
    $stmt = $db->query("SELECT * FROM \"references\" ORDER BY CASE WHEN sort_order IS NOT NULL AND sort_order > 0 THEN sort_order ELSE id END ASC, id ASC");
    $refs = $stmt->fetchAll();
    foreach ($refs as &$r) {
        $r['id'] = (int)$r['id'];
        $r['sort_order'] = isset($r['sort_order']) ? (int)$r['sort_order'] : 0;
        if (!empty($r['images'])) {
            $decoded = json_decode($r['images'], true);
            $r['images'] = is_array($decoded) ? $decoded : [];
        } else {
            $r['images'] = [];
        }
    }
    echo json_encode($refs);
    exit;
}

if ($method === 'POST' && $request_uri === 'references/reorder') {
    verify_token();
    $order = $input['order'] ?? $input;
    if (is_array($order)) {
        $stmt = $db->prepare("UPDATE \"references\" SET sort_order = ? WHERE id = ?");
        foreach ($order as $index => $item) {
            $rid = is_array($item) ? ($item['id'] ?? null) : $item;
            $sort = is_array($item) ? ($item['sort_order'] ?? $index) : $index;
            if ($rid !== null) {
                $stmt->execute([(int)$sort, (int)$rid]);
            }
        }
    }
    echo json_encode(["status" => "success", "message" => "Referans sıralaması güncellendi."]);
    exit;
}

if ($method === 'GET' && preg_match('/^references\/(\d+)$/', $request_uri, $matches)) {
    $id = (int)$matches[1];
    $stmt = $db->prepare("SELECT * FROM \"references\" WHERE id = ?");
    $stmt->execute([$id]);
    $ref = $stmt->fetch();
    if ($ref) {
        $ref['id'] = (int)$ref['id'];
        $ref['sort_order'] = isset($ref['sort_order']) ? (int)$ref['sort_order'] : 0;
        if (!empty($ref['images'])) {
            $decoded = json_decode($ref['images'], true);
            $ref['images'] = is_array($decoded) ? $decoded : [];
        } else {
            $ref['images'] = [];
        }
        echo json_encode($ref);
    } else {
        http_response_code(404);
        echo json_encode(["detail" => "Referans bulunamadı."]);
    }
    exit;
}

if ($method === 'POST' && $request_uri === 'references') {
    verify_token();
    $company_name = trim($input['company_name'] ?? '');
    if (empty($company_name)) {
        http_response_code(400);
        echo json_encode(["detail" => "Firma veya kurum adı boş olamaz."]);
        exit;
    }
    $logo_url = process_image_url($input['logo_url'] ?? null);
    $description = $input['description'] ?? null;
    $product_ids = $input['product_ids'] ?? '[]';
    if (is_array($product_ids)) {
        $product_ids = json_encode($product_ids);
    }
    $sort_order = isset($input['sort_order']) ? (int)$input['sort_order'] : null;
    if ($sort_order === null) {
        $stmtMax = $db->query("SELECT MAX(sort_order) AS max_s FROM \"references\"");
        $maxRow = $stmtMax->fetch();
        $sort_order = ($maxRow && $maxRow['max_s'] !== null) ? ((int)$maxRow['max_s'] + 1) : 1;
    }

    $images = $input['images'] ?? [];
    $processed = [];
    if (is_array($images)) {
        foreach (array_slice($images, 0, 20) as $idx => $img) {
            if (is_array($img)) {
                if (isset($img['image_url'])) $img['image_url'] = process_image_url($img['image_url']);
                if (empty($img['id'])) $img['id'] = time() + $idx;
                $processed[] = $img;
            } else if (is_string($img)) {
                $u = process_image_url($img);
                $processed[] = [
                    "id" => time() + $idx,
                    "image_url" => $u,
                    "sort_order" => $idx
                ];
            }
        }
        $images = json_encode($processed);
    } else if (is_string($images)) {
        // already string
    }
    
    try {
        $stmt = $db->prepare("INSERT INTO \"references\" (company_name, logo_url, description, product_ids, images, sort_order) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$company_name, $logo_url, $description, $product_ids, $images, $sort_order]);
        $id = (int)$db->lastInsertId();
        
        echo json_encode([
            "id" => $id,
            "company_name" => $company_name,
            "logo_url" => $logo_url,
            "description" => $description,
            "product_ids" => $product_ids,
            "sort_order" => $sort_order,
            "images" => json_decode($images, true) ?: []
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["detail" => "Veritabanı kayıt hatası (Referans eklenemedi): " . $e->getMessage()]);
    }
    exit;
}

if (($method === 'PUT' || $method === 'POST') && preg_match('/^references\/(\d+)$/', $request_uri, $matches)) {
    verify_token();
    $id = (int)$matches[1];
    
    try {
        $stmtOld = $db->prepare("SELECT * FROM \"references\" WHERE id = ?");
        $stmtOld->execute([$id]);
        $existing = $stmtOld->fetch();
        
        $company_name = isset($input['company_name']) && $input['company_name'] !== '' ? trim($input['company_name']) : ($existing ? $existing['company_name'] : '');
        $logo_url = array_key_exists('logo_url', $input) ? process_image_url($input['logo_url']) : ($existing ? $existing['logo_url'] : null);
        $description = array_key_exists('description', $input) ? $input['description'] : ($existing ? $existing['description'] : null);
        $sort_order = array_key_exists('sort_order', $input) ? (int)$input['sort_order'] : ($existing ? (int)($existing['sort_order'] ?? 0) : 0);
        
        $product_ids = array_key_exists('product_ids', $input) ? $input['product_ids'] : ($existing ? $existing['product_ids'] : '[]');
        if (is_array($product_ids)) {
            $product_ids = json_encode($product_ids);
        }
        
        $images = array_key_exists('images', $input) ? $input['images'] : ($existing ? $existing['images'] : '[]');
        if (is_array($images)) {
            $processed = [];
            foreach (array_slice($images, 0, 20) as $idx => $img) {
                if (is_array($img)) {
                    if (isset($img['image_url'])) $img['image_url'] = process_image_url($img['image_url']);
                    if (empty($img['id'])) $img['id'] = time() + $idx;
                    $processed[] = $img;
                } else if (is_string($img)) {
                    $u = process_image_url($img);
                    $processed[] = [
                        "id" => time() + $idx,
                        "image_url" => $u,
                        "sort_order" => $idx
                    ];
                }
            }
            $images = json_encode($processed);
        }
        
        if (!$existing) {
            $stmt = $db->prepare("INSERT INTO \"references\" (id, company_name, logo_url, description, product_ids, images, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$id, $company_name, $logo_url, $description, $product_ids, $images, $sort_order]);
        } else {
            $stmt = $db->prepare("UPDATE \"references\" SET company_name = ?, logo_url = ?, description = ?, product_ids = ?, images = ?, sort_order = ? WHERE id = ?");
            $stmt->execute([$company_name, $logo_url, $description, $product_ids, $images, $sort_order, $id]);
        }
        
        echo json_encode([
            "id" => $id,
            "company_name" => $company_name,
            "logo_url" => $logo_url,
            "description" => $description,
            "product_ids" => $product_ids,
            "sort_order" => $sort_order,
            "images" => json_decode($images, true) ?: []
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["detail" => "Veritabanı güncelleme hatası (Referans güncellenemedi): " . $e->getMessage()]);
    }
    exit;
}

if (($method === 'DELETE' || ($method === 'POST' && preg_match('/\/delete$/', $request_uri))) && preg_match('/^references\/(\d+)(?:\/delete)?$/', $request_uri, $matches)) {
    verify_token();
    $id = (int)$matches[1];
    
    try {
        $stmt = $db->prepare("DELETE FROM \"references\" WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["message" => "Referans silindi."]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["detail" => "Veritabanı silme hatası: " . $e->getMessage()]);
    }
    exit;
}

// ── Images & Files ──

function get_images_dir() {
    $candidates = [
        __DIR__ . '/images',
        __DIR__ . '/../images',
        __DIR__ . '/../frontend/images',
        __DIR__ . '/frontend/images',
        __DIR__ . '/../public_html/images',
        __DIR__ . '/public_html/images'
    ];
    foreach ($candidates as $cand) {
        if (is_dir($cand) && is_writable($cand)) {
            return realpath($cand) ?: $cand;
        }
    }
    foreach ($candidates as $cand) {
        if (is_dir($cand)) {
            @chmod($cand, 0777);
            return realpath($cand) ?: $cand;
        }
    }
    foreach ([__DIR__ . '/images', __DIR__ . '/../images'] as $cand) {
        if (@mkdir($cand, 0755, true) || is_dir($cand)) {
            @chmod($cand, 0755);
            return realpath($cand) ?: $cand;
        }
    }
    return __DIR__ . '/images';
}

if ($method === 'POST' && $request_uri === 'upload') {
    verify_token();
    
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        $errCode = isset($_FILES['file']) ? $_FILES['file']['error'] : 'no file';
        echo json_encode(["detail" => "Dosya yükleme hatası. Kod: " . $errCode]);
        exit;
    }
    
    // File size limit: 20 MB
    if ($_FILES['file']['size'] > 20 * 1024 * 1024) {
        http_response_code(400);
        echo json_encode(["detail" => "Dosya boyutu 20 MB'dan büyük olamaz."]);
        exit;
    }
    
    $images_dir = get_images_dir();
    $fileInfo = pathinfo($_FILES['file']['name']);
    $ext = isset($fileInfo['extension']) ? strtolower($fileInfo['extension']) : 'jpg';
    
    $allowed_exts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf'];
    if (!in_array($ext, $allowed_exts)) {
        http_response_code(400);
        echo json_encode(["detail" => "Yalnızca JPG, PNG, WEBP, GIF ve PDF formatları desteklenmektedir."]);
        exit;
    }
    
    // MIME validation
    if (function_exists('finfo_open')) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $_FILES['file']['tmp_name']);
        finfo_close($finfo);
        
        $allowed_mimes = [
            'jpg' => ['image/jpeg', 'image/pjpeg'],
            'jpeg' => ['image/jpeg', 'image/pjpeg'],
            'png' => ['image/png'],
            'webp' => ['image/webp'],
            'gif' => ['image/gif'],
            'pdf' => ['application/pdf', 'application/x-pdf']
        ];
        
        if (!isset($allowed_mimes[$ext]) || !in_array($mime, $allowed_mimes[$ext])) {
            http_response_code(400);
            echo json_encode(["detail" => "Geçersiz veya şüpheli dosya içeriği tespit edildi."]);
            exit;
        }
    }
    
    $new_filename = bin2hex(random_bytes(16)) . '.' . $ext;
    $dest_path = $images_dir . '/' . $new_filename;
    
    if (move_uploaded_file($_FILES['file']['tmp_name'], $dest_path)) {
        @chmod($dest_path, 0644);
        echo json_encode(["url" => "images/" . $new_filename]);
    } else {
        http_response_code(500);
        echo json_encode(["detail" => "Dosya kaydedilemedi."]);
    }
    exit;
}

if ($method === 'GET' && $request_uri === 'download') {
    $file_path = isset($_GET['file']) ? $_GET['file'] : '';
    if (empty($file_path)) {
        http_response_code(400);
        echo json_encode(["detail" => "No file specified"]);
        exit;
    }
    
    $file_path = basename($file_path);
    $base_dir = get_images_dir();
    $full_path = $base_dir . '/' . $file_path;
    
    if (!file_exists($full_path) || !is_file($full_path)) {
        http_response_code(404);
        echo json_encode(["detail" => "File not found"]);
        exit;
    }
    
    $ext = strtolower(pathinfo($full_path, PATHINFO_EXTENSION));
    $mime_types = [
        'pdf' => 'application/pdf',
        'doc' => 'application/msword',
        'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'gif' => 'image/gif',
        'bmp' => 'image/bmp',
        'svg' => 'image/svg+xml'
    ];
    $content_type = $mime_types[$ext] ?? 'application/octet-stream';
    
    header_remove('Content-Type');
    header('Content-Type: ' . $content_type);
    header('Content-Disposition: attachment; filename="' . $file_path . '"');
    header('Content-Length: ' . filesize($full_path));
    header('Cache-Control: no-cache, must-revalidate');
    
    readfile($full_path);
    exit;
}

// ── Orders / Email Sending (Task 4) ──

if ($method === 'GET' && $request_uri === 'orders') {
    verify_token();
    $stmt = $db->query("SELECT * FROM orders ORDER BY id DESC");
    echo json_encode($stmt->fetchAll());
    exit;
}

if ($method === 'POST' && $request_uri === 'order') {
    $turnstile_secret = getenv('CF_TURNSTILE_SECRET') ?: '0x4AAAAAAEdwCS_kAa1uAdhNVWuZwKU6QY0';
    $token = trim($input['cf_turnstile_response'] ?? '');
    
    // In local development or testing environments, allow proceeding ONLY if strictly localhost IP
    $remote_ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $is_local = in_array($remote_ip, ['127.0.0.1', '::1']);
    
    if (!$is_local) {
        if (empty($token)) {
            http_response_code(400);
            echo json_encode(["detail" => "Güvenlik doğrulaması gereklidir (Bot koruması)."]);
            exit;
        }

        if (function_exists('curl_init')) {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
            curl_setopt($ch, CURLOPT_POST, 1);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
                'secret' => $turnstile_secret,
                'response' => $token,
                'remoteip' => $remote_ip
            ]));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            $verifyResponse = curl_exec($ch);
            curl_close($ch);

            $responseData = json_decode($verifyResponse);
            if (!$responseData || empty($responseData->success)) {
                http_response_code(400);
                echo json_encode(["detail" => "Güvenlik doğrulaması başarısız oldu (Bot tespit edildi)."]);
                exit;
            }
        }
    }

    // Sanitize user inputs and prevent email header injection (strip newlines)
    $clean_str = function($val) {
        $val = str_replace(["\r", "\n", "\0"], '', (string)$val);
        return trim(strip_tags($val));
    };

    $company = $clean_str($input['companyName'] ?? 'Bilinmiyor');
    $contact = $clean_str($input['contactName'] ?? 'Bilinmiyor');
    $email = $clean_str($input['email'] ?? '');
    $phone = $clean_str($input['phone'] ?? 'Bilinmiyor');
    
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(["detail" => "Lütfen geçerli bir kurumsal e-posta adresi giriniz."]);
        exit;
    }

    $cart = $input['cart'] ?? [];
    $cart_json = json_encode($cart, JSON_UNESCAPED_UNICODE);
    $created_at = date('Y-m-d H:i:s');

    // Always record order in database first so it is never lost!
    $stmt = $db->prepare("INSERT INTO orders (company_name, contact_name, email, phone, cart_json, created_at) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([$company, $contact, $email, $phone, $cart_json, $created_at]);
    $order_id = (int)$db->lastInsertId();

    // Build the Email Content
    $to = 'serdar@ikies.tr';
    $subject = 'Yeni Sipariş (#' . $order_id . '): ' . $company;

    $body = "<h2 style='color: #d32f2f;'>Yeni Sipariş Detayları (Sipariş #" . $order_id . ")</h2>";
    $body .= "<p><strong>Tarih:</strong> " . htmlspecialchars($created_at) . "</p>";
    $body .= "<p><strong>Firma:</strong> " . htmlspecialchars($company) . "</p>";
    $body .= "<p><strong>Yetkili:</strong> " . htmlspecialchars($contact) . "</p>";
    $body .= "<p><strong>E-posta:</strong> " . htmlspecialchars($email) . "</p>";
    $body .= "<p><strong>Telefon:</strong> " . htmlspecialchars($phone) . "</p>";

    $body .= "<h3 style='margin-top: 20px; border-bottom: 1px solid #ccc; padding-bottom: 5px;'>Sipariş Edilen Ürünler</h3>";
    $body .= "<table border='1' cellpadding='10' cellspacing='0' style='border-collapse: collapse; width: 100%; max-width: 600px; font-family: sans-serif;'>";
    $body .= "<tr style='background-color: #f8f9fa;'><th>Ürün Adı</th><th>Miktar</th></tr>";

    if (is_array($cart)) {
        foreach ($cart as $item) {
            $body .= "<tr>";
            $body .= "<td>" . htmlspecialchars($clean_str($item['name'] ?? 'İsimsiz Ürün')) . "</td>";
            $body .= "<td align='center'>" . (int)($item['quantity'] ?? 1) . "</td>";
            $body .= "</tr>";
        }
    }
    $body .= "</table>";
    $body .= "<br><p style='font-size: 12px; color: #777;'>Bu e-posta İkies Elektronik sipariş sisteminden otomatik oluşturulmuştur.</p>";

    $host = $_SERVER['HTTP_HOST'] ?? 'ikies.net';
    $host = str_replace('www.', '', $host);
    $host = preg_replace('/[^a-zA-Z0-9.-]/', '', $host);
    $from_email = "siparis@" . ($host ?: 'ikies.net');

    $email_sent = false;
    $email_error = '';

    // Attempt 1: PHPMailer if bundled
    if (file_exists(__DIR__ . '/PHPMailer/PHPMailer.php')) {
        try {
            require_once __DIR__ . '/PHPMailer/Exception.php';
            require_once __DIR__ . '/PHPMailer/PHPMailer.php';
            require_once __DIR__ . '/PHPMailer/SMTP.php';

            $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
            $mail->CharSet = 'UTF-8';
            $mail->setFrom($from_email, 'Ikies Siparis');
            $mail->addAddress($to);
            $mail->addReplyTo($email, $contact);
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body    = $body;
            $mail->AltBody = strip_tags(str_replace(['<br>', '<tr>', '</tr>'], ["\n", "\n", ""], $body));

            $mail->send();
            $email_sent = true;
        } catch (\Exception $e) {
            $email_error = "PHPMailer error: " . $e->getMessage();
        }
    }

    // Attempt 2: Fallback to PHP native mail() with clean headers
    if (!$email_sent) {
        $headers = "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $headers .= "From: Ikies Sistem <" . $from_email . ">\r\n";
        $headers .= "Reply-To: " . $email . "\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";

        if (@mail($to, $subject, $body, $headers, "-f " . $from_email)) {
            $email_sent = true;
        } else {
            $last_err = error_get_last();
            $email_error .= ($email_error ? "; " : "") . "mail() error: " . ($last_err['message'] ?? 'mail function returned false');
        }
    }

    // Update orders table with mail status
    $stmt = $db->prepare("UPDATE orders SET email_sent = ?, email_error = ? WHERE id = ?");
    $stmt->execute([$email_sent ? 1 : 0, $email_error, $order_id]);

    // Return success to user because order is safely saved in the database
    echo json_encode([
        "message" => "Siparişiniz başarıyla alınmıştır! Firma bilgilerinizle en kısa sürede iletişime geçilecektir.",
        "order_id" => $order_id,
        "email_delivered" => $email_sent
    ]);
    exit;
}

// ── Site Settings (Hero Background, About, Contact & Map) ──
if ($method === 'GET' && ($request_uri === 'settings' || $request_uri === 'site-settings')) {
    $stmt = $db->query("SELECT key, value FROM site_settings");
    $settings = [];
    while ($row = $stmt->fetch()) {
        $val = $row['value'];
        $decoded = json_decode($val, true);
        $settings[$row['key']] = ($decoded !== null && (is_array($decoded) || is_object($decoded) || is_bool($decoded))) ? $decoded : $val;
    }
    echo json_encode($settings);
    exit;
}

if (($method === 'POST' || $method === 'PUT') && ($request_uri === 'settings' || $request_uri === 'site-settings')) {
    verify_token();
    if (is_array($input)) {
        $stmt = $db->prepare("INSERT INTO site_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
        foreach ($input as $k => $v) {
            $k = trim((string)$k);
            if (empty($k)) continue;
            if (is_string($v)) {
                $v = process_image_url($v);
            } else if (is_array($v)) {
                foreach ($v as &$item) {
                    if (is_string($item)) {
                        $item = process_image_url($item);
                    }
                }
                $v = json_encode($v);
            }
            $stmt->execute([$k, is_string($v) ? $v : json_encode($v)]);
        }
    }
    
    $stmt = $db->query("SELECT key, value FROM site_settings");
    $settings = [];
    while ($row = $stmt->fetch()) {
        $val = $row['value'];
        $decoded = json_decode($val, true);
        $settings[$row['key']] = ($decoded !== null && (is_array($decoded) || is_object($decoded) || is_bool($decoded))) ? $decoded : $val;
    }
    echo json_encode($settings);
    exit;
}

// ── Bulk Sync / Import Route ──
if ($method === 'POST' && $request_uri === 'sync-bulk') {
    verify_token();
    
    $products = $input['products'] ?? [];
    $references = $input['references'] ?? [];
    $settings = $input['settings'] ?? [];
    
    $db->beginTransaction();
    try {
        if (is_array($settings) && count($settings) > 0) {
            $stmtSet = $db->prepare("INSERT INTO site_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
            foreach ($settings as $k => $v) {
                if (is_array($v)) $v = json_encode($v);
                $stmtSet->execute([$k, is_string($v) ? $v : json_encode($v)]);
            }
        }
        if (is_array($products) && count($products) > 0) {
            $db->exec("DELETE FROM product_images");
            $db->exec("DELETE FROM products");
            
            $stmtProd = $db->prepare("INSERT INTO products (id, name, description, image_url, manual_url, parent_id, sort_order, manual_sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmtImg = $db->prepare("INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, ?)");
            
            foreach ($products as $idx => $p) {
                $pid = (int)($p['id'] ?? 0);
                if ($pid <= 0) continue;
                $sort = isset($p['sort_order']) ? (int)$p['sort_order'] : $idx + 1;
                $mSort = isset($p['manual_sort_order']) ? (int)$p['manual_sort_order'] : $idx + 1;
                $stmtProd->execute([
                    $pid,
                    $p['name'] ?? '',
                    $p['description'] ?? '',
                    process_image_url($p['image_url'] ?? ''),
                    process_image_url($p['manual_url'] ?? null),
                    !empty($p['parent_id']) ? (int)$p['parent_id'] : null,
                    $sort,
                    $mSort
                ]);
                
                if (!empty($p['images']) && is_array($p['images'])) {
                    foreach ($p['images'] as $imgIdx => $img) {
                        $imgUrl = is_array($img) ? ($img['image_url'] ?? '') : $img;
                        if (!empty($imgUrl)) {
                            $imgUrl = process_image_url($imgUrl);
                            $stmtImg->execute([$pid, $imgUrl, (int)($img['sort_order'] ?? $imgIdx)]);
                        }
                    }
                }
            }
        }
        
        if (is_array($references) && count($references) > 0) {
            $db->exec("DELETE FROM \"references\"");
            $stmtRef = $db->prepare("INSERT INTO \"references\" (id, company_name, logo_url, description, product_ids, images, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)");
            
            foreach ($references as $rIdx => $r) {
                $rid = (int)($r['id'] ?? 0);
                if ($rid <= 0) continue;
                $rSort = isset($r['sort_order']) ? (int)$r['sort_order'] : $rIdx + 1;
                
                $pids = $r['product_ids'] ?? '[]';
                if (is_array($pids)) $pids = json_encode($pids);
                
                $imgs = $r['images'] ?? [];
                if (is_array($imgs)) {
                    $processed = [];
                    foreach ($imgs as $item) {
                        if (is_array($item)) {
                            if (isset($item['image_url'])) $item['image_url'] = process_image_url($item['image_url']);
                            $processed[] = $item;
                        } else if (is_string($item)) {
                            $processed[] = process_image_url($item);
                        }
                    }
                    $imgs = json_encode($processed);
                } else if (is_string($imgs)) {
                    // already string
                }
                
                $stmtRef->execute([
                    $rid,
                    $r['company_name'] ?? '',
                    process_image_url($r['logo_url'] ?? ''),
                    $r['description'] ?? '',
                    $pids,
                    $imgs,
                    $rSort
                ]);
            }
        }
        
        $db->commit();
        echo json_encode([
            "message" => "Veriler başarıyla sunucu veritabanına senkronize edildi.",
            "products_count" => count($products),
            "references_count" => count($references)
        ]);
        exit;
    } catch (\Exception $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode(["detail" => "Veritabanı senkronizasyon hatası: " . $e->getMessage()]);
        exit;
    }
}

// Fallback
http_response_code(404);
echo json_encode(["detail" => "Endpoint not found: " . $request_uri]);
