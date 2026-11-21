import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runDemoRecording() {
  const outputDir = path.resolve(__dirname, '../demo_video');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Dynamic import of NIRVAAT server
  process.env.NODE_ENV = 'production';
  process.env.PORT = '3005';
  const { startServer } = await import('../server.ts');
  const server = await startServer();
  console.log('[Demo Recorder] NIRVAAT Server started on http://127.0.0.1:3005');

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: outputDir,
      size: { width: 1280, height: 720 },
    },
  });

  const page = await context.newPage();

  console.log('[Demo Recorder] Navigating to NIRVAAT Today Dashboard...');
  await page.goto('http://127.0.0.1:3005/today', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // 1. Scene 1: Overview & BreathOrb
  console.log('[Demo Recorder] Scene 1: Overview & BreathOrb...');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(2500);

  // 2. Scene 2: Selecting "Leaky 1BHK + Toddler" preset
  console.log('[Demo Recorder] Scene 2: Selecting Leaky 1BHK + Toddler preset...');
  const preset1 = page.locator('button:has-text("Leaky 1BHK + Toddler")');
  if (await preset1.count() > 0) {
    await preset1.first().click();
    await page.waitForTimeout(2500);
  }

  // 3. Scene 3: Expanding "Why this advice?" panel on Action 1
  console.log('[Demo Recorder] Scene 3: Inspecting "Why this advice?" scientific panel...');
  const whyBtn = page.locator('button:has-text("Why this advice?")');
  if (await whyBtn.count() > 0) {
    await whyBtn.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await whyBtn.first().click();
    await page.waitForTimeout(3500);
  }

  // 4. Scene 4: Interacting with the Counterfactual Slider
  console.log('[Demo Recorder] Scene 4: Counterfactual Effect Comparison Slider...');
  const compareBtn = page.locator('button:has-text("Compare Effect")');
  if (await compareBtn.count() > 0) {
    await compareBtn.first().click();
    await page.waitForTimeout(2000);

    const slider = page.locator('input[type="range"]');
    if (await slider.count() > 0) {
      await slider.first().fill('30');
      await page.waitForTimeout(1200);
      await slider.first().fill('85');
      await page.waitForTimeout(1200);
      await slider.first().fill('100');
      await page.waitForTimeout(1500);
    }
  }

  // 5. Scene 5: Inversion Timeline Chart
  console.log('[Demo Recorder] Scene 5: Thermal Inversion Timeline & Cleanest Dip...');
  await page.evaluate(() => window.scrollBy({ top: 380, behavior: 'smooth' }));
  await page.waitForTimeout(3000);

  // 6. Scene 6: Sustainable & Low-Emission Alternatives
  console.log('[Demo Recorder] Scene 6: Sustainable Alternatives Catalog...');
  await page.evaluate(() => window.scrollBy({ top: 450, behavior: 'smooth' }));
  await page.waitForTimeout(2000);

  const cookingCat = page.locator('button:has-text("Clean Cooking Energy")');
  if (await cookingCat.count() > 0) {
    await cookingCat.first().click();
    await page.waitForTimeout(2000);
  }

  const equityBtn = page.locator('button:has-text("View Equity Note")');
  if (await equityBtn.count() > 0) {
    await equityBtn.first().click();
    await page.waitForTimeout(2500);
  }

  // 7. Scene 7: Bilingual Parity (Switch to Hindi)
  console.log('[Demo Recorder] Scene 7: Switching to Hindi (हिन्दी)...');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(1500);

  const hindiBtn = page.locator('button:has-text("हिन्दी")');
  if (await hindiBtn.count() > 0) {
    await hindiBtn.first().click();
    await page.waitForTimeout(3000);
  }

  // Switch back to English for remaining walkthrough
  const englishBtn = page.locator('button:has-text("EN")');
  if (await englishBtn.count() > 0) {
    await englishBtn.first().click();
    await page.waitForTimeout(1500);
  }

  // 8. Scene 8: Red-Flag Emergency Triage (0 LLM Calls)
  console.log('[Demo Recorder] Scene 8: Red-Flag Emergency Triage...');
  const queryInput = page.locator('input[placeholder*="Ask about"], input[type="text"]').first();
  if (await queryInput.count() > 0) {
    await queryInput.scrollIntoViewIfNeeded();
    await queryInput.click();
    await queryInput.fill('Grandparent having severe difficulty breathing and chest tightness');
    await page.waitForTimeout(1200);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(4000); // Wait on /emergency
  }

  // 9. Scene 9: Household Digital Twin Simulator
  console.log('[Demo Recorder] Scene 9: Household Digital Twin Simulator (/household)...');
  await page.goto('http://127.0.0.1:3005/household', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
  await page.waitForTimeout(3000);

  // 10. Scene 10: Community Exposure Defense & k-Anonymity
  console.log('[Demo Recorder] Scene 10: Community Exposure Defense (/community)...');
  await page.goto('http://127.0.0.1:3005/community', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  const schoolTab = page.locator('button:has-text("School Clean-Air Network")');
  if (await schoolTab.count() > 0) {
    await schoolTab.first().click();
    await page.waitForTimeout(2500);
  }

  // 11. Scene 11: Audit, Transparency & Verifier Engine
  console.log('[Demo Recorder] Scene 11: Audit & Verifier Transparency (/audit)...');
  await page.goto('http://127.0.0.1:3005/audit', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // End recording
  console.log('[Demo Recorder] Finalizing video recording...');
  await page.close();
  await context.close();
  await browser.close();

  server.close();
  console.log('[Demo Recorder] Demo recording complete! Video file saved in demo_video/');
}

try {
  await runDemoRecording();
} catch (err) {
  console.error('[Demo Recorder Error]:', err);
  process.exit(1);
}
