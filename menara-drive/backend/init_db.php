<?php
$host = "127.0.0.1";
$dbname = "optitruck_db";
$username = "root";
$password = "root";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $pdo->exec("CREATE TABLE IF NOT EXISTS camions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        immatriculation VARCHAR(20) NOT NULL,
        marque VARCHAR(50),
        capacite INT,
        status VARCHAR(20)
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS drivers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100),
        prenom VARCHAR(100),
        telephone VARCHAR(20),
        email VARCHAR(100)
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client VARCHAR(100),
        adresse VARCHAR(255),
        date_commande DATE,
        status VARCHAR(20)
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS delivery_plan (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT,
        camion_id INT,
        driver_id INT,
        date_livraison DATE,
        status VARCHAR(20),
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (camion_id) REFERENCES camions(id),
        FOREIGN KEY (driver_id) REFERENCES drivers(id)
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS PlanningStock (
        id INT AUTO_INCREMENT PRIMARY KEY,
        produit VARCHAR(100),
        quantite INT,
        date_mise_stock DATE
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS trucks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        immatriculation VARCHAR(20),
        capacite INT,
        status VARCHAR(20)
    )");

    echo "Toutes les tables ont été créées avec succès !";
} catch (PDOException $e) {
    echo "Erreur : " . $e->getMessage();
}