<?php
// auth.php - middleware d'authentification JWT

require_once __DIR__ . '/../vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

// ✅ Fonction pour récupérer l'en-tête Authorization, compatible avec tous les serveurs
function getAuthorizationHeader() {
    if (isset($_SERVER['Authorization'])) {
        return trim($_SERVER["Authorization"]);
    } elseif (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        return trim($_SERVER["HTTP_AUTHORIZATION"]);
    } elseif (function_exists('apache_request_headers')) {
        $requestHeaders = apache_request_headers();
        // Normaliser les clés (important !)
        $requestHeaders = array_change_key_case($requestHeaders, CASE_LOWER);
        if (isset($requestHeaders['authorization'])) {
            return trim($requestHeaders['authorization']);
        }
    }
    return null;
}

// ✅ Middleware de vérification
function verifierToken() {
    $authHeader = getAuthorizationHeader();

    if (!$authHeader || strpos($authHeader, 'Bearer ') !== 0) {
        http_response_code(401);
        echo json_encode(['error' => 'Token manquant ou format invalide']);
        exit;
    }

    $token = substr($authHeader, 7); // Enlever "Bearer "

    if (!$token) {
        http_response_code(401);
        echo json_encode(['error' => 'Token manquant']);
        exit;
    }

    $secretKey = 'dA7Z&J!pS9#qK2fT@3LmN8wC';

    try {
        $decoded = JWT::decode($token, new Key($secretKey, 'HS256'));
        return $decoded;
    } catch (Exception $e) {
        http_response_code(401);
        echo json_encode(['error' => 'Token invalide ou expiré']);
        exit;
    }
}
