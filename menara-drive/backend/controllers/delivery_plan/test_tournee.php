<?php
require_once "TourneeBuilder.php";

// Configuration de test
$config = [
    'tempsChargement' => 5,
    'tempsCollecteStock' => 4,
    'tempsLivraison' => 7,
    'vitesseMoyenne' => 40,
    'coutKm' => 2.5
];

// Atelier principal
$atelier = [
    'nom' => 'Atelier Central',
    'latitude' => 33.5731,
    'longitude' => -7.5898
];

// Données fictives
$camion = [
    'id' => 1,
    'capacite' => 100,
    'chauffeur_nom' => 'Ali'
];

$commandes = [
    [
        'id' => 1,
        'client_id' => 101,
        'produit' => 'Briques',
        'quantite' => 20,
        'latitude' => 33.58,
        'longitude' => -7.60,
        'priorite' => 'normal',
        'stock_alloue' => [
            'id' => 1,
            'nom' => 'Stock A',
            'latitude' => 33.59,
            'longitude' => -7.61,
            'adresse' => 'Zone industrielle A'
        ],
        'client_data' => [
            'nom' => 'Client 1',
            'adresse' => 'Rue Exemple',
            'telephone' => '0600000000'
        ]
    ]
];

$tourneeBuilder = new TourneeBuilder($config, $atelier);
$resultat = $tourneeBuilder->construireTourneeAvecStocks($camion, $commandes, []);

header('Content-Type: application/json');
echo json_encode($resultat, JSON_PRETTY_PRINT);
