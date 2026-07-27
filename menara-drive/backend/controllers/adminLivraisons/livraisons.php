<?php
// ✅ DOIT être les toutes premières lignes — avant tout output
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

// ✅ Headers AVANT tout require
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require __DIR__ . '/../../vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

// ✅ Connexion DB avec gestion d'erreur propre
try {
    $pdo = require __DIR__ . '/../../config/database.php';
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Connexion DB échouée : ' . $e->getMessage()]);
    exit;
}

if (!$pdo instanceof PDO) {
    http_response_code(500);
    echo json_encode([
        'error' => 'PDO invalide',
        'type'  => gettype($pdo),
    ]);
    exit;
}

// ✅ Vérification JWT
$secret = "dA7Z&J!pS9#qK2fT@3LmN8wC";

function verifyJWT(string $secret): object {
    $headers    = function_exists('apache_request_headers')
                  ? apache_request_headers()
                  : getallheaders();
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

    try {
        return JWT::decode($matches[1], new Key($secret, 'HS256'));
    } catch (Exception $e) {
        http_response_code(401);
        echo json_encode(['error' => 'Token expiré ou invalide : ' . $e->getMessage()]);
        exit;
    }
}

$decoded = verifyJWT($secret);

// ✅ Rôles autorisés
if (!in_array($decoded->role ?? '', ['admin', 'chauffeur'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Rôle non autorisé : ' . ($decoded->role ?? 'inconnu')]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$data   = json_decode(file_get_contents("php://input"), true);

try {
    switch ($method) {

        case 'GET':
            $conditions = [];
            $params     = [];

            if (!isset($_GET['all']) || $_GET['all'] != '1') {
                $conditions[] = "DATE(l.date_livraison) = CURDATE()";
            }
            if (!empty($_GET['date'])) {
                $conditions = ["DATE(l.date_livraison) = ?"];
                $params[]   = $_GET['date'];
            }
            if (!empty($_GET['status'])) {
                $conditions[] = "l.status = ?";
                $params[]     = $_GET['status'];
            }
            if (!empty($_GET['camion_id'])) {
                $conditions[] = "l.camion_id = ?";
                $params[]     = (int)$_GET['camion_id'];
            }
            if (!empty($_GET['stock_id'])) {
                $conditions[] = "l.stock_id = ?";
                $params[]     = (int)$_GET['stock_id'];
            }

            // ✅ Chauffeur ne voit que ses livraisons
            if ($decoded->role === 'chauffeur') {
                if (!isset($decoded->chauffeur_id)) {
                    http_response_code(403);
                    echo json_encode(['error' => 'chauffeur_id absent du token']);
                    exit;
                }
                $conditions[] = "cam.chauffeur_id = ?";
                $params[]     = (int)$decoded->chauffeur_id;
            }

            $whereClause = count($conditions) > 0
                ? 'WHERE ' . implode(' AND ', $conditions)
                : '';

            $sql = "
                SELECT
                    l.id,
                    l.commande_id,
                    l.stock_id,
                    l.camion_id,
                    l.chauffeur_id,
                    l.client_id,
                    l.ordre,
                    l.distance,
                    l.livree,
                    l.status,
                    l.date_livraison,
                    l.completed_at,
                    l.note,
                    l.satisfaction_reelle,
                    l.temps_reel_minutes,
                    l.heure_prevue,
                    l.heure_prevue_depart,
                    l.temps_prevu,
                    l.created_at,
                    co.produit,
                    co.quantite,
                    co.date_commande,
                    cl.nom       AS client_nom,
                    cl.adresse   AS client_adresse,
                    s.nom        AS stock_nom,
                    s.adresse    AS stock_adresse,
                    cam.code     AS camion_code,
                    cam.capacite AS camion_capacite,
                    ch.nom       AS chauffeur_nom,
                    ch.telephone AS chauffeur_telephone
                FROM livraisons l
                LEFT JOIN commandes co  ON l.commande_id = co.id
                LEFT JOIN clients cl    ON co.client_id  = cl.id
                LEFT JOIN stocks s      ON l.stock_id    = s.id
                LEFT JOIN camions cam   ON l.camion_id   = cam.id
                LEFT JOIN chauffeurs ch ON cam.chauffeur_id = ch.id
                $whereClause
                ORDER BY l.date_livraison DESC, l.ordre ASC
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'POST':
            if ($decoded->role !== 'admin') {
                http_response_code(403);
                echo json_encode(['error' => 'Réservé à l\'admin']);
                exit;
            }
            if (
                empty($data['commande_id']) || empty($data['camion_id']) ||
                !isset($data['ordre'])      || !isset($data['distance']) ||
                !isset($data['livree'])
            ) {
                http_response_code(400);
                echo json_encode(['error' => 'Champs manquants : commande_id, camion_id, ordre, distance, livree requis']);
                exit;
            }
            $stmt = $pdo->prepare("
                INSERT INTO livraisons
                    (commande_id, stock_id, camion_id, chauffeur_id, client_id,
                     ordre, distance, livree, status, date_livraison, completed_at, note)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $data['commande_id'],
                $data['stock_id']       ?? null,
                $data['camion_id'],
                $data['chauffeur_id']   ?? null,
                $data['client_id']      ?? null,
                $data['ordre'],
                $data['distance'],
                $data['livree'],
                $data['status']         ?? 'planifiee',
                $data['date_livraison'] ?? date('Y-m-d'),
                $data['completed_at']   ?? null,
                $data['note']           ?? null,
            ]);
            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Livraison créée avec succès',
                'id'      => $pdo->lastInsertId(),
            ]);
            break;

        case 'PUT':
            if (empty($data['id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'ID manquant']);
                exit;
            }

            // ✅ Chauffeur ne peut modifier que ces champs
            $allowedFields = $decoded->role === 'admin'
                ? [
                    'commande_id', 'stock_id', 'camion_id', 'chauffeur_id', 'client_id',
                    'ordre', 'distance', 'livree', 'status', 'date_livraison',
                    'completed_at', 'note', 'satisfaction_reelle', 'temps_reel_minutes',
                    'heure_prevue', 'heure_prevue_depart', 'temps_prevu'
                  ]
                : ['livree', 'status', 'completed_at'];

            $fields = [];
            $values = [];
            foreach ($allowedFields as $field) {
                if (array_key_exists($field, $data)) {
                    $fields[] = "$field = ?";
                    $values[] = $data[$field];
                }
            }
            if (empty($fields)) {
                http_response_code(400);
                echo json_encode(['error' => 'Aucun champ valide à mettre à jour']);
                exit;
            }
            if (isset($data['livree']) && $data['livree'] == 1 && !isset($data['status'])) {
                $fields[] = "status = ?";
                $values[] = 'completed';
            }
            $values[] = $data['id'];
            $pdo->prepare(
                "UPDATE livraisons SET " . implode(', ', $fields) . " WHERE id = ?"
            )->execute($values);
            echo json_encode(['success' => true, 'message' => 'Livraison mise à jour']);
            break;

        case 'DELETE':
            if ($decoded->role !== 'admin') {
                http_response_code(403);
                echo json_encode(['error' => 'Réservé à l\'admin']);
                exit;
            }
            $id = $_GET['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                http_response_code(400);
                echo json_encode(['error' => 'ID invalide']);
                exit;
            }
            $check = $pdo->prepare("SELECT id FROM livraisons WHERE id = ?");
            $check->execute([$id]);
            if (!$check->fetch()) {
                http_response_code(404);
                echo json_encode(['error' => 'Livraison introuvable']);
                exit;
            }
            $pdo->prepare("DELETE FROM livraisons WHERE id = ?")->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'Livraison supprimée']);
            break;

        default:
            http_response_code(405);
            echo json_encode(['error' => 'Méthode non autorisée']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur DB : ' . $e->getMessage()]);
    error_log('[livraisons.php] PDO : ' . $e->getMessage());
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
    error_log('[livraisons.php] Exception : ' . $e->getMessage());
}