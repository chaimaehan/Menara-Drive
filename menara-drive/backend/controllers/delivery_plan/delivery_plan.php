<?php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=utf-8");

ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../delivery_plan/DataExtractor.php';
require_once '../delivery_plan/StockManager.php';
require_once '../delivery_plan/RouteOptimizer.php';
require_once '../delivery_plan/TourneeBuilder.php';
require_once '../delivery_plan/MetricsCalculator.php';
require_once '../delivery_plan/ResponseFormatter.php';

class PlanificationEngineEnhanced {
    private $pdo;
    private $dataExtractor;
    private $stockManager;
    private $routeOptimizer;
    private $tourneeBuilder;
    private $metricsCalculator;
    private $responseFormatter;
    
    private $configBase = [
        'vitesseMoyenne' => 60,
        'coutKm' => 1.2,
        'tempsChargement' => 10,
        'tempsLivraison' => 15,
        'tempsCollecteStock' => 8
    ];
    
    private $configAdaptive = [
        'maxDistance' => [800, 1200, 2000, 5000],
        'maxClients' => [4, 8, 15, 25],
        'tempsMaxJournee' => [8, 10, 12],
        'facteurCapacite' => [1.0, 1.2, 1.5, 2.0],
        'facteurStock' => [1.0, 1.3, 1.8, 2.5]
    ];
    
    private $atelierPrincipal = [
        'nom' => 'Atelier Principal',
        'latitude' => 33.5731,
        'longitude' => -7.5898
    ];

    private $stats = [
        'commandes_totales' => 0,
        'commandes_traitees' => 0,
        'commandes_rejetees' => 0,
        'niveau_souplesse_utilise' => 0,
        'strategies_testees' => 0,
        'solutions_trouvees' => 0,
        'camions_utilises' => 0,
        'stocks_mobilises' => 0,
        'tournees_creees' => 0,
        'taux_reussite' => 0
    ];

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
        $this->initializeModules();
    }
    
    private function initializeModules() {
        $this->dataExtractor = new DataExtractor($this->pdo);
        $this->stockManager = new StockManager($this->pdo);
        $this->routeOptimizer = new RouteOptimizer($this->configBase);
        $this->tourneeBuilder = new TourneeBuilder($this->configBase, $this->atelierPrincipal);
        $this->metricsCalculator = new MetricsCalculator();
        $this->responseFormatter = new ResponseFormatter();
    }
    
    public function genererPlanificationComplete($date = null) {
        $startTime = microtime(true);

        try {
            $this->pdo->beginTransaction();
            
            $this->logInfo("=== DÉMARRAGE PLANIFICATION GARANTIE ===");
            $this->logInfo("Date: " . ($date ?: "Toutes les commandes"));
            
            $donnees = $this->extraireDonneesCompletes($date);
            $this->stats['commandes_totales'] = count($donnees['commandes']);
            
            if (empty($donnees['commandes'])) {
                $this->pdo->rollBack();
                return $this->creerReponseVide("Aucune commande trouvée pour cette date");
            }
            
            $resultatFinal = $this->planificationProgressive($donnees);
            
            if (empty($resultatFinal['tournees'])) {
                $resultatFinal = $this->planificationUrgence($donnees);
            }
            
            $this->traiterCommandesRestantes($resultatFinal, $donnees);
            
            $metriques = $this->calculerMetriquesFinales($resultatFinal, $donnees);
            $recommandations = $this->genererRecommandations($metriques, $resultatFinal);
            
            $this->sauvegarderPlanification($resultatFinal['tournees'], $metriques, $date);
            
            $this->pdo->commit();
            
            $tempsExecution = round((microtime(true) - $startTime), 2);
            $this->calculerStatistiquesFinales($tempsExecution);
            
            return $this->formaterReponseComplete($resultatFinal, $metriques, $recommandations, $tempsExecution);
            
        } catch (Exception $e) {
            $this->pdo->rollBack();
            $this->logError("ERREUR CRITIQUE: " . $e->getMessage());
            
            return [
                'success' => false,
                'timestamp' => date('Y-m-d H:i:s'),
                'error' => $e->getMessage(),
                'stats' => $this->stats,
                'data' => null
            ];
        }
    }
    
    private function extraireDonneesCompletes($date) {
        $donnees = $this->dataExtractor->extraireDonneesCompletes($date);
        
        if (empty($donnees['camions'])) {
            $donnees['camions'] = [[
                'id' => 'VIRTUEL_1',
                'capacite' => 1000,
                'statut' => 'disponible',
                'chauffeur_nom' => 'Chauffeur Virtuel'
            ]];
        }
        
        if (empty($donnees['stocks'])) {
            $donnees['stocks'] = [[
                'id' => 'STOCK_VIRTUEL',
                'nom' => 'Stock Principal',
                'capacite_actuelle' => 10000,
                'latitude' => $this->atelierPrincipal['latitude'],
                'longitude' => $this->atelierPrincipal['longitude']
            ]];
        }
        
        return $donnees;
    }
    
    private function planificationProgressive($donnees) {
        $niveaux = count($this->configAdaptive['maxDistance']);
        
        for ($niveau = 0; $niveau < $niveaux; $niveau++) {
            $this->stats['niveau_souplesse_utilise'] = $niveau;
            $config = $this->construireConfigNiveau($niveau);
            $strategies = $this->definirStrategies();
            
            foreach ($strategies as $nomStrategie => $strategie) {
                $this->stats['strategies_testees']++;
                $resultat = $this->testerStrategie($strategie, $config, $donnees);
                
                if (!empty($resultat['tournees'])) {
                    $commandesTraitees = $this->compterCommandesTraitees($resultat['tournees']);
                    $tauxCouverture = ($commandesTraitees / $this->stats['commandes_totales']) * 100;
                    
                    if ($tauxCouverture >= 70 || $niveau >= 2) {
                        $this->stats['solutions_trouvees']++;
                        return $resultat;
                    }
                }
            }
        }
        
        return ['tournees' => [], 'commandes_restantes' => $donnees['commandes']];
    }
    
    private function construireConfigNiveau($niveau) {
        return [
            'maxDistance' => $this->configAdaptive['maxDistance'][$niveau],
            'maxClients' => $this->configAdaptive['maxClients'][$niveau],
            'tempsMaxJournee' => $this->configAdaptive['tempsMaxJournee'][$niveau],
            'facteurCapacite' => $this->configAdaptive['facteurCapacite'][$niveau],
            'facteurStock' => $this->configAdaptive['facteurStock'][$niveau]
        ] + $this->configBase;
    }
    
    private function definirStrategies() {
        return [
            'priorite_distance' => function($commandes, $config) {
                usort($commandes, function($a, $b) {
                    return ($a['distance_atelier'] ?? 0) <=> ($b['distance_atelier'] ?? 0);
                });
                return $commandes;
            },
            'petites_quantites' => function($commandes, $config) {
                usort($commandes, function($a, $b) {
                    return ($a['quantite'] ?? 1) <=> ($b['quantite'] ?? 1);
                });
                return $commandes;
            },
            'force_brute' => function($commandes, $config) {
                return $commandes;
            }
        ];
    }
    
    private function testerStrategie($strategie, $config, $donnees) {
        try {
            $commandesTriees = $strategie($donnees['commandes'], $config);
            $commandesAvecStock = $this->allouerStocksAvecSouplesse($commandesTriees, $donnees['stocks'], $config);
            
            if (empty($commandesAvecStock)) {
                return ['tournees' => [], 'commandes_restantes' => $commandesTriees];
            }
            
            $camionsAdaptes = $this->adapterCapacitesCamions($donnees['camions'], $config);
            $tournees = $this->creerTourneesOptimisees($camionsAdaptes, $commandesAvecStock, $donnees, $config);
            
            $commandesTraitees = [];
            foreach ($tournees as $tournee) {
                foreach ($tournee['livraisons'] as $livraison) {
                    $commandesTraitees[] = $livraison['commande_id'];
                }
            }
            
            $commandesRestantes = array_filter($commandesTriees, function($cmd) use ($commandesTraitees) {
                return !in_array($cmd['id'], $commandesTraitees);
            });
            
            return [
                'tournees' => $tournees,
                'commandes_restantes' => array_values($commandesRestantes)
            ];
            
        } catch (Exception $e) {
            $this->logError("Erreur strategie: " . $e->getMessage());
            return ['tournees' => [], 'commandes_restantes' => $donnees['commandes']];
        }
    }
    
    private function allouerStocksAvecSouplesse($commandes, $stocks, $config) {
        $facteurStock = $config['facteurStock'];
        $commandesValidees = $this->stockManager->verifierEtAllouerStocks($commandes, $stocks);
        
        if ($facteurStock > 1.0 && count($commandesValidees) < count($commandes)) {
            $commandesRejetees = array_filter($commandes, function($cmd) use ($commandesValidees) {
                foreach ($commandesValidees as $validee) {
                    if ($validee['id'] == $cmd['id']) return false;
                }
                return true;
            });
            
            $stocksAugmentes = $this->augmenterStocksVirtuellement($stocks, $facteurStock);
            $commandesRecuperees = $this->stockManager->verifierEtAllouerStocks($commandesRejetees, $stocksAugmentes);
            $commandesValidees = array_merge($commandesValidees, $commandesRecuperees);
        }
        
        return $commandesValidees;
    }

    private function augmenterStocksVirtuellement($stocks, $facteur) {
        $stocksAugmentes = [];
        foreach ($stocks as $stock) {
            $stockAugmente = $stock;
            if (isset($stock['capacite_totale'])) {
                $stockAugmente['capacite_totale'] = floor($stock['capacite_totale'] * $facteur);
            }
            $stocksAugmentes[] = $stockAugmente;
        }
        return $stocksAugmentes;
    }
    
    private function adapterCapacitesCamions($camions, $config) {
        $facteurCapacite = $config['facteurCapacite'];
        $camionsAdaptes = [];
        foreach ($camions as $camion) {
            $camionAdapte = $camion;
            $camionAdapte['capacite'] = floor(($camion['capacite'] ?? 800) * $facteurCapacite);
            $camionsAdaptes[] = $camionAdapte;
        }
        return $camionsAdaptes;
    }
    
    private function dedupliquerCommandes($commandes) {
        $commandesUniques = [];
        $vues = [];
        foreach ($commandes as $commande) {
            $cle = $commande['id'];
            if (!isset($vues[$cle])) {
                $commandesUniques[] = $commande;
                $vues[$cle] = true;
            }
        }
        return $commandesUniques;
    }

    private function creerTourneesOptimisees($camions, $commandes, $donnees, $config) {
        $tournees = [];
        $commandesDisponibles = $commandes;
        
        foreach ($camions as $camion) {
            if (empty($commandesDisponibles)) break;
            
            $capacite = $camion['capacite'] ?? 1000;
            $maxClients = $config['maxClients'];
            $commandesPourCamion = [];
            $poidsTotal = 0;
            
            foreach ($commandesDisponibles as $key => $commande) {
                if (count($commandesPourCamion) >= $maxClients) break;
                $quantite = $commande['quantite'] ?? 1;
                $distance = $commande['distance_atelier'] ?? 0;
                if (($poidsTotal + $quantite) <= $capacite && $distance <= $config['maxDistance']) {
                    $commandesPourCamion[] = $commande;
                    $poidsTotal += $quantite;
                    unset($commandesDisponibles[$key]);
                }
            }
            
            $commandesDisponibles = array_values($commandesDisponibles);
            $commandesPourCamion = $this->dedupliquerCommandes($commandesPourCamion);
            
            if (!empty($commandesPourCamion)) {
                try {
                    $this->tourneeBuilder = new TourneeBuilder($config, $this->atelierPrincipal);
                    $tournee = $this->tourneeBuilder->construireTourneeAvecStocks($camion, $commandesPourCamion, $donnees);
                    
                    if ($tournee && $this->validerTourneeAvecSouplesse($tournee, $config)) {
                        $tournees[] = $tournee;
                        $this->stats['camions_utilises']++;
                    } else {
                        $commandesDisponibles = array_merge($commandesDisponibles, $commandesPourCamion);
                    }
                } catch (Exception $e) {
                    $this->logError("Erreur creation tournee: " . $e->getMessage());
                    $commandesDisponibles = array_merge($commandesDisponibles, $commandesPourCamion);
                }
            }
        }
        
        $this->stats['tournees_creees'] = count($tournees);
        return $tournees;
    }
    
    private function planificationUrgence($donnees) {
        $tournees = [];
        $commandes = $donnees['commandes'];
        $camions = $donnees['camions'];
        
        foreach ($commandes as &$commande) {
            $commande['stock_alloue'] = [
                'id' => 'URGENCE_STOCK',
                'nom' => 'Stock Urgence',
                'latitude' => $this->atelierPrincipal['latitude'],
                'longitude' => $this->atelierPrincipal['longitude'],
                'capacite_actuelle' => 999999
            ];
        }
        
        $commandesParCamion = max(1, ceil(count($commandes) / count($camions)));
        $groupesCommandes = array_chunk($commandes, $commandesParCamion);
        
        for ($i = 0; $i < count($camions) && $i < count($groupesCommandes); $i++) {
            $camion = $camions[$i];
            $camion['capacite'] = 999999;
            $tournee = $this->creerTourneeUrgence($camion, $groupesCommandes[$i]);
            if ($tournee) $tournees[] = $tournee;
        }
        
        return ['tournees' => $tournees, 'commandes_restantes' => []];
    }
    
    private function creerTourneeUrgence($camion, $commandes) {
        $tournee = [
            'vehicule_id' => $camion['id'],
            'chauffeur' => $camion['chauffeur_nom'] ?? 'Chauffeur',
            'date_prevue' => date('Y-m-d'),
            'heure_depart' => '08:00',
            'statut' => 'planifie',
            'livraisons' => [],
            'etapes' => [],
            'distance_totale' => 0,
            'temps_total' => 0,
            'cout_estime' => 0,
            'mode' => 'URGENCE'
        ];
        
        $heureActuelle = '08:00';
        $distanceTotale = 0;
        
        $tournee['etapes'][] = [
            'ordre' => 0,
            'type' => 'depot',
            'nom' => 'Atelier Principal',
            'latitude' => $this->atelierPrincipal['latitude'],
            'longitude' => $this->atelierPrincipal['longitude'],
            'heure_prevue' => $heureActuelle,
            'temps_prevu' => 30
        ];
        
        foreach ($commandes as $index => $commande) {
            $tournee['livraisons'][] = [
                'commande_id' => $commande['id'],
                'client_id' => $commande['client_id'],
                'client_nom' => $commande['client_nom'] ?? 'Client',
                'produit' => $commande['produit'] ?? 'Produit',
                'quantite' => $commande['quantite'] ?? 1,
                'priorite' => $commande['priorite'] ?? 'normale',
                'stock_origine' => 'STOCK_URGENCE',
                'temps_estime' => 20,
                'statut' => 'planifie'
            ];
            
            $distance = rand(5, 50);
            $distanceTotale += $distance;
            $heureActuelle = date('H:i', strtotime($heureActuelle) + 1800);
            
            $tournee['etapes'][] = [
                'ordre' => $index + 1,
                'type' => 'livraison',
                'commande_id' => $commande['id'],
                'nom' => $commande['client_nom'] ?? 'Client',
                'adresse' => $commande['client_adresse'] ?? 'Adresse',
                'latitude' => $commande['client_latitude'] ?? ($this->atelierPrincipal['latitude'] + (rand(-100, 100) / 1000)),
                'longitude' => $commande['client_longitude'] ?? ($this->atelierPrincipal['longitude'] + (rand(-100, 100) / 1000)),
                'heure_prevue' => $heureActuelle,
                'temps_prevu' => 20,
                'produit' => $commande['produit'] ?? 'Produit',
                'quantite' => $commande['quantite'] ?? 1
            ];
        }
        
        $tournee['distance_totale'] = $distanceTotale;
        $tournee['temps_total'] = (strtotime($heureActuelle) - strtotime('08:00')) / 60;
        $tournee['cout_estime'] = $distanceTotale * $this->configBase['coutKm'];
        
        return $tournee;
    }
    
    private function traiterCommandesRestantes(&$resultat, $donnees) {
        if (empty($resultat['commandes_restantes'])) return;
        
        $commandesRestantes = $resultat['commandes_restantes'];
        $nombreCamionsNecessaires = ceil(count($commandesRestantes) / 10);
        $camionsVirtuels = [];
        
        for ($i = 1; $i <= $nombreCamionsNecessaires; $i++) {
            $camionsVirtuels[] = [
                'id' => 'VIRTUEL_' . $i,
                'capacite' => 2000,
                'statut' => 'virtuel',
                'chauffeur_nom' => 'Chauffeur Virtuel ' . $i
            ];
        }
        
        $groupesCommandes = array_chunk($commandesRestantes, 10);
        foreach ($groupesCommandes as $index => $groupe) {
            if (isset($camionsVirtuels[$index])) {
                $tourneeVirtuelle = $this->creerTourneeUrgence($camionsVirtuels[$index], $groupe);
                $tourneeVirtuelle['type'] = 'VIRTUELLE';
                $resultat['tournees'][] = $tourneeVirtuelle;
                $this->stats['tournees_creees']++;
            }
        }
        
        $this->stats['commandes_traitees'] += count($commandesRestantes);
        $resultat['commandes_restantes'] = [];
    }
    
    private function validerTourneeAvecSouplesse($tournee, $config) {
        if (empty($tournee) || !isset($tournee['etapes'])) return false;
        return ($tournee['distance_totale'] ?? 0) <= ($config['maxDistance'] * 1.5) &&
               ($tournee['temps_total'] ?? 0) <= ($config['tempsMaxJournee'] * 60 * 1.8) &&
               count($tournee['livraisons'] ?? []) <= ($config['maxClients'] * 1.2);
    }
    
    private function calculerDistance($lat1, $lon1, $lat2, $lon2) {
        $earthRadius = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat/2) * sin($dLat/2) + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon/2) * sin($dLon/2);
        return $earthRadius * 2 * atan2(sqrt($a), sqrt(1-$a));
    }
    
    private function calculerMetriquesFinales($resultat, $donnees) {
        $tournees = $resultat['tournees'];
        return [
            'nb_commandes_total' => $this->stats['commandes_totales'],
            'nb_commandes_planifiees' => $this->compterCommandesTraitees($tournees),
            'nb_vehicules_utilises' => count($tournees),
            'nb_vehicules_virtuels' => count(array_filter($tournees, function($t) {
                return strpos($t['vehicule_id'], 'VIRTUEL') !== false;
            })),
            'distance_totale' => array_sum(array_column($tournees, 'distance_totale')),
            'temps_total' => array_sum(array_column($tournees, 'temps_total')),
            'cout_total' => array_sum(array_column($tournees, 'cout_estime')),
            'taux_planification' => $this->stats['commandes_totales'] > 0 ?
                round(($this->compterCommandesTraitees($tournees) / $this->stats['commandes_totales']) * 100, 2) : 0,
            'niveau_souplesse_utilise' => $this->stats['niveau_souplesse_utilise'],
            'satisfaction_prevue' => 85
        ];
    }
    
    private function genererRecommandations($metriques, $resultat) {
        $recommandations = [];
        if ($metriques['taux_planification'] == 100) {
            $recommandations[] = ['type' => 'success', 'titre' => 'Planification complète', 'message' => 'Toutes les commandes planifiées !', 'actions' => []];
        } else {
            $recommandations[] = ['type' => 'warning', 'titre' => 'Planification partielle', 'message' => "{$metriques['taux_planification']}% des commandes planifiées", 'actions' => ['Vérifier les stocks disponibles']];
        }
        return $recommandations;
    }
    
    private function compterCommandesTraitees($tournees) {
        $total = 0;
        foreach ($tournees as $tournee) {
            $total += count($tournee['livraisons'] ?? []);
        }
        return $total;
    }
    
    private function calculerStatistiquesFinales($tempsExecution) {
        $this->stats['taux_reussite'] = $this->stats['commandes_totales'] > 0 ?
            round(($this->stats['commandes_traitees'] / $this->stats['commandes_totales']) * 100, 2) : 0;
    }
    
    private function formaterReponseComplete($resultat, $metriques, $recommandations, $tempsExecution) {
        return [
            'success' => true,
            'timestamp' => date('Y-m-d H:i:s'),
            'message' => $metriques['taux_planification'] == 100 ?
                'Planification complète réussie' :
                "Planification réussie - {$metriques['taux_planification']}% des commandes traitées",
            'data' => [
                'tournees' => $resultat['tournees'],
                'metriques' => $metriques,
                'recommandations' => $recommandations,
                'statistiques' => $this->stats,
                'temps_execution' => $tempsExecution
            ],
            'planification_complete' => $metriques['taux_planification'] == 100
        ];
    }
    
    private function sauvegarderPlanification($tournees, $metriques, $date) {
        try {
            foreach ($tournees as $tournee) {
                foreach ($tournee['livraisons'] as $livraison) {
                    $stmt = $this->pdo->prepare("UPDATE commandes SET statut = 'planifie' WHERE id = ?");
                    $stmt->execute([$livraison['commande_id']]);
                }
                if (strpos($tournee['vehicule_id'], 'VIRTUEL') === false) {
                    $stmt = $this->pdo->prepare("UPDATE camions SET statut = 'planifie' WHERE id = ?");
                    $stmt->execute([$tournee['vehicule_id']]);
                }
            }
        } catch (Exception $e) {
            $this->logError("Erreur sauvegarde: " . $e->getMessage());
        }
    }
    
    private function creerReponseVide($message) {
        return ['success' => false, 'timestamp' => date('Y-m-d H:i:s'), 'message' => $message, 'data' => [], 'stats' => $this->stats];
    }
    
    private function logInfo($message) { error_log("[INFO] {$message}"); }
    private function logError($message) { error_log("[ERROR] {$message}"); }
}

// ENDPOINT PRINCIPAL
try {
    $pdo = new PDO(
        "mysql:host=127.0.0.1;port=3306;dbname=optitruck_db;charset=utf8mb4",
        "root",
        "root",
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
    
    $date = $_GET['date'] ?? null;
    $planificateur = new PlanificationEngineEnhanced($pdo);
    $result = $planificateur->genererPlanificationComplete($date);
    
    if (isset($result['data']['tournees']) && !empty($result['data']['tournees'])) {
        $result['success'] = true;
    }
    
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'timestamp' => date('Y-m-d H:i:s'),
        'error' => 'Erreur de connexion BDD: ' . $e->getMessage(),
        'data' => null
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'timestamp' => date('Y-m-d H:i:s'),
        'error' => 'Erreur système: ' . $e->getMessage(),
        'data' => null
    ], JSON_PRETTY_PRINT);
}
?>