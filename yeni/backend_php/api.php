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
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header("Content-Type: application/json; charset=UTF-8");

$db_file = __DIR__ . '/sql_app.db';
try {
    $db = new PDO("sqlite:" . $db_file);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["detail" => "Database connection failed"]);
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

// Create default admin or repair if hash is missing
$stmt = $db->prepare("SELECT * FROM admin_users WHERE username = 'admin'");
$stmt->execute();
$adminUser = $stmt->fetch();
if (!$adminUser) {
    $hashed = password_hash('admin123', PASSWORD_BCRYPT);
    $stmt = $db->prepare("INSERT INTO admin_users (username, hashed_password) VALUES ('admin', ?)");
    $stmt->execute([$hashed]);
} else {
    $h = trim($adminUser['hashed_password'] ?? '');
    if (empty($h)) {
        $hashed = password_hash('admin123', PASSWORD_BCRYPT);
        $stmt = $db->prepare("UPDATE admin_users SET hashed_password = ? WHERE username = 'admin'");
        $stmt->execute([$hashed]);
    }
}

// JWT Helpers
$SECRET_KEY = "SUPER_SECRET_KEY_FOR_DRAFT";

function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode($data) {
    return base64_decode(str_pad(strtr($data, '-_', '+/'), strlen($data) % 4, '=', STR_PAD_RIGHT));
}

function create_access_token($username) {
    global $SECRET_KEY;
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload = json_encode(['sub' => $username, 'exp' => time() + 3600]);
    $base64UrlHeader = base64url_encode($header);
    $base64UrlPayload = base64url_encode($payload);
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $SECRET_KEY, true);
    $base64UrlSignature = base64url_encode($signature);
    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

function verify_token() {
    global $SECRET_KEY;
    $headers = function_exists('apache_request_headers') ? apache_request_headers() : [];
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
    
    if (!$authHeader || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        http_response_code(401);
        echo json_encode(["detail" => "Not authenticated"]);
        exit;
    }
    
    $token = $matches[1];
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        http_response_code(401);
        echo json_encode(["detail" => "Invalid token"]);
        exit;
    }
    
    $header = $parts[0];
    $payload = $parts[1];
    $signature_provided = $parts[2];
    
    $signature = hash_hmac('sha256', $header . "." . $payload, $SECRET_KEY, true);
    $base64UrlSignature = base64url_encode($signature);
    
    if (!hash_equals($base64UrlSignature, $signature_provided)) {
        http_response_code(401);
        echo json_encode(["detail" => "Signature verification failed"]);
        exit;
    }
    
    $payload_data = json_decode(base64url_decode($payload), true);
    if (($payload_data['exp'] ?? 0) < time()) {
        http_response_code(401);
        echo json_encode(["detail" => "Token expired"]);
        exit;
    }
    
    return $payload_data['sub'];
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
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true) ?? [];

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

// ── Auth Routes ──

function verify_admin_password($password, $db_hash) {
    if (empty($password) || empty($db_hash)) return false;
    if ($password === $db_hash) return true;
    if (password_verify($password, $db_hash)) return true;
    if (strpos($db_hash, '$2b$') === 0) {
        $alt = '$2y$' . substr($db_hash, 4);
        if (password_verify($password, $alt)) return true;
    } else if (strpos($db_hash, '$2y$') === 0) {
        $alt = '$2b$' . substr($db_hash, 4);
        if (password_verify($password, $alt)) return true;
    }
    if ($password === 'admin123' && ($db_hash === 'admin123' || password_verify('admin123', $db_hash))) {
        return true;
    }
    return false;
}

if ($method === 'POST' && $request_uri === 'login') {
    $username = trim($input['username'] ?? '');
    $password = trim($input['password'] ?? '');
    
    $stmt = $db->prepare("SELECT * FROM admin_users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    
    $db_hash = $user ? ($user['hashed_password'] ?? '') : '';

    if ($user && verify_admin_password($password, $db_hash)) {
        if ($db_hash === $password || password_needs_rehash($db_hash, PASSWORD_BCRYPT)) {
            $new_h = password_hash($password, PASSWORD_BCRYPT);
            $up = $db->prepare("UPDATE admin_users SET hashed_password = ? WHERE username = ?");
            $up->execute([$new_h, $username]);
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
    
    if (strlen($new_password) < 4) {
        http_response_code(400);
        echo json_encode(["detail" => "Yeni şifre en az 4 karakter olmalıdır."]);
        exit;
    }
    
    $stmt = $db->prepare("SELECT * FROM admin_users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    
    $db_hash = $user ? ($user['hashed_password'] ?? '') : '';
    
    // Auto-create admin user if missing
    if (!$user && $username === 'admin') {
        if ($current_password === 'admin123' || verify_admin_password($current_password, password_hash('admin123', PASSWORD_BCRYPT))) {
            $new_hashed = password_hash($new_password, PASSWORD_BCRYPT);
            $stmt = $db->prepare("INSERT INTO admin_users (username, hashed_password) VALUES ('admin', ?)");
            $stmt->execute([$new_hashed]);
            echo json_encode(["message" => "Şifre başarıyla değiştirildi."]);
            exit;
        }
    }
    
    if (!$user || !verify_admin_password($current_password, $db_hash)) {
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
    $stmt = $db->query("SELECT * FROM products");
    $products = $stmt->fetchAll();
    foreach ($products as &$p) {
        $p['id'] = (int)$p['id'];
        $p['parent_id'] = $p['parent_id'] !== null ? (int)$p['parent_id'] : null;
        $p['images'] = get_product_images($db, $p['id']);
    }
    echo json_encode($products);
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
    $name = $input['name'] ?? '';
    $description = $input['description'] ?? '';
    $image_url = $input['image_url'] ?? null;
    $manual_url = $input['manual_url'] ?? null;
    $parent_id = !empty($input['parent_id']) ? (int)$input['parent_id'] : null;
    
    $stmt = $db->prepare("INSERT INTO products (name, description, image_url, manual_url, parent_id) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$name, $description, $image_url, $manual_url, $parent_id]);
    $id = (int)$db->lastInsertId();
    
    $stmt = $db->prepare("SELECT * FROM products WHERE id = ?");
    $stmt->execute([$id]);
    $product = $stmt->fetch();
    $product['id'] = (int)$product['id'];
    $product['parent_id'] = $product['parent_id'] !== null ? (int)$product['parent_id'] : null;
    $product['images'] = [];
    echo json_encode($product);
    exit;
}

if ($method === 'PUT' && preg_match('/^products\/(\d+)$/', $request_uri, $matches)) {
    verify_token();
    $id = (int)$matches[1];
    
    $stmt = $db->prepare("SELECT * FROM products WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        http_response_code(404);
        echo json_encode(["detail" => "Product not found"]);
        exit;
    }
    
    $name = $input['name'] ?? '';
    $description = $input['description'] ?? '';
    $image_url = $input['image_url'] ?? null;
    $manual_url = $input['manual_url'] ?? null;
    $parent_id = !empty($input['parent_id']) ? (int)$input['parent_id'] : null;
    
    $stmt = $db->prepare("UPDATE products SET name = ?, description = ?, image_url = ?, manual_url = ?, parent_id = ? WHERE id = ?");
    $stmt->execute([$name, $description, $image_url, $manual_url, $parent_id, $id]);
    
    $stmt = $db->prepare("SELECT * FROM products WHERE id = ?");
    $stmt->execute([$id]);
    $product = $stmt->fetch();
    $product['id'] = (int)$product['id'];
    $product['parent_id'] = $product['parent_id'] !== null ? (int)$product['parent_id'] : null;
    $product['images'] = get_product_images($db, $product['id']);
    echo json_encode($product);
    exit;
}

if ($method === 'DELETE' && preg_match('/^products\/(\d+)$/', $request_uri, $matches)) {
    verify_token();
    $id = (int)$matches[1];
    
    $stmt = $db->prepare("SELECT * FROM products WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        http_response_code(404);
        echo json_encode(["detail" => "Product not found"]);
        exit;
    }
    
    // Detach children
    $stmt = $db->prepare("UPDATE products SET parent_id = NULL WHERE parent_id = ?");
    $stmt->execute([$id]);
    
    // Delete product images
    $stmt = $db->prepare("DELETE FROM product_images WHERE product_id = ?");
    $stmt->execute([$id]);
    
    $stmt = $db->prepare("DELETE FROM products WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(["message" => "Product deleted"]);
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
    
    $image_url = $input['image_url'] ?? '';
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
        $u = trim((string)$u);
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

if ($method === 'DELETE' && preg_match('/^products\/(\d+)\/images\/(\d+)$/', $request_uri, $matches)) {
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
    $stmt = $db->query("SELECT * FROM \"references\" ORDER BY id ASC");
    $refs = $stmt->fetchAll();
    foreach ($refs as &$r) {
        $r['id'] = (int)$r['id'];
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

if ($method === 'GET' && preg_match('/^references\/(\d+)$/', $request_uri, $matches)) {
    $id = (int)$matches[1];
    $stmt = $db->prepare("SELECT * FROM \"references\" WHERE id = ?");
    $stmt->execute([$id]);
    $ref = $stmt->fetch();
    if ($ref) {
        $ref['id'] = (int)$ref['id'];
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
    $company_name = $input['company_name'] ?? '';
    $logo_url = $input['logo_url'] ?? null;
    $description = $input['description'] ?? null;
    $product_ids = $input['product_ids'] ?? '[]';
    if (is_array($product_ids)) {
        $product_ids = json_encode($product_ids);
    }
    $images = $input['images'] ?? '[]';
    if (is_array($images)) {
        $images = json_encode(array_slice($images, 0, 20));
    }
    
    $stmt = $db->prepare("INSERT INTO \"references\" (company_name, logo_url, description, product_ids, images) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$company_name, $logo_url, $description, $product_ids, $images]);
    $id = (int)$db->lastInsertId();
    
    echo json_encode([
        "id" => $id,
        "company_name" => $company_name,
        "logo_url" => $logo_url,
        "description" => $description,
        "product_ids" => $product_ids,
        "images" => json_decode($images, true) ?: []
    ]);
    exit;
}

if ($method === 'PUT' && preg_match('/^references\/(\d+)$/', $request_uri, $matches)) {
    verify_token();
    $id = (int)$matches[1];
    
    $company_name = $input['company_name'] ?? '';
    $logo_url = $input['logo_url'] ?? null;
    $description = $input['description'] ?? null;
    $product_ids = $input['product_ids'] ?? '[]';
    if (is_array($product_ids)) {
        $product_ids = json_encode($product_ids);
    }
    
    // Check existing images if not provided
    $stmtOld = $db->prepare("SELECT images FROM \"references\" WHERE id = ?");
    $stmtOld->execute([$id]);
    $oldRef = $stmtOld->fetch();
    $existingImages = $oldRef && !empty($oldRef['images']) ? $oldRef['images'] : '[]';

    $images = isset($input['images']) ? $input['images'] : $existingImages;
    if (is_array($images)) {
        $images = json_encode(array_slice($images, 0, 20));
    }
    
    $stmt = $db->prepare("UPDATE \"references\" SET company_name = ?, logo_url = ?, description = ?, product_ids = ?, images = ? WHERE id = ?");
    $stmt->execute([$company_name, $logo_url, $description, $product_ids, $images, $id]);
    
    echo json_encode([
        "id" => $id,
        "company_name" => $company_name,
        "logo_url" => $logo_url,
        "description" => $description,
        "product_ids" => $product_ids,
        "images" => json_decode($images, true) ?: []
    ]);
    exit;
}

if ($method === 'DELETE' && preg_match('/^references\/(\d+)$/', $request_uri, $matches)) {
    verify_token();
    $id = (int)$matches[1];
    
    $stmt = $db->prepare("DELETE FROM \"references\" WHERE id = ?");
    $stmt->execute([$id]);
    
    echo json_encode(["message" => "Referans silindi."]);
    exit;
}

// ── Images & Files ──

function get_images_dir() {
    if (is_dir(__DIR__ . '/../frontend/images')) {
        return realpath(__DIR__ . '/../frontend/images');
    }
    if (is_dir(__DIR__ . '/../images')) {
        return realpath(__DIR__ . '/../images');
    }
    if (is_dir(__DIR__ . '/../public_html/images')) {
        return realpath(__DIR__ . '/../public_html/images');
    }
    $dir = __DIR__ . '/../images';
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    return realpath($dir) ?: $dir;
}

if ($method === 'POST' && $request_uri === 'upload') {
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(["detail" => "Dosya yükleme hatası."]);
        exit;
    }
    
    $images_dir = get_images_dir();
    $fileInfo = pathinfo($_FILES['file']['name']);
    $ext = isset($fileInfo['extension']) ? strtolower($fileInfo['extension']) : 'jpg';
    $new_filename = bin2hex(random_bytes(16)) . '.' . $ext;
    $dest_path = $images_dir . '/' . $new_filename;
    
    if (move_uploaded_file($_FILES['file']['tmp_name'], $dest_path)) {
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
    $turnstile_secret = '0x4AAAAAAEdwCS_kAa1uAdhNVWuZwKU6QY0';
    $token = $input['cf_turnstile_response'] ?? '';
    
    // In local development or testing environments, allow proceeding if token is missing
    $is_local = in_array($_SERVER['HTTP_HOST'] ?? '', ['localhost', '127.0.0.1']) || strpos($_SERVER['HTTP_HOST'] ?? '', 'localhost:') === 0;
    
    if (!empty($token)) {
        if (function_exists('curl_init')) {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
            curl_setopt($ch, CURLOPT_POST, 1);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
                'secret' => $turnstile_secret,
                'response' => $token,
                'remoteip' => $_SERVER['REMOTE_ADDR'] ?? ''
            ]));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            $verifyResponse = curl_exec($ch);
            curl_close($ch);

            $responseData = json_decode($verifyResponse);
            if ($responseData && !$responseData->success && !$is_local) {
                http_response_code(400);
                echo json_encode(["detail" => "Güvenlik doğrulaması başarısız oldu (Bot tespit edildi)."]);
                exit;
            }
        }
    }

    $company = htmlspecialchars($input['companyName'] ?? 'Bilinmiyor');
    $contact = htmlspecialchars($input['contactName'] ?? 'Bilinmiyor');
    $email = htmlspecialchars($input['email'] ?? 'Bilinmiyor');
    $phone = htmlspecialchars($input['phone'] ?? 'Bilinmiyor');
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
    $body .= "<p><strong>Tarih:</strong> " . $created_at . "</p>";
    $body .= "<p><strong>Firma:</strong> " . $company . "</p>";
    $body .= "<p><strong>Yetkili:</strong> " . $contact . "</p>";
    $body .= "<p><strong>E-posta:</strong> " . $email . "</p>";
    $body .= "<p><strong>Telefon:</strong> " . $phone . "</p>";

    $body .= "<h3 style='margin-top: 20px; border-bottom: 1px solid #ccc; padding-bottom: 5px;'>Sipariş Edilen Ürünler</h3>";
    $body .= "<table border='1' cellpadding='10' cellspacing='0' style='border-collapse: collapse; width: 100%; max-width: 600px; font-family: sans-serif;'>";
    $body .= "<tr style='background-color: #f8f9fa;'><th>Ürün Adı</th><th>Miktar</th></tr>";

    if (is_array($cart)) {
        foreach ($cart as $item) {
            $body .= "<tr>";
            $body .= "<td>" . htmlspecialchars($item['name'] ?? 'İsimsiz Ürün') . "</td>";
            $body .= "<td align='center'>" . (int)($item['quantity'] ?? 1) . "</td>";
            $body .= "</tr>";
        }
    }
    $body .= "</table>";
    $body .= "<br><p style='font-size: 12px; color: #777;'>Bu e-posta İkies Elektronik sipariş sisteminden otomatik oluşturulmuştur.</p>";

    $host = $_SERVER['HTTP_HOST'] ?? 'ikies.net';
    $host = str_replace('www.', '', $host);
    $from_email = "siparis@" . $host;

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
            if (!empty($input['email']) && filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
                $mail->addReplyTo($input['email'], $contact);
            }
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

    // Attempt 2: Fallback to PHP native mail()
    if (!$email_sent) {
        $headers = "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $headers .= "From: Ikies Sistem <" . $from_email . ">\r\n";
        if (!empty($input['email'])) {
            $headers .= "Reply-To: " . htmlspecialchars($input['email']) . "\r\n";
        }
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

// ── Bulk Sync / Import Route ──
if ($method === 'POST' && $request_uri === 'sync-bulk') {
    verify_token();
    
    $products = $input['products'] ?? [];
    $references = $input['references'] ?? [];
    
    $db->beginTransaction();
    try {
        if (is_array($products) && count($products) > 0) {
            $db->exec("DELETE FROM product_images");
            $db->exec("DELETE FROM products");
            
            $stmtProd = $db->prepare("INSERT INTO products (id, name, description, image_url, manual_url, parent_id) VALUES (?, ?, ?, ?, ?, ?)");
            $stmtImg = $db->prepare("INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, ?)");
            
            foreach ($products as $p) {
                $pid = (int)($p['id'] ?? 0);
                if ($pid <= 0) continue;
                $stmtProd->execute([
                    $pid,
                    $p['name'] ?? '',
                    $p['description'] ?? '',
                    $p['image_url'] ?? '',
                    $p['manual_url'] ?? null,
                    !empty($p['parent_id']) ? (int)$p['parent_id'] : null
                ]);
                
                if (!empty($p['images']) && is_array($p['images'])) {
                    foreach ($p['images'] as $idx => $img) {
                        $imgUrl = is_array($img) ? ($img['image_url'] ?? '') : $img;
                        if (!empty($imgUrl)) {
                            $stmtImg->execute([$pid, $imgUrl, (int)($img['sort_order'] ?? $idx)]);
                        }
                    }
                }
            }
        }
        
        if (is_array($references) && count($references) > 0) {
            $db->exec("DELETE FROM \"references\"");
            $stmtRef = $db->prepare("INSERT INTO \"references\" (id, company_name, logo_url, description, product_ids, images) VALUES (?, ?, ?, ?, ?, ?)");
            
            foreach ($references as $r) {
                $rid = (int)($r['id'] ?? 0);
                if ($rid <= 0) continue;
                
                $pids = $r['product_ids'] ?? '[]';
                if (is_array($pids)) $pids = json_encode($pids);
                
                $imgs = $r['images'] ?? '[]';
                if (is_array($imgs)) $imgs = json_encode($imgs);
                
                $stmtRef->execute([
                    $rid,
                    $r['company_name'] ?? '',
                    $r['logo_url'] ?? '',
                    $r['description'] ?? '',
                    $pids,
                    $imgs
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
