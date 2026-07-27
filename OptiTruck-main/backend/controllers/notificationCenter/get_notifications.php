<?php
require __DIR__ . '/../../vendor/autoload.php';
require __DIR__ . '/../../config/database.php';
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

// CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Authorization, Content-Type");
    http_response_code(200);
    exit();
}
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Authorization, Content-Type");
header("Content-Type: application/json; charset=UTF-8");

$secret = "dA7Z&J!pS9#qK2fT@3LmN8wC";

// Récupérer le token JWT dans le header Authorization
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

// Utiliser le claim sub pour user_id
if (isset($decoded->sub)) {
    $admin_id = (int)$decoded->sub;
} else {
    http_response_code(401);
    echo json_encode(['error' => 'ID utilisateur non trouvé dans le token']);
    exit;
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
        $unread_only = isset($_GET['unread_only']) && $_GET['unread_only'] === 'true';

        $whereClause = "WHERE user_id = ?";
        $params = [$admin_id];

        if ($unread_only) {
            $whereClause .= " AND is_read = 0";
        }

        // Note : On insère directement LIMIT et OFFSET car bind ne fonctionne pas sur LIMIT/OFFSET
        $sql = "
            SELECT 
                id,
                type,
                title,
                message,
                data,
                is_read,
                created_at,
                read_at
            FROM notifications 
            {$whereClause}
            ORDER BY created_at DESC 
            LIMIT $limit OFFSET $offset
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        $notifications = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $notifications[] = [
                'id' => (int)$row['id'],
                'type' => $row['type'],
                'title' => $row['title'],
                'message' => $row['message'],
                'data' => $row['data'] ? json_decode($row['data'], true) : null,
                'is_read' => (bool)$row['is_read'],
                'created_at' => $row['created_at'],
                'read_at' => $row['read_at']
            ];
        }

        // Compter les notifications non lues pour cet utilisateur
        $stmtCount = $pdo->prepare("
            SELECT COUNT(*) as unread_count 
            FROM notifications 
            WHERE user_id = ? AND is_read = 0
        ");
        $stmtCount->execute([$admin_id]);
        $unreadCount = $stmtCount->fetchColumn();

        echo json_encode([
            'success' => true,
            'notifications' => $notifications,
            'unread_count' => (int)$unreadCount
        ]);
        exit;

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input || !isset($input['notification_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'ID de notification requis']);
            exit;
        }

        $notification_id = (int)$input['notification_id'];

        $stmt = $pdo->prepare("
            UPDATE notifications 
            SET is_read = 1, read_at = NOW() 
            WHERE id = ? AND user_id = ?
        ");

        $stmt->execute([$notification_id, $admin_id]);

        if ($stmt->rowCount() > 0) {
            echo json_encode([
                'success' => true,
                'message' => 'Notification marquée comme lue'
            ]);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Notification non trouvée']);
        }
        exit;
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erreur de base de données: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erreur serveur: ' . $e->getMessage()
    ]);
}
?>
