export interface RedFlagPattern {
  id: string;
  pattern: RegExp;
  category: string;
}

export const RED_FLAG_PATTERNS: RegExp[] = [
  // 1. Chest pain / pressure / tightness
  /\b(chest\s+pain|chest\s+tightness|tightness\s+in\s+chest|crushing\s+chest|chest\s+pressure)\b/i,
  /\b(seene\s+(?:me|mein|meinn?)\s+(?:dard|jakdan|jalan|dabaav))\b/i,
  /(सीने में\s*.{0,15}(?:दर्द|जकड़न|दबाव))/,

  // 2. Cyanosis / Blue or grey lips / skin
  /\b(?:blue|grey|gray)\s+(?:lips|fingernails|face|skin)\b/i,
  /\b(?:lips|fingernails|face|skin)\s+(?:(?:turning|turned|went|became|are)\s+)?(?:blue|grey|gray)\b/i,
  /\bcyanosis\b/i,
  /\b(?:neele?|neela)\s+(?:hoth|honth|naakhun)\b/i,
  /\b(?:hoth|honth|naakhun)\s+.{0,15}(?:neele?|neela)\b/i,
  /(?:(?:नीले|भूरे)\s*(?:होंठ|नाखून|त्वचा)|(?:होंठ|नाखून|त्वचा)\s*.{0,15}(?:नीले|भूरे))/,

  // 3. Fainting / Unconsciousness
  /\b(fainting|fainted|passed\s+out|unconscious|loss\s+of\s+consciousness)\b/i,
  /\b(behosh(?:i)?|chakkar\s+aake\s+gir)\b/i,
  /(बेहोश|मूर्छित|अचेत)/,

  // 4. Coughing blood
  /\b(coughing\s+(?:up\s+)?blood|blood\s+in\s+(?:cough|phlegm|sputum)|hemoptysis)\b/i,
  /\b(khoon\s+ki\s+khansi|khansi\s+(?:me|mein)\s+khoon)\b/i,
  /(खांसी में खून|खून की खांसी)/,

  // 5. Severe breathlessness / asphyxia / suffocation
  /\b(severe\s+breathlessness|worsening\s+breathlessness|diff?iculty\s+breathing|shortness\s+of\s+breath|gasping\s+for\s+air|struggling\s+to\s+breathe|cannot\s+breathe|can['’]t\s+breathe?|cant\s+breathe?|unable\s+to\s+breathe)\b/i,
  /\b(saans\s+(?:nahi|nahin)\s+(?:aa\s+rahi|le\s+p[a|aa]\s+rah[ai]|le\s+sak)|saans\s+phool\s+rahi|saans\s+lene\s+(?:me|mein)\s+.{0,25}(?:takleef|dikkat|mushkil)|dum\s+ghut(?: raha)?)\b/i,
  /((?:सांस|साँस)\s*(?:लेने में\s*.{0,25}(?:तकलीफ|दिक्कत|कठिनाई|परेशानी)|नहीं आ रही|नहीं ले पा|फूल रही)|दम\s*घुट)/,

  // 6. Pediatric respiratory distress (nostril flaring, intercostal retractions, Hinglish + Devanagari)
  /\b(infant|toddler|baby|newborn)\b.{0,35}\b(respiratory\s+distress|struggling\s+to\s+breathe|ribs\s+pulling|flaring\s+nostrils|not\s+breathing\s+well|gasping)\b/i,
  /\b(bachch[aei]|bacch[aei]|baby|toddler)\b.{0,30}\b(?:saans\s+(?:nahi|nahin)|pasliyan\s+dhans|saans\s+phool)\b/i,
  /(बच्चे|शिशु|बच्चा).{0,30}(?:पसलियां धंस|सांस फूल|सांस लेने में|सांस नहीं)/,

  // 7. Unrelieved wheezing with inhaler
  /\b(wheeze|wheezing).{0,40}\b(not\s+settling|not\s+responding|still\s+bad|worse\s+after|theek\s+nahi|shant\s+nahi).{0,25}\b(inhaler|reliever|nebulizer|pump)\b/i,
  /\b(inhaler|reliever|nebulizer|pump)\b.{0,35}\b(?:ke\s+baad\s+bhi|after).{0,25}\b(?:wheeze|saans)\b/i,
  /(?:इनहेलर|पंप).{0,30}(?:के बाद भी|शांत नहीं).{0,20}(?:सांस|घरघराहट)/,

  // 8. Acute neurological confusion / altered sensorium (never bare 'confusion')
  /\b(sudden\s+confusion|mental\s+confusion|acute\s+confusion|disoriented|slurred\s+speech|acting\s+confused)\b/i,
  /(अचानक भ्रम|असंगत बोल)/,
];

export const FALSE_ALARM_NEGATIVES: RegExp[] = [
  /\b(confusion\s+about\s+(?:grap|stages?|rules?|policy|numbers?|masks?|purifiers?))\b/i,
  /\b(is\s+it\s+confusing|clarify\s+confusion)\b/i,
  /\b(blue\s+(?:purifier|filter|box|hepa|light|color|bottle))\b/i,
];

export function checkRedFlags(text: string): { isRedFlag: boolean; matchedPattern?: string } {
  const trimmed = text.trim();
  if (!trimmed) return { isRedFlag: false };

  for (const neg of FALSE_ALARM_NEGATIVES) {
    if (neg.test(trimmed)) {
      return { isRedFlag: false };
    }
  }

  for (const pat of RED_FLAG_PATTERNS) {
    if (pat.test(trimmed)) {
      return { isRedFlag: true, matchedPattern: pat.source };
    }
  }

  return { isRedFlag: false };
}
