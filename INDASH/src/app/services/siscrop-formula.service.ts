import { Injectable } from '@angular/core';

/**
 * SISCROP Formula Service
 * Implements formulas from referensi.md for rice phenology analysis
 */

export interface PhaseData {
  x0: number;  // Non LBS (not used in calculations)
  x1: number;  // Air (water/flooded)
  x2: number;  // Vegetatif 1
  x3: number;  // Vegetatif 2
  x4: number;  // Generatif 1
  x5: number;  // Generatif 2
  x6: number;  // Bera (fallow)
  x7: number;  // Reserved (not used)
}

export interface HarvestEstimate {
  pn1: number;  // Month 1 harvest area
  pn2: number;  // Month 2 harvest area
  pn3: number;  // Month 3 harvest area
  pn4: number;  // Month 4 harvest area
}

export interface SiscropData extends PhaseData {
  lbs: number;           // Luas Baku Sawah (ha)
  data_date: string;     // Format: YYMMDD (e.g., "251115" for 2025-11-15)
  provitas_bps?: number; // Productivity from BPS (ton/ha)
  provitas_sc?: number;  // Productivity from SISCROP (ton/ha)
}

@Injectable({
  providedIn: 'root'
})
export class SiscropFormulaService {

  constructor() { }

  /**
   * Convert phase raster counts (x1-x6) to actual area in hectares
   * Formula: area_per_phase = (phase_count / total_count) × LBS
   * Note: x0 (non LBS) and x7 (reserved) are not used in calculations
   */
  calculatePhaseAreas(data: SiscropData): { [key: string]: number } {
    // Convert to numbers (API returns strings)
    const x1 = Number(data.x1) || 0;
    const x2 = Number(data.x2) || 0;
    const x3 = Number(data.x3) || 0;
    const x4 = Number(data.x4) || 0;
    const x5 = Number(data.x5) || 0;
    const x6 = Number(data.x6) || 0;
    const lbs = Number(data.lbs) || 0;

    // Only use x1 to x6 (x0 and x7 are not used)
    const total = x1 + x2 + x3 + x4 + x5 + x6;

    if (total === 0) {
      return {
        air: 0,
        vegetatif1: 0,
        vegetatif2: 0,
        generatif1: 0,
        generatif2: 0,
        bera: 0
      };
    }

    return {
      air: (x1 / total) * lbs,
      vegetatif1: (x2 / total) * lbs,
      vegetatif2: (x3 / total) * lbs,
      generatif1: (x4 / total) * lbs,
      generatif2: (x5 / total) * lbs,
      bera: (x6 / total) * lbs
    };
  }

  /**
   * Estimate harvest area for next 4 months based on phenology stages
   * Uses different formulas for 15th and 30th of month
   *
   * Formula explanation:
   * - Each growth stage has a duration (vegetatif1: 20d, vegetatif2: 20d, generatif: 30d, masak: 40d)
   * - Proportions indicate how much of each stage will reach harvest within timeframe
   * - pn1-pn4 represent cumulative harvest area for months 1-4
   */
  estimateHarvest(data: SiscropData): HarvestEstimate {
    // Convert to numbers (API returns strings)
    const x1 = Number(data.x1) || 0;
    const x2 = Number(data.x2) || 0;
    const x3 = Number(data.x3) || 0;
    const x4 = Number(data.x4) || 0;
    const x5 = Number(data.x5) || 0;
    const x6 = Number(data.x6) || 0;
    const lbs = Number(data.lbs) || 0;

    const day = data.data_date.substring(4, 6); // Extract day from YYMMDD

    // Convert raster counts to proportional areas
    const total = x1 + x2 + x3 + x4 + x5 + x6;
    if (total === 0) {
      return { pn1: 0, pn2: 0, pn3: 0, pn4: 0 };
    }

    let pn1: number, pn2: number, pn3: number, pn4: number;

    if (day === '15') {
      // Formula untuk tanggal 15 (mid-month)
      pn1 = 0.2 * x6 + (20 / 40) * x5;
      pn2 = (20 / 40) * x5 + (10 / 30) * x4;
      pn3 = (20 / 30) * x4 + (10 / 20) * x3;
      pn4 = (10 / 20) * x3 + (20 / 20) * x2;
      // pn5 = 0.2 * x1; // Not used per referensi.md
    } else {
      // Formula untuk tanggal 30 (end of month)
      pn1 = 0.25 * x6 + (15 / 40) * x5;
      pn2 = (25 / 40) * x5 + (5 / 30) * x4;
      pn3 = (25 / 30) * x4 + (5 / 20) * x3;
      pn4 = (15 / 20) * x3 + (15 / 20) * x2;
      // pn5 = (5 / 20) * x2 + 0.2 * x1; // Not used per referensi.md
    }

    // Convert proportions to actual area (hectares)
    // Each value is proportion of rasters, multiply by (LBS/total) to get area
    const areaFactor = lbs / total;

    return {
      pn1: pn1 * areaFactor,
      pn2: pn2 * areaFactor,
      pn3: pn3 * areaFactor,
      pn4: pn4 * areaFactor
    };
  }

  /**
   * Calculate rice production (Gabah Kering Giling - GKG)
   * Formula: production = harvest_area × productivity × rendemen_GKG
   *
   * @param luasPanen - Harvest area in hectares
   * @param provitas - Productivity in ton/ha (use BPS data as fallback)
   * @param rendemen - GKG rendemen factor (default: 0.625 = 62.5%)
   */
  calculateProduction(luasPanen: number, provitas: number, rendemen: number = 0.625): number {
    return luasPanen * provitas * rendemen;
  }

  /**
   * Calculate total production for all 4 months forecast
   */
  calculateTotalProduction(harvest: HarvestEstimate, provitas: number, rendemen: number = 0.625): {
    month1: number;
    month2: number;
    month3: number;
    month4: number;
    total: number;
  } {
    const m1 = this.calculateProduction(harvest.pn1, provitas, rendemen);
    const m2 = this.calculateProduction(harvest.pn2, provitas, rendemen);
    const m3 = this.calculateProduction(harvest.pn3, provitas, rendemen);
    const m4 = this.calculateProduction(harvest.pn4, provitas, rendemen);

    return {
      month1: m1,
      month2: m2,
      month3: m3,
      month4: m4,
      total: m1 + m2 + m3 + m4
    };
  }

  /**
   * Get productivity value with fallback logic
   * Priority: provitas_sc > provitas_bps > default
   */
  getProvitas(data: SiscropData, defaultProvitas: number = 5.0): number {
    // Convert to numbers (API returns strings)
    const provitasSc = Number(data.provitas_sc) || 0;
    const provitasBps = Number(data.provitas_bps) || 0;

    if (provitasSc > 0) {
      return provitasSc;
    }
    if (provitasBps > 0) {
      return provitasBps;
    }
    return defaultProvitas;
  }

  /**
   * Extract date components from SISCROP data_date format (YYMMDD)
   */
  parseDataDate(data_date: string): { year: number; month: number; day: number } {
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
   * Complete analysis pipeline: from raw SISCROP data to production forecast
   */
  analyzeSiscropData(data: SiscropData): {
    phaseAreas: { [key: string]: number };
    harvest: HarvestEstimate;
    production: { month1: number; month2: number; month3: number; month4: number; total: number };
    provitas: number;
    dataDate: { year: number; month: number; day: number };
  } {
    const phaseAreas = this.calculatePhaseAreas(data);
    const harvest = this.estimateHarvest(data);
    const provitas = this.getProvitas(data);
    const production = this.calculateTotalProduction(harvest, provitas);
    const dataDate = this.parseDataDate(data.data_date);

    return {
      phaseAreas,
      harvest,
      production,
      provitas,
      dataDate
    };
  }
}
