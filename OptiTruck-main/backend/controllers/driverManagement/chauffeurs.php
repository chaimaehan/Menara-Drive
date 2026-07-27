<?php

require __DIR__ . '/../../config/database.php';

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Gestion préflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    case 'GET':
        try {
            $stmt = $pdo->query("SELECT * FROM chauffeurs");
            $chauffeurs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($chauffeurs, JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Erreur serveur', 'details' => $e->getMessage()]);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents("php://input"), true);

        // Validation des champs obligatoires
        if (
            empty($data['nom']) ||
            empty($data['email']) ||
            empty($data['telephone']) ||
            !isset($data['permis']) || // permis peut être vide mais doit être présent
            empty($data['statut'])
        ) {
            http_response_code(400);
            echo json_encode(['error' => 'Champs requis manquants ou invalides']);
            exit;
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO chauffeurs (nom, email, telephone, permis, statut) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['nom'],
                $data['email'],
                $data['telephone'],
                $data['permis'],
                $data['statut']
            ]);

            $chauffeur_id = $pdo->lastInsertId();

            echo json_encode([
                'success' => true,
                'id' => $chauffeur_id,
                'nom' => $data['nom'],
                'email' => $data['email'],
                'telephone' => $data['telephone'],
                'permis' => $data['permis'],
                'statut' => $data['statut']
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Erreur lors de l’ajout', 'details' => $e->getMessage()]);
        }
        break;

    case 'PUT':
        parse_str($_SERVER['QUERY_STRING'], $params);
        $id = $params['id'] ?? null;

        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID requis']);
            exit;
        }

        $data = json_decode(file_get_contents("php://input"), true);

        if (
            empty($data['nom']) ||
            empty($data['email']) ||
            empty($data['telephone']) ||
            !isset($data['permis']) ||
            empty($data['statut'])
        ) {
            http_response_code(400);
            echo json_encode(['error' => 'Champs requis manquants ou invalides']);
            exit;
        }

        try {
            $stmt = $pdo->prepare("UPDATE chauffeurs SET nom = ?, email = ?, telephone = ?, permis = ?, statut = ? WHERE id = ?");
            $stmt->execute([
                $data['nom'],
                $data['email'],
                $data['telephone'],
                $data['permis'],
                $data['statut'],
                $id
            ]);

            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Échec de la mise à jour', 'details' => $e->getMessage()]);
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
            $stmt = $pdo->prepare("DELETE FROM chauffeurs WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Échec de la suppression', 'details' => $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Méthode non autorisée']);
        break;
}
