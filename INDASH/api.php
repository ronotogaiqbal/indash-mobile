<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Database configuration
$host = 'localhost';
$dbname = 'katam';
$username = 'katam';
$password = 'K@tamd4ta';

// Create connection
try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed: " . $e->getMessage()]);
    exit;
}

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get the SQL query from request
$input = json_decode(file_get_contents('php://input'), true);
$sql = isset($input['query']) ? trim($input['query']) : '';

// Validate SQL query
if (empty($sql)) {
    http_response_code(400);
    echo json_encode(["error" => "No SQL query provided"]);
    exit;
}

// Validate SQL query (basic security check)
$allowed_patterns = [
    '/^\s*(SELECT|select)\s+/i',
    '/^\s*(WITH|with)\s+/i'
];

$isValid = false;
foreach ($allowed_patterns as $pattern) {
    if (preg_match($pattern, $sql)) {
        $isValid = true;
        break;
    }
}

if (!$isValid) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid SQL query. Only SELECT queries allowed"]);
    exit;
}

try {
    // Execute query
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    
    // Fetch results
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Return results
    http_response_code(200);
    echo json_encode([
        "status" => "success",
        "data" => $results,
        "count" => count($results)
    ]);
    
} catch(PDOException $e) {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "message" => "Query execution failed",
        "error" => $e->getMessage()
    ]);
}
?>
