<?php
require_once '../config/database.php'; // <-- à adapter selon ton arborescence

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

try {
    //$pdo = getDb();
    $stmt = $pdo->query("SELECT * FROM commandes WHERE livree = 0");
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($orders);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Erreur serveur : " . $e->getMessage()]);
}
