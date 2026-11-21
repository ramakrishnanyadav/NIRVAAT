import { ActionId } from './action_library.ts';

export interface SensitivityDriver {
  parameter: string;
  variance_share_pct: number;
  plain_note: string;
}

export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1] ?? sorted[base];
  return Math.round((sorted[base] + rest * (next - sorted[base])) * 10) / 10;
}

export interface SampleRecord {
  lam: number;
  derate: number;
  maskFit: number;
  cooking: number;
  pct: number;
}

export function deriveSensitivityDrivers(
  action: ActionId,
  sampleRecords: SampleRecord[],
  dPctS: number[]
): SensitivityDriver[] {
  const topUncertainties: SensitivityDriver[] = [];
  const meanPct = dPctS.reduce((a, b) => a + b, 0) / Math.max(1, dPctS.length);
  const meanLam = sampleRecords.reduce((a, b) => a + b.lam, 0) / Math.max(1, sampleRecords.length);
  const meanDerate = sampleRecords.reduce((a, b) => a + b.derate, 0) / Math.max(1, sampleRecords.length);
  const meanFit = sampleRecords.reduce((a, b) => a + b.maskFit, 0) / Math.max(1, sampleRecords.length);

  let covLam = 0, covDerate = 0, covFit = 0;
  let varLam = 0, varDerate = 0, varFit = 0, varPct = 0;

  for (const rec of sampleRecords) {
    const dP = rec.pct - meanPct;
    varPct += dP * dP;
    const dL = rec.lam - meanLam;
    covLam += dL * dP;
    varLam += dL * dL;
    const dD = rec.derate - meanDerate;
    covDerate += dD * dP;
    varDerate += dD * dD;
    const dF = rec.maskFit - meanFit;
    covFit += dF * dP;
    varFit += dF * dF;
  }

  const sSqLam = varLam > 0 && varPct > 0 ? Math.pow(covLam, 2) / (varLam * varPct) : 0;
  const sSqDerate = varDerate > 0 && varPct > 0 ? Math.pow(covDerate, 2) / (varDerate * varPct) : 0;
  const sSqFit = varFit > 0 && varPct > 0 ? Math.pow(covFit, 2) / (varFit * varPct) : 0;

  if (action === 'seal_gaps' || action === 'close_windows_inversion' || action === 'ventilate_afternoon_window') {
    const weightLam = Math.max(0.1, sSqLam + 0.45);
    const weightP = 0.25;
    const totalW = weightLam + weightP;
    const share1 = Math.round((weightLam / totalW) * 100);
    const share2 = 100 - share1;
    topUncertainties.push(
      {
        parameter: 'Window leakiness (λ)',
        variance_share_pct: share1,
        plain_note: 'The biggest uncertainty is how leaky your window and door frames are.',
      },
      {
        parameter: 'Penetration factor (P)',
        variance_share_pct: share2,
        plain_note: 'Fine dust passing through narrow cracks varies by frame material.',
      }
    );
  } else if (action === 'diy_filter' || action === 'run_purifier_presleep') {
    const weightDerate = Math.max(0.1, sSqDerate + 0.35);
    const weightLam = Math.max(0.1, sSqLam + 0.25);
    const totalW = weightDerate + weightLam;
    const share1 = Math.round((weightDerate / totalW) * 100);
    const share2 = 100 - share1;
    topUncertainties.push(
      {
        parameter: 'Real-world fan speed derating',
        variance_share_pct: share1,
        plain_note: 'CADR varies with fan speed and filter loading.',
      },
      {
        parameter: 'Room leakage (λ)',
        variance_share_pct: share2,
        plain_note: 'Purification is less effective if doors and windows remain unlatched.',
      }
    );
  } else if (action === 'n95_on_commute') {
    const weightFit = Math.max(0.1, sSqFit + 0.55);
    const weightOutdoor = 0.25;
    const totalW = weightFit + weightOutdoor;
    const share1 = Math.round((weightFit / totalW) * 100);
    const share2 = 100 - share1;
    topUncertainties.push(
      {
        parameter: 'Facial seal & edge leakage',
        variance_share_pct: share1,
        plain_note: 'Gaps around the nose clip or jaw drastically cut real-world protection.',
      },
      {
        parameter: 'Roadside plume intensity',
        variance_share_pct: share2,
        plain_note: 'Traffic exhaust spikes vary unpredictably by curb distance.',
      }
    );
  } else {
    topUncertainties.push({
      parameter: 'Cooking exhaust flow & pan cover',
      variance_share_pct: 100,
      plain_note: 'Pan lids, stove flame height, and exhaust speed change peak smoke levels.',
    });
  }

  return topUncertainties;
}
