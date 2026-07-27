<?php
header("Content-Type: application/json");
try {
    $pdo = new PDO("mysql:host=127.0.0.1;port=3306;dbname=optitruck_db;charset=utf8mb4", "root", "root");
    echo json_encode(["status" => "OK"]);
} catch (PDOException $e) {
    echo json_encode(["status" => "FAIL", "error" => $e->getMessage()]);
}