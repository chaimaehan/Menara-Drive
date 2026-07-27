<?php
// Active les erreurs
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Autorise les requêtes CORS
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
// Si c'est une requête de type OPTIONS (préflight), on renvoie une réponse vide 200
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Ensuite, ton code normal...


require __DIR__ . '/../../config/database.php';



$method = $_SERVER['REQUEST_METHOD'];
parse_str($_SERVER['QUERY_STRING'] ?? "", $queryParams);

// Fonction pour envoyer une réponse JSON
function sendJson($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

switch ($method) {
    case 'GET':
        // Récupérer un produit spécifique ou tous
        if (isset($queryParams['id'])) {
            $stmt = $pdo->prepare("SELECT * FROM produits_stocks WHERE id = ?");
            $stmt->execute([$queryParams['id']]);
            $data = $stmt->fetch(PDO::FETCH_ASSOC);
            sendJson($data ?: ["error" => "Produit non trouvé"], $data ? 200 : 404);
        } else {
            $stmt = $pdo->query("SELECT * FROM vue_stock_produits ORDER BY date_derniere_maj DESC");
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            sendJson($data);
        }
        break;

    case 'POST':
        // Création d'un nouveau produit en stock
        $input = json_decode(file_get_contents("php://input"), true);
        if (!isset($input['stock_id'], $input['produit'], $input['quantite_disponible'])) {
            sendJson(["error" => "Champs obligatoires manquants"], 400);
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO produits_stocks 
                (stock_id, produit, quantite_disponible, quantite_minimale, quantite_maximale, unite_mesure, emplacement_stock, date_expiration, statut) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");

            $stmt->execute([
                $input['stock_id'],
                $input['produit'],
                $input['quantite_disponible'],
                $input['quantite_minimale'] ?? 10,
                $input['quantite_maximale'] ?? null,
                $input['unite_mesure'] ?? 'unité',
                $input['emplacement_stock'] ?? null,
                $input['date_expiration'] ?? null,
                $input['statut'] ?? 'disponible'
            ]);

            $produitId = $pdo->lastInsertId();

            // MOUVEMENT : entrée initiale
            $pdo->prepare("INSERT INTO mouvements_stock 
                (produit_stock_id, type_mouvement, quantite, quantite_avant, quantite_apres, motif) 
                VALUES (?, 'entree', ?, 0, ?, 'Création initiale')")
                ->execute([$produitId, $input['quantite_disponible'], $input['quantite_disponible']]);

            sendJson(["message" => "Produit ajouté", "id" => $produitId], 201);
        } catch (PDOException $e) {
            sendJson(["error" => $e->getMessage()], 500);
        }
        break;

    case 'PUT':
        // Mise à jour d’un produit
        parse_str(file_get_contents("php://input"), $putVars);
        $id = $queryParams['id'] ?? null;
        if (!$id) sendJson(["error" => "ID manquant"], 400);

        $stmt = $pdo->prepare("SELECT * FROM produits_stocks WHERE id = ?");
        $stmt->execute([$id]);
        $produitAvant = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$produitAvant) sendJson(["error" => "Produit introuvable"], 404);

        $quantiteAvant = $produitAvant['quantite_disponible'];
        $quantiteApres = $putVars['quantite_disponible'] ?? $quantiteAvant;
        $diff = $quantiteApres - $quantiteAvant;

        // Mise à jour des données
        $stmt = $pdo->prepare("UPDATE produits_stocks SET 
            stock_id = ?, produit = ?, quantite_disponible = ?, quantite_minimale = ?, quantite_maximale = ?, 
            unite_mesure = ?, emplacement_stock = ?, date_expiration = ?, statut = ?, date_derniere_maj = NOW()
            WHERE id = ?");

        $stmt->execute([
            $putVars['stock_id'] ?? $produitAvant['stock_id'],
            $putVars['produit'] ?? $produitAvant['produit'],
            $quantiteApres,
            $putVars['quantite_minimale'] ?? $produitAvant['quantite_minimale'],
            $putVars['quantite_maximale'] ?? $produitAvant['quantite_maximale'],
            $putVars['unite_mesure'] ?? $produitAvant['unite_mesure'],
            $putVars['emplacement_stock'] ?? $produitAvant['emplacement_stock'],
            $putVars['date_expiration'] ?? $produitAvant['date_expiration'],
            $putVars['statut'] ?? $produitAvant['statut'],
            $id
        ]);

        // Enregistrer le mouvement si quantité a changé
        if ($diff !== 0) {
            $pdo->prepare("INSERT INTO mouvements_stock 
                (produit_stock_id, type_mouvement, quantite, quantite_avant, quantite_apres, motif) 
                VALUES (?, ?, ?, ?, ?, ?)")
                ->execute([
                    $id,
                    $diff > 0 ? 'entree' : 'sortie',
                    abs($diff),
                    $quantiteAvant,
                    $quantiteApres,
                    "Mise à jour de stock"
                ]);
        }

        sendJson(["message" => "Produit mis à jour"]);
        break;

    case 'DELETE':
        // Suppression d’un produit
        $id = $queryParams['id'] ?? null;
        if (!$id) sendJson(["error" => "ID manquant"], 400);

        $stmt = $pdo->prepare("SELECT * FROM produits_stocks WHERE id = ?");
        $stmt->execute([$id]);
        $produit = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$produit) sendJson(["error" => "Produit introuvable"], 404);

        $stmt = $pdo->prepare("DELETE FROM produits_stocks WHERE id = ?");
        $stmt->execute([$id]);

        // MOUVEMENT : suppression
        $pdo->prepare("INSERT INTO mouvements_stock 
            (produit_stock_id, type_mouvement, quantite, quantite_avant, quantite_apres, motif) 
            VALUES (?, 'sortie', ?, ?, 0, 'Suppression')")
            ->execute([$id, $produit['quantite_disponible'], $produit['quantite_disponible']]);

        sendJson(["message" => "Produit supprimé"]);
        break;

    default:
        sendJson(["error" => "Méthode non autorisée"], 405);
}
