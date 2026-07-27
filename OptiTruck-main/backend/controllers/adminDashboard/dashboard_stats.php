<?php

require __DIR__ . '/../../vendor/autoload.php';
require __DIR__ . '/../../config/database.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

// CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, OPTIONS");
    header("Access-Control-Allow-Headers: Authorization, Content-Type");
    http_response_code(200);
    exit();
}
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Authorization, Content-Type");
header("Content-Type: application/json; charset=UTF-8");

$secret = "dA7Z&J!pS9#qK2fT@3LmN8wC";

// JWT
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
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(['error' => 'Token invalide ou expiré', 'details' => $e->getMessage()]);
    exit;
}
if ($decoded->role !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Accès interdit']);
    exit;
}

// Fonction "Il y a ..."
function getTimeAgo($datetime) {
    if (!$datetime) return 'Date inconnue';
    $time = time() - strtotime($datetime);
    if ($time < 60) return 'Il y a quelques secondes';
    if ($time < 3600) return 'Il y a ' . floor($time / 60) . ' minute(s)';
    if ($time < 86400) return 'Il y a ' . floor($time / 3600) . ' heure(s)';
    if ($time < 2592000) return 'Il y a ' . floor($time / 86400) . ' jour(s)';
    return date('d/m/Y à H:i', strtotime($datetime));
}

try {
    // STATISTIQUES
    $stats = [
        'totalDrivers' => (int) $pdo->query("SELECT COUNT(*) FROM chauffeurs")->fetchColumn(),
        'totalTrucks' => (int) $pdo->query("SELECT COUNT(*) FROM camions")->fetchColumn(),
        'activeDeliveries' => (int) $pdo->query("SELECT COUNT(*) FROM livraisons WHERE livree = 0")->fetchColumn(),
        'completedToday' => (int) $pdo->query("SELECT COUNT(*) FROM livraisons WHERE livree = 1 AND DATE(completed_at) = CURDATE()")->fetchColumn()
    ];

    $activities = [];

    // LIVRAISONS TERMINÉES
    $stmt = $pdo->query("
        SELECT 
            'delivery' AS type,
            CONCAT('Livraison terminée - Distance: ', COALESCE(distance, 0), 'km') AS message,
            completed_at AS activity_time,
            id AS related_id
        FROM livraisons
        WHERE livree = 1 AND completed_at IS NOT NULL
        ORDER BY completed_at DESC
        LIMIT 5
    ");
    $activities = array_merge($activities, $stmt->fetchAll(PDO::FETCH_ASSOC));

    // LIVRAISONS EN COURS
    $stmt = $pdo->query("
        SELECT 
            'delivery' AS type,
            CONCAT('Livraison en cours - Camion ID: ', camion_id) AS message,
            NOW() AS activity_time,
            id AS related_id
        FROM livraisons
        WHERE livree = 0
        ORDER BY id DESC
        LIMIT 5
    ");
    $activities = array_merge($activities, $stmt->fetchAll(PDO::FETCH_ASSOC));

    // COMMANDES
    $stmt = $pdo->query("
        SELECT 
            'order' AS type,
            CONCAT('Nouvelle commande: ', produit, ' (Qté: ', quantite, ')') AS message,
            date_commande AS activity_time,
            id AS related_id
        FROM commandes
        ORDER BY date_commande DESC
        LIMIT 5
    ");
    $activities = array_merge($activities, $stmt->fetchAll(PDO::FETCH_ASSOC));

    // CHAUFFEURS AJOUTÉS
    $stmt = $pdo->query("
        SELECT 
            'driver' AS type,
            CONCAT('Nouveau chauffeur ajouté: ', nom) AS message,
            created_at AS activity_time,
            id AS related_id
        FROM chauffeurs
        ORDER BY created_at DESC
        LIMIT 3
    ");
    $activities = array_merge($activities, $stmt->fetchAll(PDO::FETCH_ASSOC));

    // CAMIONS AJOUTÉS
    $stmt = $pdo->query("
        SELECT 
            'truck' AS type,
            CONCAT('Nouveau camion enregistré: ', code) AS message,
            created_at AS activity_time,
            id AS related_id
        FROM camions
        ORDER BY created_at DESC
        LIMIT 3
    ");
    $activities = array_merge($activities, $stmt->fetchAll(PDO::FETCH_ASSOC));

    // TRI + FORMATAGE
    usort($activities, fn($a, $b) => strtotime($b['activity_time']) - strtotime($a['activity_time']));
    $formatted = [];
    foreach (array_slice($activities, 0, 10) as $index => $activity) {
        $formatted[] = [
            'id' => $activity['related_id'] . '_' . $activity['type'] . '_' . $index,
            'message' => $activity['message'],
            'time' => getTimeAgo($activity['activity_time']),
            'type' => $activity['type'],
            'related_id' => $activity['related_id']
        ];
    }

    echo json_encode([
        'success' => true,
        'stats' => $stats,
        'activities' => $formatted
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur serveur : ' . $e->getMessage()]);
}
