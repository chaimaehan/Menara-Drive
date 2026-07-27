<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../../config/database.php';
// $pdo est maintenant disponible

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    echo json_encode(['success' => false, 'message' => 'Données invalides']);
    exit;
}

$nom       = trim($data['nom'] ?? '');
$email     = trim($data['email'] ?? '');
$password  = $data['password'] ?? '';
$telephone = trim($data['telephone'] ?? '');
$adresse   = trim($data['adresse'] ?? '');
$role      = strtolower(trim($data['role'] ?? 'chauffeur'));

if (empty($nom) || empty($email) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'Champs obligatoires manquants']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Email invalide']);
    exit;
}

if (strlen($password) < 6) {
    echo json_encode(['success' => false, 'message' => 'Mot de passe trop court']);
    exit;
}

try {
    $checkStmt = $pdo->prepare("SELECT id FROM users WHERE email = :email");
    $checkStmt->execute([':email' => $email]);
    if ($checkStmt->rowCount() > 0) {
        echo json_encode(['success' => false, 'message' => 'Cet email est déjà utilisé']);
        exit;
    }

    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $pdo->prepare(
        "INSERT INTO users (nom, email, password, telephone, adresse, role, created_at) 
         VALUES (:nom, :email, :password, :telephone, :adresse, :role, NOW())"
    );

    $result = $stmt->execute([
        ':nom'       => $nom,
        ':email'     => $email,
        ':password'  => $hashedPassword,
        ':telephone' => $telephone,
        ':adresse'   => $adresse,
        ':role'      => $role
    ]);

    if ($result) {
        echo json_encode([
            'success' => true,
            'message' => 'Compte créé avec succès',
            'user_id' => $pdo->lastInsertId()
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Insertion échouée']);
    }

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Erreur: ' . $e->getMessage()]);
}
?>