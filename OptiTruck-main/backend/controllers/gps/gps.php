<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

require_once __DIR__ . '/../../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    // Envoyer position GPS (depuis mobile chauffeur)
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($data['camion_id']) || empty($data['latitude']) || empty($data['longitude'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Données manquantes']);
            exit;
        }

        // Sauvegarder position
        $stmt = $pdo->prepare("INSERT INTO gps_positions 
            (camion_id, chauffeur_id, latitude, longitude, vitesse, cap, statut) 
            VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['camion_id'],
            $data['chauffeur_id'] ?? null,
            $data['latitude'],
            $data['longitude'],
            $data['vitesse'] ?? 0,
            $data['cap'] ?? 0,
            $data['statut'] ?? 'en_route'
        ]);

        // Vérifier géofencing
        $alertes = verifierGeofencing($pdo, $data['camion_id'], $data['latitude'], $data['longitude']);

        echo json_encode(['success' => true, 'alertes' => $alertes]);
        break;

    // Récupérer positions en temps réel
    case 'GET':
        if (isset($_GET['historique']) && isset($_GET['camion_id'])) {
            // Historique des 24 dernières heures
            $stmt = $pdo->prepare("
                SELECT g.*, c.code as camion_code, ch.nom as chauffeur_nom
                FROM gps_positions g
                LEFT JOIN camions c ON g.camion_id = c.id
                LEFT JOIN chauffeurs ch ON g.chauffeur_id = ch.id
                WHERE g.camion_id = ?
                AND g.timestamp >= NOW() - INTERVAL 24 HOUR
                ORDER BY g.timestamp ASC
            ");
            $stmt->execute([$_GET['camion_id']]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);

        } elseif (isset($_GET['alertes'])) {
            // Alertes géofencing non lues
            $stmt = $pdo->query("
                SELECT a.*, c.code as camion_code, g.nom as geofence_nom
                FROM alertes_geofencing a
                LEFT JOIN camions c ON a.camion_id = c.id
                LEFT JOIN geofences g ON a.geofence_id = g.id
                WHERE a.lue = 0
                ORDER BY a.timestamp DESC
                LIMIT 20
            ");
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);

        } else {
            // Dernière position de chaque camion
            $stmt = $pdo->query("
                SELECT g.*, c.code as camion_code, c.capacite,
                       ch.nom as chauffeur_nom, ch.telephone
                FROM gps_positions g
                INNER JOIN camions c ON g.camion_id = c.id
                LEFT JOIN chauffeurs ch ON g.chauffeur_id = ch.id
                INNER JOIN (
                    SELECT camion_id, MAX(timestamp) as last_time
                    FROM gps_positions
                    GROUP BY camion_id
                ) latest ON g.camion_id = latest.camion_id 
                         AND g.timestamp = latest.last_time
                ORDER BY c.code
            ");
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        }
        break;
}

function verifierGeofencing($pdo, $camion_id, $lat, $lng) {
    $alertes = [];
    $stmt = $pdo->query("SELECT * FROM geofences WHERE actif = 1");
    $zones = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($zones as $zone) {
        $distance = calculerDistance($lat, $lng, $zone['latitude_centre'], $zone['longitude_centre']);
        $dedans = $distance <= $zone['rayon'];

        // Vérifier état précédent
        $prev = $pdo->prepare("
            SELECT latitude, longitude FROM gps_positions 
            WHERE camion_id = ? ORDER BY timestamp DESC LIMIT 1 OFFSET 1
        ");
        $prev->execute([$camion_id]);
        $prevPos = $prev->fetch(PDO::FETCH_ASSOC);

        if ($prevPos) {
            $distPrev = calculerDistance($prevPos['latitude'], $prevPos['longitude'], 
                                        $zone['latitude_centre'], $zone['longitude_centre']);
            $etaitDedans = $distPrev <= $zone['rayon'];

            if ($dedans && !$etaitDedans) {
                // Entrée dans la zone
                $ins = $pdo->prepare("INSERT INTO alertes_geofencing 
                    (camion_id, geofence_id, type, latitude, longitude) VALUES (?, ?, 'entree', ?, ?)");
                $ins->execute([$camion_id, $zone['id'], $lat, $lng]);
                $alertes[] = ['type' => 'entree', 'zone' => $zone['nom']];
            } elseif (!$dedans && $etaitDedans) {
                // Sortie de la zone
                $ins = $pdo->prepare("INSERT INTO alertes_geofencing 
                    (camion_id, geofence_id, type, latitude, longitude) VALUES (?, ?, 'sortie', ?, ?)");
                $ins->execute([$camion_id, $zone['id'], $lat, $lng]);
                $alertes[] = ['type' => 'sortie', 'zone' => $zone['nom']];
            }
        }
    }
    return $alertes;
}

function calculerDistance($lat1, $lng1, $lat2, $lng2) {
    $R = 6371000; // mètres
    $dLat = deg2rad($lat2 - $lat1);
    $dLng = deg2rad($lng2 - $lng1);
    $a = sin($dLat/2)*sin($dLat/2) + cos(deg2rad($lat1))*cos(deg2rad($lat2))*sin($dLng/2)*sin($dLng/2);
    return $R * 2 * atan2(sqrt($a), sqrt(1-$a));
}
?>
