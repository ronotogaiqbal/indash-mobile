# Query Database untuk Kecamatan Bangsal (ID: 351610)

Dokumentasi ini menjelaskan semua query SQL yang dijalankan ketika user memilih **Kecamatan Bangsal, Mojokerto, Jawa Timur** dengan **ID: 351610**.

---

## 📊 Ringkasan Endpoint API

| Endpoint | URL | Keterangan |
|----------|-----|------------|
| **SIAPTANAM** | `https://siaptanam.brmpkementan.id/api.php` | Database untuk KATAM (Perencanaan Tanam) dan Optimalisasi |
| **SCS1** | `https://scs1.brmpkementan.id/api.php` | Database untuk SISCROP (Monitoring Sawah) |

---

## 1️⃣ QUERY MAP - SISCROP Kecamatan

**Tujuan:** Mendapatkan data monitoring fase pertumbuhan padi untuk visualisasi di peta

**Endpoint:** `https://scs1.brmpkementan.id/api.php`

**Service:** `MapComponent` (map.component.ts:809)

**Query SQL:**
```sql
SELECT id_bps, x0, x1, x2, x3, x4, x5, x6, x7, data_date, lbs, provitas_bps, provitas_sc
FROM q_sc_kecamatan
WHERE id_bps = '351610'
ORDER BY data_date DESC
LIMIT 1
```

**Tabel:** `q_sc_kecamatan`

**Kolom yang Diambil:**
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id_bps` | String | ID Kecamatan BPS (6 digit) |
| `x0` | Integer | Luas fase Bera (ha) |
| `x1` | Integer | Luas fase Vegetatif Awal (ha) |
| `x2` | Integer | Luas fase Vegetatif Akhir (ha) |
| `x3` | Integer | Luas fase Generatif (ha) |
| `x4` | Integer | Luas fase Panen Minggu 1 (ha) |
| `x5` | Integer | Luas fase Panen Minggu 2 (ha) |
| `x6` | Integer | Luas fase Panen Minggu 3 (ha) |
| `x7` | Integer | Luas fase Panen Minggu 4 (ha) |
| `data_date` | String | Tanggal data (format: YYMMDD) |
| `lbs` | Decimal | Luas Baku Sawah total (ha) |
| `provitas_bps` | Decimal | Produktivitas BPS (ton/ha) |
| `provitas_sc` | Decimal | Produktivitas SISCROP (ton/ha) |

**Response Data (Kecamatan Bangsal):**
```json
{
  "id_bps": "351610",
  "x0": "233042",
  "x1": "106733",
  "x2": "21539",
  "x3": "9206",
  "x4": "4206",
  "x5": "3521",
  "x6": "2837",
  "x7": "2153",
  "data_date": "251125",
  "lbs": "1498.22",
  "provitas_bps": "5.83",
  "provitas_sc": "5.45"
}
```

**Penggunaan:**
- Visualisasi fase pertumbuhan di peta
- Kalkulasi estimasi panen
- Monitoring kondisi sawah real-time

---

## 2️⃣ QUERY TAB 2 - KATAM (Perencanaan Tanam)

**Tujuan:** Mendapatkan data perencanaan tanam untuk musim tanam yang dipilih

**Endpoint:** `https://siaptanam.brmpkementan.id/api.php`

**Service:** `RightPanelDataService.fetchKatamPlanning()` (right-panel-data.service.ts:156)

**Query SQL:**
```sql
SELECT *
FROM v2_katam_summary_keca
WHERE ID_KECA = '351610'
  AND TAHUN = '2025'
  AND SEA = '1'
LIMIT 1
```

**Tabel:** `v2_katam_summary_keca`

**Parameter:**
- `ID_KECA`: `351610` (6 digit untuk kecamatan)
- `TAHUN`: `2025`
- `SEA`: `1` (Musim Tanam 1 = Musim Hujan)

**Kolom yang Diambil (50 kolom):**

### A. Identitas & Lokasi
| Kolom | Keterangan |
|-------|------------|
| `ID_KECA` | ID Kecamatan (6 digit) |
| `NAMA` | Nama Kecamatan |
| `LBS` | Luas Baku Sawah (ha) |
| `TAHUN` | Tahun perencanaan |
| `SEA` | Musim tanam (1=MT1, 2=MT2, 3=MT3) |

### B. Perencanaan Tanam
| Kolom | Keterangan |
|-------|------------|
| `DST` | Dasarian Start Tanam (1-36) |
| `TST` | Tanggal Start Tanam |
| `POLA` | Pola tanam (contoh: "1-1-0" = Padi-Padi-Bera) |
| `STATUS` | Status perencanaan |

### C. Sumber Air
| Kolom | Keterangan |
|-------|------------|
| `AirPermukaan` | Luas yang diairi air permukaan (ha) |
| `AirTanah` | Luas yang diairi air tanah (ha) |
| `Embung` | Luas yang diairi embung (ha) |

### D. Kebutuhan Air (MT1)
| Kolom | Keterangan | Satuan |
|-------|------------|--------|
| `MT1_WTOT` | Total air tersedia MT1 | mm |
| `MT1_WRQ` | Total kebutuhan air MT1 | mm |
| `MT1_IRR` | Deficit irigasi MT1 | mm |
| `MT1_WDQ` | Water demand MT1 | mm |

### E. Kebutuhan Air (MT2 & MT3)
| Kolom | Keterangan |
|-------|------------|
| `MT2_WTOT`, `MT2_WRQ`, `MT2_IRR`, `MT2_WDQ` | Data MT2 |
| `MT3_WTOT`, `MT3_WRQ`, `MT3_IRR`, `MT3_WDQ` | Data MT3 |

### F. Luas per Komoditas
| Kolom | Keterangan | Satuan |
|-------|------------|--------|
| `BERA_ha` | Luas bera | ha |
| `PADI_ha` | Luas padi | ha |
| `JAGUNG_ha` | Luas jagung | ha |
| `KEDELAI_ha` | Luas kedelai | ha |
| `TERGENANG_ha` | Luas tergenang | ha |

### G. Produksi Padi
| Kolom | Keterangan | Satuan |
|-------|------------|--------|
| `PADI_ton` | Estimasi produksi padi | ton |
| `PA_BENIH_kg` | Kebutuhan benih padi | kg |
| `PA_NPK_ton` | Kebutuhan NPK padi | ton |
| `PA_UREA_m_ton` | Kebutuhan Urea macak padi | ton |
| `PA_SP36_ton` | Kebutuhan SP36 padi | ton |
| `PA_KCL_ton` | Kebutuhan KCL padi | ton |
| `PA_UREA_t_ton` | Kebutuhan Urea susulan padi | ton |

### H. Produksi Jagung
| Kolom | Keterangan | Satuan |
|-------|------------|--------|
| `JAGUNG_ton` | Estimasi produksi jagung | ton |
| `JA_BENIH_kg` | Kebutuhan benih jagung | kg |
| `JA_NPK_ton` | Kebutuhan NPK jagung | ton |
| `JA_UREA_m_ton` | Kebutuhan Urea macak jagung | ton |
| `JA_SP36_ton` | Kebutuhan SP36 jagung | ton |
| `JA_KCL_ton` | Kebutuhan KCL jagung | ton |
| `JA_UREA_t_ton` | Kebutuhan Urea susulan jagung | ton |

### I. Produksi Kedelai
| Kolom | Keterangan | Satuan |
|-------|------------|--------|
| `KEDELAI_ton` | Estimasi produksi kedelai | ton |
| `LE_BENIH_kg` | Kebutuhan benih kedelai | kg |
| `LE_NPK_ton` | Kebutuhan NPK kedelai | ton |
| `LE_UREA_m_ton` | Kebutuhan Urea macak kedelai | ton |
| `LE_SP36_ton` | Kebutuhan SP36 kedelai | ton |
| `LE_KCL_ton` | Kebutuhan KCL kedelai | ton |
| `LE_UREA_t_ton` | Kebutuhan Urea susulan kedelai | ton |

**Response Data (Sample untuk Bangsal):**
```json
{
  "ID_KECA": "351610",
  "NAMA": "Bangsal, Mojokerto, Jawa Timur",
  "LBS": 1498.22,
  "TAHUN": "2025",
  "SEA": "1",
  "DST": 28,
  "TST": null,
  "POLA": "1-1-0",
  "STATUS": "planned",
  "AirPermukaan": 1200.5,
  "AirTanah": 200.0,
  "Embung": 97.72,
  "MT1_WTOT": 808,
  "MT1_WRQ": 625,
  "MT1_IRR": 206,
  "MT1_WDQ": 625,
  "PADI_ha": 2996.44,
  "JAGUNG_ha": 0,
  "KEDELAI_ha": 0,
  "PADI_ton": 17466.21,
  "PA_BENIH_kg": 74911,
  "PA_NPK_ton": 599.29,
  "PA_UREA_m_ton": 749.11,
  "BERA_ha": 0,
  "TERGENANG_ha": 0
}
```

**Penggunaan:**
- Menampilkan informasi musim tanam
- Jadwal tanam (DST)
- Pola tanam
- Luas per komoditas
- Kebutuhan benih
- Kebutuhan pupuk
- Estimasi produksi
- Status ketersediaan air

---

## 3️⃣ QUERY TAB 3 - OPTIMALISASI LAHAN (SiFortuna)

**Tujuan:** Mendapatkan data optimalisasi lahan (deficit irigasi dan rekomendasi)

**Endpoint:** `https://siaptanam.brmpkementan.id/api.php`

**Service:** `RightPanelDataService.fetchSifortunaOptimization()` (right-panel-data.service.ts:473)

**Query SQL:**
```sql
SELECT *
FROM v2_katam_summary_keca
WHERE ID_KECA = '351610'
  AND TAHUN = '2025'
  AND SEA = '1'
LIMIT 1
```

**Tabel:** `v2_katam_summary_keca` (sama dengan Tab 2, tapi fokus ke kolom deficit)

**Kolom yang Digunakan:**
| Kolom | Keterangan | Satuan |
|-------|------------|--------|
| `ID_KECA` | ID Kecamatan | - |
| `NAMA` | Nama Kecamatan | - |
| `LBS` | Luas Baku Sawah | ha |
| `MT1_WRQ` | Water Requirement (Kebutuhan Air) | mm |
| `MT1_WTOT` | Water Total (Air Tersedia) | mm |
| `MT1_IRR` | **Irrigation Deficit (Deficit Irigasi)** | mm |
| `PADI_ha` | Luas Padi (untuk hitung pupuk) | ha |
| `JAGUNG_ha` | Luas Jagung (untuk hitung pupuk) | ha |
| `KEDELAI_ha` | Luas Kedelai (untuk hitung pupuk) | ha |

**Response Data (Bangsal):**
```json
{
  "ID_KECA": "351610",
  "NAMA": "Bangsal, Mojokerto, Jawa Timur",
  "LBS": 1498.22,
  "MT1_WRQ": 625,
  "MT1_WTOT": 808,
  "MT1_IRR": 206,
  "PADI_ha": 2996.44,
  "JAGUNG_ha": 0,
  "KEDELAI_ha": 0
}
```

**Kalkulasi yang Dilakukan:**

### A. Deficit Irigasi
```javascript
totalDeficit = MT1_IRR; // 206 mm
```

### B. Kebutuhan Air
```javascript
waterRequirement = MT1_WRQ;     // 625 mm
waterAvailable = MT1_WTOT;      // 808 mm
deficitIrrigation = MT1_IRR;    // 206 mm

// Konversi ke m³/ha
waterRequirementM3 = MT1_WRQ * 10 * LBS;  // 625 * 10 * 1498.22 = 9,363,875 m³
waterAvailableM3 = MT1_WTOT * 10 * LBS;   // 808 * 10 * 1498.22 = 12,105,296 m³
deficitM3 = MT1_IRR * 10 * LBS;           // 206 * 10 * 1498.22 = 3,086,333 m³
```

### C. Kebutuhan Pompa
```javascript
pumpCapacity = 50;  // liter/detik (default)

// Jika ada detail per-dasarian (d01-d36):
// pumpHours per dasarian = (waterNeed × 1000) / (pumpCapacity × 3.6)
// Untuk deficit 206mm di 1 dasarian:
// pumpHours = (206 * 10 * 1000) / (50 * 3.6) = 11,444 jam

// Estimasi BBM:
// fuelEstimate = pumpHours × 2.5 liter/jam
```

### D. Rekomendasi Pupuk
```javascript
// Dosis per Komoditas (kg/ha):
const DOSIS = {
  PADI: { UREA: 250, NPK: 200 },
  JAGUNG: { UREA: 200, NPK: 150 },
  KEDELAI: { UREA: 50, NPK: 100 }
};

// Kalkulasi:
totalUrea = (PADI_ha × 250) + (JAGUNG_ha × 200) + (KEDELAI_ha × 50);
totalUrea = (2996.44 × 250) + (0 × 200) + (0 × 50) = 749,110 kg

totalNPK = (PADI_ha × 200) + (JAGUNG_ha × 150) + (KEDELAI_ha × 100);
totalNPK = (2996.44 × 200) + (0 × 150) + (0 × 100) = 599,288 kg

totalPupuk = totalUrea + totalNPK = 1,348,398 kg
```

**Penggunaan:**
- Menampilkan total deficit irigasi
- Kalkulasi kebutuhan air irigasi suplementer
- Estimasi kebutuhan pompa
- Rekomendasi dosis pupuk per komoditas

---

## 4️⃣ QUERY VARIETAS REKOMENDASI (Optional - Belum Implementasi)

**Tujuan:** Mendapatkan rekomendasi varietas tanaman

**Endpoint:** `https://siaptanam.brmpkementan.id/api.php`

**Query SQL:**
```sql
SELECT *
FROM varietas_rekomendasi
WHERE ID_KECA = '351610'
LIMIT 5
```

**Tabel:** `varietas_rekomendasi` (belum tersedia)

**Status:** Query ini dijalankan tapi tabel belum ada di database, sehingga akan return empty array.

**Kolom yang Diharapkan:**
| Kolom | Keterangan |
|-------|------------|
| `ID_KECA` | ID Kecamatan |
| `VARIETAS` | Nama varietas (contoh: "Inpari 32") |
| `KOMODITAS` | Jenis komoditas (Padi/Jagung/Kedelai) |
| `UMUR` | Umur panen (hari) |
| `HASIL` | Hasil panen (ton/ha) |
| `KETAHANAN` | Ketahanan terhadap OPT |
| `ALASAN` | Alasan rekomendasi |

---

## 📝 Catatan Penting

### Multi-Level Support

Sistem mendukung query di berbagai level administratif:

| Level | Panjang ID | Contoh ID | Tabel |
|-------|------------|-----------|-------|
| **Provinsi** | 2 digit | `35` | `v2_katam_summary_prov` |
| **Kabupaten** | 4 digit | `3516` | `v2_katam_summary_kabu` |
| **Kecamatan** | 6 digit | `351610` | `v2_katam_summary_keca` |
| **Desa** | 10 digit | `3516100001` | `v2_katam_summary` |
| **Lahan** | 18 digit | `351610000100100001` | `v2_katam_summary` |

### Filter Musim Tanam

Semua query KATAM dan SiFortuna menggunakan filter `SEA = '1'` untuk Musim Tanam 1 (Musim Hujan).

Nilai SEA:
- `1` = MT1 (Musim Hujan)
- `2` = MT2 (Musim Kemarau)
- `3` = MT3 (Musim Peralihan)

### Kolom d01-d36 (Deficit per Dasarian)

**PENTING:** Kolom `d01` sampai `d36` (deficit per dasarian) **TIDAK TERSEDIA** di level kecamatan (`v2_katam_summary_keca`).

Kolom ini hanya tersedia di level LAHAN/DESA (`v2_katam_summary`).

Untuk kecamatan, menggunakan kolom agregat:
- `MT1_IRR` = Total deficit untuk seluruh musim MT1
- `MT1_WRQ` = Total kebutuhan air
- `MT1_WTOT` = Total air tersedia

---

## 🔍 Flow Eksekusi

Ketika user memilih **Kecamatan Bangsal (351610)**:

```
1. MAP Component
   └─> Query q_sc_kecamatan di SCS1
   └─> Tampilkan fase pertumbuhan di peta

2. RIGHT PANEL - Tab 1 (Monitoring)
   └─> Menggunakan data dari query MAP
   └─> Tidak ada query tambahan

3. RIGHT PANEL - Tab 2 (Perencanaan Tanam)
   └─> Query v2_katam_summary_keca di SIAPTANAM
   └─> Filter: SEA = '1', TAHUN = '2025'
   └─> Process data untuk tampilan

4. RIGHT PANEL - Tab 3 (Optimalisasi Lahan)
   └─> Query v2_katam_summary_keca di SIAPTANAM (SAMA dengan Tab 2)
   └─> Filter: SEA = '1', TAHUN = '2025'
   └─> Fokus ke kolom MT1_IRR, MT1_WRQ, MT1_WTOT
   └─> Kalkulasi pupuk, pompa, air

5. RIGHT PANEL - Tab 4 (Summary)
   └─> Agregasi data dari Tab 1, 2, 3
   └─> Tidak ada query tambahan
```

---

## 📊 Tabel Referensi Lengkap

### Tabel SISCROP (Monitoring)
- `q_sc_kecamatan` - Query view untuk kecamatan
- `v2_siscrop_summary` - Tabel utama level lahan/desa
- `v2_siscrop_summary_keca` - Agregat level kecamatan (TIDAK TERSEDIA untuk 2025)

### Tabel KATAM (Perencanaan & Optimalisasi)
- `v2_katam_summary` - Tabel utama level lahan/desa (punya d01-d36)
- `v2_katam_summary_keca` - Agregat level kecamatan (TIDAK punya d01-d36)
- `v2_katam_summary_kabu` - Agregat level kabupaten
- `v2_katam_summary_prov` - Agregat level provinsi

### Tabel Lainnya (Belum Tersedia)
- `varietas_rekomendasi` - Rekomendasi varietas tanaman

---

**Dokumentasi dibuat:** 26 November 2025
**Versi:** 1.0
**Lokasi Kecamatan:** Bangsal, Mojokerto, Jawa Timur
**ID Kecamatan:** 351610
