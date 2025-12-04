<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Cache control for GeoJSON (cache for 1 day)
header("Cache-Control: public, max-age=86400");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Base paths for GeoJSON files
// When deployed, this file will be in www/ directory, so assets path is relative
$BASE_PATH = __DIR__ . '/assets';
$KECAMATAN_FILE = $BASE_PATH . '/lbs_DN_keca.geojson';
$DESA_PATH = $BASE_PATH . '/desa';
$LAHAN_PATH = $BASE_PATH . '/polylahan';

/**
 * Get action from request
 */
$action = isset($_GET['action']) ? trim($_GET['action']) : '';

/**
 * Helper function to read and return GeoJSON file
 */
function readGeojsonFile($filePath) {
    if (!file_exists($filePath)) {
        return null;
    }

    $content = file_get_contents($filePath);
    return json_decode($content, true);
}

/**
 * Helper function to filter GeoJSON by bounds
 */
function filterByBounds($geojson, $minLat, $minLng, $maxLat, $maxLng) {
    if (!isset($geojson['features'])) {
        return $geojson;
    }

    $filtered = [
        'type' => 'FeatureCollection',
        'features' => []
    ];

    if (isset($geojson['crs'])) {
        $filtered['crs'] = $geojson['crs'];
    }

    foreach ($geojson['features'] as $feature) {
        if (!isset($feature['geometry']['coordinates'])) {
            continue;
        }

        // Check if polygon intersects with bounds
        $coords = $feature['geometry']['coordinates'][0];
        $intersects = false;

        foreach ($coords as $coord) {
            $lng = $coord[0];
            $lat = $coord[1];

            if ($lng >= $minLng && $lng <= $maxLng &&
                $lat >= $minLat && $lat <= $maxLat) {
                $intersects = true;
                break;
            }
        }

        if ($intersects) {
            $filtered['features'][] = $feature;
        }
    }

    return $filtered;
}

/**
 * Helper function to filter GeoJSON by property value
 */
function filterByProperty($geojson, $propertyName, $propertyValue) {
    if (!isset($geojson['features'])) {
        return $geojson;
    }

    $filtered = [
        'type' => 'FeatureCollection',
        'features' => []
    ];

    if (isset($geojson['crs'])) {
        $filtered['crs'] = $geojson['crs'];
    }

    if (isset($geojson['name'])) {
        $filtered['name'] = $geojson['name'];
    }

    foreach ($geojson['features'] as $feature) {
        if (isset($feature['properties'][$propertyName]) &&
            $feature['properties'][$propertyName] == $propertyValue) {
            $filtered['features'][] = $feature;
        }
    }

    return $filtered;
}

/**
 * Helper function to simplify coordinates (reduce precision)
 */
function simplifyGeojson($geojson, $precision = 5) {
    if (!isset($geojson['features'])) {
        return $geojson;
    }

    foreach ($geojson['features'] as &$feature) {
        if (isset($feature['geometry']['coordinates'])) {
            $feature['geometry']['coordinates'] = simplifyCoordinates(
                $feature['geometry']['coordinates'],
                $precision
            );
        }
    }

    return $geojson;
}

/**
 * Recursively simplify coordinates
 */
function simplifyCoordinates($coords, $precision) {
    if (!is_array($coords)) {
        return $coords;
    }

    // Check if this is a coordinate pair [lng, lat]
    if (count($coords) == 2 && is_numeric($coords[0]) && is_numeric($coords[1])) {
        return [
            round($coords[0], $precision),
            round($coords[1], $precision)
        ];
    }

    // Otherwise, recurse
    $result = [];
    foreach ($coords as $coord) {
        $result[] = simplifyCoordinates($coord, $precision);
    }
    return $result;
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
function pointInPolygon($lat, $lng, $polygon) {
    $inside = false;
    $n = count($polygon);

    for ($i = 0, $j = $n - 1; $i < $n; $j = $i++) {
        $xi = $polygon[$i][0]; // lng
        $yi = $polygon[$i][1]; // lat
        $xj = $polygon[$j][0]; // lng
        $yj = $polygon[$j][1]; // lat

        if ((($yi > $lat) != ($yj > $lat)) &&
            ($lng < ($xj - $xi) * ($lat - $yi) / ($yj - $yi) + $xi)) {
            $inside = !$inside;
        }
    }

    return $inside;
}

/**
 * Send JSON response
 */
function sendResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

/**
 * Send error response
 */
function sendError($message, $status = 400) {
    sendResponse([
        'status' => 'error',
        'message' => $message
    ], $status);
}

// ============================================
// MAIN ROUTING LOGIC
// ============================================

switch ($action) {

    /**
     * Get all kecamatan (district) boundaries
     * GET /geojson-api.php?action=getKecamatan
     * Optional: &simplify=true
     */
    case 'getKecamatan':
        $geojson = readGeojsonFile($KECAMATAN_FILE);

        if ($geojson === null) {
            sendError("Kecamatan GeoJSON file not found", 404);
        }

        // Simplify if requested
        if (isset($_GET['simplify']) && $_GET['simplify'] === 'true') {
            $precision = isset($_GET['precision']) ? intval($_GET['precision']) : 4;
            $geojson = simplifyGeojson($geojson, $precision);
        }

        sendResponse($geojson);
        break;

    /**
     * Get single kecamatan by KDCPUM
     * GET /geojson-api.php?action=getKecamatanById&id=110102
     */
    case 'getKecamatanById':
        $id = isset($_GET['id']) ? trim($_GET['id']) : '';

        if (empty($id)) {
            sendError("Parameter 'id' is required");
        }

        $geojson = readGeojsonFile($KECAMATAN_FILE);

        if ($geojson === null) {
            sendError("Kecamatan GeoJSON file not found", 404);
        }

        $filtered = filterByProperty($geojson, 'KDCPUM', $id);

        if (empty($filtered['features'])) {
            sendError("Kecamatan with ID '$id' not found", 404);
        }

        sendResponse($filtered);
        break;

    /**
     * Get desa (village) boundaries for a kecamatan
     * GET /geojson-api.php?action=getDesa&kdcpum=110102
     * Optional: &simplify=true
     */
    case 'getDesa':
        $kdcpum = isset($_GET['kdcpum']) ? trim($_GET['kdcpum']) : '';

        if (empty($kdcpum)) {
            sendError("Parameter 'kdcpum' is required");
        }

        $filePath = $DESA_PATH . '/desa_' . $kdcpum . '.geojson';
        $geojson = readGeojsonFile($filePath);

        if ($geojson === null) {
            sendError("Desa GeoJSON file not found for kecamatan '$kdcpum'", 404);
        }

        // Simplify if requested
        if (isset($_GET['simplify']) && $_GET['simplify'] === 'true') {
            $precision = isset($_GET['precision']) ? intval($_GET['precision']) : 4;
            $geojson = simplifyGeojson($geojson, $precision);
        }

        sendResponse($geojson);
        break;

    /**
     * Get lahan (land parcel) boundaries for a kecamatan
     * GET /geojson-api.php?action=getLahan&kdcpum=110102
     * Optional: &simplify=true
     */
    case 'getLahan':
        $kdcpum = isset($_GET['kdcpum']) ? trim($_GET['kdcpum']) : '';

        if (empty($kdcpum)) {
            sendError("Parameter 'kdcpum' is required");
        }

        $filePath = $LAHAN_PATH . '/lahan_' . $kdcpum . '.geojson';
        $geojson = readGeojsonFile($filePath);

        if ($geojson === null) {
            sendError("Lahan GeoJSON file not found for kecamatan '$kdcpum'", 404);
        }

        // Simplify if requested
        if (isset($_GET['simplify']) && $_GET['simplify'] === 'true') {
            $precision = isset($_GET['precision']) ? intval($_GET['precision']) : 4;
            $geojson = simplifyGeojson($geojson, $precision);
        }

        sendResponse($geojson);
        break;

    /**
     * Get kecamatan boundaries within map bounds
     * GET /geojson-api.php?action=getByBounds&minLat=3.0&minLng=97.0&maxLat=4.0&maxLng=98.0
     * Optional: &simplify=true
     */
    case 'getByBounds':
        $minLat = isset($_GET['minLat']) ? floatval($_GET['minLat']) : null;
        $minLng = isset($_GET['minLng']) ? floatval($_GET['minLng']) : null;
        $maxLat = isset($_GET['maxLat']) ? floatval($_GET['maxLat']) : null;
        $maxLng = isset($_GET['maxLng']) ? floatval($_GET['maxLng']) : null;

        if ($minLat === null || $minLng === null || $maxLat === null || $maxLng === null) {
            sendError("Parameters 'minLat', 'minLng', 'maxLat', 'maxLng' are required");
        }

        $geojson = readGeojsonFile($KECAMATAN_FILE);

        if ($geojson === null) {
            sendError("Kecamatan GeoJSON file not found", 404);
        }

        $filtered = filterByBounds($geojson, $minLat, $minLng, $maxLat, $maxLng);

        // Simplify if requested
        if (isset($_GET['simplify']) && $_GET['simplify'] === 'true') {
            $precision = isset($_GET['precision']) ? intval($_GET['precision']) : 4;
            $filtered = simplifyGeojson($filtered, $precision);
        }

        sendResponse($filtered);
        break;

    /**
     * Get kecamatan containing a specific point (for mobile GPS location)
     * GET /geojson-api.php?action=getByLocation&lat=3.1&lng=97.3
     * Optional: &includeNearest=true to get nearest kecamatan if point not inside any polygon
     * Optional: &radius=50 to limit search within radius (km) for nearest
     */
    case 'getByLocation':
        $lat = isset($_GET['lat']) ? floatval($_GET['lat']) : null;
        $lng = isset($_GET['lng']) ? floatval($_GET['lng']) : null;
        $includeNearest = isset($_GET['includeNearest']) && $_GET['includeNearest'] === 'true';
        $radiusKm = isset($_GET['radius']) ? floatval($_GET['radius']) : 50; // default 50km

        if ($lat === null || $lng === null) {
            sendError("Parameters 'lat' and 'lng' are required");
        }

        $geojson = readGeojsonFile($KECAMATAN_FILE);

        if ($geojson === null) {
            sendError("Kecamatan GeoJSON file not found", 404);
        }

        // Find kecamatan that contains the point
        $found = null;
        $nearestKecamatan = null;
        $nearestDistance = PHP_FLOAT_MAX;

        if (isset($geojson['features'])) {
            foreach ($geojson['features'] as $feature) {
                $coords = $feature['geometry']['coordinates'][0];

                // Check if point is inside polygon
                if (pointInPolygon($lat, $lng, $coords)) {
                    $found = $feature;
                    break;
                }

                // Calculate distance to polygon center for nearest search
                if ($includeNearest && !$found) {
                    $centerLat = 0;
                    $centerLng = 0;
                    $validCount = 0;

                    foreach ($coords as $coord) {
                        if (is_array($coord) && count($coord) >= 2 &&
                            is_numeric($coord[0]) && is_numeric($coord[1])) {
                            $centerLng += $coord[0];
                            $centerLat += $coord[1];
                            $validCount++;
                        }
                    }

                    if ($validCount > 0) {
                        $centerLat /= $validCount;
                        $centerLng /= $validCount;

                        // Calculate distance in km (approximate)
                        $distKm = sqrt(pow(($centerLat - $lat) * 111, 2) +
                                      pow(($centerLng - $lng) * 111 * cos(deg2rad($lat)), 2));

                        if ($distKm < $nearestDistance && $distKm <= $radiusKm) {
                            $nearestDistance = $distKm;
                            $nearestKecamatan = $feature;
                        }
                    }
                }
            }
        }

        if ($found === null && $nearestKecamatan === null) {
            sendResponse([
                'status' => 'success',
                'message' => 'No kecamatan found at this location. This coordinate may be outside agricultural (LBS) areas.',
                'hint' => 'Add &includeNearest=true to get the nearest kecamatan',
                'location' => ['lat' => $lat, 'lng' => $lng],
                'data' => null
            ]);
        } else {
            // Use found polygon or nearest
            $targetFeature = $found ?? $nearestKecamatan;
            $kdcpum = $targetFeature['properties']['KDCPUM'];
            $isExactMatch = ($found !== null);

            // Also load desa for this kecamatan
            $desaFile = $DESA_PATH . '/desa_' . $kdcpum . '.geojson';
            $desaData = readGeojsonFile($desaFile);

            // Find specific desa containing the point (only if exact match)
            $foundDesa = null;
            if ($isExactMatch && $desaData && isset($desaData['features'])) {
                foreach ($desaData['features'] as $desa) {
                    if (pointInPolygon($lat, $lng, $desa['geometry']['coordinates'][0])) {
                        $foundDesa = $desa;
                        break;
                    }
                }
            }

            $response = [
                'status' => 'success',
                'location' => ['lat' => $lat, 'lng' => $lng],
                'exact_match' => $isExactMatch,
                'kecamatan' => [
                    'kdcpum' => $kdcpum,
                    'geometry' => $targetFeature['geometry']
                ],
                'desa' => $foundDesa ? [
                    'id_desa' => $foundDesa['properties']['ID_DESA'],
                    'geometry' => $foundDesa['geometry']
                ] : null
            ];

            // Add distance info if nearest (not exact match)
            if (!$isExactMatch) {
                $response['distance_km'] = round($nearestDistance, 2);
                $response['message'] = "Nearest kecamatan found (coordinate is outside agricultural areas)";
            }

            sendResponse($response);
        }
        break;

    /**
     * List all available kecamatan IDs
     * GET /geojson-api.php?action=listKecamatan
     */
    case 'listKecamatan':
        $geojson = readGeojsonFile($KECAMATAN_FILE);

        if ($geojson === null) {
            sendError("Kecamatan GeoJSON file not found", 404);
        }

        $ids = [];
        if (isset($geojson['features'])) {
            foreach ($geojson['features'] as $feature) {
                if (isset($feature['properties']['KDCPUM'])) {
                    $ids[] = $feature['properties']['KDCPUM'];
                }
            }
        }

        sort($ids);

        sendResponse([
            'status' => 'success',
            'count' => count($ids),
            'data' => $ids
        ]);
        break;

    /**
     * List available desa files
     * GET /geojson-api.php?action=listDesa
     */
    case 'listDesa':
        if (!is_dir($DESA_PATH)) {
            sendError("Desa directory not found", 404);
        }

        $files = scandir($DESA_PATH);
        $ids = [];

        foreach ($files as $file) {
            if (preg_match('/^desa_(\d+)\.geojson$/', $file, $matches)) {
                $ids[] = $matches[1];
            }
        }

        sort($ids);

        sendResponse([
            'status' => 'success',
            'count' => count($ids),
            'data' => $ids
        ]);
        break;

    /**
     * List available lahan files
     * GET /geojson-api.php?action=listLahan
     */
    case 'listLahan':
        if (!is_dir($LAHAN_PATH)) {
            sendError("Lahan directory not found", 404);
        }

        $files = scandir($LAHAN_PATH);
        $ids = [];

        foreach ($files as $file) {
            if (preg_match('/^lahan_(\d+)\.geojson$/', $file, $matches)) {
                $ids[] = $matches[1];
            }
        }

        sort($ids);

        sendResponse([
            'status' => 'success',
            'count' => count($ids),
            'data' => $ids
        ]);
        break;

    /**
     * Get API info
     * GET /geojson-api.php
     */
    case '':
        sendResponse([
            'status' => 'success',
            'message' => 'INDASH GeoJSON API',
            'version' => '1.0.0',
            'endpoints' => [
                'getKecamatan' => 'Get all kecamatan boundaries',
                'getKecamatanById' => 'Get kecamatan by KDCPUM (id parameter)',
                'getDesa' => 'Get desa boundaries by kecamatan (kdcpum parameter)',
                'getLahan' => 'Get lahan boundaries by kecamatan (kdcpum parameter)',
                'getByBounds' => 'Get kecamatan within bounds (minLat, minLng, maxLat, maxLng)',
                'getByLocation' => 'Get kecamatan & desa containing GPS point (lat, lng) - for mobile',
                'listKecamatan' => 'List all kecamatan IDs',
                'listDesa' => 'List all available desa files',
                'listLahan' => 'List all available lahan files'
            ],
            'optional_parameters' => [
                'simplify' => 'Set to "true" to reduce coordinate precision',
                'precision' => 'Decimal places for coordinates (default: 4)'
            ]
        ]);
        break;

    /**
     * Unknown action
     */
    default:
        sendError("Unknown action: '$action'. Use action parameter with one of: getKecamatan, getKecamatanById, getDesa, getLahan, getByBounds, listKecamatan, listDesa, listLahan");
}
?>
