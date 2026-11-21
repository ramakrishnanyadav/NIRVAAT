export interface BannedAdviceRule {
  rule: string;
  rx: RegExp;
  fix: string;
  test?: (text: string) => boolean;
}

export const BANNED_ADVICE_REGEXES: BannedAdviceRule[] = [
  {
    rule: 'V3_NO_MEDICATION_CHANGE',
    rx: /\b(?:stop|discontinue|cease|alter|change|taper|skip|adjust|increase|raise|double|modify|reduce)\s+(?:your\s+|the\s+)?(?:dose\s+of\s+)?(?:inhaler|medication|medicine|steroid|prescription)(?:\s+dose)?\b/i,
    fix: 'Never advise modifying or stopping clinical medications; tell user to follow existing asthma action plan.',
  },
  {
    rule: 'V3_NO_OZONE_IONIZER',
    rx: /\b(?:ozone|ionizer|ionising|ionizing|negative\s+ion|plasma\s+cluster)\b/i,
    fix: 'Ozone-generating or ionizing purifiers emit respiratory irritants and are banned.',
  },
  {
    rule: 'V3_NO_BURNING_CLEANER',
    rx: /\b(?:burn|light|ignite)\s+(?:camphor|kapoor|sage|dhoop|incense|havan|sambrani)\b/i,
    fix: 'Burning substances to "purify" air emits heavy particulate matter and is banned.',
  },
  {
    rule: 'V3_NO_MASK_UNDER_2',
    rx: /\b(?:put|wear|place|use|mask\s+on)\s+(?:an?\s+)?(?:n95|kn95|mask)\s+(?:on|for)?\s*(?:your\s+|the\s+)?(?:infant|baby|newborn|toddler\s+under\s+2|child\s+under\s+2)\b/i,
    test: (text: string) => {
      const match = /\b(?:put|wear|place|use|mask\s+on)\s+(?:an?\s+)?(?:n95|kn95|mask)\s+(?:on|for)?\s*(?:your\s+|the\s+)?(?:infant|baby|newborn|toddler\s+under\s+2|child\s+under\s+2)\b/i.exec(text);
      if (!match) return false;
      const prefix = text.slice(Math.max(0, match.index - 35), match.index).toLowerCase();
      if (/\b(?:do\s+not|never|avoid|not|don't)\s*$/i.test(prefix)) return false;
      return true;
    },
    fix: 'Masks for infants under age 2 present suffocation risk and are strictly forbidden.',
  },
];

export function normalizeDevanagariNumerals(str: string): string {
  const devMap: Record<string, string> = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
  };
  return str.replace(/[०-९]/g, (ch) => devMap[ch] ?? ch);
}

export function extractNumbers(str: string | null): number[] {
  if (!str) return [];
  const normalized = normalizeDevanagariNumerals(str);
  const matches = normalized.match(/-?\d+(?:\.\d+)?/g);
  return matches ? matches.map(Number) : [];
}
