/**
 * Contrast Audit Script for NIRVAAT Glass Surfaces
 * Validates WCAG 2.2 AA (4.5:1 normal text, 3:1 large text & UI components)
 * Computes exact relative luminance according to W3C Rec formula.
 */

interface ColorRgb {
  r: number;
  g: number;
  b: number;
  a?: number;
}

function parseHex(hex: string): ColorRgb {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return {
      r: Number.parseInt(clean[0] + clean[0], 16),
      g: Number.parseInt(clean[1] + clean[1], 16),
      b: Number.parseInt(clean[2] + clean[2], 16),
    };
  }
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16),
  };
}

function parseRgba(rgbaStr: string): ColorRgb {
  const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(rgbaStr);
  if (!match) throw new Error(`Cannot parse color: ${rgbaStr}`);
  return {
    r: Number.parseInt(match[1], 10),
    g: Number.parseInt(match[2], 10),
    b: Number.parseInt(match[3], 10),
    a: match[4] !== undefined ? Number.parseFloat(match[4]) : 1,
  };
}

/** Composite foreground over background using standard alpha blending */
function compositeColor(fg: ColorRgb, bg: ColorRgb): ColorRgb {
  const alpha = fg.a ?? 1;
  return {
    r: Math.round(fg.r * alpha + bg.r * (1 - alpha)),
    g: Math.round(fg.g * alpha + bg.g * (1 - alpha)),
    b: Math.round(fg.b * alpha + bg.b * (1 - alpha)),
  };
}

function getLuminance(rgb: ColorRgb): number {
  const srgb = [rgb.r / 255, rgb.g / 255, rgb.b / 255];
  const linear = srgb.map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function getContrastRatio(c1: ColorRgb, c2: ColorRgb): number {
  const l1 = getLuminance(c1);
  const l2 = getLuminance(c2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export interface ContrastAuditResult {
  pairName: string;
  fgHex: string;
  bgDesc: string;
  ratio: number;
  targetRatio: number;
  pass: boolean;
}

export function runContrastAudit(): { allPass: boolean; results: ContrastAuditResult[] } {
  // Base background is slate-50 (#f8fafc)
  const baseBg = parseHex('#f8fafc');

  // Glass token 1: rgba(255, 255, 255, 0.88) composited over baseBg
  const glassToken1 = compositeColor(parseRgba('rgba(255, 255, 255, 0.88)'), baseBg);

  // Glass token 2 (inset): rgba(255, 255, 255, 0.94) composited over baseBg
  const glassInset = compositeColor(parseRgba('rgba(255, 255, 255, 0.94)'), baseBg);

  // High-contrast surface (pure white #ffffff)
  const hcSurface = parseHex('#ffffff');

  // Palette colors evaluated on glass surfaces
  const auditPairs = [
    { name: 'Primary Ink Text on Glass', fg: '#0b1b2b', bg: glassToken1, target: 4.5 },
    { name: 'Body Slate-800 Text on Glass', fg: '#1e293b', bg: glassToken1, target: 4.5 },
    { name: 'Secondary Slate-700 Text on Glass', fg: '#334155', bg: glassToken1, target: 4.5 },
    { name: 'Muted Slate-600 on Glass Inset', fg: '#475569', bg: glassInset, target: 4.5 },
    { name: 'Brand Teal-800 on Glass', fg: '#115e59', bg: glassToken1, target: 4.5 },
    { name: 'Emerald-800 (Clean/Safe) on Glass', fg: '#166534', bg: glassToken1, target: 4.5 },
    { name: 'Amber-900 (Smog alert text) on Glass', fg: '#78350f', bg: glassToken1, target: 4.5 },
    { name: 'Red-800 (Emergency alert text) on Glass', fg: '#991b1b', bg: glassToken1, target: 4.5 },
    { name: 'Focus Ring (#0e7c86) against Glass Surface', fg: '#0e7c86', bg: glassToken1, target: 3.0 },
    { name: 'Focus Ring (#0e7c86) against Base Canvas', fg: '#0e7c86', bg: baseBg, target: 3.0 },
    { name: 'High-Contrast Focus Ring (#000000) against High-Contrast Surface', fg: '#000000', bg: hcSurface, target: 3.0 },
    { name: 'High-Contrast Text (#000000) on High-Contrast Surface', fg: '#000000', bg: hcSurface, target: 7.0 }, // AAA target
    { name: 'Placeholder text (#475569) on White Input', fg: '#475569', bg: hcSurface, target: 4.5 },
  ];

  const results: ContrastAuditResult[] = auditPairs.map((p) => {
    const fgRgb = parseHex(p.fg);
    const ratio = Math.round(getContrastRatio(fgRgb, p.bg) * 100) / 100;
    return {
      pairName: p.name,
      fgHex: p.fg,
      bgDesc: `rgb(${p.bg.r}, ${p.bg.g}, ${p.bg.b})`,
      ratio,
      targetRatio: p.target,
      pass: ratio >= p.target,
    };
  });

  const allPass = results.every((r) => r.pass);
  return { allPass, results };
}

// When executed directly via node/tsx
if (process.argv[1]?.endsWith('check_contrast.ts')) {
  console.log('Running NIRVAAT Glass Contrast Verification...');
  const { allPass, results } = runContrastAudit();
  for (const r of results) {
    const status = r.pass ? 'PASS' : 'FAIL';
    console.log(`[${status}] ${r.pairName}: ${r.ratio}:1 (Target: ${r.targetRatio}:1)`);
  }
  if (!allPass) {
    console.error('Error: Some text/background pairs fail WCAG contrast thresholds!');
    process.exit(1);
  }
  console.log('All text/background contrast checks passed WCAG AA/AAA.');
}
