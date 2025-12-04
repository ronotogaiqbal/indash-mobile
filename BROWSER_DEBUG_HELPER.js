/**
 * BROWSER DEBUG HELPER
 * Copy dan paste script ini ke Browser Console untuk debugging
 *
 * CARA PAKAI:
 * 1. Buka aplikasi di browser (http://localhost:8100)
 * 2. Buka Developer Console (F12)
 * 3. Copy semua kode di file ini
 * 4. Paste ke console dan tekan Enter
 * 5. Jalankan: testKatamData('320101') atau testKatamData('3201011002001')
 */

// Function untuk test fetch KATAM data langsung
async function testKatamData(locationID) {
  console.log('='.repeat(80));
  console.log('TESTING KATAM DATA FETCH');
  console.log('='.repeat(80));
  console.log('Location ID:', locationID);

  const tahun = '2025';
  const musim = '1'; // MT1

  // Determine table and ID column based on ID length
  let tableName, idColumn, queryID;
  const idLength = locationID.length;

  if (idLength === 2) {
    tableName = 'v2_katam_summary_prov';
    idColumn = 'ID_PROV';
    queryID = locationID;
  } else if (idLength === 4) {
    tableName = 'v2_katam_summary_kabu';
    idColumn = 'ID_KABU';
    queryID = locationID;
  } else if (idLength === 6) {
    tableName = 'v2_katam_summary_keca';
    idColumn = 'ID_KECA';
    queryID = locationID;
  } else if (idLength === 10) {
    tableName = 'v2_katam_summary';
    idColumn = 'ID_DESA';
    queryID = locationID;
  } else {
    tableName = 'v2_katam_summary';
    idColumn = 'ID_LAHAN';
    queryID = locationID.substring(0, 10);
  }

  const sqlQuery = `SELECT * FROM ${tableName} WHERE ${idColumn} = '${queryID}' AND TAHUN = '${tahun}' AND SEA = '${musim}'`;

  console.log('\nQuery Details:');
  console.log('  Table:', tableName);
  console.log('  ID Column:', idColumn);
  console.log('  Query ID:', queryID);
  console.log('  SQL:', sqlQuery);

  try {
    const response = await fetch('https://siaptanam.brmpkementan.id/api.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sqlQuery })
    });

    const result = await response.json();

    console.log('\nAPI Response:');
    console.log('  Status:', result.status);
    console.log('  Data Length:', result.data?.length || 0);

    if (result.status === 'success' && result.data && result.data.length > 0) {
      console.log('\n✅ DATA FOUND!');
      console.log('\nSample Data:');
      const data = result.data[0];
      console.log('  LBS:', data.LBS, 'ha');
      console.log('  POLA:', data.POLA);
      console.log('  DST:', data.DST);
      console.log('  MT1_WRQ:', data.MT1_WRQ, 'mm');
      console.log('  MT1_WTOT:', data.MT1_WTOT, 'mm');
      console.log('  MT1_IRR:', data.MT1_IRR, 'mm');

      console.log('\nFull Data Object:');
      console.log(data);

      return data;
    } else {
      console.log('\n❌ NO DATA FOUND');
      console.log('Error:', result.error || result.message || 'Unknown');
      return null;
    }
  } catch (error) {
    console.log('\n❌ FETCH ERROR');
    console.error(error);
    return null;
  }
}

// Function untuk force reload tab2 data
function forceReloadTab2(locationID) {
  console.log('='.repeat(80));
  console.log('FORCE RELOAD TAB 2 DATA');
  console.log('='.repeat(80));
  console.log('Location ID:', locationID);

  // Get Angular component
  const appElement = document.querySelector('app-home');
  if (!appElement) {
    console.error('❌ App element not found!');
    return;
  }

  // Try to get component instance (works in development mode)
  const component = ng?.getComponent?.(appElement);
  if (!component) {
    console.error('❌ Component not found! Make sure you are in development mode.');
    console.log('Try running: ng serve --configuration=development');
    return;
  }

  console.log('✅ Component found!');
  console.log('Tab2 State:', component.tabStates?.tab2);
  console.log('Tab2 Data:', component.tab2Data);

  // Force reload
  console.log('\nForcing reload...');
  component.loadRightPanelData?.(locationID);

  setTimeout(() => {
    console.log('\nAfter reload:');
    console.log('Tab2 State:', component.tabStates?.tab2);
    console.log('Tab2 Data:', component.tab2Data);
  }, 3000);
}

// Quick test functions
function testCibinong() {
  return testKatamData('320101');
}

function testCibinongLahan() {
  return testKatamData('3201011002001');
}

function testAceh() {
  return testKatamData('110102');
}

function testAcehLahan() {
  return testKatamData('1101022001001');
}

// Display help
console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                    BROWSER DEBUG HELPER LOADED                            ║
╚═══════════════════════════════════════════════════════════════════════════╝

Available Functions:

1. testKatamData(locationID)
   - Test fetch KATAM data untuk location ID tertentu
   - Example: testKatamData('320101')

2. testCibinong()
   - Quick test untuk Kecamatan Cibinong

3. testCibinongLahan()
   - Quick test untuk Lahan Cibinong

4. testAceh()
   - Quick test untuk Kecamatan Kluet Utara, Aceh

5. testAcehLahan()
   - Quick test untuk Lahan Aceh

6. forceReloadTab2(locationID)
   - Force reload tab 2 data (only works in development mode)
   - Example: forceReloadTab2('320101')

Quick Start:
------------
> testCibinong()
> testAceh()

`);
