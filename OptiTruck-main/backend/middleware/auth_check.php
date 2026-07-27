<?php
require __DIR__ . '/../../vendor/autoload.php';
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

function unauthorized() {
    http_response_code(401); // Non autorisé
    echo json_encode([
        "success" => false,
        "error" => "TOKEN_INVALID"
    ]);
    exit();
}

$headers = getallheaders();
if (!isset($headers['Authorization'])) {
    unauthorized();
}

list($type, $token) = explode(' ', $headers['Authorization'], 2);
if (strcasecmp($type, 'Bearer') != 0 || empty($token)) {
    unauthorized();
}

try {
    $decoded = JWT::decode($token, new Key('dA7Z&J!pS9#qK2fT@3LmN8wC', 'HS256'));
    if ($decoded->exp < time()) {
        unauthorized();
    }
} catch (Exception $e) {
    unauthorized();
}
