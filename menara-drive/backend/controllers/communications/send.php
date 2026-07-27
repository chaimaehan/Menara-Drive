<?php
// backend/controllers/communications/send.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/database.php';
require_once '../../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class CommunicationService {
    private $db;
    
    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->createTableIfNotExists();
    }

    // Créer la table si elle n'existe pas
    private function createTableIfNotExists() {
        $query = "CREATE TABLE IF NOT EXISTS communications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            recipient VARCHAR(255),
            recipient_name VARCHAR(255),
            subject VARCHAR(500),
            message TEXT,
            type ENUM('email', 'sms') DEFAULT 'email',
            category VARCHAR(50) DEFAULT 'info',
            status VARCHAR(50) DEFAULT 'sent',
            sent_at DATETIME,
            created_at DATETIME
        )";
        $this->db->exec($query);
    }
    
    // Envoyer un email
    public function sendEmail($to, $toName, $subject, $message, $category = 'info') {
        $mail = new PHPMailer(true);
        
        try {
            // Configuration SMTP - À modifier selon votre serveur
            $mail->isSMTP();
            $mail->Host = 'smtp.gmail.com';
            $mail->SMTPAuth = true;
            $mail->Username = 'your-email@gmail.com';
            $mail->Password = 'your-app-password';
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = 587;
            
            $mail->setFrom('noreply@optitruck.com', 'OptiTruck');
            $mail->addAddress($to, $toName);
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = $this->getEmailTemplate($message, $category, $toName);
            $mail->AltBody = strip_tags($message);
            
            $mail->send();
            
            $this->saveCommunication($to, $toName, $subject, $message, 'email', $category, 'sent');
            return ['success' => true, 'message' => 'Email envoyé avec succès'];
        } catch (Exception $e) {
            // Même si l'email échoue (SMTP non configuré), on sauvegarde quand même
            $this->saveCommunication($to, $toName, $subject, $message, 'email', $category, 'failed');
            return ['success' => false, 'message' => 'Email non envoyé (SMTP): ' . $mail->ErrorInfo, 'saved' => true];
        }
    }
    
    // Envoyer un SMS (via API externe)
    public function sendSMS($phone, $name, $message, $category = 'info') {
        // Simulé — à adapter selon votre fournisseur SMS
        $success = true;
        
        $status = $success ? 'sent' : 'failed';
        $this->saveCommunication($phone, $name, 'SMS', $message, 'sms', $category, $status);

        if ($success) {
            return ['success' => true, 'message' => 'SMS envoyé avec succès'];
        } else {
            return ['success' => false, 'message' => 'Erreur lors de l\'envoi du SMS'];
        }
    }
    
    // Sauvegarder la communication
    private function saveCommunication($recipient, $recipientName, $subject, $message, $type, $category, $status) {
        $query = "INSERT INTO communications 
                  (recipient, recipient_name, subject, message, type, category, status, sent_at, created_at)
                  VALUES 
                  (:recipient, :recipient_name, :subject, :message, :type, :category, :status, NOW(), NOW())";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute([
            ':recipient'      => $recipient,
            ':recipient_name' => $recipientName,
            ':subject'        => $subject,
            ':message'        => $message,
            ':type'           => $type,
            ':category'       => $category,
            ':status'         => $status
        ]);
    }
    
    // Récupérer l'historique des communications
    public function getCommunications($limit = 50) {
        $sql = "SELECT * FROM communications ORDER BY created_at DESC LIMIT :limit";
        $stmt = $this->db->prepare($sql);
        $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    // ✅ CORRIGÉ : COALESCE remplace NULL par 0 quand la table est vide
    public function getStatistics() {
        $query = "SELECT 
                    COUNT(*) as total,
                    COALESCE(SUM(CASE WHEN type = 'email' THEN 1 ELSE 0 END), 0) as emails,
                    COALESCE(SUM(CASE WHEN type = 'sms' THEN 1 ELSE 0 END), 0) as sms,
                    COALESCE(SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END), 0) as sent,
                    COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) as failed
                  FROM communications";
        $stmt = $this->db->prepare($query);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        // Forcer les valeurs en entier pour éviter les strings MySQL
        return [
            'total'  => (int) $result['total'],
            'emails' => (int) $result['emails'],
            'sms'    => (int) $result['sms'],
            'sent'   => (int) $result['sent'],
            'failed' => (int) $result['failed'],
        ];
    }
    
    // Template d'email HTML
    private function getEmailTemplate($message, $type, $name) {
        $colors = [
            'info'    => '#AA9766',
            'success' => '#10b981',
            'warning' => '#f59e0b',
            'error'   => '#ef4444'
        ];
        $color = $colors[$type] ?? $colors['info'];
        
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: {$color}; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f8f5eb; padding: 30px; border-radius: 0 0 10px 10px; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #8A7A52; }
                .button { display: inline-block; padding: 10px 20px; background: {$color}; color: white; text-decoration: none; border-radius: 5px; }
                .logo { font-size: 24px; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <div class='logo'>🚛 OptiTruck</div>
                    <p>Système de gestion logistique</p>
                </div>
                <div class='content'>
                    <p>Bonjour " . htmlspecialchars($name) . ",</p>
                    " . nl2br(htmlspecialchars($message)) . "
                    <p style='margin-top: 20px;'>
                        <a href='https://optitruck.com' class='button'>Accéder à OptiTruck</a>
                    </p>
                    <p style='margin-top: 20px; font-size: 12px; color: #8A7A52;'>
                        Cet email est généré automatiquement, merci de ne pas y répondre.
                    </p>
                </div>
                <div class='footer'>
                    <p>© 2024 OptiTruck - Menara Préfa. Tous droits réservés.</p>
                </div>
            </div>
        </body>
        </html>
        ";
    }
}

// ─── Routing ───────────────────────────────────────────────────────────────
$communication = new CommunicationService();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['stats'])) {
            $result = $communication->getStatistics();
            echo json_encode(['success' => true, 'data' => $result]);
        } else {
            $limit  = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
            $result = $communication->getCommunications($limit);
            echo json_encode(['success' => true, 'data' => $result]);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data || !isset($data['type'])) {
            echo json_encode(['success' => false, 'message' => 'Données invalides']);
            break;
        }

        if ($data['type'] === 'email') {
            $result = $communication->sendEmail(
                $data['to']       ?? '',
                $data['to_name']  ?? '',
                $data['subject']  ?? '',
                $data['message']  ?? '',
                $data['category'] ?? 'info'
            );
        } elseif ($data['type'] === 'sms') {
            $result = $communication->sendSMS(
                $data['to']       ?? '',
                $data['to_name']  ?? '',
                $data['message']  ?? '',
                $data['category'] ?? 'info'
            );
        } else {
            $result = ['success' => false, 'message' => 'Type de communication invalide'];
        }

        echo json_encode($result);
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
}
?>