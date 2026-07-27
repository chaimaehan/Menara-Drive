<?php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config/database.php'; // Assure-toi que $pdo est bien défini ici

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            $stmt = $pdo->query("SELECT * FROM stocks");
            $stocks = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(["success" => true, "stocks" => $stocks]);
            break;

        case 'POST':
            $data = json_decode(file_get_contents("php://input"), true);
            if (
                !isset($data['nom'], $data['adresse'], $data['latitude'], $data['longitude'], $data['statut'], $data['capacite_actuelle'])
            ) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Champs manquants"]);
                exit;
            }

            $stmt = $pdo->prepare("
                INSERT INTO stocks (nom, adresse, latitude, longitude, statut, capacite_actuelle)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $data['nom'],
                $data['adresse'],
                $data['latitude'],
                $data['longitude'],
                $data['statut'],
                $data['capacite_actuelle']
            ]);

            echo json_encode(["success" => true]);
            break;

        case 'PUT':
            parse_str(file_get_contents("php://input"), $data);
            if (
                !isset($data['id'], $data['nom'], $data['adresse'], $data['latitude'], $data['longitude'], $data['statut'], $data['capacite_actuelle'])
            ) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Champs manquants"]);
                exit;
            }

            $stmt = $pdo->prepare("
                UPDATE stocks SET
                    nom = ?, 
                    adresse = ?, 
                    latitude = ?, 
                    longitude = ?, 
                    statut = ?, 
                    capacite_actuelle = ?
                WHERE id = ?
            ");
            $stmt->execute([
                $data['nom'],
                $data['adresse'],
                $data['latitude'],
                $data['longitude'],
                $data['statut'],
                $data['capacite_actuelle'],
                $data['id']
            ]);

            echo json_encode(["success" => true]);
            break;

        case 'DELETE':
            parse_str(file_get_contents("php://input"), $data);
            if (!isset($data['id'])) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "ID manquant"]);
                exit;
            }

            $stmt = $pdo->prepare("DELETE FROM stocks WHERE id = ?");
            $stmt->execute([$data['id']]);

            echo json_encode(["success" => true]);
            break;

        default:
            http_response_code(405);
            echo json_encode(["success" => false, "error" => "Méthode non autorisée"]);
            break;
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Erreur serveur: " . $e->getMessage()]);
}
