<?php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Authorization, Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require __DIR__ . '/../../vendor/autoload.php';
$pdo = require __DIR__ . '/../../config/database.php';

if (!$pdo instanceof PDO) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Connexion PDO invalide']);
    exit;
}

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

$secret = "dA7Z&J!pS9#qK2fT@3LmN8wC";

try {
    // ── Vérification JWT ──────────────────────────────────────────────────────
    $headers    = function_exists('apache_request_headers') ? apache_request_headers() : getallheaders();
    $authHeader = null;
    foreach ($headers as $key => $value) {
        if (strtolower(trim($key)) === 'authorization') {
            $authHeader = $value;
            break;
        }
    }

    if (!$authHeader || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        http_response_code(401);
        echo json_encode(['error' => 'Token manquant ou invalide']);
        exit;
    }

    $jwt     = $matches[1];
    $decoded = JWT::decode($jwt, new Key($secret, 'HS256'));

    if ($decoded->role !== 'chauffeur') {
        http_response_code(403);
        echo json_encode(['error' => 'Accès interdit']);
        exit;
    }

    // ── Récupère chauffeur_id depuis token OU depuis la DB ────────────────────
    if (isset($decoded->chauffeur_id) && $decoded->chauffeur_id) {
        $chauffeur_id = (int)$decoded->chauffeur_id;
    } else {
        $user_id = (int)$decoded->sub;
        $stmtC   = $pdo->prepare("SELECT id FROM chauffeurs WHERE user_id = ?");
        $stmtC->execute([$user_id]);
        $chauffeur = $stmtC->fetch(PDO::FETCH_ASSOC);
        if (!$chauffeur) {
            http_response_code(403);
            echo json_encode(['error' => 'Chauffeur introuvable pour cet utilisateur']);
            exit;
        }
        $chauffeur_id = (int)$chauffeur['id'];
    }

    // ── Récupérer le camion du chauffeur ──────────────────────────────────────
    $stmtTruck = $pdo->prepare("SELECT id FROM camions WHERE chauffeur_id = ?");
    $stmtTruck->execute([$chauffeur_id]);
    $truck = $stmtTruck->fetch(PDO::FETCH_ASSOC);

    if (!$truck) {
        http_response_code(404);
        echo json_encode(['error' => 'Aucun camion assigné']);
        exit;
    }

    $camion_id = (int)$truck['id'];

    $conditionDate = "
        (
            DATE(l.date_livraison) = CURDATE()
            OR DATE(l.date_livraison) < CURDATE()
        )
    ";

    // ── Route simple ──────────────────────────────────────────────────────────
    $stmtRoute = $pdo->prepare("
        SELECT 
            l.id, l.ordre,
            c.nom        AS clientName,
            c.adresse    AS address,
            c.telephone  AS phone,
            c.latitude,  c.longitude,
            cmd.quantite AS quantity,
            l.livree,    l.date_livraison
        FROM livraisons l
        INNER JOIN commandes cmd ON l.commande_id = cmd.id
        INNER JOIN clients c    ON cmd.client_id  = c.id
        WHERE l.camion_id = ? AND $conditionDate
        ORDER BY l.livree ASC, l.ordre ASC
    ");
    $stmtRoute->execute([$camion_id]);
    $route = $stmtRoute->fetchAll(PDO::FETCH_ASSOC);

    // ── Livraisons détaillées ─────────────────────────────────────────────────
    $stmtDeliveries = $pdo->prepare("
        SELECT 
            l.id,
            l.commande_id             AS orderNumber,
            c.nom                     AS customerName,
            c.adresse                 AS address,
            COALESCE(c.telephone, '') AS phone,
            COALESCE(c.email, '')     AS email,
            c.latitude,              c.longitude,
            cmd.quantite              AS items,
            cmd.priorite,
            l.completed_at,          l.date_livraison,
            CASE 
                WHEN l.livree = 1             THEN 'completed'
                WHEN l.status = 'in-progress' THEN 'in-progress'
                ELSE 'pending'
            END AS status
        FROM livraisons l
        INNER JOIN commandes cmd ON l.commande_id = cmd.id
        INNER JOIN clients c    ON cmd.client_id  = c.id
        WHERE l.camion_id = ? AND $conditionDate
        ORDER BY l.livree ASC, l.ordre ASC
    ");
    $stmtDeliveries->execute([$camion_id]);

    $deliveries = [];
    while ($row = $stmtDeliveries->fetch(PDO::FETCH_ASSOC)) {
        $coordinates = null;
        if (!empty($row['latitude']) && !empty($row['longitude'])) {
            $coordinates = [(float)$row['latitude'], (float)$row['longitude']];
        }
        $enRetard = (
            $row['date_livraison'] !== null &&
            $row['date_livraison'] < date('Y-m-d') &&
            $row['status'] !== 'completed'
        );
        $deliveries[] = [
            'id'            => (int)$row['id'],
            'orderNumber'   => $row['orderNumber'],
            'customerName'  => !empty($row['customerName']) ? $row['customerName'] : 'Client inconnu',
            'address'       => !empty($row['address'])      ? $row['address']      : 'Adresse non renseignée',
            'phone'         => trim($row['phone']) !== ''   ? trim($row['phone'])  : null,
            'email'         => trim($row['email']) !== ''   ? trim($row['email'])  : null,
            'items'         => (int)$row['items'],
            'status'        => $row['status'],
            'priority'      => !empty($row['priorite'])     ? $row['priorite']     : 'medium',
            'deliveryTime'  => $row['completed_at']         ?? null,
            'dateLivraison' => $row['date_livraison'],
            'enRetard'      => $enRetard,
            'coordinates'   => $coordinates,
        ];
    }

    // ── Distance totale ───────────────────────────────────────────────────────
    $stmtDistance = $pdo->prepare("
        SELECT SUM(distance) AS totalDistance 
        FROM livraisons l
        WHERE l.camion_id = ? AND $conditionDate
    ");
    $stmtDistance->execute([$camion_id]);
    $totalDistance      = (float)($stmtDistance->fetchColumn() ?? 0);
    $estimatedMinutes   = round(($totalDistance / 50) * 60);
    $hours              = floor($estimatedMinutes / 60);
    $minutes            = $estimatedMinutes % 60;
    $estimatedTime      = $hours > 0 ? "{$hours}h {$minutes}min" : "{$minutes}min";

    $totalStops          = count($deliveries);
    $completedDeliveries = array_filter($deliveries, fn($d) => $d['status'] === 'completed');
    $progressPercentage  = $totalStops > 0
                           ? round((count($completedDeliveries) / $totalStops) * 100, 1) : 0;

    echo json_encode([
        'success'       => true,
        'route'         => $route,
        'deliveries'    => $deliveries,
        'totalStops'    => $totalStops,
        'totalDistance' => $totalDistance,
        'estimatedTime' => $estimatedTime,
        'weather'       => ['temperature' => '22°C', 'condition' => 'Ensoleillé', 'icon' => '☀️', 'trafficStatus' => 'Fluide'],
        'realTimeStats' => [
            'deliveredToday'       => count($completedDeliveries),
            'averageDeliveryTime'  => '12min',
            'customerSatisfaction' => 4.8,
            'fuelEfficiency'       => '8.2L/100km',
            'progressPercentage'   => $progressPercentage,
        ],
        'chauffeurInfo' => [
            'id'        => $chauffeur_id,
            'name'      => $decoded->name ?? 'Chauffeur',
            'vehicleId' => $camion_id,
        ],
        'date' => date('Y-m-d'),
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage(),
        'line'    => $e->getLine(),
    ]);
}