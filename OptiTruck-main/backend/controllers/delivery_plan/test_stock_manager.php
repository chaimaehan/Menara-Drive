<?php
require '../../config/database.php'; // connexion PDO
require 'DataExtractor.php';
require 'StockManager.php';

// Création de l'objet DataExtractor avec PDO
$dataExtractor = new DataExtractor($pdo);

// Récupérer les stocks et commandes via les méthodes publiques
$stocks = $dataExtractor->getStocks();
$commandes = $dataExtractor->getCommandes();

if (empty($commandes)) {
    echo json_encode(['error' => 'Aucune commande à traiter']);
    exit;
}

// Créer l'objet StockManager
$manager = new StockManager($pdo);

// Vérifier et allouer les stocks aux commandes
$resultat = $manager->verifierEtAllouerStocks($commandes, $stocks);

// Retourner le résultat en JSON
header('Content-Type: application/json');
echo json_encode($resultat, JSON_PRETTY_PRINT);
