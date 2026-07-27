<?php
ini_set('display_errors', 0);
error_reporting(0);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    http_response_code(200);
    exit;
}

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require __DIR__ . '/../../vendor/autoload.php';
$pdo = require __DIR__ . '/../../config/database.php';

use Firebase\JWT\JWT;

$secret = 'dA7Z&J!pS9#qK2fT@3LmN8wC';

$data = json_decode(file_get_contents("php://input"));

if (empty($data->email) || empty($data->password)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Champs manquants"]);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT id, nom, password, role, email FROM users WHERE email = :email LIMIT 1");
    $stmt->execute(['email' => $data->email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(401);
        echo json_encode(["success" => false, "message" => "Utilisateur non trouvé"]);
        exit;
    }

    if (!password_verify($data->password, $user['password'])) {
        http_response_code(401);
        echo json_encode(["success" => false, "message" => "Mot de passe incorrect"]);
        exit;
    }

    // Récupérer chauffeur_id si l'utilisateur est un chauffeur
    $chauffeur_id = null;
    error_log("DEBUG chauffeur_id: " . var_export($chauffeur_id, true));
if ($user['role'] === 'chauffeur') {
    $stmtC = $pdo->prepare("SELECT id FROM chauffeurs WHERE user_id = ?");
    $stmtC->execute([$user['id']]);
    $chauffeur = $stmtC->fetch(PDO::FETCH_ASSOC);
    $chauffeur_id = $chauffeur ? (int)$chauffeur['id'] : null;
}
    $payload = [
        'sub'          => $user['id'],
        'role'         => $user['role'],
        'chauffeur_id' => $chauffeur_id,
        'iat'          => time(),
        'exp'          => time() + (60 * 60 * 24 * 365 * 10)
    ];

    $jwt = JWT::encode($payload, $secret, 'HS256');

    echo json_encode([
        "success" => true,
        "token"   => $jwt,
        "user"    => [
            "id"           => $user["id"],
            "nom"          => $user["nom"],
            "role"         => $user["role"],
            "email"        => $user["email"],
            "chauffeur_id" => $chauffeur_id
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Erreur: " . $e->getMessage()]);
}
?>