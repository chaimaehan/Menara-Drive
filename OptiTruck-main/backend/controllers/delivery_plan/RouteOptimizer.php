<?php

/**
 * 🗺️ MODULE D'OPTIMISATION INTELLIGENTE DES ROUTES
 * Utilise des algorithmes avancés pour optimiser les itinéraires de livraison
 */
class RouteOptimizer {
    private $config;
    private $cache = [];
    
    // Atelier principal (point de départ/arrivée)
    private $atelierPrincipal = [
        'latitude' => 33.5731,
        'longitude' => -7.5898,
        'nom' => 'Atelier Principal'
    ];
    
    public function __construct($config) {
        $this->config = $config;
    }
    
    /**
     * 🎯 FONCTION PRINCIPALE - Optimisation complète d'un itinéraire
     */
    public function optimiserItineraire($points, $contraintes = []) {
        $startTime = microtime(true);
        
        if (empty($points) || count($points) < 2) {
            return $this->creerItineraireVide();
        }
        
        error_log("Optimisation itinéraire pour " . count($points) . " points");
        
        try {
            // 1. Préparation des données
            $pointsAvecAtelier = $this->ajouterAtelierAuxPoints($points);
            
            // 2. Calcul de la matrice des distances
            $matriceDistances = $this->calculerMatriceDistances($pointsAvecAtelier);
            
            // 3. Optimisation selon la taille
            $itineraireOptimal = $this->choisirAlgorithmeOptimisation($pointsAvecAtelier, $matriceDistances, $contraintes);
            
            // 4. Calcul des métriques détaillées
            $metriques = $this->calculerMetriquesItineraire($itineraireOptimal, $matriceDistances);
            
            // 5. Validation des contraintes
            $itineraireValide = $this->validerContraintes($itineraireOptimal, $metriques, $contraintes);
            
            $tempsExecution = round((microtime(true) - $startTime) * 1000, 2);
            
            return [
                'success' => true,
                'itineraire' => $itineraireValide,
                'metriques' => $metriques,
                'algorithme_utilise' => $metriques['algorithme'],
                'temps_calcul_ms' => $tempsExecution,
                'optimisations_appliquees' => $metriques['optimisations']
            ];
            
        } catch (Exception $e) {
            error_log("Erreur optimisation: " . $e->getMessage());
            return $this->creerItineraireVide($e->getMessage());
        }
    }
    
    /**
     * 🧠 Choisir le meilleur algorithme selon la complexité
     */
    private function choisirAlgorithmeOptimisation($points, $matriceDistances, $contraintes) {
        $nbPoints = count($points);
        
        if ($nbPoints <= 3) {
            return $this->algorithmeSimple($points, $matriceDistances);
        } elseif ($nbPoints <= 6) {
            return $this->algorithmeNearestNeighbor($points, $matriceDistances, $contraintes);
        } elseif ($nbPoints <= 12) {
            return $this->algorithme2Opt($points, $matriceDistances, $contraintes);
        } else {
            return $this->algorithmeHybride($points, $matriceDistances, $contraintes);
        }
    }
    
    /**
     * 🔄 Algorithme simple pour peu de points
     */
    private function algorithmeSimple($points, $matriceDistances) {
        if (count($points) <= 2) {
            return $points;
        }
        
        // Pour 3 points : tester toutes les permutations
        $pointsSansAtelier = array_filter($points, function($p) {
            return $p['type'] !== 'atelier';
        });
        
        $meilleureDistance = PHP_FLOAT_MAX;
        $meilleurItineraire = [];
        
        $permutations = $this->genererPermutations(array_values($pointsSansAtelier));
        
        foreach ($permutations as $perm) {
            $itineraire = array_merge([0], array_keys($perm), [0]); // 0 = atelier
            $distance = $this->calculerDistanceTotaleItineraire($itineraire, $matriceDistances);
            
            if ($distance < $meilleureDistance) {
                $meilleureDistance = $distance;
                $meilleurItineraire = $this->construireItineraireDepuisIndices($itineraire, $points);
            }
        }
        
        return $meilleurItineraire ?: $points;
    }
    
    /**
     * 🎯 Algorithme du plus proche voisin amélioré
     */
    private function algorithmeNearestNeighbor($points, $matriceDistances, $contraintes) {
        $nbPoints = count($points);
        $atelierIndex = $this->trouverIndexAtelier($points);
        
        // Points à visiter (sans l'atelier)
        $aVisiter = [];
        for ($i = 0; $i < $nbPoints; $i++) {
            if ($i !== $atelierIndex) {
                $aVisiter[] = $i;
            }
        }
        
        // Essayer plusieurs points de départ pour trouver le meilleur
        $meilleurItineraire = [];
        $meilleureDistance = PHP_FLOAT_MAX;
        
        // Trier les points par priorité pour commencer par les plus urgents
        $pointsPriorites = $this->trierParPriorite($aVisiter, $points, $contraintes);
        $pointsDepart = array_slice($pointsPriorites, 0, min(3, count($pointsPriorites)));
        
        foreach ($pointsDepart as $premierPoint) {
            $itineraire = $this->construireItineraireNearestNeighbor($premierPoint, $aVisiter, $matriceDistances, $contraintes);
            $distance = $this->calculerDistanceTotaleItineraire($itineraire, $matriceDistances);
            
            if ($distance < $meilleureDistance) {
                $meilleureDistance = $distance;
                $meilleurItineraire = $itineraire;
            }
        }
        
        return $this->construireItineraireDepuisIndices($meilleurItineraire, $points);
    }
    
    /**
     * ⚡ Algorithme 2-Opt pour optimisation locale
     */
    private function algorithme2Opt($points, $matriceDistances, $contraintes) {
        // Commencer avec Nearest Neighbor
        $itineraireInitial = $this->algorithmeNearestNeighbor($points, $matriceDistances, $contraintes);
        $indices = $this->extraireIndicesItineraire($itineraireInitial, $points);
        
        $ameliore = true;
        $iterations = 0;
        $maxIterations = 50;
        
        while ($ameliore && $iterations < $maxIterations) {
            $ameliore = false;
            $iterations++;
            
            for ($i = 1; $i < count($indices) - 2; $i++) {
                for ($j = $i + 1; $j < count($indices) - 1; $j++) {
                    if ($j - $i === 1) continue; // Skip adjacent edges
                    
                    $nouvelItineraire = $this->echange2Opt($indices, $i, $j);
                    $nouvelleDistance = $this->calculerDistanceTotaleItineraire($nouvelItineraire, $matriceDistances);
                    $ancienneDistance = $this->calculerDistanceTotaleItineraire($indices, $matriceDistances);
                    
                    if ($nouvelleDistance < $ancienneDistance) {
                        $indices = $nouvelItineraire;
                        $ameliore = true;
                        error_log("2-Opt amélioration: {$ancienneDistance}km -> {$nouvelleDistance}km");
                    }
                }
            }
        }
        
        return $this->construireItineraireDepuisIndices($indices, $points);
    }
    
    /**
     * 🔀 Algorithme hybride pour grandes instances
     */
    private function algorithmeHybride($points, $matriceDistances, $contraintes) {
        // 1. Diviser en clusters géographiques
        $clusters = $this->diviserEnClusters($points, min(4, ceil(count($points) / 3)));
        
        if (count($clusters) <= 1) {
            return $this->algorithme2Opt($points, $matriceDistances, $contraintes);
        }
        
        // 2. Optimiser chaque cluster
        $itineraireGlobal = [$this->trouverIndexAtelier($points)];
        
        foreach ($clusters as $cluster) {
            if (empty($cluster)) continue;
            
            $pointsCluster = array_map(function($i) use ($points) {
                return $points[$i];
            }, $cluster);
            
            $pointsCluster[] = $points[$this->trouverIndexAtelier($points)]; // Ajouter atelier
            $matriceCluster = $this->calculerMatriceDistances($pointsCluster);
            
            $itineraireCluster = $this->algorithme2Opt($pointsCluster, $matriceCluster, $contraintes);
            
            // Retirer l'atelier et ajouter à l'itinéraire global
            foreach ($itineraireCluster as $point) {
                if ($point['type'] !== 'atelier') {
                    $indexOriginal = $this->trouverIndexPointDansListe($point, $points);
                    if ($indexOriginal !== -1 && !in_array($indexOriginal, $itineraireGlobal)) {
                        $itineraireGlobal[] = $indexOriginal;
                    }
                }
            }
        }
        
        $itineraireGlobal[] = $this->trouverIndexAtelier($points); // Retour atelier
        
        // 3. Appliquer 2-Opt sur l'itinéraire global
        $itineraireOptimise = $this->echange2OptGlobal($itineraireGlobal, $matriceDistances);
        
        return $this->construireItineraireDepuisIndices($itineraireOptimise, $points);
    }
    
    /**
     * 📊 Calcul de la matrice complète des distances
     */
    private function calculerMatriceDistances($points) {
        $cacheKey = md5(serialize(array_map(function($p) {
            return $p['latitude'] . ',' . $p['longitude'];
        }, $points)));
        
        if (isset($this->cache[$cacheKey])) {
            return $this->cache[$cacheKey];
        }
        
        $n = count($points);
        $matrice = array_fill(0, $n, array_fill(0, $n, 0));
        
        for ($i = 0; $i < $n; $i++) {
            for ($j = $i + 1; $j < $n; $j++) {
                $distance = $this->calculerDistance(
                    $points[$i]['latitude'], $points[$i]['longitude'],
                    $points[$j]['latitude'], $points[$j]['longitude']
                );
                $matrice[$i][$j] = $distance;
                $matrice[$j][$i] = $distance; // Symétrique
            }
        }
        
        $this->cache[$cacheKey] = $matrice;
        return $matrice;
    }
    
    /**
     * 🎯 Construction itinéraire Nearest Neighbor
     */
    private function construireItineraireNearestNeighbor($premierPoint, $aVisiter, $matriceDistances, $contraintes) {
        $atelierIndex = 0; // L'atelier est toujours à l'index 0
        $itineraire = [$atelierIndex, $premierPoint];
        $visite = [$premierPoint];
        $pointCourant = $premierPoint;
        
        while (count($visite) < count($aVisiter)) {
            $plusProche = -1;
            $distanceMin = PHP_FLOAT_MAX;
            
            foreach ($aVisiter as $point) {
                if (in_array($point, $visite)) continue;
                
                $distance = $matriceDistances[$pointCourant][$point];
                
                // Appliquer les contraintes de priorité
                $bonus = $this->calculerBonusPriorite($point, $contraintes);
                $score = $distance - $bonus;
                
                if ($score < $distanceMin) {
                    $distanceMin = $score;
                    $plusProche = $point;
                }
            }
            
            if ($plusProche !== -1) {
                $itineraire[] = $plusProche;
                $visite[] = $plusProche;
                $pointCourant = $plusProche;
            } else {
                break;
            }
        }
        
        $itineraire[] = $atelierIndex; // Retour à l'atelier
        return $itineraire;
    }
    
    /**
     * 🔄 Échange 2-Opt
     */
    private function echange2Opt($itineraire, $i, $j) {
        $nouveau = array_slice($itineraire, 0, $i);
        $segment = array_slice($itineraire, $i, $j - $i + 1);
        $nouveau = array_merge($nouveau, array_reverse($segment));
        $nouveau = array_merge($nouveau, array_slice($itineraire, $j + 1));
        
        return $nouveau;
    }
    
    /**
     * 🗂️ Division en clusters géographiques
     */
    private function diviserEnClusters($points, $nbClusters) {
        if (count($points) <= $nbClusters) {
            return [array_keys($points)];
        }
        
        // Utiliser K-means simplifié
        $pointsSansAtelier = [];
        foreach ($points as $i => $point) {
            if ($point['type'] !== 'atelier') {
                $pointsSansAtelier[$i] = $point;
            }
        }
        
        if (empty($pointsSansAtelier)) {
            return [];
        }
        
        // Initialiser les centres de clusters
        $centres = [];
        $indices = array_keys($pointsSansAtelier);
        for ($i = 0; $i < $nbClusters; $i++) {
            $centres[] = $pointsSansAtelier[$indices[array_rand($indices)]];
        }
        
        // Attribution aux clusters
        $clusters = array_fill(0, $nbClusters, []);
        
        foreach ($pointsSansAtelier as $index => $point) {
            $clusterMin = 0;
            $distanceMin = PHP_FLOAT_MAX;
            
            foreach ($centres as $c => $centre) {
                $distance = $this->calculerDistance(
                    $point['latitude'], $point['longitude'],
                    $centre['latitude'], $centre['longitude']
                );
                
                if ($distance < $distanceMin) {
                    $distanceMin = $distance;
                    $clusterMin = $c;
                }
            }
            
            $clusters[$clusterMin][] = $index;
        }
        
        return array_filter($clusters); // Retirer les clusters vides
    }
    
    /**
     * 📏 Calcul de distance entre deux points GPS
     */
    private function calculerDistance($lat1, $lng1, $lat2, $lng2) {
        if (!$lat1 || !$lng1 || !$lat2 || !$lng2) {
            return 9999;
        }
        
        $earthRadius = 6371; // km
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        
        $a = sin($dLat/2) * sin($dLat/2) + 
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * 
             sin($dLng/2) * sin($dLng/2);
             
        return round($earthRadius * 2 * atan2(sqrt($a), sqrt(1-$a)), 2);
    }
    
    /**
     * 📊 Calcul des métriques complètes
     */
    private function calculerMetriquesItineraire($itineraire, $matriceDistances) {
        $distanceTotale = 0;
        $tempsTotal = 0; // minutes
        $nbArrets = count($itineraire) - 2; // Sans compter l'atelier début/fin
        
        // Calcul distance et temps de trajet
        for ($i = 0; $i < count($itineraire) - 1; $i++) {
            $indexCourant = $this->trouverIndexPointDansMatrice($itineraire[$i]);
            $indexSuivant = $this->trouverIndexPointDansMatrice($itineraire[$i + 1]);
            
            if ($indexCourant !== -1 && $indexSuivant !== -1 && isset($matriceDistances[$indexCourant][$indexSuivant])) {
                $distance = $matriceDistances[$indexCourant][$indexSuivant];
                $distanceTotale += $distance;
                $tempsTotal += $this->calculerTempsTrajet($distance);
            }
        }
        
        // Temps d'arrêts
        $tempsArrets = $nbArrets * ($this->config['tempsLivraison'] ?? 20);
        $tempsTotal += $tempsArrets;
        
        // Temps de chargement initial
        $tempsChargement = $this->config['tempsChargement'] ?? 15;
        $tempsTotal += $tempsChargement;
        
        return [
            'distance_totale_km' => round($distanceTotale, 2),
            'temps_total_minutes' => round($tempsTotal, 2),
            'temps_trajet_minutes' => round($tempsTotal - $tempsArrets - $tempsChargement, 2),
            'temps_arrets_minutes' => $tempsArrets,
            'temps_chargement_minutes' => $tempsChargement,
            'nb_arrets' => $nbArrets,
            'cout_estime' => round($distanceTotale * ($this->config['coutKm'] ?? 1.2), 2),
            'efficacite_score' => $this->calculerScoreEfficacite($distanceTotale, $tempsTotal, $nbArrets),
            'algorithme' => $this->determinerAlgorithmeUtilise($nbArrets),
            'optimisations' => $this->listerOptimisationsAppliquees($nbArrets),
            'contraintes_respectees' => true
        ];
    }
    
    /**
     * ⏱️ Calcul du temps de trajet basé sur la distance
     */
    private function calculerTempsTrajet($distanceKm) {
        $vitesseMoyenne = $this->config['vitesseMoyenne'] ?? 60; // km/h
        return round(($distanceKm / $vitesseMoyenne) * 60, 2); // minutes
    }
    
    /**
     * 🏆 Calcul du score d'efficacité
     */
    private function calculerScoreEfficacite($distance, $temps, $nbArrets) {
        if ($nbArrets <= 1) return 50;
        
        $distanceMoyenneParArret = $distance / $nbArrets;
        $tempsMoyenParArret = $temps / $nbArrets;
        
        $score = 100;
        
        // Pénalité pour distances excessives
        if ($distanceMoyenneParArret > 50) $score -= 20;
        elseif ($distanceMoyenneParArret > 30) $score -= 10;
        
        // Pénalité pour temps excessif
        if ($tempsMoyenParArret > 60) $score -= 20;
        elseif ($tempsMoyenParArret > 45) $score -= 10;
        
        // Bonus pour optimisation
        if ($nbArrets > 2 && $distanceMoyenneParArret < 20) $score += 10;
        if ($nbArrets > 3 && $tempsMoyenParArret < 30) $score += 10;
        
        return max(0, min(100, $score));
    }
    
    /**
     * ✅ Validation des contraintes
     */
    private function validerContraintes($itineraire, $metriques, $contraintes) {
        $violations = [];
        
        // Distance maximale
        if (isset($contraintes['maxDistance']) && $metriques['distance_totale_km'] > $contraintes['maxDistance']) {
            $violations[] = "Distance dépassée: {$metriques['distance_totale_km']}km > {$contraintes['maxDistance']}km";
        }
        
        // Temps maximal
        $tempsMaxMinutes = ($this->config['tempsMaxJournee'] ?? 8) * 60;
        if ($metriques['temps_total_minutes'] > $tempsMaxMinutes) {
            $violations[] = "Temps dépassé: {$metriques['temps_total_minutes']}min > {$tempsMaxMinutes}min";
        }
        
        // Nombre maximum de clients
        if (isset($contraintes['maxClients']) && $metriques['nb_arrets'] > $contraintes['maxClients']) {
            $violations[] = "Trop de clients: {$metriques['nb_arrets']} > {$contraintes['maxClients']}";
        }
        
        if (!empty($violations)) {
            error_log("Violations contraintes: " . implode(', ', $violations));
            // Essayer de corriger automatiquement
            return $this->corrigerItineraire($itineraire, $violations);
        }
        
        return $itineraire;
    }
    
    /**
     * 🔧 Fonctions utilitaires
     */
    private function ajouterAtelierAuxPoints($points) {
        $atelierPresent = false;
        foreach ($points as $point) {
            if (isset($point['type']) && $point['type'] === 'atelier') {
                $atelierPresent = true;
                break;
            }
        }
        
        if (!$atelierPresent) {
            array_unshift($points, array_merge($this->atelierPrincipal, ['type' => 'atelier']));
        }
        
        return $points;
    }
    
    private function trouverIndexAtelier($points) {
        foreach ($points as $i => $point) {
            if (isset($point['type']) && $point['type'] === 'atelier') {
                return $i;
            }
        }
        return 0; // Par défaut le premier
    }
    
    private function trierParPriorite($indices, $points, $contraintes) {
        usort($indices, function($a, $b) use ($points, $contraintes) {
            $prioriteA = $this->calculerBonusPriorite($a, $contraintes);
            $prioriteB = $this->calculerBonusPriorite($b, $contraintes);
            return $prioriteB <=> $prioriteA;
        });
        
        return $indices;
    }
    
    private function calculerBonusPriorite($index, $contraintes) {
        $bonus = 0;
        
        if (isset($contraintes['priorites']) && isset($contraintes['priorites'][$index])) {
            $priorite = $contraintes['priorites'][$index];
            switch (strtolower($priorite)) {
                case 'urgente': $bonus = 50; break;
                case 'élevée': $bonus = 30; break;
                case 'normal': $bonus = 10; break;
            }
        }
        
        return $bonus;
    }
    
    private function calculerDistanceTotaleItineraire($indices, $matriceDistances) {
        $total = 0;
        for ($i = 0; $i < count($indices) - 1; $i++) {
            if (isset($matriceDistances[$indices[$i]][$indices[$i + 1]])) {
                $total += $matriceDistances[$indices[$i]][$indices[$i + 1]];
            }
        }
        return $total;
    }
    
    private function construireItineraireDepuisIndices($indices, $points) {
        return array_map(function($i) use ($points) {
            return $points[$i];
        }, $indices);
    }
    
    private function extraireIndicesItineraire($itineraire, $points) {
        $indices = [];
        foreach ($itineraire as $point) {
            $index = $this->trouverIndexPointDansListe($point, $points);
            if ($index !== -1) {
                $indices[] = $index;
            }
        }
        return $indices;
    }
    
    private function trouverIndexPointDansListe($point, $points) {
        foreach ($points as $i => $p) {
            if ($p['latitude'] == $point['latitude'] && $p['longitude'] == $point['longitude']) {
                return $i;
            }
        }
        return -1;
    }
    
    private function trouverIndexPointDansMatrice($point) {
        if (isset($point['matrix_index'])) {
            return $point['matrix_index'];
        }
        return 0; // Par défaut
    }
    
    private function genererPermutations($arr) {
        if (count($arr) <= 1) {
            return [$arr];
        }
        
        $result = [];
        foreach ($arr as $i => $element) {
            $remaining = array_merge(array_slice($arr, 0, $i), array_slice($arr, $i + 1));
            foreach ($this->genererPermutations($remaining) as $perm) {
                $result[] = array_merge([$element], $perm);
            }
        }
        
        return array_slice($result, 0, 24); // Limiter à 24 permutations max
    }
    
    private function determinerAlgorithmeUtilise($nbArrets) {
        if ($nbArrets <= 3) return 'Énumération complète';
        elseif ($nbArrets <= 6) return 'Plus proche voisin';
        elseif ($nbArrets <= 12) return '2-Opt';
        else return 'Hybride (Clustering + 2-Opt)';
    }
    
    private function listerOptimisationsAppliquees($nbArrets) {
        $optimisations = ['Calcul matrice distances'];
        
        if ($nbArrets > 3) $optimisations[] = 'Plus proche voisin multiple';
        if ($nbArrets > 6) $optimisations[] = 'Amélioration 2-Opt';
        if ($nbArrets > 12) $optimisations[] = 'Clustering géographique';
        
        $optimisations[] = 'Validation contraintes';
        
        return $optimisations;
    }
    
    private function echange2OptGlobal($itineraire, $matriceDistances) {
        // Version simplifiée de 2-Opt pour les gros itinéraires
        $ameliore = true;
        $iterations = 0;
        
        while ($ameliore && $iterations < 20) {
            $ameliore = false;
            $iterations++;
            
            for ($i = 1; $i < count($itineraire) - 2; $i += 2) { // Pas de 2 pour réduire
                for ($j = $i + 2; $j < count($itineraire) - 1; $j += 2) {
                    $nouveau = $this->echange2Opt($itineraire, $i, $j);
                    
                    if ($this->calculerDistanceTotaleItineraire($nouveau, $matriceDistances) < 
                        $this->calculerDistanceTotaleItineraire($itineraire, $matriceDistances)) {
                        $itineraire = $nouveau;
                        $ameliore = true;
                        break 2; // Sortir des deux boucles
                    }
                }
            }
        }
        
        return $itineraire;
    }
    
    private function corrigerItineraire($itineraire, $violations) {
        // Tentative de correction simple : retirer les points les plus éloignés
        if (count($itineraire) <= 3) {
            return $itineraire; // Ne pas corriger si trop peu de points
        }
        
        error_log("Tentative de correction de l'itinéraire");
        
        // Retirer le dernier point (sauf atelier) et réessayer
        $itineraireCorrige = [];
        $atelierFin = null;
        
        foreach ($itineraire as $i => $point) {
            if ($i === count($itineraire) - 1 && isset($point['type']) && $point['type'] === 'atelier') {
                $atelierFin = $point;
            } elseif ($i < count($itineraire) - 2) { // Garder tous sauf l'avant-dernier
                $itineraireCorrige[] = $point;
            }
        }
        
        if ($atelierFin) {
            $itineraireCorrige[] = $atelierFin;
        }
        
        return $itineraireCorrige;
    }
    
    private function creerItineraireVide($erreur = null) {
        return [
            'success' => false,
            'itineraire' => [],
            'metriques' => [
                'distance_totale_km' => 0,
                'temps_total_minutes' => 0,
                'nb_arrets' => 0,
                'cout_estime' => 0,
                'efficacite_score' => 0,
                'algorithme' => 'Aucun',
                'optimisations' => [],
                'contraintes_respectees' => false
            ],
            'algorithme_utilise' => 'Aucun',
            'temps_calcul_ms' => 0,
            'optimisations_appliquees' => [],
            'erreur' => $erreur
        ];
    }
    
    /**
     * 🎯 Optimisation d'itinéraires multiples (pour plusieurs camions)
     */
    public function optimiserItinerairesMultiples($groupesPoints, $contraintes = []) {
        $startTime = microtime(true);
        $resultats = [];
        
        error_log("Optimisation de " . count($groupesPoints) . " itinéraires multiples");
        
        foreach ($groupesPoints as $index => $points) {
            $contrainteGroupe = $contraintes[$index] ?? [];
            $resultat = $this->optimiserItineraire($points, $contrainteGroupe);
            $resultat['groupe_id'] = $index;
            $resultats[] = $resultat;
        }
        
        // Optimisation globale : équilibrage des charges
        $resultatsOptimises = $this->equilibrerCharges($resultats);
        
        $tempsTotal = round((microtime(true) - $startTime) * 1000, 2);
        
        return [
            'success' => true,
            'itineraires' => $resultatsOptimises,
            'statistiques_globales' => $this->calculerStatistiquesGlobales($resultatsOptimises),
            'temps_calcul_total_ms' => $tempsTotal,
            'optimisations_globales' => $this->appliquerOptimisationsGlobales($resultatsOptimises)
        ];
    }
    
    /**
     * ⚖️ Équilibrage des charges entre véhicules
     */
    private function equilibrerCharges($resultats) {
        if (count($resultats) < 2) {
            return $resultats;
        }
        
        // Calculer les métriques de déséquilibre
        $distances = array_column(array_column($resultats, 'metriques'), 'distance_totale_km');
        $temps = array_column(array_column($resultats, 'metriques'), 'temps_total_minutes');
        
        $distanceMoyenne = array_sum($distances) / count($distances);
        $tempsMoyen = array_sum($temps) / count($temps);
        
        $seuil = 0.3; // 30% d'écart maximum toléré
        
        // Identifier les itinéraires déséquilibrés
        $surcharges = [];
        $sousCharges = [];
        
        foreach ($resultats as $i => $resultat) {
            $distance = $resultat['metriques']['distance_totale_km'];
            $tempsTotal = $resultat['metriques']['temps_total_minutes'];
            
            if ($distance > $distanceMoyenne * (1 + $seuil) || $tempsTotal > $tempsMoyen * (1 + $seuil)) {
                $surcharges[] = $i;
            } elseif ($distance < $distanceMoyenne * (1 - $seuil) && $tempsTotal < $tempsMoyen * (1 - $seuil)) {
                $sousCharges[] = $i;
            }
        }
        
        // Tentative de rééquilibrage simple
        if (!empty($surcharges) && !empty($sousCharges)) {
            error_log("Rééquilibrage détecté: " . count($surcharges) . " surcharges, " . count($sousCharges) . " sous-charges");
            
            foreach ($surcharges as $surcharge) {
                if (count($resultats[$surcharge]['itineraire']) > 3) { // Au moins 3 points (atelier + 1 client + atelier)
                    // Proposer des recommandations plutôt que modifier automatiquement
                    $resultats[$surcharge]['recommandations_equilibrage'] = [
                        'type' => 'surcharge_detectee',
                        'suggestion' => 'Considérer diviser cette tournée',
                        'points_excessifs' => max(0, count($resultats[$surcharge]['itineraire']) - 4)
                    ];
                }
            }
            
            foreach ($sousCharges as $sousCharge) {
                $resultats[$sousCharge]['recommandations_equilibrage'] = [
                    'type' => 'sous_charge_detectee',
                    'suggestion' => 'Peut accepter plus de livraisons',
                    'capacite_supplementaire' => round($distanceMoyenne - $resultats[$sousCharge]['metriques']['distance_totale_km'], 1)
                ];
            }
        }
        
        return $resultats;
    }
    
    /**
     * 📊 Calcul des statistiques globales
     */
    private function calculerStatistiquesGlobales($resultats) {
        $distances = [];
        $temps = [];
        $couts = [];
        $nbArrets = [];
        $efficacites = [];
        
        foreach ($resultats as $resultat) {
            if ($resultat['success'] && !empty($resultat['metriques'])) {
                $distances[] = $resultat['metriques']['distance_totale_km'];
                $temps[] = $resultat['metriques']['temps_total_minutes'];
                $couts[] = $resultat['metriques']['cout_estime'];
                $nbArrets[] = $resultat['metriques']['nb_arrets'];
                $efficacites[] = $resultat['metriques']['efficacite_score'];
            }
        }
        
        return [
            'nb_itineraires' => count($resultats),
            'nb_itineraires_reussis' => count(array_filter($resultats, function($r) { return $r['success']; })),
            'distance_totale_km' => round(array_sum($distances), 2),
            'distance_moyenne_km' => round(array_sum($distances) / max(1, count($distances)), 2),
            'temps_total_minutes' => round(array_sum($temps), 2),
            'temps_moyen_minutes' => round(array_sum($temps) / max(1, count($temps)), 2),
            'cout_total_estime' => round(array_sum($couts), 2),
            'nb_arrets_total' => array_sum($nbArrets),
            'efficacite_moyenne' => round(array_sum($efficacites) / max(1, count($efficacites)), 2),
            'repartition' => [
                'distance_min_km' => !empty($distances) ? round(min($distances), 2) : 0,
                'distance_max_km' => !empty($distances) ? round(max($distances), 2) : 0,
                'temps_min_minutes' => !empty($temps) ? round(min($temps), 2) : 0,
                'temps_max_minutes' => !empty($temps) ? round(max($temps), 2) : 0,
                'ecart_type_distance' => !empty($distances) ? round($this->calculerEcartType($distances), 2) : 0,
                'coefficient_variation' => !empty($distances) && array_sum($distances) > 0 ? 
                    round(($this->calculerEcartType($distances) / (array_sum($distances) / count($distances))) * 100, 2) : 0
            ]
        ];
    }
    
    /**
     * 🎯 Application d'optimisations globales
     */
    private function appliquerOptimisationsGlobales($resultats) {
        $optimisations = [];
        
        // Analyse de la répartition géographique
        $optimisations[] = $this->analyserRepartitionGeographique($resultats);
        
        // Détection de croisements d'itinéraires
        $optimisations[] = $this->detecterCroisements($resultats);
        
        // Recommandations d'amélioration
        $optimisations[] = $this->genererRecommandationsAmelioration($resultats);
        
        return array_filter($optimisations);
    }
    
    /**
     * 🗺️ Analyse de la répartition géographique
     */
    private function analyserRepartitionGeographique($resultats) {
        $zones = [];
        
        foreach ($resultats as $i => $resultat) {
            if (!$resultat['success']) continue;
            
            $centroide = $this->calculerCentroide($resultat['itineraire']);
            $zones[] = [
                'itineraire_id' => $i,
                'centroide' => $centroide,
                'rayon_moyen' => $this->calculerRayonMoyen($resultat['itineraire'], $centroide)
            ];
        }
        
        // Détecter les zones qui se chevauchent
        $chevauchements = [];
        for ($i = 0; $i < count($zones); $i++) {
            for ($j = $i + 1; $j < count($zones); $j++) {
                $distance = $this->calculerDistance(
                    $zones[$i]['centroide']['latitude'], $zones[$i]['centroide']['longitude'],
                    $zones[$j]['centroide']['latitude'], $zones[$j]['centroide']['longitude']
                );
                
                $rayonCombine = $zones[$i]['rayon_moyen'] + $zones[$j]['rayon_moyen'];
                
                if ($distance < $rayonCombine * 0.7) { // 70% de chevauchement
                    $chevauchements[] = [
                        'itineraires' => [$zones[$i]['itineraire_id'], $zones[$j]['itineraire_id']],
                        'distance_centres' => round($distance, 2),
                        'chevauchement_pct' => round((($rayonCombine - $distance) / $rayonCombine) * 100, 2)
                    ];
                }
            }
        }
        
        return [
            'type' => 'repartition_geographique',
            'zones_detectees' => count($zones),
            'chevauchements' => $chevauchements,
            'recommandation' => !empty($chevauchements) ? 
                'Optimisation possible en redistribuant les points entre les zones qui se chevauchent' : 
                'Répartition géographique optimale'
        ];
    }
    
    /**
     * ❌ Détection de croisements d'itinéraires
     */
    private function detecterCroisements($resultats) {
        $croisements = 0;
        $detailsCroisements = [];
        
        // Simplification : comparer les segments des itinéraires
        for ($i = 0; $i < count($resultats); $i++) {
            for ($j = $i + 1; $j < count($resultats); $j++) {
                if (!$resultats[$i]['success'] || !$resultats[$j]['success']) continue;
                
                $segments1 = $this->extraireSegments($resultats[$i]['itineraire']);
                $segments2 = $this->extraireSegments($resultats[$j]['itineraire']);
                
                foreach ($segments1 as $seg1) {
                    foreach ($segments2 as $seg2) {
                        if ($this->segmentsSeCroisent($seg1, $seg2)) {
                            $croisements++;
                            $detailsCroisements[] = [
                                'itineraire_1' => $i,
                                'itineraire_2' => $j,
                                'segment_1' => $seg1,
                                'segment_2' => $seg2
                            ];
                        }
                    }
                }
            }
        }
        
        return [
            'type' => 'detection_croisements',
            'nb_croisements' => $croisements,
            'details' => array_slice($detailsCroisements, 0, 5), // Limiter à 5 exemples
            'recommandation' => $croisements > 0 ? 
                "Optimisation recommandée : {$croisements} croisements détectés" : 
                'Aucun croisement détecté - itinéraires optimaux'
        ];
    }
    
    /**
     * 💡 Génération de recommandations d'amélioration
     */
    private function genererRecommandationsAmelioration($resultats) {
        $recommandations = [];
        
        // Analyser chaque itinéraire
        foreach ($resultats as $i => $resultat) {
            if (!$resultat['success']) {
                $recommandations[] = "Itinéraire {$i}: Échec de l'optimisation - Vérifier les contraintes";
                continue;
            }
            
            $metriques = $resultat['metriques'];
            
            // Distance excessive
            if ($metriques['distance_totale_km'] > 200) {
                $recommandations[] = "Itinéraire {$i}: Distance excessive ({$metriques['distance_totale_km']}km) - Diviser en plusieurs tournées";
            }
            
            // Temps excessif
            if ($metriques['temps_total_minutes'] > 480) { // 8h
                $heures = round($metriques['temps_total_minutes'] / 60, 1);
                $recommandations[] = "Itinéraire {$i}: Durée excessive ({$heures}h) - Réduire le nombre d'arrêts";
            }
            
            // Efficacité faible
            if ($metriques['efficacite_score'] < 60) {
                $recommandations[] = "Itinéraire {$i}: Efficacité faible ({$metriques['efficacite_score']}%) - Réorganiser l'ordre des visites";
            }
            
            // Peu d'arrêts
            if ($metriques['nb_arrets'] < 2 && $metriques['distance_totale_km'] < 50) {
                $recommandations[] = "Itinéraire {$i}: Sous-utilisé ({$metriques['nb_arrets']} arrêts) - Ajouter des livraisons";
            }
        }
        
        // Recommandations globales
        $stats = $this->calculerStatistiquesGlobales($resultats);
        if ($stats['repartition']['coefficient_variation'] > 50) {
            $recommandations[] = "Global: Forte variation entre les itinéraires ({$stats['repartition']['coefficient_variation']}%) - Rééquilibrer les charges";
        }
        
        return [
            'type' => 'recommandations_amelioration',
            'nb_recommandations' => count($recommandations),
            'recommandations' => array_slice($recommandations, 0, 10), // Limiter à 10
            'priorite' => count($recommandations) > 5 ? 'haute' : 'normale'
        ];
    }
    
    /**
     * 🎯 Calcul du centroïde d'un itinéraire
     */
    private function calculerCentroide($itineraire) {
        if (empty($itineraire)) {
            return $this->atelierPrincipal;
        }
        
        $sommeLat = 0;
        $sommeLng = 0;
        $count = 0;
        
        foreach ($itineraire as $point) {
            if (isset($point['latitude']) && isset($point['longitude']) && 
                $point['latitude'] != 0 && $point['longitude'] != 0) {
                $sommeLat += $point['latitude'];
                $sommeLng += $point['longitude'];
                $count++;
            }
        }
        
        if ($count == 0) {
            return $this->atelierPrincipal;
        }
        
        return [
            'latitude' => $sommeLat / $count,
            'longitude' => $sommeLng / $count
        ];
    }
    
    /**
     * 📏 Calcul du rayon moyen d'un itinéraire
     */
    private function calculerRayonMoyen($itineraire, $centroide) {
        if (empty($itineraire)) return 0;
        
        $distances = [];
        
        foreach ($itineraire as $point) {
            if (isset($point['latitude']) && isset($point['longitude'])) {
                $distance = $this->calculerDistance(
                    $centroide['latitude'], $centroide['longitude'],
                    $point['latitude'], $point['longitude']
                );
                $distances[] = $distance;
            }
        }
        
        return !empty($distances) ? array_sum($distances) / count($distances) : 0;
    }
    
    /**
     * 📐 Extraction des segments d'un itinéraire
     */
    private function extraireSegments($itineraire) {
        $segments = [];
        
        for ($i = 0; $i < count($itineraire) - 1; $i++) {
            $point1 = $itineraire[$i];
            $point2 = $itineraire[$i + 1];
            
            if (isset($point1['latitude']) && isset($point2['latitude'])) {
                $segments[] = [
                    'debut' => ['lat' => $point1['latitude'], 'lng' => $point1['longitude']],
                    'fin' => ['lat' => $point2['latitude'], 'lng' => $point2['longitude']]
                ];
            }
        }
        
        return $segments;
    }
    
    /**
     * ❌ Vérification si deux segments se croisent
     */
    private function segmentsSeCroisent($seg1, $seg2) {
        // Méthode simplifiée : vérifier si les boîtes englobantes se chevauchent
        // et si les segments ne sont pas trop éloignés
        
        $box1 = [
            'minLat' => min($seg1['debut']['lat'], $seg1['fin']['lat']),
            'maxLat' => max($seg1['debut']['lat'], $seg1['fin']['lat']),
            'minLng' => min($seg1['debut']['lng'], $seg1['fin']['lng']),
            'maxLng' => max($seg1['debut']['lng'], $seg1['fin']['lng'])
        ];
        
        $box2 = [
            'minLat' => min($seg2['debut']['lat'], $seg2['fin']['lat']),
            'maxLat' => max($seg2['debut']['lat'], $seg2['fin']['lat']),
            'minLng' => min($seg2['debut']['lng'], $seg2['fin']['lng']),
            'maxLng' => max($seg2['debut']['lng'], $seg2['fin']['lng'])
        ];
        
        // Vérifier chevauchement des boîtes
        $chevauche = ($box1['minLat'] <= $box2['maxLat'] && $box1['maxLat'] >= $box2['minLat'] &&
                      $box1['minLng'] <= $box2['maxLng'] && $box1['maxLng'] >= $box2['minLng']);
        
        if (!$chevauche) return false;
        
        // Vérifier distance entre les segments
        $distanceMin = min(
            $this->calculerDistance($seg1['debut']['lat'], $seg1['debut']['lng'], $seg2['debut']['lat'], $seg2['debut']['lng']),
            $this->calculerDistance($seg1['debut']['lat'], $seg1['debut']['lng'], $seg2['fin']['lat'], $seg2['fin']['lng']),
            $this->calculerDistance($seg1['fin']['lat'], $seg1['fin']['lng'], $seg2['debut']['lat'], $seg2['debut']['lng']),
            $this->calculerDistance($seg1['fin']['lat'], $seg1['fin']['lng'], $seg2['fin']['lat'], $seg2['fin']['lng'])
        );
        
        return $distanceMin < 5; // Considérer comme croisement si moins de 5km
    }
    
    /**
     * 📊 Calcul de l'écart-type
     */
    private function calculerEcartType($valeurs) {
        if (count($valeurs) <= 1) return 0;
        
        $moyenne = array_sum($valeurs) / count($valeurs);
        $sommeDifferencesCarrees = 0;
        
        foreach ($valeurs as $valeur) {
            $sommeDifferencesCarrees += pow($valeur - $moyenne, 2);
        }
        
        return sqrt($sommeDifferencesCarrees / count($valeurs));
    }
    
    /**
     * 🔍 Fonction de debug pour visualiser un itinéraire
     */
    public function debugItineraire($itineraire, $details = false) {
        $debug = [
            'nb_points' => count($itineraire),
            'points' => []
        ];
        
        foreach ($itineraire as $i => $point) {
            $pointDebug = [
                'ordre' => $i,
                'nom' => $point['nom'] ?? $point['client_nom'] ?? 'Point ' . $i,
                'type' => $point['type'] ?? 'livraison',
                'coordonnees' => [
                    'lat' => $point['latitude'] ?? 0,
                    'lng' => $point['longitude'] ?? 0
                ]
            ];
            
            if ($details && $i > 0) {
                $pointPrecedent = $itineraire[$i - 1];
                $pointDebug['distance_precedent'] = $this->calculerDistance(
                    $pointPrecedent['latitude'], $pointPrecedent['longitude'],
                    $point['latitude'], $point['longitude']
                );
            }
            
            $debug['points'][] = $pointDebug;
        }
        
        if ($details) {
            $matriceDistances = $this->calculerMatriceDistances($itineraire);
            $debug['metriques'] = $this->calculerMetriquesItineraire($itineraire, $matriceDistances);
        }
        
        return $debug;
    }
    
    /**
     * 🎲 Génération d'itinéraire aléatoire (pour tests)
     */
    public function genererItineraireTest($nbPoints = 5) {
        $points = [$this->atelierPrincipal];
        
        $casablancaLat = 33.5731;
        $casablancaLng = -7.5898;
        $rayon = 0.2; // ~20km
        
        for ($i = 1; $i <= $nbPoints; $i++) {
            $angle = rand(0, 360) * pi() / 180;
            $distance = rand(50, 200) / 10000; // 5-20km en degrés approximatifs
            
            $points[] = [
                'id' => $i,
                'nom' => 'Client Test ' . $i,
                'type' => 'livraison',
                'latitude' => $casablancaLat + ($distance * cos($angle)),
                'longitude' => $casablancaLng + ($distance * sin($angle)),
                'priorite' => ['normal', 'haute', 'urgente'][rand(0, 2)]
            ];
        }
        
        return $this->optimiserItineraire($points);
    }
    
    /**
     * 📈 Obtenir les performances de l'optimiseur
     */
    public function obtenirPerformances() {
        return [
            'cache_size' => count($this->cache),
            'config_active' => $this->config,
            'atelier_principal' => $this->atelierPrincipal,
            'version' => '2.1',
            'algorithmes_disponibles' => [
                'simple' => '≤ 3 points',
                'nearest_neighbor' => '≤ 6 points',
                '2_opt' => '≤ 12 points',
                'hybride' => '> 12 points'
            ],
            'optimisations_supportees' => [
                'matrice_distances_cachee',
                'multiple_points_depart',
                'amelioration_2opt',
                'clustering_geographique',
                'equilibrage_charges',
                'validation_contraintes'
            ]
        ];
    }
    
    /**
     * 🧹 Nettoyage du cache
     */
    public function viderCache() {
        $taillePrecedente = count($this->cache);
        $this->cache = [];
        
        error_log("Cache vidé: {$taillePrecedente} entrées supprimées");
        return $taillePrecedente;
    }
}

?>