const JAILBREAK_PATTERNS = [
  /\bignore\s+(?:all\s+)?previous\s+instructions?\b/gi,
  /\b(?:reveal|print)\s+(?:system\s+)?prompts?\b/gi,
  /\bmark\s+audit\s+as\s+pass\b/gi,
  /\boverride\s+safety\s+rules?\b/gi,
  /\bdisregard\s+(?:all\s+)?rules?\b/gi,
];

export function sanitizeUserQuery(input: string): string {
  if (typeof input !== 'string') return '';
  let cleaned = input
    // 1. Strip non-printable / control ASCII characters (retaining common whitespace \n, \r, \t)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // 2. Strip XML/HTML injection tags mimicking system boundaries
    .replace(/<\/?(system|hard_rules|tool_policy|runtime|instructions?|override|identity|role|user_query|tool_data|guidance_data|developer|assistant)[^>]*>/gi, '[filtered_tag]');

  // 3. Neutralize classic jailbreak / instruction override phrases
  for (const pattern of JAILBREAK_PATTERNS) {
    cleaned = cleaned.replace(pattern, '[filtered_command]');
  }

  return cleaned.trim();
}
