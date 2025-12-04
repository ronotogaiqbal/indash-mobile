#!/usr/bin/env node

/**
 * Script untuk testing API KATAM
 * Usage: node test-katam-api.js
 */

const https = require('https');

const API_URL = 'https://siaptanam.brmpkementan.id/api.php';

// Sample queries untuk testing
const queries = [
  {
    name: 'List Tables',
    query: 'SHOW TABLES LIKE "%katam%"'
  },
  {
    name: 'Sample Data - Desa Level',
    query: 'SELECT ID_LAHAN, TAHUN, SEA, DST, POLA, LBS FROM v2_katam_summary LIMIT 5'
  },
  {
    name: 'Sample Data - Kecamatan Level',
    query: 'SELECT ID_KECA, TAHUN, SEA, DST FROM v2_katam_summary_keca LIMIT 5'
  },
  {
    name: 'Sample Data - Kabupaten Level',
    query: 'SELECT ID_KABU, TAHUN, SEA, DST FROM v2_katam_summary_kabu LIMIT 5'
  },
  {
    name: 'Specific Desa - Aceh',
    query: "SELECT * FROM v2_katam_summary WHERE ID_LAHAN LIKE '1101022001%' AND TAHUN = '2025' LIMIT 1"
  },
  {
    name: 'Count Records',
    query: 'SELECT COUNT(*) as total FROM v2_katam_summary'
  }
];

function executeQuery(query, name) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query: query.query });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 15000 // 15 seconds
    };

    console.log(`\n${'='.repeat(80)}`);
    console.log(`Testing: ${query.name}`);
    console.log(`Query: ${query.query}`);
    console.log(`${'='.repeat(80)}`);

    const req = https.request(API_URL, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('Status:', result.status);

          if (result.status === 'success') {
            console.log('Records found:', result.data?.length || 0);
            if (result.data && result.data.length > 0) {
              console.log('\nSample data:');
              console.log(JSON.stringify(result.data[0], null, 2));
            }
          } else {
            console.log('Error:', result.error || result.message);
          }

          resolve(result);
        } catch (e) {
          console.error('Parse error:', e.message);
          console.log('Raw response:', data.substring(0, 200));
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      console.error('Request error:', e.message);
      reject(e);
    });

    req.on('timeout', () => {
      console.error('Request timeout after 15 seconds');
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('KATAM API Testing');
  console.log('API URL:', API_URL);
  console.log('Time:', new Date().toISOString());

  for (const query of queries) {
    try {
      await executeQuery(query, query.name);
      // Wait 2 seconds between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (e) {
      console.error(`Failed: ${query.name}`);
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('Testing complete!');
  console.log(`${'='.repeat(80)}\n`);
}

runTests().catch(console.error);
