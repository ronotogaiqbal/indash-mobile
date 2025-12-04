import { Injectable } from '@angular/core';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SqlQueryService, QueryResponse } from '../api/sql-query.service';
import { SiscropFormulaService, SiscropData } from './siscrop-formula.service';
import {
  SiscropDisplayData,
  KatamDisplayData,
  SifortunaDisplayData,
  SummaryData,
  LocationInfo,
  LocationLevel,
  DataAvailabilityInfo,
  Tab3IrrigationData
} from '../models/right-panel.models';

/**
 * Right Panel Data Service
 * Handles data fetching and transformation for all 4 right panel tabs
 */
@Injectable({
  providedIn: 'root'
})
export class RightPanelDataService {

  private readonly INDONESIAN_MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  constructor(
    private sqlQueryService: SqlQueryService,
    private siscropFormulaService: SiscropFormulaService
  ) { }

  // ============================================================================
  // TAB 1: SISCROP MONITORING
  // ============================================================================

  /**
   * Fetch SISCROP monitoring data for a location
   * Returns phase areas, harvest forecast, productivity comparison, and data date
   */
  fetchSiscropMonitoring(locationID: string): Observable<SiscropDisplayData | null> {
    if (!locationID) {
      return of(null);
    }

    const locationInfo = this.getLocationInfo(locationID);
    const tableName = this.getSiscropTable(locationInfo.level);
    const idColumn = locationInfo.level === 'nasional' ? 'id_admin' : 'id_bps';

    // Use first 10 chars for lahan level (desa ID)
    const queryID = locationInfo.level === 'lahan' ? locationID.substring(0, 10) : locationID;

    const sqlQuery =
      `SELECT id_bps, x0, x1, x2, x3, x4, x5, x6, x7, data_date, lbs, ` +
      `provitas_bps, provitas_sc FROM ${tableName} ` +
      `WHERE ${idColumn} = '${queryID}' ` +
      `ORDER BY data_date DESC LIMIT 1`;

    return this.sqlQueryService.executeScs1Query(sqlQuery).pipe(
      map((response: QueryResponse) => {
        if (response.status === 'success' && response.data && response.data.length > 0) {
          return this.processSiscropData(response.data[0] as SiscropData);
        }
        return null;
      }),
      catchError((error) => {
        console.error('[RightPanel] SISCROP fetch error:', error);
        return of(null);
      })
    );
  }

  /**
   * Transform raw SISCROP data to display format
   */
  private processSiscropData(rawData: SiscropData): SiscropDisplayData {
    // Use formula service for calculations
    const analysis = this.siscropFormulaService.analyzeSiscropData(rawData);

    // Format data date
    const dateInfo = this.parseDataDate(rawData.data_date);
    const formattedDate = this.formatIndonesianDate(
      new Date(dateInfo.year, dateInfo.month - 1, dateInfo.day)
    );

    // Check if data is real-time (< 7 days old)
    const dataDate = new Date(dateInfo.year, dateInfo.month - 1, dateInfo.day);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - dataDate.getTime()) / (1000 * 60 * 60 * 24));
    const isRealTime = daysDiff < 7;

    // Calculate metrics for cards
    // Padi area = x2 + x3 + x4 + x5 (vegetatif1, vegetatif2, generatif1, generatif2)
    const metrics = {
      beraArea: analysis.phaseAreas['bera'],      // x6
      padiArea: analysis.phaseAreas['vegetatif1'] +
                analysis.phaseAreas['vegetatif2'] +
                analysis.phaseAreas['generatif1'] +
                analysis.phaseAreas['generatif2'],
      airArea: analysis.phaseAreas['air']        // x1
    };

    return {
      phaseAreas: analysis.phaseAreas as SiscropDisplayData['phaseAreas'],
      harvestForecast: analysis.harvest,
      productionForecast: analysis.production,
      productivity: {
        bps: rawData.provitas_bps || null,
        siscrop: rawData.provitas_sc || null,
        used: analysis.provitas
      },
      dataDate: {
        year: dateInfo.year,
        month: dateInfo.month,
        day: dateInfo.day,
        formatted: formattedDate,
        isRealTime: isRealTime
      },
      totalLBS: rawData.lbs,
      metrics: metrics
    };
  }

  // ============================================================================
  // TAB 2: KATAM PLANNING
  // ============================================================================

  /**
   * Fetch provitas data from provitas_kab table by kabupaten ID
   * Provitas values are in ton/ha for each commodity
   */
  fetchProvitasKab(locationID: string): Observable<{padi: number, jagung: number, kedelai: number}> {
    // Extract kabupaten ID (first 4 digits)
    const idKabu = locationID.substring(0, 4);

    const sql = `SELECT PADI, JAGUNG, KEDELAI FROM provitas_kab WHERE ID_KABU = '${idKabu}'`;

    return this.sqlQueryService.executeSiaptanamQuery(sql).pipe(
      map(response => {
        if (response.data && response.data[0]) {
          return {
            padi: parseFloat(response.data[0].PADI) || 5.0,
            jagung: parseFloat(response.data[0].JAGUNG) || 4.5,
            kedelai: parseFloat(response.data[0].KEDELAI) || 1.5
          };
        }
        // Default values if not found
        return { padi: 5.0, jagung: 4.5, kedelai: 1.5 };
      }),
      catchError((error) => {
        console.warn('[RightPanel] Provitas fetch error, using defaults:', error);
        return of({ padi: 5.0, jagung: 4.5, kedelai: 1.5 });
      })
    );
  }

  /**
   * Fetch KATAM planning data for a location
   * Returns planting schedule, crops, inputs, OPT predictions, and production estimates
   */
  fetchKatamPlanning(
    locationID: string,
    tahun: string,
    musim: string
  ): Observable<{ data: KatamDisplayData | null; availability: DataAvailabilityInfo }> {
    if (!locationID) {
      console.warn('[KATAM] No location ID provided');
      return of({
        data: null,
        availability: {
          available: false,
          reason: 'invalid_location' as const,
          message: 'Lokasi tidak valid',
          details: 'ID lokasi tidak diberikan.'
        } as DataAvailabilityInfo
      });
    }

    const locationInfo = this.getLocationInfo(locationID);

    // For lahan level, use desa table with desa ID (first 10 chars)
    // because v2_katam_summary for lahan is too slow/unreliable
    const effectiveLevel = locationInfo.level === 'lahan' ? 'desa' : locationInfo.level;
    const tableName = this.getKatamTable(effectiveLevel as LocationLevel);

    // Determine ID column based on effective level
    // National level uses ID_ADMIN, others use ID_{SUFFIX}
    let idColumn: string;
    if (effectiveLevel === 'nasional') {
      idColumn = 'ID_ADMIN';
    } else if (effectiveLevel === 'desa') {
      idColumn = 'ID_DESA';
    } else if (effectiveLevel === 'keca') {
      idColumn = 'ID_KECA';
    } else if (effectiveLevel === 'kabu') {
      idColumn = 'ID_KABU';
    } else if (effectiveLevel === 'prov') {
      idColumn = 'ID_PROV';
    } else {
      idColumn = `ID_${locationInfo.suffix}`;
    }

    // Use first 10 chars for lahan level (desa ID)
    const queryID = locationInfo.level === 'lahan' ? locationID.substring(0, 10) : locationID;

    // Untuk level desa/keca/lahan, JOIN dengan t2_admin untuk mendapatkan nama lokasi
    // Level prov, kabu, nasional sudah memiliki kolom NAMA
    // Note: v2_katam_summary_keca already has NAMA column, but desa needs JOIN
    let sqlQuery: string;
    if (effectiveLevel === 'desa' || locationInfo.level === 'lahan') {
      sqlQuery =
        `SELECT k.*, a.NAMA as NAMA_ADMIN FROM ${tableName} k ` +
        `LEFT JOIN t2_admin a ON k.${idColumn} = a.ID_ADMIN ` +
        `WHERE k.${idColumn} = '${queryID}' ` +
        `AND k.TAHUN = '${tahun}' ` +
        `AND k.SEA = '${musim}'`;
    } else if (effectiveLevel === 'keca') {
      // v2_katam_summary_keca has NAMA column directly
      sqlQuery =
        `SELECT * FROM ${tableName} ` +
        `WHERE ${idColumn} = '${queryID}' ` +
        `AND TAHUN = '${tahun}' ` +
        `AND SEA = '${musim}'`;
    } else {
      sqlQuery =
        `SELECT * FROM ${tableName} ` +
        `WHERE ${idColumn} = '${queryID}' ` +
        `AND TAHUN = '${tahun}' ` +
        `AND SEA = '${musim}'`;
    }

    console.log('[KATAM] Fetching data:', {
      locationID,
      level: locationInfo.level,
      effectiveLevel,
      tableName,
      idColumn,
      queryID,
      tahun,
      musim,
      sqlQuery
    });

    // For non-national levels, fetch KATAM data and provitas_kab in parallel
    // National level doesn't need provitas_kab (has its own aggregated data)
    if (locationInfo.level === 'nasional') {
      return this.sqlQueryService.executeSiaptanamQuery(sqlQuery).pipe(
        map((response: QueryResponse) => {
          console.log('[KATAM] API Response (nasional):', { status: response.status, dataLength: response.data?.length });

          const dataExists = response.status === 'success' && response.data && response.data.length > 0;
          const availability = this.checkKatamAvailability(locationID, tahun, musim, dataExists);

          if (dataExists) {
            const processed = this.processKatamDataNasional(response.data[0], tahun, musim);
            console.log('[KATAM] Processed data (nasional):', processed);
            return { data: processed, availability };
          }

          console.warn('[KATAM] No data found in response');
          return { data: null, availability };
        }),
        catchError((error) => {
          console.error('[KATAM] Fetch error:', error);
          return of({
            data: null,
            availability: {
              available: false,
              reason: 'network_error' as const,
              message: 'Gagal memuat data KATAM',
              details: 'Terjadi kesalahan jaringan saat mengambil data. Silakan coba lagi.'
            } as DataAvailabilityInfo
          });
        })
      );
    }

    // For other levels: fetch KATAM data and provitas_kab in parallel using forkJoin
    return forkJoin({
      katam: this.sqlQueryService.executeSiaptanamQuery(sqlQuery),
      provitas: this.fetchProvitasKab(locationID)
    }).pipe(
      map(({katam, provitas}) => {
        console.log('[KATAM] API Response:', { status: katam.status, dataLength: katam.data?.length });
        console.log('[KATAM] Provitas from provitas_kab:', provitas);

        const dataExists = katam.status === 'success' && katam.data && katam.data.length > 0;
        const availability = this.checkKatamAvailability(locationID, tahun, musim, dataExists);

        if (dataExists) {
          // Pass provitas data to processKatamData
          const processed = this.processKatamData(katam.data[0], tahun, musim, provitas);
          console.log('[KATAM] Processed data with provitas_kab:', processed);
          return { data: processed, availability };
        }

        console.warn('[KATAM] No data found in response');
        return { data: null, availability };
      }),
      catchError((error) => {
        console.error('[KATAM] Fetch error:', error);
        return of({
          data: null,
          availability: {
            available: false,
            reason: 'network_error' as const,
            message: 'Gagal memuat data KATAM',
            details: 'Terjadi kesalahan jaringan saat mengambil data. Silakan coba lagi.'
          } as DataAvailabilityInfo
        });
      })
    );
  }

  /**
   * Check if KATAM data exists for a location/year/season
   * Returns availability info with user-friendly message
   */
  private checkKatamAvailability(
    locationID: string,
    tahun: string,
    musim: string,
    dataExists: boolean
  ): DataAvailabilityInfo {
    if (dataExists) {
      return {
        available: true,
        message: 'Data tersedia'
      };
    }

    // Determine reason for missing data
    const locationInfo = this.getLocationInfo(locationID);

    // Check if location level is typically covered (now includes nasional)
    const coveredLevels: LocationLevel[] = ['desa', 'keca', 'kabu', 'prov', 'nasional'];
    const isCovered = coveredLevels.includes(locationInfo.level);

    if (!isCovered) {
      return {
        available: false,
        reason: 'no_coverage' as const,
        message: `Data KATAM tidak tersedia untuk tingkat ${locationInfo.level}`,
        details: 'KATAM hanya tersedia untuk tingkat Desa, Kecamatan, Kabupaten, Provinsi, dan Nasional.'
      };
    }

    // Data should exist but doesn't - likely no data for this year/season
    return {
      available: false,
      reason: 'no_data_year_season' as const,
      message: `Data KATAM tidak ditemukan untuk lokasi ini`,
      details: `Tidak ada data perencanaan untuk Tahun ${tahun}, Musim ${musim === '1' ? 'Hujan (MT1)' : 'Kemarau (MT2)'} di lokasi ini. Data mungkin belum tersedia atau lokasi tidak termasuk dalam cakupan perencanaan tahun ini.`,
      year: parseInt(tahun, 10),
      season: parseInt(musim, 10)
    };
  }

  /**
   * Transform raw KATAM data to display format
   * @param provitasData Optional provitas from provitas_kab table (takes priority over rawData)
   */
  private processKatamData(
    rawData: any,
    tahun: string,
    musim: string,
    provitasData?: {padi: number, jagung: number, kedelai: number}
  ): KatamDisplayData {
    // Extract location name (from JOIN or direct column)
    const locationName = rawData.NAMA || rawData.NAMA_ADMIN || rawData.nama || rawData.nama_admin || undefined;

    // Season name
    const seasonName = musim === '1' ? 'Musim Hujan (MT1)' : 'Musim Kemarau (MT2)';

    // Planting schedule
    const startDekad = rawData.DST || rawData.dst || 1;
    const startDate = this.formatDekad(startDekad);

    // ========================================================================
    // CROPS AREA - Get LBS per commodity
    // ========================================================================
    const lbs = rawData.LBS || rawData.lbs || 0;
    const pola = rawData.POLA || rawData.pola || '';

    // Determine crop from pattern (first digit: 1=Padi, 2=Jagung, 3=Kedelai, 0=Bera)
    let luasPadi = 0;
    let luasJagung = 0;
    let luasKedelai = 0;

    if (pola && pola.length > 0) {
      const firstCrop = pola.charAt(0);
      if (firstCrop === '1') {
        luasPadi = lbs;
      } else if (firstCrop === '2') {
        luasJagung = lbs;
      } else if (firstCrop === '3') {
        luasKedelai = lbs;
      }
    } else {
      // Fallback: try to get from explicit columns
      luasPadi = rawData.LUAS_PADI || rawData.luas_padi || 0;
      luasJagung = rawData.LUAS_JAGUNG || rawData.luas_jagung || 0;
      luasKedelai = rawData.LUAS_KEDELAI || rawData.luas_kedelai || 0;
    }

    const totalArea = luasPadi + luasJagung + luasKedelai;

    const recommended: string[] = [];
    const breakdown: any = {};
    if (luasPadi > 0) {
      recommended.push('Padi');
      breakdown.padi = luasPadi;
    }
    if (luasJagung > 0) {
      recommended.push('Jagung');
      breakdown.jagung = luasJagung;
    }
    if (luasKedelai > 0) {
      recommended.push('Kedelai');
      breakdown.kedelai = luasKedelai;
    }

    // Pattern translation
    const patternMap: { [key: string]: string } = {
      '1': 'Padi', '2': 'Jagung', '3': 'Kedelai', '0': 'Bera'
    };
    let patternText = 'Padi-Padi-Bera';
    if (pola && pola.length >= 3) {
      const crops = pola.substring(0, 3).split('').map((c: string) => patternMap[c] || 'Bera');
      patternText = crops.join('-');
    }

    // ========================================================================
    // SEEDS CALCULATION (LBS x dosis per komoditas)
    // ========================================================================
    const DOSIS_BENIH_PADI = 25;    // kg/ha
    const DOSIS_BENIH_JAGUNG = 20;  // kg/ha
    const DOSIS_BENIH_KEDELAI = 40; // kg/ha

    const benihPadi = luasPadi > 0 ? luasPadi * DOSIS_BENIH_PADI : 0;
    const benihJagung = luasJagung > 0 ? luasJagung * DOSIS_BENIH_JAGUNG : 0;
    const benihKedelai = luasKedelai > 0 ? luasKedelai * DOSIS_BENIH_KEDELAI : 0;
    const totalBenih = benihPadi + benihJagung + benihKedelai;

    const seeds: any = { total: totalBenih };
    if (benihPadi > 0) seeds.padi = benihPadi;
    if (benihJagung > 0) seeds.jagung = benihJagung;
    if (benihKedelai > 0) seeds.kedelai = benihKedelai;

    // ========================================================================
    // FERTILIZER CALCULATION (LBS x dosis per komoditas)
    // ========================================================================
    const DOSIS_UREA_PADI = 250;     // kg/ha
    const DOSIS_NPK_PADI = 200;      // kg/ha
    const DOSIS_UREA_JAGUNG = 200;   // kg/ha
    const DOSIS_NPK_JAGUNG = 150;    // kg/ha
    const DOSIS_UREA_KEDELAI = 50;   // kg/ha
    const DOSIS_NPK_KEDELAI = 100;   // kg/ha

    const ureaTotal = (luasPadi * DOSIS_UREA_PADI) +
                      (luasJagung * DOSIS_UREA_JAGUNG) +
                      (luasKedelai * DOSIS_UREA_KEDELAI);

    const npkTotal = (luasPadi * DOSIS_NPK_PADI) +
                     (luasJagung * DOSIS_NPK_JAGUNG) +
                     (luasKedelai * DOSIS_NPK_KEDELAI);

    const totalPupuk = ureaTotal + npkTotal;

    const fertilizer: any = { total: totalPupuk };
    if (ureaTotal > 0) fertilizer.urea = ureaTotal;
    if (npkTotal > 0) fertilizer.npk = npkTotal;

    // ========================================================================
    // WATER CALCULATION (MT1_WRQ, MT1_WDQ, MT1_WTOT, MT1_IRR)
    // Include MT1, MT2, MT3 data for charts and tables
    // ========================================================================
    // MT1 data
    const mt1WRQ = rawData.MT1_WRQ || rawData.mt1_wrq || 0;
    const mt1WDQ = rawData.MT1_WDQ || rawData.mt1_wdq || 0;
    const mt1WTOT = rawData.MT1_WTOT || rawData.mt1_wtot || 0;
    const mt1IRR = rawData.MT1_IRR || rawData.mt1_irr || 0;

    // MT2 data
    const mt2WRQ = rawData.MT2_WRQ || rawData.mt2_wrq || 0;
    const mt2WDQ = rawData.MT2_WDQ || rawData.mt2_wdq || 0;
    const mt2WTOT = rawData.MT2_WTOT || rawData.mt2_wtot || 0;
    const mt2IRR = rawData.MT2_IRR || rawData.mt2_irr || 0;

    // MT3 data
    const mt3WRQ = rawData.MT3_WRQ || rawData.mt3_wrq || 0;
    const mt3WDQ = rawData.MT3_WDQ || rawData.mt3_wdq || 0;
    const mt3WTOT = rawData.MT3_WTOT || rawData.mt3_wtot || 0;
    const mt3IRR = rawData.MT3_IRR || rawData.mt3_irr || 0;

    // Calculate ratio and status based on selected musim
    const wtot = musim === '1' ? mt1WTOT : mt2WTOT;
    const wrq = musim === '1' ? mt1WRQ : mt2WRQ;
    const wdq = musim === '1' ? mt1WDQ : mt2WDQ;
    const irr = musim === '1' ? mt1IRR : mt2IRR;

    const waterRatio = wrq > 0 ? (wtot / wrq) * 100 : 100;
    let waterStatus: 'sufficient' | 'light-deficit' | 'severe-deficit' = 'sufficient';
    if (waterRatio < 80) {
      waterStatus = 'severe-deficit';
    } else if (waterRatio < 100) {
      waterStatus = 'light-deficit';
    }

    // Convert mm to m³ (1mm = 10 m³/ha)
    const requirementM3 = wrq * 10 * totalArea;
    const availableM3 = wtot * 10 * totalArea;
    const deficitM3 = irr * 10 * totalArea;

    const water = {
      // MT1 (primary for current musim)
      requirement: mt1WRQ,
      available: mt1WTOT,
      wdq: mt1WDQ,
      deficit: mt1IRR,
      ratio: waterRatio,
      status: waterStatus,
      requirementM3: requirementM3,
      availableM3: availableM3,
      deficitM3: deficitM3,

      // MT2 data
      mt2Requirement: mt2WRQ,
      mt2Available: mt2WTOT,
      mt2Wdq: mt2WDQ,
      mt2Deficit: mt2IRR,

      // MT3 data
      mt3Requirement: mt3WRQ,
      mt3Available: mt3WTOT,
      mt3Wdq: mt3WDQ,
      mt3Deficit: mt3IRR
    };

    // ========================================================================
    // OPT RISK - extract risk levels (untuk nanti dari API)
    // ========================================================================
    const optWereng = rawData.OPT_WERENG || rawData.opt_wereng || 0;
    const optTikus = rawData.OPT_TIKUS || rawData.opt_tikus || 0;
    const optBlast = rawData.OPT_BLAST || rawData.opt_blast || 0;
    const optBLB = rawData.OPT_BLB || rawData.opt_blb || 0;

    const active: string[] = [];
    const risks: any = {};
    const riskThreshold = 0.3;

    if (optWereng > riskThreshold) {
      active.push('Wereng');
      risks.wereng = optWereng;
    }
    if (optTikus > riskThreshold) {
      active.push('Tikus');
      risks.tikus = optTikus;
    }
    if (optBlast > riskThreshold) {
      active.push('Blast');
      risks.blast = optBlast;
    }
    if (optBLB > riskThreshold) {
      active.push('Hawar Daun Bakteri');
      risks.blb = optBLB;
    }

    const estimatedLoss = rawData.KEHILANGAN_OPT || rawData.kehilangan_opt || 0;

    // ========================================================================
    // PRODUCTION CALCULATION (LBS x Provitas)
    // Use provitasData from provitas_kab if available, otherwise fallback to rawData
    // ========================================================================
    const provitasPadi = provitasData?.padi || rawData.PADI || rawData.padi || 5.0;    // ton/ha default
    const provitasJagung = provitasData?.jagung || rawData.JAGUNG || rawData.jagung || 4.5;
    const provitasKedelai = provitasData?.kedelai || rawData.KEDELAI || rawData.kedelai || 1.5;

    const produksiPadi = luasPadi * provitasPadi;
    const produksiJagung = luasJagung * provitasJagung;
    const produksiKedelai = luasKedelai * provitasKedelai;
    const potentialProduction = produksiPadi + produksiJagung + produksiKedelai;

    // Breakdown per commodity
    const productionBreakdown: any = {};
    if (luasPadi > 0) {
      productionBreakdown.padi = {
        area: luasPadi,
        productivity: provitasPadi,
        production: produksiPadi
      };
    }
    if (luasJagung > 0) {
      productionBreakdown.jagung = {
        area: luasJagung,
        productivity: provitasJagung,
        production: produksiJagung
      };
    }
    if (luasKedelai > 0) {
      productionBreakdown.kedelai = {
        area: luasKedelai,
        productivity: provitasKedelai,
        production: produksiKedelai
      };
    }

    // Loss calculation
    const kehilanganAirPct = rawData.KEHILANGAN_AIR_PCT || rawData.kehilangan_air_pct || 0;
    const kehilanganOptPct = rawData.KEHILANGAN_OPT_PCT || rawData.kehilangan_opt_pct || 0;

    const waterLoss = potentialProduction * (kehilanganAirPct / 100);
    const optLoss = potentialProduction * (kehilanganOptPct / 100);
    const expected = Math.max(0, potentialProduction - waterLoss - optLoss);

    // ========================================================================
    // RETURN DATA
    // ========================================================================
    return {
      locationName: locationName,
      planting: {
        season: seasonName,
        year: parseInt(tahun, 10),
        startDekad: startDekad,
        startDate: startDate
      },
      crops: {
        recommended: recommended,
        pattern: patternText,
        totalArea: totalArea,
        breakdown: breakdown
      },
      inputs: {
        seeds: seeds,
        fertilizer: fertilizer,
        water: water
      },
      opt: {
        active: active,
        risks: risks,
        estimatedLoss: estimatedLoss
      },
      production: {
        potential: potentialProduction,
        optLoss: optLoss,
        optLossPct: kehilanganOptPct,
        waterLoss: waterLoss,
        waterLossPct: kehilanganAirPct,
        expected: expected,
        breakdown: productionBreakdown
      }
    };
  }

  /**
   * Transform raw KATAM data for NATIONAL level to display format
   * National level has different column structure (already aggregated)
   */
  private processKatamDataNasional(rawData: any, tahun: string, musim: string): KatamDisplayData {
    // Extract location name (national level)
    const locationName = rawData.NAMA || rawData.nama || 'Indonesia';

    // Season name
    const seasonName = musim === '1' ? 'Musim Hujan (MT1)' : 'Musim Kemarau (MT2)';

    // ========================================================================
    // CROPS AREA - National uses PADI_ha, JAGUNG_ha, KEDELAI_ha directly
    // ========================================================================
    const luasPadi = rawData.PADI_ha || rawData.padi_ha || 0;
    const luasJagung = rawData.JAGUNG_ha || rawData.jagung_ha || 0;
    const luasKedelai = rawData.KEDELAI_ha || rawData.kedelai_ha || 0;
    const luasBera = rawData.BERA_ha || rawData.bera_ha || 0;
    const lbs = rawData.LBS || rawData.lbs || 0;

    const totalArea = luasPadi + luasJagung + luasKedelai;

    const recommended: string[] = [];
    const breakdown: any = {};
    if (luasPadi > 0) {
      recommended.push('Padi');
      breakdown.padi = luasPadi;
    }
    if (luasJagung > 0) {
      recommended.push('Jagung');
      breakdown.jagung = luasJagung;
    }
    if (luasKedelai > 0) {
      recommended.push('Kedelai');
      breakdown.kedelai = luasKedelai;
    }

    // IP Padi (Intensitas Pertanaman)
    const ipPadi = rawData.IP_Padi || rawData.ip_padi || 0;
    const patternText = ipPadi > 0 ? `IP Padi: ${ipPadi.toFixed(2)}` : 'Padi-Padi-Bera';

    // ========================================================================
    // SEEDS - National uses PA_BENIH_kg, JA_BENIH_kg, LE_BENIH_kg directly
    // ========================================================================
    const benihPadi = rawData.PA_BENIH_kg || rawData.pa_benih_kg || 0;
    const benihJagung = rawData.JA_BENIH_kg || rawData.ja_benih_kg || 0;
    const benihKedelai = rawData.LE_BENIH_kg || rawData.le_benih_kg || 0;
    const totalBenih = benihPadi + benihJagung + benihKedelai;

    const seeds: any = { total: totalBenih };
    if (benihPadi > 0) seeds.padi = benihPadi;
    if (benihJagung > 0) seeds.jagung = benihJagung;
    if (benihKedelai > 0) seeds.kedelai = benihKedelai;

    // ========================================================================
    // FERTILIZER - National uses PA_NPK_ton, PA_UREA_m_ton, etc. directly
    // ========================================================================
    const npkPadi = (rawData.PA_NPK_ton || rawData.pa_npk_ton || 0) * 1000; // ton to kg
    const ureaPadi = (rawData.PA_UREA_m_ton || rawData.pa_urea_m_ton || 0) * 1000;
    const npkJagung = (rawData.JA_NPK_ton || rawData.ja_npk_ton || 0) * 1000;
    const ureaJagung = (rawData.JA_UREA_m_ton || rawData.ja_urea_m_ton || 0) * 1000;
    const npkKedelai = (rawData.LE_NPK_ton || rawData.le_npk_ton || 0) * 1000;
    const ureaKedelai = (rawData.LE_UREA_m_ton || rawData.le_urea_m_ton || 0) * 1000;

    const ureaTotal = ureaPadi + ureaJagung + ureaKedelai;
    const npkTotal = npkPadi + npkJagung + npkKedelai;
    const totalPupuk = ureaTotal + npkTotal;

    const fertilizer: any = { total: totalPupuk };
    if (ureaTotal > 0) fertilizer.urea = ureaTotal;
    if (npkTotal > 0) fertilizer.npk = npkTotal;

    // ========================================================================
    // WATER - National uses MT1_WTOT, MT1_WRQ, MT1_IRR for MT1
    // and MT2_WTOT, MT2_WRQ, MT2_IRR for MT2
    // ========================================================================
    const mtPrefix = musim === '1' ? 'MT1' : 'MT2';
    const mt_WRQ = rawData[`${mtPrefix}_WRQ`] || rawData[`${mtPrefix.toLowerCase()}_wrq`] || 0;
    const mt_WTOT = rawData[`${mtPrefix}_WTOT`] || rawData[`${mtPrefix.toLowerCase()}_wtot`] || 0;
    const mt_IRR = rawData[`${mtPrefix}_IRR`] || rawData[`${mtPrefix.toLowerCase()}_irr`] || 0;
    const mt_WDQ = rawData[`${mtPrefix}_WDQ`] || rawData[`${mtPrefix.toLowerCase()}_wdq`] || 0;

    const waterRatio = mt_WDQ > 0 ? mt_WDQ : (mt_WRQ > 0 ? (mt_WTOT / mt_WRQ) * 100 : 100);
    let waterStatus: 'sufficient' | 'light-deficit' | 'severe-deficit' = 'sufficient';
    if (waterRatio < 80) {
      waterStatus = 'severe-deficit';
    } else if (waterRatio < 100) {
      waterStatus = 'light-deficit';
    }

    const water = {
      requirement: mt_WRQ,
      available: mt_WTOT,
      wdq: mt_WDQ,
      deficit: mt_IRR,
      ratio: waterRatio,
      status: waterStatus,
      requirementM3: mt_WRQ * 10 * lbs,
      availableM3: mt_WTOT * 10 * lbs,
      deficitM3: mt_IRR * 10 * lbs
    };

    // ========================================================================
    // OPT RISK - National level typically doesn't have OPT details
    // ========================================================================
    const active: string[] = [];
    const risks: any = {};

    // ========================================================================
    // PRODUCTION - National uses PADI_ton, JAGUNG_ton, KEDELAI_ton directly
    // ========================================================================
    const prodPadi = rawData.PADI_ton || rawData.padi_ton || 0;
    const prodJagung = rawData.JAGUNG_ton || rawData.jagung_ton || 0;
    const prodKedelai = rawData.KEDELAI_ton || rawData.kedelai_ton || 0;
    const potentialProduction = prodPadi + prodJagung + prodKedelai;

    const productionBreakdown: any = {};
    if (luasPadi > 0) {
      productionBreakdown.padi = {
        area: luasPadi,
        productivity: luasPadi > 0 ? prodPadi / luasPadi : 0,
        production: prodPadi
      };
    }
    if (luasJagung > 0) {
      productionBreakdown.jagung = {
        area: luasJagung,
        productivity: luasJagung > 0 ? prodJagung / luasJagung : 0,
        production: prodJagung
      };
    }
    if (luasKedelai > 0) {
      productionBreakdown.kedelai = {
        area: luasKedelai,
        productivity: luasKedelai > 0 ? prodKedelai / luasKedelai : 0,
        production: prodKedelai
      };
    }

    // ========================================================================
    // RETURN DATA
    // ========================================================================
    return {
      locationName: locationName,
      planting: {
        season: seasonName,
        year: parseInt(tahun, 10),
        startDekad: 0, // National doesn't have specific start dekad
        startDate: 'Agregasi Nasional'
      },
      crops: {
        recommended: recommended,
        pattern: patternText,
        totalArea: totalArea,
        breakdown: breakdown
      },
      inputs: {
        seeds: seeds,
        fertilizer: fertilizer,
        water: water
      },
      opt: {
        active: active,
        risks: risks,
        estimatedLoss: 0
      },
      production: {
        potential: potentialProduction,
        optLoss: 0,
        optLossPct: 0,
        waterLoss: 0,
        waterLossPct: 0,
        expected: potentialProduction,
        breakdown: productionBreakdown
      }
    };
  }

  // ============================================================================
  // TAB 3: SIFORTUNA OPTIMIZATION
  // ============================================================================

  /**
   * Fetch SiFortuna optimization data
   * Returns irrigation deficit, pump requirements, and variety recommendations
   */
  fetchSifortunaOptimization(
    locationID: string,
    tahun: string
  ): Observable<SifortunaDisplayData | null> {
    if (!locationID) {
      return of(null);
    }

    // Get location info and determine table/column names (same as KATAM)
    const locationInfo = this.getLocationInfo(locationID);

    // For lahan level, use desa table with desa ID (first 10 chars)
    const effectiveLevel = locationInfo.level === 'lahan' ? 'desa' : locationInfo.level;
    const tableName = this.getKatamTable(effectiveLevel as LocationLevel);

    // Determine ID column based on effective level
    let idColumn: string;
    if (effectiveLevel === 'nasional') {
      idColumn = 'ID_ADMIN';
    } else if (effectiveLevel === 'desa') {
      idColumn = 'ID_DESA';
    } else if (effectiveLevel === 'keca') {
      idColumn = 'ID_KECA';
    } else if (effectiveLevel === 'kabu') {
      idColumn = 'ID_KABU';
    } else if (effectiveLevel === 'prov') {
      idColumn = 'ID_PROV';
    } else {
      idColumn = `ID_${locationInfo.suffix}`;
    }

    // Use first 10 chars for lahan level (desa ID)
    const queryID = locationInfo.level === 'lahan' ? locationID.substring(0, 10) : locationInfo.id;

    // Untuk level desa/lahan, JOIN dengan t2_admin untuk mendapatkan nama lokasi
    // v2_katam_summary_keca, v2_katam_kabu, v2_katam_prov already have NAMA column
    let deficitQuery: string;
    if (effectiveLevel === 'desa' || locationInfo.level === 'lahan') {
      deficitQuery =
        `SELECT k.*, a.NAMA as NAMA_ADMIN FROM ${tableName} k ` +
        `LEFT JOIN t2_admin a ON k.${idColumn} = a.ID_ADMIN ` +
        `WHERE k.${idColumn} = '${queryID}' ` +
        `AND k.TAHUN = '${tahun}' ` +
        `AND k.SEA = '1' ` +
        `LIMIT 1`;
    } else {
      deficitQuery =
        `SELECT * FROM ${tableName} ` +
        `WHERE ${idColumn} = '${queryID}' ` +
        `AND TAHUN = '${tahun}' ` +
        `AND SEA = '1' ` +
        `LIMIT 1`;
    }

    // Query variety recommendations (placeholder table name - skip for now)
    const varietyQuery =
      `SELECT * FROM varietas_rekomendasi ` +
      `WHERE ${idColumn} = '${queryID}' ` +
      `LIMIT 5`;

    console.log('[SiFortuna] Query:', deficitQuery);

    // Execute both queries in parallel
    // NOTE: Using siaptanam endpoint because data is from same KATAM tables
    return forkJoin({
      deficit: this.sqlQueryService.executeSiaptanamQuery(deficitQuery).pipe(
        catchError(() => of({ status: 'error', data: [] } as QueryResponse))
      ),
      variety: this.sqlQueryService.executeSiaptanamQuery(varietyQuery).pipe(
        catchError((err) => {
          console.log('[SiFortuna] varietas_rekomendasi table not found or query failed:', err);
          return of({ status: 'error', data: [] } as QueryResponse);
        })
      )
    }).pipe(
      map((results) => {
        return this.processSifortunaData(results.deficit.data[0], results.variety.data);
      }),
      catchError((error) => {
        console.error('[RightPanel] SiFortuna fetch error:', error);
        return of(null);
      })
    );
  }

  /**
   * Transform raw SiFortuna data to display format
   */
  private processSifortunaData(deficitData: any, varietyData: any[]): SifortunaDisplayData | null {
    // If no deficit data, return null
    if (!deficitData) {
      return null;
    }

    console.log('[SiFortuna] Processing data:', deficitData);

    // Extract location name (from JOIN or direct column)
    const locationName = deficitData.NAMA || deficitData.NAMA_ADMIN || deficitData.nama || deficitData.nama_admin || undefined;

    // Extract deficit values per dekad (d01-d36)
    const deficits: any[] = [];
    let totalDeficit = 0;
    const criticalPeriods: string[] = [];
    const pumpCapacity = 50; // Default: 50 liter/second

    // Try to get total deficit from MT1_IRR or IRR column
    const mt1IRR = deficitData.MT1_IRR || deficitData.mt1_irr ||
                   deficitData.IRR || deficitData.irr || 0;

    // Check if we have detailed d01-d36 data
    let hasDetailedData = false;
    for (let dekad = 1; dekad <= 36; dekad++) {
      const key = `d${dekad.toString().padStart(2, '0')}`;
      const deficitValue = deficitData[key] || 0;

      if (deficitValue > 0) {
        hasDetailedData = true;
        const period = this.formatDekad(dekad);
        const waterNeed = deficitValue * 10; // mm to m³/ha (1mm = 10m³/ha)
        const pumpHours = (waterNeed * 1000) / (pumpCapacity * 3.6); // Convert to hours

        deficits.push({
          dekad: dekad,
          period: period,
          deficit: deficitValue,
          waterNeed: waterNeed,
          pumpHours: pumpHours
        });

        totalDeficit += deficitValue;

        // Mark critical if deficit > 100mm
        if (deficitValue > 100) {
          criticalPeriods.push(period);
        }
      }
    }

    // If no detailed d01-d36 data but we have MT1_IRR, use that as total
    if (!hasDetailedData && mt1IRR > 0) {
      totalDeficit = mt1IRR;
      console.log('[SiFortuna] Using MT1_IRR for total deficit:', totalDeficit);
    }

    // Fallback: calculate deficit from WRQ - WTOT if still no deficit data
    if (!hasDetailedData && totalDeficit === 0) {
      const wtot = deficitData.MT1_WTOT || deficitData.mt1_wtot || 0;
      const wrq = deficitData.MT1_WRQ || deficitData.mt1_wrq || 0;
      if (wrq > 0 && wtot < wrq) {
        totalDeficit = wrq - wtot;
        console.log('[SiFortuna] Calculated deficit from WRQ-WTOT:', totalDeficit);
      }
    }

    // If still no deficit data at all, but we have location data, return with zero deficit
    // This allows showing location info even when there's no deficit
    if (totalDeficit === 0 && deficits.length === 0 && !locationName) {
      console.log('[SiFortuna] No deficit data available');
      return null;
    }

    // Process variety recommendations
    const varieties = (varietyData || []).map((v: any) => ({
      name: v.VARIETAS || v.varietas || 'Unknown',
      crop: v.KOMODITAS || v.komoditas || 'Padi',
      maturity: v.UMUR || v.umur || 0,
      yield: v.HASIL || v.hasil || 0,
      resistance: v.KETAHANAN || v.ketahanan || 'N/A',
      reason: v.ALASAN || v.alasan || 'Sesuai kondisi lahan'
    }));

    // Calculate pump requirements
    // If we have detailed per-dekad data, use it. Otherwise, estimate from totalDeficit.
    let hoursPerDekad: number;
    let fuelEstimate: number;

    if (deficits.length > 0) {
      // Use detailed per-dekad data
      hoursPerDekad = deficits.reduce((sum, d) => sum + d.pumpHours, 0) / deficits.length;
    } else if (totalDeficit > 0) {
      // Estimate from totalDeficit (assume spread across growing season ~12 dekads for MT1)
      const estimatedDekads = 12;
      const avgDeficitPerDekad = totalDeficit / estimatedDekads;
      const avgWaterNeed = avgDeficitPerDekad * 10; // mm to m³/ha
      hoursPerDekad = (avgWaterNeed * 1000) / (pumpCapacity * 3.6);
    } else {
      hoursPerDekad = 0;
    }

    fuelEstimate = hoursPerDekad * 2.5; // Assume 2.5 liter/hour fuel consumption

    console.log('[SiFortuna] Returning data with totalDeficit:', totalDeficit, 'locationName:', locationName);

    return {
      locationName: locationName,
      irrigation: {
        deficits: deficits,
        totalDeficit: totalDeficit,
        criticalPeriods: criticalPeriods
      },
      varieties: {
        recommended: varieties
      },
      pumpRequirements: {
        capacity: pumpCapacity,
        hoursPerDekad: hoursPerDekad,
        fuelEstimate: fuelEstimate
      }
    };
  }

  // ============================================================================
  // TAB 4: SUMMARY AGGREGATION
  // ============================================================================

  /**
   * Fetch summary data for all administrative levels
   * Returns aggregated data for desa, kabupaten, provinsi, and nasional
   * @param locationID - Location ID
   * @param tahun - Optional year filter for KATAM data (defaults to latest)
   * @param musim - Optional season filter for KATAM data (defaults to latest)
   */
  fetchSummaryData(locationID: string, tahun?: string, musim?: string): Observable<{
    desa: SummaryData | null;
    kabu: SummaryData | null;
    prov: SummaryData | null;
    nasional: SummaryData | null;
    availability: {
      desa?: DataAvailabilityInfo;
      kabu?: DataAvailabilityInfo;
      prov?: DataAvailabilityInfo;
      nasional?: DataAvailabilityInfo;
    };
  }> {
    if (!locationID) {
      return of({
        desa: null,
        kabu: null,
        prov: null,
        nasional: null,
        availability: {}
      });
    }

    const idLength = locationID.length;

    // Handle special case for national-only query (ID='1')
    // Database uses ID_ADMIN = '1' for national level
    if (locationID === '1') {
      return forkJoin({
        nasional: this.fetchLevelSummary('1', 'nasional', tahun, musim)
      }).pipe(
        map(results => ({
          desa: null,
          kabu: null,
          prov: null,
          nasional: results.nasional.data,
          availability: {
            nasional: results.nasional.availability
          }
        })),
        catchError((error) => {
          console.error('[RightPanel] National summary fetch error:', error);
          return of({
            desa: null,
            kabu: null,
            prov: null,
            nasional: null,
            availability: {}
          });
        })
      );
    }

    // For other short IDs (prov, kabu, keca), fetch appropriate levels
    if (idLength < 10) {
      const nasionalID = '1'; // Database uses '1' for national
      const requests: any = {
        nasional: this.fetchLevelSummary(nasionalID, 'nasional', tahun, musim)
      };

      if (idLength >= 2) {
        const provID = locationID.substring(0, 2);
        requests.prov = this.fetchLevelSummary(provID, 'prov', tahun, musim);
      }

      if (idLength >= 4) {
        const kabuID = locationID.substring(0, 4);
        requests.kabu = this.fetchLevelSummary(kabuID, 'kabu', tahun, musim);
      }

      return forkJoin(requests).pipe(
        map((results: any) => ({
          desa: null,
          kabu: results.kabu?.data || null,
          prov: results.prov?.data || null,
          nasional: results.nasional.data,
          availability: {
            kabu: results.kabu?.availability,
            prov: results.prov?.availability,
            nasional: results.nasional.availability
          }
        })),
        catchError((error) => {
          console.error('[RightPanel] Summary fetch error:', error);
          return of({
            desa: null,
            kabu: null,
            prov: null,
            nasional: null,
            availability: {}
          });
        })
      );
    }

    // Extract IDs for different levels (desa level or lahan level)
    const desaID = locationID.substring(0, 10);
    const kabuID = locationID.substring(0, 4);
    const provID = locationID.substring(0, 2);
    const nasionalID = '1'; // Database uses '1' for national level

    // Fetch all 4 levels in parallel
    return forkJoin({
      desa: this.fetchLevelSummary(desaID, 'desa', tahun, musim),
      kabu: this.fetchLevelSummary(kabuID, 'kabu', tahun, musim),
      prov: this.fetchLevelSummary(provID, 'prov', tahun, musim),
      nasional: this.fetchLevelSummary(nasionalID, 'nasional', tahun, musim)
    }).pipe(
      map(results => ({
        desa: results.desa.data,
        kabu: results.kabu.data,
        prov: results.prov.data,
        nasional: results.nasional.data,
        availability: {
          desa: results.desa.availability,
          kabu: results.kabu.availability,
          prov: results.prov.availability,
          nasional: results.nasional.availability
        }
      })),
      catchError((error) => {
        console.error('[RightPanel] Summary fetch error:', error);
        return of({
          desa: null,
          kabu: null,
          prov: null,
          nasional: null,
          availability: {}
        });
      })
    );
  }

  /**
   * Fetch summary for a specific administrative level
   * @param locationID - Location ID
   * @param level - Administrative level
   * @param tahun - Optional year filter (if not provided, gets latest)
   * @param musim - Optional season filter (if not provided, gets latest)
   */
  private fetchLevelSummary(
    locationID: string,
    level: 'desa' | 'kabu' | 'prov' | 'nasional',
    tahun?: string,
    musim?: string
  ): Observable<{ data: SummaryData | null; availability: DataAvailabilityInfo }> {
    // Fetch SISCROP data
    const siscropTable = this.getSiscropTable(level as LocationLevel);
    const siscropIDColumn = level === 'nasional' ? 'id_admin' : 'id_bps';
    const siscropQuery =
      `SELECT * FROM ${siscropTable} ` +
      `WHERE ${siscropIDColumn} = '${locationID}' ` +
      `ORDER BY data_date DESC LIMIT 1`;

    // Fetch KATAM data
    // If tahun and musim provided, filter by them; otherwise get latest
    // Note: v2_katam_kabu and v2_katam_prov already have NAMA column directly
    // v2_katam_summary_keca has NAMA column
    // Only v2_katam_summary_desa needs JOIN to t2_admin for name lookup
    const katamTable = this.getKatamTable(level as LocationLevel);
    const useFilter = tahun && musim;

    // Determine ID column based on level
    let katamIDColumn: string;
    if (level === 'nasional') {
      katamIDColumn = 'ID_ADMIN';
    } else if (level === 'desa') {
      katamIDColumn = 'ID_DESA';
    } else if (level === 'kabu') {
      katamIDColumn = 'ID_KABU';
    } else if (level === 'prov') {
      katamIDColumn = 'ID_PROV';
    } else {
      katamIDColumn = 'ID_KECA';
    }

    let katamQuery: string;
    if (level === 'nasional') {
      // National level: v2_katam_nasional has NAMA column and uses ID_ADMIN = '1'
      // National level doesn't have DST, so filter doesn't affect plantingStartDate
      katamQuery =
        `SELECT * FROM ${katamTable} ` +
        `WHERE ${katamIDColumn} = '${locationID}' ` +
        (useFilter ? `AND TAHUN = '${tahun}' AND SEA = '${musim}'` : `ORDER BY TAHUN DESC, SEA DESC LIMIT 1`);
    } else if (level === 'kabu' || level === 'prov') {
      // These tables already have NAMA column
      katamQuery =
        `SELECT * FROM ${katamTable} ` +
        `WHERE ${katamIDColumn} = '${locationID}' ` +
        (useFilter ? `AND TAHUN = '${tahun}' AND SEA = '${musim}'` : `ORDER BY TAHUN DESC, SEA DESC LIMIT 1`);
    } else {
      // desa needs JOIN to t2_admin for name (v2_katam_summary_desa doesn't have NAMA)
      katamQuery =
        `SELECT k.*, a.NAMA as NAMA_ADMIN FROM ${katamTable} k ` +
        `LEFT JOIN t2_admin a ON k.${katamIDColumn} = a.ID_ADMIN ` +
        `WHERE k.${katamIDColumn} = '${locationID}' ` +
        (useFilter ? `AND k.TAHUN = '${tahun}' AND k.SEA = '${musim}'` : `ORDER BY k.TAHUN DESC, k.SEA DESC LIMIT 1`);
    }

    console.log(`[fetchLevelSummary] Level: ${level}, LocationID: ${locationID}`);
    console.log(`[fetchLevelSummary] SISCROP Query:`, siscropQuery);
    console.log(`[fetchLevelSummary] KATAM Query:`, katamQuery);

    // For other levels, fetch both SISCROP and KATAM
    return forkJoin({
      siscrop: this.sqlQueryService.executeScs1Query(siscropQuery).pipe(
        catchError((err) => {
          console.error(`[fetchLevelSummary] SISCROP error for ${level}:`, err);
          return of({ status: 'error', data: [] } as QueryResponse);
        })
      ),
      katam: this.sqlQueryService.executeSiaptanamQuery(katamQuery).pipe(
        catchError((err) => {
          console.error(`[fetchLevelSummary] KATAM error for ${level}:`, err);
          return of({ status: 'error', data: [] } as QueryResponse);
        })
      )
    }).pipe(
      map((results) => {
        const siscropData = results.siscrop.data[0];
        const katamData = results.katam.data[0];

        const hasSiscrop = !!siscropData;
        const hasKatam = !!katamData;

        if (!hasSiscrop && !hasKatam) {
          return {
            data: null,
            availability: {
              available: false,
              reason: 'no_data_year_season',
              message: `Data tidak tersedia untuk tingkat ${level}`,
              details: `Tidak ada data SISCROP maupun KATAM untuk lokasi ${locationID} (${level}).`
            }
          };
        }

        const summaryData = this.processSummaryData(locationID, level, siscropData, katamData);

        return {
          data: summaryData,
          availability: {
            available: true,
            message: 'Data tersedia',
            details: `${hasSiscrop ? 'SISCROP' : ''}${hasSiscrop && hasKatam ? ' dan ' : ''}${hasKatam ? 'KATAM' : ''} tersedia.`
          }
        };
      })
    );
  }

  /**
   * Process and combine SISCROP and KATAM data for summary
   */
  private processSummaryData(
    locationID: string,
    level: 'desa' | 'kabu' | 'prov' | 'nasional',
    siscropData: any,
    katamData: any
  ): SummaryData {
    // SISCROP processing
    let totalLBS = 0;
    let phaseDistribution: any = {};
    let totalHarvestForecast = 0;

    if (siscropData) {
      totalLBS = siscropData.lbs || 0;
      const total = siscropData.x0 + siscropData.x1 + siscropData.x2 +
                    siscropData.x3 + siscropData.x4 + siscropData.x5 +
                    siscropData.x6 + siscropData.x7;

      if (total > 0) {
        phaseDistribution = {
          bera: (siscropData.x0 / total) * totalLBS,
          tanam: (siscropData.x1 / total) * totalLBS,
          vegetatif: ((siscropData.x2 + siscropData.x3) / total) * totalLBS,
          generatif: (siscropData.x4 / total) * totalLBS,
          masak: (siscropData.x5 / total) * totalLBS,
          panen: (siscropData.x6 / total) * totalLBS,
          air: (siscropData.x7 / total) * totalLBS
        };
      }

      // Calculate harvest forecast using formula service
      const siscropTyped = siscropData as SiscropData;
      const harvest = this.siscropFormulaService.estimateHarvest(siscropTyped);
      totalHarvestForecast = harvest.pn1 + harvest.pn2 + harvest.pn3 + harvest.pn4;
    }

    // KATAM processing
    let totalArea = 0;
    let cropDistribution: any = {};
    let estimatedProduction = 0;
    let plantingStartDate: string | undefined;

    if (katamData) {
      // National level has different column structure (already aggregated)
      if (level === 'nasional') {
        // v2_katam_nasional uses: PADI_ha, JAGUNG_ha, KEDELAI_ha for area
        // and PADI_ton, JAGUNG_ton, KEDELAI_ton for production
        const luasPadi = katamData.PADI_ha || katamData.padi_ha || 0;
        const luasJagung = katamData.JAGUNG_ha || katamData.jagung_ha || 0;
        const luasKedelai = katamData.KEDELAI_ha || katamData.kedelai_ha || 0;

        totalArea = luasPadi + luasJagung + luasKedelai;

        if (luasPadi > 0) cropDistribution.padi = luasPadi;
        if (luasJagung > 0) cropDistribution.jagung = luasJagung;
        if (luasKedelai > 0) cropDistribution.kedelai = luasKedelai;

        // Production is directly available in national table
        const prodPadi = katamData.PADI_ton || katamData.padi_ton || 0;
        const prodJagung = katamData.JAGUNG_ton || katamData.jagung_ton || 0;
        const prodKedelai = katamData.KEDELAI_ton || katamData.kedelai_ton || 0;
        estimatedProduction = prodPadi + prodJagung + prodKedelai;

        // National level doesn't have DST (planting start dekad)
        plantingStartDate = undefined;
      } else {
        // Other levels use LUAS_PADI, LUAS_JAGUNG, LUAS_KEDELAI
        const luasPadi = katamData.LUAS_PADI || katamData.luas_padi || 0;
        const luasJagung = katamData.LUAS_JAGUNG || katamData.luas_jagung || 0;
        const luasKedelai = katamData.LUAS_KEDELAI || katamData.luas_kedelai || 0;

        totalArea = luasPadi + luasJagung + luasKedelai;

        if (luasPadi > 0) cropDistribution.padi = luasPadi;
        if (luasJagung > 0) cropDistribution.jagung = luasJagung;
        if (luasKedelai > 0) cropDistribution.kedelai = luasKedelai;

        estimatedProduction = katamData.PRODUKSI_ESTIMASI || katamData.produksi_estimasi || 0;

        // Extract planting start date from DST field
        const startDekad = katamData.DST || katamData.dst;
        if (startDekad) {
          plantingStartDate = this.formatDekad(startDekad);
        }
      }
    }

    // Combined metrics
    const productivityAvg = totalHarvestForecast > 0 && estimatedProduction > 0
      ? estimatedProduction / totalHarvestForecast
      : 0;

    // Get name from katamData
    // For kabu/prov: NAMA column exists directly in v2_katam_kabu/v2_katam_prov
    // For desa/keca: NAMA_ADMIN comes from JOIN with t2_admin
    const adminName = katamData?.NAMA || katamData?.nama ||
                      katamData?.NAMA_ADMIN || katamData?.nama_admin;
    const displayName = adminName || this.getLevelName(locationID, level);

    return {
      level: level,
      name: displayName,
      id: locationID,
      siscrop: {
        totalLBS: totalLBS,
        phaseDistribution: phaseDistribution,
        totalHarvestForecast: totalHarvestForecast
      },
      katam: {
        totalArea: totalArea,
        cropDistribution: cropDistribution,
        estimatedProduction: estimatedProduction,
        plantingStartDate: plantingStartDate
      },
      combined: {
        productivityAvg: productivityAvg,
        irrigatedPercent: 0, // TODO: Calculate if data available
        rainfedPercent: 0    // TODO: Calculate if data available
      }
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get location information from ID
   */
  private getLocationInfo(locationID: string): LocationInfo {
    const length = locationID.length;
    let level: LocationLevel;
    let suffix: string;

    // Special case for national ID
    // Database uses ID_ADMIN = '1' for national level
    if (locationID === '1') {
      return {
        id: locationID,
        length: 1,
        level: 'nasional',
        suffix: 'NASIONAL'
      };
    }

    switch (length) {
      case 2:
        level = 'prov';
        suffix = 'PROV';
        break;
      case 4:
        level = 'kabu';
        suffix = 'KABU';
        break;
      case 6:
        level = 'keca';
        suffix = 'KECA';
        break;
      case 10:
        level = 'desa';
        suffix = 'DESA';
        break;
      default:
        level = 'lahan';
        suffix = 'LAHAN';
        break;
    }

    return { id: locationID, length, level, suffix };
  }

  /**
   * Get SISCROP table name based on location level
   */
  private getSiscropTable(level: LocationLevel): string {
    switch (level) {
      case 'prov':
        return 'q_sc_propinsi';
      case 'kabu':
        return 'q_sc_kabupaten';
      case 'keca':
        return 'q_sc_kecamatan';
      case 'desa':
      case 'lahan':
        return 'q_sc_desa';
      case 'nasional':
        return 'q_sc_nasional';
      default:
        return 'q_sc_desa';
    }
  }

  /**
   * Get KATAM table name based on location level
   * Note: For kabu and prov, use v2_katam_* (not v2_katam_summary_*) as those tables
   * have the NAMA column directly and v2_katam_summary_kabu/prov don't exist
   *
   * Table mapping:
   * - Lahan (13 digit): v2_katam_summary (ID_LAHAN)
   * - Desa (10 digit): v2_katam_summary_desa (ID_DESA)
   * - Kecamatan (6 digit): v2_katam_summary_keca (ID_KECA)
   * - Kabupaten (4 digit): v2_katam_kabu (ID_KABU)
   * - Provinsi (2 digit): v2_katam_prov (ID_PROV)
   * - Nasional (1): v2_katam_nasional (ID_ADMIN)
   */
  private getKatamTable(level: LocationLevel): string {
    switch (level) {
      case 'prov':
        return 'v2_katam_prov';
      case 'kabu':
        return 'v2_katam_kabu';
      case 'keca':
        return 'v2_katam_summary_keca';
      case 'desa':
        return 'v2_katam_summary_desa';
      case 'lahan':
        return 'v2_katam_summary';
      case 'nasional':
        return 'v2_katam_nasional';
      default:
        return 'v2_katam_summary';
    }
  }

  /**
   * Get hierarchy order for location levels
   * Lower number = lower in hierarchy
   */
  private getLevelOrder(level: LocationLevel): number {
    const order: Record<LocationLevel, number> = {
      lahan: 0,
      desa: 1,
      keca: 2,
      kabu: 3,
      prov: 4,
      nasional: 5
    };
    return order[level] || 0;
  }

  /**
   * Check if a level should be shown based on selected location
   * @param selectedLevel - The level of the selected location
   * @param checkLevel - The level to check if it should be shown
   * @returns true if checkLevel should be shown (is >= selectedLevel in hierarchy)
   */
  shouldShowLevel(selectedLevel: LocationLevel, checkLevel: LocationLevel): boolean {
    return this.getLevelOrder(checkLevel) >= this.getLevelOrder(selectedLevel);
  }

  /**
   * Parse SISCROP data_date format (YYMMDD)
   */
  private parseDataDate(data_date: string): { year: number; month: number; day: number } {
    const yy = parseInt(data_date.substring(0, 2), 10);
    const mm = parseInt(data_date.substring(2, 4), 10);
    const dd = parseInt(data_date.substring(4, 6), 10);

    return {
      year: 2000 + yy,
      month: mm,
      day: dd
    };
  }

  /**
   * Format date in Indonesian format
   */
  private formatIndonesianDate(date: Date): string {
    const day = date.getDate();
    const month = this.INDONESIAN_MONTHS[date.getMonth()];
    const year = date.getFullYear();

    return `${day} ${month} ${year}`;
  }

  /**
   * Format dekad (1-36) to Indonesian period
   * Example: 1 -> "Awal Januari", 2 -> "Tengah Januari", 3 -> "Akhir Januari"
   */
  private formatDekad(dst: number): string {
    const monthIndex = Math.floor((dst - 1) / 3);
    const dekadInMonth = ((dst - 1) % 3) + 1;

    const period = dekadInMonth === 1 ? 'Awal' :
                   dekadInMonth === 2 ? 'Tengah' : 'Akhir';

    const month = this.INDONESIAN_MONTHS[monthIndex];

    return `${period} ${month}`;
  }

  /**
   * Get level name (placeholder - would need lookup table)
   */
  private getLevelName(locationID: string, level: string): string {
    // TODO: Implement name lookup from database
    // For now, return generic names
    switch (level) {
      case 'desa':
        return `Desa ${locationID}`;
      case 'kabu':
        return `Kabupaten ${locationID}`;
      case 'prov':
        return `Provinsi ${locationID}`;
      case 'nasional':
        return 'Indonesia';
      default:
        return locationID;
    }
  }

  // ============================================================================
  // TAB 3: IRRIGATION DATA (Per-Dasarian from t2_katam_*)
  // ============================================================================

  /**
   * Fetch irrigation data per-dasarian for Tab 3 (Optimasi)
   * Uses t2_katam_keca, t2_katam_desa, or t2_katam (lahan) tables
   * Falls back to v2_katam_* for kabu/prov levels (total per MT only)
   */
  fetchTab3IrrigationData(
    locationID: string,
    tahun: string,
    musim: string
  ): Observable<Tab3IrrigationData | null> {
    if (!locationID) {
      return of(null);
    }

    const locationInfo = this.getLocationInfo(locationID);

    // Determine table and column based on level
    let tableName = '';
    let idColumn = '';
    let queryID = locationID;
    let hasPerDasarianData = true;

    switch (locationInfo.level) {
      case 'lahan':
        tableName = 't2_katam';
        idColumn = 'ID_LAHAN';
        break;
      case 'desa':
        tableName = 't2_katam_desa';
        idColumn = 'ID_DESA';
        break;
      case 'keca':
        tableName = 't2_katam_keca';
        idColumn = 'ID_KECA';
        break;
      case 'kabu':
      case 'prov':
      case 'nasional':
        // These levels don't have per-dasarian data, fallback to v2_katam_*
        hasPerDasarianData = false;
        break;
      default:
        return of(null);
    }

    // For kabu/prov/nasional: fallback to MT-level data from v2_katam_*
    if (!hasPerDasarianData) {
      return this.fetchTab3FallbackData(locationID, tahun, musim, locationInfo.level);
    }

    // Query per-dasarian data (MT1 only - first planting season)
    const query =
      `SELECT DSR, DST, WTOT, WRQ, IRR, WDQ, MT, CROP ` +
      `FROM ${tableName} ` +
      `WHERE ${idColumn} = '${queryID}' ` +
      `AND TAHUN = '${tahun}' ` +
      `AND SEA = '${musim}' ` +
      `AND MT = 1 ` +
      `ORDER BY DSR`;

    console.log('[Tab3] Query:', query);

    return this.sqlQueryService.executeSiaptanamQuery(query).pipe(
      map((response: QueryResponse) => {
        if (response.status === 'success' && response.data && response.data.length > 0) {
          return this.processTab3Data(response.data);
        }
        console.warn('[Tab3] No data found for location:', locationID);
        return null;
      }),
      catchError((error) => {
        console.error('[Tab3] Fetch error:', error);
        return of(null);
      })
    );
  }

  /**
   * Fallback for kabu/prov/nasional levels - uses MT-level data
   */
  private fetchTab3FallbackData(
    locationID: string,
    tahun: string,
    musim: string,
    level: LocationLevel
  ): Observable<Tab3IrrigationData | null> {
    const tableName = this.getKatamTable(level);
    let idColumn: string;

    switch (level) {
      case 'kabu':
        idColumn = 'ID_KABU';
        break;
      case 'prov':
        idColumn = 'ID_PROV';
        break;
      case 'nasional':
        idColumn = 'ID_ADMIN';
        break;
      default:
        return of(null);
    }

    const query =
      `SELECT MT1_WRQ, MT1_WTOT, MT1_IRR, MT2_WRQ, MT2_WTOT, MT2_IRR, MT3_WRQ, MT3_WTOT, MT3_IRR ` +
      `FROM ${tableName} ` +
      `WHERE ${idColumn} = '${locationID}' ` +
      `AND TAHUN = '${tahun}' ` +
      `AND SEA = '${musim}'`;

    console.log('[Tab3 Fallback] Query:', query);

    return this.sqlQueryService.executeSiaptanamQuery(query).pipe(
      map((response: QueryResponse) => {
        if (response.status === 'success' && response.data && response.data.length > 0) {
          return this.processTab3FallbackData(response.data[0]);
        }
        return null;
      }),
      catchError((error) => {
        console.error('[Tab3 Fallback] Fetch error:', error);
        return of(null);
      })
    );
  }

  /**
   * Process per-dasarian data from t2_katam_* tables
   */
  private processTab3Data(rawData: any[]): Tab3IrrigationData {
    // Sort by DSR to ensure correct order
    const allDasarians = rawData.sort((a, b) => a.DSR - b.DSR);

    // Filter only rows with deficit (IRR > 0) for table
    const deficitDasarians = rawData.filter(row => row.IRR > 0);

    return {
      chartData: {
        // All 12 dasarians for chart
        labels: allDasarians.map(d => this.getDasarianLabel(d.DST, d.DSR)),
        wrq: allDasarians.map(d => d.WRQ || 0),
        wtot: allDasarians.map(d => d.WTOT || 0),
        irr: allDasarians.map(d => d.IRR || 0)
      },
      // Only deficit rows for table
      tableData: deficitDasarians.map(d => ({
        jadwal: this.getDasarianLabel(d.DST, d.DSR),
        deficit: d.IRR,
        debit: this.calculateIrrigationDebit(d.IRR),
        durasi: 10,
        pompa: this.calculatePumpUnits(d.IRR)
      })),
      summary: {
        totalDeficit: deficitDasarians.reduce((sum, d) => sum + (d.IRR || 0), 0),
        deficitCount: deficitDasarians.length
      }
    };
  }

  /**
   * Process MT-level fallback data (for kabu/prov/nasional)
   * Creates 3 entries (MT1, MT2, MT3) instead of 12 dasarians
   */
  private processTab3FallbackData(rawData: any): Tab3IrrigationData {
    const mtData = [
      { label: 'MT1', wrq: rawData.MT1_WRQ || 0, wtot: rawData.MT1_WTOT || 0, irr: rawData.MT1_IRR || 0 },
      { label: 'MT2', wrq: rawData.MT2_WRQ || 0, wtot: rawData.MT2_WTOT || 0, irr: rawData.MT2_IRR || 0 },
      { label: 'MT3', wrq: rawData.MT3_WRQ || 0, wtot: rawData.MT3_WTOT || 0, irr: rawData.MT3_IRR || 0 }
    ];

    const deficitMT = mtData.filter(mt => mt.irr > 0);

    return {
      chartData: {
        labels: mtData.map(mt => mt.label),
        wrq: mtData.map(mt => mt.wrq),
        wtot: mtData.map(mt => mt.wtot),
        irr: mtData.map(mt => mt.irr)
      },
      tableData: deficitMT.map(mt => ({
        jadwal: mt.label,
        deficit: mt.irr,
        debit: this.calculateIrrigationDebit(mt.irr),
        durasi: 10,
        pompa: this.calculatePumpUnits(mt.irr)
      })),
      summary: {
        totalDeficit: deficitMT.reduce((sum, mt) => sum + mt.irr, 0),
        deficitCount: deficitMT.length
      }
    };
  }

  /**
   * Convert DST (Dasarian Start Tanam) + DSR (Dasarian Relative) to label
   * DST = 28 (Akhir September), DSR = 1 → Dasarian 29 = Awal Oktober
   */
  private getDasarianLabel(dst: number, dsr: number): string {
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
                    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const PERIODS = ['Awal', 'Tengah', 'Akhir'];

    // Calculate actual dasarian (1-36)
    // Formula: ((DST - 1) + (DSR - 1)) mod 36 + 1
    const actualDasarian = ((dst - 1 + dsr - 1) % 36) + 1;

    // Convert to month and period
    const monthIndex = Math.floor((actualDasarian - 1) / 3);
    const periodIndex = (actualDasarian - 1) % 3;

    return `${PERIODS[periodIndex]} ${MONTHS[monthIndex]}`;
  }

  /**
   * Calculate irrigation debit from deficit
   * Formula: Debit (lpd/ha) = (deficit_mm * 10) / (duration_hours * 3.6)
   */
  private calculateIrrigationDebit(irr: number): number {
    const DURATION_HOURS = 10;
    return (irr * 10) / (DURATION_HOURS * 3.6);
  }

  /**
   * Calculate pump units needed
   * Assuming pump capacity of 1.5 liter/second
   */
  private calculatePumpUnits(irr: number): number {
    const PUMP_CAPACITY = 1.5; // liter/second
    const debit = this.calculateIrrigationDebit(irr);
    return Math.max(1, Math.ceil(debit / PUMP_CAPACITY));
  }
}
