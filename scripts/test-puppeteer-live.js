import puppeteer from 'puppeteer';

async function testLiveSite() {
  console.log('--- TESTING LIVE VERCEL SITE WITH PUPPETEER ---');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Capture console logs and errors
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

  console.log('Navigating to https://groceries-mr-rian.vercel.app/ ...');
  await page.goto('https://groceries-mr-rian.vercel.app/', { waitUntil: 'networkidle2' });

  // Check if locationSelectorCard is present
  const locationCard = await page.$('#locationSelectorCard');
  console.log('Location card element found:', !!locationCard);

  if (!locationCard) {
    console.error('ERROR: #locationSelectorCard NOT FOUND on live page!');
    await browser.close();
    return;
  }

  // Check visibility and bounding box
  const box = await locationCard.boundingBox();
  console.log('Location card bounding box:', box);

  const locNameText = await page.$eval('#activeLocationName', el => el.textContent);
  console.log('Active location name text:', locNameText);

  // Click on #btnChangeLocation
  console.log('Clicking #btnChangeLocation...');
  await page.click('#btnChangeLocation');

  // Check if modal opened
  await new Promise(r => setTimeout(r, 600));
  const modalActive = await page.$eval('#locationModalBackdrop', el => el.classList.contains('active'));
  console.log('Location modal opened (#locationModalBackdrop active):', modalActive);

  // Type in custom location
  console.log('Testing custom location input...');
  await page.type('#inputNewLocName', 'Toko Klontong Berkah 99');
  await page.type('#inputNewLocAddress', 'Jl. Kenanga No. 12');

  // Click submit
  console.log('Submitting new location...');
  await page.click('#btnSubmitLocation');

  await new Promise(r => setTimeout(r, 1000));

  // Check if modal closed and active location updated
  const updatedLocName = await page.$eval('#activeLocationName', el => el.textContent);
  console.log('Updated active location name:', updatedLocName);

  const modalActiveAfterSubmit = await page.$eval('#locationModalBackdrop', el => el.classList.contains('active'));
  console.log('Location modal closed after submit:', !modalActiveAfterSubmit);

  await browser.close();
  console.log('--- TEST FINISHED ---');
}

testLiveSite().catch(err => {
  console.error('FATAL PUPPETEER ERROR:', err);
  process.exit(1);
});
