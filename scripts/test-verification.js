// Automated Verification Script for Smart Grocery Mobile PWA (GroceriesMrRian)
import { formatRp, parseRp, calculateDiscount, comparePrice, getBudgetStatus } from '../src/math.js';
import { 
  DEFAULT_INITIAL_CART, 
  DEFAULT_INITIAL_HISTORY, 
  DEFAULT_PRICE_DB, 
  CATEGORIES, 
  COMMON_UNITS,
  normalizeProductName 
} from '../src/storage.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

async function runAllTests() {
  console.log('===============================================================');
  console.log('🧪 PENGUJIAN DAN VERIFIKASI APLIKASI SMART GROCERIES MR. RIAN');
  console.log('===============================================================\n');

  // -------------------------------------------------------------------------
  // 1. UJI F-03: Kalkulator Diskon Bertingkat & Tunggal
  // -------------------------------------------------------------------------
  console.log('🔹 1. Menguji F-03: Kalkulator Diskon Bertingkat & Tunggal (src/math.js)');
  
  // Test 1: Diskon Tunggal 25% dari Rp 100.000
  const d1 = calculateDiscount(100000, '25', 'percent');
  assert(d1.finalUnitPrice === 75000, 'Diskon tunggal 25% dari Rp 100.000 menghasilkan Rp 75.000');
  assert(d1.discountPerUnit === 25000, 'Potongan per unit Rp 25.000');
  assert(d1.effectivePercent === 25, 'Diskon efektif 25%');

  // Test 2: Diskon Bertingkat 50% + 20% dari Rp 100.000
  // Rumus: 100.000 * (1 - 0.5) * (1 - 0.2) = 100.000 * 0.5 * 0.8 = 40.000 (Hemat 60.000)
  const d2 = calculateDiscount(100000, '50+20', 'percent');
  assert(d2.finalUnitPrice === 40000, 'Diskon bertingkat 50% + 20% dari Rp 100.000 menghasilkan Rp 40.000');
  assert(d2.discountPerUnit === 60000, 'Potongan per unit Rp 60.000');
  assert(d2.effectivePercent === 60, 'Diskon efektif akumulatif 60% (bukan 70%!)');

  // Test 3: Diskon Bertingkat 50% + 20% dari Sabun Mandi Cair 450ml (Rp 28.000)
  // 28.000 * 0.5 * 0.8 = 11.200
  const d3 = calculateDiscount(28000, '50% + 20%', 'percent');
  assert(d3.finalUnitPrice === 11200, 'Diskon 50% + 20% dari Rp 28.000 menghasilkan Rp 11.200');
  assert(d3.discountPerUnit === 16800, 'Potongan diskon Rp 16.800');

  // Test 4: Diskon Nominal Rp 5.000
  const d4 = calculateDiscount(25000, '5000', 'nominal');
  assert(d4.finalUnitPrice === 20000, 'Diskon nominal Rp 5.000 dari Rp 25.000 menghasilkan Rp 20.000');
  assert(d4.discountPerUnit === 5000, 'Potongan per unit Rp 5.000');

  // Test 5: Tanpa Diskon
  const d5 = calculateDiscount(50000, '', 'percent');
  assert(d5.finalUnitPrice === 50000, 'Tanpa diskon harga tetap Rp 50.000');
  assert(!d5.hasDiscount, 'Flag hasDiscount bernilai false');

  // -------------------------------------------------------------------------
  // 2. UJI F-04: Komparator Harga Realtime vs Bulan Lalu
  // -------------------------------------------------------------------------
  console.log('\n🔹 2. Menguji F-04: Komparator Harga Realtime vs Bulan Lalu (src/math.js)');
  
  // Test 1: Harga Naik (Lebih mahal dari bulan lalu)
  const cUp = comparePrice(74000, 72000); // Beras 74k vs 72k
  assert(cUp.status === 'up', 'Status harga naik terdeteksi sebagai "up"');
  assert(cUp.symbol === '↑', 'Simbol panah naik (↑)');
  assert(cUp.diff === 2000, 'Selisih harga +Rp 2.000');
  assert(cUp.badgeClass === 'badge-up', 'Class CSS badge-up (Merah)');

  // Test 2: Harga Turun / Promo (Lebih murah dari bulan lalu)
  const cDown = comparePrice(26000, 28000); // Telur 26k vs 28k
  assert(cDown.status === 'down', 'Status harga turun terdeteksi sebagai "down"');
  assert(cDown.symbol === '↓', 'Simbol panah turun (↓)');
  assert(cDown.diff === -2000, 'Selisih harga -Rp 2.000 (Promo)');
  assert(cDown.badgeClass === 'badge-down', 'Class CSS badge-down (Hijau)');

  // Test 3: Harga Stabil / Sama Persis
  const cEq = comparePrice(37000, 37000); // Minyak 37k vs 37k
  assert(cEq.status === 'equal', 'Status harga sama terdeteksi sebagai "equal"');
  assert(cEq.symbol === '=', 'Simbol sama dengan (=)');
  assert(cEq.badgeClass === 'badge-equal', 'Class CSS badge-equal');

  // Test 4: Item Baru (Belum ada catatan harga bulan lalu)
  const cNew = comparePrice(15000, null);
  assert(cNew.status === 'new', 'Item baru tanpa catatan harga terdeteksi sebagai "new"');
  assert(cNew.badgeClass === 'badge-new', 'Class CSS badge-new');
  assert(cNew.label === 'Item Baru', 'Label "Item Baru"');

  // -------------------------------------------------------------------------
  // 3. UJI F-05: Pengendali Anggaran (Safety Cap)
  // -------------------------------------------------------------------------
  console.log('\n🔹 3. Menguji F-05: Pengendali Anggaran Safety Cap 4 Level (src/math.js)');
  
  // Level 1: Aman (< 70%)
  const bSafe = getBudgetStatus(250000, 500000); // 50%
  assert(bSafe.status === 'safe', 'Persentase 50% masuk Zona Aman (safe)');
  assert(bSafe.levelName === 'ZONA AMAN', 'Level Name: ZONA AMAN');
  assert(!bSafe.isOver, 'isOver = false');

  // Level 2: Waspada (70% - 89%)
  const bWarn = getBudgetStatus(380000, 500000); // 76%
  assert(bWarn.status === 'warning', 'Persentase 76% masuk status "warning" (Waspada)');
  assert(bWarn.remaining === 120000, 'Sisa dompet Rp 120.000');

  // Level 3: Kritis (90% - 99%)
  const bCrit = getBudgetStatus(460000, 500000); // 92%
  assert(bCrit.status === 'critical', 'Persentase 92% masuk status "critical" (Siap-siap Rem)');

  // Level 4: Over Budget / Bahaya (>= 100%)
  const bDanger = getBudgetStatus(520000, 500000); // 104%
  assert(bDanger.status === 'danger', 'Persentase 104% masuk status "danger" (Over Budget)');
  assert(bDanger.isOver === true, 'isOver = true');
  assert(bDanger.remaining === -20000, 'Sisa minus Rp 20.000');

  // -------------------------------------------------------------------------
  // 4. UJI F-01 & F-02: Keranjang Belanja, Kuantitas & Data Model (src/storage.js)
  // -------------------------------------------------------------------------
  console.log('\n🔹 4. Menguji F-01 & F-02: Data Model Belanja & Kuantitas');
  assert(DEFAULT_INITIAL_CART.length >= 5, 'Troli awal memuat 5 item belanja realistis anak kos');
  assert(DEFAULT_INITIAL_CART.some(i => i.discount === '50+20'), 'Terdapat item dengan diskon bertingkat 50+20% di troli');
  assert(CATEGORIES.length >= 8, 'Tersedia minimal 8 kategori barang belanja');
  assert(COMMON_UNITS.includes('kg') && COMMON_UNITS.includes('pack') && COMMON_UNITS.includes('liter') && COMMON_UNITS.includes('pcs'), 'Satuan kg, liter, pcs, pack tersedia');

  // Normalisasi Nama Produk
  assert(normalizeProductName('  Beras Ramos 5KG  ') === 'beras ramos 5kg', 'Normalisasi nama produk berfungsi lowercase & trim spasi');

  // -------------------------------------------------------------------------
  // 5. UJI F-06: Riwayat Transaksi & Struktur Struk Digital
  // -------------------------------------------------------------------------
  console.log('\n🔹 5. Menguji F-06: Riwayat Transaksi & Struk Digital');
  assert(DEFAULT_INITIAL_HISTORY.length > 0, 'Terdapat riwayat belanja default (September 2026)');
  const hist0 = DEFAULT_INITIAL_HISTORY[0];
  assert(hist0.totalOriginal > 0, 'Riwayat memiliki total original');
  assert(hist0.totalFinal > 0, 'Riwayat memiliki total bayar kasir');
  assert(hist0.items.length === 8, 'Riwayat memiliki rincian daftar barang (8 item)');

  // -------------------------------------------------------------------------
  // 6. UJI INTEGRASI GOOGLE CLOUD FIRESTORE
  // -------------------------------------------------------------------------
  console.log('\n🔹 6. Menguji Koneksi REST API Google Cloud Firestore (groceriesmrrian)');
  try {
    const fsUrl = 'https://firestore.googleapis.com/v1/projects/groceriesmrrian/databases/(default)/documents/settings/budget';
    const fsRes = await fetch(fsUrl);
    assert(fsRes.status === 200, `Koneksi Google Cloud Firestore settings/budget sukses (HTTP 200)`);
    const fsData = await fsRes.json();
    assert(fsData.fields?.budgetLimit !== undefined, 'Dokumen settings/budget berisi field budgetLimit yang valid di Firestore');
    console.log(`     Firestore Document Data:`, JSON.stringify(fsData.fields));
  } catch (err) {
    assert(false, 'Gagal menghubungi Cloud Firestore: ' + err.message);
  }

  // -------------------------------------------------------------------------
  // 7. UJI LIVE DEPLOYMENT VERCEL (https://groceries-mr-rian.vercel.app/)
  // -------------------------------------------------------------------------
  console.log('\n🔹 7. Menguji Live Deployment di Vercel (https://groceries-mr-rian.vercel.app/)');
  try {
    const vRes = await fetch('https://groceries-mr-rian.vercel.app/');
    assert(vRes.status === 200, 'Vercel Deployment aktif dan mengembalikan HTTP 200 OK');
    const vHtml = await vRes.text();
    
    // Verifikasi Elemen Kunci di HTML
    assert(vHtml.includes('Smart Grocery & Budget Safety Tracker'), 'Title dan branding aplikasi terpasang di Vercel');
    assert(vHtml.includes('manifest.json'), 'PWA manifest.json terhubung di HTML Vercel');
    assert(vHtml.includes('safety-cap-card'), 'Komponen Safety Cap Budget Card ada di DOM Vercel');
    assert(vHtml.includes('floating-bottom-nav'), 'Floating Bottom Navigation Bar ada di DOM Vercel');
    assert(vHtml.includes('itemModalSheet'), 'Bottom Sheet Modal Tambah/Edit Barang Belanja ada di DOM Vercel');
    assert(vHtml.includes('checkoutModalBackdrop'), 'Modal Struk Checkout Digital ada di DOM Vercel');
    assert(vHtml.includes('cloudRealtimeBadge'), 'Indikator Realtime Cloud Firestore terpasang di DOM Vercel');

    // Uji Manifest PWA di Vercel
    const mRes = await fetch('https://groceries-mr-rian.vercel.app/manifest.json');
    assert(mRes.status === 200, 'File PWA manifest.json dapat diakses publik (HTTP 200)');
    const manifestJson = await mRes.json();
    assert(manifestJson.name === 'Smart Grocery & Budget Safety Tracker', 'Nama PWA di manifest sesuai');
    assert(manifestJson.display === 'standalone', 'PWA display mode adalah standalone (seperti aplikasi native)');

    // Uji Service Worker PWA di Vercel
    const swRes = await fetch('https://groceries-mr-rian.vercel.app/sw.js');
    assert(swRes.status === 200, 'Service Worker sw.js untuk offline caching aktif di Vercel (HTTP 200)');
  } catch (err) {
    assert(false, 'Gagal menghubungi Vercel: ' + err.message);
  }

  console.log('\n===============================================================');
  console.log(`📊 HASIL PENGUJIAN: ${passed} LULUS, ${failed} GAGAL`);
  console.log('===============================================================');
  
  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests();
