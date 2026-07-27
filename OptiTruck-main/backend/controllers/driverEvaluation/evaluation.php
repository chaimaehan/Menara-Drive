<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

// Chemin absolu vers database.php — ajuste si nécessaire
require_once 'C:/xampp/htdocs/OptiTruck/backend/config/database.php';

// À ce stade, $pdo est disponible grâce à database.php

class DriverEvaluation {
    private $db;

    public function __construct($pdo) {
        $this->db = $pdo;
    }

    public function getStats() {
        $sql = "SELECT d.*, 
                COUNT(e.id) as total_evaluations,
                COALESCE(AVG(e.rating), 0) as avg_rating,
                COALESCE(AVG(e.criteria_punctuality), 0) as avg_punctuality,
                COALESCE(AVG(e.criteria_safety), 0) as avg_safety
                FROM drivers d 
                LEFT JOIN driver_evaluations e ON d.id = e.driver_id 
                GROUP BY d.id";
        return $this->db->query($sql)->fetchAll();
    }

    public function getHistory($id) {
        $stmt = $this->db->prepare("SELECT * FROM driver_evaluations WHERE driver_id = ? ORDER BY created_at DESC");
        $stmt->execute([$id]);
        return $stmt->fetchAll();
    }

    public function save($data) {
        $sql = "INSERT INTO driver_evaluations 
                    (driver_id, rating, comment, criteria_punctuality, criteria_professionalism, criteria_safety, criteria_communication) 
                VALUES (?, ?, ?, ?, ?, ?, ?)";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            $data['driver_id'],
            $data['rating'],
            $data['comment'] ?? '',
            $data['criteria_punctuality'] ?? 3,
            $data['criteria_professionalism'] ?? 3,
            $data['criteria_safety'] ?? 3,
            $data['criteria_communication'] ?? 3
        ]);
    }
}

// Instanciation avec $pdo venant de database.php
$api = new DriverEvaluation($pdo);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_GET['driver_id'])) {
        $res = $api->getHistory((int)$_GET['driver_id']);
    } else {
        $res = $api->getStats();
    }
    echo json_encode(['success' => true, 'data' => $res]);

} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!$data || !isset($data['driver_id']) || !isset($data['rating'])) {
        echo json_encode(['success' => false, 'message' => 'Données manquantes']);
        exit;
    }

    $result = $api->save($data);
    echo json_encode(['success' => $result]);
}