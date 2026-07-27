<?php
require __DIR__ . '/../../vendor/autoload.php';
require __DIR__ . '/../../config/database.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

// CORS préflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Access-Control-Allow-Headers: Authorization, Content-Type");
    http_response_code(200);
    exit();
}

// Headers pour la réponse
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Authorization, Content-Type");
header("Content-Type: application/json; charset=UTF-8");

$secret = "dA7Z&J!pS9#qK2fT@3LmN8wC";

// Récupérer le token JWT
$headers = function_exists('apache_request_headers') ? apache_request_headers() : getallheaders();
$authHeader = null;
foreach ($headers as $key => $value) {
    if (strtolower(trim($key)) === 'authorization') {
        $authHeader = $value;
        break;
    }
}

if (!$authHeader || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['error' => 'Token invalide ou manquant']);
    exit;
}

$jwt = $matches[1];

try {
    $decoded = JWT::decode($jwt, new Key($secret, 'HS256'));

    if ($decoded->role !== 'chauffeur' || !isset($decoded->chauffeur_id)) {
        http_response_code(403);
        echo json_encode(['message' => 'Accès refusé']);
        exit;
    }

    $chauffeur_id = (int)$decoded->chauffeur_id;

    // Lire les données JSON envoyées
    $input = json_decode(file_get_contents('php://input'), true);
    if (!isset($input['livraisonId'])) {
        http_response_code(400);
        echo json_encode(['message' => 'ID de livraison manquant']);
        exit;
    }

    $livraisonId = (int)$input['livraisonId'];

    // Vérifier que cette livraison appartient bien à un camion de ce chauffeur
    $stmt = $pdo->prepare("
        SELECT l.id 
        FROM livraisons l
        INNER JOIN camions c ON l.camion_id = c.id
        WHERE l.id = ? AND c.chauffeur_id = ?
    ");
    $stmt->execute([$livraisonId, $chauffeur_id]);

    if ($stmt->rowCount() === 0) {
        http_response_code(403);
        echo json_encode(['message' => 'Livraison introuvable ou accès interdit']);
        exit;
    }

    // Mise à jour
    $stmtUpdate = $pdo->prepare("UPDATE livraisons SET livree = 1, completed_at = NOW() WHERE id = ?");
    $stmtUpdate->execute([$livraisonId]);

    echo json_encode(['message' => 'Livraison marquée comme livrée avec succès']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['message' => 'Erreur serveur', 'error' => $e->getMessage()]);
}
