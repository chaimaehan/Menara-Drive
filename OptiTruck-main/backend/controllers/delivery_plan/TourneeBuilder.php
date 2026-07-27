<?php

/**
 * 🛣️ MODULE DE CONSTRUCTION DE TOURNÉES COMPLÈTES
 * Génère des plans détaillés : Atelier → Stocks → Clients → Atelier
 */
class TourneeBuilder {
    private $config;
    private $atelierPrincipal;
    
    public function __construct($config, $atelierPrincipal) {
        $this->config = $config;
        $this->atelierPrincipal = $atelierPrincipal;
    }
    
    /**
     * 🚛 Construire une tournée complète avec gestion des stocks
     */
    public function construireTourneeAvecStocks($camion, $commandes, $donnees) {
        // 1. Organiser les commandes par stock
        $commandesParStock = $this->organiserCommandesParStock($commandes);
        
        // 2. Optimiser l'ordre des visites
        $etapesOptimisees = $this->optimiserOrdreVisite($commandesParStock, $donnees);
        
        // 3. Construire la tournée détaillée
        $tournee = $this->construireTourneeDetaillee($camion, $etapesOptimisees, $donnees);
        
        return $tournee;
    }
    
    /**
     * 📦 Organiser les commandes par stock
     */
    private function organiserCommandesParStock($commandes) {
    $commandesParStock = [];
    $commandesVues = []; // Ajouter cette ligne
    
    foreach ($commandes as $commande) {
        // Créer une clé unique pour éviter les doublons
        $cleUnique = $commande['id'] . '_' . $commande['client_id'] . '_' . $commande['produit'];
        
        // Vérifier si cette commande a déjà été traitée
        if (isset($commandesVues[$cleUnique])) {
            error_log("⚠️ Commande dupliquée détectée et ignorée: {$commande['id']}");
            continue;
        }
        $commandesVues[$cleUnique] = true;
        
        $stockId = $commande['stock_alloue']['id'];
        
        if (!isset($commandesParStock[$stockId])) {
            $commandesParStock[$stockId] = [
                'stock' => $commande['stock_alloue'],
                'commandes' => []
            ];
        }
        
        $commandesParStock[$stockId]['commandes'][] = $commande;
    }
    
    return $commandesParStock;
}
    
    /**
     * 🎯 Optimiser l'ordre de visite des stocks et clients
     */
    private function optimiserOrdreVisite($commandesParStock, $donnees) {
        $etapes = [];
        
        // Calculer les distances depuis l'atelier pour chaque stock
        foreach ($commandesParStock as $stockId => &$groupe) {
            $stock = $groupe['stock'];
            $groupe['distance_atelier'] = $this->calculerDistance(
                $this->atelierPrincipal['latitude'],
                $this->atelierPrincipal['longitude'],
                $stock['latitude'],
                $stock['longitude']
            );
        }
        
        // Trier les stocks par distance depuis l'atelier
        uasort($commandesParStock, function($a, $b) {
            return $a['distance_atelier'] <=> $b['distance_atelier'];
        });
        
        // Pour chaque stock, optimiser l'ordre des clients
        foreach ($commandesParStock as $groupe) {
            $stock = $groupe['stock'];
            $commandes = $groupe['commandes'];
            
            // Calculer distances stock -> clients
            foreach ($commandes as &$commande) {
                $commande['distance_depuis_stock'] = $this->calculerDistance(
                    $stock['latitude'],
                    $stock['longitude'],
                    $commande['latitude'] ?? 0,
                    $commande['longitude'] ?? 0
                );
            }
            
            // Trier les commandes par distance depuis le stock
            usort($commandes, function($a, $b) {
                return $a['distance_depuis_stock'] <=> $b['distance_depuis_stock'];
            });
            
            $etapes[] = [
                'type' => 'stock_collecte',
                'stock' => $stock,
                'commandes' => $commandes
            ];
        }
        
        return $etapes;
    }
    
    /**
     * 🏗️ Construire la tournée détaillée complète
     */
    private function construireTourneeDetaillee($camion, $etapesOptimisees, $donnees) {
        $planComplet = [];
        $livraisons = [];
        $heureActuelle = '07:30';
        $distanceTotale = 0;
        $tempsTotal = 0;
        
        // 1. ÉTAPE CHARGEMENT À L'ATELIER
        $nbCommandesTotales = 0;
        foreach ($etapesOptimisees as $etape) {
            $nbCommandesTotales += count($etape['commandes']);
        }
        
        $dureeChargement = $nbCommandesTotales * $this->config['tempsChargement'] + 15;
        
        $planComplet[] = [
            "type" => "chargement",
            "lieu" => $this->atelierPrincipal['nom'],
            "heure_arrivee" => $heureActuelle,
            "heure_depart" => $this->ajouterMinutes($heureActuelle, $dureeChargement),
            "duree" => round($dureeChargement, 1),
            "description" => "Chargement initial - {$nbCommandesTotales} commandes"
        ];
        
        $heureActuelle = $this->ajouterMinutes($heureActuelle, $dureeChargement);
        $tempsTotal += $dureeChargement;
        
        $positionActuelle = [
            'latitude' => $this->atelierPrincipal['latitude'],
            'longitude' => $this->atelierPrincipal['longitude']
        ];
        
        // 2. ÉTAPES STOCKS ET LIVRAISONS
        foreach ($etapesOptimisees as $etape) {
            $stock = $etape['stock'];
            $commandes = $etape['commandes'];
            
            // Trajet vers le stock
            $distanceVersStock = $this->calculerDistance(
                $positionActuelle['latitude'],
                $positionActuelle['longitude'],
                $stock['latitude'],
                $stock['longitude']
            );
            
            $tempsTrajetStock = max(5, round($distanceVersStock / $this->config['vitesseMoyenne'] * 60));
            $heureActuelle = $this->ajouterMinutes($heureActuelle, $tempsTrajetStock);
            $distanceTotale += $distanceVersStock;
            $tempsTotal += $tempsTrajetStock;
            
            // Collecte au stock
            $tempsCollecte = count($commandes) * $this->config['tempsCollecteStock'] + 5;
            
            $planComplet[] = [
                "type" => "collecte_stock",
                "lieu" => $stock['nom'],
                "adresse" => $stock['adresse'],
                "heure_arrivee" => $heureActuelle,
                "heure_depart" => $this->ajouterMinutes($heureActuelle, $tempsCollecte),
                "temps_trajet" => $tempsTrajetStock,
                "temps_arret" => $tempsCollecte,
                "distance_depuis_precedent" => round($distanceVersStock, 2),
                "produits_collectes" => $this->extraireProduitsCommandes($commandes),
                "nb_commandes" => count($commandes),
                "instructions_speciales" => ["Vérifier état des produits", "Scanner codes-barres"]
            ];
            
            $heureActuelle = $this->ajouterMinutes($heureActuelle, $tempsCollecte);
            $tempsTotal += $tempsCollecte;
            
            $positionActuelle = [
                'latitude' => $stock['latitude'],
                'longitude' => $stock['longitude']
            ];
            
            // Livraisons aux clients
            foreach ($commandes as $commande) {
                $distanceVersClient = $this->calculerDistance(
                    $positionActuelle['latitude'],
                    $positionActuelle['longitude'],
                    $commande['latitude'] ?? 0,
                    $commande['longitude'] ?? 0
                );
                
                $tempsTrajetClient = max(3, round($distanceVersClient / $this->config['vitesseMoyenne'] * 60));
                $heureActuelle = $this->ajouterMinutes($heureActuelle, $tempsTrajetClient);
                $distanceTotale += $distanceVersClient;
                $tempsTotal += $tempsTrajetClient;
                
                $tempsLivraison = $this->config['tempsLivraison'];
                
                $etapeLivraison = [
                    "type" => "livraison",
                    "commande_id" => (int)$commande['id'],
                    "client" => (int)$commande['client_id'],
                    "client_nom" => $commande['client_data']['nom'] ?? "Client {$commande['client_id']}",
                    "adresse" => $commande['client_data']['adresse'] ?? $commande['adresse'],
                    "telephone" => $commande['client_data']['telephone'] ?? $commande['telephone'],
                    "produit" => $commande['produit'],
                    "quantite" => (int)$commande['quantite'],
                    "priorite" => $commande['priorite'] ?: "normal",
                    "stock_origine" => $stock['nom'],
                    "heure_arrivee" => $heureActuelle,
                    "heure_depart" => $this->ajouterMinutes($heureActuelle, $tempsLivraison),
                    "temps_trajet" => $tempsTrajetClient,
                    "temps_arret" => $tempsLivraison,
                    "distance_depuis_precedent" => round($distanceVersClient, 2),
                    "satisfaction_prevue" => $this->calculerSatisfactionPrevue($commande),
                    "instructions_speciales" => $this->genererInstructions($commande)
                ];
                
                $planComplet[] = $etapeLivraison;
                $livraisons[] = $etapeLivraison;
                
                $heureActuelle = $this->ajouterMinutes($heureActuelle, $tempsLivraison);
                $tempsTotal += $tempsLivraison;
                
                $positionActuelle = [
                    'latitude' => $commande['latitude'] ?? 0,
                    'longitude' => $commande['longitude'] ?? 0
                ];
            }
        }
        
        // 3. RETOUR À L'ATELIER
        $distanceRetour = $this->calculerDistance(
            $positionActuelle['latitude'],
            $positionActuelle['longitude'],
            $this->atelierPrincipal['latitude'],
            $this->atelierPrincipal['longitude']
        );
        
        $tempsRetour = max(5, round($distanceRetour / $this->config['vitesseMoyenne'] * 60));
        $heureActuelle = $this->ajouterMinutes($heureActuelle, $tempsRetour);
        $distanceTotale += $distanceRetour;
        $tempsTotal += $tempsRetour;
        
        $planComplet[] = [
            "type" => "retour",
            "lieu" => $this->atelierPrincipal['nom'],
            "heure_arrivee" => $heureActuelle,
            "temps_trajet" => $tempsRetour,
            "distance_depuis_precedent" => round($distanceRetour, 2),
            "description" => "Retour à la base - Fin de tournée"
        ];
        
        // Calculs finaux
        $coutEstime = $this->calculerCoutTotal($distanceTotale, $tempsTotal);
        $poidsTotal = array_sum(array_column($livraisons, 'quantite'));
        $capaciteCamion = $camion['capacite'] ?: 100;
        $tauxUtilisation = ($poidsTotal / max(1, $capaciteCamion)) * 100;
        $satisfactionMoyenne = $this->calculerSatisfactionMoyenne($livraisons);
        
        return [
            'vehicule_id' => $camion['id'],
            'chauffeur_nom' => $camion['chauffeur_nom'] ?: "Chauffeur assigné",
            'etapes' => $planComplet,
            'livraisons' => $livraisons,
            'distance_totale' => round($distanceTotale, 2),
            'distance_retour' => round($distanceRetour, 2),
            'temps_total' => round($tempsTotal),
            'cout_estime' => round($coutEstime, 2),
            'satisfaction_moyenne' => $satisfactionMoyenne,
            'taux_utilisation_capacite' => round($tauxUtilisation, 2),
            'nb_stocks_visites' => count($etapesOptimisees),
            'heure_depart' => '07:30',
            'heure_retour_prevue' => $heureActuelle
        ];
    }
    
    /**
     * 📋 Extraire la liste des produits des commandes
     */
    private function extraireProduitsCommandes($commandes) {
        $produits = [];
        foreach ($commandes as $commande) {
            $produit = $commande['produit'];
            if (isset($produits[$produit])) {
                $produits[$produit] += $commande['quantite'];
            } else {
                $produits[$produit] = $commande['quantite'];
            }
        }
        
        $liste = [];
        foreach ($produits as $nom => $quantite) {
            $liste[] = "{$nom} (x{$quantite})";
        }
        
        return $liste;
    }
    
    /**
     * 💰 Calculer le coût total de la tournée
     */
    private function calculerCoutTotal($distance, $tempsMinutes) {
        $coutKilometrage = $distance * $this->config['coutKm'];
        $coutTemps = ($tempsMinutes / 60) * 45; // 45 DH/heure
        $coutFixe = 100; // Coût fixe par tournée
        
        return $coutKilometrage + $coutTemps + $coutFixe;
    }
    
    /**
     * 😊 Calculer la satisfaction prévue
     */
    private function calculerSatisfactionPrevue($commande) {
        $base = 75;
        
        // Bonus priorité
        switch (strtolower($commande['priorite'] ?: 'normal')) {
            case 'urgente': $base += 15; break;
            case 'haute': $base += 10; break;
            case 'normal': $base += 5; break;
        }
        
        // Bonus distance courte
        if (($commande['distance_depuis_stock'] ?? 999) < 10) {
            $base += 5;
        }
        
        // Variation aléatoire
        $base += rand(-5, 8);
        
        return min(95, max(60, $base));
    }
    
    /**
     * 📊 Calculer satisfaction moyenne
     */
    private function calculerSatisfactionMoyenne($livraisons) {
        if (empty($livraisons)) return 75;
        
        $total = array_sum(array_column($livraisons, 'satisfaction_prevue'));
        return round($total / count($livraisons));
    }
    
    /**
     * 📝 Générer des instructions spéciales
     */
    private function genererInstructions($commande) {
        $instructions = [];
        
        if (($commande['priorite'] ?? 'normal') === 'urgente') {
            $instructions[] = "⚠️ LIVRAISON URGENTE - Priorité absolue";
        }
        
        if (($commande['quantite'] ?? 0) > 50) {
            $instructions[] = "📦 Gros volume - Prévoir aide au déchargement";
        }
        
        $instructions[] = "📱 Appeler 5min avant arrivée";
        $instructions[] = "📋 Faire signer le bon de livraison";
        
        return $instructions;
    }
    
    /**
     * ⏰ Ajouter des minutes à une heure
     */
    private function ajouterMinutes($heure, $minutes) {
        return date('H:i', strtotime($heure) + ($minutes * 60));
    }
    
    /**
     * 📏 Calculer la distance entre deux points
     */
    private function calculerDistance($lat1, $lng1, $lat2, $lng2) {
        if (!$lat1 || !$lng1 || !$lat2 || !$lng2) {
            return 0;
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
     * 🎯 Générer un résumé de la tournée
     */
    public function genererResumeTournee($tournee) {
        $nbLivraisons = count($tournee['livraisons']);
        $nbStocks = $tournee['nb_stocks_visites'];
        $dureeHeures = round($tournee['temps_total'] / 60, 1);
        
        return [
            'titre' => "Chauffeur {$tournee['chauffeur_nom']} - {$nbLivraisons} livraisons",
            'itineraire' => "Atelier → {$nbStocks} stock(s) → {$nbLivraisons} client(s) → Atelier",
            'duree_estimee' => "{$dureeHeures}h",
            'distance_totale' => "{$tournee['distance_totale']} km",
            'cout_estime' => "{$tournee['cout_estime']} DH",
            'heure_depart' => $tournee['heure_depart'],
            'heure_retour' => $tournee['heure_retour_prevue']
        ];
    }
}