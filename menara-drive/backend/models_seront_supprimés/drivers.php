<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
require_once '../config/database.php';

$pdo = getDb();
$stmt = $pdo->query("SELECT id, nom AS name, email, telephone, permis, statut FROM chauffeurs WHERE 1");
$drivers = $stmt->fetchAll();

echo json_encode($drivers);
