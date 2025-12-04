# DEBUG GUIDE - Tab Perencanaan Tanam

## Perubahan yang Sudah Dilakukan:

1. ✅ **Mengubah default musim ke MT1 (Musim Hujan)**
   - File: `INDASH/src/app/home/home.page.ts` line 172
   - Dari: `this.latest.MUSIM = 2`
   - Ke: `this.latest.MUSIM = 1`

2. ✅ **Menambahkan console log untuk debugging**
   - Tab2 loading process
   - KATAM API request details
   - API response status
   - Data processing results

3. ✅ **Build aplikasi berhasil**

---

## Cara Testing:

### 1. Jalankan Aplikasi
```bash
cd INDASH
npm start
```

### 2. Buka Browser
- URL: `http://localhost:8100` atau `http://localhost:4200`
- Buka **Developer Console** (F12 atau Ctrl+Shift+I)
- Pilih tab **Console**

### 3. Pilih Lokasi di Peta

**Opsi A: Kecamatan Cibinong, Bogor** (RECOMMENDED)
- Klik pada area **Cibinong, Bogor, Jawa Barat**
- Koordinat sekitar: -6.48°S, 106.85°E
- ID Kecamatan: `320101`
- ID Lahan: `3201011002001`

**Opsi B: Kecamatan Kluet Utara, Aceh Selatan**
- Klik pada area **Kluet Utara, Aceh Selatan**
- Koordinat sekitar: 3.13°N, 97.32°E
- ID Kecamatan: `110102`
- ID Lahan: `1101022001001`

### 4. Buka Tab "Perencanaan Tanam"
- Klik tab kedua di right panel
- Icon: Calendar
- Label: "Perencanaan Tanam"

### 5. Periksa Console Log

Anda akan melihat log seperti ini:

```
[TAB2] Loading KATAM data for: { locationID: "320101", tahun: "2025", musim: "1" }
[KATAM] Fetching data: {
  locationID: "320101",
  level: "keca",
  tableName: "v2_katam_summary_keca",
  idColumn: "ID_KECA",
  queryID: "320101",
  tahun: "2025",
  musim: "1",
  sqlQuery: "SELECT * FROM v2_katam_summary_keca WHERE ID_KECA = '320101' AND TAHUN = '2025' AND SEA = '1'"
}
[KATAM] API Response: { status: "success", dataLength: 1 }
[KATAM] Processed data: { planting: {...}, crops: {...}, inputs: {...} }
[TAB2] KATAM data received: { planting: {...}, crops: {...}, inputs: {...} }
```

---

## Troubleshooting:

### Jika tidak ada log sama sekali:
- ❌ Lokasi tidak dipilih dengan benar
- ❌ ID lokasi tidak valid
- **Solusi:** Pastikan Anda klik pada area yang memiliki data (Cibinong atau Kluet Utara)

### Jika log menunjukkan "No data found":
```
[KATAM] No data found in response
[TAB2] No KATAM data returned
```
- ❌ Tahun atau musim salah
- ❌ ID lokasi tidak ada di database
- **Solusi:** Coba lokasi lain atau periksa parameter tahun/musim

### Jika ada error API:
```
[KATAM] Fetch error: ...
```
- ❌ Koneksi ke API SIAPTANAM gagal
- ❌ Query SQL error
- **Solusi:** Periksa koneksi internet dan API status

### Jika data berhasil dimuat tapi tidak tampil di UI:
- ❌ Template HTML error
- ❌ Data binding issue
- **Solusi:** Periksa browser console untuk error Angular

---

## Data yang Seharusnya Muncul:

### 1. Jadwal Tanam
- Musim: MT1 (Musim Hujan) atau MT2 (Musim Kemarau)
- Tahun: 2025
- Mulai Tanam: "Awal Oktober" atau sesuai dekad

### 2. Komoditas
- Pola Tanam: "Padi-Padi-Padi" atau variasi lain
- Breakdown luas per komoditas (ha)

### 3. Kebutuhan Benih
- Padi: XX kg (LBS × 25 kg/ha)
- Total benih

### 4. Kebutuhan Pupuk
- Urea: XX kg
- NPK: XX kg
- Total pupuk

### 5. Kebutuhan Air
- **Progress Bar** menunjukkan rasio ketersediaan
- **Badge** menunjukkan status (Cukup/Defisit Ringan/Defisit Berat)
- Detail: Kebutuhan, Ketersediaan, Defisit (dalam mm dan m³)

### 6. Prediksi OPT
- Saat ini: "Tidak ada ancaman OPT terdeteksi" (menunggu API Sifortuna)

### 7. Potensi Kehilangan Hasil
- Kehilangan dari kurang air (jika ada)
- Kehilangan dari OPT (jika ada)

### 8. Potensi Produksi
- Potensi maksimal (ton)
- Produksi diharapkan (ton)
- Breakdown per komoditas

---

## ID Lokasi yang Bisa Dicoba:

### Level Kecamatan (6 digit):
- `320101` - Cibinong, Bogor, Jawa Barat ⭐
- `320102` - Gunung Putri, Bogor, Jawa Barat
- `110102` - Kluet Utara, Aceh Selatan, Aceh ⭐

### Level Lahan (13 digit):
- `3201011002001` - Karadenan, Cibinong, Bogor ⭐
- `1101022001001` - Fajar Harapan, Kluet Utara, Aceh ⭐

---

## Perintah Testing Manual

Jika Anda ingin test data KATAM tanpa aplikasi:

```bash
# Test query untuk Cibinong
node -e "
const https = require('https');
const query = \"SELECT * FROM v2_katam_summary_keca WHERE ID_KECA = '320101' AND TAHUN = '2025' AND SEA = '1'\";
const req = https.request('https://siaptanam.brmpkementan.id/api.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(JSON.parse(data)));
});
req.write(JSON.stringify({ query }));
req.end();
"
```

---

## Next Steps:

Jika masalah masih terjadi setelah mengikuti langkah di atas:

1. **Screenshot console log** dan kirimkan
2. **Screenshot tab yang tidak muncul**
3. **Sebutkan lokasi yang diklik** (nama atau koordinat)
4. **Sebutkan error message yang muncul** (jika ada)

Saya akan membantu debug lebih lanjut! 🚀
