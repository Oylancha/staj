<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

$db_file = __DIR__ . '/sql_app.db';
if (!file_exists($db_file)) {
    die("Hata: sql_app.db bulunamadı: " . htmlspecialchars($db_file));
}

try {
    $db = new PDO("sqlite:" . $db_file);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $hashed = password_hash('admin123', PASSWORD_BCRYPT);
    $stmt = $db->prepare("UPDATE admin_users SET hashed_password = ? WHERE username = 'admin'");
    $stmt->execute([$hashed]);

    if ($stmt->rowCount() === 0) {
        // User didn't exist, insert
        $ins = $db->prepare("INSERT INTO admin_users (username, hashed_password) VALUES ('admin', ?)");
        $ins->execute([$hashed]);
    }

    echo "<h1>Başarılı!</h1> Admin şifresi sıfırlandı: <strong>admin123</strong><br><br><a href='../frontend/admin-login.html'>Giriş Sayfasına Git</a>";
} catch (Exception $e) {
    echo "Veritabanı Hatası: " . htmlspecialchars($e->getMessage());
}
