#!/usr/bin/env node

/**
 * Helper script untuk mencari lokasi dengan data KATAM
 * Usage: node find-katam-locations.js [province_code]
 * Example: node find-katam-locations.js 32  (untuk Jawa Barat)
 */

const https = require('https');

const PROVINCE_NAMES = {
  '11': 'Aceh', '12': 'Sumatera Utara', '13': 'Sumatera Barat',
  '14': 'Riau', '15': 'Jambi', '16': 'Sumatera Selatan',
  '17': 'Bengkulu', '18': 'Lampung', '19': 'Kepulauan Bangka Belitung',
  '21': 'Kepulauan Riau', '31': 'DKI Jakarta', '32': 'Jawa Barat',
  '33': 'Jawa Tengah', '34': 'DI Yogyakarta', '35': 'Jawa Timur',
  '36': 'Banten', '51': 'Bali', '52': 'Nusa Tenggara Barat',
  '53': 'Nusa Tenggara Timur', '61': 'Kalimantan Barat',
  '62': 'Kalimantan Tengah', '63': 'Kalimantan Selatan',
  '64': 'Kalimantan Timur', '71': 'Sulawesi Utara',
  '72': 'Sulawesi Tengah', '73': 'Sulawesi Selatan',
  '74': 'Sulawesi Tenggara', '81': 'Maluku', '91': 'Papua'
};

function queryAPI(query) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query });
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 20000
    };

    const req = https.request('https://siaptanam.brmpkementan.id/api.php', options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.write(postData);
    req.end();
  });
}

async function findKecamatanByProvince(provCode) {
  const provinceName = PROVINCE_NAMES[provCode] || 'Unknown';
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Searching KATAM data for: ${provinceName} (${provCode})`);
  console.log(`${'='.repeat(80)}\n`);

  // Query kecamatan
  const query = `SELECT ID_KECA, TAHUN, SEA, DST, POLA FROM v2_katam_summary_keca WHERE ID_KECA LIKE '${provCode}%' LIMIT 10`;

  try {
    const result = await queryAPI(query);

    if (result.status === 'success' && result.data && result.data.length > 0) {
      console.log(`Found ${result.data.length} kecamatan with KATAM data:\n`);

      result.data.forEach((row, idx) => {
        console.log(`${idx + 1}. ID_KECA: ${row.ID_KECA}`);
        console.log(`   Tahun: ${row.TAHUN}, Musim: ${row.SEA === 1 ? 'MT1 (Hujan)' : 'MT2 (Kemarau)'}`);
        console.log(`   Dekad Start: ${row.DST}, Pola: ${row.POLA || 'N/A'}`);
        console.log('');
      });

      // Get detail for first kecamatan
      console.log(`Getting detail for ID_KECA: ${result.data[0].ID_KECA}...`);
      const detailQuery = `SELECT ID_LAHAN, NAMA, LBS, POLA, MT1_WRQ, MT1_WTOT, MT1_IRR FROM v2_katam_summary WHERE ID_LAHAN LIKE '${result.data[0].ID_KECA}%' LIMIT 5`;

      const detailResult = await queryAPI(detailQuery);
      if (detailResult.status === 'success' && detailResult.data && detailResult.data.length > 0) {
        console.log(`\nFound ${detailResult.data.length} lahan in this kecamatan:\n`);
        detailResult.data.forEach((row, idx) => {
          console.log(`${idx + 1}. ID_LAHAN: ${row.ID_LAHAN}`);
          console.log(`   Nama: ${row.NAMA}`);
          console.log(`   LBS: ${row.LBS} ha`);
          console.log(`   Pola: ${row.POLA}`);
          console.log(`   Air - Kebutuhan: ${row.MT1_WRQ}mm, Tersedia: ${row.MT1_WTOT}mm, Defisit: ${row.MT1_IRR}mm`);
          console.log('');
        });
      }
    } else {
      console.log('No data found for this province');
      if (result.error) {
        console.log('Error:', result.error);
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  }

  console.log(`${'='.repeat(80)}\n`);
}

async function listAllProvinces() {
  console.log('\nAll provinces with KATAM data:\n');
  console.log('Sumatera:');
  console.log('  11 - Aceh');
  console.log('  12 - Sumatera Utara');
  console.log('  13 - Sumatera Barat');
  console.log('  14 - Riau');
  console.log('  15 - Jambi');
  console.log('  16 - Sumatera Selatan');
  console.log('  17 - Bengkulu');
  console.log('  18 - Lampung');
  console.log('  19 - Bangka Belitung');
  console.log('\nJawa:');
  console.log('  31 - DKI Jakarta');
  console.log('  32 - Jawa Barat');
  console.log('  33 - Jawa Tengah');
  console.log('  34 - DI Yogyakarta');
  console.log('  35 - Jawa Timur');
  console.log('  36 - Banten');
  console.log('\nBali & Nusa Tenggara:');
  console.log('  51 - Bali');
  console.log('  52 - Nusa Tenggara Barat');
  console.log('  53 - Nusa Tenggara Timur');
  console.log('\nKalimantan:');
  console.log('  61 - Kalimantan Barat');
  console.log('\nUsage: node find-katam-locations.js [province_code]');
  console.log('Example: node find-katam-locations.js 32\n');
}

// Main
const args = process.argv.slice(2);
if (args.length === 0) {
  listAllProvinces();
} else {
  const provCode = args[0].padStart(2, '0');
  findKecamatanByProvince(provCode);
}
