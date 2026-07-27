<?php

require __DIR__ . '/../../config/database.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents("php://input"), true);

try {
    switch ($method) {
        case 'GET':
            $stmt = $pdo->query("SELECT * FROM stocks ORDER BY id DESC");
            $stocks = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($stocks);
            break;

        case 'POST':
            if (
                empty($data['nom']) ||
                empty($data['adresse']) ||
                !isset($data['latitude']) ||
                !isset($data['longitude']) ||
                empty($data['statut'])
            ) {
                http_response_code(400);
                echo json_encode(['error' => 'Champs manquants ou invalides']);
                exit();
            }

            $stmt = $pdo->prepare("INSERT INTO stocks (nom, adresse, latitude, longitude, statut) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['nom'],
                $data['adresse'],
                $data['latitude'],
                $data['longitude'],
                $data['statut']
            ]);
            echo json_encode(['success' => true, 'message' => 'Stock ajouté']);
            break;

        case 'PUT':
            $id = $_GET['id'] ?? null;

            if (
                !$id ||
                empty($data['nom']) ||
                empty($data['adresse']) ||
                !isset($data['latitude']) ||
                !isset($data['longitude']) ||
                empty($data['statut'])
            ) {
                http_response_code(400);
                echo json_encode(['error' => 'Champs manquants ou invalides']);
                exit();
            }

            $stmt = $pdo->prepare("UPDATE stocks SET nom = ?, adresse = ?, latitude = ?, longitude = ?, statut = ? WHERE id = ?");
            $stmt->execute([
                $data['nom'],
                $data['adresse'],
                $data['latitude'],
                $data['longitude'],
                $data['statut'],
                $id
            ]);
            echo json_encode(['success' => true, 'message' => 'Stock mis à jour']);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                http_response_code(400);
                echo json_encode(['error' => 'ID invalide']);
                exit();
            }

            $stmt = $pdo->prepare("DELETE FROM stocks WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'Stock supprimé']);
            break;

        default:
            http_response_code(405);
            echo json_encode(['error' => 'Méthode non autorisée']);
            break;
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur serveur interne']);
    error_log('PDO Error: ' . $e->getMessage());
}
