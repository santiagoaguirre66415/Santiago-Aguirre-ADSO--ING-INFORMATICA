<?php
// PHP/test_connection.php - verifica conexión a la base de datos y existencia de la tabla `cuentas`
// CORS
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Mostrar errores para depuración (quitar en producción)
error_reporting(E_ALL);
ini_set('display_errors', 1);

include_once __DIR__ . '/config/database.php';

$result = ["ok" => false, "message" => "", "details" => null];

$database = new Database();
$db = $database->getConnection();

if ($db === null) {
    $result['message'] = 'No se pudo conectar a la base de datos.';
    echo json_encode($result);
    exit();
}

try {
    // Probar una consulta simple
    $stmt = $db->query("SHOW TABLES LIKE 'cuentas'");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if (count($tables) === 0) {
        $result['message'] = "La tabla 'cuentas' no existe en la base de datos '{$database->db_name}' (verifica nombre y estructura).";
        $result['details'] = ['tables_found' => $tables];
    } else {
        // Obtener estructura de la tabla
        $stmt2 = $db->query("DESCRIBE `cuentas`");
        $cols = $stmt2->fetchAll(PDO::FETCH_ASSOC);
        $result['ok'] = true;
        $result['message'] = "Conexión OK y tabla 'cuentas' encontrada.";
        $result['details'] = ['columns' => $cols];
    }
} catch (PDOException $e) {
    $result['message'] = 'Error ejecutando consulta: ' . $e->getMessage();
    $result['details'] = null;
}

echo json_encode($result, JSON_PRETTY_PRINT);
?>