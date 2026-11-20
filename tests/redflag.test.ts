import assert from 'node:assert/strict';
import test from 'node:test';
import { detectRedFlagSymptom } from '../server/nirvaatEngine.ts';

test('Red-flag detection: True emergency English symptoms with straight & curly apostrophes', () => {
  const emergencies = [
    'My grandfather is gasping for air right now',
    'She has severe chest pain and tightness',
    'He cannot breathe and lips are turning blue',
    'Baby is struggling to breathe with flaring nostrils',
    'The toddler has respiratory distress and ribs pulling in',
    'I can’t breathe at all', // curly apostrophe
    "I can't breathe", // straight apostrophe
    'Experiencing sudden confusion and slurred speech',
    'Wheezing is not settling after taking inhaler',
    'My mother is coughing up blood',
    'He fainted and became unconscious',
  ];

  for (const text of emergencies) {
    assert.equal(
      detectRedFlagSymptom(text),
      true,
      `Expected true emergency for: "${text}"`
    );
  }
});

test('Red-flag detection: Hinglish emergency phrases', () => {
  const hinglishEmergencies = [
    'Dada ji ko seene mein dard ho raha hai',
    'Bache ko saans lene me takleef ho rahi hai',
    'Achanak saans phool rahi hai aur behosh ho gaye',
    'Inhaler lene ke baad bhi wheeze theek nahi ho raha',
    'Hoth neele pad rahe hain',
    'Khoon ki khansi aayi hai',
    'Dum ghut raha hai aur saans nahi aa rahi',
  ];

  for (const text of hinglishEmergencies) {
    assert.equal(
      detectRedFlagSymptom(text),
      true,
      `Expected true emergency for Hinglish: "${text}"`
    );
  }
});

test('Red-flag detection: Devanagari Hindi emergency phrases', () => {
  const hindiEmergencies = [
    'सांस लेने में बहुत ज्यादा तकलीफ हो रही है',
    'सीने में दर्द और जकड़न है',
    'बच्चे की पसलियां धंस रही हैं और सांस फूल रही है',
    'मरीज बेहोश हो गया है',
    'होंठ नीले पड़ रहे हैं',
    'खांसी में खून आ रहा है',
    'इनहेलर के बाद भी सांस नहीं आ रही',
  ];

  for (const text of hindiEmergencies) {
    assert.equal(
      detectRedFlagSymptom(text),
      true,
      `Expected true emergency for Devanagari: "${text}"`
    );
  }
});

test('Red-flag detection: False-positive resistance on non-clinical usage', () => {
  const benignQueries = [
    'There is confusion about whether to buy a HEPA filter',
    'I have confusion regarding window timing in Delhi',
    'Clearing confusion about Corsi-Rosenthal boxes',
    'How can I reduce inhaled dose of PM2.5?',
    'What should I do during morning inversion hours?',
    'Is it safe to walk in the afternoon?',
    'We cook with LPG in a small 1BHK apartment',
  ];

  for (const text of benignQueries) {
    assert.equal(
      detectRedFlagSymptom(text),
      false,
      `Expected non-emergency (false-positive rejected) for: "${text}"`
    );
  }
});
