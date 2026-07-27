<?php
// backend/controllers/chat/chat.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Gérer les requêtes OPTIONS (preflight CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/database.php';

// Fonction pour décoder le JWT et récupérer user_id
function getUserIdFromToken($token) {
    try {
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;
        $payload = base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1]));
        $data = json_decode($payload, true);
        // Selon votre système, le champ peut être 'id', 'user_id', 'sub', etc.
        return $data['id'] ?? $data['user_id'] ?? $data['sub'] ?? null;
    } catch (Exception $e) {
        return null;
    }
}

class ChatAPI {
    private $db;
    
    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }
    
    // Récupérer les conversations de l'utilisateur
    public function getConversations($user_id) {
        $query = "SELECT DISTINCT c.*, 
                  (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND is_read = 0 AND sender_id != :user_id1) as unread_count,
                  (SELECT message FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                  (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
                  (SELECT u2.nom FROM conversation_participants cp2 
                   JOIN users u2 ON cp2.user_id = u2.id 
                   WHERE cp2.conversation_id = c.id AND cp2.user_id != :user_id2 LIMIT 1) as participant_name
                  FROM conversations c
                  JOIN conversation_participants cp ON c.id = cp.conversation_id
                  WHERE cp.user_id = :user_id3
                  ORDER BY last_message_time DESC";
        $stmt = $this->db->prepare($query);
        $stmt->execute([
            ':user_id1' => $user_id,
            ':user_id2' => $user_id,
            ':user_id3' => $user_id
        ]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    // Créer une nouvelle conversation
    public function createConversation($name, $type, $participants, $created_by) {
        $this->db->beginTransaction();
        try {
            // Pour une conversation privée, vérifier si elle existe déjà
            if ($type === 'private' && count($participants) === 1) {
                $other_user = $participants[0];
                $query = "SELECT c.id FROM conversations c
                          JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
                          JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
                          WHERE c.type = 'private'
                          AND cp1.user_id = :user1
                          AND cp2.user_id = :user2";
                $stmt = $this->db->prepare($query);
                $stmt->execute([':user1' => $created_by, ':user2' => $other_user]);
                $existing = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($existing) {
                    $this->db->rollBack();
                    return $existing['id'];
                }
            }

            $query = "INSERT INTO conversations (name, type, created_by) VALUES (:name, :type, :created_by)";
            $stmt = $this->db->prepare($query);
            $stmt->execute([
                ':name'       => $name ?? null,
                ':type'       => $type,
                ':created_by' => $created_by
            ]);
            $conversation_id = $this->db->lastInsertId();
            
            // Ajouter les participants (éviter les doublons)
            $all_participants = array_unique(array_merge($participants, [$created_by]));
            $query = "INSERT INTO conversation_participants (conversation_id, user_id) VALUES (:conv_id, :user_id)";
            $stmt = $this->db->prepare($query);
            foreach ($all_participants as $uid) {
                $stmt->execute([':conv_id' => $conversation_id, ':user_id' => $uid]);
            }
            
            $this->db->commit();
            return $conversation_id;
        } catch (Exception $e) {
            $this->db->rollBack();
            error_log('createConversation error: ' . $e->getMessage());
            return false;
        }
    }
    
    // Récupérer les messages d'une conversation
    public function getMessages($conversation_id, $user_id, $limit = 50, $offset = 0) {
        // Vérifier que l'utilisateur fait partie de la conversation
        $check = $this->db->prepare("SELECT id FROM conversation_participants WHERE conversation_id = :conv_id AND user_id = :user_id");
        $check->execute([':conv_id' => $conversation_id, ':user_id' => $user_id]);
        if (!$check->fetch()) return [];

        // Marquer les messages comme lus
        $upd = $this->db->prepare("UPDATE messages SET is_read = 1 WHERE conversation_id = :conv_id AND sender_id != :user_id");
        $upd->execute([':conv_id' => $conversation_id, ':user_id' => $user_id]);
        
        // Récupérer les messages
        $query = "SELECT m.*, u.nom as sender_name, u.role as sender_role
                  FROM messages m
                  JOIN users u ON m.sender_id = u.id
                  WHERE m.conversation_id = :conv_id
                  ORDER BY m.created_at DESC
                  LIMIT :limit OFFSET :offset";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':conv_id', $conversation_id, PDO::PARAM_INT);
        $stmt->bindParam(':limit',   $limit,           PDO::PARAM_INT);
        $stmt->bindParam(':offset',  $offset,          PDO::PARAM_INT);
        $stmt->execute();
        return array_reverse($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
    
    // Envoyer un message
    public function sendMessage($conversation_id, $sender_id, $message, $file_data = null) {
        // Vérifier que l'utilisateur fait partie de la conversation
        $check = $this->db->prepare("SELECT id FROM conversation_participants WHERE conversation_id = :conv_id AND user_id = :user_id");
        $check->execute([':conv_id' => $conversation_id, ':user_id' => $sender_id]);
        if (!$check->fetch()) return false;

        $query = "INSERT INTO messages (conversation_id, sender_id, message, file_url, file_name, file_size, file_type) 
                  VALUES (:conv_id, :sender_id, :message, :file_url, :file_name, :file_size, :file_type)";
        $stmt = $this->db->prepare($query);
        $params = [
            ':conv_id'   => $conversation_id,
            ':sender_id' => $sender_id,
            ':message'   => $message ?? '',
            ':file_url'  => $file_data['url']  ?? null,
            ':file_name' => $file_data['name'] ?? null,
            ':file_size' => $file_data['size'] ?? null,
            ':file_type' => $file_data['type'] ?? null
        ];
        if ($stmt->execute($params)) {
            $message_id = $this->db->lastInsertId();
            $this->createNotifications($conversation_id, $message_id, $sender_id);
            return $message_id;
        }
        return false;
    }
    
    // Créer des notifications
    private function createNotifications($conversation_id, $message_id, $sender_id) {
        $stmt = $this->db->prepare("SELECT user_id FROM conversation_participants WHERE conversation_id = :conv_id AND user_id != :sender_id");
        $stmt->execute([':conv_id' => $conversation_id, ':sender_id' => $sender_id]);
        $participants = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $ins = $this->db->prepare("INSERT INTO chat_notifications (user_id, message_id, conversation_id) VALUES (:user_id, :msg_id, :conv_id)");
        foreach ($participants as $p) {
            $ins->execute([':user_id' => $p['user_id'], ':msg_id' => $message_id, ':conv_id' => $conversation_id]);
        }
    }
    
    // Récupérer les utilisateurs disponibles pour chat
    public function getAvailableUsers($current_user_id) {
        $stmt = $this->db->prepare("SELECT id, nom, email, role FROM users WHERE id != :user_id ORDER BY nom");
        $stmt->execute([':user_id' => $current_user_id]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    // Récupérer les notifications non lues
    public function getUnreadNotifications($user_id) {
       $query = "SELECT cn.*, m.contenu, m.sender_id, u.nom as sender_name, c.name as conversation_name
                  FROM chat_notifications cn
                  JOIN messages m ON cn.message_id = m.id
                  JOIN users u ON m.sender_id = u.id
                  JOIN conversations c ON cn.conversation_id = c.id
                  WHERE cn.user_id = :user_id AND cn.is_read = 0
                  ORDER BY cn.created_at DESC";
        $stmt = $this->db->prepare($query);
        $stmt->execute([':user_id' => $user_id]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    // Marquer les notifications comme lues
    public function markNotificationsRead($user_id, $conversation_id = null) {
        $query = "UPDATE chat_notifications SET is_read = 1 WHERE user_id = :user_id";
        if ($conversation_id) $query .= " AND conversation_id = :conv_id";
        $stmt = $this->db->prepare($query);
        $params = [':user_id' => $user_id];
        if ($conversation_id) $params[':conv_id'] = $conversation_id;
        return $stmt->execute($params);
    }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
$chat    = new ChatAPI();
$method  = $_SERVER['REQUEST_METHOD'];
$headers = getallheaders();
$user_id = null;

if (isset($headers['Authorization'])) {
    $token   = str_replace('Bearer ', '', $headers['Authorization']);
    $user_id = getUserIdFromToken($token);
}

if (!$user_id) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Non authentifié']);
    exit();
}

// ─── Router ───────────────────────────────────────────────────────────────────
switch ($method) {
    case 'GET':
        if (isset($_GET['conversations'])) {
            echo json_encode(['success' => true, 'data' => $chat->getConversations($user_id)]);
        } elseif (isset($_GET['messages'], $_GET['conv_id'])) {
            $result = $chat->getMessages(intval($_GET['conv_id']), $user_id, intval($_GET['limit'] ?? 50), intval($_GET['offset'] ?? 0));
            echo json_encode(['success' => true, 'data' => $result]);
        } elseif (isset($_GET['users'])) {
            echo json_encode(['success' => true, 'data' => $chat->getAvailableUsers($user_id)]);
        } elseif (isset($_GET['notifications'])) {
            echo json_encode(['success' => true, 'data' => $chat->getUnreadNotifications($user_id)]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Paramètre manquant']);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        if (!isset($data['action'])) {
            echo json_encode(['success' => false, 'message' => 'Action manquante']);
            break;
        }
        switch ($data['action']) {
            case 'create_conversation':
                if (empty($data['participants']) || !is_array($data['participants'])) {
                    echo json_encode(['success' => false, 'message' => 'Participants manquants']);
                    break;
                }
                $result = $chat->createConversation($data['name'] ?? null, $data['type'] ?? 'private', $data['participants'], $user_id);
                echo json_encode(['success' => $result !== false, 'conversation_id' => $result]);
                break;

            case 'send_message':
                if (empty($data['conversation_id'])) {
                    echo json_encode(['success' => false, 'message' => 'conversation_id manquant']);
                    break;
                }
                $result = $chat->sendMessage(intval($data['conversation_id']), $user_id, $data['message'] ?? '', $data['file'] ?? null);
                echo json_encode(['success' => $result !== false, 'message_id' => $result]);
                break;

            case 'mark_read':
                $result = $chat->markNotificationsRead($user_id, $data['conversation_id'] ?? null);
                echo json_encode(['success' => $result]);
                break;

            default:
                echo json_encode(['success' => false, 'message' => 'Action inconnue']);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
}
?>