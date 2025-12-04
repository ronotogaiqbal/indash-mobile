# INDASH GeoJSON API Collection

API Documentation untuk Mobile App Developer (Flutter)

---

## Base URL

```
http://202.155.94.128/indash/geojson-api.php
```

---

## Table of Contents

1. [Authentication](#authentication)
2. [Response Format](#response-format)
3. [Error Handling](#error-handling)
4. [API Endpoints](#api-endpoints)
   - [Get API Info](#1-get-api-info)
   - [List Kecamatan IDs](#2-list-kecamatan-ids)
   - [Get Kecamatan by Bounds](#3-get-kecamatan-by-bounds-recommended)
   - [Get Kecamatan by ID](#4-get-kecamatan-by-id)
   - [Get Desa (Villages)](#5-get-desa-villages)
   - [Get Lahan (Land Parcels)](#6-get-lahan-land-parcels)
   - [List Available Desa](#7-list-available-desa)
   - [List Available Lahan](#8-list-available-lahan)
   - [Get All Kecamatan](#9-get-all-kecamatan-not-recommended)
5. [Flutter Implementation](#flutter-implementation)
6. [Testing](#testing)

---

## Authentication

**No authentication required** - API is publicly accessible.

---

## Response Format

### Success Response

**GeoJSON Format:**
```json
{
  "type": "FeatureCollection",
  "crs": {
    "type": "name",
    "properties": {
      "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
    }
  },
  "features": [
    {
      "type": "Feature",
      "properties": {
        "KDCPUM": "110102",
        "ID_DESA": "1101022013",
        "ID_LAHAN": "110102000101"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [longitude, latitude],
            [longitude, latitude],
            ...
          ]
        ]
      }
    }
  ]
}
```

**List Format:**
```json
{
  "status": "success",
  "count": 5557,
  "data": ["110102", "110103", "110104", ...]
}
```

### Error Response

```json
{
  "status": "error",
  "message": "Error description"
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (missing/invalid parameters)
- `404` - Resource not found

---

## Error Handling

### Common Errors

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `No action parameter provided` | Missing `action` parameter | Add `?action=getDesa` to URL |
| `Parameter 'kdcpum' is required` | Missing required parameter | Add required parameter to query |
| `Kecamatan GeoJSON file not found` | Invalid KDCPUM or file missing | Check ID from `listKecamatan` |
| `Desa GeoJSON file not found for kecamatan 'XXXXX'` | No desa file for this kecamatan | Use `listDesa` to get available IDs |

---

## API Endpoints

### 1. Get API Info

Get information about available endpoints.

**Endpoint:**
```
GET /geojson-api.php
```

**Parameters:** None

**cURL Example:**
```bash
curl -X GET "http://202.155.94.128/indash/geojson-api.php"
```

**Response:**
```json
{
  "status": "success",
  "message": "INDASH GeoJSON API",
  "version": "1.0.0",
  "endpoints": {
    "getKecamatan": "Get all kecamatan boundaries",
    "getKecamatanById": "Get kecamatan by KDCPUM (id parameter)",
    "getDesa": "Get desa boundaries by kecamatan (kdcpum parameter)",
    "getLahan": "Get lahan boundaries by kecamatan (kdcpum parameter)",
    "getByBounds": "Get kecamatan within bounds (minLat, minLng, maxLat, maxLng)",
    "listKecamatan": "List all kecamatan IDs",
    "listDesa": "List all available desa files",
    "listLahan": "List all available lahan files"
  },
  "optional_parameters": {
    "simplify": "Set to \"true\" to reduce coordinate precision",
    "precision": "Decimal places for coordinates (default: 4)"
  }
}
```

**Response Size:** ~800 bytes

---

### 2. List Kecamatan IDs

Get list of all available kecamatan (district) IDs.

**Endpoint:**
```
GET /geojson-api.php?action=listKecamatan
```

**Parameters:** None

**cURL Example:**
```bash
curl -X GET "http://202.155.94.128/indash/geojson-api.php?action=listKecamatan"
```

**Response:**
```json
{
  "status": "success",
  "count": 5557,
  "data": [
    "110102",
    "110103",
    "110104",
    "110105",
    "110106",
    ...
  ]
}
```

**Response Size:** ~70 KB

**Use Case:**
- Get all available kecamatan for dropdown/autocomplete
- Validate user input

---

### 3. Get Kecamatan by Bounds (RECOMMENDED)

Get kecamatan polygons within map viewport bounds. **This is the most efficient endpoint for mobile apps.**

**Endpoint:**
```
GET /geojson-api.php?action=getByBounds&minLat={minLat}&minLng={minLng}&maxLat={maxLat}&maxLng={maxLng}&simplify=true&precision=4
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | Yes | Must be `getByBounds` |
| `minLat` | float | Yes | Minimum latitude of viewport |
| `minLng` | float | Yes | Minimum longitude of viewport |
| `maxLat` | float | Yes | Maximum latitude of viewport |
| `maxLng` | float | Yes | Maximum longitude of viewport |
| `simplify` | boolean | No | Set to `true` to reduce file size (recommended) |
| `precision` | int | No | Decimal places (2-6, default: 4) |

**cURL Example:**
```bash
curl -X GET "http://202.155.94.128/indash/geojson-api.php?action=getByBounds&minLat=3.0&minLng=97.0&maxLat=3.2&maxLng=97.5&simplify=true&precision=4"
```

**Response:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "KDCPUM": "110102"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [97.3117, 3.0701],
            [97.3264, 3.0744],
            [97.3272, 3.0845],
            ...
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "KDCPUM": "110103"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[...]]
      }
    }
  ]
}
```

**Response Size:**
- Without simplify: 50-500 KB (depending on area)
- With simplify (precision=4): 30-350 KB (30% smaller)
- With simplify (precision=3): 25-300 KB (40% smaller)

**Use Case:**
- **Initial map load** - load only visible polygons
- **On map pan/zoom** - update polygons for new viewport
- **Most efficient** for mobile bandwidth

**Coordinate Calculation Example (Flutter):**
```dart
// Get current map bounds
LatLngBounds bounds = mapController.bounds!;

// Build API URL
String url = 'http://202.155.94.128/indash/geojson-api.php'
    '?action=getByBounds'
    '&minLat=${bounds.south}'
    '&minLng=${bounds.west}'
    '&maxLat=${bounds.north}'
    '&maxLng=${bounds.east}'
    '&simplify=true'
    '&precision=4';
```

---

### 4. Get Kecamatan by ID

Get specific kecamatan polygon by KDCPUM (6-digit district code).

**Endpoint:**
```
GET /geojson-api.php?action=getKecamatanById&id={kdcpum}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | Yes | Must be `getKecamatanById` |
| `id` | string | Yes | KDCPUM (6-digit kecamatan code) |

**cURL Example:**
```bash
curl -X GET "http://202.155.94.128/indash/geojson-api.php?action=getKecamatanById&id=110102"
```

**Response:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "KDCPUM": "110102"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [97.31167498, 3.07007859],
            [97.32637247, 3.07439254],
            [97.32716611, 3.08451261],
            ...
          ]
        ]
      }
    }
  ]
}
```

**Response Size:** 1-5 KB per kecamatan

**Use Case:**
- Get specific district boundary
- Display selected district detail

---

### 5. Get Desa (Villages)

Get village boundaries for a specific kecamatan.

**Endpoint:**
```
GET /geojson-api.php?action=getDesa&kdcpum={kdcpum}&simplify=true&precision=4
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | Yes | Must be `getDesa` |
| `kdcpum` | string | Yes | KDCPUM (6-digit kecamatan code) |
| `simplify` | boolean | No | Set to `true` to reduce file size (recommended) |
| `precision` | int | No | Decimal places (2-6, default: 4) |

**cURL Example:**
```bash
curl -X GET "http://202.155.94.128/indash/geojson-api.php?action=getDesa&kdcpum=110102&simplify=true&precision=4"
```

**Response:**
```json
{
  "type": "FeatureCollection",
  "name": "desa_110102",
  "crs": {
    "type": "name",
    "properties": {
      "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
    }
  },
  "features": [
    {
      "type": "Feature",
      "properties": {
        "ID_DESA": "1101022013"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [97.3874, 3.165],
            [97.3658, 3.1725],
            [97.3601, 3.1657],
            ...
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "ID_DESA": "1101022001"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[...]]
      }
    }
  ]
}
```

**Response Size:**
- Without simplify: 5-10 KB per kecamatan
- With simplify (precision=4): 4-7 KB (22% smaller)
- With simplify (precision=3): 3-6 KB (28% smaller)

**Use Case:**
- Display village boundaries when user zooms in
- Show detail when user clicks a kecamatan

---

### 6. Get Lahan (Land Parcels)

Get land parcel boundaries for a specific kecamatan.

**Endpoint:**
```
GET /geojson-api.php?action=getLahan&kdcpum={kdcpum}&simplify=true&precision=4
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | Yes | Must be `getLahan` |
| `kdcpum` | string | Yes | KDCPUM (6-digit kecamatan code) |
| `simplify` | boolean | No | Set to `true` to reduce file size (recommended) |
| `precision` | int | No | Decimal places (2-6, default: 4) |

**cURL Example:**
```bash
curl -X GET "http://202.155.94.128/indash/geojson-api.php?action=getLahan&kdcpum=110102&simplify=true&precision=4"
```

**Response:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "ID_LAHAN": "110102000101"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[...]]
      }
    }
  ]
}
```

**Response Size:** 10-200 KB per kecamatan (varies)

**Use Case:**
- Display land parcels at high zoom levels
- Show agricultural plot boundaries

---

### 7. List Available Desa

Get list of kecamatan IDs that have desa (village) data available.

**Endpoint:**
```
GET /geojson-api.php?action=listDesa
```

**Parameters:** None

**cURL Example:**
```bash
curl -X GET "http://202.155.94.128/indash/geojson-api.php?action=listDesa"
```

**Response:**
```json
{
  "status": "success",
  "count": 5557,
  "data": [
    "110102",
    "110103",
    "110104",
    ...
  ]
}
```

**Response Size:** ~70 KB

**Use Case:**
- Check if desa data exists before calling `getDesa`
- Prefetch list for offline capability

---

### 8. List Available Lahan

Get list of kecamatan IDs that have lahan (land parcel) data available.

**Endpoint:**
```
GET /geojson-api.php?action=listLahan
```

**Parameters:** None

**cURL Example:**
```bash
curl -X GET "http://202.155.94.128/indash/geojson-api.php?action=listLahan"
```

**Response:**
```json
{
  "status": "success",
  "count": 100,
  "data": [
    "110102",
    "110103",
    "110104",
    ...
  ]
}
```

**Response Size:** ~5 KB

**Use Case:**
- Check if lahan data exists before calling `getLahan`

---

### 9. Get All Kecamatan (NOT RECOMMENDED)

Get ALL kecamatan boundaries. **WARNING: Very large response, not recommended for mobile.**

**Endpoint:**
```
GET /geojson-api.php?action=getKecamatan&simplify=true&precision=4
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | Yes | Must be `getKecamatan` |
| `simplify` | boolean | No | MUST use `true` for mobile |
| `precision` | int | No | Use 3-4 for mobile |

**cURL Example:**
```bash
curl -X GET "http://202.155.94.128/indash/geojson-api.php?action=getKecamatan&simplify=true&precision=3"
```

**Response Size:**
- Without simplify: ~8 MB ❌ **Too large for mobile**
- With simplify (precision=4): ~6 MB ⚠️ **Still large**
- With simplify (precision=3): ~5.5 MB ⚠️ **Use with caution**

**Use Case:**
- **NOT recommended for mobile apps**
- Use `getByBounds` instead for better performance

---

## Flutter Implementation

### 1. Model Classes

```dart
// lib/models/geojson_response.dart

class GeoJsonResponse {
  final String type;
  final List<Feature> features;
  final Crs? crs;
  final String? name;

  GeoJsonResponse({
    required this.type,
    required this.features,
    this.crs,
    this.name,
  });

  factory GeoJsonResponse.fromJson(Map<String, dynamic> json) {
    return GeoJsonResponse(
      type: json['type'] as String,
      features: (json['features'] as List)
          .map((e) => Feature.fromJson(e as Map<String, dynamic>))
          .toList(),
      crs: json['crs'] != null
          ? Crs.fromJson(json['crs'] as Map<String, dynamic>)
          : null,
      name: json['name'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'features': features.map((e) => e.toJson()).toList(),
      if (crs != null) 'crs': crs!.toJson(),
      if (name != null) 'name': name,
    };
  }
}

class Feature {
  final String type;
  final Map<String, dynamic> properties;
  final Geometry geometry;

  Feature({
    required this.type,
    required this.properties,
    required this.geometry,
  });

  factory Feature.fromJson(Map<String, dynamic> json) {
    return Feature(
      type: json['type'] as String,
      properties: json['properties'] as Map<String, dynamic>,
      geometry: Geometry.fromJson(json['geometry'] as Map<String, dynamic>),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'properties': properties,
      'geometry': geometry.toJson(),
    };
  }

  // Helper getters
  String? get kdcpum => properties['KDCPUM'] as String?;
  String? get idDesa => properties['ID_DESA'] as String?;
  String? get idLahan => properties['ID_LAHAN'] as String?;
}

class Geometry {
  final String type;
  final List<List<List<double>>> coordinates;

  Geometry({
    required this.type,
    required this.coordinates,
  });

  factory Geometry.fromJson(Map<String, dynamic> json) {
    return Geometry(
      type: json['type'] as String,
      coordinates: (json['coordinates'] as List)
          .map((ring) => (ring as List)
              .map((coord) => (coord as List)
                  .map((c) => (c as num).toDouble())
                  .toList())
              .toList())
          .toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'coordinates': coordinates,
    };
  }
}

class Crs {
  final String type;
  final Map<String, dynamic> properties;

  Crs({required this.type, required this.properties});

  factory Crs.fromJson(Map<String, dynamic> json) {
    return Crs(
      type: json['type'] as String,
      properties: json['properties'] as Map<String, dynamic>,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'properties': properties,
    };
  }
}

// For list responses
class ListResponse {
  final String status;
  final int count;
  final List<String> data;

  ListResponse({
    required this.status,
    required this.count,
    required this.data,
  });

  factory ListResponse.fromJson(Map<String, dynamic> json) {
    return ListResponse(
      status: json['status'] as String,
      count: json['count'] as int,
      data: (json['data'] as List).map((e) => e as String).toList(),
    );
  }
}

// Error response
class ErrorResponse {
  final String status;
  final String message;

  ErrorResponse({required this.status, required this.message});

  factory ErrorResponse.fromJson(Map<String, dynamic> json) {
    return ErrorResponse(
      status: json['status'] as String,
      message: json['message'] as String,
    );
  }
}
```

### 2. API Service

```dart
// lib/services/geojson_api_service.dart

import 'package:dio/dio.dart';
import '../models/geojson_response.dart';

class GeoJsonApiService {
  static const String baseUrl = 'http://202.155.94.128/indash/geojson-api.php';

  final Dio _dio = Dio(
    BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
      },
    ),
  );

  /// Get polygons within map bounds (RECOMMENDED for initial load)
  Future<GeoJsonResponse> getByBounds({
    required double minLat,
    required double minLng,
    required double maxLat,
    required double maxLng,
    bool simplify = true,
    int precision = 4,
  }) async {
    try {
      final response = await _dio.get('', queryParameters: {
        'action': 'getByBounds',
        'minLat': minLat,
        'minLng': minLng,
        'maxLat': maxLat,
        'maxLng': maxLng,
        'simplify': simplify.toString(),
        'precision': precision,
      });

      return GeoJsonResponse.fromJson(response.data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// Get desa (village) boundaries for a kecamatan
  Future<GeoJsonResponse> getDesa({
    required String kdcpum,
    bool simplify = true,
    int precision = 4,
  }) async {
    try {
      final response = await _dio.get('', queryParameters: {
        'action': 'getDesa',
        'kdcpum': kdcpum,
        'simplify': simplify.toString(),
        'precision': precision,
      });

      return GeoJsonResponse.fromJson(response.data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// Get lahan (land parcel) boundaries for a kecamatan
  Future<GeoJsonResponse> getLahan({
    required String kdcpum,
    bool simplify = true,
    int precision = 4,
  }) async {
    try {
      final response = await _dio.get('', queryParameters: {
        'action': 'getLahan',
        'kdcpum': kdcpum,
        'simplify': simplify.toString(),
        'precision': precision,
      });

      return GeoJsonResponse.fromJson(response.data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// Get specific kecamatan by ID
  Future<GeoJsonResponse> getKecamatanById({
    required String id,
  }) async {
    try {
      final response = await _dio.get('', queryParameters: {
        'action': 'getKecamatanById',
        'id': id,
      });

      return GeoJsonResponse.fromJson(response.data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// List all available kecamatan IDs
  Future<ListResponse> listKecamatan() async {
    try {
      final response = await _dio.get('', queryParameters: {
        'action': 'listKecamatan',
      });

      return ListResponse.fromJson(response.data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// List available desa files
  Future<ListResponse> listDesa() async {
    try {
      final response = await _dio.get('', queryParameters: {
        'action': 'listDesa',
      });

      return ListResponse.fromJson(response.data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// List available lahan files
  Future<ListResponse> listLahan() async {
    try {
      final response = await _dio.get('', queryParameters: {
        'action': 'listLahan',
      });

      return ListResponse.fromJson(response.data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  String _handleError(DioException e) {
    if (e.response != null) {
      try {
        final error = ErrorResponse.fromJson(e.response!.data);
        return error.message;
      } catch (_) {
        return 'Server error: ${e.response!.statusCode}';
      }
    } else if (e.type == DioExceptionType.connectionTimeout) {
      return 'Connection timeout';
    } else if (e.type == DioExceptionType.receiveTimeout) {
      return 'Receive timeout';
    } else {
      return 'Network error: ${e.message}';
    }
  }
}
```

### 3. Repository with Caching

```dart
// lib/repositories/geojson_repository.dart

import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'dart:convert';
import '../services/geojson_api_service.dart';
import '../models/geojson_response.dart';

class GeoJsonRepository {
  final GeoJsonApiService _apiService = GeoJsonApiService();
  Database? _database;

  // Cache expiry: 7 days
  static const int cacheExpiryMs = 7 * 24 * 60 * 60 * 1000;

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    String path = join(await getDatabasesPath(), 'geojson_cache.db');
    return await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE cache (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            type TEXT NOT NULL
          )
        ''');
      },
    );
  }

  /// Get polygons by bounds with caching
  Future<GeoJsonResponse> getByBounds({
    required double minLat,
    required double minLng,
    required double maxLat,
    required double maxLng,
    bool forceRefresh = false,
  }) async {
    // Create cache key from bounds
    String cacheKey = 'bounds_${minLat}_${minLng}_${maxLat}_${maxLng}';

    if (!forceRefresh) {
      // Try to get from cache
      GeoJsonResponse? cached = await _getFromCache(cacheKey);
      if (cached != null) return cached;
    }

    // Fetch from API
    GeoJsonResponse response = await _apiService.getByBounds(
      minLat: minLat,
      minLng: minLng,
      maxLat: maxLat,
      maxLng: maxLng,
      simplify: true,
      precision: 4,
    );

    // Save to cache
    await _saveToCache(cacheKey, response, 'bounds');

    return response;
  }

  /// Get desa with caching
  Future<GeoJsonResponse> getDesa({
    required String kdcpum,
    bool forceRefresh = false,
  }) async {
    String cacheKey = 'desa_$kdcpum';

    if (!forceRefresh) {
      GeoJsonResponse? cached = await _getFromCache(cacheKey);
      if (cached != null) return cached;
    }

    GeoJsonResponse response = await _apiService.getDesa(
      kdcpum: kdcpum,
      simplify: true,
      precision: 4,
    );

    await _saveToCache(cacheKey, response, 'desa');
    return response;
  }

  /// Get lahan with caching
  Future<GeoJsonResponse> getLahan({
    required String kdcpum,
    bool forceRefresh = false,
  }) async {
    String cacheKey = 'lahan_$kdcpum';

    if (!forceRefresh) {
      GeoJsonResponse? cached = await _getFromCache(cacheKey);
      if (cached != null) return cached;
    }

    GeoJsonResponse response = await _apiService.getLahan(
      kdcpum: kdcpum,
      simplify: true,
      precision: 4,
    );

    await _saveToCache(cacheKey, response, 'lahan');
    return response;
  }

  Future<GeoJsonResponse?> _getFromCache(String key) async {
    final db = await database;
    final result = await db.query(
      'cache',
      where: 'id = ?',
      whereArgs: [key],
    );

    if (result.isEmpty) return null;

    final row = result.first;
    final timestamp = row['timestamp'] as int;
    final now = DateTime.now().millisecondsSinceEpoch;

    // Check if cache is expired
    if (now - timestamp > cacheExpiryMs) {
      await db.delete('cache', where: 'id = ?', whereArgs: [key]);
      return null;
    }

    final jsonData = json.decode(row['data'] as String);
    return GeoJsonResponse.fromJson(jsonData);
  }

  Future<void> _saveToCache(
    String key,
    GeoJsonResponse data,
    String type,
  ) async {
    final db = await database;
    await db.insert(
      'cache',
      {
        'id': key,
        'data': json.encode(data.toJson()),
        'timestamp': DateTime.now().millisecondsSinceEpoch,
        'type': type,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  /// Clear cache
  Future<void> clearCache() async {
    final db = await database;
    await db.delete('cache');
  }

  /// Clear expired cache
  Future<void> clearExpiredCache() async {
    final db = await database;
    final now = DateTime.now().millisecondsSinceEpoch;
    await db.delete(
      'cache',
      where: 'timestamp < ?',
      whereArgs: [now - cacheExpiryMs],
    );
  }
}
```

### 4. Usage Example in Widget

```dart
// lib/screens/map_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../repositories/geojson_repository.dart';
import '../models/geojson_response.dart';

class MapScreen extends StatefulWidget {
  @override
  _MapScreenState createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final MapController _mapController = MapController();
  final GeoJsonRepository _repository = GeoJsonRepository();

  List<Polygon> _polygons = [];
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _loadInitialPolygons();
  }

  Future<void> _loadInitialPolygons() async {
    setState(() => _loading = true);

    try {
      // Get initial bounds (example: Jakarta area)
      final response = await _repository.getByBounds(
        minLat: -6.4,
        minLng: 106.6,
        maxLat: -6.0,
        maxLng: 107.0,
      );

      setState(() {
        _polygons = _convertToPolygons(response);
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
      _showError(e.toString());
    }
  }

  Future<void> _loadVisiblePolygons() async {
    if (_loading) return;

    final bounds = _mapController.bounds;
    if (bounds == null) return;

    setState(() => _loading = true);

    try {
      final response = await _repository.getByBounds(
        minLat: bounds.south,
        minLng: bounds.west,
        maxLat: bounds.north,
        maxLng: bounds.east,
      );

      setState(() {
        _polygons = _convertToPolygons(response);
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
      _showError(e.toString());
    }
  }

  List<Polygon> _convertToPolygons(GeoJsonResponse response) {
    return response.features.map((feature) {
      List<LatLng> points = feature.geometry.coordinates[0]
          .map((coord) => LatLng(coord[1], coord[0]))
          .toList();

      return Polygon(
        points: points,
        color: Colors.blue.withOpacity(0.3),
        borderColor: Colors.blue,
        borderStrokeWidth: 2,
      );
    }).toList();
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('INDASH Map')),
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              center: LatLng(-6.2, 106.8),
              zoom: 10,
              onMapEvent: (event) {
                if (event is MapEventMoveEnd) {
                  _loadVisiblePolygons();
                }
              },
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              ),
              PolygonLayer(polygons: _polygons),
            ],
          ),
          if (_loading)
            Center(
              child: CircularProgressIndicator(),
            ),
        ],
      ),
    );
  }
}
```

### 5. Required Dependencies

Add to `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter

  # HTTP client
  dio: ^5.4.0

  # Map
  flutter_map: ^6.1.0
  latlong2: ^0.9.0

  # Local database
  sqflite: ^2.3.0
  path: ^1.8.3
```

---

## Testing

### Using cURL

```bash
# 1. Get API info
curl "http://202.155.94.128/indash/geojson-api.php"

# 2. List kecamatan
curl "http://202.155.94.128/indash/geojson-api.php?action=listKecamatan"

# 3. Get by bounds (recommended for mobile)
curl "http://202.155.94.128/indash/geojson-api.php?action=getByBounds&minLat=3.0&minLng=97.0&maxLat=3.2&maxLng=97.5&simplify=true&precision=4"

# 4. Get desa with simplify
curl "http://202.155.94.128/indash/geojson-api.php?action=getDesa&kdcpum=110102&simplify=true&precision=4"

# 5. Get specific kecamatan
curl "http://202.155.94.128/indash/geojson-api.php?action=getKecamatanById&id=110102"
```

### Using Postman

**Import Collection:**

1. Create new collection: "INDASH GeoJSON API"
2. Add requests with following configurations:

**Request 1: Get API Info**
- Method: GET
- URL: `http://202.155.94.128/indash/geojson-api.php`

**Request 2: List Kecamatan**
- Method: GET
- URL: `http://202.155.94.128/indash/geojson-api.php`
- Params: `action=listKecamatan`

**Request 3: Get By Bounds**
- Method: GET
- URL: `http://202.155.94.128/indash/geojson-api.php`
- Params:
  - `action=getByBounds`
  - `minLat=3.0`
  - `minLng=97.0`
  - `maxLat=3.2`
  - `maxLng=97.5`
  - `simplify=true`
  - `precision=4`

**Request 4: Get Desa**
- Method: GET
- URL: `http://202.155.94.128/indash/geojson-api.php`
- Params:
  - `action=getDesa`
  - `kdcpum=110102`
  - `simplify=true`
  - `precision=4`

---

## Best Practices

### 1. Always Use Simplify for Mobile

```dart
// ✅ Good
await _apiService.getByBounds(
  minLat: bounds.south,
  minLng: bounds.west,
  maxLat: bounds.north,
  maxLng: bounds.east,
  simplify: true,    // 20-30% smaller
  precision: 4,      // ~11m accuracy
);

// ❌ Bad - too large for mobile
await _apiService.getByBounds(
  minLat: bounds.south,
  minLng: bounds.west,
  maxLat: bounds.north,
  maxLng: bounds.east,
  simplify: false,   // Full precision, larger file
);
```

### 2. Implement Caching

```dart
// ✅ Good - cache for 7 days
final response = await _repository.getDesa(
  kdcpum: '110102',
  forceRefresh: false,
);

// Clear expired cache periodically
await _repository.clearExpiredCache();
```

### 3. Load Only Visible Polygons

```dart
// ✅ Good - load by bounds
onMapEvent: (event) {
  if (event is MapEventMoveEnd) {
    _loadVisiblePolygons();  // Only visible area
  }
}

// ❌ Bad - load everything
await _apiService.getKecamatan();  // 8 MB response!
```

### 4. Handle Errors Gracefully

```dart
try {
  final response = await _repository.getDesa(kdcpum: kdcpum);
  // Process response
} catch (e) {
  if (e.toString().contains('not found')) {
    // Show user-friendly message
    showSnackBar('Data desa tidak tersedia untuk area ini');
  } else {
    // Network error
    showSnackBar('Gagal memuat data. Periksa koneksi internet.');
  }
}
```

### 5. Precision Guidelines

| Precision | Accuracy | Use Case | Size Reduction |
|-----------|----------|----------|----------------|
| 6 | ~0.1m | Very high detail | 0% (baseline) |
| 5 | ~1m | High detail | ~10% |
| 4 | ~11m | **Recommended for mobile** | ~25% |
| 3 | ~111m | Overview maps | ~35% |
| 2 | ~1km | Not recommended | ~45% |

---

## Support & Contact

Untuk pertanyaan teknis atau issue, hubungi tim development INDASH.

**API Version:** 1.0.0
**Last Updated:** November 2024
