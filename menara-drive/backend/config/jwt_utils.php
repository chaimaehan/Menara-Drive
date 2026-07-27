<?php

// Clé secrète pour signer le JWT (à garder secrète et dans un fichier sécurisé)
define('JWT_SECRET_KEY', 'TA_CLE_SECRETE_Ici'); 

// Fonction pour encoder un tableau en JWT simple (HS256)
function jwt_encode($payload, $key = JWT_SECRET_KEY, $alg = 'HS256') {
    $header = ['typ' => 'JWT', 'alg' => $alg];
    
    $base64UrlHeader = base64url_encode(json_encode($header));
    $base64UrlPayload = base64url_encode(json_encode($payload));
    
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $key, true);
    $base64UrlSignature = base64url_encode($signature);
    
    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

// Fonction pour décoder et vérifier un JWT
function jwt_decode($jwt, $key = JWT_SECRET_KEY, $alg = 'HS256') {
    $parts = explode('.', $jwt);
    if (count($parts) !== 3) {
        throw new Exception('Token invalide');
    }
    list($base64UrlHeader, $base64UrlPayload, $base64UrlSignature) = $parts;
    
    $header = json_decode(base64url_decode($base64UrlHeader), true);
    if ($header['alg'] !== $alg) {
        throw new Exception('Algorithme non supporté');
    }
    
    $payload = json_decode(base64url_decode($base64UrlPayload), true);
    $signature = base64url_decode($base64UrlSignature);
    
    $valid_signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $key, true);
    
    if (!hash_equals($valid_signature, $signature)) {
        throw new Exception('Signature invalide');
    }
    
    return $payload;
}

// Fonctions auxiliaires base64url (RFC 4648)
function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode($data) {
    $pad = 4 - (strlen($data) % 4);
    if ($pad < 4) {
        $data .= str_repeat('=', $pad);
    }
    return base64_decode(strtr($data, '-_', '+/'));
}
