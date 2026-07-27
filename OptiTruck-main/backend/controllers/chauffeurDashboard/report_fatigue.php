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

// ── Marqueur de diagnostic temporaire ─────────────────────────────────────
// Permet de vérifier si CE fichier précis est bien celui exécuté par Apache.
// Teste dans le navigateur : .../report_fatigue.php?ping=1
if (isset($_GET['ping'])) {
    echo json_encode(['pong' => true, 'version' => 'v3-users-fix-18juillet']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Seules les requêtes POST sont autorisées']);
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

    // ── Lecture du corps JSON envoyé par FatigueMonitor.jsx ───────────────────
    $input = json_decode(file_get_contents('php://input'), true);

    $type      = isset($input['type'])     ? trim($input['type'])     : null; // microsommeil | perclos | baillements
    $niveau    = isset($input['niveau'])   ? trim($input['niveau'])   : 'attention'; // attention | critique
    $camionIn  = isset($input['camionId']) ? $input['camionId']       : null;
    $details   = isset($input['details'])  ? json_encode($input['details']) : null;

    $typesValides = ['microsommeil', 'perclos', 'baillements', 'distraction', 'telephone'];
    if (!$type || !in_array($type, $typesValides, true)) {
        http_response_code(400);
        echo json_encode(['error' => "Type d'alerte invalide"]);
        exit;
    }

    // ── Camion associé (celui envoyé par le front, sinon celui assigné) ───────
    $camion_id = $camionIn ? (int)$camionIn : null;
    if (!$camion_id) {
        $stmtTruck = $pdo->prepare("SELECT id FROM camions WHERE chauffeur_id = ?");
        $stmtTruck->execute([$chauffeur_id]);
        $truck = $stmtTruck->fetch(PDO::FETCH_ASSOC);
        $camion_id = $truck ? (int)$truck['id'] : null;
    }

    // ── Insertion de l'alerte ──────────────────────────────────────────────────
    $stmtInsert = $pdo->prepare("
        INSERT INTO fatigue_alerts (chauffeur_id, camion_id, type, niveau, details, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
    ");
    $stmtInsert->execute([$chauffeur_id, $camion_id, $type, $niveau, $details]);
    $alertId = $pdo->lastInsertId();

    // ── Notification des administrateurs ──────────────────────────────────────
    $stmtChauffeur = $pdo->prepare("SELECT nom FROM chauffeurs WHERE id = ?");
    $stmtChauffeur->execute([$chauffeur_id]);
    $chauffeurNom = $stmtChauffeur->fetchColumn() ?: "Chauffeur #$chauffeur_id";

    $libelles = [
        'microsommeil' => 'micro-sommeil détecté (yeux fermés prolongés)',
        'perclos'      => 'taux de fermeture des yeux anormalement élevé',
        'baillements'  => 'bâillements répétés détectés',
        'distraction'  => "visage non détecté (regard hors route ou caméra masquée)",
        'telephone'    => "utilisation du téléphone détectée au volant",
    ];
    $titre = 'Alerte fatigue';
    $message = "Alerte fatigue - $chauffeurNom : " . ($libelles[$type] ?? $type);

    $stmtAdmins = $pdo->prepare("SELECT id FROM users WHERE role = 'admin'");
    $stmtAdmins->execute();
    $adminIds = $stmtAdmins->fetchAll(PDO::FETCH_COLUMN);

    $stmtNotif = $pdo->prepare("
        INSERT INTO notifications (title, user_id, titre, message, type, lu, created_at, data, is_read, read_at)
        VALUES (?, ?, ?, ?, 'warning', 0, NOW(), NULL, 0, NULL)
    ");
    foreach ($adminIds as $adminId) {
        $stmtNotif->execute([$titre, $adminId, $titre, $message]);
    }

    echo json_encode([
        'success' => true,
        'alertId' => (int)$alertId,
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine()]);
}