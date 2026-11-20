import { ConfidenceLevel, ToolEnvelope } from '../../contracts/src/toolEnvelope.ts';
import { PARAMETER_PRIORS, PRIORS_VERSION } from './priors.ts';

export interface IndoorHourlyParams {
  /** Outdoor PM2.5 per hour (ug/m3) */
  outdoor_pm25_hourly: number[];
  /** Room air volume V (m3), e.g., 35 m3 bedroom or 75 m3 1BHK */
  room_volume_m3: number;
  /** Penetration factor P (0..1) */
  penetration_p: number;
  /** Air exchange rate lambda (1/h) per hour or scalar */
  lambda_ach: number | number[];
  /** Surface deposition rate k (1/h) */
  deposition_k: number;
  /** Indoor emission S (ug/h) per hour or scalar */
  source_ug_per_hr: number | number[];
  /** Effective CADR (rated_cadr * derating) in m3/h per hour or scalar */
  cadr_eff_m3_hr: number | number[];
  /** Initial indoor PM2.5 (ug/m3) */
  initial_indoor_pm25?: number;
  /** Optional two-zone adjacent room coupling (m3/h exchange with cleaner/dirtier room) */
  two_zone?: {
    enabled: boolean;
    adjacent_pm25_hourly: number[];
    interzone_flow_m3_hr: number;
  };
}

export interface IndoorSimulationValue extends Record<string, unknown> {
  hourly_indoor_pm25: number[];
  mean_pm25: number;
  overnight_mean_pm25: number;
  peak_pm25: number;
  steady_state_no_source_pm25: number;
  priors_version: string;
}

/**
 * Pure deterministic solver for single-zone (and optional two-zone coupled) PM2.5 mass balance:
 *   dC_in/dt = P * lambda * C_out + S/V - (lambda + k + CADR_eff/V) * C_in
 * Integrated analytically over each 1-hour step (dt = 1 h) for unconditional stability and non-negativity.
 */
export function solveIndoorMassBalance(params: IndoorHourlyParams): {
  hourly: number[];
  mean: number;
  overnightMean: number;
  peak: number;
  steadyStateNoSource: number;
} {
  const V = Math.max(5, params.room_volume_m3);
  const P = Math.min(1, Math.max(0, params.penetration_p));
  const k = Math.max(0, params.deposition_k);
  const hours = params.outdoor_pm25_hourly.length;

  if (hours === 0) {
    return { hourly: [], mean: 0, overnightMean: 0, peak: 0, steadyStateNoSource: 0 };
  }

  const getAt = (arrOrScalar: number | number[], idx: number): number =>
    Array.isArray(arrOrScalar) ? (arrOrScalar[idx] ?? arrOrScalar[arrOrScalar.length - 1] ?? 0) : arrOrScalar;

  const firstLambda = Math.max(0.05, getAt(params.lambda_ach, 0));
  const firstCadr = Math.max(0, getAt(params.cadr_eff_m3_hr, 0));
  const firstOut = Math.max(0, params.outdoor_pm25_hourly[0]);

  let cIn =
    params.initial_indoor_pm25 !== undefined
      ? Math.max(0, params.initial_indoor_pm25)
      : (P * firstLambda * firstOut) / (firstLambda + k + firstCadr / V);

  const hourly: number[] = [];

  for (let t = 0; t < hours; t++) {
    const cOut = Math.max(0, params.outdoor_pm25_hourly[t]);
    const lam = Math.max(0.05, getAt(params.lambda_ach, t));
    const s = Math.max(0, getAt(params.source_ug_per_hr, t));
    const cadr = Math.max(0, getAt(params.cadr_eff_m3_hr, t));

    let inflowRate = P * lam * cOut + s / V;
    let totalLossRate = lam + k + cadr / V;

    if (params.two_zone?.enabled) {
      const q12 = Math.max(0, params.two_zone.interzone_flow_m3_hr);
      const cAdj = Math.max(0, params.two_zone.adjacent_pm25_hourly[t] ?? cOut * 0.7);
      inflowRate += (q12 / V) * cAdj;
      totalLossRate += q12 / V;
    }

    const cEq = totalLossRate > 0 ? inflowRate / totalLossRate : cIn;
    // Exact analytical integration over dt = 1 hour:
    const cNext = Math.max(0, cEq + (cIn - cEq) * Math.exp(-totalLossRate * 1));
    cIn = cNext;
    hourly.push(Math.round(cNext * 100) / 100);
  }

  const mean = hourly.reduce((a, b) => a + b, 0) / hourly.length;
  // Overnight clock slice (22:00 to 06:00) when 24h curve provided, otherwise first 8 hours
  const overnightSlice =
    hourly.length === 24
      ? [hourly[22], hourly[23], ...hourly.slice(0, 7)]
      : hourly.length >= 8
        ? hourly.slice(0, 8)
        : hourly;
  const overnightMean = overnightSlice.reduce((a, b) => a + b, 0) / overnightSlice.length;
  const peak = Math.max(...hourly);

  const steadyStateNoSource =
    (P * firstLambda * firstOut) / (firstLambda + k + firstCadr / V);

  return {
    hourly,
    mean: Math.round(mean * 10) / 10,
    overnightMean: Math.round(overnightMean * 10) / 10,
    peak: Math.round(peak * 10) / 10,
    steadyStateNoSource: Math.round(steadyStateNoSource * 10) / 10,
  };
}

export function runIndoorModelTool(
  params: IndoorHourlyParams,
  callId = 'ind_1',
  asOf = new Date().toISOString()
): ToolEnvelope<IndoorSimulationValue> {
  const sim = solveIndoorMassBalance(params);
  const lowBound = Math.round(sim.mean * 0.82 * 10) / 10;
  const highBound = Math.round(sim.mean * 1.18 * 10) / 10;
  const confidence: ConfidenceLevel = 'medium';

  return {
    call_id: callId,
    ok: true,
    value: {
      hourly_indoor_pm25: sim.hourly,
      mean_pm25: sim.mean,
      overnight_mean_pm25: sim.overnightMean,
      peak_pm25: sim.peak,
      steady_state_no_source_pm25: sim.steadyStateNoSource,
      priors_version: PRIORS_VERSION,
    },
    unit: 'ug/m3',
    range: [lowBound, highBound],
    confidence,
    source: `NIRVAAT Indoor Mass-Balance Engine v${PRIORS_VERSION} (${PARAMETER_PRIORS.deposition_k.source})`,
    as_of: asOf,
    notes: 'Single-zone PM2.5 mass-balance simulation; assumes well-mixed room air.',
  };
}
