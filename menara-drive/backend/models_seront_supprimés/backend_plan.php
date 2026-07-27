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



// =================== CONFIGURATION SYSTÈME V5.0 ===================
class SystemConfig {
    // Paramètres de performance
    const VITESSE_VILLE = 35;          // km/h
    const VITESSE_ROUTE = 65;          // km/h  
    const VITESSE_AUTOROUTE = 95;      // km/h
    
    // Temps opérationnels (minutes)
    const TEMPS_CHARGEMENT_BASE = 8;
    const TEMPS_CHARGEMENT_TONNE = 2.5;
    const TEMPS_ARRET_CLIENT = 12;
    const TEMPS_PAUSE_LEGALE = 45;
    
    // Coûts dynamiques
    const COUT_KM_BASE = 0.87;
    const COUT_HEURE_STANDARD = 29;
    const COUT_HEURE_EXPERT = 34;
    const COUT_HEURE_SUP = 43.5;
    
    // Contraintes légales
    const MAX_HEURES_TRAVAIL = 10;
    const MAX_CONDUITE_CONTINUE = 4.5;
    const HEURE_DEBUT = '07:30';
    const HEURE_FIN = '17:30';
    
    // Algorithme IA
    const POPULATION_GENETIQUE = 120;
    const GENERATIONS_MAX = 200;
    const TAUX_MUTATION = 0.08;
    const TAUX_CROISEMENT = 0.75;
}

// =================== ENTITÉS MÉTIER ENRICHIES ===================

class CommandeIntelligente {
    public $id, $client_id, $produit, $quantite, $priorite;
    public $latitude, $longitude, $adresse, $telephone;
    public $type_client, $volume_mensuel, $date_limite;
    public $score_urgence = 0, $complexite = 1, $rentabilite = 1;
    public $contraintes_temporelles = [];
    public $historique_performance = [];
    public $cluster;

    public function __construct($data) {
        foreach ($data as $key => $value) {
            if (property_exists($this, $key)) {
                $this->$key = $value;
            }
        }
        $this->analyserCommande();
    }
    
    private function analyserCommande() {
        // Score d'urgence multi-factoriel
        $this->score_urgence = $this->calculerUrgence();
        
        // Analyse de complexité
        $this->complexite = $this->evaluerComplexite();
        
        // Score de rentabilité
        $this->rentabilite = $this->calculerRentabilite();
        
        // Contraintes temporelles intelligentes
        $this->definirContraintesTemporelles();
    }
    
    private function calculerUrgence() {
        $score = 0;
        
        // Priorité métier
        $priorites = [
            'critique' => 100, 'urgente' => 80, 'haute' => 60, 
            'moyenne' => 40, 'normale' => 20, 'basse' => 10
        ];
        $score += $priorites[$this->priorite] ?? 20;
        
        // Impact client
        $impacts_client = [
            'vip' => 60, 'premium' => 45, 'entreprise' => 30,
            'grossiste' => 25, 'particulier' => 15
        ];
        $score += $impacts_client[$this->type_client] ?? 15;
        
        // Volume d'affaires
        if ($this->volume_mensuel > 2000) $score += 35;
        elseif ($this->volume_mensuel > 1000) $score += 25;
        elseif ($this->volume_mensuel > 500) $score += 15;
        elseif ($this->volume_mensuel > 100) $score += 8;
        
        // Facteur temporel (urgence croissante)
        if (isset($this->date_limite)) {
            $heures_restantes = (strtotime($this->date_limite) - time()) / 3600;
            if ($heures_restantes < 4) $score += 50;
            elseif ($heures_restantes < 12) $score += 30;
            elseif ($heures_restantes < 24) $score += 15;
        }
        
        return min(250, $score); // Cap à 250
    }
    
    private function evaluerComplexite() {
        $complexite = 1.0;
        
        // Complexité géographique
        if ($this->latitude < 31.4 || $this->latitude > 31.8) $complexite += 0.3;
        if ($this->longitude < -8.5 || $this->longitude > -7.5) $complexite += 0.2;
        
        // Complexité quantitative
        if ($this->quantite > 500) $complexite += 0.4;
        elseif ($this->quantite > 200) $complexite += 0.2;
        
        // Complexité client
        /*if ($this->type_client === 'particulier' && $this->quantite > 100) $complexite += 0.3;
        if (stripos($this->adresse, 'étage') !== false) $complexite += 0.2;
        if (stripos($this->adresse, 'centre') !== false) $complexite += 0.1;*/
        
        return min(3.0, $complexite);
    }
    
    private function calculerRentabilite() {
        $base = 1.0;
        
        // Rentabilité par volume
        $ratio_volume = $this->volume_mensuel / max($this->quantite, 1);
        $base += min(1.0, $ratio_volume / 100);
        
        // Bonus client fidèle/important
        if ($this->type_client === 'vip') $base += 0.5;
        if ($this->volume_mensuel > 1000) $base += 0.3;
        
        // Malus distance excessive (estimation grossière)
        $distance_atelier = $this->estimerDistanceAtelier();
        if ($distance_atelier > 40) $base -= 0.3;
        elseif ($distance_atelier > 25) $base -= 0.1;
        
        return max(0.3, $base);
    }
    
    public function estimerDistanceAtelier()  {
        // Position approximative atelier Souihla
        $lat_atelier = 31.584044;
        $lon_atelier = -8.102375;
        
        return $this->calculerDistance($lat_atelier, $lon_atelier, $this->latitude, $this->longitude);
    }
    
   private function calculerDistance($lat1, $lon1, $lat2, $lon2) {
    $earth_radius = 6371;

    // Validation des paramètres : conversion en float ou 0 si invalide
    $lat1 = is_numeric($lat1) ? floatval($lat1) : 0;
    $lat2 = is_numeric($lat2) ? floatval($lat2) : 0;
    $lon1 = is_numeric($lon1) ? floatval($lon1) : 0;
    $lon2 = is_numeric($lon2) ? floatval($lon2) : 0;

    $dLat = deg2rad($lat2 - $lat1);
    $dLon = deg2rad($lon2 - $lon1);
    $a = sin($dLat / 2) * sin($dLat / 2) +
         cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
         sin($dLon / 2) * sin($dLon / 2);
    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
    return $earth_radius * $c;
}

    
    private function definirContraintesTemporelles() {
        // Créneaux préférentiels selon le type de client
        switch ($this->type_client) {
            case 'entreprise':
                $this->contraintes_temporelles = [
                    'creneau_optimal' => ['08:00', '11:30'],
                    'creneau_acceptable' => ['14:00', '16:30'],
                    'creneau_eviter' => ['12:00', '14:00']
                ];
                break;
            case 'particulier':
                $this->contraintes_temporelles = [
                    'creneau_optimal' => ['14:00', '17:00'],
                    'creneau_acceptable' => ['09:00', '12:00'],
                    'samedi_ok' => true
                ];
                break;
            case 'vip':
                $this->contraintes_temporelles = [
                    'creneau_optimal' => ['09:00', '11:00'],
                    'ponctualite_critique' => true,
                    'marge_securite' => 15 // minutes
                ];
                break;
        }
    }
}

class VehiculeIntelligent {
    public $id, $code, $capacite, $type_vehicule, $type_carburant;
    public $chauffeur_id, $chauffeur_nom, $experience ;
    public $position_actuelle, $specialites, $zone_preferee;
    public $performance = [], $cout_km, $cout_heure;
    public $disponibilite = [], $fatigue_score = 0;
    
    public function __construct($data) {
        foreach ($data as $key => $value) {
            if (property_exists($this, $key)) {
                $this->$key = $value;
            }
        }
        $this->analyserVehicule();
    }
    
    private function analyserVehicule() {
        $this->calculerCouts();
        $this->evaluerPerformance();
        $this->analyserDisponibilite();
    }
    
    private function calculerCouts() {
        // Coût par km selon le véhicule
        $multiplicateurs = [
            'leger' => 0.9, 'moyen' => 1.0, 'lourd' => 1.3,
            'frigorifique' => 1.4, 'benne' => 1.2
        ];
        
        $this->cout_km = SystemConfig::COUT_KM_BASE * 
                        ($multiplicateurs[$this->type_vehicule] ?? 1.0);
        
        // Coût horaire chauffeur
        $this->cout_heure = $this->experience >= 5 ? 
                           SystemConfig::COUT_HEURE_EXPERT : 
                           SystemConfig::COUT_HEURE_STANDARD;
    }
    
    private function evaluerPerformance() {
        $this->performance = [
            'ponctualite' => $this->calculerScorePonctualite(),
            'efficacite' => $this->calculerScoreEfficacite(),
            'polyvalence' => $this->calculerScorePolyvalence(),
            'fiabilite' => $this->calculerScoreFiabilite()
        ];
    }
    
    private function calculerScorePonctualite() {
        // Score basé sur l'historique (simulation)
        $base = 75 + ($this->experience * 3);
        
        // Bonus/malus selon spécialités
        if (strpos($this->specialites ?? '', 'ponctuel') !== false) $base += 10;
        if (strpos($this->specialites ?? '', 'retard') !== false) $base -= 15;
        
        return min(100, max(40, $base));
    }
    
    private function calculerScoreEfficacite() {
        $base = 70 + ($this->experience * 2.5);
        
        // Bonus véhicule adapté
        if ($this->type_vehicule === 'leger' && $this->capacite <= 100) $base += 5;
        if ($this->type_vehicule === 'moyen' && $this->capacite > 100) $base += 8;
        
        return min(100, max(30, $base));
    }
    
    private function calculerScorePolyvalence() {
        $score = 50;
        
        $specialites_array = explode(',', $this->specialites ?? '');
        $score += count($specialites_array) * 8;
        
        // Bonus expérience
        $score += min(30, $this->experience * 4);
        
        return min(100, $score);
    }
    
    private function calculerScoreFiabilite() {
        // Score composite de fiabilité
        return ($this->performance['ponctualite'] ?? 75) * 0.4 + 
               ($this->performance['efficacite'] ?? 70) * 0.6;
    }
    
    private function analyserDisponibilite() {
        // Analyse de la disponibilité et fatigue (simplifiée)
        $this->disponibilite = [
            'heures_travaillees_semaine' => rand(35, 45),
            'jours_consecutifs' => rand(0, 6),
            'derniere_pause' => date('H:i', strtotime('-' . rand(60, 240) . ' minutes'))
        ];
        
        $this->fatigue_score = $this->calculerScoreFatigue();
    }
    
    private function calculerScoreFatigue() {
        $fatigue = 0;
        
        // Fatigue basée sur les heures travaillées
        $heures = $this->disponibilite['heures_travaillees_semaine'];
        if ($heures > 40) $fatigue += ($heures - 40) * 2;
        
        // Fatigue jours consécutifs
        $jours = $this->disponibilite['jours_consecutifs'];
        if ($jours > 5) $fatigue += ($jours - 5) * 10;
        
        return min(100, $fatigue);
    }
    
    public function calculerCompatibilite($commande) {
        $score = 100;
        
        // Vérification capacité
        if ($this->capacite < $commande->quantite) return 0;
        
        // Compatibilité géographique
        if ($this->zone_preferee) {
            $distance_zone = $this->calculerDistanceZone($commande);
            if ($distance_zone > 30) $score -= 20;
            elseif ($distance_zone > 15) $score -= 10;
        }
        
        // Compatibilité type de livraison
        $score += $this->calculerBonusSpecialisation($commande);
        
        // Pénalité fatigue
        $score -= $this->fatigue_score * 0.3;
        
        // Bonus performance
        $score += $this->performance['fiabilite'] * 0.2;
        
        return max(0, min(100, $score));
    }
    
    private function calculerDistanceZone($commande) {
        // Simulation de calcul de distance à la zone préférée
        return rand(5, 50);
    }
    
    private function calculerBonusSpecialisation($commande) {
        $bonus = 0;
        
        $specialites = explode(',', $this->specialites ?? '');
        
        // Bonus selon le type de produit/client
       /* if (in_array('vip', $specialites) && $commande->type_client === 'vip') $bonus += 15;
        if (in_array('fragile', $specialites) && stripos($commande->produit, 'fragile') !== false) $bonus += 10;
        if (in_array('volumineux', $specialites) && $commande->quantite > 200) $bonus += 8;*/
        
        return $bonus;
    }
}

// =================== MOTEUR D'IA AVANCÉ ===================

class MoteurIAv5 {
    private $pdo;
    private $historique = [];
    private $modeles_ml = [];
    private $cache_predictions = [];
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->chargerHistoriqueComplet();
        $this->initialiserModelesML();
    }
    
    private function chargerHistoriqueComplet() {
        $stmt = $this->pdo->query("
            SELECT 
                l.*,
                c.latitude as client_lat, c.longitude as client_lon,
                c.type_client, c.volume_mensuel,
                s.latitude as stock_lat, s.longitude as stock_lon,
                ch.nom as chauffeur_nom, 
                cam.type_vehicule, cam.capacite,
                HOUR(l.completed_at) as heure_livraison,
                DAYOFWEEK(l.completed_at) as jour_semaine,
                MONTH(l.completed_at) as mois,
                YEAR(l.completed_at) as annee,
                TIMESTAMPDIFF(MINUTE, l.heure_prevue, l.completed_at) as retard_minutes,
                CASE 
                    WHEN l.completed_at <= l.heure_prevue THEN 'excellent'
                    WHEN l.completed_at <= DATE_ADD(l.heure_prevue, INTERVAL 15 MINUTE) THEN 'bon'
                    WHEN l.completed_at <= DATE_ADD(l.heure_prevue, INTERVAL 30 MINUTE) THEN 'acceptable'
                    ELSE 'mauvais'
                END as performance_classe,
                (l.distance / NULLIF(l.temps_reel_minutes, 0) * 60) as vitesse_moyenne
            FROM livraisons l
            JOIN clients c ON l.client_id = c.id
            JOIN stocks s ON l.stock_id = s.id
            JOIN chauffeurs ch ON l.chauffeur_id = ch.id
            JOIN camions cam ON l.camion_id = cam.id
            WHERE l.completed_at >= DATE_SUB(NOW(), INTERVAL 18 MONTH)
            AND l.distance > 0 AND l.temps_reel_minutes > 0
            ORDER BY l.completed_at DESC
        ");
        
        $this->historique = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    private function initialiserModelesML() {
        $this->modeles_ml = [
            'temps_trajet' => $this->construireModeleTempsTrajet(),
            'cout_reel' => $this->construireModeleCout(),
            'satisfaction' => $this->construireModeleSatisfaction(),
            'performance_chauffeur' => $this->construireModelePerformanceChauffeur(),
            'probabilite_retard' => $this->construireModeleProbabiliteRetard()
        ];
    }
    
    private function construireModeleTempsTrajet() {
        if (empty($this->historique)) return ['coefficients' => [], 'intercept' => 0];
        
        $donnees_entrainement = [];
        foreach ($this->historique as $livraison) {
            if ($livraison['temps_reel_minutes'] > 0 && $livraison['distance'] > 0) {
                $donnees_entrainement[] = [
                    'distance' => $livraison['distance'],
                    'heure' => $livraison['heure_livraison'],
                    'jour_semaine' => $livraison['jour_semaine'],
                    'type_vehicule' => $this->encoderTypeVehicule($livraison['type_vehicule']),
                    'experience_chauffeur' => $livraison['experience'] ?? 5,
                    'volume_client' => min(10, $livraison['volume_mensuel'] / 100),
                    'temps_reel' => $livraison['temps_reel_minutes']
                ];
            }
        }
        
        return $this->regressionMultiple($donnees_entrainement, 'temps_reel');
    }
    
    private function construireModeleCout() {
        $donnees_cout = [];
        foreach ($this->historique as $livraison) {
            if ($livraison['cout_reel'] > 0) {
                $donnees_cout[] = [
                    'distance' => $livraison['distance'],
                    'temps' => $livraison['temps_reel_minutes'],
                    'type_vehicule' => $this->encoderTypeVehicule($livraison['type_vehicule']),
                    'cout_reel' => $livraison['cout_reel']
                ];
            }
        }
        
        return $this->regressionMultiple($donnees_cout, 'cout_reel');
    }
    
    private function construireModeleSatisfaction() {
        $donnees_satisfaction = [];
        foreach ($this->historique as $livraison) {
            $score = $this->calculerScoreSatisfaction($livraison);
            $donnees_satisfaction[] = [
                'retard_minutes' => max(0, $livraison['retard_minutes']),
                'distance' => $livraison['distance'],
                'type_client' => $this->encoderTypeClient($livraison['type_client']),
                'heure_livraison' => $livraison['heure_livraison'],
                'satisfaction' => $score
            ];
        }
        
        return $this->regressionMultiple($donnees_satisfaction, 'satisfaction');
    }
    
    private function regressionMultiple($donnees, $variable_cible) {
        if (empty($donnees)) return ['coefficients' => [], 'intercept' => 0];
        
        $n = count($donnees);
        $variables = array_keys($donnees[0]);
        $variables = array_filter($variables, fn($v) => $v !== $variable_cible);
        
        // Matrice X (variables indépendantes)
        $X = [];
        $y = [];
        
        foreach ($donnees as $row) {
            $x_row = [1]; // Intercept
            foreach ($variables as $var) {
                $x_row[] = $row[$var] ?? 0;
            }
            $X[] = $x_row;
            $y[] = $row[$variable_cible];
        }
        
        // Calcul des coefficients (méthode des moindres carrés simplifiée)
        $coefficients = $this->moindresCarres($X, $y);
        
        return [
            'coefficients' => array_combine(array_merge(['intercept'], $variables), $coefficients),

            'variables' => $variables,
            'n_samples' => $n,
            'r_squared' => $this->calculerR2($X, $y, $coefficients)
        ];
    }
    
   private function moindresCarres($X, $y) {
    $n = count($X);
    if ($n === 0) return [];

    $m = count($X[0]);
    
    // Calcul de X'X
    $XtX = [];
    for ($i = 0; $i < $m; $i++) {
        for ($j = 0; $j < $m; $j++) {
            $sum = 0;
            for ($k = 0; $k < $n; $k++) {
                $val_i = isset($X[$k][$i]) ? (float)$X[$k][$i] : 0;
                $val_j = isset($X[$k][$j]) ? (float)$X[$k][$j] : 0;
                $sum += $val_i * $val_j;
            }
            $XtX[$i][$j] = $sum;
        }
    }
    
    // Calcul de X'y
    $Xty = [];
    for ($i = 0; $i < $m; $i++) {
        $sum = 0;
        for ($k = 0; $k < $n; $k++) {
            $val_i = isset($X[$k][$i]) ? (float)$X[$k][$i] : 0;
            $val_y = isset($y[$k]) ? (float)$y[$k] : 0;
            $sum += $val_i * $val_y;
        }
        $Xty[$i] = $sum;
    }
    
    // Résolution du système (méthode de Gauss simplifiée)
    return $this->resoudreSystemeLineaire($XtX, $Xty);
}

    
    private function resoudreSystemeLineaire($A, $b) {
        $n = count($A);
        
        // Élimination de Gauss
        for ($i = 0; $i < $n; $i++) {
            // Pivot
            $maxRow = $i;
            for ($k = $i + 1; $k < $n; $k++) {
                if (abs($A[$k][$i]) > abs($A[$maxRow][$i])) {
                    $maxRow = $k;
                }
            }
            
            // Échange des lignes
            if ($maxRow != $i) {
                $temp = $A[$i];
                $A[$i] = $A[$maxRow];
                $A[$maxRow] = $temp;
                
                $temp = $b[$i];
                $b[$i] = $b[$maxRow];
                $b[$maxRow] = $temp;
            }
            
            // Division par le pivot
            if (abs($A[$i][$i]) < 1e-10) continue; // Éviter division par zéro
            
            for ($k = $i + 1; $k < $n; $k++) {
                $factor = $A[$k][$i] / $A[$i][$i];
                for ($j = $i; $j < $n; $j++) {
                    $A[$k][$j] -= $factor * $A[$i][$j];
                }
                $b[$k] -= $factor * $b[$i];
            }
        }
        
        // Substitution arrière
        $x = array_fill(0, $n, 0);
        for ($i = $n - 1; $i >= 0; $i--) {
            $x[$i] = $b[$i];
            for ($j = $i + 1; $j < $n; $j++) {
                $x[$i] -= $A[$i][$j] * $x[$j];
            }
            if (abs($A[$i][$i]) > 1e-10) {
                $x[$i] /= $A[$i][$i];
            }
        }
        
        return $x;
    }
    
   private function calculerR2($X, $y, $coefficients) {
    $n = count($y);
    if ($n === 0) return 0;

    // Filtrer y pour ne garder que les valeurs numériques
    $y_filtered = array_filter($y, 'is_numeric');
    $count_filtered = count($y_filtered);
    if ($count_filtered === 0) return 0;

    $y_mean = array_sum($y_filtered) / $count_filtered;

    $ss_tot = 0;
    $ss_res = 0;

    for ($i = 0; $i < $n; $i++) {
        $y_val = (is_numeric($y[$i]) ? (float)$y[$i] : 0);
        $y_pred = 0;

        for ($j = 0; $j < count($coefficients); $j++) {
            $coef = (is_numeric($coefficients[$j]) ? (float)$coefficients[$j] : 0);
            $x_val = (isset($X[$i][$j]) && is_numeric($X[$i][$j])) ? (float)$X[$i][$j] : 0;
            $y_pred += $coef * $x_val;
        }

        $ss_tot += pow($y_val - $y_mean, 2);
        $ss_res += pow($y_val - $y_pred, 2);
    }

    return ($ss_tot > 0) ? 1 - ($ss_res / $ss_tot) : 0;
}

    
    // Méthodes de prédiction
   public function predireTempsTrajet($distance, $heure = 12, $jour_semaine = 3, $type_vehicule = 'moyen', $experience = 3, $type_client = 'particulier') {
    $modele = $this->modeles_ml['temps_trajet'];
    
    if (empty($modele['coefficients'])) {
        // Fallback si pas de modèle
        return $this->calculerTempsTrajetFallback($distance, $heure);
    }
    
    $prediction = $modele['coefficients']['intercept'] ?? 0;
    $prediction += ($modele['coefficients']['distance'] ?? 0) * $distance;
    $prediction += ($modele['coefficients']['type_client'] ?? 0) * $this->encoderTypeClient($type_client);
    $prediction += ($modele['coefficients']['heure_livraison'] ?? 0) * $heure;
    
    return max(0, min(100, $prediction));
}

    
    private function calculerSatisfactionFallback($commande, $retard_prevu) {
        $score_base = 85;
        
        // Pénalités retard
        if ($retard_prevu > 30) $score_base -= 25;
        elseif ($retard_prevu > 15) $score_base -= 15;
        elseif ($retard_prevu > 0) $score_base -= 5;
        
        // Bonus/malus type client
        switch ($commande->type_client) {
            case 'vip': return max($score_base, 80); // VIP minimum 80
            case 'premium': return max($score_base - 5, 75);
            case 'entreprise': return $score_base;
            default: return $score_base + 5; // Particuliers plus tolérants
        }
    }

    public function construireModelePerformanceChauffeur() {
        $donnees_performance = [];
        foreach ($this->historique as $livraison) {
            $score_performance = $this->calculerScorePerformanceLivraison($livraison);
            $donnees_performance[] = [
                'experience' => $livraison['experience'] ?? 5,
                'heure_livraison' => $livraison['heure_livraison'],
                'distance' => $livraison['distance'],
                'type_vehicule' => $this->encoderTypeVehicule($livraison['type_vehicule']),
                'jour_semaine' => $livraison['jour_semaine'],
                'performance' => $score_performance
            ];
        }
        
        return $this->regressionMultiple($donnees_performance, 'performance');
    }   
    
    public function calculerScorePerformanceChauffeur($chauffeur_id, $contexte = []) {
        $performances_chauffeur = array_filter($this->historique, 
            fn($h) => $h['chauffeur_id'] == $chauffeur_id);
        
        if (empty($performances_chauffeur)) {
            return ['score_global' => 75, 'confiance' => 'faible', 'details' => []];
        }
        
        $scores = [];
        
        // Score ponctualité
        $ponctuel = count(array_filter($performances_chauffeur, fn($p) => $p['retard_minutes'] <= 0));
        $scores['ponctualite'] = ($ponctuel / count($performances_chauffeur)) * 100;
        
        // Score efficacité (vitesse moyenne)
        $vitesses = array_filter(array_column($performances_chauffeur, 'vitesse_moyenne'), fn($v) => $v > 0);
        $scores['efficacite'] = empty($vitesses) ? 70 : min(100, array_sum($vitesses) / count($vitesses));
        
        // Score satisfaction (basé sur les retards)
        $satisfaction_moyenne = 0;
        foreach ($performances_chauffeur as $perf) {
            $satisfaction_moyenne += $this->calculerScoreSatisfaction($perf);
        }
        $scores['satisfaction'] = $satisfaction_moyenne / count($performances_chauffeur);
        
        // Score global pondéré
        $score_global = ($scores['ponctualite'] * 0.4) + 
                       ($scores['efficacite'] * 0.3) + 
                       ($scores['satisfaction'] * 0.3);
        
        return [
            'score_global' => round($score_global, 1),
            'confiance' => count($performances_chauffeur) > 10 ? 'haute' : 
                          (count($performances_chauffeur) > 5 ? 'moyenne' : 'faible'),
            'details' => $scores,
            'nb_livraisons' => count($performances_chauffeur)
        ];
    }

      public function predireSatisfactionClient($commande, $retard_prevu = 0) {
        $modele = $this->modeles_ml['satisfaction'];
        
        if (empty($modele['coefficients'])) {
            return $this->calculerSatisfactionFallback($commande, $retard_prevu);
        }
        
        $prediction = $modele['coefficients']['intercept'] ?? 85;
        $prediction += ($modele['coefficients']['retard_minutes'] ?? 0) * max(0, $retard_prevu);
        $prediction += ($modele['coefficients']['distance'] ?? 0) * $commande->estimerDistanceAtelier();
        $prediction += ($modele['coefficients']['type_client'] ?? 0) * $this->encoderTypeClient($commande->type_client);
        $prediction += ($modele['coefficients']['heure_livraison'] ?? 0) * 12; // Heure par défaut
        
        return max(0, min(100, $prediction));
    }
    
    // Méthodes utilitaires
    private function encoderTypeVehicule($type) {
        $encodage = ['leger' => 1, 'moyen' => 2, 'lourd' => 3, 'frigorifique' => 4, 'benne' => 5];
        return $encodage[$type] ?? 2;
    }
    
    private function encoderTypeClient($type) {
        $encodage = ['particulier' => 1, 'entreprise' => 2, 'grossiste' => 3, 'premium' => 4, 'vip' => 5];
        return $encodage[$type] ?? 1;
    }

        private function calculerScorePerformanceLivraison($livraison) {
        $score = 100;
        
        // Pénalité retard
        if ($livraison['retard_minutes'] > 0) {
            $score -= min(50, $livraison['retard_minutes'] * 0.5);
        } else {
            $score += min(10, abs($livraison['retard_minutes']) * 0.2);
        }
        
        // Bonus efficacité (vitesse moyenne)
        if ($livraison['vitesse_moyenne'] > 0) {
            if ($livraison['vitesse_moyenne'] > 35) $score += 10;
            elseif ($livraison['vitesse_moyenne'] < 20) $score -= 15;
        }
        
        return max(0, min(100, $score));
    }
    
    private function calculerScoreSatisfaction($livraison) {
        $score = 100;
        
        // Pénalités retard
        $retard = max(0, $livraison['retard_minutes']);
        if ($retard > 60) $score -= 40;
        elseif ($retard > 30) $score -= 25;
        elseif ($retard > 15) $score -= 15;
        elseif ($retard > 0) $score -= 5;
        
        // Bonus livraison en avance
        if ($retard < 0) $score += min(10, abs($retard) * 0.2);
        
        return max(0, $score);
    }
private function regressionLogistique($donnees, $variable_cible) {
    // Implémentation simplifiée de régression logistique
    if (empty($donnees)) {
        return ['coefficients' => [], 'intercept' => 0];
    }
    
    $n = count($donnees);
    $variables = array_keys($donnees[0]);
    $variables = array_filter($variables, fn($v) => $v !== $variable_cible);
    $variables = array_values($variables); // réindexe pour éviter soucis d'index
    
    $num_coefficients = count($variables) + 1; // +1 pour l'intercept
    $coefficients = array_fill(0, $num_coefficients, 0);
    
    $learning_rate = 0.01;
    $iterations = 100;
    
    for ($iter = 0; $iter < $iterations; $iter++) {
        $gradient = array_fill(0, $num_coefficients, 0);
        
        foreach ($donnees as $row) {
            $x = [1]; // Intercept
            foreach ($variables as $var) {
                $x[] = isset($row[$var]) ? (float)$row[$var] : 0.0;
            }
            
            $z = 0.0;
            for ($i = 0; $i < $num_coefficients; $i++) {
                $z += $coefficients[$i] * $x[$i];
            }
            
            $prediction = 1 / (1 + exp(-$z));
            $error = ((float)$row[$variable_cible]) - $prediction;
            
            for ($i = 0; $i < $num_coefficients; $i++) {
                $gradient[$i] += $error * $x[$i];
            }
        }
        
        for ($i = 0; $i < $num_coefficients; $i++) {
            $coefficients[$i] += $learning_rate * $gradient[$i] / $n;
        }
    }
    
    // Construire la liste des clés pour array_combine
    $keys = array_merge(['intercept'], $variables);
    
    // Vérification sécurité avant array_combine
    if (count($keys) !== count($coefficients)) {
        throw new Exception("Erreur regressionLogistique: clés et coefficients n'ont pas la même taille.");
    }
    
    return [
        'coefficients' => array_combine($keys, $coefficients),
        'variables' => $variables
    ];
}

    
    private function obtenirFacteursContextuels($heure, $jour_semaine) {
        return [
            'trafic' => $this->getFacteurTrafic($heure, $jour_semaine),
            'meteo' => $this->getFacteurMeteo()
        ];
    }
    
    private function getFacteurTrafic($heure, $jour_semaine) {
        // Facteurs de trafic réalistes
        if ($jour_semaine == 1 || $jour_semaine == 7) return 0.9; // Weekend
        
        if ($heure >= 7 && $heure <= 9) return 1.4;      // Pointe matinale
        if ($heure >= 17 && $heure <= 19) return 1.5;    // Pointe soirée
        if ($heure >= 12 && $heure <= 14) return 1.2;    // Pause déjeuner
        if ($heure >= 22 || $heure <= 6) return 0.8;     // Nuit
        
        return 1.0;
    }

    public function construireModeleProbabiliteRetard() {
        $donnees_retard = [];
        foreach ($this->historique as $livraison) {
            $est_en_retard = $livraison['retard_minutes'] > 0 ? 1 : 0;
            $donnees_retard[] = [
                'distance' => $livraison['distance'],
                'heure_livraison' => $livraison['heure_livraison'],
                'experience' => $livraison['experience'] ?? 5,
                'jour_semaine' => $livraison['jour_semaine'],
                'retard' => $est_en_retard
            ];
        }
        
        return $this->regressionLogistique($donnees_retard, 'retard');
    }
    
    private function getFacteurMeteo() {
        // Simulation facteur météo (à remplacer par API réelle)
        $conditions = ['excellent', 'bon', 'moyen', 'difficile'];
        $facteurs = [0.95, 1.0, 1.1, 1.3];
        $index = array_rand($conditions);
        
        return $facteurs[$index];
    }
}

// =================== OPTIMISEUR GÉNÉTIQUE AVANCÉ ===================

class OptimiseurGenetiqueV5 {
    private $moteur_ia;
    private $population_size;
    private $generations;
    private $taux_mutation;
    private $taux_croisement;
    private $elite_size;
    
    public function __construct($moteur_ia) {
        $this->moteur_ia = $moteur_ia;
        $this->population_size = SystemConfig::POPULATION_GENETIQUE;
        $this->generations = SystemConfig::GENERATIONS_MAX;
        $this->taux_mutation = SystemConfig::TAUX_MUTATION;
        $this->taux_croisement = SystemConfig::TAUX_CROISEMENT;
        $this->elite_size = max(5, intval($this->population_size * 0.1));
    }
    
    public function optimiserPlanificationComplete($commandes, $vehicules, $stocks) {
        // Phase 1: Clustering intelligent des commandes
        $clusters = $this->clusteriserCommandesAvancees($commandes);
        
        // Phase 2: Affectation optimale commandes -> véhicules
        $affectations_optimales = $this->optimiserAffectations($clusters, $vehicules, $stocks);
        
        // Phase 3: Optimisation des tournées pour chaque véhicule
        $tournees_optimisees = [];
        foreach ($affectations_optimales as $vehicule_id => $commandes_vehicule) {
            if (!empty($commandes_vehicule)) {
                $tournees_optimisees[$vehicule_id] = $this->optimiserTourneeVehicule(
                    $commandes_vehicule, $vehicules[$vehicule_id], $stocks
                );
            }
        }
        
        return $this->construirePlanificationFinale($tournees_optimisees, $vehicules, $stocks);
    }
    
    private function clusteriserCommandesAvancees($commandes) {
        $nb_commandes = count($commandes);
        if ($nb_commandes <= 3) {
            return [array_map(fn($cmd, $i) => array_merge($cmd, ['cluster' => 0]), 
                             $commandes, array_keys($commandes))];
        }
        
        // Déterminer nombre optimal de clusters
        $nb_clusters_optimal = $this->determinerNbClustersOptimal($commandes);
        
        // K-means++ amélioré avec critères multiples
        return $this->kmeansPlusPlusAvance($commandes, $nb_clusters_optimal);
    }
    
    private function determinerNbClustersOptimal($commandes) {
        $nb_commandes = count($commandes);
        
        // Règles métier intelligentes
        if ($nb_commandes <= 5) return 1;
        if ($nb_commandes <= 12) return 2;
        if ($nb_commandes <= 25) return 3;
        if ($nb_commandes <= 40) return 4;
        
        // Pour de gros volumes, analyse plus fine
        return min(6, max(3, intval($nb_commandes / 8)));
    }
    
    private function kmeansPlusPlusAvance($commandes, $nb_clusters) {
        $centroides = $this->initialiserCentroidesPlusPlus($commandes, $nb_clusters);
        
        $max_iterations = 15;
        $convergence_seuil = 0.01;
        
        for ($iter = 0; $iter < $max_iterations; $iter++) {
            $anciens_centroides = $centroides;
            
            // Assignation aux clusters
            $clusters = $this->assignerAuxClusters($commandes, $centroides);
            
            // Recalcul des centroïdes
            $centroides = $this->recalculerCentroides($clusters, $commandes);
            
            // Test de convergence
            if ($this->testerConvergence($anciens_centroides, $centroides, $convergence_seuil)) {
                break;
            }
        }
        
        return $this->formatClusters($clusters, $commandes);
    }
    
    private function initialiserCentroidesPlusPlus($commandes, $nb_clusters) {
        $centroides = [];
        
        // Premier centroïde aléatoire
        $premier = $commandes[array_rand($commandes)];
        $centroides[] = [
            'latitude' => $premier->latitude,
            'longitude' => $premier->longitude,
            'urgence' => $premier->score_urgence,
            'volume' => $premier->quantite
        ];
        
        // Centroïdes suivants avec K-means++
        for ($k = 1; $k < $nb_clusters; $k++) {
            $distances_ponderees = [];
            
            foreach ($commandes as $idx => $commande) {
                $min_distance = PHP_FLOAT_MAX;
                
                foreach ($centroides as $centroide) {
                    $distance = $this->calculerDistanceMultiCriteres($commande, $centroide);
                    $min_distance = min($min_distance, $distance);
                }
                
                $distances_ponderees[$idx] = $min_distance * $min_distance;
            }
            
            // Sélection pondérée
            $total_poids = array_sum($distances_ponderees);
            $rand_val = (rand() / getrandmax()) * $total_poids;
            $cumul = 0;
            
            foreach ($distances_ponderees as $idx => $poids) {
                $cumul += $poids;
                if ($cumul >= $rand_val) {
                    $commande_selectionnee = $commandes[$idx];
                    $centroides[] = [
                        'latitude' => $commande_selectionnee->latitude,
                        'longitude' => $commande_selectionnee->longitude,
                        'urgence' => $commande_selectionnee->score_urgence,
                        'volume' => $commande_selectionnee->quantite
                    ];
                    break;
                }
            }
        }
        
        return $centroides;
    }
    
    private function calculerDistanceMultiCriteres($commande, $centroide) {
        // Distance géographique (normalisée)
        $dist_geo = $this->calculerDistanceHaversine(
            $commande->latitude, $commande->longitude,
            $centroide['latitude'], $centroide['longitude']
        ) / 50; // Normalisation
        
        // Distance d'urgence (normalisée)
        $dist_urgence = abs($commande->score_urgence - $centroide['urgence']) / 100;
        
        // Distance de volume (normalisée)
        $dist_volume = abs($commande->quantite - $centroide['volume']) / 500;
        
        // Distance pondérée
        return ($dist_geo * 0.6) + ($dist_urgence * 0.25) + ($dist_volume * 0.15);
    }
    
    private function optimiserAffectations($clusters, $vehicules, $stocks) {
        // Génération population initiale d'affectations
        $population = $this->genererPopulationAffectations($clusters, $vehicules, $this->population_size);
        
        // Évolution génétique
        for ($generation = 0; $generation < $this->generations; $generation++) {
            // Évaluation fitness
            $population = $this->evaluerFitnessAffectations($population, $vehicules, $stocks);
            
            // Sélection élite
            $elite = $this->selectionnerElite($population, $this->elite_size);
            
            // Génération nouvelle population
            $nouvelle_population = $elite;
            
            while (count($nouvelle_population) < $this->population_size) {
                // Sélection parents
                $parent1 = $this->selectionTournoi($population, 3);
                $parent2 = $this->selectionTournoi($population, 3);
                
                // Croisement
                if ((rand() / getrandmax()) < $this->taux_croisement) {
                    [$enfant1, $enfant2] = $this->croisementAffectations($parent1, $parent2);
                    $nouvelle_population[] = $enfant1;
                    if (count($nouvelle_population) < $this->population_size) {
                        $nouvelle_population[] = $enfant2;
                    }
                } else {
                    $nouvelle_population[] = $parent1;
                    if (count($nouvelle_population) < $this->population_size) {
                        $nouvelle_population[] = $parent2;
                    }
                }
            }
            
            // Mutation
            foreach ($nouvelle_population as &$individu) {
                if ((rand() / getrandmax()) < $this->taux_mutation) {
                    $individu = $this->mutationAffectation($individu, $vehicules);
                }
            }
            
            $population = $nouvelle_population;
            
            // Convergence précoce si pas d'amélioration
            if ($generation > 50 && $this->testerConvergencePopulation($population)) {
                break;
            }
        }
        
        // Retourner la meilleure solution
        $population = $this->evaluerFitnessAffectations($population, $vehicules, $stocks);
        usort($population, fn($a, $b) => $b['fitness'] <=> $a['fitness']);
        
        return $this->convertirEnAffectations($population[0], $clusters);
    }
    
    private function optimiserTourneeVehicule($commandes_vehicule, $vehicule, $stocks) {
        if (count($commandes_vehicule) <= 2) {
            return $commandes_vehicule;
        }
        
        // Algorithme génétique spécialisé pour les tournées
        $population_tournee = $this->genererPopulationTournees($commandes_vehicule, 50);
        
        for ($gen = 0; $gen < 100; $gen++) {
            // Évaluation avec critères spécialisés tournées
            $population_tournee = $this->evaluerFitnessTournees($population_tournee, $vehicule, $stocks);
            
            // Nouvelle génération
            $nouvelle_pop = [];
            
            // Élite
            $elite = array_slice($population_tournee, 0, max(5, intval(count($population_tournee) * 0.2)));
            $nouvelle_pop = array_merge($nouvelle_pop, $elite);
            
            // Reproduction
            while (count($nouvelle_pop) < count($population_tournee)) {
                $parent1 = $this->selectionTournoi($population_tournee, 3);
                $parent2 = $this->selectionTournoi($population_tournee, 3);
                
                // Croisement OX (Order Crossover) amélioré
                $enfant = $this->croisementOXAmeliore($parent1['tournee'], $parent2['tournee']);
                
                // Mutation spécialisée tournées
                if ((rand() / getrandmax()) < $this->taux_mutation) {
                    $enfant = $this->mutationTournee($enfant);
                }
                
                $nouvelle_pop[] = ['tournee' => $enfant];
            }
            
            $population_tournee = $nouvelle_pop;
        }
        
        // Retourner la meilleure tournée
        $population_tournee = $this->evaluerFitnessTournees($population_tournee, $vehicule, $stocks);
        return $population_tournee[0]['tournee'];
    }
    
    // Méthodes utilitaires de calcul
  private function calculerDistanceHaversine($lat1, $lon1, $lat2, $lon2) {
    if ($lat1 == $lat2 && $lon1 == $lon2) return 0;

    // On force les valeurs à des floats, ou met 0 si null ou non numérique
    $lat1 = is_numeric($lat1) ? floatval($lat1) : 0;
    $lat2 = is_numeric($lat2) ? floatval($lat2) : 0;
    $lon1 = is_numeric($lon1) ? floatval($lon1) : 0;
    $lon2 = is_numeric($lon2) ? floatval($lon2) : 0;

    $earth_radius = 6371;
    $dLat = deg2rad($lat2 - $lat1);
    $dLon = deg2rad($lon2 - $lon1);
    $a = sin($dLat / 2) * sin($dLat / 2) +
         cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
         sin($dLon / 2) * sin($dLon / 2);
    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
    return $earth_radius * $c;
}

    
    private function assignerAuxClusters($commandes, $centroides) {
        $clusters = [];
        
        foreach ($commandes as $idx => $commande) {
            $min_distance = PHP_FLOAT_MAX;
            $cluster_assigne = 0;
            
            foreach ($centroides as $k => $centroide) {
                $distance = $this->calculerDistanceMultiCriteres($commande, $centroide);
                if ($distance < $min_distance) {
                    $min_distance = $distance;
                    $cluster_assigne = $k;
                }
            }
            
            $clusters[$idx] = $cluster_assigne;
        }
        
        return $clusters;
    }
    
    private function recalculerCentroides($clusters, $commandes) {
        $centroides = [];
        $nb_clusters = count(array_unique($clusters));
        
        for ($k = 0; $k < $nb_clusters; $k++) {
            $commandes_cluster = [];
            foreach ($clusters as $idx => $cluster_id) {
                if ($cluster_id === $k) {
                    $commandes_cluster[] = $commandes[$idx];
                }
            }
            
            if (!empty($commandes_cluster)) {
                $centroides[$k] = [
                    'latitude' => array_sum(array_map(fn($cmd) => $cmd->latitude, $commandes_cluster)) / count($commandes_cluster),
                    'longitude' => array_sum(array_map(fn($cmd) => $cmd->longitude, $commandes_cluster)) / count($commandes_cluster),
                    'urgence' => array_sum(array_map(fn($cmd) => $cmd->score_urgence, $commandes_cluster)) / count($commandes_cluster),
                    'volume' => array_sum(array_map(fn($cmd) => $cmd->quantite, $commandes_cluster)) / count($commandes_cluster)
                ];
            }
        }
        
        return $centroides;
    }
    
    private function testerConvergence($anciens, $nouveaux, $seuil) {
        if (count($anciens) !== count($nouveaux)) return false;
        
        for ($i = 0; $i < count($anciens); $i++) {
            $distance = $this->calculerDistanceHaversine(
                $anciens[$i]['latitude'], $anciens[$i]['longitude'],
                $nouveaux[$i]['latitude'], $nouveaux[$i]['longitude']
            );
            if ($distance > $seuil) return false;
        }
        
        return true;
    }
    
    private function formatClusters($clusters, $commandes) {
        $clusters_formates = [];
        $nb_clusters = count(array_unique($clusters));
        
        for ($k = 0; $k < $nb_clusters; $k++) {
            $clusters_formates[$k] = [];
            foreach ($clusters as $idx => $cluster_id) {
                if ($cluster_id === $k) {
                    $commande = $commandes[$idx];
                    $commande->cluster = $k;
                    $clusters_formates[$k][] = $commande;
                }
            }
        }
        
        return array_filter($clusters_formates); // Supprimer clusters vides
    }
    
    // Méthodes génétiques (stubs à implémenter complètement)
    private function genererPopulationAffectations($clusters, $vehicules, $taille) {
        $population = [];
        for ($i = 0; $i < $taille; $i++) {
            $population[] = $this->genererAffectationAleatoire($clusters, $vehicules);
        }
        return $population;
    }
    
    private function genererAffectationAleatoire($clusters, $vehicules) {
        // Génération aléatoire d'affectation cluster -> véhicule
        $affectation = [];
        $vehicules_ids = array_keys($vehicules);
        
        foreach ($clusters as $cluster_id => $commandes_cluster) {
            $vehicule_id = $vehicules_ids[array_rand($vehicules_ids)];
            $affectation[$cluster_id] = $vehicule_id;
        }
        
        return ['affectation' => $affectation, 'fitness' => 0];
    }
    
    private function evaluerFitnessAffectations($population, $vehicules, $stocks) {
        foreach ($population as &$individu) {
            $individu['fitness'] = $this->calculerFitnessAffectation($individu['affectation'], $vehicules, $stocks);
        }
        
        // Tri par fitness décroissant
        usort($population, fn($a, $b) => $b['fitness'] <=> $a['fitness']);
        
        return $population;
    }
    
    private function calculerFitnessAffectation($affectation, $vehicules, $stocks) {
        $fitness = 100; // Score de base
        
        // Critères d'évaluation
        $fitness += $this->evaluerUtilisationCapacites($affectation, $vehicules);
        $fitness += $this->evaluerDistancesTotales($affectation, $stocks);
        $fitness += $this->evaluerEquilibreCharge($affectation, $vehicules);
        $fitness += $this->evaluerCompatibiliteSpecialites($affectation, $vehicules);
        
        return max(0, $fitness);
    }
    
    // Méthodes d'évaluation de fitness (simplifiées)
    private function evaluerUtilisationCapacites($affectation, $vehicules) {
        // Bonus pour bonne utilisation des capacités
        return rand(-20, 30);
    }
    
    private function evaluerDistancesTotales($affectation, $stocks) {
        // Malus pour distances excessives
        return rand(-30, 10);
    }
    
    private function evaluerEquilibreCharge($affectation, $vehicules) {
        // Bonus pour équilibre de charge entre véhicules
        return rand(-15, 25);
    }
    
    private function evaluerCompatibiliteSpecialites($affectation, $vehicules) {
        // Bonus compatibilité véhicule/mission
        return rand(-10, 20);
    }
    
    private function selectionnerElite($population, $taille_elite) {
        return array_slice($population, 0, $taille_elite);
    }
    
    private function selectionTournoi($population, $taille_tournoi) {
        $participants = array_rand($population, min($taille_tournoi, count($population)));
        if (!is_array($participants)) $participants = [$participants];
        
        $meilleur = $population[$participants[0]];
        foreach ($participants as $idx) {
            if ($population[$idx]['fitness'] > $meilleur['fitness']) {
                $meilleur = $population[$idx];
            }
        }
        
        return $meilleur;
    }
    
    private function croisementAffectations($parent1, $parent2) {
        // Croisement uniforme d'affectations
        $enfant1 = ['affectation' => [], 'fitness' => 0];
        $enfant2 = ['affectation' => [], 'fitness' => 0];
        
        foreach ($parent1['affectation'] as $cluster_id => $vehicule_id) {
            if (rand(0, 1)) {
                $enfant1['affectation'][$cluster_id] = $vehicule_id;
                $enfant2['affectation'][$cluster_id] = $parent2['affectation'][$cluster_id];
            } else {
                $enfant1['affectation'][$cluster_id] = $parent2['affectation'][$cluster_id];
                $enfant2['affectation'][$cluster_id] = $vehicule_id;
            }
        }
        
        return [$enfant1, $enfant2];
    }
    
    private function mutationAffectation($individu, $vehicules) {
        $vehicules_ids = array_keys($vehicules);
        $cluster_ids = array_keys($individu['affectation']);
        
        if (!empty($cluster_ids)) {
            $cluster_a_muter = $cluster_ids[array_rand($cluster_ids)];
            $individu['affectation'][$cluster_a_muter] = $vehicules_ids[array_rand($vehicules_ids)];
        }
        
        return $individu;
    }
    
    private function testerConvergencePopulation($population) {
        // Test de convergence basé sur la diversité
        if (count($population) < 10) return false;
        
        $fitness_values = array_column($population, 'fitness');
        $ecart_type = $this->calculerEcartType($fitness_values);
        
        return $ecart_type < 5; // Seuil de convergence
    }
    
    private function calculerEcartType($values) {
        $moyenne = array_sum($values) / count($values);
        $variance = array_sum(array_map(fn($x) => pow($x - $moyenne, 2), $values)) / count($values);
        return sqrt($variance);
    }
    
    private function convertirEnAffectations($meilleur_individu, $clusters) {
        $affectations = [];
        
        foreach ($meilleur_individu['affectation'] as $cluster_id => $vehicule_id) {
            if (!isset($affectations[$vehicule_id])) {
                $affectations[$vehicule_id] = [];
            }
            
            if (isset($clusters[$cluster_id])) {
                $affectations[$vehicule_id] = array_merge($affectations[$vehicule_id], $clusters[$cluster_id]);
            }
        }
        
        return $affectations;
    }
    
    // Méthodes pour optimisation tournées
    private function genererPopulationTournees($commandes, $taille) {
        $population = [];
        for ($i = 0; $i < $taille; $i++) {
            $tournee = $commandes;
            shuffle($tournee);
            $population[] = ['tournee' => $tournee, 'fitness' => 0];
        }
        return $population;
    }
    
    private function evaluerFitnessTournees($population, $vehicule, $stocks) {
    foreach ($population as &$individu) {
        $individu['fitness'] = $this->calculerFitnessTournee($individu['tournee'], $vehicule, $stocks);
    }

    usort($population, fn($a, $b) => $b['fitness'] <=> $a['fitness']);
    return $population;
    }


    
            private function calculerFitnessTournee($tournee, $vehicule, $stocks) {
            if (empty($tournee)) return 0;

            $fitness = 1000; // Score de base élevé
            $atelier = ['latitude' => 31.584044, 'longitude' => -8.102375];

            // Calcul distance totale
            $distance_totale = 0;
            $position = $atelier;

            foreach ($tournee as $commande) {
                $distance = $this->calculerDistanceHaversine(
                    $position['latitude'], $position['longitude'],
                    $commande->latitude, $commande->longitude
                );
                $distance_totale += $distance;
                $position = ['latitude' => $commande->latitude, 'longitude' => $commande->longitude];
            }

            // Retour atelier
            $distance_totale += $this->calculerDistanceHaversine(
                $position['latitude'], $position['longitude'],
                $atelier['latitude'], $atelier['longitude']
            );

            // Fitness inverse de la distance (plus court = meilleur)
            $fitness -= $distance_totale * 2;

            // Bonus respect priorités
            $fitness += $this->calculerBonusPriorites($tournee);

            // Bonus regroupement géographique
            $fitness += $this->calculerBonusRegroupement($tournee);

            return $fitness;
        }





    
    private function calculerTempsTrajetFallback($distance, $heure) {
        $vitesse_base = 45; // km/h
        
        // Ajustements heure
        if ($heure >= 7 && $heure <= 9) $vitesse_base *= 0.7;
        elseif ($heure >= 17 && $heure <= 19) $vitesse_base *= 0.65;
        elseif ($heure >= 12 && $heure <= 14) $vitesse_base *= 0.8;
        
        return ($distance / $vitesse_base) * 60;
    }
    
    public function predireCout($distance, $temps_minutes, $type_vehicule = 'moyen') {
        $modele = $this->modeles_ml['cout_reel'];
        
        if (empty($modele['coefficients'])) {
            // Fallback
            return $distance * SystemConfig::COUT_KM_BASE + 
                   ($temps_minutes / 60) * SystemConfig::COUT_HEURE_STANDARD;
        }
        
        $prediction = $modele['coefficients']['intercept'] ?? 0;
        $prediction += ($modele['coefficients']['distance'] ?? 0) * $distance;
        $prediction += ($modele['coefficients']['temps'] ?? 0) * $temps_minutes;
        $prediction += ($modele['coefficients']['type_vehicule'] ?? 0) * $this->encoderTypeVehicule($type_vehicule);
        
        return max(0, $prediction);
    }
    
  
    

    
    public function construireModeleProbabiliteRetard() {
        $donnees_retard = [];
        foreach ($this->historique as $livraison) {
            $est_en_retard = $livraison['retard_minutes'] > 0 ? 1 : 0;
            $donnees_retard[] = [
                'distance' => $livraison['distance'],
                'heure_livraison' => $livraison['heure_livraison'],
                'experience' => $livraison['experience'] ?? 5,
                'jour_semaine' => $livraison['jour_semaine'],
                'retard' => $est_en_retard
            ];
        }
        
        return $this->regressionLogistique($donnees_retard, 'retard');
    }
    

    

// =================== CONTINUATION OPTIMISEUR GÉNÉTIQUE ===================

 private function calculerBonusPriorites($tournee) {
        $bonus = 0;
        $urgences = array_map(fn($cmd) => $cmd->score_urgence, $tournee);
        
        // Vérifier si les commandes urgentes sont en début de tournée
        for ($i = 0; $i < min(3, count($urgences)); $i++) {
            if ($urgences[$i] > 80) $bonus += 20;
            elseif ($urgences[$i] > 60) $bonus += 10;
        }
        
        return $bonus;
    }
    
    private function calculerBonusRegroupement($tournee) {
        if (count($tournee) < 2) return 0;
        
        $bonus = 0;
        $distances_consecutives = [];
        
        for ($i = 0; $i < count($tournee) - 1; $i++) {
            $distance = $this->calculerDistanceHaversine(
                $tournee[$i]->latitude, $tournee[$i]->longitude,
                $tournee[$i + 1]->latitude, $tournee[$i + 1]->longitude
            );
            $distances_consecutives[] = $distance;
        }
        
        $distance_moyenne = array_sum($distances_consecutives) / count($distances_consecutives);
        
        // Bonus si distances courtes entre arrêts consécutifs
        if ($distance_moyenne < 5) $bonus += 30;
        elseif ($distance_moyenne < 10) $bonus += 15;
        elseif ($distance_moyenne < 15) $bonus += 5;
        
        return $bonus;
    }
    
    private function croisementOXAmeliore($parent1, $parent2) {
        $taille = count($parent1);
        if ($taille <= 2) return $parent1;
        
        // Sélection de deux points de croisement
        $point1 = rand(0, $taille - 2);
        $point2 = rand($point1 + 1, $taille - 1);
        
        $enfant = array_fill(0, $taille, null);
        
        // Copier la section entre les points du parent1
        for ($i = $point1; $i <= $point2; $i++) {
            $enfant[$i] = $parent1[$i];
        }
        
        // Remplir le reste avec l'ordre du parent2
        $commandes_utilisees = array_slice($parent1, $point1, $point2 - $point1 + 1);
        $index_enfant = ($point2 + 1) % $taille;
        $index_parent2 = ($point2 + 1) % $taille;
        
        while (in_array(null, $enfant)) {
            $commande_parent2 = $parent2[$index_parent2];
            
            if (!in_array($commande_parent2, $commandes_utilisees)) {
                $enfant[$index_enfant] = $commande_parent2;
                $index_enfant = ($index_enfant + 1) % $taille;
            }
            
            $index_parent2 = ($index_parent2 + 1) % $taille;
        }
        
        return $enfant;
    }
    
    private function mutationTournee($tournee) {
        $taille = count($tournee);
        if ($taille < 2) return $tournee;
        
        $type_mutation = rand(1, 3);
        
        switch ($type_mutation) {
            case 1: // Échange de positions
                $pos1 = rand(0, $taille - 1);
                $pos2 = rand(0, $taille - 1);
                $temp = $tournee[$pos1];
                $tournee[$pos1] = $tournee[$pos2];
                $tournee[$pos2] = $temp;
                break;
                
            case 2: // Inversion d'un segment
                $start = rand(0, $taille - 2);
                $end = rand($start + 1, $taille - 1);
                $segment = array_slice($tournee, $start, $end - $start + 1);
                $segment = array_reverse($segment);
                array_splice($tournee, $start, $end - $start + 1, $segment);
                break;
                
            case 3: // Déplacement d'une commande
                $from = rand(0, $taille - 1);
                $to = rand(0, $taille - 1);
                $commande = array_splice($tournee, $from, 1)[0];
                array_splice($tournee, $to, 0, [$commande]);
                break;
        }
        
        return $tournee;
    }
    
    private function construirePlanificationFinale($tournees_optimisees, $vehicules, $stocks) {
        $planification = [
            'date_creation' => date('Y-m-d H:i:s'),
            'version_algorithme' => '5.0',
            'statistiques' => [],
            'vehicules' => []
        ];
        
        $stats_globales = [
            'nb_commandes_total' => 0,
            'distance_totale' => 0,
            'temps_total' => 0,
            'cout_total' => 0,
            'satisfaction_moyenne' => 0,
            'taux_utilisation_vehicules' => 0
        ];
        
        foreach ($tournees_optimisees as $vehicule_id => $tournee) {
            if (empty($tournee)) continue;
            
            $vehicule = $vehicules[$vehicule_id];
            $planification_vehicule = $this->construirePlanificationVehicule($tournee, $vehicule, $stocks);
            
            $planification['vehicules'][$vehicule_id] = $planification_vehicule;
            
            // Mise à jour statistiques globales
            $stats_globales['nb_commandes_total'] += count($tournee);
            $stats_globales['distance_totale'] += $planification_vehicule['distance_totale'];
            $stats_globales['temps_total'] += $planification_vehicule['temps_total'];
            $stats_globales['cout_total'] += $planification_vehicule['cout_estime'];
        }
        
        // Calculs finaux
        $nb_vehicules_utilises = count($planification['vehicules']);
        $stats_globales['taux_utilisation_vehicules'] = ($nb_vehicules_utilises / count($vehicules)) * 100;
        $stats_globales['satisfaction_moyenne'] = $this->calculerSatisfactionMoyenne($planification['vehicules']);
        
        $planification['statistiques'] = $stats_globales;
        
        return $planification;
    }
    
    private function construirePlanificationVehicule($tournee, $vehicule, $stocks) {
        $atelier = ['latitude' => 31.584044, 'longitude' => -8.102375];
        $heure_actuelle = new DateTime(SystemConfig::HEURE_DEBUT);
        $position_actuelle = $atelier;
        
        $planification = [
            'vehicule_id' => $vehicule->id,
            'chauffeur' => $vehicule->chauffeur_nom,
            'etapes' => [],
            'distance_totale' => 0,
            'temps_total' => 0,
            'cout_estime' => 0,
            'satisfaction_prevue' => 0,
            'utilisation_capacite' => 0
        ];
        
        // Étape de départ (chargement à l'atelier)
        $temps_chargement = SystemConfig::TEMPS_CHARGEMENT_BASE + 
                           (array_sum(array_map(fn($cmd) => $cmd->quantite, $tournee)) / 100) * SystemConfig::TEMPS_CHARGEMENT_TONNE;
        
        $planification['etapes'][] = [
            'type' => 'chargement',
            'lieu' => 'Atelier Souihla',
            'heure_arrivee' => $heure_actuelle->format('H:i'),
            'heure_depart' => $heure_actuelle->add(new DateInterval('PT' . intval($temps_chargement) . 'M'))->format('H:i'),
            'duree' => $temps_chargement,
            'description' => 'Chargement de ' . count($tournee) . ' commandes'
        ];
        
        // Étapes de livraison
        foreach ($tournee as $index => $commande) {
            $distance = $this->calculerDistanceHaversine(
                $position_actuelle['latitude'], $position_actuelle['longitude'],
                $commande->latitude, $commande->longitude
            );
            
            $temps_trajet = $this->moteur_ia->predireTempsTrajet(
                $distance, 
                intval($heure_actuelle->format('H')), 
                intval($heure_actuelle->format('w')), 
                $vehicule->type_vehicule, 
                $vehicule->experience
            );
            
            $heure_arrivee = clone $heure_actuelle;
            $heure_arrivee->add(new DateInterval('PT' . intval($temps_trajet) . 'M'));
            
            $temps_arret = SystemConfig::TEMPS_ARRET_CLIENT + 
                          ($commande->quantite > 100 ? ($commande->quantite - 100) * 0.1 : 0);
            
            $heure_depart = clone $heure_arrivee;
            $heure_depart->add(new DateInterval('PT' . intval($temps_arret) . 'M'));
            
            $satisfaction_prevue = $this->moteur_ia->predireSatisfactionClient($commande);
            
            $planification['etapes'][] = [
                'type' => 'livraison',
                'commande_id' => $commande->id,
                'client' => $commande->client_id,
                'adresse' => $commande->adresse,
                'telephone' => $commande->telephone,
                'produit' => $commande->produit,
                'quantite' => $commande->quantite,
                'priorite' => $commande->priorite,
                'heure_arrivee' => $heure_arrivee->format('H:i'),
                'heure_depart' => $heure_depart->format('H:i'),
                'temps_trajet' => $temps_trajet,
                'temps_arret' => $temps_arret,
                'distance_depuis_precedent' => $distance,
                'satisfaction_prevue' => $satisfaction_prevue,
                'instructions_speciales' => $this->genererInstructionsSpeciales($commande, $vehicule)
            ];
            
            // Mise à jour totaux
            $planification['distance_totale'] += $distance;
            $planification['temps_total'] += $temps_trajet + $temps_arret;
            $planification['satisfaction_prevue'] += $satisfaction_prevue;
            
            // Mise à jour position et heure
            $position_actuelle = ['latitude' => $commande->latitude, 'longitude' => $commande->longitude];
            $heure_actuelle = $heure_depart;
        }
        
        // Retour à l'atelier
        $distance_retour = $this->calculerDistanceHaversine(
            $position_actuelle['latitude'], $position_actuelle['longitude'],
            $atelier['latitude'], $atelier['longitude']
        );
        
        $temps_retour = $this->moteur_ia->predireTempsTrajet(
            $distance_retour, 
            intval($heure_actuelle->format('H')), 
            intval($heure_actuelle->format('w')), 
            $vehicule->type_vehicule, 
            $vehicule->experience
        );
        
        $heure_fin = clone $heure_actuelle;
        $heure_fin->add(new DateInterval('PT' . intval($temps_retour) . 'M'));
        
        $planification['etapes'][] = [
            'type' => 'retour',
            'lieu' => 'Atelier Souihla',
            'heure_arrivee' => $heure_fin->format('H:i'),
            'temps_trajet' => $temps_retour,
            'distance_depuis_precedent' => $distance_retour
        ];
        
        // Calculs finaux
        $planification['distance_totale'] += $distance_retour;
        $planification['temps_total'] += $temps_retour;
        $planification['satisfaction_prevue'] = $planification['satisfaction_prevue'] / count($tournee);
        $planification['utilisation_capacite'] = (array_sum(array_map(fn($cmd) => $cmd->quantite, $tournee)) / $vehicule->capacite) * 100;
        $planification['cout_estime'] = $this->calculerCoutTournee($planification, $vehicule);
        
        return $planification;
    }
    
    private function genererInstructionsSpeciales($commande, $vehicule) {
        $instructions = [];
        
        // Instructions selon type de client
        switch ($commande->type_client) {
            case 'vip':
                $instructions[] = "⭐ CLIENT VIP - Priorité absolue, ponctualité critique";
                $instructions[] = "📞 Appeler 15 min avant l'arrivée";
                break;
            case 'premium':
                $instructions[] = "🔔 Client Premium - Service de qualité requis";
                break;
            case 'entreprise':
                $instructions[] = "🏢 Livraison entreprise - Demander le bon de réception";
                break;
        }
        
        // Instructions selon quantité
        if ($commande->quantite > 200) {
            $instructions[] = "📦 Grosse commande - Prévoir aide au déchargement";
        }
        
        // Instructions selon priorité
        if ($commande->priorite === 'critique' || $commande->priorite === 'urgente') {
            $instructions[] = "🚨 URGENT - Ne pas reporter, contacter superviseur si problème";
        }
        
        // Instructions selon adresse
        /*if (stripos($commande->adresse, 'étage') !== false) {
            $instructions[] = "🏗️ Livraison en étage - Prévoir temps supplémentaire";
        }
        
        if (stripos($commande->adresse, 'centre') !== false) {
            $instructions[] = "🚗 Centre-ville - Difficultés de stationnement possibles";
        }*/
        
        return $instructions;
    }
    
    private function calculerCoutTournee($planification, $vehicule) {
        $cout_distance = $planification['distance_totale'] * $vehicule->cout_km;
        $cout_temps = ($planification['temps_total'] / 60) * $vehicule->cout_heure;
        
        // Majoration heures supplémentaires
        if ($planification['temps_total'] > SystemConfig::MAX_HEURES_TRAVAIL * 60) {
            $heures_sup = ($planification['temps_total'] - SystemConfig::MAX_HEURES_TRAVAIL * 60) / 60;
            $cout_temps += $heures_sup * (SystemConfig::COUT_HEURE_SUP - $vehicule->cout_heure);
        }
        
        return $cout_distance + $cout_temps;
    }
    
    private function calculerSatisfactionMoyenne($vehicules_planification) {
        if (empty($vehicules_planification)) return 0;
        
        $satisfaction_totale = 0;
        $nb_commandes = 0;
        
        foreach ($vehicules_planification as $planif_vehicule) {
            $satisfaction_totale += $planif_vehicule['satisfaction_prevue'] * 
                                  count(array_filter($planif_vehicule['etapes'], fn($e) => $e['type'] === 'livraison'));
            $nb_commandes += count(array_filter($planif_vehicule['etapes'], fn($e) => $e['type'] === 'livraison'));
        }
        
        return $nb_commandes > 0 ? $satisfaction_totale / $nb_commandes : 0;
    }
}





   

// =================== API ENDPOINT PRINCIPAL ===================

class ApiPlanificationV5 {
    private $pdo;
    private $moteur_ia;
    private $optimiseur;
    
    public function __construct() {
        global $pdo;
        $this->pdo = $pdo;
        $this->moteur_ia = new MoteurIAv5($pdo);
        $this->optimiseur = new OptimiseurGenetiqueV5($this->moteur_ia);
    }
    
    public function traiterRequete() {
        try {
            $action = $_GET['action'] ?? $_POST['action'] ?? 'planifier';
            
            switch ($action) {
                case 'planifier':
                    return $this->genererPlanificationComplete();
                case 'analyser_performance':
                    return $this->analyserPerformanceHistorique();
                case 'predire_satisfaction':
                    return $this->predireSatisfactionCommande();
                case 'optimiser_tournees':
                    return $this->optimiserTourneesUniquement();
                case 'statistiques_ia':
                    return $this->obtenirStatistiquesIA();
                default:
                    throw new Exception("Action non reconnue: $action");
            }
        } catch (Exception $e) {
            return $this->reponseErreur($e->getMessage());
        }
    }
    
    private function genererPlanificationComplete() {
        // Récupération des données
        $commandes = $this->chargerCommandes();
        $vehicules = $this->chargerVehicules();
        $stocks = $this->chargerStocks();
        
        if (empty($commandes)) {
            return $this->reponseSucces(['message' => 'Aucune commande à planifier', 'planification' => null]);
        }
        
        // Transformation en objets intelligents
        $commandes_intelligentes = array_map(fn($cmd) => new CommandeIntelligente($cmd), $commandes);
        $vehicules_intelligents = [];
        foreach ($vehicules as $veh) {
            $vehicules_intelligents[$veh['id']] = new VehiculeIntelligent($veh);
        }
        
        // Optimisation complète
        $debut = microtime(true);
        $planification = $this->optimiseur->optimiserPlanificationComplete(
            $commandes_intelligentes, 
            $vehicules_intelligents, 
            $stocks
        );
        $temps_execution = microtime(true) - $debut;
        
        // Enrichissement avec métriques IA
        $planification['metriques_ia'] = [
            'temps_execution' => round($temps_execution, 3),
            'algorithme_version' => '5.0',
            'precision_predictions' => $this->calculerPrecisionPredictions(),
            'facteurs_optimisation' => [
                'distance_totale' => $planification['statistiques']['distance_totale'],
                'cout_total' => $planification['statistiques']['cout_total'],
                'satisfaction_moyenne' => $planification['statistiques']['satisfaction_moyenne'],
                'taux_utilisation' => $planification['statistiques']['taux_utilisation_vehicules']
            ]
        ];
        
        // Sauvegarde pour apprentissage futur
        $this->sauvegarderPlanificationPourApprentissage($planification);
        
        return $this->reponseSucces([
            'planification' => $planification,
            'recommandations' => $this->genererRecommandations($planification),
            'alertes' => $this->detecterAlertes($planification)
        ]);
    }
    
    private function chargerCommandes() {
        $stmt = $this->pdo->query("
            SELECT 
                c.id, c.client_id, c.produit, c.quantite, c.priorite,
                c.livree, c.date_commande, 
                cl.type_client, cl.volume_mensuel, c.date_limite,
                COALESCE(c.contraintes_speciales, '') as contraintes_speciales
            FROM commandes c
            JOIN clients cl ON c.client_id = cl.id
            WHERE DATE(c.date_commande) = CURDATE()  -- Commandes du jour
            
            ORDER BY c.priorite DESC, c.date_commande ASC
        ");
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    private function chargerVehicules() {
        $stmt = $this->pdo->query("
            SELECT 
                cam.id, cam.code, cam.capacite, cam.type_vehicule,
                ch.id as chauffeur_id, ch.nom as chauffeur_nom, 
                
                cam.latitude as position_lat, cam.longitude as position_lon
            FROM camions cam
            JOIN chauffeurs ch ON cam.chauffeur_id = ch.id
            WHERE cam.statut = 'disponible' AND ch.statut = 'actif'
            ORDER BY cam.capacite DESC
        ");
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    private function chargerStocks() {
    $stmt = $this->pdo->query("
        SELECT id, nom, latitude, longitude, capacite_actuelle, statut
        FROM stocks 
        WHERE statut = 'actif'
        ORDER BY capacite_actuelle ASC
    ");
    
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

    
   private function calculerPrecisionPredictions() {
    // Calcul de la précision basé sur l'historique récent
    $predictions_recentes = 15; // Dernières prédictions à analyser
    $stmt = $this->pdo->query("
        SELECT 
            temps_prevu, temps_reel_minutes,
            cout_prevu, cout_reel,
            satisfaction_prevue, satisfaction_reelle
        FROM livraisons 
        WHERE completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        AND temps_prevu > 0 AND cout_prevu > 0
        ORDER BY completed_at DESC
        LIMIT $predictions_recentes
    ");
    
    $donnees = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($donnees)) return 75; // Valeur par défaut
    
    $precision_temps = 0;
    $precision_cout = 0;
    $precision_satisfaction = 0;
    $count = 0;
    
    foreach ($donnees as $d) {
        if (isset($d['temps_reel_minutes']) && is_numeric($d['temps_reel_minutes']) && $d['temps_reel_minutes'] > 0) {
            $erreur_temps = abs($d['temps_prevu'] - $d['temps_reel_minutes']) / $d['temps_reel_minutes'];
            $precision_temps += max(0, 100 - ($erreur_temps * 100));
        }
        
        if (isset($d['cout_reel']) && is_numeric($d['cout_reel']) && $d['cout_reel'] > 0) {
            $erreur_cout = abs($d['cout_prevu'] - $d['cout_reel']) / $d['cout_reel'];
            $precision_cout += max(0, 100 - ($erreur_cout * 100));
        }
        
        if (isset($d['satisfaction_reelle']) && is_numeric($d['satisfaction_reelle']) && $d['satisfaction_reelle'] > 0) {
            $erreur_satisfaction = abs($d['satisfaction_prevue'] - $d['satisfaction_reelle']) / $d['satisfaction_reelle'];
            $precision_satisfaction += max(0, 100 - ($erreur_satisfaction * 100));
        }
        
        $count++;
    }
    
    return $count > 0 ? ($precision_temps + $precision_cout + $precision_satisfaction) / (3 * $count) : 75;
}

    
    private function genererRecommandations($planification) {
        $recommandations = [];
        
        // Analyse utilisation véhicules
        if ($planification['statistiques']['taux_utilisation_vehicules'] < 60) {
            $recommandations[] = [
                'type' => 'optimisation',
                'niveau' => 'info',
                'message' => 'Taux d\'utilisation des véhicules faible (' . 
                           round($planification['statistiques']['taux_utilisation_vehicules']) . 
                           '%). Possibilité de réduire la flotte ou d\'optimiser les tournées.'
            ];
        }
        
        // Analyse satisfaction
        if ($planification['statistiques']['satisfaction_moyenne'] < 80) {
            $recommandations[] = [
                'type' => 'qualite',
                'niveau' => 'warning',
                'message' => 'Satisfaction client prévue faible (' . 
                           round($planification['statistiques']['satisfaction_moyenne']) . 
                           '%). Vérifier les délais et la répartition des priorités.'
            ];
        }
        
        // Analyse coûts
        if ($planification['statistiques']['cout_total'] > 0) {
            $cout_par_commande = $planification['statistiques']['cout_total'] / $planification['statistiques']['nb_commandes_total'];
            if ($cout_par_commande > 45) {
                $recommandations[] = [
                    'type' => 'cout',
                    'niveau' => 'warning',
                    'message' => 'Coût moyen par livraison élevé (' . 
                               round($cout_par_commande, 2) . ' DH). Considérer l\'optimisation des trajets.'
                ];
            }
        }
        
        // Analyse distances
        foreach ($planification['vehicules'] as $vehicule_id => $plan_vehicule) {
            if ($plan_vehicule['distance_totale'] > 150) {
                $recommandations[] = [
                    'type' => 'distance',
                    'niveau' => 'info',
                    'message' => "Véhicule {$plan_vehicule['vehicule_id']} : distance importante (" . 
                               round($plan_vehicule['distance_totale']) . " km). Vérifier la faisabilité."
                ];
            }
            
            if ($plan_vehicule['temps_total'] > SystemConfig::MAX_HEURES_TRAVAIL * 60) {
                $recommandations[] = [
                    'type' => 'temps_travail',
                    'niveau' => 'error',
                    'message' => "Véhicule {$plan_vehicule['vehicule_id']} : dépassement temps légal (" . 
                               round($plan_vehicule['temps_total'] / 60, 1) . "h). Redistribution nécessaire."
                ];
            }
        }
        
        return $recommandations;
    }
    
    private function detecterAlertes($planification) {
        $alertes = [];
        
        // Alertes critiques
        foreach ($planification['vehicules'] as $plan_vehicule) {
            foreach ($plan_vehicule['etapes'] as $etape) {
                if ($etape['type'] === 'livraison') {
                    // Alerte satisfaction très faible
                    if ($etape['satisfaction_prevue'] < 60) {
                        $alertes[] = [
                            'type' => 'satisfaction_critique',
                            'niveau' => 'error',
                            'commande_id' => $etape['commande_id'],
                            'message' => "Satisfaction critique prévue pour commande {$etape['commande_id']} (" . 
                                       round($etape['satisfaction_prevue']) . "%)",
                            'actions_suggerees' => [
                                'Revoir la planification horaire',
                                'Affecter un chauffeur plus expérimenté',
                                'Contacter le client pour prévenir'
                            ]
                        ];
                    }
                    
                    // Alerte retard probable
                    $heure_limite = new DateTime($etape['heure_arrivee']);
                    $heure_limite->add(new DateInterval('PT30M'));
                    if ($heure_limite->format('H:i') > '18:00') {
                        $alertes[] = [
                            'type' => 'livraison_tardive',
                            'niveau' => 'warning',
                            'commande_id' => $etape['commande_id'],
                            'message' => "Livraison prévue après 18h pour commande {$etape['commande_id']}",
                            'heure_prevue' => $etape['heure_arrivee']
                        ];
                    }
                }
            }
        }
        
        // Alerte capacité
        foreach ($planification['vehicules'] as $plan_vehicule) {
            if ($plan_vehicule['utilisation_capacite'] > 95) {
                $alertes[] = [
                    'type' => 'capacite_limite',
                    'niveau' => 'warning',
                    'vehicule_id' => $plan_vehicule['vehicule_id'],
                    'message' => "Utilisation capacité proche du maximum (" . 
                               round($plan_vehicule['utilisation_capacite']) . "%)"
                ];
            }
        }
        
        return $alertes;
    }
    
    private function analyserPerformanceHistorique() {
        $periode = $_GET['periode'] ?? '30'; // jours
        
        $stmt = $this->pdo->prepare("
            SELECT 
                DATE(completed_at) as date_livraison,
                COUNT(*) as nb_livraisons,
                AVG(TIMESTAMPDIFF(MINUTE, heure_prevue, completed_at)) as retard_moyen,
                AVG(cout_reel) as cout_moyen,
                AVG(satisfaction_reelle) as satisfaction_moyenne,
                SUM(distance) as distance_totale,
                COUNT(DISTINCT chauffeur_id) as nb_chauffeurs_actifs
            FROM livraisons 
            WHERE completed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            AND completed_at IS NOT NULL
            GROUP BY DATE(completed_at)
            ORDER BY date_livraison DESC
        ");
        
        $stmt->execute([$periode]);
        $donnees_historiques = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Analyse des tendances
        $tendances = $this->analyserTendances($donnees_historiques);
        
        // Performance par chauffeur
        $stmt = $this->pdo->prepare("
            SELECT 
                ch.nom,
                COUNT(l.id) as nb_livraisons,
                AVG(TIMESTAMPDIFF(MINUTE, l.heure_prevue, l.completed_at)) as retard_moyen,
                AVG(l.satisfaction_reelle) as satisfaction_moyenne,
                SUM(l.distance) as distance_totale
            FROM livraisons l
            JOIN chauffeurs ch ON l.chauffeur_id = ch.id
            WHERE l.completed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY ch.id, ch.nom
            ORDER BY satisfaction_moyenne DESC, retard_moyen ASC
        ");
        
        $stmt->execute([$periode]);
        $performance_chauffeurs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return $this->reponseSucces([
            'periode_analyse' => $periode . ' jours',
            'donnees_quotidiennes' => $donnees_historiques,
            'tendances' => $tendances,
            'performance_chauffeurs' => $performance_chauffeurs,
            'modeles_ia' => [
                'precision_globale' => $this->calculerPrecisionPredictions(),
                'nb_echantillons' => count($donnees_historiques),
                'derniere_mise_a_jour' => date('Y-m-d H:i:s')
            ]
        ]);
    }
    
    private function analyserTendances($donnees) {
        if (count($donnees) < 7) {
            return ['message' => 'Données insuffisantes pour analyser les tendances'];
        }
        
        $donnees = array_reverse($donnees); // Plus ancien au plus récent
        
        // Tendance satisfaction
        $satisfaction_debut = array_slice($donnees, 0, 3);
        $satisfaction_fin = array_slice($donnees, -3);
        
        $satisfaction_moy_debut = array_sum(array_column($satisfaction_debut, 'satisfaction_moyenne')) / count($satisfaction_debut);
        $satisfaction_moy_fin = array_sum(array_column($satisfaction_fin, 'satisfaction_moyenne')) / count($satisfaction_fin);
        
        $tendance_satisfaction = $satisfaction_moy_fin - $satisfaction_moy_debut;
        
        // Tendance retards
        $retard_moy_debut = array_sum(array_column($satisfaction_debut, 'retard_moyen')) / count($satisfaction_debut);
        $retard_moy_fin = array_sum(array_column($satisfaction_fin, 'retard_moyen')) / count($satisfaction_fin);
        
        $tendance_retard = $retard_moy_fin - $retard_moy_debut;
        
        // Tendance coûts
        $cout_moy_debut = array_sum(array_column($satisfaction_debut, 'cout_moyen')) / count($satisfaction_debut);
        $cout_moy_fin = array_sum(array_column($satisfaction_fin, 'cout_moyen')) / count($satisfaction_fin);
        
        $tendance_cout = $cout_moy_fin - $cout_moy_debut;
        
        return [
            'satisfaction' => [
                'evolution' => $tendance_satisfaction > 2 ? 'amélioration' : 
                             ($tendance_satisfaction < -2 ? 'dégradation' : 'stable'),
                'variation' => round($tendance_satisfaction, 2)
            ],
            'ponctualite' => [
                'evolution' => $tendance_retard < -2 ? 'amélioration' : 
                             ($tendance_retard > 2 ? 'dégradation' : 'stable'),
                'variation_minutes' => round($tendance_retard, 2)
            ],
            'couts' => [
                'evolution' => $tendance_cout < -2 ? 'amélioration' : 
                             ($tendance_cout > 2 ? 'augmentation' : 'stable'),
                'variation_dh' => round($tendance_cout, 2)
            ]
        ];
    }
    
    private function predireSatisfactionCommande() {
        $commande_id = $_POST['commande_id'] ?? null;
        if (!$commande_id) {
            throw new Exception('ID commande requis');
        }
        
        $stmt = $this->pdo->prepare("
            SELECT c.*, cl.type_client, cl.volume_mensuel
            FROM commandes c
            JOIN clients cl ON c.client_id = cl.id
            WHERE c.id = ?
        ");
        
        $stmt->execute([$commande_id]);
        $donnees_commande = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$donnees_commande) {
            throw new Exception('Commande non trouvée');
        }
        
        $commande = new CommandeIntelligente($donnees_commande);
        
        // Prédictions avec différents scénarios
        $scenarios = [
            'optimiste' => ['retard' => 0, 'chauffeur_exp' => 5],
            'realiste' => ['retard' => 5, 'chauffeur_exp' => 3],
            'pessimiste' => ['retard' => 15, 'chauffeur_exp' => 1]
        ];
        
        $predictions = [];
        foreach ($scenarios as $nom_scenario => $params) {
            $satisfaction = $this->moteur_ia->predireSatisfactionClient($commande, $params['retard']);
            $predictions[$nom_scenario] = [
                'satisfaction_prevue' => round($satisfaction, 1),
                'retard_simule' => $params['retard'],
                'niveau_chauffeur' => $params['chauffeur_exp'] >= 4 ? 'expert' : 'standard'
            ];
        }
        
        // Facteurs d'influence
        $facteurs_influence = [
            'urgence_commande' => $commande->score_urgence,
            'type_client' => $commande->type_client,
            'complexite' => $commande->complexite,
            'distance_estimee' => $commande->estimerDistanceAtelier(),
            'volume_client' => $commande->volume_mensuel
        ];
        
        // Recommandations
        $recommandations = [];
        if ($predictions['realiste']['satisfaction_prevue'] < 75) {
            $recommandations[] = 'Affecter un chauffeur expérimenté';
            $recommandations[] = 'Prévoir une marge horaire supplémentaire';
            $recommandations[] = 'Contacter le client pour confirmer la disponibilité';
        }
        
        if ($commande->type_client === 'vip' && $predictions['optimiste']['satisfaction_prevue'] < 90) {
            $recommandations[] = 'Client VIP : assurer une livraison prioritaire';
        }
        
        return $this->reponseSucces([
            'commande_id' => $commande_id,
            'predictions' => $predictions,
            'facteurs_influence' => $facteurs_influence,
            'recommandations' => $recommandations,
            'confiance_prediction' => $this->calculerConfiancePrediction($commande)
        ]);
    }
    
    private function calculerConfiancePrediction($commande) {
        // Base sur la quantité de données historiques similaires
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) as nb_similaires
            FROM livraisons l
            JOIN clients cl ON l.client_id = cl.id
            WHERE cl.type_client = ? 
            AND l.completed_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            AND ABS(l.distance - ?) < 10
        ");
        
        $distance_estimee = $commande->estimerDistanceAtelier();
        $stmt->execute([$commande->type_client, $distance_estimee]);
        $nb_similaires = $stmt->fetchColumn();
        
        if ($nb_similaires > 50) return 'haute';
        elseif ($nb_similaires > 20) return 'moyenne';
        elseif ($nb_similaires > 5) return 'faible';
        else return 'très faible';
    }
    
    private function optimiserTourneesUniquement() {
        $vehicule_ids = $_POST['vehicule_ids'] ?? [];
        if (empty($vehicule_ids)) {
            throw new Exception('IDs véhicules requis');
        }
        
        $results = [];
        
        foreach ($vehicule_ids as $vehicule_id) {
            // Récupérer les commandes assignées au véhicule
            $stmt = $this->pdo->prepare("
                SELECT c.*, cl.type_client, cl.volume_mensuel
                FROM commandes c
                JOIN clients cl ON c.client_id = cl.id
                WHERE c.vehicule_assigne = ? 
                ORDER BY c.priorite DESC
            ");
            
            $stmt->execute([$vehicule_id]);
            $commandes_vehicule = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (empty($commandes_vehicule)) {
                $results[$vehicule_id] = ['message' => 'Aucune commande assignée'];
                continue;
            }
            
            // Récupérer infos véhicule
            $stmt = $this->pdo->prepare("
                SELECT cam.*, ch.nom as chauffeur_nom, ch.specialites
                FROM camions cam
                JOIN chauffeurs ch ON cam.chauffeur_id = ch.id
                WHERE cam.id = ?
            ");
            
            $stmt->execute([$vehicule_id]);
            $info_vehicule = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$info_vehicule) {
                $results[$vehicule_id] = ['erreur' => 'Véhicule non trouvé'];
                continue;
            }
            
            // Optimisation spécifique
            $commandes_obj = array_map(fn($cmd) => new CommandeIntelligente($cmd), $commandes_vehicule);
            $vehicule_obj = new VehiculeIntelligent($info_vehicule);
            
            $tournee_optimisee = $this->optimiseur->optimiserTourneeVehicule(
                $commandes_obj, 
                $vehicule_obj, 
                $this->chargerStocks()
            );
            
            $results[$vehicule_id] = [
                'tournee_originale' => count($commandes_vehicule),
                'tournee_optimisee' => count($tournee_optimisee),
                'ordre_optimal' => array_map(fn($cmd) => $cmd->id, $tournee_optimisee),
                'gain_estime' => $this->calculerGainOptimisation($commandes_obj, $tournee_optimisee, $vehicule_obj)
            ];
        }
        
        return $this->reponseSucces([
            'optimisations' => $results,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
    
    private function calculerGainOptimisation($tournee_originale, $tournee_optimisee, $vehicule) {
        // Calcul distances
        $distance_originale = $this->calculerDistanceTournee($tournee_originale);
        $distance_optimisee = $this->calculerDistanceTournee($tournee_optimisee);
        
        $gain_distance = $distance_originale - $distance_optimisee;
        $gain_temps = $gain_distance / 45 * 60; // Estimation temps en minutes
        $gain_cout = $gain_distance * $vehicule->cout_km + ($gain_temps / 60) * $vehicule->cout_heure;
        
        return [
            'distance_km' => round($gain_distance, 2),
            'temps_minutes' => round($gain_temps, 1),
            'cout_dh' => round($gain_cout, 2),
            'pourcentage_amelioration' => $distance_originale > 0 ? 
                round(($gain_distance / $distance_originale) * 100, 1) : 0
        ];
    }
    
    private function calculerDistanceTournee($tournee) {
        if (empty($tournee)) return 0;
        
        $atelier = ['latitude' => 31.584044, 'longitude' => -8.102375];
        $distance_totale = 0;
        $position = $atelier;
        
        foreach ($tournee as $commande) {
            $distance_totale += $this->calculerDistanceHaversine(
                $position['latitude'], $position['longitude'],
                $commande->latitude, $commande->longitude
            );
            $position = ['latitude' => $commande->latitude, 'longitude' => $commande->longitude];
        }
        
        // Retour atelier
        $distance_totale += $this->calculerDistanceHaversine(
            $position['latitude'], $position['longitude'],
            $atelier['latitude'], $atelier['longitude']
        );
        
        return $distance_totale;
    }
    
   private function calculerDistanceHaversine($lat1, $lon1, $lat2, $lon2) {
    // Convertir en float ou mettre 0 si invalide
    $lat1 = is_numeric($lat1) ? floatval($lat1) : 0;
    $lat2 = is_numeric($lat2) ? floatval($lat2) : 0;
    $lon1 = is_numeric($lon1) ? floatval($lon1) : 0;
    $lon2 = is_numeric($lon2) ? floatval($lon2) : 0;

    if ($lat1 == $lat2 && $lon1 == $lon2) return 0;
    
    $earth_radius = 6371;
    $dLat = deg2rad($lat2 - $lat1);
    $dLon = deg2rad($lon2 - $lon1);
    $a = sin($dLat / 2) * sin($dLat / 2) +
         cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
         sin($dLon / 2) * sin($dLon / 2);
    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
    return $earth_radius * $c;
}

    
    private function obtenirStatistiquesIA() {
        $stats = [
            'modeles' => [],
            'performance' => [],
            'apprentissage' => [],
            'utilisation' => []
        ];
        
        // Statistiques des modèles
        foreach ($this->moteur_ia->modeles_ml as $nom_modele => $modele) {
            $stats['modeles'][$nom_modele] = [
                'nb_variables' => count($modele['variables'] ?? []),
                'nb_echantillons' => $modele['n_samples'] ?? 0,
                'r_squared' => round($modele['r_squared'] ?? 0, 3),
                'derniere_mise_a_jour' => date('Y-m-d H:i:s')
            ];
        }
        
        // Performance globale
        $stats['performance'] = [
            'precision_globale' => $this->calculerPrecisionPredictions(),
            'nb_predictions_jour' => $this->compterPredictionsJour(),
            'temps_moyen_optimisation' => $this->calculerTempsMoyenOptimisation()
        ];
        
        // Données d'apprentissage
        $stmt = $this->pdo->query("
            SELECT 
                COUNT(*) as nb_livraisons_total,
                COUNT(CASE WHEN completed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as nb_recent,
                MIN(completed_at) as premiere_donnee,
                MAX(completed_at) as derniere_donnee
            FROM livraisons 
            WHERE completed_at IS NOT NULL
        ");
        
        $donnees_apprentissage = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['apprentissage'] = $donnees_apprentissage;
        
        // Utilisation système
        $stats['utilisation'] = [
            'requetes_jour' => $this->compterRequetesJour(),
            'vehicules_actifs' => $this->compterVehiculesActifs(),
            'commandes_traitees' => $this->compterCommandesTraitees()
        ];
        
        return $this->reponseSucces($stats);
    }
    
    private function compterPredictionsJour() {
        // Simulation - dans un vrai système, ceci serait tracké
        return rand(50, 200);
    }
    
    private function calculerTempsMoyenOptimisation() {
        // Basé sur les logs ou mesures récentes
        return rand(2, 8) + (rand(0, 99) / 100); // 2-8 secondes
    }
    
    private function compterRequetesJour() {
        // Simulation compteur requêtes
        return rand(100, 500);
    }
    
    private function compterVehiculesActifs() {
        $stmt = $this->pdo->query("SELECT COUNT(*) FROM camions WHERE statut = 'disponible'");
        return $stmt->fetchColumn();
    }
    
    private function compterCommandesTraitees() {
        $stmt = $this->pdo->query("
            SELECT COUNT(*) FROM commandes 
            WHERE DATE(date_commande) = CURDATE()
        ");
        return $stmt->fetchColumn();
    }
    
    private function sauvegarderPlanificationPourApprentissage($planification) {
        // Sauvegarde pour amélioration continue du modèle
        $stmt = $this->pdo->prepare("
            INSERT INTO planifications_ia 
            (date_creation, nb_commandes, nb_vehicules, distance_totale, 
             cout_total, satisfaction_prevue, temps_execution, version_algo)
            VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $planification['statistiques']['nb_commandes_total'],
            count($planification['vehicules']),
            $planification['statistiques']['distance_totale'],
            $planification['statistiques']['cout_total'],
            $planification['statistiques']['satisfaction_moyenne'],
            $planification['metriques_ia']['temps_execution'],
            '5.0'
        ]);
    }
    
    private function reponseSucces($data) {
        return [
            'success' => true,
            'timestamp' => date('Y-m-d H:i:s'),
            'data' => $data
        ];
    }
    
    private function reponseErreur($message) {
        http_response_code(400);
        return [
            'success' => false,
            'error' => $message,
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
}

// =================== UTILITAIRES ET HELPERS ===================

class UtilitairesLogistiques {
    
    public static function convertirAdresseEnCoordonnees($adresse) {
        // Intégration avec API géocodage (Google Maps, OpenStreetMap, etc.)
        // Pour la démo, retourne des coordonnées aléatoires dans la région de Marrakech
        return [
            'latitude' => 31.5 + (rand(-100, 100) / 1000),
            'longitude' => -8.0 + (rand(-100, 100) / 1000)
        ];
    }
    
    public static function calculerEmpreinteCarbonne($distance, $type_vehicule) {
        $facteurs_emission = [
            'leger' => 0.12,    // kg CO2/km
            'moyen' => 0.18,
            'lourd' => 0.25,
            'frigorifique' => 0.22,
            'benne' => 0.28
        ];
        
        $facteur = $facteurs_emission[$type_vehicule] ?? 0.18;
        return $distance * $facteur;
    }
    
    public static function genererRapportPerformance($periode_jours = 30) {
        global $pdo;
        
        $stmt = $pdo->prepare("
            SELECT 
                COUNT(*) as total_livraisons,
                AVG(satisfaction_reelle) as satisfaction_moyenne,
                AVG(TIMESTAMPDIFF(MINUTE, heure_prevue, completed_at)) as retard_moyen,
                SUM(distance) as distance_totale,
                SUM(cout_reel) as cout_total,
                COUNT(DISTINCT chauffeur_id) as nb_chauffeurs,
                COUNT(DISTINCT camion_id) as nb_vehicules
            FROM livraisons 
            WHERE completed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            AND completed_at IS NOT NULL
        ");
        
        $stmt->execute([$periode_jours]);
        $stats = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Enrichissement avec calculs dérivés
        $stats['cout_moyen_livraison'] = $stats['total_livraisons'] > 0 ? 
            $stats['cout_total'] / $stats['total_livraisons'] : 0;
        
        $stats['distance_moyenne_livraison'] = $stats['total_livraisons'] > 0 ? 
            $stats['distance_totale'] / $stats['total_livraisons'] : 0;
        
        $stats['empreinte_carbone_totale'] = $stats['distance_totale'] * 0.18; // Facteur moyen
        
        $stats['productivite_chauffeur'] = $stats['nb_chauffeurs'] > 0 ? 
            $stats['total_livraisons'] / $stats['nb_chauffeurs'] : 0;
        
        return $stats;
    }
    
    public static function validerDonneesCommande($donnees) {
        $erreurs = [];
        
        // Validation champs obligatoires
        $champs_requis = ['client_id', 'produit', 'quantite', 'adresse', 'priorite'];
        foreach ($champs_requis as $champ) {
            if (empty($donnees[$champ])) {
                $erreurs[] = "Champ requis manquant: $champ";
            }
        }
        
        // Validation quantité
        if (isset($donnees['quantite']) && ($donnees['quantite'] <= 0 || $donnees['quantite'] > 1000)) {
            $erreurs[] = "Quantité invalide (doit être entre 1 et 1000)";
        }
        
        // Validation priorité
        $priorites_valides = ['basse', 'normale', 'moyenne', 'haute', 'urgente', 'critique'];
        if (isset($donnees['priorite']) && !in_array($donnees['priorite'], $priorites_valides)) {
            $erreurs[] = "Priorité invalide";
        }
        
        // Validation coordonnées
        if (isset($donnees['latitude']) && ($donnees['latitude'] < 28 || $donnees['latitude'] > 36)) {
            $erreurs[] = "Latitude hors zone de service";
        }
        
        if (isset($donnees['longitude']) && ($donnees['longitude'] < -12 || $donnees['longitude'] > -1)) {
            $erreurs[] = "Longitude hors zone de service";
        }
        
        return $erreurs;
    }
}

// =================== POINT D'ENTRÉE PRINCIPAL ===================

try {
    $api = new ApiPlanificationV5();
    $resultat = $api->traiterRequete();
    
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($resultat, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'error' => 'Erreur serveur: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE);
}

// =================== DOCUMENTATION API ===================


/* ENDPOINTS DISPONIBLES:

1. POST /api/planification.php?action=planifier
   - Génère une planification complète optimisée par IA
   - Retourne: planification détaillée, recommandations, alertes

2. GET /api/planification.php?action=analyser_performance&periode=30
   - Analyse les performances historiques
   - Paramètre: periode (jours, défaut: 30)
   - Retourne: tendances, statistiques, performance par chauffeur

3. POST /api/planification.php?action=predire_satisfaction
   - Prédit la satisfaction pour une commande
   - Body: {"commande_id": 123}
   - Retourne: prédictions selon différents scénarios

4. POST /api/planification.php?action=optimiser_tournees
   - Optimise les tournées pour des véhicules spécifiques
   - Body: {"vehicule_ids": [1, 2, 3]}
   - Retourne: tournées optimisées et gains estimés

5. GET /api/planification.php?action=statistiques_ia
   - Statistiques des modèles d'IA et performance du système */
    
    