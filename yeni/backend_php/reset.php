<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

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

$message = "";
$status = "info";

try {
    $db = new PDO("sqlite:" . $db_file);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    @chmod($db_file, 0666);
    @chmod(dirname($db_file), 0777);

    // Create table if missing
    $db->exec("CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        hashed_password TEXT NOT NULL
    )");

    $target_pw = isset($_POST['pw']) ? trim($_POST['pw']) : (isset($_GET['pw']) ? trim($_GET['pw']) : 'Serdar1');
    if (empty($target_pw)) {
        $target_pw = 'Serdar1';
    }

    $hashed = password_hash($target_pw, PASSWORD_BCRYPT);
    
    $stmt = $db->prepare("UPDATE admin_users SET hashed_password = ? WHERE username = 'admin'");
    $stmt->execute([$hashed]);

    if ($stmt->rowCount() === 0) {
        $ins = $db->prepare("INSERT INTO admin_users (username, hashed_password) VALUES ('admin', ?)");
        $ins->execute([$hashed]);
    }

    $message = "Yönetici şifresi başarıyla <strong>" . htmlspecialchars($target_pw) . "</strong> olarak ayarlandı.";
    $status = "success";
} catch (Exception $e) {
    $message = "Veritabanı Hatası: " . htmlspecialchars($e->getMessage());
    $status = "error";
}
?>
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Yönetici Şifre Sıfırlama - İkies Elektronik</title>
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
    .info-box {
      background: #0f172a;
      border: 1px solid #334155;
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1.5rem;
      font-size: 0.9rem;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }
    .info-row:last-child { margin-bottom: 0; }
    .info-label { color: #64748b; }
    .info-val { font-weight: 600; color: #f1f5f9; }
    input[type="text"] {
      width: 100%;
      box-sizing: border-box;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      background: #0f172a;
      border: 1px solid #334155;
      color: #fff;
      font-size: 1rem;
      margin-bottom: 1rem;
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
    <p>İkies Elektronik Yönetim Paneli</p>

    <?php if ($status === 'success'): ?>
      <div class="alert alert-success">
        ✓ <?php echo $message; ?>
      </div>
    <?php else: ?>
      <div class="alert alert-error">
        ✕ <?php echo $message; ?>
      </div>
    <?php endif; ?>

    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Kullanıcı Adı:</span>
        <span class="info-val">admin</span>
      </div>
      <div class="info-row">
        <span class="info-label">Şifre:</span>
        <span class="info-val"><?php echo htmlspecialchars($target_pw); ?></span>
      </div>
      <div class="info-row">
        <span class="info-label">Veritabanı:</span>
        <span class="info-val"><?php echo htmlspecialchars(basename($db_file)); ?> (Yazılabilir)</span>
      </div>
    </div>

    <form method="POST" action="reset.php">
      <label style="display: block; margin-bottom: 0.5rem; font-size: 0.85rem; color: #94a3b8;">Farklı bir şifre belirlemek isterseniz:</label>
      <input type="text" name="pw" placeholder="Yeni şifre girin (Örn: Serdar1)" value="Serdar1">
      <button type="submit" class="btn btn-primary">Şifreyi Güncelle</button>
    </form>

    <a href="../admin-login.html" class="btn btn-outline" style="margin-top: 0.5rem;">Giriş Sayfasına Git</a>
  </div>
</body>
</html>
