<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require __DIR__ . '/../../vendor/autoload.php';
$pdo = require __DIR__ . '/../../config/database.php';

if (!$pdo instanceof PDO) {
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Connexion PDO invalide']);
    exit;
}

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Seules les requêtes GET sont autorisées']);
    exit;
}

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

    // ── Récupérer le camion assigné ───────────────────────────────────────────
    $stmtTruck = $pdo->prepare("SELECT id, code, capacite FROM camions WHERE chauffeur_id = ?");
    $stmtTruck->execute([$chauffeur_id]);
    $truck = $stmtTruck->fetch(PDO::FETCH_ASSOC);

    $truckInfo = null;
    $camion_id = null;

    if ($truck) {
        $truckInfo = [
            'id'       => (int)$truck['id'],
            'code'     => $truck['code'],
            'capacite' => (int)$truck['capacite'],
        ];
        $camion_id = (int)$truck['id'];
    }

    // ── Stats & livraisons ────────────────────────────────────────────────────
    $stats = [
        'todayDeliveries'     => 0,
        'completedDeliveries' => 0,
        'pendingDeliveries'   => 0,
        'assignedTruck'       => $truckInfo,
    ];

    $deliveries = [];

    if ($camion_id) {
        $conditionDate = "
            (
                DATE(l.date_livraison) = CURDATE()
                OR DATE(l.date_livraison) < CURDATE()
            )
        ";

        $stmtStats = $pdo->prepare("
            SELECT 
                COUNT(*)                                        AS total,
                SUM(CASE WHEN l.livree = 1 THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN l.livree = 0 THEN 1 ELSE 0 END) AS pending
            FROM livraisons l
            WHERE l.camion_id = ? AND $conditionDate
        ");
        $stmtStats->execute([$camion_id]);
        $statsResult = $stmtStats->fetch(PDO::FETCH_ASSOC);

        $stats['todayDeliveries']     = (int)($statsResult['total']     ?? 0);
        $stats['completedDeliveries'] = (int)($statsResult['completed'] ?? 0);
        $stats['pendingDeliveries']   = (int)($statsResult['pending']   ?? 0);

        $stmtDeliveries = $pdo->prepare("
            SELECT 
                l.id,
                l.commande_id          AS orderNumber,
                c.nom                  AS customerName,
                c.adresse              AS address,
                cmd.quantite           AS items,
                l.completed_at,
                l.date_livraison,
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

        while ($row = $stmtDeliveries->fetch(PDO::FETCH_ASSOC)) {
            $enRetard = (
                $row['date_livraison'] !== null &&
                $row['date_livraison'] < date('Y-m-d') &&
                $row['status'] !== 'completed'
            );
            $deliveries[] = [
                'id'            => (int)$row['id'],
                'orderNumber'   => $row['orderNumber'],
                'customerName'  => $row['customerName'],
                'address'       => $row['address'],
                'items'         => (int)$row['items'],
                'status'        => $row['status'],
                'deliveryTime'  => $row['completed_at'] ?? '—',
                'dateLivraison' => $row['date_livraison'],
                'enRetard'      => $enRetard,
            ];
        }
    }

    echo json_encode([
        'success'    => true,
        'stats'      => $stats,
        'deliveries' => $deliveries,
        'date'       => date('Y-m-d'),
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
