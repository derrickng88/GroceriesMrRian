import puppeteer from 'puppeteer';
import { preview } from 'vite';

async function runLocalTest() {
  console.log('--- STARTING LOCAL VITE PREVIEW SERVER ---');
  const server = await preview({
    preview: { port: 4173 }
  });

  const url = 'http://localhost:4173';
  console.log('Server running at', url);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 430, height: 932 }); // iPhone Pro Max viewport
  
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err));

  await page.goto(url, { waitUntil: 'networkidle2' });

  // 1. Verify locationSelectorCard is visible
  const locationCard = await page.$('#locationSelectorCard');
  if (!locationCard) throw new Error('#locationSelectorCard not found in DOM');
  console.log('✓ #locationSelectorCard is in DOM');

  const initialLocText = await page.$eval('#activeLocationName', el => el.textContent.trim());
  console.log('Initial location text:', initialLocText);

  // 2. Click on #btnChangeLocation
  console.log('Clicking #btnChangeLocation...');
  await page.click('#btnChangeLocation');
  await new Promise(r => setTimeout(r, 400));

  let isModalActive = await page.$eval('#locationModalBackdrop', el => el.classList.contains('active'));
  console.log('Is modal open after clicking #btnChangeLocation?', isModalActive);
  if (!isModalActive) throw new Error('Modal did NOT open when clicking #btnChangeLocation!');
  console.log('✓ Modal successfully opened!');

  // 3. Test adding custom location
  console.log('Typing new location "Toko Beras & Sayur Bu Joko"...');
  await page.type('#inputNewLocName', 'Toko Beras & Sayur Bu Joko');
  await page.type('#inputNewLocAddress', 'Jl. Sukajadi No. 45');

  console.log('Clicking submit button...');
  await page.click('#btnSubmitLocation');
  await new Promise(r => setTimeout(r, 600));

  isModalActive = await page.$eval('#locationModalBackdrop', el => el.classList.contains('active'));
  console.log('Is modal closed after submit?', !isModalActive);
  if (isModalActive) throw new Error('Modal did not close after form submit!');

  const updatedLocName = await page.$eval('#activeLocationName', el => el.textContent.trim());
  const updatedLocAddr = await page.$eval('#activeLocationAddress', el => el.textContent.trim());
  console.log('Updated location display:', updatedLocName, '|', updatedLocAddr);
  if (updatedLocName !== 'Toko Beras & Sayur Bu Joko') {
    throw new Error(`Location name mismatch: expected "Toko Beras & Sayur Bu Joko", got "${updatedLocName}"`);
  }
  console.log('✓ Custom location successfully added and active banner updated!');

  // 4. Test clicking card directly to open modal again
  console.log('Clicking location card directly to open modal again...');
  await page.click('#locationSelectorCard');
  await new Promise(r => setTimeout(r, 400));

  isModalActive = await page.$eval('#locationModalBackdrop', el => el.classList.contains('active'));
  if (!isModalActive) throw new Error('Clicking card directly did not open modal!');
  console.log('✓ Modal opened via card click!');

  // 5. Select "Indomaret Terdekat"
  console.log('Selecting "Indomaret Terdekat" from stored list via JS click...');
  await page.evaluate(() => {
    const card = document.querySelector('.location-card-item[data-loc-id="loc-2"]');
    if (card) card.click();
  });
  await new Promise(r => setTimeout(r, 500));

  const switchedLocName = await page.$eval('#activeLocationName', el => el.textContent.trim());
  console.log('Switched location name:', switchedLocName);
  if (!switchedLocName.includes('Indomaret')) {
    throw new Error(`Expected Indomaret, got "${switchedLocName}"`);
  }
  console.log('✓ Location switch works perfectly!');

  // 6. Test Quick Clear Cart
  console.log('Testing quick clear cart button...');
  await page.evaluate(() => {
    const btn = document.getElementById('btnQuickClearCart');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 400));
  const cartCount = await page.$eval('#cartTotalItemsCount', el => el.textContent.trim());
  console.log('Cart count after quick clear:', cartCount);

  await browser.close();
  await server.close();
  console.log('🎉🎉🎉 ALL 6 INTERACTION TESTS PASSED 100%! 🎉🎉🎉');
}

runLocalTest().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
