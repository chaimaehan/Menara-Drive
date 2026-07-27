<?php
require '../vendor/autoload.php';
require '../config/database.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

$data = json_decode(file_get_contents("php://input"), true);
$secret = "dA7Z&J!pS9#qK2fT@3LmN8wC";
if (!isset($data['username']) || !isset($data['password'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Champs manquants']);
    exit;
}

$username = $data['username'];
$password = $data['password'];

$stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
$stmt->execute([$username]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if ($user && password_verify($password, $user['password'])) {
    $payload = [
        'sub' => $user['id'],
        'role' => $user['role'],
        'chauffeur_id' => $user['chauffeur_id'],
        'iat' => time(),
        'exp' => time() + 3600
    ];

    $jwt = JWT::encode($payload, $secret, 'HS256');

    echo json_encode([
        'success' => true,
        'token' => $jwt,
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'role' => $user['role'],
            'email' => $user['email'] ?? $user['username'],
            'name' => $user['role'] === 'admin' ? 'Admin' : 'Chauffeur'
        ]
    ]);
} else {
    http_response_code(401);
    echo json_encode(['error' => 'Identifiants invalides']);
}
