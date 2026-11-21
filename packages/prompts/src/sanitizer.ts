export function sanitizeUserQuery(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    // 1. Strip non-printable / control ASCII characters (retaining common whitespace \n, \r, \t)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // 2. Strip XML/HTML injection tags mimicking system boundaries
    .replace(/<\/?(system|hard_rules|tool_policy|runtime|instructions?|override|identity|role|user_query|tool_data|guidance_data|developer|assistant)[^>]*>/gi, '[filtered_tag]')
    // 3. Neutralize classic jailbreak / instruction override phrases
    .replace(/\b(ignore\s+(?:all\s+)?previous\s+instructions?|reveal\s+(?:system\s+)?prompts?|print\s+(?:system\s+)?prompts?|mark\s+audit\s+as\s+pass|override\s+safety\s+rules?|disregard\s+(?:all\s+)?rules?)\b/gi, '[filtered_command]')
    .trim();
}
