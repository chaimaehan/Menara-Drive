<?php
// ✅ DOIT être les toutes premières lignes — avant tout output
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

// ✅ Headers AVANT tout require
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require __DIR__ . '/../../vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

// ✅ Connexion DB avec gestion d'erreur propre
try {
    $pdo = require __DIR__ . '/../../config/database.php';
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Connexion DB échouée : ' . $e->getMessage()]);
    exit;
}

if (!$pdo instanceof PDO) {
    http_response_code(500);
    echo json_encode([
        'error' => 'PDO invalide',
        'type'  => gettype($pdo),
    ]);
    exit;
}

// ✅ Vérification JWT
$secret = "dA7Z&J!pS9#qK2fT@3LmN8wC";

function verifyJWT(string $secret): object {
    $headers    = function_exists('apache_request_headers')
                  ? apache_request_headers()
                  : getallheaders();
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

    try {
        return JWT::decode($matches[1], new Key($secret, 'HS256'));
    } catch (Exception $e) {
        http_response_code(401);
        echo json_encode(['error' => 'Token expiré ou invalide : ' . $e->getMessage()]);
        exit;
    }
}

$decoded = verifyJWT($secret);

// ✅ Rôles autorisés — comptable gère la facturation, admin a un accès complet
if (!in_array($decoded->role ?? '', ['admin', 'comptable'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Rôle non autorisé : ' . ($decoded->role ?? 'inconnu')]);
    exit;
}

const TAUX_KM   = 2.5;  // DH / km, cohérent avec le dashboard comptable
const TAUX_TVA  = 0.20; // 20%

$method = $_SERVER['REQUEST_METHOD'];
$data   = json_decode(file_get_contents("php://input"), true);
$action = $_GET['action'] ?? null;

try {
    switch ($method) {

        // =========================================================
        case 'GET':

            // ---- Livraisons livrées non encore facturées ----
            if ($action === 'eligible') {
                $conditions = ["l.livree = 1", "fl.id IS NULL"];
                $params     = [];

                if (!empty($_GET['client_id'])) {
                    $conditions[] = "co.client_id = ?";
                    $params[]     = (int)$_GET['client_id'];
                }

                $whereClause = 'WHERE ' . implode(' AND ', $conditions);

                $sql = "
                    SELECT
                        l.id AS livraison_id,
                        l.distance,
                        l.date_livraison,
                        l.completed_at,
                        co.produit,
                        co.client_id,
                        cl.nom AS client_nom
                    FROM livraisons l
                    LEFT JOIN commandes co ON l.commande_id = co.id
                    LEFT JOIN clients cl   ON co.client_id  = cl.id
                    LEFT JOIN facture_lignes fl ON fl.livraison_id = l.id
                    $whereClause
                    ORDER BY cl.nom ASC, l.date_livraison ASC
                ";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
                break;
            }

            // ---- Lignes d'une facture (détail / impression) ----
            if ($action === 'lignes') {
                $factureId = $_GET['facture_id'] ?? null;
                if (!$factureId || !is_numeric($factureId)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'facture_id invalide']);
                    exit;
                }
                $stmt = $pdo->prepare("
                    SELECT fl.*, l.date_livraison, co.produit
                    FROM facture_lignes fl
                    LEFT JOIN livraisons l ON fl.livraison_id = l.id
                    LEFT JOIN commandes co ON l.commande_id = co.id
                    WHERE fl.facture_id = ?
                    ORDER BY l.date_livraison ASC
                ");
                $stmt->execute([$factureId]);
                echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
                break;
            }

            // ---- Liste des factures (par défaut) ----
            $conditions = [];
            $params     = [];

            if (!empty($_GET['statut'])) {
                $conditions[] = "f.statut = ?";
                $params[]     = $_GET['statut'];
            }
            if (!empty($_GET['client_id'])) {
                $conditions[] = "f.client_id = ?";
                $params[]     = (int)$_GET['client_id'];
            }
            if (!empty($_GET['date_debut'])) {
                $conditions[] = "f.date_emission >= ?";
                $params[]     = $_GET['date_debut'];
            }
            if (!empty($_GET['date_fin'])) {
                $conditions[] = "f.date_emission <= ?";
                $params[]     = $_GET['date_fin'];
            }
            if (!empty($_GET['search'])) {
                $conditions[] = "(f.numero_facture LIKE ? OR cl.nom LIKE ?)";
                $like         = '%' . $_GET['search'] . '%';
                $params[]     = $like;
                $params[]     = $like;
            }

            $whereClause = count($conditions) > 0
                ? 'WHERE ' . implode(' AND ', $conditions)
                : '';

            $sql = "
                SELECT
                    f.*,
                    cl.nom AS client_nom,
                    (SELECT COUNT(*) FROM facture_lignes WHERE facture_id = f.id) AS nb_livraisons
                FROM factures f
                LEFT JOIN clients cl ON f.client_id = cl.id
                $whereClause
                ORDER BY f.date_emission DESC, f.id DESC
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        // =========================================================
        case 'POST':
            if (empty($data['client_id']) || empty($data['livraison_ids']) || !is_array($data['livraison_ids'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Champs manquants : client_id, livraison_ids (tableau) requis']);
                exit;
            }

            $clientId     = (int)$data['client_id'];
            $livraisonIds = array_map('intval', $data['livraison_ids']);

            if (empty($livraisonIds)) {
                http_response_code(400);
                echo json_encode(['error' => 'Aucune livraison sélectionnée']);
                exit;
            }

            $pdo->beginTransaction();

            // Vérifie que les livraisons sont livrées, appartiennent au client,
            // et ne sont pas déjà facturées
            $placeholders = implode(',', array_fill(0, count($livraisonIds), '?'));
            $checkSql = "
                SELECT l.id, l.distance
                FROM livraisons l
                LEFT JOIN commandes co ON l.commande_id = co.id
                LEFT JOIN facture_lignes fl ON fl.livraison_id = l.id
                WHERE l.id IN ($placeholders)
                  AND l.livree = 1
                  AND co.client_id = ?
                  AND fl.id IS NULL
            ";
            $checkParams   = $livraisonIds;
            $checkParams[] = $clientId;
            $checkStmt = $pdo->prepare($checkSql);
            $checkStmt->execute($checkParams);
            $validLivraisons = $checkStmt->fetchAll(PDO::FETCH_ASSOC);

            if (count($validLivraisons) !== count($livraisonIds)) {
                $pdo->rollBack();
                http_response_code(409);
                echo json_encode(['error' => 'Certaines livraisons sont invalides, déjà facturées, ou n\'appartiennent pas à ce client']);
                exit;
            }

            // Calcul des montants
            $montantHt = 0;
            foreach ($validLivraisons as $liv) {
                $montantHt += round($liv['distance'] * TAUX_KM, 2);
            }
            $tva        = round($montantHt * TAUX_TVA, 2);
            $montantTtc = round($montantHt + $tva, 2);

            // Génération du numéro de facture : FAC-2026-0001
            $year = date('Y');
            $countStmt = $pdo->prepare("SELECT COUNT(*) FROM factures WHERE YEAR(date_emission) = ?");
            $countStmt->execute([$year]);
            $seq = (int)$countStmt->fetchColumn() + 1;
            $numeroFacture = sprintf('FAC-%s-%04d', $year, $seq);

            $dateEmission = date('Y-m-d');
            $dateEcheance = $data['date_echeance'] ?? date('Y-m-d', strtotime('+30 days'));

            $insertFacture = $pdo->prepare("
                INSERT INTO factures
                    (numero_facture, client_id, montant_ht, tva, montant_ttc, statut, date_emission, date_echeance, created_by)
                VALUES (?, ?, ?, ?, ?, 'en_attente', ?, ?, ?)
            ");
            $insertFacture->execute([
                $numeroFacture, $clientId, $montantHt, $tva, $montantTtc,
                $dateEmission, $dateEcheance, $decoded->id ?? null,
            ]);
            $factureId = $pdo->lastInsertId();

            $insertLigne = $pdo->prepare("
                INSERT INTO facture_lignes (facture_id, livraison_id, description, distance, montant_ht)
                VALUES (?, ?, ?, ?, ?)
            ");
            foreach ($validLivraisons as $liv) {
                $insertLigne->execute([
                    $factureId,
                    $liv['id'],
                    'Livraison #' . $liv['id'],
                    $liv['distance'],
                    round($liv['distance'] * TAUX_KM, 2),
                ]);
            }

            $pdo->commit();

            http_response_code(201);
            echo json_encode([
                'success'        => true,
                'message'        => 'Facture générée avec succès',
                'id'             => $factureId,
                'numero_facture' => $numeroFacture,
                'montant_ttc'    => $montantTtc,
            ]);
            break;

        // =========================================================
        case 'PUT':
            if (empty($data['id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'ID manquant']);
                exit;
            }

            $allowedFields = ['statut', 'date_paiement', 'mode_paiement', 'date_echeance'];
            $fields = [];
            $values = [];
            foreach ($allowedFields as $field) {
                if (array_key_exists($field, $data)) {
                    $fields[] = "$field = ?";
                    $values[] = $data[$field];
                }
            }

            // Si on marque comme payée sans préciser la date, on prend aujourd'hui
            if (isset($data['statut']) && $data['statut'] === 'payee' && !isset($data['date_paiement'])) {
                $fields[] = "date_paiement = ?";
                $values[] = date('Y-m-d');
            }

            if (empty($fields)) {
                http_response_code(400);
                echo json_encode(['error' => 'Aucun champ valide à mettre à jour']);
                exit;
            }

            $values[] = $data['id'];
            $pdo->prepare(
                "UPDATE factures SET " . implode(', ', $fields) . " WHERE id = ?"
            )->execute($values);
            echo json_encode(['success' => true, 'message' => 'Facture mise à jour']);
            break;

        // =========================================================
        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                http_response_code(400);
                echo json_encode(['error' => 'ID invalide']);
                exit;
            }
            $check = $pdo->prepare("SELECT statut FROM factures WHERE id = ?");
            $check->execute([$id]);
            $facture = $check->fetch(PDO::FETCH_ASSOC);
            if (!$facture) {
                http_response_code(404);
                echo json_encode(['error' => 'Facture introuvable']);
                exit;
            }
            if ($facture['statut'] === 'payee') {
                http_response_code(409);
                echo json_encode(['error' => 'Impossible de supprimer une facture déjà payée']);
                exit;
            }
            // ON DELETE CASCADE supprime automatiquement les facture_lignes
            $pdo->prepare("DELETE FROM factures WHERE id = ?")->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'Facture supprimée']);
            break;

        default:
            http_response_code(405);
            echo json_encode(['error' => 'Méthode non autorisée']);
    }

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => 'Erreur DB : ' . $e->getMessage()]);
    error_log('[factures.php] PDO : ' . $e->getMessage());
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
    error_log('[factures.php] Exception : ' . $e->getMessage());
}