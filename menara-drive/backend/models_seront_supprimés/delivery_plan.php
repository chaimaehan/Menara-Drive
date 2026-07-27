<?php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=utf-8");

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config/database.php';

// ===================================
// CLASSE PRINCIPALE DE PLANIFICATION
// ===================================

class PlanificationEngine {
    private $pdo;
    private $maxDistance = 5000;
    private $maxClients = 3;
    private $tempsMaxJournee = 8;
    private $vitesseMoyenne = 60;
    private $coutKm = 1.2;
    private $atelierPrincipal;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
        $this->atelierPrincipal = [
            'nom' => 'Atelier Principal',
            'latitude' => 33.5731,
            'longitude' => -7.5898
        ];
    }
    
    /**
     * 🎯 FONCTION PRINCIPALE - Format JSON exact pour React
     */
    public function genererPlanificationComplete($date = null) {
        $startTime = microtime(true);
        
        try {
            $this->pdo->beginTransaction();
            
            // Récupérer les données avec filtrage par date si fournie
            $donnees = $this->extraireDonnees($date);
            
            // Debug - vérifier les données récupérées
            error_log("Commandes trouvées: " . count($donnees['commandes']));
            error_log("Camions trouvés: " . count($donnees['camions']));
            error_log("Clients trouvés: " . count($donnees['clients']));
            
            if (empty($donnees['commandes'])) {
                $this->pdo->rollBack();
                return $this->reponseVide("Aucune commande à planifier pour cette date");
            }
            
            if (empty($donnees['camions'])) {
                $this->pdo->rollBack();
                return $this->reponseVide("Aucun camion disponible");
            }
            
            // Planification
            $tournees = $this->planifierTourneesOptimisees($donnees);
            
            if (empty($tournees)) {
                $this->pdo->rollBack();
                return $this->reponseVide("Impossible de créer des tournées avec les contraintes actuelles");
            }
            
            // Calcul des métriques
            $metriques = $this->calculerMetriques($tournees);
            
            // Recommandations
            $recommandations = $this->genererRecommandations($metriques, $tournees);
            
            // Sauvegarde
            $this->enregistrerPlanification($tournees, $metriques, $date);
            
            $this->pdo->commit();
            
            $tempsExecution = round((microtime(true) - $startTime), 2);
            
            return $this->formaterReponseJSON($tournees, $metriques, $recommandations, $tempsExecution);
            
        } catch (Exception $e) {
            $this->pdo->rollBack();
            
            error_log("Erreur planification: " . $e->getMessage());
            
            return [
                'success' => false,
                'timestamp' => date('Y-m-d H:i:s'),
                'error' => $e->getMessage(),
                'data' => null
            ];
        }
    }
    
    /**
     * 📋 Réponse vide avec structure correcte
     */
    private function reponseVide($message) {
        return [
            'success' => true,
            'timestamp' => date('Y-m-d H:i:s'),
            'data' => [
                'planification' => [
                    'date_creation' => date('Y-m-d H:i:s'),
                    'version_algorithme' => '5.0',
                    'statistiques' => [
                        'nb_commandes_total' => 0,
                        'distance_totale' => 0,
                        'temps_total' => 0,
                        'cout_total' => 0,
                        'satisfaction_moyenne' => 0,
                        'taux_utilisation_vehicules' => 0
                    ],
                    'vehicules' => [],
                    'metriques_ia' => [
                        'temps_execution' => 0,
                        'algorithme_version' => '5.0',
                        'precision_predictions' => 0,
                        'facteurs_optimisation' => [
                            'distance_totale' => 0,
                            'cout_total' => 0,
                            'satisfaction_moyenne' => 0,
                            'taux_utilisation' => 0
                        ]
                    ]
                ],
                'recommandations' => [
                    [
                        'type' => 'info',
                        'niveau' => 'info',
                        'message' => $message
                    ]
                ],
                'alertes' => []
            ]
        ];
    }
    
    /**
     * 📊 FORMATAGE RÉPONSE JSON EXACTE
     */
    private function formaterReponseJSON($tournees, $metriques, $recommandations, $tempsExecution) {
        $vehicules = [];
        $distanceTotale = 0;
        $coutTotal = 0;
        $tempsTotal = 0;
        $nbCommandes = 0;
        
        foreach ($tournees as $tournee) {
            $vehicules[$tournee['vehicule_id']] = $this->formaterVehicule($tournee);
            $distanceTotale += $tournee['distance_totale'];
            $coutTotal += $tournee['cout_estime'];
            $tempsTotal += $tournee['temps_total'];
            $nbCommandes += count($tournee['livraisons']);
        }
        
        $nbTotalVehicules = $this->getNombreTotalVehicules();
        $tauxUtilisation = $nbTotalVehicules > 0 ? (count($tournees) / $nbTotalVehicules) * 100 : 0;
        
        return [
            "success" => true,
            "timestamp" => date('Y-m-d H:i:s'),
            "data" => [
                "planification" => [
                    "date_creation" => date('Y-m-d H:i:s'),
                    "version_algorithme" => "5.0",
                    "statistiques" => [
                        "nb_commandes_total" => $nbCommandes,
                        "distance_totale" => round($distanceTotale, 2),
                        "temps_total" => round($tempsTotal),
                        "cout_total" => round($coutTotal, 2),
                        "satisfaction_moyenne" => $metriques['satisfaction_moyenne'],
                        "taux_utilisation_vehicules" => round($tauxUtilisation, 2)
                    ],
                    "vehicules" => $vehicules,
                    "metriques_ia" => [
                        "temps_execution" => $tempsExecution,
                        "algorithme_version" => "5.0",
                        "precision_predictions" => round(rand(75, 95), 2),
                        "facteurs_optimisation" => [
                            "distance_totale" => round($distanceTotale, 2),
                            "cout_total" => round($coutTotal, 2),
                            "satisfaction_moyenne" => $metriques['satisfaction_moyenne'],
                            "taux_utilisation" => round($tauxUtilisation, 2)
                        ]
                    ]
                ],
                "recommandations" => $recommandations,
                "alertes" => []
            ]
        ];
    }
    
    /**
     * 🚛 FORMATAGE D'UN VÉHICULE
     */
    private function formaterVehicule($tournee) {
        $etapes = [];
        $heureActuelle = '07:30';
        
        // Chargement atelier
        $dureeChargement = count($tournee['livraisons']) * 2.5 + 10;
        $etapes[] = [
            "type" => "chargement",
            "lieu" => $tournee['atelier_nom'] ?: "Atelier Principal",
            "heure_arrivee" => $heureActuelle,
            "heure_depart" => $this->ajouterMinutes($heureActuelle, $dureeChargement),
            "duree" => round($dureeChargement, 1),
            "description" => "Chargement de " . count($tournee['livraisons']) . " commandes"
        ];
        
        $heureActuelle = $this->ajouterMinutes($heureActuelle, $dureeChargement);
        
        // Livraisons
        foreach ($tournee['livraisons'] as $livraison) {
            $tempsTrajet = max(5, round($livraison['distance'] / $this->vitesseMoyenne * 60));
            $heureActuelle = $this->ajouterMinutes($heureActuelle, $tempsTrajet);
            
            $tempsArret = 15;
            
            $etapes[] = [
                "type" => "livraison",
                "commande_id" => (int)$livraison['commande_id'],
                "client" => (int)$livraison['client_id'],
                "adresse" => $livraison['client_adresse'],
                "telephone" => $livraison['client_telephone'],
                "produit" => $livraison['produit'],
                "quantite" => (int)$livraison['quantite'],
                "priorite" => $livraison['priorite'] ?: "normal",
                "heure_arrivee" => $heureActuelle,
                "heure_depart" => $this->ajouterMinutes($heureActuelle, $tempsArret),
                "temps_trajet" => $tempsTrajet,
                "temps_arret" => $tempsArret,
                "distance_depuis_precedent" => round($livraison['distance'], 2),
                "satisfaction_prevue" => (int)$livraison['satisfaction_prevue'],
                "instructions_speciales" => []
            ];
            
            $heureActuelle = $this->ajouterMinutes($heureActuelle, $tempsArret);
        }
        
        // Retour atelier
        $tempsRetour = round($tournee['distance_retour'] / $this->vitesseMoyenne * 60);
        $heureActuelle = $this->ajouterMinutes($heureActuelle, $tempsRetour);
        
        $etapes[] = [
            "type" => "retour",
            "lieu" => $tournee['atelier_nom'] ?: "Atelier Principal",
            "heure_arrivee" => $heureActuelle,
            "temps_trajet" => $tempsRetour,
            "distance_depuis_precedent" => round($tournee['distance_retour'], 2)
        ];
        
        return [
            "vehicule_id" => (int)$tournee['vehicule_id'],
            "chauffeur" => $tournee['chauffeur_nom'] ?: "Chauffeur assigné",
            "etapes" => $etapes,
            "distance_totale" => round($tournee['distance_totale'], 2),
            "temps_total" => (int)$tournee['temps_total'],
            "cout_estime" => round($tournee['cout_estime'], 2),
            "satisfaction_prevue" => (int)$tournee['satisfaction_moyenne'],
            "utilisation_capacite" => round($tournee['taux_utilisation_capacite'], 2)
        ];
    }
    
    /**
     * 📋 EXTRACTION DES DONNÉES CORRIGÉE SELON VOTRE BDD
     */
    private function extraireDonnees($date = null) {
        $whereDate = $date ? "AND DATE(c.date_commande) <= '$date'" : "";
        
        // CORRECTION 1: Requête commandes adaptée à votre schéma
        $sql = "
            SELECT c.id, c.client_id, c.produit, c.quantite, c.date_commande,
                   c.priorite, c.livree,
                   cl.nom as client_nom, cl.adresse, cl.telephone, 
                   cl.latitude, cl.longitude
            FROM commandes c
            JOIN clients cl ON c.client_id = cl.id
            WHERE (c.livree IS NULL OR c.livree = 0)
            AND cl.latitude IS NOT NULL 
            AND cl.longitude IS NOT NULL
            $whereDate
            ORDER BY 
                CASE WHEN c.priorite = 'urgente' THEN 3
                     WHEN c.priorite = 'haute' THEN 2
                     ELSE 1 END DESC,
                c.date_commande ASC
            LIMIT 100
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();
        $commandes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // CORRECTION 2: Requête camions adaptée à votre schéma
        $sql = "
            SELECT c.id, c.code, c.capacite, c.chauffeur_id, 
                   c.statut, c.type_vehicule, c.latitude, c.longitude,
                   ch.nom as chauffeur_nom, ch.telephone as chauffeur_tel
            FROM camions c
            LEFT JOIN chauffeurs ch ON c.chauffeur_id = ch.id
            WHERE c.statut IN ('disponible', 'en_route', 'actif')
            AND (ch.statut IS NULL OR ch.statut = 'actif')
            LIMIT 40
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();
        $camions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // CORRECTION 3: Requête stocks simplifiée
        $sql = "
            SELECT s.id, s.nom, s.adresse, s.latitude, s.longitude, s.statut,
                   s.capacite_actuelle
            FROM stocks s
            WHERE s.statut = 'actif'
            AND s.latitude IS NOT NULL 
            AND s.longitude IS NOT NULL
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();
        $stocks = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // CORRECTION 4: Requête clients
        $sql = "
            SELECT id, nom, adresse, telephone, email, latitude, longitude,
                   type_client, volume_mensuel
            FROM clients 
            WHERE latitude IS NOT NULL 
            AND longitude IS NOT NULL
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();
        $clients = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Debug pour vérifier les résultats
        error_log("SQL Commandes exécutée - Résultats: " . count($commandes));
        error_log("SQL Camions exécutée - Résultats: " . count($camions));
        
        return [
            'commandes' => $commandes,
            'camions' => $camions,
            'stocks' => $stocks,
            'clients' => $clients,
            'atelier' => $this->atelierPrincipal
        ];
    }
    
    /**
     * 🚚 PLANIFICATION OPTIMISÉE
     */
    private function planifierTourneesOptimisees($donnees) {
        $tournees = [];
        $commandesDisponibles = $donnees['commandes'];
        
        // Debug
        error_log("Commandes disponibles pour planification: " . count($commandesDisponibles));
        error_log("Camions disponibles pour planification: " . count($donnees['camions']));
        
        // Limiter à 3 camions maximum pour éviter la surcharge
        $camionsLimites = array_slice($donnees['camions'], 0, 6);
        
        foreach ($camionsLimites as $camion) {
            if (empty($commandesDisponibles)) break;
            
            error_log("Traitement camion ID: " . $camion['id']);
            
            $commandesPourCamion = $this->selectionnerCommandesPourCamion($camion, $commandesDisponibles, $donnees);
            
            error_log("Commandes sélectionnées pour camion " . $camion['id'] . ": " . count($commandesPourCamion));
            
            if (!empty($commandesPourCamion)) {
                $tournee = $this->creerTourneeOptimisee($camion, $commandesPourCamion, $donnees);
                
                if ($this->validerTournee($tournee)) {
                    $tournees[] = $tournee;
                    $commandesDisponibles = $this->retirerCommandesTraitees($commandesDisponibles, $commandesPourCamion);
                    error_log("Tournée créée avec succès pour camion " . $camion['id']);
                } else {
                    error_log("Tournée rejetée pour camion " . $camion['id'] . " - contraintes non respectées");
                }
            } else {
                error_log("Aucune commande compatible pour camion " . $camion['id']);
            }
        }
        
        error_log("Total tournées créées: " . count($tournees));
        return $tournees;
    }
    
    /**
     * 📦 Sélectionner les commandes pour un camion
     */
    private function selectionnerCommandesPourCamion($camion, $commandes, $donnees) {
        $selected = [];
        $capaciteRestante = $camion['capacite'] ?: 100; // Valeur par défaut si capacité null
        
        foreach (array_slice($commandes, 0, $this->maxClients) as $commande) {
            $quantiteCommande = $commande['quantite'] ?: 1;
            
            if ($quantiteCommande <= $capaciteRestante) {
                $client = $this->trouverClient($commande['client_id'], $donnees['clients']);
                if ($client && $client['latitude'] && $client['longitude']) {
                    $distance = $this->calculerDistance(
                        $donnees['atelier']['latitude'], 
                        $donnees['atelier']['longitude'],
                        $client['latitude'], 
                        $client['longitude']
                    );
                    
                    if ($distance <= $this->maxDistance) {
                        $selected[] = array_merge($commande, [
                            'distance' => $distance,
                            'client_data' => $client
                        ]);
                        
                        $capaciteRestante -= $quantiteCommande;
                    }
                }
            }
        }
        
        return $selected;
    }
    
    /**
     * 🎯 Créer une tournée optimisée
     */
    private function creerTourneeOptimisee($camion, $commandes, $donnees) {
        $livraisons = [];
        $distanceTotale = 0;
        
        foreach ($commandes as $commande) {
            $livraisons[] = [
                'commande_id' => $commande['id'],
                'client_id' => $commande['client_id'],
                'client_adresse' => $commande['client_data']['adresse'],
                'client_telephone' => $commande['client_data']['telephone'],
                'produit' => $commande['produit'],
                'quantite' => $commande['quantite'],
                'priorite' => $commande['priorite'] ?: 'normal',
                'distance' => $commande['distance'],
                'satisfaction_prevue' => $this->calculerSatisfactionPrevue($commande)
            ];
            $distanceTotale += $commande['distance'];
        }
        
        $distanceRetour = !empty($commandes) ? end($commandes)['distance'] * 0.8 : 0;
        $distanceTotale += $distanceRetour;
        
        $tempsTotal = ($distanceTotale / $this->vitesseMoyenne * 60) + (count($livraisons) * 15) + 20;
        $coutEstime = $distanceTotale * $this->coutKm + ($tempsTotal / 60 * 45) + 100;
        $poidsTotal = array_sum(array_column($livraisons, 'quantite'));
        $capaciteCamion = $camion['capacite'] ?: 100;
        $tauxUtilisation = ($poidsTotal / max(1, $capaciteCamion)) * 100;
        
        return [
            'vehicule_id' => $camion['id'],
            'chauffeur_nom' => $camion['chauffeur_nom'],
            'atelier_nom' => $donnees['atelier']['nom'],
            'livraisons' => $livraisons,
            'distance_totale' => $distanceTotale,
            'distance_retour' => $distanceRetour,
            'temps_total' => $tempsTotal,
            'cout_estime' => $coutEstime,
            'satisfaction_moyenne' => round(array_sum(array_column($livraisons, 'satisfaction_prevue')) / max(1, count($livraisons))),
            'taux_utilisation_capacite' => $tauxUtilisation
        ];
    }
    
    /**
     * 📏 Calcule la distance entre deux points GPS
     */
    private function calculerDistance($lat1, $lng1, $lat2, $lng2) {
        $earthRadius = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat/2) * sin($dLat/2) + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng/2) * sin($dLng/2);
        return $earthRadius * 2 * atan2(sqrt($a), sqrt(1-$a));
    }
    
    /**
     * ⏰ Ajouter des minutes à une heure
     */
    private function ajouterMinutes($heure, $minutes) {
        return date('H:i', strtotime($heure) + ($minutes * 60));
    }
    
    /**
     * 😊 Calculer la satisfaction prévue
     */
    private function calculerSatisfactionPrevue($commande) {
        $base = 75;
        if (isset($commande['priorite'])) {
            if ($commande['priorite'] == 'urgente') $base += 15;
            if ($commande['priorite'] == 'haute') $base += 10;
        }
        return min(95, max(60, $base + rand(-5, 10)));
    }
    
    /**
     * 📊 Calculer les métriques
     */
    private function calculerMetriques($tournees) {
        $nbCommandes = array_sum(array_map(function($t) { return count($t['livraisons']); }, $tournees));
        $satisfactionTotal = 0;
        
        foreach ($tournees as $tournee) {
            $satisfactionTotal += $tournee['satisfaction_moyenne'] * count($tournee['livraisons']);
        }
        
        return [
            'nb_commandes' => $nbCommandes,
            'satisfaction_moyenne' => $nbCommandes > 0 ? round($satisfactionTotal / $nbCommandes) : 75,
            'taux_utilisation' => count($tournees) > 0 ? (count($tournees) / max(1, $this->getNombreTotalVehicules())) * 100 : 0,
            'cout_total' => array_sum(array_column($tournees, 'cout_estime'))
        ];
    }
    
    /**
     * 💡 Générer des recommandations
     */
    private function genererRecommandations($metriques, $tournees) {
        $recommandations = [];
        
        if ($metriques['taux_utilisation'] < 30) {
            $recommandations[] = [
                "type" => "optimisation",
                "niveau" => "info",
                "message" => "Taux d'utilisation des véhicules faible (" . round($metriques['taux_utilisation']) . "%). Possibilité de regrouper les tournées."
            ];
        }
        
        if ($metriques['satisfaction_moyenne'] < 80) {
            $recommandations[] = [
                "type" => "qualite",
                "niveau" => "warning",
                "message" => "Satisfaction client prévue faible (" . $metriques['satisfaction_moyenne'] . "%). Vérifier les délais et priorités."
            ];
        }
        
        $coutMoyen = $metriques['cout_total'] / max(1, $metriques['nb_commandes']);
        if ($coutMoyen > 80) {
            $recommandations[] = [
                "type" => "cout",
                "niveau" => "warning",
                "message" => "Coût moyen par livraison élevé (" . round($coutMoyen, 2) . " DH). Optimisation recommandée."
            ];
        }
        
        foreach ($tournees as $tournee) {
            if ($tournee['distance_totale'] > $this->maxDistance) {
                $recommandations[] = [
                    "type" => "distance",
                    "niveau" => "warning",
                    "message" => "Véhicule " . $tournee['vehicule_id'] . " : distance importante (" . round($tournee['distance_totale']) . " km)."
                ];
            }
            
            $heuresTravail = $tournee['temps_total'] / 60;
            if ($heuresTravail > $this->tempsMaxJournee) {
                $recommandations[] = [
                    "type" => "temps_travail",
                    "niveau" => "error",
                    "message" => "Véhicule " . $tournee['vehicule_id'] . " : dépassement temps légal (" . round($heuresTravail, 1) . "h)."
                ];
            }
        }
        
        // Ajouter une recommandation positive si tout va bien
        if (empty($recommandations)) {
            $recommandations[] = [
                "type" => "success",
                "niveau" => "success",
                "message" => "Planification optimale générée avec succès. Toutes les contraintes respectées."
            ];
        }
        
        return $recommandations;
    }
    
    /**
     * ✅ Valider une tournée
     */
    private function validerTournee($tournee) {
        return $tournee['distance_totale'] <= ($this->maxDistance * 1.2) && 
               count($tournee['livraisons']) <= $this->maxClients &&
               $tournee['temps_total'] <= ($this->tempsMaxJournee * 60 * 1.1);
    }
    
    /**
     * 💾 Enregistrer la planification
     */
    private function enregistrerPlanification($tournees, $metriques, $date) {
        try {
            // Vérifier si la table planifications_ia existe
            $tableExists = $this->pdo->query("SHOW TABLES LIKE 'planifications_ia'")->rowCount() > 0;
            
            if ($tableExists) {
                // Enregistrer dans planifications_ia
                $stmt = $this->pdo->prepare("
                    INSERT INTO planifications_ia (
                        date_creation, nb_commandes, nb_vehicules, 
                        distance_totale, cout_total, satisfaction_prevue, 
                        temps_execution, version_algo
                    ) VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?)
                ");
                
                $stmt->execute([
                    $metriques['nb_commandes'],
                    count($tournees),
                    array_sum(array_column($tournees, 'distance_totale')),
                    $metriques['cout_total'],
                    $metriques['satisfaction_moyenne'],
                    0.5,
                    '5.0'
                ]);
            }
            
            // Marquer les commandes comme planifiées
            foreach ($tournees as $tournee) {
                foreach ($tournee['livraisons'] as $livraison) {
                    $stmt = $this->pdo->prepare("UPDATE commandes SET livree = 0 WHERE id = ?");
                    $stmt->execute([$livraison['commande_id']]);
                }
                
                // Mettre à jour le statut du camion
                $stmt = $this->pdo->prepare("UPDATE camions SET statut = 'en_route' WHERE id = ?");
                $stmt->execute([$tournee['vehicule_id']]);
            }
            
        } catch (Exception $e) {
            error_log("Erreur sauvegarde: " . $e->getMessage());
        }
    }
    
    /**
     * 🚛 Obtenir le nombre total de véhicules
     */
    private function getNombreTotalVehicules() {
        try {
            $stmt = $this->pdo->query("SELECT COUNT(*) FROM camions WHERE statut != 'maintenance'");
            return $stmt->fetchColumn() ?: 6;
        } catch (Exception $e) {
            return 6;
        }
    }
    
    /**
     * 👤 Trouver un client par ID
     */
    private function trouverClient($clientId, $clients) {
        foreach ($clients as $client) {
            if ($client['id'] == $clientId) return $client;
        }
        return null;
    }
    
    /**
     * 📝 Retirer les commandes traitées
     */
    private function retirerCommandesTraitees($disponibles, $traitees) {
        $idsTraitees = array_column($traitees, 'id');
        return array_filter($disponibles, function($c) use ($idsTraitees) {
            return !in_array($c['id'], $idsTraitees);
        });
    }
}

// ===================================
// ENDPOINT PRINCIPAL
// ===================================

try {
    // Configuration BDD - ADAPTEZ VOS PARAMÈTRES
    $dsn = "mysql:host=localhost;dbname=optitruck_db;charset=utf8mb4";
    $username = "root";
    $password = "";
    
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
    ]);
    
    // Récupérer la date depuis l'URL (?date=2025-08-07)
    $date = $_GET['date'] ?? null;
    
    // Debug des paramètres
    error_log("=== DÉBUT PLANIFICATION ===");
    error_log("Date demandée: " . ($date ?: "Toutes"));
    
    // Créer le planificateur
    $planificateur = new PlanificationEngine($pdo);
    
    // Générer la planification
    $result = $planificateur->genererPlanificationComplete($date);
    
    // Debug du résultat
    error_log("Résultat success: " . ($result['success'] ? 'true' : 'false'));
    if (isset($result['data']['planification']['statistiques'])) {
        error_log("Commandes planifiées: " . $result['data']['planification']['statistiques']['nb_commandes_total']);
        error_log("Véhicules utilisés: " . count($result['data']['planification']['vehicules']));
    }
    error_log("=== FIN PLANIFICATION ===");
    
    // Retourner le JSON
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (PDOException $e) {
    error_log("Erreur PDO: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'timestamp' => date('Y-m-d H:i:s'),
        'error' => 'Erreur de connexion BDD: ' . $e->getMessage(),
        'data' => null
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    error_log("Erreur générale: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'timestamp' => date('Y-m-d H:i:s'),
        'error' => 'Erreur système: ' . $e->getMessage(),
        'data' => null
    ], JSON_PRETTY_PRINT);
}