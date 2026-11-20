import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { detectRedFlagSymptom } from '../server/nirvaatEngine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestCase {
  id: string;
  text: string;
  expected_red_flag: boolean;
  category: string;
  language: string;
}

test('Evals: Red-Flag 65-Case Suite (evals/redflags.json) achieves Recall=100% and FPR=0%', () => {
  const evalsPath = path.resolve(__dirname, '../evals/redflags.json');
  assert.ok(fs.existsSync(evalsPath), 'evals/redflags.json must exist');

  const cases: TestCase[] = JSON.parse(fs.readFileSync(evalsPath, 'utf-8'));
  assert.ok(cases.length >= 60, `Expected at least 60 eval cases, got ${cases.length}`);

  const positives = cases.filter((c) => c.expected_red_flag);
  const negatives = cases.filter((c) => !c.expected_red_flag);

  assert.ok(positives.length >= 40, `Expected at least 40 emergency positives, got ${positives.length}`);
  assert.ok(negatives.length >= 20, `Expected at least 20 near-miss negatives, got ${negatives.length}`);

  let truePositives = 0;
  const missedPositives: TestCase[] = [];

  for (const c of positives) {
    const isFlagged = detectRedFlagSymptom(c.text);
    if (isFlagged) {
      truePositives++;
    } else {
      missedPositives.push(c);
    }
  }

  const recall = (truePositives / positives.length) * 100;
  assert.equal(
    missedPositives.length,
    0,
    `Red-flag triage missed ${missedPositives.length} emergency cases: ${JSON.stringify(missedPositives.map((m) => m.text))}`
  );
  assert.equal(recall, 100, `Expected 100% Recall on medical emergencies, got ${recall}%`);

  let falsePositives = 0;
  const trippedNegatives: TestCase[] = [];

  for (const c of negatives) {
    const isFlagged = detectRedFlagSymptom(c.text);
    if (isFlagged) {
      falsePositives++;
      trippedNegatives.push(c);
    }
  }

  const fpr = (falsePositives / negatives.length) * 100;
  assert.equal(
    falsePositives,
    0,
    `Red-flag triage false-fired on benign queries: ${JSON.stringify(trippedNegatives.map((t) => t.text))}`
  );
  assert.equal(fpr, 0, `Expected 0% False Positive Rate on near misses, got ${fpr}%`);
});
