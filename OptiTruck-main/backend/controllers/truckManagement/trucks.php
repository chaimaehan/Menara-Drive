<?php

require __DIR__ . '/../../config/database.php';

// CORS
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Headers: Authorization, Content-Type");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");

// Répondre aux requêtes préflight (CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        try {
            $stmt = $pdo->query("
                SELECT c.id, c.code, c.type, c.capacite, c.chauffeur_id, ch.nom AS chauffeur_nom, ch.matricule AS chauffeur_matricule
                FROM camions c
                LEFT JOIN chauffeurs ch ON c.chauffeur_id = ch.id
                ORDER BY c.id DESC
            ");
            $camions = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($camions);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Erreur serveur', 'details' => $e->getMessage()]);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents("php://input"), true);
        if (empty($data['code']) || empty($data['type']) || empty($data['capacite']) || empty($data['chauffeur_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Champs requis manquants (code, type, capacite, chauffeur_id)']);
            exit;
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO camions (code, type, capacite, chauffeur_id) VALUES (?, ?, ?, ?)");
            $stmt->execute([
                $data['code'],
                $data['type'],
                $data['capacite'],
                $data['chauffeur_id']
            ]);
            echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Erreur lors de l’insertion', 'details' => $e->getMessage()]);
        }
        break;

    case 'PUT':
        parse_str($_SERVER['QUERY_STRING'], $params);
        $id = $params['id'] ?? null;
        $data = json_decode(file_get_contents("php://input"), true);

        if (!$id || empty($data['code']) || empty($data['type']) || empty($data['capacite']) || empty($data['chauffeur_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Champs ou ID manquants (code, type, capacite, chauffeur_id)']);
            exit;
        }

        try {
            $stmt = $pdo->prepare("UPDATE camions SET code = ?, type = ?, capacite = ?, chauffeur_id = ? WHERE id = ?");
            $stmt->execute([
                $data['code'],
                $data['type'],
                $data['capacite'],
                $data['chauffeur_id'],
                $id
            ]);
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Erreur mise à jour', 'details' => $e->getMessage()]);
        }
        break;

    case 'DELETE':
        parse_str($_SERVER['QUERY_STRING'], $params);
        $id = $params['id'] ?? null;

        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID requis']);
            exit;
        }

        try {
            $stmt = $pdo->prepare("DELETE FROM camions WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Erreur suppression', 'details' => $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Méthode non autorisée']);
        break;
}
?>