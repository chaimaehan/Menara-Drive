<?php

/**
 * 🔍 DIAGNOSTIC PLANIFICATION CORRIGÉ
 * Adapté à votre vraie structure de BDD
 */
class DiagnosticPlanificationCorrige {
    private $pdo;
    
    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }
    
    /**
     * 🚀 Test complet adapté à votre structure
     */
    public function diagnostiquerProbleme($date = null) {
        echo "🔍 === DIAGNOSTIC PLANIFICATION CORRIGÉ === 🔍\n\n";
        
        // 1. Test de connexion BDD
        $this->testerConnexionBDD();
        
        // 2. Test d'extraction des données (corrigé)
        $donnees = $this->testerExtractionDonnees($date);
        
        if (!$donnees) {
            echo "❌ ARRÊT DU DIAGNOSTIC - Problème d'extraction des données\n";
            return false;
        }
        
        // 3. Test de validation avec votre logique métier
        $commandesValidees = $this->testerValidationLogique($donnees);
        
        // 4. Test de sélection des commandes
        $this->testerSelectionCommandes($donnees, $commandesValidees);
        
        // 5. Test de création de tournées
        $this->testerCreationTournees($donnees, $commandesValidees);
        
        // 6. Proposer des corrections spécifiques
        $this->proposerCorrections($donnees, $commandesValidees);
        
        return true;
    }
    
    /**
     * 🔌 Test connexion BDD
     */
    private function testerConnexionBDD() {
        echo "🔌 TEST CONNEXION BDD\n";
        echo str_repeat("-", 40) . "\n";
        
        try {
            $result = $this->pdo->query("SELECT 1")->fetchColumn();
            echo "✅ Connexion BDD: OK\n";
            
            // Compter les enregistrements avec vraies colonnes
            $tables = [
                'commandes' => "SELECT COUNT(*) FROM commandes WHERE livree = 0",
                'camions' => "SELECT COUNT(*) FROM camions WHERE statut = 'disponible'", 
                'stocks' => "SELECT COUNT(*) FROM stocks WHERE statut = 'actif'",
                'clients' => "SELECT COUNT(*) FROM clients"
            ];
            
            foreach ($tables as $nom => $requete) {
                try {
                    $count = $this->pdo->query($requete)->fetchColumn();
                    echo "✅ $nom: $count enregistrements utiles\n";
                } catch (Exception $e) {
                    echo "❌ $nom: ERREUR - " . $e->getMessage() . "\n";
                }
            }
            
        } catch (Exception $e) {
            echo "❌ Erreur connexion: " . $e->getMessage() . "\n";
            return false;
        }
        
        echo "\n";
        return true;
    }
    
    /**
     * 📊 Test extraction avec VRAIE structure
     */
    private function testerExtractionDonnees($date) {
        echo "📊 TEST EXTRACTION DES DONNÉES (CORRIGÉ)\n";
        echo str_repeat("-", 40) . "\n";
        
        try {
            $donnees = [
                'commandes' => $this->extraireCommandesCorrige($date),
                'camions' => $this->extraireCamionsCorrige(),
                'stocks' => $this->extraireStocksCorrige(),
                'clients' => $this->extraireClientsCorrige()
            ];
            
            echo "📦 Commandes non livrées: " . count($donnees['commandes']) . "\n";
            echo "🚛 Camions disponibles: " . count($donnees['camions']) . "\n";
            echo "🏪 Entrepôts actifs: " . count($donnees['stocks']) . "\n";
            echo "👥 Clients actifs: " . count($donnees['clients']) . "\n";
            
            // Détail des commandes avec vraies colonnes
            if (!empty($donnees['commandes'])) {
                echo "\n📋 DÉTAIL DES COMMANDES:\n";
                foreach (array_slice($donnees['commandes'], 0, 3) as $i => $commande) {
                    echo "  " . ($i+1) . ". ID: {$commande['id']}\n";
                    echo "     - Produit: " . ($commande['produit'] ?? 'N/A') . "\n";
                    echo "     - Quantité: " . ($commande['quantite'] ?? 'N/A') . "\n";
                    echo "     - Client: " . ($commande['client_nom'] ?? 'N/A') . "\n";
                    echo "     - Priorité: " . ($commande['priorite'] ?? 'normal') . "\n";
                    echo "     - Date limite: " . ($commande['date_limite'] ?? 'N/A') . "\n"; // ✅ Corrigé
                    echo "     - Lat/Lng: " . ($commande['latitude'] ?? 'N/A') . "/" . ($commande['longitude'] ?? 'N/A') . "\n";
                    echo "     - Distance atelier: " . ($commande['distance_atelier'] ?? 'Non calculée') . " km\n";
                    echo "\n";
                }
            }
            
            // Détail des entrepôts
            if (!empty($donnees['stocks'])) {
                echo "🏪 DÉTAIL DES ENTREPÔTS:\n";
                foreach ($donnees['stocks'] as $i => $stock) {
                    echo "  " . ($i+1) . ". {$stock['nom']}\n";
                    echo "     - Capacité actuelle: " . ($stock['capacite_actuelle'] ?? 'Non définie') . " unités\n"; // ✅ Corrigé
                    echo "     - Statut: " . ($stock['statut'] ?? 'Inconnu') . "\n";
                    echo "     - Adresse: " . substr($stock['adresse'] ?? 'N/A', 0, 30) . "\n";
                    echo "     - Lat/Lng: " . ($stock['latitude'] ?? 'N/A') . "/" . ($stock['longitude'] ?? 'N/A') . "\n";
                    echo "\n";
                }
            }
            
            echo "\n";
            return $donnees;
            
        } catch (Exception $e) {
            echo "❌ Erreur extraction: " . $e->getMessage() . "\n\n";
            return false;
        }
    }
    
    /**
     * 🏪 Test de validation logique (pas de correspondance produit-stock)
     */
    private function testerValidationLogique($donnees) {
        echo "🏪 TEST VALIDATION LOGIQUE MÉTIER\n";
        echo str_repeat("-", 40) . "\n";
        
        if (empty($donnees['commandes'])) {
            echo "❌ Aucune commande à traiter\n\n";
            return [];
        }
        
        // Dans votre cas, les "stocks" sont des entrepôts
        // La logique semble être : assigner les commandes aux entrepôts les plus proches
        $commandesValidees = [];
        
        foreach ($donnees['commandes'] as $commande) {
            echo "Commande ID {$commande['id']} - Produit: {$commande['produit']}\n";
            
            // 1. Vérifier que le client a des coordonnées
            if (empty($commande['latitude']) || empty($commande['longitude'])) {
                echo "  ❌ Pas de coordonnées client\n\n";
                continue;
            }
            
            // 2. Trouver l'entrepôt le plus proche avec capacité
            $entrepotOptimal = null;
            $distanceMin = 9999;
            
            foreach ($donnees['stocks'] as $stock) {
                if ($stock['statut'] !== 'actif' || $stock['capacite_actuelle'] <= 0) {
                    continue;
                }
                
                $distance = $this->calculerDistance(
                    $commande['latitude'], $commande['longitude'],
                    $stock['latitude'], $stock['longitude']
                );
                
                if ($distance < $distanceMin) {
                    $distanceMin = $distance;
                    $entrepotOptimal = $stock;
                }
            }
            
            if ($entrepotOptimal) {
                $commande['entrepot_assigne'] = $entrepotOptimal;
                $commande['distance_entrepot'] = $distanceMin;
                $commandesValidees[] = $commande;
                echo "  ✅ Entrepôt assigné: {$entrepotOptimal['nom']} (distance: " . round($distanceMin, 1) . " km)\n";
            } else {
                echo "  ❌ Aucun entrepôt disponible\n";
            }
            echo "\n";
        }
        
        echo "📊 Résultat validation:\n";
        echo "✅ Commandes validées: " . count($commandesValidees) . "/" . count($donnees['commandes']) . "\n\n";
        
        return $commandesValidees;
    }
    
    /**
     * 🎯 Test sélection commandes avec vraie logique
     */
    private function testerSelectionCommandes($donnees, $commandesValidees) {
        echo "🎯 TEST SÉLECTION DES COMMANDES\n";
        echo str_repeat("-", 40) . "\n";
        
        if (empty($commandesValidees)) {
            echo "❌ Aucune commande validée à sélectionner\n\n";
            return;
        }
        
        // Filtrer seulement les camions VRAIMENT disponibles
        $camionsDisponibles = array_filter($donnees['camions'], function($camion) {
            return $camion['statut'] === 'disponible';
        });
        
        if (empty($camionsDisponibles)) {
            echo "❌ Aucun camion disponible (statut = 'disponible')\n";
            echo "📋 Statuts des camions trouvés:\n";
            foreach ($donnees['camions'] as $camion) {
                echo "  - Camion {$camion['id']}: {$camion['statut']}\n";
            }
            echo "\n";
            return;
        }
        
        echo "✅ Camions disponibles trouvés: " . count($camionsDisponibles) . "\n\n";
        
        $config = [
            'maxDistance' => 800,
            'maxClients' => 12,
            'tempsMaxJournee' => 12
        ];
        
        foreach (array_slice($camionsDisponibles, 0, 2) as $i => $camion) {
            echo "🚛 CAMION {$camion['code']} (ID: {$camion['id']})\n";
            echo "Capacité: {$camion['capacite']} unités\n";
            echo "Position: {$camion['latitude']}, {$camion['longitude']}\n";
            
            $commandesSelectionnees = [];
            $poidsTotal = 0;
            
            foreach ($commandesValidees as $commande) {
                $quantite = $commande['quantite'] ?? 1;
                $distance = $commande['distance_atelier'] ?? 0;
                
                echo "  Commande ID {$commande['id']}:\n";
                echo "    - Quantité: $quantite | Distance: " . round($distance, 1) . " km\n";
                
                $raisons = [];
                
                if (($poidsTotal + $quantite) > $camion['capacite']) {
                    $raisons[] = "Capacité dépassée (" . ($poidsTotal + $quantite) . " > {$camion['capacite']})";
                }
                
                if ($distance > $config['maxDistance']) {
                    $raisons[] = "Distance excessive ($distance > {$config['maxDistance']})";
                }
                
                if (count($commandesSelectionnees) >= $config['maxClients']) {
                    $raisons[] = "Limite clients atteinte";
                }
                
                if (empty($raisons)) {
                    $commandesSelectionnees[] = $commande;
                    $poidsTotal += $quantite;
                    echo "    ✅ ACCEPTÉE (Total: $poidsTotal/{$camion['capacite']})\n";
                } else {
                    echo "    ❌ REJETÉE: " . implode(', ', $raisons) . "\n";
                }
                echo "\n";
            }
            
            echo "📊 Camion {$camion['code']}: " . count($commandesSelectionnees) . " commandes sélectionnées\n";
            echo "📦 Charge totale: $poidsTotal/{$camion['capacite']} (" . round(($poidsTotal / $camion['capacite']) * 100, 1) . "%)\n";
            
            if (!empty($commandesSelectionnees)) {
                echo "✅ Ce camion PEUT créer une tournée !\n";
            } else {
                echo "❌ Ce camion ne peut PAS créer de tournée\n";
            }
            echo str_repeat("-", 50) . "\n\n";
        }
    }
    
    /**
     * 🗂️ Test création tournées
     */
    private function testerCreationTournees($donnees, $commandesValidees) {
        echo "🗂️ TEST CRÉATION DE TOURNÉES\n";
        echo str_repeat("-", 40) . "\n";
        
        $camionsDisponibles = array_filter($donnees['camions'], function($camion) {
            return $camion['statut'] === 'disponible';
        });
        
        if (empty($commandesValidees) || empty($camionsDisponibles)) {
            echo "❌ Données insuffisantes\n";
            echo "  - Commandes validées: " . count($commandesValidees) . "\n";
            echo "  - Camions disponibles: " . count($camionsDisponibles) . "\n\n";
            return;
        }
        
        $camion = array_values($camionsDisponibles)[0];
        $commandesTest = array_slice($commandesValidees, 0, min(3, count($commandesValidees)));
        
        echo "🧪 Test avec camion {$camion['code']} et " . count($commandesTest) . " commandes\n\n";
        
        try {
            $tournee = [
                'vehicule_id' => $camion['id'],
                'vehicule_code' => $camion['code'],
                'etapes' => [],
                'livraisons' => [],
                'distance_totale' => 0,
                'temps_total' => 0,
                'charge_totale' => 0
            ];
            
            // Position de départ du camion
            $positionDepart = [
                'nom' => 'Position Camion',
                'latitude' => $camion['latitude'],
                'longitude' => $camion['longitude']
            ];
            
            $tournee['etapes'][] = $positionDepart;
            $positionActuelle = $positionDepart;
            
            foreach ($commandesTest as $commande) {
                $etapeClient = [
                    'nom' => $commande['client_nom'],
                    'latitude' => $commande['latitude'],
                    'longitude' => $commande['longitude'],
                    'type' => 'livraison'
                ];
                
                $tournee['etapes'][] = $etapeClient;
                
                // Calculer distance depuis position actuelle
                $distance = $this->calculerDistance(
                    $positionActuelle['latitude'], $positionActuelle['longitude'],
                    $etapeClient['latitude'], $etapeClient['longitude']
                );
                
                $tournee['distance_totale'] += $distance;
                $tournee['temps_total'] += 30; // 30 min par livraison
                $tournee['charge_totale'] += $commande['quantite'];
                
                $tournee['livraisons'][] = [
                    'commande_id' => $commande['id'],
                    'client_nom' => $commande['client_nom'],
                    'produit' => $commande['produit'],
                    'quantite' => $commande['quantite'],
                    'distance_parcourue' => round($distance, 1)
                ];
                
                $positionActuelle = $etapeClient;
            }
            
            // Retour au dépôt/atelier principal
            $distanceRetour = $this->calculerDistance(
                $positionActuelle['latitude'], $positionActuelle['longitude'],
                33.5731, -7.5898 // Casablanca centre
            );
            $tournee['distance_totale'] += $distanceRetour;
            
            $tournee['etapes'][] = [
                'nom' => 'Retour Dépôt',
                'latitude' => 33.5731,
                'longitude' => -7.5898
            ];
            
            echo "✅ Tournée créée avec succès !\n";
            echo "🚛 Véhicule: {$tournee['vehicule_code']}\n";
            echo "📍 Étapes: " . count($tournee['etapes']) . "\n";
            echo "📦 Livraisons: " . count($tournee['livraisons']) . "\n";
            echo "📏 Distance totale: " . round($tournee['distance_totale'], 1) . " km\n";
            echo "⏱️  Temps estimé: " . round($tournee['temps_total'] / 60, 1) . " h\n";
            echo "⚖️  Charge totale: {$tournee['charge_totale']}/{$camion['capacite']} unités\n";
            echo "💰 Coût estimé: " . round($tournee['distance_totale'] * 1.2, 0) . " DH\n\n";
            
            echo "📋 Détail des livraisons:\n";
            foreach ($tournee['livraisons'] as $i => $livraison) {
                echo "  " . ($i+1) . ". {$livraison['client_nom']}\n";
                echo "     - {$livraison['produit']} (qty: {$livraison['quantite']})\n";
                echo "     - Distance: {$livraison['distance_parcourue']} km\n\n";
            }
            
            return $tournee;
            
        } catch (Exception $e) {
            echo "❌ Erreur création tournée: " . $e->getMessage() . "\n\n";
            return null;
        }
    }
    
    /**
     * 💡 Corrections spécifiques à votre structure
     */
    private function proposerCorrections($donnees, $commandesValidees) {
        echo "💡 RECOMMANDATIONS SPÉCIFIQUES\n";
        echo str_repeat("=", 50) . "\n";
        
        $corrections = [];
        
        // 1. Problème de camions disponibles
        $camionsDispos = array_filter($donnees['camions'], fn($c) => $c['statut'] === 'disponible');
        if (empty($camionsDispos)) {
            $corrections[] = [
                'probleme' => 'Aucun camion avec statut "disponible"',
                'solution' => 'Changer le statut des camions "en_route" vers "disponible" si nécessaire',
                'code' => "UPDATE camions SET statut = 'disponible' WHERE id IN (1, 6) -- Ajustez les IDs"
            ];
        }
        
        // 2. Problème de structure stocks vs produits
        $corrections[] = [
            'probleme' => 'Confusion entre entrepôts (stocks) et produits en stock',
            'solution' => 'Créer une table "produits_stock" pour lier produits et entrepôts',
            'code' => "CREATE TABLE produits_stock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stock_id INT,
    nom_produit VARCHAR(100),
    quantite_disponible INT,
    FOREIGN KEY (stock_id) REFERENCES stocks(id)
);"
        ];
        
        // 3. Problème de date_livraison
        $corrections[] = [
            'probleme' => 'Utilisation de date_limite au lieu de date_livraison',
            'solution' => 'Adapter les requêtes pour utiliser date_limite',
            'code' => "// Remplacer dans vos requêtes :
// DATE(c.date_livraison) = ?
// Par :
// DATE(c.date_limite) = ?"
        ];
        
        // 4. Problème de coordonnées manquantes
        $clientsSansCoord = 0;
        foreach ($donnees['commandes'] as $cmd) {
            if (empty($cmd['latitude']) || empty($cmd['longitude'])) {
                $clientsSansCoord++;
            }
        }
        
        if ($clientsSansCoord > 0) {
            $corrections[] = [
                'probleme' => "$clientsSansCoord commandes sans coordonnées client",
                'solution' => 'Géocoder les adresses manquantes ou utiliser des coordonnées par défaut',
                'code' => "UPDATE clients SET 
    latitude = 31.6295, longitude = -7.9811 
WHERE latitude IS NULL OR latitude = 0;"
            ];
        }
        
        foreach ($corrections as $i => $correction) {
            echo "\n🔧 CORRECTION " . ($i+1) . ":\n";
            echo "❌ Problème: {$correction['probleme']}\n";
            echo "✅ Solution: {$correction['solution']}\n";
            echo "💻 Code:\n```sql\n{$correction['code']}\n```\n";
        }
        
        echo "\n🎯 MODIFICATIONS À APPORTER À VOTRE CODE PRINCIPAL:\n";
        echo "```php\n";
        echo "// 1. Corriger extraireStocks():\n";
        echo "private function extraireStocks() {\n";
        echo "    return \$this->pdo->query(\"\n";
        echo "        SELECT * FROM stocks \n";
        echo "        WHERE statut = 'actif' AND capacite_actuelle > 0\n";
        echo "    \")->fetchAll();\n";
        echo "}\n\n";
        
        echo "// 2. Corriger extraireCommandes() - date_limite au lieu de date_livraison:\n";
        echo "if (\$date) {\n";
        echo "    \$sql .= \" AND DATE(c.date_limite) = ?\";\n";
        echo "}\n\n";
        
        echo "// 3. Corriger extraireCamions() - seulement les disponibles:\n";
        echo "return \$this->pdo->query(\"\n";
        echo "    SELECT c.*, ch.nom as chauffeur_nom \n";
        echo "    FROM camions c \n";
        echo "    LEFT JOIN chauffeurs ch ON c.chauffeur_id = ch.id \n";
        echo "    WHERE c.statut = 'disponible'\n";
        echo "\")->fetchAll();\n";
        echo "```\n";
    }
    
    // ==========================================
    // MÉTHODES D'EXTRACTION CORRIGÉES
    // ==========================================
    
    private function extraireCommandesCorrige($date) {
        $sql = "SELECT 
                    c.*,
                    cl.nom as client_nom,
                    cl.adresse,
                    cl.telephone,
                    cl.latitude,
                    cl.longitude
                FROM commandes c
                LEFT JOIN clients cl ON c.client_id = cl.id
                WHERE c.livree = 0";
        
        if ($date) {
            $sql .= " AND DATE(c.date_limite) = ?"; // ✅ Corrigé : date_limite
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$date]);
        } else {
            $stmt = $this->pdo->query($sql);
        }
        
        $commandes = $stmt->fetchAll();
        
        // Calculer distances
        foreach ($commandes as &$commande) {
            if ($commande['latitude'] && $commande['longitude']) {
                $commande['distance_atelier'] = $this->calculerDistance(
                    33.5731, -7.5898, // Position atelier Casablanca
                    $commande['latitude'], $commande['longitude']
                );
            } else {
                $commande['distance_atelier'] = 9999;
            }
        }
        
        return $commandes;
    }
    
    private function extraireCamionsCorrige() {
        return $this->pdo->query("
            SELECT c.*, ch.nom as chauffeur_nom 
            FROM camions c 
            LEFT JOIN chauffeurs ch ON c.chauffeur_id = ch.id 
            WHERE c.statut = 'disponible'
        ")->fetchAll();
    }
    
    private function extraireStocksCorrige() {
        return $this->pdo->query("
            SELECT * FROM stocks 
            WHERE statut = 'actif' AND capacite_actuelle > 0
        ")->fetchAll();
    }
    
    private function extraireClientsCorrige() {
        return $this->pdo->query("SELECT * FROM clients")->fetchAll();
    }
    
    private function calculerDistance($lat1, $lng1, $lat2, $lng2) {
        if (!$lat1 || !$lng1 || !$lat2 || !$lng2) return 9999;
        
        $earthRadius = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        
        $a = sin($dLat/2) * sin($dLat/2) + 
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * 
             sin($dLng/2) * sin($dLng/2);
             
        return round($earthRadius * 2 * atan2(sqrt($a), sqrt(1-$a)), 2);
    }
}

// ===================================
// EXÉCUTION
// ===================================

try {
    $dsn = "mysql:host=localhost;dbname=optitruck_db;charset=utf8mb4";
    $username = "root";
    $password = "";
    
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
    ]);
    
    $date = $_GET['date'] ?? null;
    
    $diagnostic = new DiagnosticPlanificationCorrige($pdo);
    $diagnostic->diagnostiquerProbleme($date);
    
} catch (Exception $e) {
    echo "💥 ERREUR CRITIQUE: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}

?>