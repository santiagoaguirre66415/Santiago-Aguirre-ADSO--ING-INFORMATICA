<?php
// api/register.php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');

// Responder a OPTIONS para CORS preflight
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

// Logging
$logFile = __DIR__ . '/register_log.txt';
function log_msg($msg) {
    global $logFile;
    @file_put_contents($logFile, date('Y-m-d H:i:s') . " " . $msg . PHP_EOL, FILE_APPEND);
}

log_msg("Register attempt: " . print_r($data, true));

try {
    // SOLO 3 CAMPOS como en tu tabla
    if (!empty($data->nombre) && !empty($data->correo) && !empty($data->password)) {

        // Verificar si el correo ya existe (nombre de campo exacto con tildes)
        $query = "SELECT id FROM cuentas WHERE `correo electronico` = :correo";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':correo', $data->correo);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "El correo electrónico ya está registrado"]);
            log_msg("Register failed: email already exists " . $data->correo);
            exit();
        }

        // Encriptar contraseña
        $hashed_password = password_hash($data->password, PASSWORD_DEFAULT);

        // Insertar en tabla CUENTAS con nombres de campos exactos
        $query = "INSERT INTO cuentas (`nombre completo`, `correo electronico`, `contraseña`) 
                  VALUES (:nombre, :correo, :password)";

        $stmt = $db->prepare($query);

        // Limpiar datos
        $nombre = htmlspecialchars(strip_tags($data->nombre));
        $correo = htmlspecialchars(strip_tags($data->correo));

        $stmt->bindParam(':nombre', $nombre);
        $stmt->bindParam(':correo', $correo);
        $stmt->bindParam(':password', $hashed_password);

        if ($stmt->execute()) {
            http_response_code(201);
            echo json_encode([
                "success" => true,
                "message" => "Usuario creado exitosamente",
                "id" => $db->lastInsertId(),
                "nombre" => $nombre,
                "correo" => $correo
            ]);
            log_msg("Register success for user: " . $correo);
        } else {
            http_response_code(503);
            $err = json_encode(["success" => false, "message" => "No se pudo crear el usuario"]);
            log_msg("Register execute failed: " . $err);
            echo $err;
        }
    } else {
        http_response_code(400);
        $err = json_encode(["success" => false, "message" => "Datos incompletos. Necesita: nombre, correo, password"]);
        log_msg("Register bad request: " . print_r($data, true));
        echo $err;
    }
} catch (Exception $e) {
    http_response_code(500);
    log_msg("Register exception: " . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Error del servidor"]);
}
?>