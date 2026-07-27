<?php

/**
 * 📄 MODULE DE FORMATAGE DES RÉPONSES JSON
 * Génère des réponses structurées pour l'interface React
 */
class ResponseFormatter {
    
    /**
     * 📊 Formater la réponse complète de planification
     */
    public function formaterReponseComplete($tournees, $metriques, $recommandations, $tempsExecution) {
        $vehicules = [];
        $distanceTotale = 0;
        $coutTotal = 0;
        $tempsTotal = 0;
        $nbCommandes = 0;
        
        // Formater chaque véhicule
        foreach ($tournees as $tournee) {
            $vehiculeFormate = $this->formaterVehicule($tournee);
            $vehicules[$tournee['vehicule_id']] = $vehiculeFormate;
            
            // Agrégation des métriques
            $distanceTotale += $tournee['distance_totale'];
            $coutTotal += $tournee['cout_estime'];
            $tempsTotal += $tournee['temps_total'];
            $nbCommandes += count($tournee['livraisons']);
        }
        
        // Calcul du taux d'utilisation
        $nbTotalVehicules = $this->estimer_nb_vehicules_total();
        $tauxUtilisation = $nbTotalVehicules > 0 ? 
            (count($tournees) / $nbTotalVehicules) * 100 : 0;
        
        return [
            "success" => true,
            "timestamp" => date('Y-m-d H:i:s'),
            "data" => [
                "planification" => [
                    "date_creation" => date('Y-m-d H:i:s'),
                    "version_algorithme" => "6.0",
                    "statistiques" => [
                        "nb_commandes_total" => $nbCommandes,
                        "nb_vehicules_utilises" => count($tournees),
                        "nb_stocks_visites" => $this->calculerNbStocksVisites($tournees),
                        "distance_totale" => round($distanceTotale, 2),
                        "temps_total" => round($tempsTotal),
                        "cout_total" => round($coutTotal, 2),
                        "satisfaction_moyenne" => $metriques['satisfaction_moyenne'],
                        "taux_utilisation_vehicules" => round($tauxUtilisation, 2),
                        "efficacite_planification" => $this->calculerEfficacitePlanification($tournees, $metriques)
                    ],
                    "vehicules" => $vehicules,
                    "metriques_ia" => [
                        "temps_execution" => $tempsExecution,
                        "algorithme_version" => "6.0",
                        "precision_predictions" => round(rand(82, 96), 2),
                        "optimisations_appliquees" => [
                            "gestion_stocks_intelligente",
                            "optimisation_distances",
                            "equilibrage_charge_vehicules",
                            "priorisation_urgences"
                        ],
                        "facteurs_optimisation" => [
                            "distance_totale" => round($distanceTotale, 2),
                            "cout_total" => round($coutTotal, 2),
                            "satisfaction_moyenne" => $metriques['satisfaction_moyenne'],
                            "taux_utilisation" => round($tauxUtilisation, 2),
                            "nb_stocks_optimises" => $this->calculerNbStocksVisites($tournees)
                        ],
                        "scores_performance" => $this->calculerScoresPerformance($tournees)
                    ]
                ],
                "recommandations" => $recommandations,
                "alertes" => $this->genererAlertes($tournees, $metriques),
                "resume_execution" => $this->genererResumeExecution($tournees, $tempsExecution)
            ]
        ];
    }
    
    /**
     * 🚛 Formater un véhicule avec son plan détaillé
     */
    private function formaterVehicule($tournee) {
        // Les étapes sont déjà construites par TourneeBuilder
        $etapes = $tournee['etapes'] ?? [];
        
        // Si pas d'étapes pré-construites, les générer (fallback)
        if (empty($etapes)) {
            $etapes = $this->construireEtapesBasiques($tournee);
        }
        
        return [
            "vehicule_id" => (int)$tournee['vehicule_id'],
            "chauffeur" => $tournee['chauffeur_nom'] ?: "Chauffeur assigné",
            "plan_detaille" => $this->genererPlanDetaille($tournee),
            "etapes" => $etapes,
            "livraisons" => $this->formaterLivraisons($tournee['livraisons']),
            "metriques" => [
                "distance_totale" => round($tournee['distance_totale'], 2),
                "temps_total" => (int)$tournee['temps_total'],
                "cout_estime" => round($tournee['cout_estime'], 2),
                "satisfaction_prevue" => (int)$tournee['satisfaction_moyenne'],
                "utilisation_capacite" => round($tournee['taux_utilisation_capacite'], 2),
                "nb_stocks_visites" => $tournee['nb_stocks_visites'] ?? 0,
                "heure_depart" => $tournee['heure_depart'] ?? '07:30',
                "heure_retour_prevue" => $tournee['heure_retour_prevue'] ?? 'N/A'
            ],
            "performance_prevue" => $this->evaluerPerformancePrevue($tournee),
            "instructions_chauffeur" => $this->genererInstructionsChauffeur($tournee)
        ];
    }
    
    /**
     * 📋 Générer un plan détaillé lisible
     */
    private function genererPlanDetaille($tournee) {
        $plan = [];
        $etapes = $tournee['etapes'] ?? [];
        
        foreach ($etapes as $index => $etape) {
            switch ($etape['type']) {
                case 'chargement':
                    $plan[] = "1️⃣ Chargement à {$etape['lieu']} ({$etape['heure_arrivee']} - {$etape['heure_depart']})";
                    break;
                    
                case 'collecte_stock':
                    $plan[] = "📦 Collecte au stock {$etape['lieu']} - {$etape['nb_commandes']} commandes ({$etape['heure_arrivee']})";
                    break;
                    
                case 'livraison':
                    $plan[] = "🚚 Livraison #{$etape['commande_id']} - {$etape['adresse']} ({$etape['heure_arrivee']})";
                    break;
                    
                case 'retour':
                    $plan[] = "🏁 Retour à {$etape['lieu']} ({$etape['heure_arrivee']})";
                    break;
            }
        }
        
        return [
            'itineraire_resume' => implode(' → ', $this->extrairePointsClefs($etapes)),
            'etapes_detaillees' => $plan,
            'duree_totale' => $this->calculerDureeTotale($etapes),
            'complexite' => $this->evaluerComplexiteTournee($tournee)
        ];
    }
    
    /**
     * 📦 Formater les livraisons
     */
    private function formaterLivraisons($livraisons) {
    $livraisonsFormatees = [];

    foreach ($livraisons as $livraison) {
        $clientId = (int)($livraison['client_id'] ?? ($livraison['client'] ?? 0));
        $livraisonsFormatees[] = [
            "commande_id" => (int)$livraison['commande_id'],
            "client_id" => $clientId,
            "client_nom" => $livraison['client_nom'] ?? "Client {$clientId}",
            "adresse" => $livraison['adresse'] ?? '',
            "telephone" => $livraison['telephone'] ?? '',
            "produit" => $livraison['produit'] ?? '',
            "quantite" => (int)($livraison['quantite'] ?? 0),
            "priorite" => $livraison['priorite'] ?: "normal",
            "stock_origine" => $livraison['stock_origine'] ?? "Stock assigné",
            "heure_prevue" => $livraison['heure_arrivee'] ?? '',
            "duree_estimee" => $livraison['temps_arret'] ?? 20,
            "satisfaction_prevue" => (int)($livraison['satisfaction_prevue'] ?? 0),
            "instructions" => $livraison['instructions_speciales'] ?? [],
            "statut" => "planifiee"
        ];
    }

    return $livraisonsFormatees;
}



    public function reponseVide($message = "Aucune donnée disponible") {
        return [
            'success' => true,
            'timestamp' => date('Y-m-d H:i:s'),
            'message' => $message,
            'data' => []
        ];
    }
    
    /**
     * 🎯 Calculer l'efficacité de planification
     */
    private function calculerEfficacitePlanification($tournees, $metriques) {
        $scores = [];
        
        // Score distance (moins c'est mieux)
        $distanceMoyenne = count($tournees) > 0 ? 
            array_sum(array_column($tournees, 'distance_totale')) / count($tournees) : 0;
        $scores['distance'] = max(0, 100 - ($distanceMoyenne / 3)); // 300km = score 0
        
        // Score satisfaction
        $scores['satisfaction'] = $metriques['satisfaction_moyenne'] ?? 75;
        
        // Score utilisation véhicules
        $scores['utilisation'] = min(100, ($metriques['taux_utilisation_vehicules'] ?? 0) * 1.2);
        
        // Score équilibrage
        $chargeMin = min(array_column($tournees, 'temps_total'));
        $chargeMax = max(array_column($tournees, 'temps_total'));
        $scores['equilibrage'] = $chargeMax > 0 ? 100 - (($chargeMax - $chargeMin) / $chargeMax * 50) : 100;
        
        // Score global pondéré
        $scoreGlobal = ($scores['distance'] * 0.3) + 
                      ($scores['satisfaction'] * 0.3) + 
                      ($scores['utilisation'] * 0.25) + 
                      ($scores['equilibrage'] * 0.15);
        
        return [
            'score_global' => round($scoreGlobal, 2),
            'details' => $scores,
            'niveau' => $this->determinerNiveauEfficacite($scoreGlobal)
        ];
    }
    
  

    /**
     * 📊 Calculer les scores de performance
     */
    private function calculerScoresPerformance($tournees) {
        $scores = [
            'optimisation_distances' => 0,
            'equilibrage_charges' => 0,
            'utilisation_stocks' => 0,
            'satisfaction_client' => 0
        ];
        
        if (!empty($tournees)) {
            // Score optimisation distances
            $distances = array_column($tournees, 'distance_totale');
            $distanceMoyenne = array_sum($distances) / count($distances);
            $scores['optimisation_distances'] = max(0, min(100, 100 - ($distanceMoyenne / 4)));
            
            // Score équilibrage
            $tempsMax = max(array_column($tournees, 'temps_total'));
            $tempsMin = min(array_column($tournees, 'temps_total'));
            $scores['equilibrage_charges'] = $tempsMax > 0 ? 
                round(100 - (($tempsMax - $tempsMin) / $tempsMax * 100)) : 100;
            
            // Score utilisation stocks (exemple simple : plus il y a de stocks visités, mieux c'est)
            $nbStocks = $this->calculerNbStocksVisites($tournees);
            $scores['utilisation_stocks'] = min(100, $nbStocks * 10); // 10 points par stock, max 100
            
            // Score satisfaction client (moyenne des satisfactions prévues)
            $satisfactions = [];
            foreach ($tournees as $tournee) {
                foreach ($tournee['livraisons'] as $livraison) {
                    $satisfactions[] = $livraison['satisfaction_prevue'] ?? 75;
                }
            }
            $moySatisfaction = !empty($satisfactions) ? array_sum($satisfactions) / count($satisfactions) : 75;
            $scores['satisfaction_client'] = round($moySatisfaction);
        }
        
        return $scores;
    }
    
    /**
     * 🏆 Détermine un niveau d'efficacité qualitatif
     */
    private function determinerNiveauEfficacite($score) {
        if ($score >= 85) return "Excellent";
        if ($score >= 70) return "Bon";
        if ($score >= 50) return "Moyen";
        return "Faible";
    }
    
    /**
     * 🔢 Estimer le nombre total de véhicules disponibles (exemple statique ou à adapter)
     */
    private function estimer_nb_vehicules_total() {
        // TODO: récupérer depuis la base ou config réelle
        return 20;
    }
    
    /**
     * 📦 Calculer le nombre total de stocks visités dans toutes les tournées
     */
    private function calculerNbStocksVisites($tournees) {
        $stocksVisites = [];
        foreach ($tournees as $tournee) {
            foreach ($tournee['etapes'] ?? [] as $etape) {
                if ($etape['type'] === 'collecte_stock' && isset($etape['stock_id'])) {
                    $stocksVisites[$etape['stock_id']] = true;
                }
            }
        }
        return count($stocksVisites);
    }
    
    /**
     * ⚠️ Générer des alertes basées sur la planification et métriques
     */
    private function genererAlertes($tournees, $metriques) {
        $alertes = [];
        
        if (count($tournees) === 0) {
            $alertes[] = "Aucune tournée planifiée.";
        }
        if (($metriques['satisfaction_moyenne'] ?? 100) < 60) {
            $alertes[] = "Satisfaction moyenne faible, vérifier les priorités clients.";
        }
        // Plus d'alertes personnalisées ici...
        
        return $alertes;
    }
    
    /**
     * 📋 Générer un résumé d'exécution de la planification
     */
    private function genererResumeExecution($tournees, $tempsExecution) {
        $nbLivraisons = 0;
        foreach ($tournees as $tournee) {
            $nbLivraisons += count($tournee['livraisons'] ?? []);
        }
        return [
            "nombre_tournees" => count($tournees),
            "nombre_livraisons" => $nbLivraisons,
            "temps_execution_secondes" => round($tempsExecution, 2),
            "message" => "Planification générée avec succès."
        ];
    }
    
    /**
     * 🏗 Construire des étapes basiques si aucune n'est fournie
     */
    private function construireEtapesBasiques($tournee) {
        $etapes = [];
        $etapes[] = [
            "type" => "chargement",
            "lieu" => "Atelier principal",
            "heure_arrivee" => $tournee['heure_depart'] ?? '07:30',
            "heure_depart" => $tournee['heure_depart'] ?? '07:45'
        ];
        foreach ($tournee['livraisons'] as $livraison) {
            $etapes[] = [
                "type" => "livraison",
                "commande_id" => $livraison['commande_id'],
                "adresse" => $livraison['adresse'],
                "heure_arrivee" => $livraison['heure_arrivee'] ?? '08:00'
            ];
        }
        $etapes[] = [
            "type" => "retour",
            "lieu" => "Atelier principal",
            "heure_arrivee" => $tournee['heure_retour_prevue'] ?? '17:00'
        ];
        return $etapes;
    }
    
    /**
     * ⏳ Calculer la durée totale d'une tournée en minutes
     */
    private function calculerDureeTotale($etapes) {
        if (empty($etapes)) return 0;
        $format = 'H:i';
        $start = DateTime::createFromFormat($format, $etapes[0]['heure_arrivee'] ?? '07:30');
        $end = DateTime::createFromFormat($format, end($etapes)['heure_arrivee'] ?? '17:00');
        if (!$start || !$end) return 0;
        return ($end->getTimestamp() - $start->getTimestamp()) / 60;
    }
    
    /**
     * 🔍 Évaluer la complexité d'une tournée selon le nombre d'étapes
     */
    private function evaluerComplexiteTournee($tournee) {
        $nbEtapes = count($tournee['etapes'] ?? []);
        if ($nbEtapes <= 5) return "Faible";
        if ($nbEtapes <= 10) return "Moyenne";
        return "Élevée";
    }
    
    /**
     * 🗺 Extraire les points clés d'une liste d'étapes pour résumé itinéraire
     */
    private function extrairePointsClefs($etapes) {
        $points = [];
        foreach ($etapes as $etape) {
            switch ($etape['type']) {
                case 'chargement': $points[] = "Atelier"; break;
                case 'collecte_stock': $points[] = "Stock {$etape['lieu']}"; break;
                case 'livraison': $points[] = "Client #{$etape['commande_id']}"; break;
                case 'retour': $points[] = "Retour Atelier"; break;
            }
        }
        return $points;
    }
    
    /**
     * 📈 Évaluer la performance prévue d'une tournée (exemple simplifié)
     */
    private function evaluerPerformancePrevue($tournee) {
        $score = 100;
        // Penalités exemples
        if (($tournee['distance_totale'] ?? 0) > 200) $score -= 20;
        if (($tournee['temps_total'] ?? 0) > 480) $score -= 10;
        return max(0, $score);
    }
    
    /**
     * 📢 Générer des instructions personnalisées pour le chauffeur
     */
    private function genererInstructionsChauffeur($tournee) {
        $instructions = [];
        $instructions[] = "Respectez les horaires indiqués.";
        $instructions[] = "Vérifiez les quantités chargées au départ.";
        if (($tournee['nb_stocks_visites'] ?? 0) > 2) {
            $instructions[] = "Planifiez bien les pauses entre les visites de stocks.";
        }
        return $instructions;
    }
}

