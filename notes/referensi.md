[11/24, 4:08 PM] Ahied Setyono M. Adang: untuk yang data dari siscrop, view yg dipake yg q_sc_ aja.. tergantung layer yg aktiv, apa kecamatan, kabupaten, provinsi, (dan nasional), jd lebih simpel, disitu sdh join tabel dg pupuk jg
[11/24, 4:10 PM] Ahied Setyono M. Adang: siscrop: untuk kolom x0 - x1 .. x7 menunjukkan fase, dan itu jumlah raster (bukan luas). Untuk dapat luas, dihitung proporsi masing-masing fase terhadap total (x0+...+x7) dikali luas LBS nya
[11/24, 4:12 PM] Ahied Setyono M. Adang: rumus luas panen:
    if (tglData.substring(8,10) == '15') {
      pn1 = 0.2*x6 + 20/40*x5;
      pn2 = 20/40*x5 + 10/30*x4;
      pn3 = 20/30*x4 + 10/20*x3;
      pn4 = 10/20*x3 + 20/20*x2;
      pn5 = 0.2*x1;
        
    } else {
      pn1 = 0.25*x6 + 15/40*x5;
      pn2 = 25/40*x5 + 5/30*x4;
      pn3 = 25/30*x4 + 5/20*x3;
      pn4 = 15/20*x3 + 15/20*x2;
      pn5 = 5/20*x2 + 0.2*x1;
        
    }
pn1 ... 5 menunjukkan luas panen bulan 1...5 dari hitungan sekarang (1 bulan ini dst sampai 5 bulan kedepan). Yg pn5 tidak perlu dipakai, cuma sampai pn4
[11/24, 4:13 PM] Ahied Setyono M. Adang: untuk produksi beras:
luas panen * provitas * 0.625
provitas ambil yg bps aja
[11/24, 4:20 PM] Ahied Setyono M. Adang: yg di view q_sc_ itu sudah data terakhir, jadi tidak perlu query tanggal
untuk pemakaian rumus hitung luas panen, tglData diambil dari kolom data_date di masing-masing view q_sc_ (untuk menentukan rumus yg dipakai (awal bulan: tglData.substring(8,19)==='15', atau akhir bulan)
[11/24, 4:29 PM] Ahied Setyono M. Adang: Untuk yg siaptanam
- data kalender tanam untuk masing-masing batas administrasi di v2_katam_summary_ (lahan, desa, keca) dan v2_katam_ (kabu, prov)
- data sumber daya air dan iklim untuk masing-masing daerah admin di v2_sdia_ (lahan ... prov)
- untuk data timeseries (kebutuhan air per dasarian) ambil di tabel t2_katam_ (lahan, desa, keca) tidak ada level kabu dan prov
- defisit irigasi ada di kolom IRR, satuannya mm. Untuk info per admin, IRR total. Untuk info timeseries ini jadi jadwal pemberian irigasi jika defisitnya > 0
[11/24, 4:31 PM] Ahied Setyono M. Adang: untuk siap tanam, perlu diquery dulu tabel latest (kolom musim: 1 menunjukkan okmar, 2 menunjukkan asep, dan tahunnya)
untuk okmar, krn lewat tahun, konsensusnya ikut tahun terakhir (misal untuk sekarang ini ada di musim 1 (okmar) tahun 2026, karena musim start dari oktober 2025 sd. maret 2026)
[11/24, 4:32 PM] Ahied Setyono M. Adang: di beberapa tabel/view, data musim (SEA) dan tahun (TAHUN) dijadikan parameter query di WHERE, selain ID
[11/24, 4:34 PM] Ahied Setyono M. Adang: btw batas administrasi dan lahan (geojson di folder asset) sekarang sedang dibersihkan, nanti kalo sudah jadi saya share.
[11/24, 5:08 PM] Ahied Setyono M. Adang: untuk mobile app nya, basis nya full peta, info setiap klik disajikan pake ion-modal (kalo di halaman manual ionic component contohnya di sheet modal). Fungsi petanya sama dg yg di dashboard, tp tanpa minimap. (ada zoom dan layer controler, scale, tombol my location & search)
[11/24, 5:53 PM] Ahied Setyono M. Adang: modelnya kayak aplikasi google earth di android, tp lebih sederhana (tampilan explore earth).