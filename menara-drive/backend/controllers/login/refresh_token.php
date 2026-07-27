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

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

$secret = 'dA7Z&J!pS9#qK2fT@3LmN8wC';

$data = json_decode(file_get_contents("php://input"));

if (empty($data->refresh_token)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Refresh token manquant"]);
    exit;
}

try {
    $decoded = JWT::decode($data->refresh_token, new Key($secret, 'HS256'));

    // Vérifier que c'est bien un refresh token
    if (!isset($decoded->type) || $decoded->type !== 'refresh') {
        http_response_code(401);
        echo json_encode(["success" => false, "message" => "Token invalide"]);
        exit;
    }

    // Générer un nouvel access token
    $payload = [
        'sub'  => $decoded->sub,
        'role' => $decoded->role,
        'iat'  => time(),
        'exp'  => time() + (60 * 60 * 24) // 24h
    ];

    $newToken = JWT::encode($payload, $secret, 'HS256');

    echo json_encode([
        "success" => true,
        "token"   => $newToken
    ]);

} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Refresh token expiré ou invalide"]);
}