# INDASH Codebase Documentation

## Overview
**INDASH** (SIPINTAR - Sistem Informasi Pertanian Terintegrasi, Aktual dan Rekomendatif) adalah dashboard pertanian komprehensif untuk monitoring dan perencanaan tanam di Indonesia.

**Lokasi:** `/var/www/projects/indash/INDASH`

## Tech Stack
- **Frontend:** Angular 20, Ionic 8, TypeScript 5.8
- **Mapping:** Leaflet 1.9.4, OpenLayers 10.6.1
- **Visualization:** Chart.js 4.5.1
- **Mobile:** Capacitor 7.4.4
- **Testing:** Karma, Jasmine

## Project Structure
```
INDASH/
├── src/
│   ├── app/
│   │   ├── api/                    # API service layer
│   │   │   └── sql-query.service.ts
│   │   ├── components/
│   │   │   ├── map/               # Leaflet map component (1,002 lines)
│   │   │   ├── side-panel/        # Collapsible panels
│   │   │   ├── src-select/        # Location dropdown
│   │   │   ├── query/             # SQL query component
│   │   │   └── debug-query-button/
│   │   ├── services/
│   │   │   ├── siscrop-formula.service.ts  # Kalkulasi fase tanaman
│   │   │   ├── right-panel-data.service.ts # Data aggregation
│   │   │   └── helper-fn.service.ts        # Utility functions
│   │   ├── models/
│   │   │   └── right-panel.models.ts       # TypeScript interfaces
│   │   ├── home/                  # Main page (1,188 lines)
│   │   ├── app.component.ts
│   │   └── app.routes.ts
│   ├── assets/
│   │   ├── desa/                  # GeoJSON per desa
│   │   ├── polylahan/             # GeoJSON lahan
│   │   ├── lbs_DN_keca.geojson    # Batas kecamatan (7.7MB)
│   │   └── icon/                  # Leaflet icons
│   ├── environments/
│   │   ├── environment.ts         # Dev config
│   │   └── environment.prod.ts    # Prod config
│   └── theme/
├── www/                           # Build output
├── proxy.conf.json                # Dev proxy ke API
├── angular.json
├── capacitor.config.ts
└── package.json
```

## Main Features (4 Tabs)

### Tab 1: SISCROP Monitoring
- Data source: SCS1 database
- Tables: `q_sc_desa`, `q_sc_kecamatan`, `q_sc_kabupaten`, `q_sc_propinsi`
- Metrics: Distribusi fase (Air, Vegetatif 1/2, Generatif 1/2, Bera)
- Forecast panen 4 bulan (PN1-PN4)

### Tab 2: KATAM Planning
- Data source: SIAPTANAM database
- Tables by level:
  - Provinsi: `v2_katam_prov` (has NAMA column)
  - Kabupaten: `v2_katam_kabu` (has NAMA column)
  - Kecamatan: `v2_katam_summary_keca`
  - Desa: `v2_katam_summary`
  - Nasional: `v2_katam_nasional`
- Data: Jadwal tanam, kebutuhan input (benih, pupuk, air), risiko OPT

### Tab 3: SiFortuna Optimization
- Data source: SIFORTUNA database
- Data: Analisis defisit irigasi, rekomendasi varietas

### Tab 4: Summary Dashboard
- Agregasi multi-level: Desa → Kabupaten → Provinsi → Nasional

## API Endpoints

| API | Base URL | Purpose |
|-----|----------|---------|
| SIAPTANAM | https://siaptanam.brmpkementan.id/api.php | KATAM, rainfall, admin |
| SCS1 | https://scs1.brmpkementan.id/api.php | SISCROP, map tiles |
| SIFORTUNA | https://sifortuna.brmpkementan.id/api.php | Optimization |

### Proxy Configuration (Development)
```json
/api → SIAPTANAM
/scs1 → SCS1
/sifortuna → SIFORTUNA
```

## Key Services

### SqlQueryService (`src/app/api/sql-query.service.ts`)
```typescript
executeQuery(sql, apiUrl)
executeSiaptanamQuery(sql)
executeScs1Query(sql)
executeSiFOrtunaQuery(sql)
executeQueryBySource(sql, source)
```

### SiscropFormulaService (`src/app/services/siscrop-formula.service.ts`)
- `calculatePhaseAreas()` - Kalkulasi distribusi fase
- `estimateHarvest()` - Forecast panen 4 bulan
- `analyzeSiscropData()` - Analisis lengkap

### RightPanelDataService (`src/app/services/right-panel-data.service.ts`)
- `fetchSiscropMonitoring(locationID)`
- `fetchKatamPlanning(locationID, tahun, musim)`
- `fetchSifortunaOptimization(locationID, tahun)`
- `fetchSummaryData(locationID)`

## Database Structure

### Administrative Hierarchy (t2_admin)
```
ID_ADMIN format:
  2 digit  → Provinsi
  4 digit  → Kabupaten
  6 digit  → Kecamatan
  10 digit → Desa
  13 digit → Lahan
```

### SISCROP Columns
```
x1: Air (tergenang)
x2: Vegetatif 1 (20 hari)
x3: Vegetatif 2 (20 hari)
x4: Generatif 1 (30 hari)
x5: Generatif 2 (40 hari)
x6: Bera (bero)
data_date: YYMMDD format
```

### Temporal Structure
- **TAHUN:** Year (2025, 2026)
- **MUSIM/SEA:** 1=Musim Hujan (MT1), 2=Musim Kemarau (MT2)
- **Dekad:** 10-day periods (1-36 per year)

## Data Models

### SiscropDisplayData
```typescript
phaseAreas: {air, vegetatif1, vegetatif2, generatif1, generatif2, bera}
harvestForecast: {pn1, pn2, pn3, pn4}
productionForecast: {month1, month2, month3, month4, total}
productivity: {bps, siscrop, used}
dataDate: {year, month, day, formatted, isRealTime}
totalLBS: number
```

### KatamDisplayData
```typescript
planting: {season, year, startDekad, startDate}
crops: {recommended[], pattern, totalArea, breakdown}
inputs: {seeds, fertilizer, water}
opt: {active[], risks, estimatedLoss}
production: {potential, optLoss, waterLoss, expected}
```

## Commands

```bash
# Development
cd INDASH
npm install
ionic serve --host 0.0.0.0 --port 8100

# Build
ng build --configuration production

# Testing
ng test
ng lint
```

## Component Architecture

```
AppComponent
└── HomePage
    ├── MapComponent (Leaflet map)
    │   └── SrcSelectComponent (location dropdown)
    ├── SidePanelComponent (left - info)
    ├── SidePanelComponent (right - 4 tabs)
    └── Charts (rainfall, crop, phase)
```

## Map Layers

### Base Layers
- OpenStreetMap
- ESRI Satellite

### Overlay Layers
- SISCROP tiles: `https://scs1.brmpkementan.id/map-tiles/{code}/{z}/{x}/{y}.png`
- Codes 11-96 (provinces)
- Zoom levels 11-16

### GeoJSON Layers
- Kecamatan: `lbs_DN_keca.geojson` (property: KDCPUM)
- Desa: `desa/desa_{KDCPUM}.geojson` (property: ID_DESA)
- Lahan: `polylahan/lahan_{KDCPUM}.geojson` (property: ID_LAHAN)

## State Management

- **CurrentIdService:** Selected location (BehaviorSubject)
- **RxJS patterns:** merge(), forkJoin(), debounceTime(300)

## Environment Configuration

### Development (`environment.ts`)
```typescript
production: false
showDebugTools: true
apiUrls: { siaptanam: '/api', scs1: '/scs1', sifortuna: '/sifortuna' }
```

### Production (`environment.prod.ts`)
```typescript
production: true
showDebugTools: false
apiUrls: { siaptanam: 'https://...', scs1: 'https://...', sifortuna: 'https://...' }
```

## Deployment

### Production Server
- **Domain:** `integrasi.brmpkementan.id`
- **Web Server:** Nginx
- **Document Root:** `/var/www/html`
- **Public URL:** `https://integrasi.brmpkementan.id`
- **Akses:** SSH & SFTP

### Folder Structure (Production)
```
/var/www/html/
├── bcwag/          # ⚠️ JANGAN DISENTUH - aplikasi lain
├── index.html      # INDASH app (langsung di root)
├── main-*.js
├── assets/
└── ...
```

### Development Server
- **IP:** `202.155.94.128`
- **Node Version:** v20.19.5

### Build & Deploy
```bash
cd INDASH

# Build untuk production
npx ng build --configuration production

# Deploy menggunakan script (RECOMMENDED)
./deploy.sh

# Atau manual dengan rsync (exclude bcwag!)
rsync -avz --checksum --delete --exclude='bcwag' ./www/ user@integrasi.brmpkementan.id:/var/www/html/
```

### Deploy Script (`deploy.sh`)
Script otomatis yang:
1. Cek build folder exists
2. **Dry-run preview** - lihat file apa saja yang akan ditransfer
3. Konfirmasi sebelum eksekusi
4. Transfer hanya file yang berubah (`--checksum`)
5. **Exclude `bcwag/`** - folder ini TIDAK akan disentuh

⚠️ **PERINGATAN:**
- Jangan pernah rsync dengan `--delete` tanpa `--exclude='bcwag'`
- Jika rsync error permission, fix dulu di server:
  ```bash
  ssh agroklimat@integrasi.brmpkementan.id "sudo chown -R agroklimat:agroklimat /var/www/html/"
  ```

## File Naming Conventions
- Components: `*.component.ts`
- Services: `*.service.ts`
- Models: `*.models.ts`
- Tests: `*.spec.ts`

## UI/Styling Strategy

### Framework & Approach
- **UI Framework:** Ionic 8 components sebagai basis
- **Styling:** SCSS dengan component-scoped styles (Angular encapsulation)
- **Responsive:** Mobile-first, gunakan Ionic breakpoints

### Color Palette
```scss
$primary-green: #2d5016;      // Header, borders, accents
$orange-accent: #ff8c42;      // Toggle buttons, CTAs
$white-transparent: rgba(255, 255, 255, 0.6);  // Panel backgrounds
$text-dark: #333333;          // Primary text
```

### Key Styling Patterns

#### 1. Scrollable Containers
Untuk elemen yang bisa overflow di layar kecil:
```scss
.scrollable-horizontal {
  overflow-x: auto;
  overflow-y: hidden;
  flex-wrap: nowrap;
  -webkit-overflow-scrolling: touch;  // smooth scroll iOS
  scrollbar-width: thin;              // Firefox
}
```

#### 2. Tab Bar (ion-tab-bar)
Tab bar di-scroll horizontal untuk resolusi rendah:
```scss
ion-tab-bar {
  overflow-x: auto;
  flex-wrap: nowrap;
}
ion-tab-button {
  flex: 0 0 auto;
  min-width: fit-content;
}
```

#### 3. Side Panels
- Gunakan `app-side-panel` component dengan props:
  - `position`: 'left' | 'right' | 'bottom'
  - `panelWidth`: string (e.g., '300px', '35%')
  - `backgroundColor`: rgba untuk transparency
  - `isCollapsed`: two-way binding

#### 4. Cards & Sections
```scss
.section-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.section-title {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}
```

#### 5. Charts
- Landscape charts: `.chart-container` (full width)
- Portrait charts: `.chart-container-portrait` (max-width: 250px, centered)
- Border: 3px solid $primary-green

### Responsive Breakpoints
```scss
// Mobile first
@media (min-width: 576px) { }   // Small tablets
@media (min-width: 768px) { }   // Tablets
@media (min-width: 992px) { }   // Desktop
```

### File Locations
- Global styles: `src/theme/variables.scss`
- Component styles: `*.component.scss` (scoped)
- Main page styles: `src/app/home/home.page.scss`
