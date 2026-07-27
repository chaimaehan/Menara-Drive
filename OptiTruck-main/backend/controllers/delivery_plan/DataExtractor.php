<?php

/**
 * 📊 MODULE D'EXTRACTION INTELLIGENTE DES DONNÉES
 * Récupère et enrichit toutes les données nécessaires à la planification
 */
class DataExtractor {
    private $pdo;
    
    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }
    
    public function extraireDonneesCompletes($date = null) {
        $startTime = microtime(true);
        
        $donnees = [
            'commandes' => $this->extraireCommandes($date),
            'camions' => $this->extraireCamions(),
            'stocks' => $this->extraireStocks(),
            'clients' => $this->extraireClients(),
            'chauffeurs' => $this->extraireChauffeurs()
        ];
        
        $donnees = $this->enrichirDonnees($donnees);
        
        $tempsExecution = round((microtime(true) - $startTime) * 1000, 2);
        error_log("Extraction données terminée en {$tempsExecution}ms");
        
        return $donnees;
    }
    
    private function extraireCommandes($date = null) {
        // :date1 et :date2 pour éviter le double binding du même paramètre
        $whereDate = $date ? "AND (
            DATE(c.date_commande) <= :date1 
            OR c.date_limite IS NULL 
            OR c.date_limite <= :date2
        )" : "";
        
        $sql = "
            SELECT 
                c.id, c.client_id, c.produit, c.quantite, c.date_commande,
                c.priorite, c.livree, c.date_limite,
                cl.nom as client_nom, 
                cl.adresse, 
                cl.telephone, 
                cl.email,
                cl.latitude, 
                cl.longitude,
                cl.type_client,
                cl.volume_mensuel,
                CASE 
                    WHEN c.priorite = 'urgente' THEN 3
                    WHEN c.priorite = 'élevée' THEN 2
                    ELSE 1 
                END as priorite_numerique,
                DATEDIFF(COALESCE(c.date_limite, DATE_ADD(NOW(), INTERVAL 2 DAY)), NOW()) as jours_restants
            FROM commandes c
            INNER JOIN clients cl ON c.client_id = cl.id
            WHERE (c.livree IS NULL OR c.livree = 0)
            AND (c.statut IS NULL OR c.statut != 'planifie')
            AND cl.latitude IS NOT NULL 
            AND cl.longitude IS NOT NULL
            AND cl.latitude != 0
            AND cl.longitude != 0
            {$whereDate}
            ORDER BY 
                priorite_numerique DESC,
                jours_restants ASC,
                c.date_commande ASC
            LIMIT 200
        ";
        
        $stmt = $this->pdo->prepare($sql);
        if ($date) {
            $stmt->bindValue(':date1', $date);
            $stmt->bindValue(':date2', $date);
        }
        $stmt->execute();
        $commandes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($commandes as &$commande) {
            $commande['urgence_score'] = $this->calculerScoreUrgence($commande);
            $commande['client_data'] = [
                'nom' => $commande['client_nom'],
                'adresse' => $commande['adresse'],
                'telephone' => $commande['telephone'],
                'email' => $commande['email'],
                'type_client' => $commande['type_client'],
                'volume_mensuel' => $commande['volume_mensuel']
            ];
        }
        
        error_log("Commandes extraites: " . count($commandes));
        return $commandes;
    }
    
    private function extraireCamions() {
        $sql = "
            SELECT 
                c.id, c.code, c.capacite, c.chauffeur_id, 
                c.statut, c.type_vehicule, c.latitude, c.longitude,
                c.created_at,
                ch.nom as chauffeur_nom, 
                ch.telephone as chauffeur_telephone,
                ch.email as chauffeur_email,
                ch.permis,
                ch.statut as chauffeur_statut,
                COALESCE(c.capacite, 100) as capacite_effective,
                CASE c.statut
                    WHEN 'disponible' THEN 3
                    WHEN 'en_route' THEN 2
                    WHEN 'actif' THEN 2
                    ELSE 1
                END as priorite_statut
            FROM camions c
            LEFT JOIN chauffeurs ch ON c.chauffeur_id = ch.id
            WHERE c.statut IN ('disponible', 'en_route', 'actif')
            AND (ch.statut IS NULL OR ch.statut = 'actif')
            ORDER BY c.capacite DESC
            LIMIT 50
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();
        $camions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($camions as &$camion) {
            $camion['performance'] = $this->calculerPerformanceCamion($camion['id']);
        }
        
        error_log("Camions extraits: " . count($camions));
        return $camions;
    }
    
    private function extraireStocks() {
        $sql = "
            SELECT 
                s.id, s.nom, s.adresse, s.latitude, s.longitude, 
                s.statut, s.capacite_actuelle,
                COUNT(ps.id) as nb_produits_references,
                SUM(ps.quantite_disponible) as stock_total_disponible,
                AVG(ps.quantite_disponible) as stock_moyen_produit,
                CASE s.statut
                    WHEN 'actif' THEN 1
                    ELSE 0
                END as statut_numerique
            FROM stocks s
            LEFT JOIN produits_stocks ps ON s.id = ps.stock_id 
                AND ps.quantite_disponible > 0
            WHERE s.statut = 'actif'
            AND s.latitude IS NOT NULL 
            AND s.longitude IS NOT NULL
            AND s.latitude != 0
            AND s.longitude != 0
            GROUP BY s.id, s.nom, s.adresse, s.latitude, s.longitude, 
                     s.statut, s.capacite_actuelle
            HAVING (stock_total_disponible > 0 OR s.capacite_actuelle > 0)
            ORDER BY stock_total_disponible DESC, s.nom ASC
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();
        $stocks = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($stocks as &$stock) {
            $stock['produits_details'] = $this->extraireProduitsStock($stock['id']);
            $stock['efficacite_score'] = $this->calculerEfficaciteStock($stock);
        }
        
        error_log("Stocks extraits: " . count($stocks));
        return $stocks;
    }
    
    private function extraireClients() {
        $sql = "
            SELECT 
                c.id, c.nom, c.adresse, c.telephone, c.email, 
                c.latitude, c.longitude, c.type_client, c.volume_mensuel, c.created_at,
                COUNT(cmd.id) AS nb_commandes_totales,
                COUNT(CASE WHEN cmd.livree = 1 THEN 1 END) AS nb_commandes_livrees,
                COALESCE(AVG(
                    CASE 
                        WHEN cmd.livree = 1 THEN DATEDIFF(cmd.date_limite, cmd.date_commande)
                        ELSE NULL
                    END
                ), 2) AS delai_moyen_livraison,
                MAX(cmd.date_commande) AS derniere_commande
            FROM clients c
            LEFT JOIN commandes cmd ON c.id = cmd.client_id
            WHERE c.latitude IS NOT NULL 
              AND c.longitude IS NOT NULL
              AND c.latitude != 0
              AND c.longitude != 0
            GROUP BY c.id, c.nom, c.adresse, c.telephone, c.email, 
                     c.latitude, c.longitude, c.type_client, c.volume_mensuel, c.created_at
            ORDER BY nb_commandes_totales DESC, c.nom ASC
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();
        $clients = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($clients as &$client) {
            $client['score_fidelite'] = $this->calculerScoreFidelite($client);
            $client['taux_livraison'] = $client['nb_commandes_totales'] > 0 ? 
                round(($client['nb_commandes_livrees'] / $client['nb_commandes_totales']) * 100, 2) : 0;
        }
        
        error_log("Clients extraits: " . count($clients));
        return $clients;
    }

    public function getStocks($date = null) {
        return $this->extraireStocks();
    }

    public function getCommandes($date = null) {
        return $this->extraireCommandes($date);
    }
    
    private function extraireChauffeurs() {
        $sql = "
            SELECT 
                ch.id, ch.nom, ch.telephone, ch.email, ch.permis, ch.statut,
                ch.created_at,
                COUNT(c.id) as nb_camions_assignes,
                COALESCE(AVG(l.satisfaction_reelle), 4) as satisfaction_moyenne
            FROM chauffeurs ch
            LEFT JOIN camions c ON ch.id = c.chauffeur_id AND c.statut != 'maintenance'
            LEFT JOIN livraisons l ON c.id = l.camion_id
            WHERE ch.statut = 'actif'
            GROUP BY ch.id, ch.nom, ch.telephone, ch.email, ch.permis, ch.statut, ch.created_at
            ORDER BY satisfaction_moyenne DESC, nb_camions_assignes ASC
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    private function enrichirDonnees($donnees) {
        $donnees['distances_atelier'] = $this->calculerDistancesDepuisAtelier($donnees);
        $donnees['analyse_charge'] = $this->analyserChargeTravail($donnees);
        $donnees['zones_geographiques'] = $this->detecterZonesGeographiques($donnees);
        return $donnees;
    }
    
    private function calculerDistancesDepuisAtelier($donnees) {
        $atelierLat = 33.5731;
        $atelierLng = -7.5898;
        
        $distances = ['stocks' => [], 'clients' => [], 'moyenne_stocks' => 0, 'moyenne_clients' => 0];
        
        foreach ($donnees['stocks'] as $stock) {
            $distance = $this->calculerDistance($atelierLat, $atelierLng, $stock['latitude'], $stock['longitude']);
            $distances['stocks'][$stock['id']] = round($distance, 2);
        }
        
        foreach ($donnees['commandes'] as $commande) {
            if ($commande['latitude'] && $commande['longitude']) {
                $distance = $this->calculerDistance($atelierLat, $atelierLng, $commande['latitude'], $commande['longitude']);
                $distances['clients'][$commande['client_id']] = round($distance, 2);
            }
        }
        
        if (!empty($distances['stocks'])) {
            $distances['moyenne_stocks'] = round(array_sum($distances['stocks']) / count($distances['stocks']), 2);
        }
        if (!empty($distances['clients'])) {
            $distances['moyenne_clients'] = round(array_sum($distances['clients']) / count($distances['clients']), 2);
        }
        
        return $distances;
    }
    
    private function analyserChargeTravail($donnees) {
        $analyse = [
            'nb_commandes' => count($donnees['commandes']),
            'nb_camions_disponibles' => count($donnees['camions']),
            'nb_stocks_actifs' => count($donnees['stocks']),
            'charge_moyenne_par_camion' => 0,
            'taux_utilisation_prevu' => 0,
            'complexite_logistique' => 'faible'
        ];
        
        if ($analyse['nb_camions_disponibles'] > 0) {
            $analyse['charge_moyenne_par_camion'] = round($analyse['nb_commandes'] / $analyse['nb_camions_disponibles'], 1);
            $analyse['taux_utilisation_prevu'] = min(100, round(($analyse['nb_commandes'] / ($analyse['nb_camions_disponibles'] * 4)) * 100, 2));
        }
        
        if ($analyse['nb_commandes'] > 20 && $analyse['nb_stocks_actifs'] > 3) {
            $analyse['complexite_logistique'] = 'élevée';
        } elseif ($analyse['nb_commandes'] > 10 || $analyse['nb_stocks_actifs'] > 2) {
            $analyse['complexite_logistique'] = 'moyenne';
        }
        
        return $analyse;
    }
    
    private function detecterZonesGeographiques($donnees) {
        $zones = ['marrakech_centre' => [], 'marrakech_peripherie' => [], 'autres_villes' => []];
        $centreKech = ['lat' => 31.63416, 'lng' => -7.99994];
        
        foreach ($donnees['clients'] as $client) {
            if ($client['latitude'] && $client['longitude']) {
                $distance = $this->calculerDistance($centreKech['lat'], $centreKech['lng'], $client['latitude'], $client['longitude']);
                if ($distance <= 50) $zones['marrakech_centre'][] = $client['id'];
                elseif ($distance <= 100) $zones['marrakech_peripherie'][] = $client['id'];
                else $zones['autres_villes'][] = $client['id'];
            }
        }
        
        return $zones;
    }
    
    private function calculerScoreUrgence($commande) {
        $score = 0;
        switch (strtolower($commande['priorite'] ?: 'normal')) {
            case 'urgente': $score += 50; break;
            case 'élevée': $score += 30; break;
            case 'normal': $score += 10; break;
        }
        $joursDepuis = max(0, (time() - strtotime($commande['date_commande'])) / 86400);
        $score += min(20, $joursDepuis * 2);
        if (isset($commande['jours_restants'])) {
            if ($commande['jours_restants'] <= 0) $score += 40;
            elseif ($commande['jours_restants'] <= 1) $score += 25;
            elseif ($commande['jours_restants'] <= 3) $score += 10;
        }
        if (($commande['type_client'] ?? '') === 'VIP') $score += 15;
        return min(100, $score);
    }
    
    private function calculerPerformanceCamion($camionId) {
        try {
            $sql = "
                SELECT 
                    COUNT(l.id) as nb_livraisons,
                    AVG(l.satisfaction_reelle) as satisfaction_moyenne,
                    AVG(l.temps_reel_minutes) as temps_moyen,
                    COUNT(CASE WHEN l.status = 'livree' THEN 1 END) as nb_reussies
                FROM livraisons l
                WHERE l.camion_id = ? AND l.date_livraison >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$camionId]);
            $perf = $stmt->fetch();
            if ($perf && $perf['nb_livraisons'] > 0) {
                return [
                    'nb_livraisons' => (int)$perf['nb_livraisons'],
                    'satisfaction_moyenne' => round($perf['satisfaction_moyenne'] ?: 4, 1),
                    'temps_moyen' => round($perf['temps_moyen'] ?: 30, 1),
                    'taux_reussite' => round(($perf['nb_reussies'] / $perf['nb_livraisons']) * 100, 2),
                    'fiabilite_score' => min(100, ($perf['satisfaction_moyenne'] ?: 4) * 20)
                ];
            }
        } catch (Exception $e) {
            error_log("Erreur calcul performance camion: " . $e->getMessage());
        }
        return ['nb_livraisons' => 0, 'satisfaction_moyenne' => 4.0, 'temps_moyen' => 30, 'taux_reussite' => 85, 'fiabilite_score' => 80];
    }
    
    private function extraireProduitsStock($stockId) {
        try {
            $sql = "
                SELECT produit, quantite_disponible, quantite_minimale, quantite_maximale,
                       date_derniere_maj, alerte_stock
                FROM produits_stocks
                WHERE stock_id = ? AND quantite_disponible > 0
                ORDER BY quantite_disponible DESC
                LIMIT 20
            ";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$stockId]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            return [];
        }
    }
    
    private function calculerEfficaciteStock($stock) {
        $score = 0;
        $stockTotal = $stock['stock_total_disponible'] ?: $stock['capacite_actuelle'] ?: 0;
        if ($stockTotal > 100) $score += 30;
        elseif ($stockTotal > 50) $score += 20;
        elseif ($stockTotal > 0) $score += 10;
        $nbProduits = $stock['nb_produits_references'] ?: 0;
        if ($nbProduits > 10) $score += 20;
        elseif ($nbProduits > 5) $score += 15;
        elseif ($nbProduits > 0) $score += 10;
        if ($stock['stock_moyen_produit'] > 20) $score += 15;
        if ($stockTotal < 10) $score -= 20;
        return max(0, min(100, $score));
    }
    
    private function calculerScoreFidelite($client) {
        $score = 0;
        $nbCommandes = $client['nb_commandes_totales'] ?: 0;
        if ($nbCommandes > 20) $score += 40;
        elseif ($nbCommandes > 10) $score += 30;
        elseif ($nbCommandes > 5) $score += 20;
        elseif ($nbCommandes > 0) $score += 10;
        $tauxLivraison = $client['nb_commandes_totales'] > 0 ? 
            ($client['nb_commandes_livrees'] / $client['nb_commandes_totales']) * 100 : 0;
        if ($tauxLivraison > 95) $score += 20;
        elseif ($tauxLivraison > 80) $score += 15;
        elseif ($tauxLivraison > 60) $score += 10;
        if ($client['derniere_commande']) {
            $joursDerniereCmd = (time() - strtotime($client['derniere_commande'])) / 86400;
            if ($joursDerniereCmd <= 7) $score += 15;
            elseif ($joursDerniereCmd <= 30) $score += 10;
            elseif ($joursDerniereCmd <= 90) $score += 5;
        }
        if (($client['type_client'] ?? '') === 'VIP') $score += 25;
        elseif (($client['type_client'] ?? '') === 'entreprise') $score += 15;
        if (($client['volume_mensuel'] ?? 0) > 100) $score += 10;
        return min(100, $score);
    }
    
    private function calculerDistance($lat1, $lng1, $lat2, $lng2) {
        if (!$lat1 || !$lng1 || !$lat2 || !$lng2) return 9999;
        $earthRadius = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat/2) * sin($dLat/2) + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng/2) * sin($dLng/2);
        return $earthRadius * 2 * atan2(sqrt($a), sqrt(1-$a));
    }
    
    public function obtenirStatistiquesExtraction($donnees) {
        return [
            'timestamp' => date('Y-m-d H:i:s'),
            'commandes_extraites' => count($donnees['commandes']),
            'camions_disponibles' => count($donnees['camions']),
            'stocks_actifs' => count($donnees['stocks']),
            'clients_references' => count($donnees['clients']),
            'chauffeurs_actifs' => count($donnees['chauffeurs']),
            'charge_prevue' => $donnees['analyse_charge']['charge_moyenne_par_camion'] ?? 0,
            'complexite' => $donnees['analyse_charge']['complexite_logistique'] ?? 'inconnue',
            'zone_principale' => count($donnees['zones_geographiques']['marrakech_centre'] ?? []) . ' clients centre-ville',
            'distance_moyenne_stocks' => $donnees['distances_atelier']['moyenne_stocks'] ?? 0,
            'distance_moyenne_clients' => $donnees['distances_atelier']['moyenne_clients'] ?? 0
        ];
    }
    
    public function rechercherCommandes($criteres = []) {
        $conditions = ["(c.livree IS NULL OR c.livree = 0)"];
        $params = [];
        if (!empty($criteres['client_id'])) { $conditions[] = "c.client_id = ?"; $params[] = $criteres['client_id']; }
        if (!empty($criteres['priorite'])) { $conditions[] = "c.priorite = ?"; $params[] = $criteres['priorite']; }
        if (!empty($criteres['produit'])) { $conditions[] = "c.produit LIKE ?"; $params[] = '%' . $criteres['produit'] . '%'; }
        if (!empty($criteres['date_debut'])) { $conditions[] = "c.date_commande >= ?"; $params[] = $criteres['date_debut']; }
        if (!empty($criteres['date_fin'])) { $conditions[] = "c.date_commande <= ?"; $params[] = $criteres['date_fin']; }
        $whereClause = implode(' AND ', $conditions);
        $sql = "SELECT c.*, cl.nom as client_nom, cl.adresse, cl.telephone, cl.latitude, cl.longitude
                FROM commandes c INNER JOIN clients cl ON c.client_id = cl.id
                WHERE {$whereClause} ORDER BY c.priorite DESC, c.date_commande ASC";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function obtenirTableauBord() {
        try {
            $stmt = $this->pdo->prepare("SELECT COUNT(CASE WHEN livree = 1 THEN 1 END) as livrees, COUNT(CASE WHEN livree = 0 OR livree IS NULL THEN 1 END) as en_attente, COUNT(CASE WHEN priorite = 'urgente' THEN 1 END) as urgentes, COUNT(*) as total FROM commandes WHERE date_commande >= DATE_SUB(NOW(), INTERVAL 30 DAY)");
            $stmt->execute();
            $statsCommandes = $stmt->fetch();
            $stmt = $this->pdo->prepare("SELECT COUNT(CASE WHEN statut = 'disponible' THEN 1 END) as disponibles, COUNT(CASE WHEN statut = 'en_route' THEN 1 END) as en_route, COUNT(CASE WHEN statut = 'maintenance' THEN 1 END) as maintenance, COUNT(*) as total FROM camions");
            $stmt->execute();
            $statsCamions = $stmt->fetch();
            $stmt = $this->pdo->prepare("SELECT COUNT(*) as stocks_faibles FROM produits_stocks WHERE quantite_disponible <= quantite_minimale");
            $stmt->execute();
            $stocksFaibles = $stmt->fetchColumn();
            return ['commandes' => $statsCommandes, 'camions' => $statsCamions, 'stocks_faibles' => $stocksFaibles, 'derniere_maj' => date('Y-m-d H:i:s')];
        } catch (Exception $e) {
            error_log("Erreur tableau de bord: " . $e->getMessage());
            return null;
        }
    }
}