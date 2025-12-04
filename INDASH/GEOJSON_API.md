# INDASH GeoJSON API Documentation

API untuk mengakses data polygon GeoJSON dari aplikasi INDASH untuk digunakan di mobile app Android.

## Base URL

```
http://202.155.94.128/indash/geojson-api.php
```

## Endpoints

### 1. Get API Info

Mendapatkan informasi tentang API dan daftar endpoints yang tersedia.

**Request:**
```
GET /indash/geojson-api.php
```

**Response:**
```json
{
  "status": "success",
  "message": "INDASH GeoJSON API",
  "version": "1.0.0",
  "endpoints": {
    "getKecamatan": "Get all kecamatan boundaries",
    "getKecamatanById": "Get kecamatan by KDCPUM",
    "getDesa": "Get desa boundaries by kecamatan",
    "getLahan": "Get lahan boundaries by kecamatan",
    "getByBounds": "Get kecamatan within bounds",
    "listKecamatan": "List all kecamatan IDs",
    "listDesa": "List all available desa files",
    "listLahan": "List all available lahan files"
  }
}
```

---

### 2. List All Kecamatan IDs

Mendapatkan daftar semua KDCPUM (kode kecamatan) yang tersedia.

**Request:**
```
GET /indash/geojson-api.php?action=listKecamatan
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

---

### 3. Get All Kecamatan Boundaries

Mendapatkan semua polygon kecamatan (district boundaries).

**Request:**
```
GET /indash/geojson-api.php?action=getKecamatan
GET /indash/geojson-api.php?action=getKecamatan&simplify=true&precision=4
```

**Parameters:**
- `simplify` (optional): Set to `true` untuk mengurangi ukuran file
- `precision` (optional): Jumlah desimal koordinat (default: 4, range: 2-6)

**Response:**
```json
{
  "type": "FeatureCollection",
  "crs": { ... },
  "features": [
    {
      "type": "Feature",
      "properties": {
        "KDCPUM": "110102"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[...]]
      }
    },
    ...
  ]
}
```

**Response Size:**
- Without simplify: ~8 MB
- With simplify (precision=4): ~6 MB (25% smaller)
- With simplify (precision=3): ~5.5 MB (31% smaller)

**Catatan:** Endpoint ini mengembalikan data yang sangat besar. Untuk mobile app, disarankan menggunakan `getByBounds` atau `getKecamatanById`.

---

### 4. Get Kecamatan by ID

Mendapatkan polygon kecamatan berdasarkan KDCPUM.

**Request:**
```
GET /indash/geojson-api.php?action=getKecamatanById&id=110102
```

**Parameters:**
- `id` (required): KDCPUM (6 digit kode kecamatan)

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
        "coordinates": [[...]]
      }
    }
  ]
}
```

**Response Size:** ~1-5 KB per kecamatan

---

### 5. Get Kecamatan by Bounds

Mendapatkan polygon kecamatan yang berada dalam area tertentu (map viewport).

**Request:**
```
GET /indash/geojson-api.php?action=getByBounds&minLat=3.0&minLng=97.0&maxLat=3.2&maxLng=97.5
GET /indash/geojson-api.php?action=getByBounds&minLat=3.0&minLng=97.0&maxLat=3.2&maxLng=97.5&simplify=true
```

**Parameters:**
- `minLat` (required): Latitude minimum
- `minLng` (required): Longitude minimum
- `maxLat` (required): Latitude maximum
- `maxLng` (required): Longitude maximum
- `simplify` (optional): Set to `true` untuk mengurangi ukuran
- `precision` (optional): Jumlah desimal koordinat (default: 4)

**Response:**
```json
{
  "type": "FeatureCollection",
  "features": [...]
}
```

**Response Size:** Tergantung area (10 KB - 500 KB)

**Use Case:** Ideal untuk mobile app - load hanya polygon yang visible di peta.

---

### 6. Get Desa (Village) Boundaries

Mendapatkan polygon desa untuk kecamatan tertentu.

**Request:**
```
GET /indash/geojson-api.php?action=getDesa&kdcpum=110102
GET /indash/geojson-api.php?action=getDesa&kdcpum=110102&simplify=true&precision=4
```

**Parameters:**
- `kdcpum` (required): KDCPUM (6 digit kode kecamatan)
- `simplify` (optional): Set to `true` untuk mengurangi ukuran
- `precision` (optional): Jumlah desimal koordinat (default: 4)

**Response:**
```json
{
  "type": "FeatureCollection",
  "name": "desa_110102",
  "crs": { ... },
  "features": [
    {
      "type": "Feature",
      "properties": {
        "ID_DESA": "1101022013"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[...]]
      }
    },
    ...
  ]
}
```

**Response Size:**
- Without simplify: ~5-10 KB per kecamatan
- With simplify (precision=4): ~4-7 KB (22% smaller)
- With simplify (precision=3): ~3-6 KB (28% smaller)

---

### 7. Get Lahan (Land Parcel) Boundaries

Mendapatkan polygon lahan untuk kecamatan tertentu.

**Request:**
```
GET /indash/geojson-api.php?action=getLahan&kdcpum=110102
GET /indash/geojson-api.php?action=getLahan&kdcpum=110102&simplify=true&precision=4
```

**Parameters:**
- `kdcpum` (required): KDCPUM (6 digit kode kecamatan)
- `simplify` (optional): Set to `true` untuk mengurangi ukuran
- `precision` (optional): Jumlah desimal koordinat (default: 4)

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
    },
    ...
  ]
}
```

**Response Size:** Bervariasi (10 KB - 200 KB per kecamatan)

---

### 8. List Available Desa Files

Mendapatkan daftar kecamatan yang memiliki file desa.

**Request:**
```
GET /indash/geojson-api.php?action=listDesa
```

**Response:**
```json
{
  "status": "success",
  "count": 5557,
  "data": [
    "110102",
    "110103",
    ...
  ]
}
```

---

### 9. List Available Lahan Files

Mendapatkan daftar kecamatan yang memiliki file lahan.

**Request:**
```
GET /indash/geojson-api.php?action=listLahan
```

**Response:**
```json
{
  "status": "success",
  "count": 100,
  "data": [
    "110102",
    "110103",
    ...
  ]
}
```

---

## Error Responses

Semua error menggunakan format yang sama:

```json
{
  "status": "error",
  "message": "Error message description"
}
```

**HTTP Status Codes:**
- `200 OK` - Request berhasil
- `400 Bad Request` - Parameter tidak valid atau kurang
- `404 Not Found` - File GeoJSON tidak ditemukan

---

## Implementasi untuk Mobile App Android

### Strategi Recommended

**1. Initial Load (Saat Buka App):**
```
GET /geojson-api.php?action=getByBounds&minLat=...&minLng=...&maxLat=...&maxLng=...&simplify=true&precision=4
```
- Load hanya polygon yang visible di peta
- Gunakan `simplify=true` untuk performa lebih baik
- Size: 10-100 KB tergantung area

**2. On Pan/Zoom (Saat User Geser Peta):**
```
GET /geojson-api.php?action=getByBounds&minLat=...&minLng=...&maxLat=...&maxLng=...&simplify=true&precision=4
```
- Update polygon berdasarkan viewport baru
- Implement caching untuk area yang sudah di-load

**3. On Click Kecamatan (Detail View):**
```
GET /geojson-api.php?action=getDesa&kdcpum=110102&simplify=true&precision=4
```
- Load detail desa hanya saat user click kecamatan
- Size: 3-7 KB per kecamatan

### Contoh Implementasi Android (Kotlin)

```kotlin
// Retrofit Interface
interface GeoJsonApi {
    @GET("geojson-api.php")
    suspend fun getByBounds(
        @Query("action") action: String = "getByBounds",
        @Query("minLat") minLat: Double,
        @Query("minLng") minLng: Double,
        @Query("maxLat") maxLat: Double,
        @Query("maxLng") maxLng: Double,
        @Query("simplify") simplify: Boolean = true,
        @Query("precision") precision: Int = 4
    ): GeoJsonResponse

    @GET("geojson-api.php")
    suspend fun getDesa(
        @Query("action") action: String = "getDesa",
        @Query("kdcpum") kdcpum: String,
        @Query("simplify") simplify: Boolean = true,
        @Query("precision") precision: Int = 4
    ): GeoJsonResponse
}

// Data Class
data class GeoJsonResponse(
    val type: String,
    val features: List<Feature>
)

data class Feature(
    val type: String,
    val properties: Map<String, String>,
    val geometry: Geometry
)

data class Geometry(
    val type: String,
    val coordinates: List<List<List<Double>>>
)

// Usage
class MapRepository(private val api: GeoJsonApi) {
    suspend fun loadVisiblePolygons(
        minLat: Double, minLng: Double,
        maxLat: Double, maxLng: Double
    ): GeoJsonResponse {
        return api.getByBounds(
            minLat = minLat,
            minLng = minLng,
            maxLat = maxLat,
            maxLng = maxLng,
            simplify = true,
            precision = 4
        )
    }
}
```

### Caching Strategy

**Gunakan Room Database untuk caching:**

```kotlin
@Entity(tableName = "cached_geojson")
data class CachedGeoJson(
    @PrimaryKey val id: String, // KDCPUM atau bounds hash
    val geojsonData: String,
    val timestamp: Long,
    val type: String // "kecamatan", "desa", "bounds"
)

// Cache selama 7 hari
val CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000L

// Cek cache sebelum fetch dari API
fun getCachedOrFetch(kdcpum: String): GeoJsonResponse {
    val cached = database.getCached(kdcpum)
    if (cached != null &&
        System.currentTimeMillis() - cached.timestamp < CACHE_EXPIRY_MS) {
        return Gson().fromJson(cached.geojsonData, GeoJsonResponse::class.java)
    }

    // Fetch from API and cache
    val response = api.getDesa(kdcpum = kdcpum)
    database.insert(CachedGeoJson(
        id = kdcpum,
        geojsonData = Gson().toJson(response),
        timestamp = System.currentTimeMillis(),
        type = "desa"
    ))
    return response
}
```

---

## Performance Tips

1. **Gunakan `simplify=true`** untuk semua request mobile app
   - Pengurangan size: 20-30%
   - Tidak ada perbedaan visual yang signifikan di zoom level normal

2. **Gunakan `getByBounds`** daripada `getKecamatan`
   - Hanya load yang diperlukan
   - Response lebih kecil dan cepat

3. **Implement caching**
   - GeoJSON boundaries jarang berubah
   - Cache di SQLite/Room database
   - Set expiry 7-30 hari

4. **Load on-demand**
   - Kecamatan: Saat buka app (simplified)
   - Desa: Saat user click/zoom in ke kecamatan
   - Lahan: Saat user zoom in lebih detail

5. **Optimize precision**
   - Precision 4 (default): Akurasi ~11 meter - **recommended**
   - Precision 3: Akurasi ~111 meter - untuk overview
   - Precision 5: Akurasi ~1 meter - untuk detail tinggi

---

## Testing Endpoints

### Menggunakan cURL

```bash
# Get API info
curl "http://202.155.94.128/indash/geojson-api.php"

# List kecamatan
curl "http://202.155.94.128/indash/geojson-api.php?action=listKecamatan"

# Get desa dengan simplify
curl "http://202.155.94.128/indash/geojson-api.php?action=getDesa&kdcpum=110102&simplify=true&precision=4"

# Get by bounds
curl "http://202.155.94.128/indash/geojson-api.php?action=getByBounds&minLat=3.0&minLng=97.0&maxLat=3.2&maxLng=97.5&simplify=true"
```

### Menggunakan Browser

```
http://202.155.94.128/indash/geojson-api.php
http://202.155.94.128/indash/geojson-api.php?action=getDesa&kdcpum=110102&simplify=true
```

---

## Deployment

File `geojson-api.php` sudah di-deploy di:
- **Source:** `/var/www/projects/indash/INDASH/geojson-api.php`
- **Production:** `/var/www/projects/indash/INDASH/www/geojson-api.php` (served via nginx)

Untuk update:
1. Edit file di `/var/www/projects/indash/INDASH/geojson-api.php`
2. Copy ke www directory: `cp geojson-api.php www/`
3. Atau rebuild Angular app: `ng build`

---

## Contact & Support

Untuk pertanyaan atau issue, silakan hubungi tim development INDASH.
