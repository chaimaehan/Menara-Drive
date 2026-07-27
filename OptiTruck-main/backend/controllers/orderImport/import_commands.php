<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Authorization, Content-Type");
header("Access-Control-Allow-Methods: POST");

// Paramètres connexion
$host = "127.0.0.1";
$user = "root";
$pass = "root";
$dbname = "optitruck_db";

// Connexion à la base
$conn = new mysqli($host, $user, $pass, $dbname);
$conn->set_charset("utf8mb4");
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Connexion échouée: " . $conn->connect_error]);
    exit;
}

// Fonction de géocodage via Nominatim (OpenStreetMap, gratuit)
function geocoderAdresse($adresse) {
    $adresseComplete = $adresse . ", Marrakech, Maroc";
    $url = "https://nominatim.openstreetmap.org/search?" . http_build_query([
        'q' => $adresseComplete,
        'format' => 'json',
        'limit' => 1
    ]);

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'OptiTruck/1.0');
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    $response = curl_exec($ch);
    curl_close($ch);

    if ($response) {
        $data = json_decode($response, true);
        if (!empty($data) && isset($data[0]['lat'], $data[0]['lon'])) {
            return [
                'latitude' => (float)$data[0]['lat'],
                'longitude' => (float)$data[0]['lon']
            ];
        }
    }
    return null;
}

// Récupérer les données JSON envoyées
$input = json_decode(file_get_contents("php://input"), true);
$orders = $input["commands"] ?? [];

$inserted = 0;
$errors = [];

foreach ($orders as $order) {
    $nom = trim($order["nom_client"] ?? "");
    $adresse = trim($order["adresse_client"] ?? "");
    $produit = trim($order["produit"] ?? "");
    $quantite = intval($order["quantite"] ?? 0);
    $date_commande = date('Y-m-d');

    if (!$nom || !$adresse || !$produit || $quantite <= 0) {
        $errors[] = "Commande invalide : " . json_encode($order);
        continue;
    }

    // Vérifier si le client existe
    $stmt = $conn->prepare("SELECT id, latitude, longitude FROM clients WHERE nom = ? AND adresse = ?");
    if (!$stmt) {
        $errors[] = "Erreur préparation requête SELECT client : " . $conn->error;
        continue;
    }
    $stmt->bind_param("ss", $nom, $adresse);
    if (!$stmt->execute()) {
        $errors[] = "Erreur exécution requête SELECT client : " . $stmt->error;
        $stmt->close();
        continue;
    }
    $result = $stmt->get_result();
    $client_id = null;

    if ($row = $result->fetch_assoc()) {
        $client_id = $row['id'];
        // Si le client existe mais n'a pas de coordonnées, on tente de les ajouter
        if ($row['latitude'] === null || $row['longitude'] === null) {
            $coords = geocoderAdresse($adresse);
            if ($coords) {
                $updateClient = $conn->prepare("UPDATE clients SET latitude = ?, longitude = ? WHERE id = ?");
                $updateClient->bind_param("ddi", $coords['latitude'], $coords['longitude'], $client_id);
                $updateClient->execute();
                $updateClient->close();
            }
        }
    } else {
        // Géocoder l'adresse avant insertion
        $coords = geocoderAdresse($adresse);
        $latitude = $coords['latitude'] ?? null;
        $longitude = $coords['longitude'] ?? null;

        $insertClient = $conn->prepare("INSERT INTO clients (nom, adresse, latitude, longitude) VALUES (?, ?, ?, ?)");
        if (!$insertClient) {
            $errors[] = "Erreur préparation insertion client : " . $conn->error;
            $stmt->close();
            continue;
        }
        $insertClient->bind_param("ssdd", $nom, $adresse, $latitude, $longitude);
        if (!$insertClient->execute()) {
            $errors[] = "Erreur insertion client : " . $insertClient->error;
            $insertClient->close();
            $stmt->close();
            continue;
        }
        $client_id = $insertClient->insert_id;
        $insertClient->close();

        if (!$coords) {
            $errors[] = "Géocodage échoué pour l'adresse : {$adresse} (client créé sans coordonnées GPS)";
        }
    }
    $stmt->close();

    // Insérer la commande
    $insertCmd = $conn->prepare("INSERT INTO commandes (client_id, produit, quantite, date_commande) VALUES (?, ?, ?, ?)");
    if (!$insertCmd) {
        $errors[] = "Erreur préparation insertion commande : " . $conn->error;
        continue;
    }
    $insertCmd->bind_param("isis", $client_id, $produit, $quantite, $date_commande);
    if (!$insertCmd->execute()) {
        $errors[] = "Erreur insertion commande : " . $insertCmd->error;
        $insertCmd->close();
        continue;
    }
    $inserted++;
    $insertCmd->close();
}

$conn->close();

echo json_encode([
    "success" => true,
    "inserted" => $inserted,
    "errors" => $errors
]);