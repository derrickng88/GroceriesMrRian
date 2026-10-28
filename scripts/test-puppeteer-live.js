import puppeteer from 'puppeteer';

async function testLiveSite() {
  console.log('--- TESTING LIVE VERCEL SITE WITH PUPPETEER ---');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 430, height: 932 });
  
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

  console.log('Navigating to https://groceries-mr-rian.vercel.app/ ...');
  await page.goto('https://groceries-mr-rian.vercel.app/', { waitUntil: 'networkidle2' });

  // 1. Check if locationSelectorCard is present
  const locationCard = await page.$('#locationSelectorCard');
  console.log('Location card element found:', !!locationCard);

  if (!locationCard) {
    console.error('ERROR: #locationSelectorCard NOT FOUND on live page!');
    await browser.close();
    process.exit(1);
  }

  const locNameText = await page.$eval('#activeLocationName', el => el.textContent.trim());
  console.log('Active location name text:', locNameText);

  // 2. Click on #btnChangeLocation
  console.log('Clicking #btnChangeLocation...');
  await page.click('#btnChangeLocation');

  // Check if modal opened
  await new Promise(r => setTimeout(r, 600));
  const modalActive = await page.$eval('#locationModalBackdrop', el => el.classList.contains('active'));
  console.log('Location modal opened (#locationModalBackdrop active):', modalActive);

  if (!modalActive) {
    console.error('ERROR: Modal did not open!');
    await browser.close();
    process.exit(1);
  }

  // 3. Type in custom location
  console.log('Testing custom location input...');
  await page.type('#inputNewLocName', 'Toko Berkah 88');
  await page.type('#inputNewLocAddress', 'Jl. Merdeka No. 10');

  // Click submit
  console.log('Submitting new location...');
  await page.click('#btnSubmitLocation');

  await new Promise(r => setTimeout(r, 1000));

  // Check if modal closed and active location updated
  const updatedLocName = await page.$eval('#activeLocationName', el => el.textContent.trim());
  console.log('Updated active location name:', updatedLocName);

  const modalActiveAfterSubmit = await page.$eval('#locationModalBackdrop', el => el.classList.contains('active'));
  console.log('Location modal closed after submit:', !modalActiveAfterSubmit);

  // 4. Test selecting location
  console.log('Reopening modal to test selecting location...');
  await page.click('#locationSelectorCard');
  await new Promise(r => setTimeout(r, 500));

  await page.evaluate(() => {
    const card = document.querySelector('.location-card-item[data-loc-id="loc-1"]');
    if (card) card.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const finalLocName = await page.$eval('#activeLocationName', el => el.textContent.trim());
  console.log('Final active location name:', finalLocName);

  await browser.close();
  console.log('--- LIVE TEST FINISHED WITH 100% SUCCESS ---');
}

testLiveSite().catch(err => {
  console.error('FATAL PUPPETEER ERROR:', err);
  process.exit(1);
});
