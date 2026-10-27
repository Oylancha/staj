<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);

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

// Ensure secure reset key exists
$key_file = __DIR__ . '/.reset_key';
if (!file_exists($key_file)) {
    $generated_key = bin2hex(random_bytes(16));
    @file_put_contents($key_file, $generated_key);
    @chmod($key_file, 0600);
}
$valid_key = trim((string)@file_get_contents($key_file));
$env_key = getenv('EMERGENCY_RESET_KEY');
if (!empty($env_key)) {
    $valid_key = trim($env_key);
}

// CLI usage support: php reset.php <new_password>
$is_cli = (php_sapi_name() === 'cli');
if ($is_cli) {
    $new_pw = $argv[1] ?? 'Serdar1';
    try {
        $db = new PDO("sqlite:" . $db_file);
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $hashed = password_hash($new_pw, PASSWORD_BCRYPT);
        $stmt = $db->prepare("UPDATE admin_users SET hashed_password = ? WHERE username = 'admin'");
        $stmt->execute([$hashed]);
        echo "Admin password updated successfully to: {$new_pw}\n";
    } catch (\Exception $e) {
        echo "Error: " . $e->getMessage() . "\n";
    }
    exit;
}

$message = "";
$status = "info";
$show_info = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $provided_key = trim($_POST['reset_key'] ?? '');
    $target_pw = trim($_POST['pw'] ?? '');

    if (empty($provided_key) || !hash_equals($valid_key, $provided_key)) {
        $status = "error";
        $message = "Hatalı Güvenlik Anahtarı! Sunucu üzerindeki <code>backend_php/.reset_key</code> dosyasında yer alan anahtarı giriniz.";
    } elseif (strlen($target_pw) < 6) {
        $status = "error";
        $message = "Yeni şifre en az 6 karakter olmalıdır.";
    } else {
        try {
            $db = new PDO("sqlite:" . $db_file);
            $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            @chmod($db_file, 0640);
            @chmod(dirname($db_file), 0755);

            $db->exec("CREATE TABLE IF NOT EXISTS admin_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL
            )");

            $hashed = password_hash($target_pw, PASSWORD_BCRYPT);
            $stmt = $db->prepare("UPDATE admin_users SET hashed_password = ? WHERE username = 'admin'");
            $stmt->execute([$hashed]);

            if ($stmt->rowCount() === 0) {
                $ins = $db->prepare("INSERT INTO admin_users (username, hashed_password) VALUES ('admin', ?)");
                $ins->execute([$hashed]);
            }

            $message = "Yönetici şifresi başarıyla güncellendi! Yeni şifrenizle giriş yapabilirsiniz.";
            $status = "success";
            $show_info = true;
        } catch (\Exception $e) {
            $message = "Veritabanı Hatası: " . htmlspecialchars($e->getMessage());
            $status = "error";
        }
    }
}
?>
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Güvenli Şifre Sıfırlama - İkies Elektronik</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1.5rem;
      box-sizing: border-box;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 1rem;
      max-width: 480px;
      width: 100%;
      padding: 2rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    h1 {
      font-size: 1.5rem;
      margin-top: 0;
      margin-bottom: 0.5rem;
    }
    p {
      color: #94a3b8;
      font-size: 0.95rem;
      margin-bottom: 1.5rem;
    }
    .alert {
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1.5rem;
      font-size: 0.95rem;
      line-height: 1.5;
    }
    .alert-success {
      background: rgba(34, 197, 94, 0.15);
      border: 1px solid rgba(34, 197, 94, 0.3);
      color: #4ade80;
    }
    .alert-error {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
    }
    .alert-info {
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.3);
      color: #93c5fd;
    }
    label {
      display: block;
      margin-bottom: 0.4rem;
      font-size: 0.85rem;
      color: #94a3b8;
      font-weight: 500;
    }
    input[type="text"], input[type="password"] {
      width: 100%;
      box-sizing: border-box;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      background: #0f172a;
      border: 1px solid #334155;
      color: #fff;
      font-size: 1rem;
      margin-bottom: 1.25rem;
    }
    input:focus {
      outline: none;
      border-color: #3b82f6;
    }
    .btn {
      display: inline-block;
      width: 100%;
      box-sizing: border-box;
      text-align: center;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s;
      border: none;
    }
    .btn-primary {
      background: #2563eb;
      color: white;
      margin-bottom: 0.75rem;
    }
    .btn-primary:hover {
      background: #1d4ed8;
    }
    .btn-outline {
      background: transparent;
      border: 1px solid #475569;
      color: #cbd5e1;
    }
    .btn-outline:hover {
      background: #334155;
      color: white;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Yönetici Şifre Sıfırlama</h1>
    <p>Yetkisiz erişimleri önlemek amacıyla şifre sıfırlama işlemi güvenlik anahtarı gerektirir.</p>

    <?php if (!empty($message)): ?>
      <div class="alert alert-<?php echo $status; ?>">
        <?php echo $message; ?>
      </div>
    <?php endif; ?>

    <form method="POST" action="reset.php">
      <label for="reset_key">Sunucu Güvenlik Anahtarı (Emergency Reset Key):</label>
      <input type="password" id="reset_key" name="reset_key" placeholder="backend_php/.reset_key içeriğini giriniz" required>

      <label for="pw">Belirlemek İstediğiniz Yeni Şifre:</label>
      <input type="password" id="pw" name="pw" placeholder="En az 6 karakter" required>

      <button type="submit" class="btn btn-primary">Şifreyi Güncelle</button>
    </form>

    <a href="../admin-login.html" class="btn btn-outline" style="margin-top: 0.5rem;">← Giriş Sayfasına Git</a>
  </div>
</body>
</html>
