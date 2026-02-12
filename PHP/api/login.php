<?php
// api/login.php
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
$logFile = __DIR__ . '/login_log.txt';
function log_msg($msg) {
    global $logFile;
    @file_put_contents($logFile, date('Y-m-d H:i:s') . " " . $msg . PHP_EOL, FILE_APPEND);
}

log_msg("Login attempt: " . print_r($data, true));

if (!empty($data->correo) && !empty($data->password)) {
    // Buscar usuario por correo electrónico (nombre de campo exacto)
    $query = "SELECT id, `nombre completo`, `correo electronico`, `contraseña` FROM cuentas 
              WHERE `correo electronico` = :correo";
    
    $stmt = $db->prepare($query);
    $correo = htmlspecialchars(strip_tags($data->correo));
    $stmt->bindParam(':correo', $correo);
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $id = $row['id'];
        $nombre = $row['nombre completo'];
        $correo = $row['correo electronico'];
        $stored_password = $row['contraseña'];

        // Verificar contraseña
        if (password_verify($data->password, $stored_password)) {
            // Crear token simple
            $token = base64_encode($id . ':' . $correo . ':' . time());
            
            http_response_code(200);
            echo json_encode([
                "success" => true,
                "message" => "Login exitoso",
                "token" => $token,
                "user" => [
                    "id" => $id,
                    "nombre" => $nombre,
                    "correo" => $correo
                ]
            ]);
            log_msg("Login success for user: " . $correo);
        } else {
            http_response_code(401);
            echo json_encode(["success" => false, "message" => "Contraseña incorrecta"]);
            log_msg("Login failed: wrong password for " . $correo);
        }
    } else {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Usuario no encontrado"]);
        log_msg("Login failed: user not found " . $correo);
    }
} else {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Datos incompletos. Necesita: correo, password"]);
    log_msg("Login failed: incomplete data");
}
?>