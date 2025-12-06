/**
 * Right Panel Data Models
 * TypeScript interfaces for INDASH right panel data structures
 */

// ============================================================================
// TAB 1: SISCROP MONITORING
// ============================================================================

export interface SiscropDisplayData {
  phaseAreas: Record<string, number> & {
    air: number;          // x1
    vegetatif1: number;   // x2
    vegetatif2: number;   // x3
    generatif1: number;   // x4
    generatif2: number;   // x5
    bera: number;         // x6
  };

  harvestForecast: {
    pn1: number;  // Month 1 harvest area (ha)
    pn2: number;  // Month 2 harvest area (ha)
    pn3: number;  // Month 3 harvest area (ha)
    pn4: number;  // Month 4 harvest area (ha)
  };

  // Production forecast for each month (tons)
  productionForecast: {
    month1: number;
    month2: number;
    month3: number;
    month4: number;
    total: number;
  };

  productivity: {
    bps: number | null;
    siscrop: number | null;
    used: number;  // The productivity value being used (ton/ha)
  };

  dataDate: {
    year: number;
    month: number;
    day: number;
    formatted: string;      // "15 November 2025"
    isRealTime: boolean;    // true if data is < 7 days old
  };

  totalLBS: number;  // Luas Baku Sawah (ha)

  // Aggregated metrics for cards
  metrics: {
    beraArea: number;      // Bera area (x6)
    padiArea: number;      // Padi area (x2+x3+x4+x5)
    airArea: number;       // Air area (x1)
  };
}

// ============================================================================
// TAB 2: KATAM PLANNING
// ============================================================================

export interface KatamDisplayData {
  locationName?: string;  // Nama lokasi (dari JOIN t2_admin untuk desa/keca)

  planting: {
    season: string;          // "Musim Hujan (MT1)" or "Musim Kemarau (MT2)"
    year: number;
    startDekad: number;      // 1-36
    startDate: string;       // "Awal Oktober 2025"
  };

  crops: {
    recommended: string[];   // ["Padi", "Jagung", "Kedelai"]
    pattern: string;         // "Padi-Padi-Bera"
    totalArea: number;       // Total area (ha)
    breakdown: {
      padi?: number;         // Hectares
      jagung?: number;
      kedelai?: number;
    };
  };

  inputs: {
    seeds: {
      padi?: number;         // kg
      jagung?: number;       // kg
      kedelai?: number;      // kg
      total: number;         // Total seeds (kg)
    };
    fertilizer: {
      urea?: number;         // kg
      npk?: number;          // kg
      phonska?: number;      // kg
      total: number;         // Total fertilizer (kg)
    };
    water: {
      // MT1 (Musim Tanam 1)
      requirement: number;   // Water requirement ratio WRQ (mm)
      available: number;     // Water available WTOT (mm)
      wdq: number;           // Water availability WDQ (mm)
      deficit: number;       // Water deficit IRR (mm)
      ratio: number;         // Availability ratio (%)
      status: 'sufficient' | 'light-deficit' | 'severe-deficit';
      requirementM3: number; // Requirement in m³
      availableM3: number;   // Available in m³
      deficitM3: number;     // Deficit in m³

      // MT2 (Musim Tanam 2)
      mt2Requirement?: number;  // MT2_WRQ (mm)
      mt2Available?: number;    // MT2_WTOT (mm)
      mt2Wdq?: number;          // MT2_WDQ (mm)
      mt2Deficit?: number;      // MT2_IRR (mm)

      // MT3 (Musim Tanam 3)
      mt3Requirement?: number;  // MT3_WRQ (mm)
      mt3Available?: number;    // MT3_WTOT (mm)
      mt3Wdq?: number;          // MT3_WDQ (mm)
      mt3Deficit?: number;      // MT3_IRR (mm)
    };
  };

  opt: {
    active: string[];        // ["Wereng", "Tikus", "Blast"]
    risks: {
      wereng?: number;       // Risk level 0-1
      tikus?: number;
      blast?: number;
      blb?: number;          // Bacterial Leaf Blight
    };
    estimatedLoss: number;   // Estimated production loss (tons)
  };

  production: {
    potential: number;       // Potential production (tons)
    optLoss: number;         // Loss from OPT (tons)
    optLossPct: number;      // Loss from OPT (%)
    waterLoss: number;       // Loss from water deficit (tons)
    waterLossPct: number;    // Loss from water deficit (%)
    expected: number;        // Expected production after losses (tons)
    breakdown: {
      padi?: {
        area: number;        // ha
        productivity: number; // ton/ha
        production: number;   // tons
      };
      jagung?: {
        area: number;
        productivity: number;
        production: number;
      };
      kedelai?: {
        area: number;
        productivity: number;
        production: number;
      };
    };
  };
}

// ============================================================================
// TAB 3: SIFORTUNA OPTIMIZATION
// ============================================================================

export interface SifortunaDisplayData {
  locationName?: string;  // Nama lokasi (dari JOIN t2_admin untuk desa/keca)

  irrigation: {
    deficits: Array<{
      dekad: number;         // 1-36
      period: string;        // "Awal Oktober"
      deficit: number;       // mm
      waterNeed: number;     // m³/ha
      pumpHours: number;     // hours
    }>;
    totalDeficit: number;    // Total deficit (mm)
    criticalPeriods: string[];  // ["Awal Oktober", "Tengah Oktober"]
  };

  varieties: {
    recommended: Array<{
      name: string;          // "Inpari 32"
      crop: string;          // "Padi", "Jagung", "Kedelai"
      maturity: number;      // days
      yield: number;         // ton/ha
      resistance: string;    // "Tahan wereng, blast"
      reason: string;        // Reason for recommendation
    }>;
  };

  pumpRequirements: {
    capacity: number;        // liter/second
    hoursPerDekad: number;   // hours per 10-day period
    fuelEstimate: number;    // liters
  };
}

// ============================================================================
// TAB 4: SUMMARY DATA
// ============================================================================

export interface SummaryData {
  level: 'desa' | 'kabu' | 'prov' | 'nasional';
  name: string;
  id: string;

  siscrop: {
    totalLBS: number;
    phaseDistribution: { [phase: string]: number };  // { bera: 100, tanam: 200, ... }
    totalHarvestForecast: number;  // Sum of pn1-pn4
  };

  katam: {
    totalArea: number;
    cropDistribution: { [crop: string]: number };  // { padi: 500, jagung: 200 }
    estimatedProduction: number;
    plantingStartDate?: string;  // Format: "Awal Oktober"
  };

  combined: {
    productivityAvg: number;     // Average productivity (ton/ha)
    irrigatedPercent: number;    // % of irrigated land
    rainfedPercent: number;      // % of rainfed land
  };
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

export interface DataAvailabilityInfo {
  available: boolean;
  reason?: 'no_coverage' | 'no_data_year_season' | 'network_error' | 'invalid_location';
  message: string;
  details?: string;
  year?: number;
  season?: number;
}

export interface TabState {
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  availabilityInfo?: DataAvailabilityInfo;
}

export interface RightPanelState {
  tab1: TabState;
  tab2: TabState;
  tab3: TabState;
  tab4: TabState;
}

// ============================================================================
// TAB 3: IRRIGATION DATA (Per-Dasarian)
// ============================================================================

export interface Tab3IrrigationData {
  chartData: {
    labels: string[];      // ["Awal Okt", "Tengah Okt", ...]
    wrq: number[];         // Kebutuhan air per dasarian (mm)
    wtot: number[];        // Ketersediaan air per dasarian (mm)
    irr: number[];         // Defisit irigasi per dasarian (mm)
  };
  tableData: Array<{
    jadwal: string;        // "Awal Oktober"
    deficit: number;       // IRR dalam mm
    debit: number;         // lpd/ha
    durasi: number;        // jam/hari
    pompa: number;         // unit
  }>;
  summary: {
    totalDeficit: number;
    deficitCount: number;
  };
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export type LocationLevel = 'prov' | 'kabu' | 'keca' | 'desa' | 'lahan' | 'nasional';

export interface LocationInfo {
  id: string;
  length: number;
  level: LocationLevel;
  suffix: string;  // 'PROV', 'KABU', 'KECA', 'DESA', 'LAHAN'
}

// ============================================================================
// MOBILE LOCATION INFO PANEL
// ============================================================================

export type MobileLocationLevel = 'lahan' | 'desa' | 'keca';

export interface MobileLocationInfoData {
  level: MobileLocationLevel;
  locationId: string;

  // Common fields (all levels)
  desaName: string;
  kecamatanName?: string;
  lbs: number;  // Luas Baku Sawah (ha)

  // Summary fields (desa/keca)
  summary?: {
    jumlahLahan?: number;    // for desa: count of lahan
    jumlahDesa?: number;     // for keca: count of desa
    totalLBS: number;
  };

  // Full detail fields (lahan only)
  fullDetail?: {
    tanggalTanam: string;           // "Awal April", "Tengah Mei", etc.
    komoditas: string;              // "Padi", "Jagung", etc.

    // Defisit Irigasi per Dasarian (from t2_katam tables)
    defisitIrigasi: Array<{
      jadwal: string;               // "Awal April"
      deficit: number;              // mm
    }>;

    // Proyeksi Hujan
    proyeksiHujan: {
      category: string;             // "Normal", "Tinggi", "Rendah"
      probability: number;          // percentage
    };

    // Dosis NPK (from tab2Data.inputs.fertilizer.npk / totalArea)
    dosisNPK: number;               // kg/ha

    // Kebutuhan Alsintan
    alsintan: {
      tr2BajakSingkal: number;
      tr2BajakRotari: number;
      combineHarvester: number;
      mistBlower: number;
      drone: number;
    };
  };
}
