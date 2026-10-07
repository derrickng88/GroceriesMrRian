// Script untuk memasukkan semua data Smart Grocery langsung ke Cloud Firestore (groceriesmrrian)
// Endpoint: https://firestore.googleapis.com/v1/projects/groceriesmrrian/databases/(default)/documents

import { DEFAULT_INITIAL_CART, DEFAULT_INITIAL_HISTORY, DEFAULT_PRICE_DB } from '../src/storage.js';

const PROJECT_ID = 'groceriesmrrian';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Helper untuk mengubah JavaScript object ke format Firestore REST fields
function toFirestoreValue(val) {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === 'string') {
    return { stringValue: val };
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      return { integerValue: val.toString() };
    }
    return { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map(toFirestoreValue)
      }
    };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return {
      mapValue: { fields }
    };
  }
  return { stringValue: String(val) };
}

function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    fields[k] = toFirestoreValue(v);
  }
  return { fields };
}

async function writeDocument(collection, documentId, data, apiKey = '') {
  let url = `${BASE_URL}/${collection}?documentId=${documentId}`;
  if (apiKey) {
    url += `&key=${apiKey}`;
  }

  const payload = toFirestoreFields(data);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const bodyText = await res.text();
  let json;
  try { json = JSON.parse(bodyText); } catch { json = bodyText; }

  // Jika dokumen sudah ada, lakukan PATCH untuk overwrite
  if (res.status === 409 || (json.error && json.error.status === 'ALREADY_EXISTS')) {
    let patchUrl = `${BASE_URL}/${collection}/${documentId}`;
    if (apiKey) patchUrl += `?key=${apiKey}`;
    const patchRes = await fetch(patchUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return { ok: patchRes.ok, status: patchRes.status, data: await patchRes.json() };
  }

  return { ok: res.ok, status: res.status, data: json };
}

export async function uploadAll(apiKey = '') {
  console.log(`\n🚀 Memulai upload data ke Cloud Firestore (${PROJECT_ID})...\n`);

  // 1. Upload Keranjang Belanja Aktif (active_cart/current)
  console.log('1. Mengunggah active_cart/current...');
  const cartResult = await writeDocument('active_cart', 'current', {
    updatedAt: new Date().toISOString(),
    itemCount: DEFAULT_INITIAL_CART.length,
    items: DEFAULT_INITIAL_CART
  }, apiKey);
  console.log(`   Status: ${cartResult.status} (${cartResult.ok ? 'SUKSES ✓' : 'GAGAL ✗'})`);
  if (!cartResult.ok) console.log('   Pesan:', cartResult.data?.error?.message || cartResult.data);

  // 2. Upload Riwayat Belanja (shopping_history)
  console.log('\n2. Mengunggah shopping_history...');
  for (const hist of DEFAULT_INITIAL_HISTORY) {
    const histResult = await writeDocument('shopping_history', hist.id, hist, apiKey);
    console.log(`   - Dokumen ${hist.id}: ${histResult.status} (${histResult.ok ? 'SUKSES ✓' : 'GAGAL ✗'})`);
  }

  // 3. Upload Database Patokan Harga (price_database/all_items)
  console.log('\n3. Mengunggah price_database/all_items...');
  const priceResult = await writeDocument('price_database', 'all_items', {
    updatedAt: new Date().toISOString(),
    totalProducts: Object.keys(DEFAULT_PRICE_DB).length,
    items: DEFAULT_PRICE_DB
  }, apiKey);
  console.log(`   Status: ${priceResult.status} (${priceResult.ok ? 'SUKSES ✓' : 'GAGAL ✗'})`);

  // 4. Upload Pengaturan Anggaran (settings/budget)
  console.log('\n4. Mengunggah settings/budget...');
  const budgetResult = await writeDocument('settings', 'budget', {
    budgetLimit: 500000,
    currency: 'IDR',
    updatedAt: new Date().toISOString()
  }, apiKey);
  console.log(`   Status: ${budgetResult.status} (${budgetResult.ok ? 'SUKSES ✓' : 'GAGAL ✗'})`);

  return { cartResult, priceResult, budgetResult };
}

const argKey = process.argv[2] || '';
uploadAll(argKey);
