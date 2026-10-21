// Comprehensive Real-Time & Backend Integration Verification Script
import { 
  FIREBASE_CONFIG, 
  subscribeToCart, 
  saveCartToFirestore, 
  subscribeToBudget, 
  saveBudgetToFirestore, 
  subscribeToPriceDB, 
  savePriceDBToFirestore,
  subscribeToHistory,
  saveHistoryEntryToFirestore
} from '../src/firebase.js';
import fs from 'fs';
import path from 'path';

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

async function runTests() {
  console.log('====================================================================');
  console.log('🔥 UJI INTEGRASI BACKEND & REAL-TIME ONSNAPSHOT CLOUD FIRESTORE');
  console.log('====================================================================\n');

  // 1. Verifikasi Konfigurasi Firebase Tertanam di Backend (src/firebase.js)
  console.log('🔹 1. Memeriksa Konfigurasi Firebase di Backend');
  assert(FIREBASE_CONFIG.apiKey === "AIzaSyAo4plASM883EG8KIP30S5fX0gVgQRLenM", 'API Key resmi groceriesmrrian tertanam langsung di backend');
  assert(FIREBASE_CONFIG.projectId === "groceriesmrrian", 'Project ID sesuai: groceriesmrrian');
  assert(FIREBASE_CONFIG.appId === "1:48991159633:web:a04b23365de729e22eff70", 'App ID sesuai');

  // 2. Verifikasi UI Aplikasi Bebas dari Input Manual / Modal Kunci
  console.log('\n🔹 2. Memeriksa Penghapusan UI Konfigurasi Manual di index.html');
  const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf-8');
  assert(!indexHtml.includes('id="firebaseModalBackdrop"'), 'Modal input kunci firebaseModalBackdrop telah DIHAPUS dari aplikasi');
  assert(!indexHtml.includes('id="inputFbApiKey"'), 'Input manual Web API Key telah DIHAPUS dari aplikasi');
  assert(!indexHtml.includes('id="btnConfigFirebase"'), 'Tombol pengaturan kunci manual telah DIHAPUS dari aplikasi');
  assert(indexHtml.includes('cloud-realtime-badge'), 'Indikator LIVE realtime sync terpasang di header aplikasi');
  assert(indexHtml.includes('Live onSnapshot'), 'Status Live onSnapshot terpasang di tab Anggaran');

  // 3. Uji Real-Time onSnapshot: Simulasi HP Menambah Barang -> Terlihat di Laptop
  console.log('\n🔹 3. Menguji Real-Time onSnapshot: HP Tambah Barang -> Muncul di Laptop');
  const testItemName = `Kecap Manis Refill ${Date.now()}`;
  let receivedInLaptop = false;

  const unsubCart = subscribeToCart((items) => {
    const found = items.some(it => it.name === testItemName);
    if (found) {
      receivedInLaptop = true;
    }
  });

  // Tunggu sejenak agar listener onSnapshot aktif
  await new Promise(r => setTimeout(r, 1200));

  // Simulasikan HP melakukan push item ke Firestore
  const testCartPayload = [
    {
      id: 'cart-test-' + Date.now(),
      name: testItemName,
      category: 'Bumbu & Dapur',
      unit: 'pack',
      price: 18500,
      qty: 2,
      discount: '10',
      discountType: 'percent',
      note: 'Dites secara realtime'
    }
  ];

  await saveCartToFirestore(testCartPayload);

  // Tunggu kedatangan data di listener Laptop
  let timeout = 0;
  while (!receivedInLaptop && timeout < 10) {
    await new Promise(r => setTimeout(r, 500));
    timeout++;
  }

  assert(receivedInLaptop, `onSnapshot mendeteksi "${testItemName}" secara instan antar-perangkat`);
  unsubCart();

  // 4. Uji Real-Time onSnapshot: Simulasi Laptop Ubah Batas Budget -> Terlihat di HP
  console.log('\n🔹 4. Menguji Real-Time onSnapshot: Perubahan Batas Anggaran (Safety Cap)');
  const newBudgetTarget = 750000;
  let budgetUpdatedOnPhone = false;

  const unsubBudget = subscribeToBudget((budgetVal) => {
    if (budgetVal === newBudgetTarget) {
      budgetUpdatedOnPhone = true;
    }
  });

  await new Promise(r => setTimeout(r, 800));
  await saveBudgetToFirestore(newBudgetTarget);

  let budgetTimeout = 0;
  while (!budgetUpdatedOnPhone && budgetTimeout < 10) {
    await new Promise(r => setTimeout(r, 500));
    budgetTimeout++;
  }

  assert(budgetUpdatedOnPhone, `onSnapshot mendeteksi perubahan budget (Rp ${newBudgetTarget}) secara instan`);
  unsubBudget();

  // 5. Kembalikan data default agar troli tetap rapi untuk demo
  console.log('\n🔹 5. Merapikan data demo default');
  await saveBudgetToFirestore(500000);

  console.log('\n====================================================================');
  console.log(`📊 HASIL PENGUJIAN: ${passed} LULUS, ${failed} GAGAL`);
  console.log('====================================================================');

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runTests();
