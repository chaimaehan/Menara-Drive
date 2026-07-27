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

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$secret = "dA7Z&J!pS9#qK2fT@3LmN8wC";

try {
    // Récupération du token
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
        echo json_encode(['error' => 'Token manquant ou invalide']);
        exit;
    }

    $jwt = $matches[1];
    $decoded = JWT::decode($jwt, new Key($secret, 'HS256'));

    if ($decoded->role !== 'chauffeur' || !isset($decoded->chauffeur_id)) {
        http_response_code(403);
        echo json_encode(['error' => 'Accès interdit']);
        exit;
    }

    $chauffeur_id = (int)$decoded->chauffeur_id;

    // Récupération des données POST
    $data = json_decode(file_get_contents("php://input"), true);
    if (!isset($data['deliveryId']) || !isset($data['status'])) {
        http_response_code(400);
        echo json_encode(['error' => 'ID livraison ou statut manquant']);
        exit;
    }

    $delivery_id  = (int)$data['deliveryId'];
    $status       = $data['status'];
    $satisfaction = isset($data['satisfaction_reelle'])  ? (float)$data['satisfaction_reelle']  : null;
    $cout         = isset($data['cout_reel'])            ? (float)$data['cout_reel']            : null;
    $temps        = isset($data['temps_reel_minutes'])   ? (int)$data['temps_reel_minutes']     : null;

    // Vérifier que la livraison appartient au chauffeur
    $stmtCheck = $pdo->prepare("
        SELECT l.id 
        FROM livraisons l 
        INNER JOIN camions c ON l.camion_id = c.id 
        WHERE l.id = ? AND c.chauffeur_id = ?
    ");
    $stmtCheck->execute([$delivery_id, $chauffeur_id]);

    if (!$stmtCheck->fetch()) {
        http_response_code(403);
        echo json_encode(['error' => 'Livraison non autorisée pour ce chauffeur']);
        exit;
    }

    // Récupérer user_id lié au chauffeur
    $stmtUser = $pdo->prepare("SELECT id FROM users WHERE chauffeur_id = ?");
    $stmtUser->execute([$chauffeur_id]);
    $user    = $stmtUser->fetch(PDO::FETCH_ASSOC);
    $user_id = $user ? $user['id'] : null;

    if (!$user_id) {
        http_response_code(500);
        echo json_encode(['error' => 'Utilisateur introuvable']);
        exit;
    }

    // Démarrer la transaction
    $pdo->beginTransaction();

    try {
        switch ($status) {
            case 'in-progress':
                // ✅ CORRIGÉ : mise à jour du status ET livree à 0 pour éviter confusion
                $stmt = $pdo->prepare("
                    UPDATE livraisons 
                    SET status = 'in-progress',
                        livree = 0
                    WHERE id = ?
                ");
                $stmt->execute([$delivery_id]);

                $stmtActivity = $pdo->prepare("
                    INSERT INTO activities (user_id, type, message, related_id, created_at) 
                    VALUES (?, 'delivery_started', 'Livraison démarrée', ?, NOW())
                ");
                $stmtActivity->execute([$user_id, $delivery_id]);
                break;

            case 'completed':
                // ✅ CORRIGÉ : mise à jour status ET livree = 1
                $stmt = $pdo->prepare("
                    UPDATE livraisons 
                    SET status = 'completed',
                        livree = 1, 
                        satisfaction_reelle = ?,
                        cout_reel = ?,
                        temps_reel_minutes = ?,
                        completed_at = NOW()
                    WHERE id = ?
                ");
                $stmt->execute([$satisfaction, $cout, $temps, $delivery_id]);

                $stmtActivity = $pdo->prepare("
                    INSERT INTO activities (user_id, type, message, related_id, created_at) 
                    VALUES (?, 'delivery_completed', 'Livraison terminée avec succès', ?, NOW())
                ");
                $stmtActivity->execute([$user_id, $delivery_id]);
                break;

            default:
                throw new Exception('Statut non valide (utilise in-progress ou completed)');
        }

        // Récupérer les données mises à jour
        $stmtUpdated = $pdo->prepare("
            SELECT 
                l.*, 
                c.nom        AS customerName, 
                c.adresse    AS address, 
                c.telephone  AS phone, 
                cmd.quantite AS items,
                CONCAT('CMD-', cmd.id) AS orderNumber
            FROM livraisons l
            INNER JOIN commandes cmd ON l.commande_id = cmd.id
            INNER JOIN clients c ON cmd.client_id = c.id
            WHERE l.id = ?
        ");
        $stmtUpdated->execute([$delivery_id]);
        $updatedDelivery = $stmtUpdated->fetch(PDO::FETCH_ASSOC);

        $pdo->commit();

        echo json_encode([
            'success'   => true,
            'message'   => 'Statut de livraison mis à jour avec succès',
            'delivery'  => $updatedDelivery,
            'timestamp' => date('Y-m-d H:i:s')
        ]);

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'debug' => [
            'file'          => $e->getFile(),
            'line'          => $e->getLine(),
            'received_data' => $data ?? null
        ]
    ]);
}