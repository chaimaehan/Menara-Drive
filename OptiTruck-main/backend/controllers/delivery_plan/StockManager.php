<?php

/**
 * 📦 MODULE DE GESTION INTELLIGENTE DES STOCKS - VERSION CORRIGÉE
 * Adaptée à votre structure de BDD avec la table produits_stocks
 */
class StockManager {
    private $pdo;
    
    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }
    
    /**
     * 🔍 Vérification et allocation des stocks pour les commandes
     */
    public function verifierEtAllouerStocks($commandes, $stocks) {
        $commandesValidees = [];
        
        error_log("Vérification stocks - Commandes: " . count($commandes) . ", Stocks: " . count($stocks));
        
        foreach ($commandes as $commande) {
            error_log("=== TRAITEMENT COMMANDE {$commande['id']} ===");
            error_log("Produit demandé: " . ($commande['produit'] ?? 'NON DÉFINI'));
            error_log("Quantité demandée: " . ($commande['quantite'] ?? 'NON DÉFINIE'));
            
            $stockOptimal = $this->trouverStockOptimal($commande, $stocks);
            
            if ($stockOptimal) {
                // Ajouter les informations de stock à la commande
                $commande['stock_alloue'] = $stockOptimal;
                $commande['distance_stock'] = $this->calculerDistance(
                    $commande['latitude'] ?? 0,
                    $commande['longitude'] ?? 0,
                    $stockOptimal['latitude'],
                    $stockOptimal['longitude']
                );
                
                // Distance depuis l'atelier principal (Casablanca)
                $commande['distance_atelier'] = $this->calculerDistance(
                    33.5731, -7.5898, // Atelier principal
                    $commande['latitude'] ?? 0,
                    $commande['longitude'] ?? 0
                );
                
                $commandesValidees[] = $commande;
                
                // Réserver la quantité dans le stock
                $this->reserverStock($stockOptimal['id'], $commande['produit'], $commande['quantite']);
                
                error_log("✅ Commande {$commande['id']} validée avec stock {$stockOptimal['nom']} (ID: {$stockOptimal['id']})");
            } else {
                error_log("❌ Commande {$commande['id']} REJETÉE - Aucun stock disponible pour {$commande['produit']}");
            }
        }
        
        return $commandesValidees;
    }
    
    /**
     * 🎯 Trouver le stock optimal pour une commande
     */
    private function trouverStockOptimal($commande, $stocks) {
        $candidats = [];
        $produitDemande = $commande['produit'] ?? null;
        $quantiteDemandee = $commande['quantite'] ?? 1;
        
        if (!$produitDemande) {
            error_log("⚠️ Pas de produit spécifié pour la commande {$commande['id']}");
            return null;
        }
        
        error_log("Recherche stock pour produit: {$produitDemande}, quantité: {$quantiteDemandee}");
        
        // Trouver tous les stocks ayant le produit demandé
        foreach ($stocks as $stock) {
            error_log("--- Test stock {$stock['id']} ({$stock['nom']}) - Statut: {$stock['statut']} ---");
            
            // Vérifier le statut (adapté à votre BDD)
            if ($stock['statut'] !== 'actif') {
                error_log("❌ Stock {$stock['id']} non actif (statut: {$stock['statut']}), ignoré");
                continue;
            }
            
            // VÉRIFICATION STRICTE DES PRODUITS
            $quantiteDisponible = $this->verifierQuantiteStockStrict($stock['id'], $produitDemande);
            
            error_log("Quantité disponible pour {$produitDemande} dans stock {$stock['id']}: {$quantiteDisponible}");
            
            if ($quantiteDisponible >= $quantiteDemandee) {
                // Calculer la distance client-stock
                $distance = $this->calculerDistance(
                    $commande['latitude'] ?? 0,
                    $commande['longitude'] ?? 0,
                    $stock['latitude'],
                    $stock['longitude']
                );
                
                // Calculer la distance atelier-stock
                $distanceAtelier = $this->calculerDistance(
                    33.5731, -7.5898, // Atelier principal
                    $stock['latitude'],
                    $stock['longitude']
                );
                
                $candidats[] = [
                    'stock' => $stock,
                    'quantite_disponible' => $quantiteDisponible,
                    'distance_client' => $distance,
                    'distance_atelier' => $distanceAtelier,
                    'score' => $this->calculerScoreStock($distance, $distanceAtelier, $quantiteDisponible, $quantiteDemandee)
                ];
                
                error_log("✅ Stock {$stock['id']} est candidat (distance: {$distance}km, score: " . end($candidats)['score'] . ")");
            } else {
                error_log("❌ Stock {$stock['id']} insuffisant ({$quantiteDisponible} < {$quantiteDemandee})");
            }
        }
        
        if (empty($candidats)) {
            error_log("❌ Aucun stock candidat trouvé pour {$produitDemande}");
            return null;
        }
        
        error_log("📊 " . count($candidats) . " candidats trouvés, sélection du meilleur...");
        
        // Trier par score (le meilleur score en premier)
        usort($candidats, function($a, $b) {
            return $a['score'] <=> $b['score'];
        });
        
        $meilleurCandidat = $candidats[0]['stock'];
        $meilleurCandidat['quantite_disponible'] = $candidats[0]['quantite_disponible'];
        $meilleurCandidat['distance_client'] = $candidats[0]['distance_client'];
        $meilleurCandidat['distance_atelier'] = $candidats[0]['distance_atelier'];
        
        error_log("🏆 Meilleur stock sélectionné: {$meilleurCandidat['id']} ({$meilleurCandidat['nom']})");
        
        return $meilleurCandidat;
    }
    
    /**
     * 📋 Vérifier la quantité disponible d'un produit dans un stock - ADAPTÉ À VOTRE BDD
     */
    private function verifierQuantiteStockStrict($stockId, $produit) {
        try {
            error_log("Vérification stricte stock {$stockId} pour produit '{$produit}'");
            
            // Requête simplifiée selon VOTRE structure réelle (pas de jointure avec stocks)
            $sql = "
                SELECT quantite_disponible, produit 
                FROM produits_stocks 
                WHERE stock_id = ? AND produit = ? AND statut = 'disponible'
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$stockId, $produit]);
            $result = $stmt->fetch();
            
            if ($result && isset($result['quantite_disponible'])) {
                $quantite = max(0, $result['quantite_disponible']);
                error_log("✅ Quantité trouvée pour '{$result['produit']}' dans stock {$stockId}: {$quantite}");
                return $quantite;
            }
            
            // Essayer une recherche approximative pour les variations de nommage
            $sql = "
                SELECT quantite_disponible, produit 
                FROM produits_stocks 
                WHERE stock_id = ? AND produit LIKE ? AND statut = 'disponible'
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$stockId, "%{$produit}%"]);
            $result = $stmt->fetch();
            
            if ($result && isset($result['quantite_disponible'])) {
                $quantite = max(0, $result['quantite_disponible']);
                error_log("✅ Quantité trouvée (recherche approximative) pour '{$result['produit']}' dans stock {$stockId}: {$quantite}");
                return $quantite;
            }
            
            error_log("❌ Produit '{$produit}' non disponible dans stock {$stockId} - Retour 0");
            return 0;
            
        } catch (Exception $e) {
            error_log("💥 Erreur vérification stock stricte: " . $e->getMessage());
            return 0;
        }
    }
    
    /**
     * 📊 Calcul du score d'un stock (plus le score est bas, mieux c'est)
     */
    private function calculerScoreStock($distanceClient, $distanceAtelier, $quantiteDisponible, $quantiteRequise) {
        // Facteurs de pondération
        $poidsDistance = 0.6;      // Prioriser la proximité client
        $poidsStock = 0.3;         // Éviter les ruptures
        $poidsAtelier = 0.1;       // Distance depuis l'atelier
        
        // Normaliser la distance (0-1)
        $scoreDistance = min(1, $distanceClient / 100); // 100km = score max
        
        // Score stock (inversé - plus de stock = meilleur score)
        $ratioStock = $quantiteDisponible / max(1, $quantiteRequise);
        $scoreStock = 1 / max(1, $ratioStock); // Inverse pour que moins = mieux
        
        // Score atelier
        $scoreAtelier = min(1, $distanceAtelier / 200); // 200km = score max
        
        return ($scoreDistance * $poidsDistance) + 
               ($scoreStock * $poidsStock) + 
               ($scoreAtelier * $poidsAtelier);
    }
    
    /**
     * 🔒 Réserver une quantité dans un stock - ADAPTÉ À VOTRE STRUCTURE
     */
    private function reserverStock($stockId, $produit, $quantite) {
        try {
            error_log("Réservation: {$quantite} unités de '{$produit}' dans stock {$stockId}");
            
            // Mettre à jour directement dans produits_stocks
            $sql = "
                UPDATE produits_stocks 
                SET quantite_disponible = GREATEST(0, quantite_disponible - ?) 
                WHERE stock_id = ? AND produit = ? AND quantite_disponible >= ?
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$quantite, $stockId, $produit, $quantite]);
            
            if ($stmt->rowCount() > 0) {
                error_log("✅ Stock réservé avec succès - {$stmt->rowCount()} ligne(s) mise(s) à jour");
                
                // Mettre à jour la date de dernière modification
                $sqlDate = "
                    UPDATE produits_stocks 
                    SET date_derniere_maj = NOW() 
                    WHERE stock_id = ? AND produit = ?
                ";
                $stmtDate = $this->pdo->prepare($sqlDate);
                $stmtDate->execute([$stockId, $produit]);
                
            } else {
                error_log("⚠️ Aucune ligne mise à jour - Quantité insuffisante ou produit non trouvé");
            }
            
        } catch (Exception $e) {
            error_log("💥 Erreur réservation stock: " . $e->getMessage());
        }
    }
    
    /**
     * 📍 Calculer la distance entre deux points GPS
     */
    private function calculerDistance($lat1, $lng1, $lat2, $lng2) {
        if (!$lat1 || !$lng1 || !$lat2 || !$lng2) {
            return 9999; // Distance très élevée si coordonnées manquantes
        }
        
        $earthRadius = 6371; // Rayon de la Terre en km
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        
        $a = sin($dLat/2) * sin($dLat/2) + 
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * 
             sin($dLng/2) * sin($dLng/2);
             
        $c = 2 * atan2(sqrt($a), sqrt(1-$a));
        
        return $earthRadius * $c;
    }
    
    /**
     * 🔍 MÉTHODE DE DEBUG - Afficher tous les stocks et leurs produits
     */
    public function debugStocks() {
        try {
            error_log("=== DEBUG STOCKS - STRUCTURE PRODUITS_STOCKS ===");
            
            // Lister tous les produits par stock
            $sql = "
                SELECT stock_id, produit, quantite_disponible, quantite_minimale, 
                       quantite_maximale, unite_mesure, emplacement_stock, statut,
                       date_derniere_maj
                FROM produits_stocks 
                ORDER BY stock_id, produit
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $produits = $stmt->fetchAll();
            
            $stockActuel = null;
            foreach ($produits as $produit) {
                if ($stockActuel !== $produit['stock_id']) {
                    $stockActuel = $produit['stock_id'];
                    error_log("=== STOCK {$stockActuel} ===");
                }
                
                $info = sprintf(
                    "  - %s: %d %s (Min: %s, Max: %s, Statut: %s, Emplacement: %s)",
                    $produit['produit'],
                    $produit['quantite_disponible'],
                    $produit['unite_mesure'] ?? 'unité',
                    $produit['quantite_minimale'] ?? 'N/A',
                    $produit['quantite_maximale'] ?? 'N/A',
                    $produit['statut'],
                    $produit['emplacement_stock'] ?? 'N/A'
                );
                error_log($info);
            }
            
            // Afficher le résumé des produits disponibles
            error_log("=== RÉSUMÉ PRODUITS DISPONIBLES ===");
            $sql = "
                SELECT produit, 
                       COUNT(DISTINCT stock_id) as nb_stocks,
                       SUM(quantite_disponible) as quantite_totale,
                       GROUP_CONCAT(DISTINCT CONCAT('Stock ', stock_id, ':', quantite_disponible) SEPARATOR ', ') as details
                FROM produits_stocks 
                WHERE statut = 'disponible' AND quantite_disponible > 0
                GROUP BY produit
                ORDER BY produit
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $resume = $stmt->fetchAll();
            
            if ($resume) {
                foreach ($resume as $item) {
                    error_log("Produit: {$item['produit']} | Total: {$item['quantite_totale']} | Stocks: {$item['nb_stocks']} | Détails: {$item['details']}");
                }
            } else {
                error_log("Aucun produit disponible trouvé !");
            }
            
        } catch (Exception $e) {
            error_log("Erreur debug stocks: " . $e->getMessage());
        }
    }
    
    /**
     * 📊 Obtenir un rapport des stocks basé sur produits_stocks
     */
    public function obtenirRapportStocks() {
        try {
            $sql = "
                SELECT stock_id,
                       COUNT(DISTINCT produit) as nb_produits_differents,
                       SUM(quantite_disponible) as stock_total,
                       SUM(CASE WHEN quantite_disponible <= quantite_minimale THEN 1 ELSE 0 END) as produits_faibles,
                       AVG(quantite_disponible) as quantite_moyenne
                FROM produits_stocks
                WHERE statut = 'disponible'
                GROUP BY stock_id
                ORDER BY stock_total DESC
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            
            return $stmt->fetchAll();
            
        } catch (Exception $e) {
            error_log("Erreur rapport stocks: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * 🚨 Détecter les stocks faibles basé sur quantite_minimale
     */
    public function detecterStocksFaibles() {
        try {
            $sql = "
                SELECT stock_id, produit, quantite_disponible, quantite_minimale, 
                       unite_mesure, emplacement_stock, date_derniere_maj
                FROM produits_stocks
                WHERE quantite_disponible <= quantite_minimale 
                AND statut = 'disponible'
                ORDER BY quantite_disponible ASC
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            
            return $stmt->fetchAll();
            
        } catch (Exception $e) {
            error_log("Erreur détection stocks faibles: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * 🔄 Méthode pour simuler un réapprovisionnement
     */
    public function reapprovisionnerProduit($stockId, $produit, $quantiteAjout) {
        try {
            $sql = "
                UPDATE produits_stocks 
                SET quantite_disponible = quantite_disponible + ?,
                    date_derniere_maj = NOW()
                WHERE stock_id = ? AND produit = ?
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$quantiteAjout, $stockId, $produit]);
            
            if ($stmt->rowCount() > 0) {
                error_log("✅ Réapprovisionnement réussi: +{$quantiteAjout} {$produit} dans stock {$stockId}");
                return true;
            } else {
                error_log("❌ Échec réapprovisionnement: produit non trouvé");
                return false;
            }
            
        } catch (Exception $e) {
            error_log("💥 Erreur réapprovisionnement: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * 📈 Calculer l'efficacité de l'allocation
     */
    public function calculerEfficaciteAllocation($commandesValidees, $commandesTotales) {
        $tauxValidation = count($commandesTotales) > 0 ? 
            (count($commandesValidees) / count($commandesTotales)) * 100 : 0;
            
        $distanceMoyenne = 0;
        if (!empty($commandesValidees)) {
            $distances = array_column($commandesValidees, 'distance_stock');
            $distanceMoyenne = array_sum($distances) / count($distances);
        }
        
        return [
            'taux_validation' => round($tauxValidation, 2),
            'distance_moyenne_stock' => round($distanceMoyenne, 2),
            'commandes_validees' => count($commandesValidees),
            'commandes_rejetees' => count($commandesTotales) - count($commandesValidees),
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * 🎯 Rechercher des produits spécifiques dans tous les stocks
     */
    public function rechercherProduit($nomProduit) {
        try {
            $sql = "
                SELECT stock_id, produit, quantite_disponible, unite_mesure,
                       emplacement_stock, quantite_minimale, quantite_maximale,
                       date_derniere_maj
                FROM produits_stocks
                WHERE produit LIKE ? AND statut = 'disponible'
                ORDER BY quantite_disponible DESC
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute(["%{$nomProduit}%"]);
            
            return $stmt->fetchAll();
            
        } catch (Exception $e) {
            error_log("Erreur recherche produit: " . $e->getMessage());
            return [];
        }
    }
}

?>