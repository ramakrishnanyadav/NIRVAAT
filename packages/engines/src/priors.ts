import { AgeBand } from '../../contracts/src/profile.ts';

export const PRIORS_VERSION = '1.0.0';

export interface PriorSpec {
  id: string;
  parameter: string;
  unit: string;
  median: number;
  q10: number;
  q90: number;
  status: 'cited' | 'assumed';
  source: string;
  notes: string;
}

export const PARAMETER_PRIORS: Record<string, PriorSpec> = {
  penetration_leaky: {
    id: 'P_leaky',
    parameter: 'PM2.5 penetration factor P (unsealed/drafty winter frames)',
    unit: 'dimensionless',
    median: 0.82,
    q10: 0.70,
    q90: 0.94,
    status: 'cited',
    source: 'Stephens & Siegel (2012); Chen & Zhao (2011) Atmos. Environ.',
    notes: 'Typical residential window cracks for fine PM2.5.',
  },
  penetration_sealed: {
    id: 'P_sealed',
    parameter: 'PM2.5 penetration factor P (closed + weatherstripped)',
    unit: 'dimensionless',
    median: 0.65,
    q10: 0.50,
    q90: 0.80,
    status: 'cited',
    source: 'Stephens & Siegel (2012) Indoor Air',
    notes: 'Weatherstripping/damp-towel sealing slows transport and increases crack impaction.',
  },
  ach_drafty_closed: {
    id: 'lambda_drafty',
    parameter: 'Air-exchange rate λ (closed but loose/drafty Indian flat)',
    unit: '1/h',
    median: 1.35,
    q10: 0.85,
    q90: 2.10,
    status: 'assumed',
    source: 'Assumed wide prior adapted from Nazaroff (2004) & urban South Asian flat surveys',
    notes: 'Marked assumed due to sparse blower-door measurements in Indian apartments.',
  },
  ach_sealed: {
    id: 'lambda_sealed',
    parameter: 'Air-exchange rate λ (gaps sealed + closed windows)',
    unit: '1/h',
    median: 0.55,
    q10: 0.35,
    q90: 0.85,
    status: 'cited',
    source: 'Riley et al. (2002) Environ. Sci. Technol.; Murray & Burmaster (1995)',
    notes: 'Taped/towel-sealed door gaps and closed casements.',
  },
  ach_open_window: {
    id: 'lambda_open',
    parameter: 'Air-exchange rate λ (windows open / cross-ventilation)',
    unit: '1/h',
    median: 4.5,
    q10: 2.8,
    q90: 7.0,
    status: 'cited',
    source: 'ASHRAE Fundamentals Ch. 16 Natural Ventilation',
    notes: 'Single-sided or mild cross-breeze natural ventilation.',
  },
  deposition_k: {
    id: 'k_dep',
    parameter: 'Indoor PM2.5 surface deposition loss rate k',
    unit: '1/h',
    median: 0.39,
    q10: 0.22,
    q90: 0.60,
    status: 'cited',
    source: 'Riley et al. (2002); Thatcher et al. (2002) Atmos. Environ.',
    notes: 'Submicron accumulation-mode indoor deposition.',
  },
  cadr_derating_hepa: {
    id: 'derate_hepa',
    parameter: 'Commercial HEPA placement/noise-speed CADR derating',
    unit: 'dimensionless',
    median: 0.72,
    q10: 0.55,
    q90: 0.88,
    status: 'assumed',
    source: 'Assumed prior reflecting users running medium fan speed overnight for noise',
    notes: 'Rated CADR is measured at max turbo speed.',
  },
  cadr_derating_diy: {
    id: 'derate_diy',
    parameter: 'DIY Corsi-Rosenthal MERV-13 box fan CADR derating',
    unit: 'dimensionless',
    median: 0.65,
    q10: 0.45,
    q90: 0.82,
    status: 'cited',
    source: 'Dal Porto et al. (2022) Aerosol Sci. Technol.; US EPA DIY Air Cleaner Eval',
    notes: 'Conservative derating for single-filter or 4-filter taped box fan at medium speed.',
  },
  source_cooking_lpg: {
    id: 'S_cooking_lpg',
    parameter: 'LPG/gas frying & tadka PM2.5 emission rate S',
    unit: 'ug/h',
    median: 4800,
    q10: 2200,
    q90: 9200,
    status: 'cited',
    source: 'Pant et al. (2016); Balakrishnan et al. South Asian household cooking emissions',
    notes: 'Active high-heat cooking without dedicated ducted range hood.',
  },
  source_incense_coil: {
    id: 'S_incense',
    parameter: 'Incense stick / mosquito coil PM2.5 emission rate S',
    unit: 'ug/h',
    median: 14000,
    q10: 8000,
    q90: 24000,
    status: 'cited',
    source: 'Jetter et al. (2002) Environ. Sci. Technol.; Lee & Wang (2004)',
    notes: 'High submicron combustion plume indoors.',
  },
  mask_n95_fit_adult: {
    id: 'fit_n95_adult',
    parameter: 'Effective N95/KN95 inhaled fraction reduction (filtration × fit)',
    unit: 'dimensionless',
    median: 0.82,
    q10: 0.62,
    q90: 0.94,
    status: 'cited',
    source: 'NIOSH / Mueller et al. (2018) Occup. Environ. Med.',
    notes: 'Accounts for non-fit-tested real-world community leak.',
  },
  mask_n95_fit_child: {
    id: 'fit_n95_child',
    parameter: 'Effective KF94/KN95 reduction for children aged 2–12 (wider fit spread)',
    unit: 'dimensionless',
    median: 0.68,
    q10: 0.40,
    q90: 0.86,
    status: 'assumed',
    source: 'Assumed wide prior adapted from pediatric mask fit studies (never for <2 yrs)',
    notes: 'Strictly 0 / forbidden for infant_under_2.',
  },
  mask_cloth_surgical: {
    id: 'fit_cloth_surg',
    parameter: 'Loose cloth or surgical mask PM2.5 reduction',
    unit: 'dimensionless',
    median: 0.30,
    q10: 0.12,
    q90: 0.48,
    status: 'cited',
    source: 'Shakya et al. (2017) J. Expo. Sci. Environ. Epidemiol.',
    notes: 'Side gaps substantially limit fine particle protection.',
  },
};

// Population-average minute/hourly inhalation rates (m3/h) from US EPA Exposure Factors Handbook (2011) Table 6-1
export const VENTILATION_RATE_M3_HR: Record<
  AgeBand,
  Record<'rest' | 'light' | 'moderate', { median: number; q10: number; q90: number }>
> = {
  infant_under_2: {
    rest: { median: 0.15, q10: 0.11, q90: 0.20 },
    light: { median: 0.28, q10: 0.21, q90: 0.36 },
    moderate: { median: 0.45, q10: 0.33, q90: 0.58 },
  },
  child_2_12: {
    rest: { median: 0.26, q10: 0.20, q90: 0.34 },
    light: { median: 0.52, q10: 0.40, q90: 0.68 },
    moderate: { median: 1.05, q10: 0.80, q90: 1.35 },
  },
  teen: {
    rest: { median: 0.36, q10: 0.28, q90: 0.46 },
    light: { median: 0.72, q10: 0.56, q90: 0.92 },
    moderate: { median: 1.50, q10: 1.15, q90: 1.92 },
  },
  adult: {
    rest: { median: 0.38, q10: 0.30, q90: 0.48 },
    light: { median: 0.78, q10: 0.60, q90: 1.00 },
    moderate: { median: 1.65, q10: 1.25, q90: 2.15 },
  },
  older_adult_65_plus: {
    rest: { median: 0.34, q10: 0.26, q90: 0.44 },
    light: { median: 0.68, q10: 0.52, q90: 0.88 },
    moderate: { median: 1.30, q10: 0.98, q90: 1.70 },
  },
};

export const ROOM_VOLUME_PRIORS = {
  small_under_40m2: {
    volume_m3: 65,
    status: 'cited' as const,
    source: 'Census of India residential floor space & urban 1BHK / studio standard (2.7m ceiling)',
  },
  medium_40_85m2: {
    volume_m3: 115,
    status: 'cited' as const,
    source: 'South Asian urban 2BHK flat master bedroom / living zone volume (Nazaroff 2004)',
  },
  large_over_85m2: {
    volume_m3: 180,
    status: 'cited' as const,
    source: 'Indian 3BHK+ apartment standard volume with cross-corridor airflow',
  },
};

export const COOKING_SCHEDULE_PRIORS = {
  peak_hours: [8, 13, 20] as readonly number[],
  status: 'cited' as const,
  source: 'Balakrishnan et al. / ICMR urban South Asian household cooking routine patterns',
};

export const TELEMETRY_SPREAD_PRIORS = {
  spread_fraction: 0.12, // ±12%
  status: 'cited' as const,
  source: 'CAMS / Open-Meteo regional reanalysis grid variance across 0.01° South Asia urban cells',
};

export const OVERNIGHT_HOURS_PRIORS = {
  clock_hours: [22, 23, 0, 1, 2, 3, 4, 5, 6] as readonly number[],
  status: 'cited' as const,
  source: 'WHO / ASHRAE 62.2 standard residential sleeping exposure window',
};

