<?php
require_once 'RouteOptimizer.php';
// Inclure votre classe RouteOptimizer
// require_once 'RouteOptimizer.php';

/**
 * 🧪 SUITE DE TESTS COMPLÈTE POUR L'OPTIMISEUR DE ROUTES
 * Tests tous les algorithmes et fonctionnalités
 */
class RouteOptimizerTester {
    private $optimizer;
    private $testsReussis = 0;
    private $testsTotal = 0;
    private $resultatsTests = [];
    
    public function __construct() {
        // Configuration de test
        $config = [
            'tempsLivraison' => 15,      // minutes par arrêt
            'tempsChargement' => 20,     // minutes de chargement initial
            'vitesseMoyenne' => 50,      // km/h en ville
            'coutKm' => 1.5,            // coût par km
            'tempsMaxJournee' => 8       // heures max par journée
        ];
        
        $this->optimizer = new RouteOptimizer($config);
        
        echo "🚛 === SUITE DE TESTS - OPTIMISEUR DE ROUTES === 🚛\n\n";
    }
    
    /**
     * 🏃 Exécuter tous les tests
     */
    public function executerTousLesTests() {
        $startTime = microtime(true);
        
        // Tests des algorithmes
        $this->testerAlgorithmeSimple();
        $this->testerAlgorithmeNearestNeighbor();
        $this->testerAlgorithme2Opt();
        $this->testerAlgorithmeHybride();
        
        // Tests des fonctionnalités
        $this->testerCalculDistances();
        $this->testerContraintes();
        $this->testerItinerairesMultiples();
        $this->testerCasLimites();
        $this->testerPerformances();
        
        // Tests de génération aléatoire
        $this->testerGenerationAleatoire();
        
        $tempsTotal = round((microtime(true) - $startTime) * 1000, 2);
        $this->afficherResultatsFinaux($tempsTotal);
        
        return $this->genererRapport();
    }
    
    /**
     * 🔹 Test Algorithme Simple (≤ 3 points)
     */
    private function testerAlgorithmeSimple() {
        echo "🔸 Test Algorithme Simple (≤ 3 points)\n";
        echo str_repeat("-", 50) . "\n";
        
        // Test avec 2 points
        $points2 = [
            [
                'id' => 1,
                'nom' => 'Client A',
                'latitude' => 33.5831,
                'longitude' => -7.5998,
                'type' => 'livraison'
            ],
            [
                'id' => 2, 
                'nom' => 'Client B',
                'latitude' => 33.5631,
                'longitude' => -7.5798,
                'type' => 'livraison'
            ]
        ];
        
        $resultat2 = $this->optimizer->optimiserItineraire($points2);
        $this->evaluerTest("Algorithme simple - 2 points", $resultat2['success'], $resultat2);
        
        // Test avec 3 points
        $points3 = array_merge($points2, [
            [
                'id' => 3,
                'nom' => 'Client C', 
                'latitude' => 33.5931,
                'longitude' => -7.5698,
                'type' => 'livraison'
            ]
        ]);
        
        $resultat3 = $this->optimizer->optimiserItineraire($points3);
        $this->evaluerTest("Algorithme simple - 3 points", $resultat3['success'], $resultat3);
        
        echo "\n";
    }
    
    /**
     * 🔹 Test Algorithme Nearest Neighbor (4-6 points)
     */
    private function testerAlgorithmeNearestNeighbor() {
        echo "🔸 Test Algorithme Nearest Neighbor (4-6 points)\n";
        echo str_repeat("-", 50) . "\n";
        
        $points = $this->genererPointsTest(5, 'Casablanca Centre');
        $contraintes = [
            'priorites' => [
                1 => 'urgente',
                2 => 'haute', 
                3 => 'normal',
                4 => 'normal',
                5 => 'haute'
            ]
        ];
        
        $resultat = $this->optimizer->optimiserItineraire($points, $contraintes);
        $this->evaluerTest("Nearest Neighbor - 5 points avec priorités", $resultat['success'], $resultat);
        
        // Vérifier que l'algorithme utilisé est correct
        $algorithmeAttendu = 'Plus proche voisin';
        $algorithmeUtilise = $resultat['metriques']['algorithme'] ?? '';
        $this->evaluerTest("Algorithme correct utilisé", $algorithmeUtilise === $algorithmeAttendu, [
            'attendu' => $algorithmeAttendu,
            'obtenu' => $algorithmeUtilise
        ]);
        
        echo "\n";
    }
    
    /**
     * 🔹 Test Algorithme 2-Opt (7-12 points)
     */
    private function testerAlgorithme2Opt() {
        echo "🔸 Test Algorithme 2-Opt (7-12 points)\n";
        echo str_repeat("-", 50) . "\n";
        
        $points = $this->genererPointsTest(8, 'Zone Industrielle');
        $contraintes = [
            'maxDistance' => 150,
            'maxClients' => 10
        ];
        
        $resultat = $this->optimizer->optimiserItineraire($points, $contraintes);
        $this->evaluerTest("2-Opt - 8 points", $resultat['success'], $resultat);
        
        // Test amélioration avec 2-Opt
        if ($resultat['success']) {
            $distance = $resultat['metriques']['distance_totale_km'];
            $this->evaluerTest("Distance raisonnable", $distance > 0 && $distance < 200, [
                'distance' => $distance
            ]);
            
            $efficacite = $resultat['metriques']['efficacite_score'];
            $this->evaluerTest("Efficacité correcte", $efficacite >= 50, [
                'efficacite' => $efficacite
            ]);
        }
        
        echo "\n";
    }
    
    /**
     * 🔹 Test Algorithme Hybride (>12 points)
     */
    private function testerAlgorithmeHybride() {
        echo "🔸 Test Algorithme Hybride (>12 points)\n";
        echo str_repeat("-", 50) . "\n";
        
        $points = $this->genererPointsTest(15, 'Grande Tournée');
        $contraintes = [
            'maxDistance' => 300,
            'maxClients' => 20
        ];
        
        $resultat = $this->optimizer->optimiserItineraire($points, $contraintes);
        $this->evaluerTest("Algorithme Hybride - 15 points", $resultat['success'], $resultat);
        
        if ($resultat['success']) {
            $algorithmeUtilise = $resultat['metriques']['algorithme'] ?? '';
            $this->evaluerTest("Algorithme hybride utilisé", 
                strpos(strtolower($algorithmeUtilise), 'hybride') !== false, [
                'algorithme' => $algorithmeUtilise
            ]);
        }
        
        echo "\n";
    }
    
    /**
     * 🔹 Test Calculs de Distances
     */
    private function testerCalculDistances() {
        echo "🔸 Test Calculs de Distances\n";
        echo str_repeat("-", 50) . "\n";
        
        // Points de test avec distances connues approximativement
        $pointA = ['latitude' => 33.5731, 'longitude' => -7.5898]; // Casablanca centre
        $pointB = ['latitude' => 33.6031, 'longitude' => -7.6198]; // ~5km nord-ouest
        
        // Test via l'optimiseur avec 2 points
        $points = [
            array_merge($pointA, ['id' => 1, 'nom' => 'Point A', 'type' => 'livraison']),
            array_merge($pointB, ['id' => 2, 'nom' => 'Point B', 'type' => 'livraison'])
        ];
        
        $resultat = $this->optimizer->optimiserItineraire($points);
        
        if ($resultat['success']) {
            $distance = $resultat['metriques']['distance_totale_km'];
            // Distance attendue : ~10km aller-retour depuis l'atelier
            $this->evaluerTest("Distance calculée cohérente", $distance > 8 && $distance < 25, [
                'distance_calculee' => $distance
            ]);
        }
        
        // Test points avec coordonnées invalides
        $pointsInvalides = [
            ['id' => 1, 'nom' => 'Point Invalid', 'latitude' => 0, 'longitude' => 0, 'type' => 'livraison']
        ];
        
        $resultatInvalide = $this->optimizer->optimiserItineraire($pointsInvalides);
        $this->evaluerTest("Gestion coordonnées invalides", 
            !$resultatInvalide['success'] || $resultatInvalide['metriques']['distance_totale_km'] > 1000, 
            $resultatInvalide);
        
        echo "\n";
    }
    
    /**
     * 🔹 Test Contraintes
     */
    private function testerContraintes() {
        echo "🔸 Test Validation Contraintes\n";
        echo str_repeat("-", 50) . "\n";
        
        $points = $this->genererPointsTest(6, 'Test Contraintes');
        
        // Test contrainte de distance
        $contraintesDistance = ['maxDistance' => 50]; // Très restrictif
        $resultat1 = $this->optimizer->optimiserItineraire($points, $contraintesDistance);
        
        if ($resultat1['success']) {
            $respecteDistance = $resultat1['metriques']['distance_totale_km'] <= 50;
            $this->evaluerTest("Contrainte distance respectée", $respecteDistance, [
                'distance' => $resultat1['metriques']['distance_totale_km'],
                'limite' => 50
            ]);
        }
        
        // Test contrainte de nombre de clients
        $contraintesClients = ['maxClients' => 3];
        $resultat2 = $this->optimizer->optimiserItineraire($points, $contraintesClients);
        
        if ($resultat2['success']) {
            $respecteClients = $resultat2['metriques']['nb_arrets'] <= 3;
            $this->evaluerTest("Contrainte nombre clients respectée", $respecteClients, [
                'nb_arrets' => $resultat2['metriques']['nb_arrets'],
                'limite' => 3
            ]);
        }
        
        echo "\n";
    }
    
    /**
     * 🔹 Test Itinéraires Multiples
     */
    private function testerItinerairesMultiples() {
        echo "🔸 Test Itinéraires Multiples\n";
        echo str_repeat("-", 50) . "\n";
        
        // Créer 3 groupes de points
        $groupes = [
            $this->genererPointsTest(4, 'Camion 1'),
            $this->genererPointsTest(5, 'Camion 2'),
            $this->genererPointsTest(3, 'Camion 3')
        ];
        
        $contraintes = [
            0 => ['maxDistance' => 100],
            1 => ['maxDistance' => 120],
            2 => ['maxDistance' => 80]
        ];
        
        $resultat = $this->optimizer->optimiserItinerairesMultiples($groupes, $contraintes);
        $this->evaluerTest("Itinéraires multiples - succès", $resultat['success'], $resultat);
        
        if ($resultat['success']) {
            $nbItineraires = count($resultat['itineraires']);
            $this->evaluerTest("Nombre d'itinéraires correct", $nbItineraires === 3, [
                'attendu' => 3,
                'obtenu' => $nbItineraires
            ]);
            
            // Vérifier les statistiques globales
            $stats = $resultat['statistiques_globales'];
            $this->evaluerTest("Statistiques globales présentes", 
                isset($stats['distance_totale_km']) && $stats['distance_totale_km'] > 0, $stats);
        }
        
        echo "\n";
    }
    
    /**
     * 🔹 Test Cas Limites
     */
    private function testerCasLimites() {
        echo "🔸 Test Cas Limites\n";
        echo str_repeat("-", 50) . "\n";
        
        // Test avec tableau vide
        $resultatVide = $this->optimizer->optimiserItineraire([]);
        $this->evaluerTest("Gestion tableau vide", !$resultatVide['success'], $resultatVide);
        
        // Test avec un seul point
        $pointSeul = [
            ['id' => 1, 'nom' => 'Point Unique', 'latitude' => 33.5731, 'longitude' => -7.5898, 'type' => 'livraison']
        ];
        $resultatSeul = $this->optimizer->optimiserItineraire($pointSeul);
        $this->evaluerTest("Gestion point unique", $resultatSeul['success'], $resultatSeul);
        
        // Test avec points très éloignés
        $pointsEloignes = [
            ['id' => 1, 'nom' => 'Casablanca', 'latitude' => 33.5731, 'longitude' => -7.5898, 'type' => 'livraison'],
            ['id' => 2, 'nom' => 'Rabat', 'latitude' => 34.0181, 'longitude' => -6.8286, 'type' => 'livraison'],
            ['id' => 3, 'nom' => 'Marrakech', 'latitude' => 31.6295, 'longitude' => -7.9811, 'type' => 'livraison']
        ];
        $resultatEloignes = $this->optimizer->optimiserItineraire($pointsEloignes);
        $this->evaluerTest("Gestion points éloignés", $resultatEloignes['success'], $resultatEloignes);
        
        if ($resultatEloignes['success']) {
            $distanceImportante = $resultatEloignes['metriques']['distance_totale_km'] > 300;
            $this->evaluerTest("Distance importante détectée", $distanceImportante, [
                'distance' => $resultatEloignes['metriques']['distance_totale_km']
            ]);
        }
        
        echo "\n";
    }
    
    /**
     * 🔹 Test Performances
     */
    private function testerPerformances() {
        echo "🔸 Test Performances\n";
        echo str_repeat("-", 50) . "\n";
        
        // Test performance avec différentes tailles
        $tailles = [5, 10, 15, 20];
        
        foreach ($tailles as $taille) {
            $startTime = microtime(true);
            $points = $this->genererPointsTest($taille, "Perf Test $taille");
            $resultat = $this->optimizer->optimiserItineraire($points);
            $tempsMs = round((microtime(true) - $startTime) * 1000, 2);
            
            $this->evaluerTest("Performance $taille points", $resultat['success'], [
                'taille' => $taille,
                'temps_ms' => $tempsMs,
                'algorithme' => $resultat['metriques']['algorithme'] ?? 'N/A'
            ]);
            
            // Vérifier que le temps reste raisonnable (< 5 secondes)
            $tempsRaisonnable = $tempsMs < 5000;
            $this->evaluerTest("Temps raisonnable $taille points", $tempsRaisonnable, [
                'temps_ms' => $tempsMs,
                'limite_ms' => 5000
            ]);
        }
        
        // Test des performances système
        $performances = $this->optimizer->obtenirPerformances();
        $this->evaluerTest("Performances système disponibles", !empty($performances), $performances);
        
        echo "\n";
    }
    
    /**
     * 🔹 Test Génération Aléatoire
     */
    private function testerGenerationAleatoire() {
        echo "🔸 Test Génération Aléatoire\n";
        echo str_repeat("-", 50) . "\n";
        
        // Test génération d'itinéraire aléatoire
        $resultatAleatoire = $this->optimizer->genererItineraireTest(7);
        $this->evaluerTest("Génération itinéraire test", $resultatAleatoire['success'], $resultatAleatoire);
        
        if ($resultatAleatoire['success']) {
            $nbPoints = count($resultatAleatoire['itineraire']);
            $this->evaluerTest("Nombre de points cohérent", $nbPoints >= 7, [
                'nb_points_generes' => $nbPoints - 2, // -2 pour les ateliers début/fin
                'nb_demande' => 7
            ]);
        }
        
        echo "\n";
    }
    
    /**
     * 🛠️ Fonctions utilitaires de test
     */
    private function genererPointsTest($nombre, $prefix = 'Client') {
        $points = [];
        $casablancaLat = 33.5731;
        $casablancaLng = -7.5898;
        
        for ($i = 1; $i <= $nombre; $i++) {
            // Générer des points dans un rayon de ~20km autour de Casablanca
            $angle = ($i * 360 / $nombre) * pi() / 180; // Répartition circulaire
            $distance = 0.05 + (($i % 3) * 0.05); // Distance variable 5-15km
            
            $points[] = [
                'id' => $i,
                'nom' => "$prefix $i",
                'client_nom' => "$prefix $i",
                'latitude' => round($casablancaLat + ($distance * cos($angle)), 6),
                'longitude' => round($casablancaLng + ($distance * sin($angle)), 6),
                'type' => 'livraison',
                'priorite' => ['normal', 'haute', 'urgente'][$i % 3]
            ];
        }
        
        return $points;
    }
    
    private function evaluerTest($nom, $succes, $details = null) {
        $this->testsTotal++;
        
        if ($succes) {
            $this->testsReussis++;
            echo "✅ $nom\n";
        } else {
            echo "❌ $nom\n";
            if ($details) {
                echo "   Détails: " . json_encode($details, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
            }
        }
        
        $this->resultatsTests[] = [
            'nom' => $nom,
            'succes' => $succes,
            'details' => $details
        ];
    }
    
    /**
     * 📊 Affichage des résultats finaux
     */
    private function afficherResultatsFinaux($tempsTotal) {
        echo str_repeat("=", 70) . "\n";
        echo "🏆 RÉSULTATS FINAUX DES TESTS\n";
        echo str_repeat("=", 70) . "\n";
        
        $pourcentageReussite = round(($this->testsReussis / $this->testsTotal) * 100, 2);
        
        echo "📊 Tests réussis: {$this->testsReussis}/{$this->testsTotal} ({$pourcentageReussite}%)\n";
        echo "⏱️  Temps total: {$tempsTotal}ms\n";
        
        if ($pourcentageReussite >= 95) {
            echo "🎉 EXCELLENT! Tous les tests passent correctement.\n";
        } elseif ($pourcentageReussite >= 80) {
            echo "👍 BIEN! La plupart des tests passent.\n";
        } elseif ($pourcentageReussite >= 60) {
            echo "⚠️  MOYEN! Quelques problèmes à corriger.\n";
        } else {
            echo "❌ PROBLÈMES! Beaucoup de tests échouent.\n";
        }
        
        echo "\n";
        
        // Afficher les tests échoués
        $testsEchoues = array_filter($this->resultatsTests, function($test) {
            return !$test['succes'];
        });
        
        if (!empty($testsEchoues)) {
            echo "🔍 TESTS ÉCHOUÉS:\n";
            echo str_repeat("-", 40) . "\n";
            foreach ($testsEchoues as $test) {
                echo "- " . $test['nom'] . "\n";
            }
            echo "\n";
        }
    }
    
    /**
     * 📋 Générer rapport détaillé
     */
    private function genererRapport() {
        $performancesOptimiseur = $this->optimizer->obtenirPerformances();
        
        return [
            'resume' => [
                'tests_total' => $this->testsTotal,
                'tests_reussis' => $this->testsReussis,
                'pourcentage_reussite' => round(($this->testsReussis / $this->testsTotal) * 100, 2),
                'statut' => $this->testsReussis === $this->testsTotal ? 'PARFAIT' : 'A_AMELIORER'
            ],
            'details_tests' => $this->resultatsTests,
            'performances_optimiseur' => $performancesOptimiseur,
            'recommandations' => $this->genererRecommandations()
        ];
    }
    
    private function genererRecommandations() {
        $recommandations = [];
        $pourcentageReussite = ($this->testsReussis / $this->testsTotal) * 100;
        
        if ($pourcentageReussite < 100) {
            $recommandations[] = "Corriger les tests qui échouent pour améliorer la fiabilité";
        }
        
        if ($pourcentageReussite >= 95) {
            $recommandations[] = "Excellent travail! L'optimiseur fonctionne très bien";
            $recommandations[] = "Considérer ajouter des tests de charge pour très grandes instances";
        }
        
        $recommandations[] = "Tester avec des données réelles de votre domaine d'application";
        $recommandations[] = "Implémenter des tests d'intégration avec votre base de données";
        
        return $recommandations;
    }
}

// 🚀 EXÉCUTION DES TESTS
try {
    $tester = new RouteOptimizerTester();
    $rapport = $tester->executerTousLesTests();
    
    // Sauvegarder le rapport (optionnel)
    // file_put_contents('rapport_tests_' . date('Y-m-d_H-i-s') . '.json', json_encode($rapport, JSON_PRETTY_PRINT));
    
    echo "✅ Tests terminés avec succès!\n";
    
} catch (Exception $e) {
    echo "💥 ERREUR lors des tests: " . $e->getMessage() . "\n";
    echo "📍 Trace: " . $e->getTraceAsString() . "\n";
}

?>

<!-- 
🎯 INSTRUCTIONS D'UTILISATION:

1. Copiez ce code dans un fichier test_route_optimizer.php
2. Assurez-vous que votre classe RouteOptimizer est accessible (require_once)
3. Exécutez: php test_route_optimizer.php

🔍 CE QUE CE TEST VÉRIFIE:
- ✅ Tous les algorithmes (Simple, Nearest Neighbor, 2-Opt, Hybride)
- ✅ Calculs de distances précis
- ✅ Respect des contraintes
- ✅ Gestion des itinéraires multiples
- ✅ Cas limites et erreurs
- ✅ Performances sur différentes tailles
- ✅ Génération de données de test

🎯 RÉSULTATS ATTENDUS:
- Tests réussis: 25-30/30+ (>90%)
- Temps total: <5 secondes
- Tous les algorithmes fonctionnent correctement

📊 RAPPORT GÉNÉRÉ:
- Résumé des performances
- Détails de chaque test
- Recommandations d'amélioration
-->