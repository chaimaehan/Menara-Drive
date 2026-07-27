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
    // Cas spécial : récupération des clients
    if (isset($_GET['fetch_clients']) && $_GET['fetch_clients'] === 'true') {
        $stmt = $pdo->query("SELECT id, nom FROM clients ORDER BY nom ASC");
        $clients = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($clients);
        exit();
    }

    switch ($method) {
        case 'GET':
            if (isset($_GET['date']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['date'])) {
                $date = $_GET['date'];
                $stmt = $pdo->prepare("SELECT * FROM commandes WHERE DATE(date_commande) = ? ORDER BY date_commande DESC");
                $stmt->execute([$date]);
            } else {
                $stmt = $pdo->query("SELECT * FROM commandes ORDER BY date_commande DESC");
            }
            $commandes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($commandes);
            break;

        case 'POST':
            if (
                empty($data['produit']) ||
                empty($data['quantite']) ||
                empty($data['date_commande']) ||
                !isset($data['livree'])
            ) {
                http_response_code(400);
                echo json_encode(['error' => 'Champs manquants']);
                exit();
            }

            // Si client_id est fourni, on l'utilise directement
            $client_id = $data['client_id'] ?? null;

            // Sinon, on crée (ou réutilise) un client à partir des infos fournies
            if (!$client_id) {
                $nom_client = trim($data['nom_client'] ?? '');
                $adresse = trim($data['adresse'] ?? '');
                $telephone = trim($data['telephone'] ?? '');
                $email = trim($data['email'] ?? '');

                if (!$nom_client) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Client manquant : fournissez client_id ou nom_client']);
                    exit();
                }

                // Vérifier si un client avec ce nom existe déjà
                $stmtCheck = $pdo->prepare("SELECT id FROM clients WHERE nom = ? LIMIT 1");
                $stmtCheck->execute([$nom_client]);
                $existing = $stmtCheck->fetch(PDO::FETCH_ASSOC);

                if ($existing) {
                    $client_id = $existing['id'];
                } else {
                    $stmtInsertClient = $pdo->prepare("INSERT INTO clients (nom, adresse, telephone, email, latitude, longitude) VALUES (?, ?, ?, ?, NULL, NULL)");
                    $stmtInsertClient->execute([$nom_client, $adresse, $telephone, $email]);
                    $client_id = $pdo->lastInsertId();
                }
            }

            $stmt = $pdo->prepare("INSERT INTO commandes (client_id, produit, quantite, date_commande, livree, priorite, date_limite) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $client_id,
                $data['produit'],
                $data['quantite'],
                $data['date_commande'],
                $data['livree'],
                $data['priorite'] ?? 'normale',
                $data['date_livraison'] ?? null
            ]);
            echo json_encode(['success' => true, 'message' => 'Commande ajoutée', 'client_id' => $client_id]);
            break;

        case 'PUT':
            if (
                empty($data['id']) ||
                empty($data['client_id']) ||
                empty($data['produit']) ||
                empty($data['quantite']) ||
                empty($data['date_commande'])
            ) {
                http_response_code(400);
                echo json_encode(['error' => 'Champs manquants']);
                exit();
            }

            if (!isset($data['livree'])) {
                $stmt = $pdo->prepare("SELECT livree FROM commandes WHERE id = ?");
                $stmt->execute([$data['id']]);
                $existing = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$existing) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Commande non trouvée']);
                    exit();
                }
                $data['livree'] = $existing['livree'];
            }

            $stmt = $pdo->prepare("UPDATE commandes SET client_id = ?, produit = ?, quantite = ?, date_commande = ?, livree = ? WHERE id = ?");
            $stmt->execute([
                $data['client_id'],
                $data['produit'],
                $data['quantite'],
                $data['date_commande'],
                $data['livree'],
                $data['id']
            ]);
            echo json_encode(['success' => true, 'message' => 'Commande mise à jour']);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                http_response_code(400);
                echo json_encode(['error' => 'ID invalide']);
                exit();
            }

            $stmt = $pdo->prepare("DELETE FROM commandes WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'Commande supprimée']);
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