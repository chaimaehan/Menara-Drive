<?php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=utf-8");

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require __DIR__ . '/../../config/database.php';

// ─── Atelier (point de départ fixe) ──────────────────────────────────────────
const ATELIER_LAT = 31.584044;
const ATELIER_LNG = -8.102375;

/**
 * ✅ Calcul de distance Haversine entre deux points GPS (en km)
 */
function haversineDistance($lat1, $lng1, $lat2, $lng2) {
    if (!$lat1 || !$lng1 || !$lat2 || !$lng2) return 0;
    $R = 6371;
    $dLat = deg2rad($lat2 - $lat1);
    $dLng = deg2rad($lng2 - $lng1);
    $a = sin($dLat/2) * sin($dLat/2)
       + cos(deg2rad($lat1)) * cos(deg2rad($lat2))
       * sin($dLng/2) * sin($dLng/2);
    return round($R * 2 * atan2(sqrt($a), sqrt(1 - $a)), 2);
}

$transactionStarted = false;

try {
    if (!isset($pdo) || !$pdo instanceof PDO) {
        throw new Exception("Connexion à la base de données non disponible");
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['date']) || empty($data['data']['tournees'])) {
        throw new Exception('Données incomplètes - date et tournées requises.');
    }

    $date = date('Y-m-d', strtotime($data['date']));
    if (!$date) throw new Exception("Format de date invalide");

    $tournees = $data['data']['tournees'];

    $pdo->beginTransaction();
    $transactionStarted = true;

    // ── Supprimer anciennes livraisons pour cette date ────────────────────────
    $stmtDelete = $pdo->prepare("
        DELETE FROM livraisons 
        WHERE DATE(date_livraison) = ?
           OR DATE(heure_prevue)   = ?
           OR DATE(created_at)     = ?
    ");
    $stmtDelete->execute([$date, $date, $date]);

    $successCount = 0;
    $errorCount   = 0;
    $errors       = [];

    foreach ($tournees as $tourneeIndex => $tournee) {
        $vehiculeId  = $tournee['vehicule_id']  ?? null;
        $chauffeurNom = $tournee['chauffeur_nom'] ?? null;

        if (!$vehiculeId) {
            $errors[] = "Tournée #$tourneeIndex ignorée - pas de véhicule assigné";
            $errorCount++;
            continue;
        }

        // ── Vérifier que le véhicule existe ──────────────────────────────────
        $stmtVehicule = $pdo->prepare("SELECT id FROM camions WHERE id = ? LIMIT 1");
        $stmtVehicule->execute([$vehiculeId]);
        if (!$stmtVehicule->fetchColumn()) {
            $errors[] = "Véhicule $vehiculeId introuvable";
            $errorCount++;
            continue;
        }

        // ── Récupérer le chauffeur_id ─────────────────────────────────────────
        $chauffeurId = null;
        if ($chauffeurNom) {
            $stmtChauffeur = $pdo->prepare("SELECT id FROM chauffeurs WHERE nom LIKE ? LIMIT 1");
            $stmtChauffeur->execute(["%{$chauffeurNom}%"]);
            $chauffeurId = $stmtChauffeur->fetchColumn() ?: null;
        }
        // Fallback : récupérer le chauffeur depuis la table camions
        if (!$chauffeurId) {
            $stmtChauffeurFallback = $pdo->prepare("SELECT chauffeur_id FROM camions WHERE id = ? LIMIT 1");
            $stmtChauffeurFallback->execute([$vehiculeId]);
            $chauffeurId = $stmtChauffeurFallback->fetchColumn() ?: null;
        }

        // ── Extraire les livraisons depuis les étapes ou la section livraisons ─
        $livraisons = [];
        if (!empty($tournee['etapes'])) {
            foreach ($tournee['etapes'] as $etape) {
                if (($etape['type'] ?? '') === 'livraison') {
                    $livraisons[] = $etape;
                }
            }
        } elseif (!empty($tournee['livraisons'])) {
            $livraisons = $tournee['livraisons'];
        }

        foreach ($livraisons as $livraisonIndex => $livraison) {
            if (empty($livraison['commande_id'])) {
                $errors[] = "Livraison {$tourneeIndex}#{$livraisonIndex} ignorée - commande_id manquant";
                $errorCount++;
                continue;
            }

            // ── Vérifier la commande ──────────────────────────────────────────
            $stmtCmd = $pdo->prepare("
                SELECT c.id, c.client_id, 
                       cl.latitude, cl.longitude
                FROM commandes c
                LEFT JOIN clients cl ON c.client_id = cl.id
                WHERE c.id = ? LIMIT 1
            ");
            $stmtCmd->execute([$livraison['commande_id']]);
            $commandeData = $stmtCmd->fetch(PDO::FETCH_ASSOC);

            if (!$commandeData) {
                $errors[] = "Commande {$livraison['commande_id']} introuvable";
                $errorCount++;
                continue;
            }

            // ── Récupérer le stock ────────────────────────────────────────────
            $stockId = null;
            if (!empty($livraison['stock_origine'])) {
                $stmtStock = $pdo->prepare("SELECT id FROM stocks WHERE nom = ? LIMIT 1");
                $stmtStock->execute([$livraison['stock_origine']]);
                $stockId = $stmtStock->fetchColumn() ?: null;
            }

            // ── Calcul de la distance ─────────────────────────────────────────
            // Priorité 1 : valeur fournie par l'algo si non nulle
            $distanceFournie = isset($livraison['distance_depuis_precedent'])
                               ? (float)$livraison['distance_depuis_precedent']
                               : 0;

            // Priorité 2 : calculer depuis l'atelier vers le client via GPS
            $clientLat = (float)($commandeData['latitude']  ?? $livraison['latitude']  ?? 0);
            $clientLng = (float)($commandeData['longitude'] ?? $livraison['longitude'] ?? 0);

            if ($distanceFournie > 0) {
                // ✅ L'algo a fourni une distance — on la garde
                $distance = $distanceFournie;
            } elseif ($clientLat && $clientLng) {
                // ✅ Calculer via Haversine : Atelier → Client
                $distance = haversineDistance(
                    ATELIER_LAT, ATELIER_LNG,
                    $clientLat,  $clientLng
                );
            } else {
                // ⚠️ Pas de coordonnées — distance par défaut 10 km
                $distance = 10;
                $errors[] = "Distance estimée (10km) pour commande {$livraison['commande_id']} - coordonnées GPS manquantes";
            }

            // ── Heures prévues ────────────────────────────────────────────────
            $heurePrevue = null;
            if (!empty($livraison['heure_arrivee'])) {
                $heurePrevue = date('Y-m-d H:i:s', strtotime($date . ' ' . $livraison['heure_arrivee']));
            }

            $heureDepart = null;
            if (!empty($livraison['heure_depart'])) {
                $heureDepart = date('Y-m-d H:i:s', strtotime($date . ' ' . $livraison['heure_depart']));
            }

            $ordre       = $livraisonIndex + 1;
            $tempsTrajet = $livraison['temps_trajet'] ?? null;

            // ── Insertion ─────────────────────────────────────────────────────
            $stmtInsert = $pdo->prepare("
                INSERT INTO livraisons (
                    commande_id,
                    stock_id,
                    camion_id,
                    chauffeur_id,
                    client_id,
                    ordre,
                    distance,
                    date_livraison,
                    heure_prevue,
                    heure_prevue_depart,
                    temps_prevu,
                    status,
                    livree,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'planifiee', 0, NOW())
            ");

            $stmtInsert->execute([
                $livraison['commande_id'],
                $stockId,
                $vehiculeId,
                $chauffeurId,
                $commandeData['client_id'],
                $ordre,
                $distance,           // ✅ Distance calculée ou fournie
                $date,               // ✅ date_livraison = date du planning
                $heurePrevue,
                $heureDepart,
                $tempsTrajet,
            ]);

            $successCount++;
        }
    }

    // ── Mettre à jour les distances NULL restantes via GPS ────────────────────
    // (pour les livraisons dont les coordonnées viennent de la table clients)
    $pdo->exec("
        UPDATE livraisons l
        INNER JOIN commandes cmd ON l.commande_id = cmd.id
        INNER JOIN clients c    ON cmd.client_id  = c.id
        SET l.distance = ROUND(
            6371 * ACOS(
                GREATEST(-1, LEAST(1,
                    COS(RADIANS(" . ATELIER_LAT . ")) * COS(RADIANS(c.latitude)) *
                    COS(RADIANS(c.longitude) - RADIANS(" . ATELIER_LNG . ")) +
                    SIN(RADIANS(" . ATELIER_LAT . ")) * SIN(RADIANS(c.latitude))
                ))
            ), 2
        )
        WHERE l.distance = 0
          AND DATE(l.date_livraison) = '{$date}'
          AND c.latitude  IS NOT NULL
          AND c.longitude IS NOT NULL
          AND c.latitude  != 0
          AND c.longitude != 0
    ");

    $pdo->commit();
    $transactionStarted = false;

    echo json_encode([
        'success' => true,
        'message' => "Planification sauvegardée avec succès",
        'details' => [
            'livraisons_sauvegardees' => $successCount,
            'livraisons_echouees'     => $errorCount,
            'date_planification'      => $date,
        ],
        'warnings' => $errors,
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    if ($transactionStarted && isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erreur de base de données: ' . $e->getMessage(),
        'type'    => 'database_error',
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Exception $e) {
    if ($transactionStarted && isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'type'    => 'general_error',
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
?>