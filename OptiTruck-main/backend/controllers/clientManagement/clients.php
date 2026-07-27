<?php

$pdo = require __DIR__ . '/../../config/database.php';
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
            $stmt = $pdo->query("SELECT * FROM clients ORDER BY id DESC");
            $clients = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($clients);
            break;

        case 'POST':
            $errors = [];
            if (empty($data['nom'])) $errors[] = 'Nom requis';
            if (empty($data['adresse'])) $errors[] = 'Adresse requise';
            if (!empty($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                $errors[] = 'Email invalide';
            }
            if (!empty($data['latitude']) && !is_numeric($data['latitude'])) {
                $errors[] = 'Latitude invalide';
            }
            if (!empty($data['longitude']) && !is_numeric($data['longitude'])) {
                $errors[] = 'Longitude invalide';
            }
            if (!empty($data['prix']) && !is_numeric($data['prix'])) {
                $errors[] = 'Prix invalide';
            }
            if (!empty($data['solde']) && !is_numeric($data['solde'])) {
                $errors[] = 'Solde invalide';
            }

            if (!empty($errors)) {
                http_response_code(400);
                echo json_encode(['error' => implode(', ', $errors)]);
                exit();
            }

            $stmt = $pdo->prepare("
                INSERT INTO clients (nom, adresse, telephone, email, latitude, longitude, prix, solde) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $data['nom'],
                $data['adresse'],
                $data['telephone'] ?? null,
                $data['email'] ?? null,
                $data['latitude'] ?? null,
                $data['longitude'] ?? null,
                isset($data['prix']) && $data['prix'] !== '' ? $data['prix'] : null,
                isset($data['solde']) && $data['solde'] !== '' ? $data['solde'] : 0.00,
            ]);
            $id = $pdo->lastInsertId();
            echo json_encode(['success' => true, 'message' => 'Client ajouté', 'id' => $id]);
            break;

        case 'PUT':
            $errors = [];
            if (empty($data['id'])) $errors[] = 'ID requis';
            if (empty($data['nom'])) $errors[] = 'Nom requis';
            if (empty($data['adresse'])) $errors[] = 'Adresse requise';
            if (!empty($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                $errors[] = 'Email invalide';
            }
            if (!empty($data['latitude']) && !is_numeric($data['latitude'])) {
                $errors[] = 'Latitude invalide';
            }
            if (!empty($data['longitude']) && !is_numeric($data['longitude'])) {
                $errors[] = 'Longitude invalide';
            }
            if (!empty($data['prix']) && !is_numeric($data['prix'])) {
                $errors[] = 'Prix invalide';
            }
            if (!empty($data['solde']) && !is_numeric($data['solde'])) {
                $errors[] = 'Solde invalide';
            }

            if (!empty($errors)) {
                http_response_code(400);
                echo json_encode(['error' => implode(', ', $errors)]);
                exit();
            }

            $stmt = $pdo->prepare("
                UPDATE clients 
                SET nom = ?, adresse = ?, telephone = ?, email = ?, latitude = ?, longitude = ?, prix = ?, solde = ?
                WHERE id = ?
            ");
            $stmt->execute([
                $data['nom'],
                $data['adresse'],
                $data['telephone'] ?? null,
                $data['email'] ?? null,
                $data['latitude'] ?? null,
                $data['longitude'] ?? null,
                isset($data['prix']) && $data['prix'] !== '' ? $data['prix'] : null,
                isset($data['solde']) && $data['solde'] !== '' ? $data['solde'] : 0.00,
                $data['id']
            ]);
           echo json_encode([
    'success'       => true,
    'message'       => 'Client mis à jour',
    'rows_affected' => $stmt->rowCount(),
    'prix_recu'     => $data['prix'] ?? 'NON RECU',
    'id_recu'       => $data['id'] ?? 'NON RECU'
]);
            break;

        case 'DELETE':
            $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
            if ($id <= 0) {
                http_response_code(400);
                echo json_encode(['error' => 'ID invalide']);
                exit();
            }

            $stmt = $pdo->prepare("DELETE FROM clients WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'Client supprimé']);
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