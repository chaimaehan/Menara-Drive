<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require __DIR__ . '/../../vendor/autoload.php';
require __DIR__ . '/../../config/database.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

// CORS headers
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

// Répondre aux requêtes OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Vérifier que c'est une requête POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Méthode non autorisée']);
    exit;
}

$secret = "dA7Z&J!pS9#qK2fT@3LmN8wC";

try {
    // Extraction du token JWT
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
        echo json_encode(['error' => 'Accès interdit ou ID chauffeur manquant']);
        exit;
    }

    $chauffeur_id = (int)$decoded->chauffeur_id;

    // Récupérer les données JSON
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['message'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Message requis']);
        exit;
    }

    $message = trim($input['message']);
    if (empty($message)) {
        http_response_code(400);
        echo json_encode(['error' => 'Message ne peut pas être vide']);
        exit;
    }

    // Vérifier que le chauffeur existe et récupérer ses infos
    $stmtChauffeur = $pdo->prepare("
        SELECT c.nom, cam.id as camion_id, cam.code as camion_code 
        FROM chauffeurs c 
        LEFT JOIN camions cam ON cam.chauffeur_id = c.id 
        WHERE c.id = ?
    ");
    $stmtChauffeur->execute([$chauffeur_id]);
    $chauffeurInfo = $stmtChauffeur->fetch(PDO::FETCH_ASSOC);

    if (!$chauffeurInfo) {
        http_response_code(404);
        echo json_encode(['error' => 'Chauffeur non trouvé']);
        exit;
    }

    // Créer l'activité de signalement de panne
    $messageComplet = "PANNE SIGNALÉE - Chauffeur: {$chauffeurInfo['nom']}";
    if ($chauffeurInfo['camion_code']) {
        $messageComplet .= " | Camion: {$chauffeurInfo['camion_code']}";
    }
    $messageComplet .= " | Message: {$message}";

    $stmtActivity = $pdo->prepare("
        INSERT INTO activities (type, message, user_id, related_id, created_at) 
        VALUES (?, ?, ?, ?, NOW())
    ");
    
    $stmtActivity->execute([
        'panne_signalee',
        $messageComplet,
        $chauffeur_id,
        $chauffeurInfo['camion_id']
    ]);

    // Envoyer une notification à tous les administrateurs
    $stmtAdmins = $pdo->prepare("
        SELECT id FROM users WHERE role = 'admin'
    ");
    $stmtAdmins->execute();
    $admins = $stmtAdmins->fetchAll(PDO::FETCH_ASSOC);

    // Créer une notification pour chaque admin
    $notificationMessage = "🚨 PANNE SIGNALÉE par {$chauffeurInfo['nom']}";
    if ($chauffeurInfo['camion_code']) {
        $notificationMessage .= " (Camion: {$chauffeurInfo['camion_code']})";
    }
    $notificationMessage .= " - {$message}";

    $stmtNotification = $pdo->prepare("
        INSERT INTO notifications (user_id, type, title, message, data, is_read, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, NOW())
    ");

    foreach ($admins as $admin) {
        $notificationData = json_encode([
            'chauffeur_id' => $chauffeur_id,
            'chauffeur_nom' => $chauffeurInfo['nom'],
            'camion_id' => $chauffeurInfo['camion_id'],
            'camion_code' => $chauffeurInfo['camion_code'],
            'message_panne' => $message,
            'priority' => 'high'
        ]);

        $stmtNotification->execute([
            $admin['id'],
            'panne_urgente',
            'Panne signalée - Action requise',
            $notificationMessage,
            $notificationData,
            0 // non lue
        ]);
    }

    // Optionnel: Mettre à jour le statut du camion s'il existe
    if ($chauffeurInfo['camion_id']) {
        // Vérifier d'abord si la colonne statut existe
        $checkColumn = $pdo->query("SHOW COLUMNS FROM camions LIKE 'statut'");
        if ($checkColumn->rowCount() > 0) {
            $stmtUpdateTruck = $pdo->prepare("
                UPDATE camions 
                SET statut = 'en_panne' 
                WHERE id = ?
            ");
            $stmtUpdateTruck->execute([$chauffeurInfo['camion_id']]);
        }
    }

    echo json_encode([
        'success' => true,
        'message' => 'Panne signalée avec succès. L\'administrateur sera notifié.'
    ]);

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