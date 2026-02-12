<?php
// api/verify_token.php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

if ($db === null) {
    http_response_code(500);
    echo json_encode(["message" => "Error de conexión a la base de datos"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"));

// Log para depuración
// Logging
$logFile = __DIR__ . '/verify_log.txt';
function log_msg($msg) {
    global $logFile;
    @file_put_contents($logFile, date('Y-m-d H:i:s') . " " . $msg . PHP_EOL, FILE_APPEND);
}

log_msg("Verify token: " . print_r($data, true));

if (!empty($data->token)) {
    // Decodificar token
    $decoded = base64_decode($data->token);
    $parts = explode(':', $decoded);
    
    if (count($parts) >= 2) {
        $user_id = $parts[0];
        
        // Verificar si el usuario existe en tabla CUENTAS
        $query = "SELECT id, `nombre completo`, `correo electronico` FROM cuentas WHERE id = :id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':id', $user_id);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            
            http_response_code(200);
            echo json_encode([
                "valid" => true,
                "user" => [
                    "id" => $row['id'],
                    "nombre" => $row['nombre completo'],
                    "correo" => $row['correo electronico']
                ]
            ]);
            log_msg("Token valid for user id: " . $user_id);
        } else {
            http_response_code(401);
            echo json_encode(["valid" => false, "message" => "Token inválido"]);
            log_msg("Token invalid: user not found id=" . $user_id);
        }
    } else {
        http_response_code(401);
        echo json_encode(["valid" => false, "message" => "Token mal formado"]);
        log_msg("Token mal formado: " . $data->token);
    }
} else {
    http_response_code(400);
    echo json_encode(["valid" => false, "message" => "Token no proporcionado"]);
    log_msg("Token not provided");
}
?>