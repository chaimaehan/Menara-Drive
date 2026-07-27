<?php

/**
 * 📊 MODULE DE CALCUL DE MÉTRIQUES AVANCÉES
 * Analyse et calcule toutes les métriques de performance de la planification
 */
class MetricsCalculator {
    
    /**
     * 📈 Calcul complet de toutes les métriques
     */
    public function calculerMetriquesCompletes($tournees, $donnees) {
        $startTime = microtime(true);
        
        $metriques = [
            // Métriques de base
            'nb_tournees' => count($tournees),
            'nb_commandes_total' => $this->compterCommandesTotales($tournees),
            'nb_vehicules_utilises' => count($tournees),
            'nb_vehicules_disponibles' => count($donnees['camions']),
            
            // Métriques de distance et temps
            'distance_totale' => $this->calculerDistanceTotale($tournees),
            'temps_total' => $this->calculerTempsTotalMinutes($tournees),
            'temps_moyen_par_tournee' => 0,
            'distance_moyenne_par_tournee' => 0,
            
            // Métriques de coût
            'cout_total' => 0,
            'cout_carburant' => 0,
            'cout_temps_chauffeur' => 0,
            'cout_moyen_par_commande' => 0,
            
            // Métriques de performance
            'taux_utilisation_vehicules' => 0,
            'satisfaction_moyenne' => 0,
            'efficacite_globale' => 0,
            'score_optimisation' => 0,
            
            // Métriques détaillées par tournée
            'details_tournees' => [],
            
            // Métriques de stocks
            'stocks_utilises' => $this->analyserStocksUtilises($tournees),
            'efficacite_stocks' => 0,
            
            // Métriques géographiques
            'zones_couvertes' => $this->analyserZonesCouvertes($tournees),
            'densite_livraisons' => 0,
            
            // Statistiques temporelles
            'repartition_horaires' => $this->analyserRepartitionHoraires($tournees),
            'temps_execution' => 0
        ];
        
        // Calculs des moyennes
        if ($metriques['nb_tournees'] > 0) {
            $metriques['temps_moyen_par_tournee'] = round($metriques['temps_total'] / $metriques['nb_tournees'], 1);
            $metriques['distance_moyenne_par_tournee'] = round($metriques['distance_totale'] / $metriques['nb_tournees'], 2);
        }
        
        // Calculs des coûts
        $metriques = $this->calculerCouts($metriques, $tournees);
        
        // Calculs de performance
        $metriques = $this->calculerPerformances($metriques, $tournees, $donnees);
        
        // Analyse détaillée par tournée
        $metriques['details_tournees'] = $this->analyserDetailsTournees($tournees);
        
        // Temps d'exécution
        $metriques['temps_execution'] = round((microtime(true) - $startTime) * 1000, 2);
        
        error_log("Métriques calculées en {$metriques['temps_execution']}ms");
        
        return $metriques;
    }
    
    /**
     * 🔢 Compter le total des commandes dans toutes les tournées
     */
    private function compterCommandesTotales($tournees) {
        $total = 0;
        foreach ($tournees as $tournee) {
            if (isset($tournee['livraisons'])) {
                $total += count($tournee['livraisons']);
            }
        }
        return $total;
    }
    
    /**
     * 📏 Calculer la distance totale de toutes les tournées
     */
    private function calculerDistanceTotale($tournees) {
        $total = 0;
        foreach ($tournees as $tournee) {
            $total += $tournee['distance_totale'] ?? 0;
        }
        return round($total, 2);
    }
    
    /**
     * ⏱️ Calculer le temps total en minutes
     */
    private function calculerTempsTotalMinutes($tournees) {
        $total = 0;
        foreach ($tournees as $tournee) {
            $total += $tournee['temps_total'] ?? 0;
        }
        return round($total, 1);
    }
    
    /**
     * 💰 Calculer tous les coûts
     */
    private function calculerCouts($metriques, $tournees) {
        $coutKmDefaut = 1.2; // €/km
        $coutHeureDefaut = 25; // €/heure
        
        foreach ($tournees as $tournee) {
            // Coût carburant basé sur la distance
            $distanceTournee = $tournee['distance_totale'] ?? 0;
            $metriques['cout_carburant'] += $distanceTournee * $coutKmDefaut;
            
            // Coût temps chauffeur
            $tempsTourneeHeures = ($tournee['temps_total'] ?? 0) / 60;
            $metriques['cout_temps_chauffeur'] += $tempsTourneeHeures * $coutHeureDefaut;
        }
        
        // Coût total
        $metriques['cout_total'] = $metriques['cout_carburant'] + $metriques['cout_temps_chauffeur'];
        
        // Coût moyen par commande
        if ($metriques['nb_commandes_total'] > 0) {
            $metriques['cout_moyen_par_commande'] = round($metriques['cout_total'] / $metriques['nb_commandes_total'], 2);
        }
        
        // Arrondir les coûts
        $metriques['cout_carburant'] = round($metriques['cout_carburant'], 2);
        $metriques['cout_temps_chauffeur'] = round($metriques['cout_temps_chauffeur'], 2);
        $metriques['cout_total'] = round($metriques['cout_total'], 2);
        
        return $metriques;
    }
    
    /**
     * 🎯 Calculer les métriques de performance
     */
    private function calculerPerformances($metriques, $tournees, $donnees) {
        // Taux d'utilisation des véhicules
        if ($metriques['nb_vehicules_disponibles'] > 0) {
            $metriques['taux_utilisation_vehicules'] = round(
                ($metriques['nb_vehicules_utilises'] / $metriques['nb_vehicules_disponibles']) * 100, 2
            );
        }
        
        // Satisfaction moyenne (basée sur les caractéristiques des tournées)
        $satisfactionTotale = 0;
        foreach ($tournees as $tournee) {
            $satisfaction = $this->calculerSatisfactionTournee($tournee);
            $satisfactionTotale += $satisfaction;
        }
        
        if (count($tournees) > 0) {
            $metriques['satisfaction_moyenne'] = round($satisfactionTotale / count($tournees), 1);
        }
        
        // Efficacité globale (combinaison de plusieurs facteurs)
        $metriques['efficacite_globale'] = $this->calculerEfficaciteGlobale($metriques, $tournees);
        
        // Score d'optimisation
        $metriques['score_optimisation'] = $this->calculerScoreOptimisation($metriques, $tournees);
        
        return $metriques;
    }
    
    /**
     * 😊 Calculer la satisfaction d'une tournée
     */
    private function calculerSatisfactionTournee($tournee) {
        $score = 85; // Score de base
        
        // Pénalités
        $distance = $tournee['distance_totale'] ?? 0;
        $temps = $tournee['temps_total'] ?? 0;
        $nbLivraisons = count($tournee['livraisons'] ?? []);
        
        // Pénalité distance excessive
        if ($distance > 300) {
            $score -= 15;
        } elseif ($distance > 200) {
            $score -= 10;
        } elseif ($distance > 100) {
            $score -= 5;
        }
        
        // Pénalité temps excessif
        if ($temps > 480) { // Plus de 8h
            $score -= 20;
        } elseif ($temps > 360) { // Plus de 6h
            $score -= 10;
        }
        
        // Bonus pour optimisation
        if ($nbLivraisons >= 3 && $distance < 150) {
            $score += 10; // Bonne densité
        }
        
        if ($nbLivraisons >= 4) {
            $score += 5; // Utilisation optimale
        }
        
        return max(0, min(100, $score));
    }
    
    /**
     * ⚡ Calculer l'efficacité globale
     */
    private function calculerEfficaciteGlobale($metriques, $tournees) {
        $score = 0;
        $poids = 0;
        
        // Utilisation des véhicules (30%)
        $score += ($metriques['taux_utilisation_vehicules'] / 100) * 30;
        $poids += 30;
        
        // Satisfaction moyenne (25%)
        $score += ($metriques['satisfaction_moyenne'] / 100) * 25;
        $poids += 25;
        
        // Ratio commandes/véhicule (20%)
        $ratioCommandes = $metriques['nb_vehicules_utilises'] > 0 ? 
            $metriques['nb_commandes_total'] / $metriques['nb_vehicules_utilises'] : 0;
        $scoreRatio = min(100, ($ratioCommandes / 4) * 100); // Optimal = 4 commandes/véhicule
        $score += ($scoreRatio / 100) * 20;
        $poids += 20;
        
        // Distance moyenne par tournée (15%)
        $distanceMoyenne = $metriques['distance_moyenne_par_tournee'];
        $scoreDistance = 100;
        if ($distanceMoyenne > 200) $scoreDistance = 60;
        elseif ($distanceMoyenne > 150) $scoreDistance = 75;
        elseif ($distanceMoyenne > 100) $scoreDistance = 90;
        
        $score += ($scoreDistance / 100) * 15;
        $poids += 15;
        
        // Temps moyen par tournée (10%)
        $tempsMoyen = $metriques['temps_moyen_par_tournee'];
        $scoreTemps = 100;
        if ($tempsMoyen > 480) $scoreTemps = 50; // Plus de 8h
        elseif ($tempsMoyen > 360) $scoreTemps = 75; // Plus de 6h
        elseif ($tempsMoyen > 240) $scoreTemps = 90; // Plus de 4h
        
        $score += ($scoreTemps / 100) * 10;
        $poids += 10;
        
        return round(($score / $poids) * 100, 1);
    }
    
    /**
     * 🏆 Calculer le score d'optimisation
     */
    private function calculerScoreOptimisation($metriques, $tournees) {
        $score = 0;
        
        // Critères d'optimisation
        $criteres = [
            'utilisation_vehicules' => [
                'valeur' => $metriques['taux_utilisation_vehicules'],
                'optimal' => 80,
                'poids' => 25
            ],
            'commandes_par_tournee' => [
                'valeur' => $metriques['nb_vehicules_utilises'] > 0 ? 
                    $metriques['nb_commandes_total'] / $metriques['nb_vehicules_utilises'] : 0,
                'optimal' => 4,
                'poids' => 20
            ],
            'distance_efficacite' => [
                'valeur' => $metriques['nb_commandes_total'] > 0 ? 
                    $metriques['distance_totale'] / $metriques['nb_commandes_total'] : 999,
                'optimal' => 25, // 25km par commande
                'poids' => 20,
                'inverse' => true // Plus c'est bas, mieux c'est
            ],
            'satisfaction' => [
                'valeur' => $metriques['satisfaction_moyenne'],
                'optimal' => 90,
                'poids' => 20
            ],
            'cout_efficacite' => [
                'valeur' => $metriques['cout_moyen_par_commande'],
                'optimal' => 50, // 50€ par commande
                'poids' => 15,
                'inverse' => true
            ]
        ];
        
        foreach ($criteres as $nom => $critere) {
            $valeur = $critere['valeur'];
            $optimal = $critere['optimal'];
            $poids = $critere['poids'];
            $inverse = $critere['inverse'] ?? false;
            
            if ($inverse) {
                // Pour les métriques où plus bas = mieux
                $scoreCritere = max(0, min(100, (($optimal / max($valeur, $optimal * 0.1)) * 100)));
            } else {
                // Pour les métriques où plus haut = mieux
                $ratio = $valeur / $optimal;
                if ($ratio > 1) {
                    $scoreCritere = max(50, 100 - (($ratio - 1) * 50)); // Pénalité si dépassement
                } else {
                    $scoreCritere = $ratio * 100;
                }
            }
            
            $score += $scoreCritere * ($poids / 100);
        }
        
        return round($score, 1);
    }
    
    /**
     * 📦 Analyser les stocks utilisés
     */
    private function analyserStocksUtilises($tournees) {
        $stocksUtilises = [];
        $quantitesTotales = [];
        
        foreach ($tournees as $tournee) {
            if (isset($tournee['collectes_stocks'])) {
                foreach ($tournee['collectes_stocks'] as $collecte) {
                    $stockId = $collecte['stock_id'];
                    $quantite = $collecte['quantite_collectee'] ?? 0;
                    
                    if (!isset($stocksUtilises[$stockId])) {
                        $stocksUtilises[$stockId] = [
                            'stock_id' => $stockId,
                            'nom' => $collecte['nom'] ?? 'Stock #' . $stockId,
                            'nb_tournees' => 0,
                            'quantite_totale' => 0,
                            'nb_collectes' => 0
                        ];
                    }
                    
                    $stocksUtilises[$stockId]['nb_tournees']++;
                    $stocksUtilises[$stockId]['quantite_totale'] += $quantite;
                    $stocksUtilises[$stockId]['nb_collectes']++;
                }
            }
        }
        
        return [
            'nb_stocks_utilises' => count($stocksUtilises),
            'details' => array_values($stocksUtilises),
            'utilisation_moyenne' => count($stocksUtilises) > 0 ? 
                round(array_sum(array_column($stocksUtilises, 'quantite_totale')) / count($stocksUtilises), 2) : 0
        ];
    }
    
    /**
     * 🗺️ Analyser les zones géographiques couvertes
     */
    private function analyserZonesCouvertes($tournees) {
        $zones = [
            'marrakech_centre' => 0,
            'marrakech_peripherie' => 0,
            'autres_villes' => 0,
            'total_points' => 0
        ];
        
        $centreMarrak = ['lat' => 31.6295, 'lng' => -7.9811];
        
        foreach ($tournees as $tournee) {
            if (isset($tournee['livraisons'])) {
                foreach ($tournee['livraisons'] as $livraison) {
                    $zones['total_points']++;
                    
                    if (isset($livraison['latitude']) && isset($livraison['longitude'])) {
                        $distance = $this->calculerDistance(
                            $centreMarrak['lat'], $centreMarrak['lng'],
                            $livraison['latitude'], $livraison['longitude']
                        );
                        
                        if ($distance <= 15) {
                            $zones['marrakech_centre']++;
                        } elseif ($distance <= 50) {
                            $zones['marrakech_peripherie']++;
                        } else {
                            $zones['autres_villes']++;
                        }
                    }
                }
            }
        }
        
        // Calculer les pourcentages
        if ($zones['total_points'] > 0) {
            $zones['pct_centre'] = round(($zones['casablanca_centre'] / $zones['total_points']) * 100, 1);
            $zones['pct_peripherie'] = round(($zones['casablanca_peripherie'] / $zones['total_points']) * 100, 1);
            $zones['pct_autres'] = round(($zones['autres_villes'] / $zones['total_points']) * 100, 1);
        } else {
            $zones['pct_centre'] = $zones['pct_peripherie'] = $zones['pct_autres'] = 0;
        }
        
        return $zones;
    }
    
    /**
     * ⏰ Analyser la répartition horaires
     */
    private function analyserRepartitionHoraires($tournees) {
        $repartition = [
            'matin' => 0,      // 7h-12h
            'apres_midi' => 0, // 12h-17h
            'soiree' => 0,     // 17h-20h
            'temps_moyen_debut' => '08:00',
            'temps_moyen_fin' => '17:00'
        ];
        
        $heuresDebut = [];
        $heuresFin = [];
        
        foreach ($tournees as $tournee) {
            $heureDebut = $tournee['heure_debut'] ?? '08:00';
            $heureFin = $tournee['heure_fin'] ?? '17:00';
            
            $heuresDebut[] = $heureDebut;
            $heuresFin[] = $heureFin;
            
            // Classer selon l'heure de début
            $heureDebutNum = (int)substr($heureDebut, 0, 2);
            
            if ($heureDebutNum >= 7 && $heureDebutNum < 12) {
                $repartition['matin']++;
            } elseif ($heureDebutNum >= 12 && $heureDebutNum < 17) {
                $repartition['apres_midi']++;
            } elseif ($heureDebutNum >= 17 && $heureDebutNum <= 20) {
                $repartition['soiree']++;
            }
        }
        
        return $repartition;
    }
    
    /**
     * 📋 Analyser les détails de chaque tournée
     */
    private function analyserDetailsTournees($tournees) {
        $details = [];
        
        foreach ($tournees as $index => $tournee) {
            $detail = [
                'index' => $index + 1,
                'vehicule_id' => $tournee['vehicule_id'] ?? null,
                'chauffeur' => $tournee['chauffeur'] ?? 'Non assigné',
                'nb_livraisons' => count($tournee['livraisons'] ?? []),
                'nb_collectes' => count($tournee['collectes_stocks'] ?? []),
                'distance_km' => round($tournee['distance_totale'] ?? 0, 2),
                'temps_minutes' => round($tournee['temps_total'] ?? 0, 1),
                'temps_heures' => round(($tournee['temps_total'] ?? 0) / 60, 2),
                'cout_estime' => round(
                    (($tournee['distance_totale'] ?? 0) * 1.2) + 
                    ((($tournee['temps_total'] ?? 0) / 60) * 25), 2
                ),
                'satisfaction_prevue' => $this->calculerSatisfactionTournee($tournee),
                'efficacite' => $this->calculerEfficaciteTournee($tournee),
                'priorites_traitees' => $this->analyserPrioritesTournee($tournee),
                'zone_principale' => $this->determinerZonePrincipaleTournee($tournee)
            ];
            
            $details[] = $detail;
        }
        
        return $details;
    }
    
    /**
     * ⚡ Calculer l'efficacité d'une tournée
     */
    private function calculerEfficaciteTournee($tournee) {
        $nbLivraisons = count($tournee['livraisons'] ?? []);
        $distance = $tournee['distance_totale'] ?? 0;
        $temps = $tournee['temps_total'] ?? 0;
        
        if ($nbLivraisons === 0) return 0;
        
        $score = 100;
        
        // Ratio distance/livraison
        $distanceParLivraison = $distance / $nbLivraisons;
        if ($distanceParLivraison > 50) $score -= 20;
        elseif ($distanceParLivraison > 30) $score -= 10;
        
        // Ratio temps/livraison
        $tempsParLivraison = $temps / $nbLivraisons;
        if ($tempsParLivraison > 120) $score -= 20; // Plus de 2h par livraison
        elseif ($tempsParLivraison > 90) $score -= 10; // Plus de 1h30
        
        // Bonus pour bonne utilisation
        if ($nbLivraisons >= 4 && $distance < 200) $score += 10;
        if ($nbLivraisons >= 3 && $temps < 480) $score += 5;
        
        return max(0, min(100, $score));
    }
    
    /**
     * 🎯 Analyser les priorités traitées dans une tournée
     */
    private function analyserPrioritesTournee($tournee) {
        $priorites = [
            'urgente' => 0,
            'haute' => 0,
            'normale' => 0
        ];
        
        if (isset($tournee['livraisons'])) {
            foreach ($tournee['livraisons'] as $livraison) {
                $priorite = strtolower($livraison['priorite'] ?? 'normale');
                if (isset($priorites[$priorite])) {
                    $priorites[$priorite]++;
                } else {
                    $priorites['normale']++;
                }
            }
        }
        
        return $priorites;
    }
    
    /**
     * 🗺️ Déterminer la zone principale d'une tournée
     */
    private function determinerZonePrincipaleTournee($tournee) {
        if (!isset($tournee['livraisons']) || empty($tournee['livraisons'])) {
            return 'Indéterminée';
        }
        
        $zones = ['centre' => 0, 'peripherie' => 0, 'autres' => 0];
        $centreMarrak = ['lat' => 33.5731, 'lng' => -7.5898];
        
        foreach ($tournee['livraisons'] as $livraison) {
            if (isset($livraison['latitude']) && isset($livraison['longitude'])) {
                $distance = $this->calculerDistance(
                   $centreMarrak['lat'], $centreMarrak['lng'],
                    $livraison['latitude'], $livraison['longitude']
                );
                
                if ($distance <= 15) {
                    $zones['centre']++;
                } elseif ($distance <= 50) {
                    $zones['peripherie']++;
                } else {
                    $zones['autres']++;
                }
            }
        }
        
        $zoneMax = array_search(max($zones), $zones);
        
        switch ($zoneMax) {
            case 'centre': return 'Casablanca Centre';
            case 'peripherie': return 'Casablanca Périphérie';
            case 'autres': return 'Autres Villes';
            default: return 'Mixte';
        }
    }
    
    /**
     * 📏 Calculer la distance entre deux points GPS
     */
    private function calculerDistance($lat1, $lng1, $lat2, $lng2) {
        if (!$lat1 || !$lng1 || !$lat2 || !$lng2) {
            return 9999;
        }
        
        $earthRadius = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        
        $a = sin($dLat/2) * sin($dLat/2) + 
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * 
             sin($dLng/2) * sin($dLng/2);
             
        return $earthRadius * 2 * atan2(sqrt($a), sqrt(1-$a));
    }
    
    /**
     * 💡 Générer des recommandations basées sur les métriques
     */
    public function genererRecommandations($metriques, $tournees, $config) {
        $recommandations = [
            'optimisations' => [],
            'alertes' => [],
            'suggestions' => [],
            'score_global' => $metriques['score_optimisation'],
            'niveau_priorite' => 'info'
        ];
        
        // Analyse du taux d'utilisation
        if ($metriques['taux_utilisation_vehicules'] < 50) {
            $recommandations['alertes'][] = [
                'type' => 'utilisation_faible',
                'message' => 'Taux d\'utilisation des véhicules faible (' . $metriques['taux_utilisation_vehicules'] . '%)',
                'suggestion' => 'Considérer la réduction du nombre de véhicules ou l\'augmentation des commandes'
            ];
        }
        
        // Analyse de l'efficacité
        if ($metriques['efficacite_globale'] < 70) {
            $recommandations['optimisations'][] = [
                'type' => 'efficacite',
                'message' => 'Efficacité globale perfectible (' . $metriques['efficacite_globale'] . '%)',
                'actions' => [
                    'Regrouper les livraisons par zone géographique',
                    'Optimiser les horaires de départ',
                    'Revoir l\'allocation des commandes aux véhicules'
                ]
            ];
        }
        
        // Analyse des coûts
        if ($metriques['cout_moyen_par_commande'] > 60) {
            $recommandations['alertes'][] = [
                'type' => 'cout_eleve',
                'message' => 'Coût moyen par commande élevé (' . $metriques['cout_moyen_par_commande'] . '€)',
                'suggestion' => 'Optimiser les itinéraires pour réduire les distances'
            ];
        }
        
        // Analyse de la satisfaction
        if ($metriques['satisfaction_moyenne'] < 80) {
            $recommandations['suggestions'][] = [
                'type' => 'satisfaction',
                'message' => 'Satisfaction prévue en dessous des objectifs',
                'recommandation' => 'Réduire les temps de trajet et améliorer la ponctualité'
            ];
        }
        
        // Analyse des tournées longues
        foreach ($metriques['details_tournees'] as $detail) {
            if ($detail['temps_heures'] > 8) {
                $recommandations['alertes'][] = [
                    'type' => 'tournee_longue',
                    'message' => 'Tournée #' . $detail['index'] . ' trop longue (' . $detail['temps_heures'] . 'h)',
                    'suggestion' => 'Diviser cette tournée ou réduire le nombre de livraisons'
                ];
            }
            
            if ($detail['distance_km'] > 300) {
                $recommandations['alertes'][] = [
                    'type' => 'distance_excessive',
                    'message' => 'Tournée #' . $detail['index'] . ' distance excessive (' . $detail['distance_km'] . 'km)',
                    'suggestion' => 'Optimiser l\'itinéraire ou utiliser des stocks plus proches'
                ];
            }
        }
        
        // Suggestions générales
        if ($metriques['nb_commandes_total'] > 0 && $metriques['nb_vehicules_utilises'] > 0) {
            $ratioCommandes = $metriques['nb_commandes_total'] / $metriques['nb_vehicules_utilises'];
            
            if ($ratioCommandes < 2) {
                $recommandations['suggestions'][] = [
                    'type' => 'consolidation',
                    'message' => 'Faible ratio commandes/véhicule (' . round($ratioCommandes, 1) . ')',
                    'recommandation' => 'Consolider les livraisons pour optimiser l\'utilisation des véhicules'
                ];
            }
        }
        
        // Déterminer le niveau de priorité global
        $nbAlertes = count($recommandations['alertes']);
        if ($nbAlertes >= 3) {
            $recommandations['niveau_priorite'] = 'critique';
        } elseif ($nbAlertes >= 1) {
            $recommandations['niveau_priorite'] = 'attention';
        } elseif ($metriques['score_optimisation'] < 75) {
            $recommandations['niveau_priorite'] = 'amelioration';
        }
        
        // Recommandations positives
        if ($metriques['score_optimisation'] >= 85) {
            $recommandations['suggestions'][] = [
                'type' => 'felicitations',
                'message' => 'Excellente optimisation! Score: ' . $metriques['score_optimisation'] . '/100',
                'recommandation' => 'Maintenir cette performance et surveiller les évolutions'
            ];
        }
        
        return $recommandations;
    }
    
    /**
     * 📈 Comparer avec les performances précédentes
     */
    public function comparerAvecHistorique($metriquesActuelles, $metriquesHistoriques = null) {
        if (!$metriquesHistoriques) {
            return [
                'disponible' => false,
                'message' => 'Aucun historique disponible pour la comparaison'
            ];
        }
        
        $comparaison = [
            'disponible' => true,
            'evolution' => [],
            'tendances' => [],
            'resume' => ''
        ];
        
        $metriquesComparees = [
            'efficacite_globale' => 'Efficacité globale',
            'cout_moyen_par_commande' => 'Coût moyen par commande',
            'satisfaction_moyenne' => 'Satisfaction moyenne',
            'taux_utilisation_vehicules' => 'Utilisation véhicules',
            'distance_moyenne_par_tournee' => 'Distance moyenne'
        ];
        
        foreach ($metriquesComparees as $cle => $libelle) {
            $actuel = $metriquesActuelles[$cle] ?? 0;
            $precedent = $metriquesHistoriques[$cle] ?? 0;
            
            if ($precedent > 0) {
                $evolution = (($actuel - $precedent) / $precedent) * 100;
                $comparaison['evolution'][$cle] = [
                    'libelle' => $libelle,
                    'actuel' => $actuel,
                    'precedent' => $precedent,
                    'evolution_pct' => round($evolution, 1),
                    'tendance' => $evolution > 5 ? 'hausse' : ($evolution < -5 ? 'baisse' : 'stable')
                ];
            }
        }
        
        return $comparaison;
    }
    
    /**
     * 📊 Générer un rapport détaillé des métriques
     */
    public function genererRapportDetaille($metriques, $tournees) {
        return [
            'resume_executif' => [
                'nb_tournees_planifiees' => $metriques['nb_tournees'],
                'commandes_traitees' => $metriques['nb_commandes_total'],
                'distance_totale_km' => $metriques['distance_totale'],
                'cout_total_estime' => $metriques['cout_total'],
                'efficacite_globale' => $metriques['efficacite_globale'],
                'score_optimisation' => $metriques['score_optimisation']
            ],
            
            'performance_vehicules' => [
                'taux_utilisation' => $metriques['taux_utilisation_vehicules'],
                'vehicules_utilises' => $metriques['nb_vehicules_utilises'],
                'vehicules_disponibles' => $metriques['nb_vehicules_disponibles'],
                'charge_moyenne' => $metriques['nb_vehicules_utilises'] > 0 ? 
                    round($metriques['nb_commandes_total'] / $metriques['nb_vehicules_utilises'], 1) : 0
            ],
            
            'analyse_couts' => [
                'cout_total' => $metriques['cout_total'],
                'cout_carburant' => $metriques['cout_carburant'],
                'cout_temps_chauffeur' => $metriques['cout_temps_chauffeur'],
                'cout_moyen_commande' => $metriques['cout_moyen_par_commande'],
                'repartition_couts' => [
                    'carburant_pct' => $metriques['cout_total'] > 0 ? 
                        round(($metriques['cout_carburant'] / $metriques['cout_total']) * 100, 1) : 0,
                    'main_oeuvre_pct' => $metriques['cout_total'] > 0 ? 
                        round(($metriques['cout_temps_chauffeur'] / $metriques['cout_total']) * 100, 1) : 0
                ]
            ],
            
            'analyse_geographique' => [
                'zones_couvertes' => $metriques['zones_couvertes'],
                'repartition_livraisons' => [
                    'centre_ville' => $metriques['zones_couvertes']['casablanca_centre'],
                    'peripherie' => $metriques['zones_couvertes']['casablanca_peripherie'],
                    'autres_villes' => $metriques['zones_couvertes']['autres_villes']
                ]
            ],
            
            'analyse_temporelle' => [
                'temps_total_heures' => round($metriques['temps_total'] / 60, 2),
                'temps_moyen_tournee' => round($metriques['temps_moyen_par_tournee'] / 60, 2),
                'repartition_horaires' => $metriques['repartition_horaires']
            ],
            
            'analyse_stocks' => $metriques['stocks_utilises'],
            
            'top_tournees' => [
                'plus_efficace' => $this->trouverTourneePlusEfficace($metriques['details_tournees']),
                'plus_longue_distance' => $this->trouverTourneePlusLongue($metriques['details_tournees'], 'distance_km'),
                'plus_longue_duree' => $this->trouverTourneePlusLongue($metriques['details_tournees'], 'temps_heures'),
                'plus_livraisons' => $this->trouverTourneePlusLivraisons($metriques['details_tournees'])
            ]
        ];
    }
    
    /**
     * 🏆 Trouver la tournée la plus efficace
     */
    private function trouverTourneePlusEfficace($detailsTournees) {
        if (empty($detailsTournees)) return null;
        
        $plusEfficace = null;
        $meilleurScore = 0;
        
        foreach ($detailsTournees as $tournee) {
            if ($tournee['efficacite'] > $meilleurScore) {
                $meilleurScore = $tournee['efficacite'];
                $plusEfficace = $tournee;
            }
        }
        
        return $plusEfficace;
    }
    
    /**
     * 📏 Trouver la tournée la plus longue (distance ou durée)
     */
    private function trouverTourneePlusLongue($detailsTournees, $critere) {
        if (empty($detailsTournees)) return null;
        
        $plusLongue = null;
        $valeurMax = 0;
        
        foreach ($detailsTournees as $tournee) {
            if ($tournee[$critere] > $valeurMax) {
                $valeurMax = $tournee[$critere];
                $plusLongue = $tournee;
            }
        }
        
        return $plusLongue;
    }
    
    /**
     * 📦 Trouver la tournée avec le plus de livraisons
     */
    private function trouverTourneePlusLivraisons($detailsTournees) {
        if (empty($detailsTournees)) return null;
        
        $plusChargee = null;
        $maxLivraisons = 0;
        
        foreach ($detailsTournees as $tournee) {
            if ($tournee['nb_livraisons'] > $maxLivraisons) {
                $maxLivraisons = $tournee['nb_livraisons'];
                $plusChargee = $tournee;
            }
        }
        
        return $plusChargee;
    }
    
    /**
     * 📋 Exporter les métriques au format CSV
     */
    public function exporterCSV($metriques, $fichier = null) {
        $fichier = $fichier ?: 'metriques_' . date('Y-m-d_H-i-s') . '.csv';
        
        $csv = [
            ['Métrique', 'Valeur', 'Unité'],
            ['Nombre de tournées', $metriques['nb_tournees'], 'unités'],
            ['Commandes traitées', $metriques['nb_commandes_total'], 'unités'],
            ['Distance totale', $metriques['distance_totale'], 'km'],
            ['Temps total', round($metriques['temps_total'] / 60, 2), 'heures'],
            ['Coût total', $metriques['cout_total'], '€'],
            ['Efficacité globale', $metriques['efficacite_globale'], '%'],
            ['Score optimisation', $metriques['score_optimisation'], '/100'],
            ['Taux utilisation véhicules', $metriques['taux_utilisation_vehicules'], '%'],
            ['Satisfaction moyenne', $metriques['satisfaction_moyenne'], '/100']
        ];
        
        return [
            'nom_fichier' => $fichier,
            'contenu_csv' => $csv,
            'nb_lignes' => count($csv)
        ];
    }
    
    /**
     * 🎯 Calculer des KPIs spécifiques métier
     */
    public function calculerKPIsMetier($metriques, $tournees) {
        return [
            'kpi_operationnel' => [
                'taux_completion_commandes' => 100, // Toutes les commandes planifiées sont complétées
                'ponctualite_prevue' => $this->estimerPonctualitePrevue($tournees),
                'flexibilite_planification' => $this->calculerFlexibilite($tournees),
                'robustesse_plan' => $this->evaluerRobustesse($metriques, $tournees)
            ],
            
            'kpi_financier' => [
                'rentabilite_par_km' => $metriques['distance_totale'] > 0 ? 
                    round($metriques['cout_total'] / $metriques['distance_totale'], 2) : 0,
                'productivite_chauffeur' => $metriques['nb_vehicules_utilises'] > 0 ? 
                    round($metriques['nb_commandes_total'] / $metriques['nb_vehicules_utilises'], 2) : 0,
                'roi_optimisation' => $this->calculerROIOptimisation($metriques)
            ],
            
            'kpi_service_client' => [
                'satisfaction_estimee' => $metriques['satisfaction_moyenne'],
                'delai_moyen_prevu' => $this->calculerDelaiMoyenPrevu($tournees),
                'fiabilite_service' => $this->evaluerFiabiliteService($metriques)
            ]
        ];
    }
    
    /**
     * ⏰ Estimer la ponctualité prévue
     */
    private function estimerPonctualitePrevue($tournees) {
        $score = 85; // Base optimiste
        
        foreach ($tournees as $tournee) {
            $temps = $tournee['temps_total'] ?? 0;
            $distance = $tournee['distance_totale'] ?? 0;
            
            // Pénalités pour risques de retard
            if ($temps > 480) $score -= 10; // Plus de 8h
            if ($distance > 300) $score -= 5; // Plus de 300km
            if (count($tournee['livraisons'] ?? []) > 5) $score -= 5; // Trop de stops
        }
        
        return max(60, min(100, $score));
    }
    
    /**
     * 🔄 Calculer la flexibilité de la planification
     */
    private function calculerFlexibilite($tournees) {
        $flexibilite = 80; // Base
        
        $nbTourneesComplexes = 0;
        foreach ($tournees as $tournee) {
            if (count($tournee['livraisons'] ?? []) > 4 || 
                ($tournee['temps_total'] ?? 0) > 420) {
                $nbTourneesComplexes++;
            }
        }
        
        if ($nbTourneesComplexes > count($tournees) / 2) {
            $flexibilite -= 20;
        }
        
        return max(40, min(100, $flexibilite));
    }
    
    /**
     * 🛡️ Évaluer la robustesse du plan
     */
    private function evaluerRobustesse($metriques, $tournees) {
        $score = 75;
        
        // Bonus pour diversification
        if ($metriques['stocks_utilises']['nb_stocks_utilises'] > 2) {
            $score += 10;
        }
        
        // Bonus pour équilibrage
        $ecartTypeCharge = $this->calculerEcartTypeCharge($tournees);
        if ($ecartTypeCharge < 1.5) {
            $score += 15;
        }
        
        return min(100, $score);
    }
    
    /**
     * 💰 Calculer le ROI de l'optimisation
     */
    private function calculerROIOptimisation($metriques) {
        // Estimation basée sur l'amélioration vs planification manuelle
        $gainEstime = $metriques['score_optimisation'] > 80 ? 15 : 
                     ($metriques['score_optimisation'] > 70 ? 10 : 5);
        
        return $gainEstime; // % d'économie estimée
    }
    
    /**
     * ⏱️ Calculer le délai moyen prévu
     */
    private function calculerDelaiMoyenPrevu($tournees) {
        $tempsTotal = 0;
        $nbLivraisons = 0;
        
        foreach ($tournees as $tournee) {
            $tempsTotal += $tournee['temps_total'] ?? 0;
            $nbLivraisons += count($tournee['livraisons'] ?? []);
        }
        
        return $nbLivraisons > 0 ? round($tempsTotal / $nbLivraisons, 1) : 0;
    }
    
    /**
     * 🔒 Évaluer la fiabilité du service
     */
    private function evaluerFiabiliteService($metriques) {
        $score = 0;
        
        $score += ($metriques['efficacite_globale'] / 100) * 40;
        $score += ($metriques['satisfaction_moyenne'] / 100) * 35;
        $score += ($metriques['score_optimisation'] / 100) * 25;
        
        return round($score, 1);
    }
    
    /**
     * 📊 Calculer l'écart-type de charge entre tournées
     */
    private function calculerEcartTypeCharge($tournees) {
        if (empty($tournees)) return 0;
        
        $charges = [];
        foreach ($tournees as $tournee) {
            $charges[] = count($tournee['livraisons'] ?? []);
        }
        
        $moyenne = array_sum($charges) / count($charges);
        $variances = array_map(function($charge) use ($moyenne) {
            return pow($charge - $moyenne, 2);
        }, $charges);
        
        $variance = array_sum($variances) / count($variances);
        return sqrt($variance);
    }
}