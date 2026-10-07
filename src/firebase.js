// Firebase & Cloud Firestore Integration Module for groceriesmrrian

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc,
  writeBatch,
  serverTimestamp 
} from 'firebase/firestore';

const FIREBASE_CONFIG_KEY = 'smart_grocery_firebase_config_v1';

// Default base config for project groceriesmrrian
export const DEFAULT_PROJECT_ID = 'groceriesmrrian';
export const DEFAULT_DATABASE_URL = 'https://console.firebase.google.com/u/0/project/groceriesmrrian/firestore/databases/-default-/data';

let firebaseApp = null;
let firestoreDb = null;

/**
 * Ambil konfigurasi tersimpan atau default
 */
export function getSavedFirebaseConfig() {
  try {
    const raw = localStorage.getItem(FIREBASE_CONFIG_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading saved firebase config:', e);
  }

  // Fallback template untuk project groceriesmrrian
  return {
    projectId: DEFAULT_PROJECT_ID,
    authDomain: `${DEFAULT_PROJECT_ID}.firebaseapp.com`,
    storageBucket: `${DEFAULT_PROJECT_ID}.firebasestorage.app`,
    apiKey: '',
    appId: ''
  };
}

/**
 * Simpan konfigurasi ke LocalStorage
 */
export function saveFirebaseConfig(config) {
  try {
    localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
    return initFirebase(config);
  } catch (e) {
    console.error('Error saving firebase config:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Inisialisasi Firebase App & Firestore instance
 */
export function initFirebase(config = null) {
  const cfg = config || getSavedFirebaseConfig();

  if (!cfg || !cfg.projectId) {
    return { success: false, error: 'Project ID belum diisi' };
  }

  try {
    // Jika app sudah ada, gunakan yang sudah ada atau buat ulang jika config berubah
    if (getApps().length > 0) {
      firebaseApp = getApp();
    } else {
      // Inisialisasi Firebase App
      firebaseApp = initializeApp(cfg);
    }

    firestoreDb = getFirestore(firebaseApp);
    return { success: true, app: firebaseApp, db: firestoreDb };
  } catch (err) {
    console.error('Firebase initialization error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Cek apakah Firebase sudah siap digunakan
 */
export function isFirebaseReady() {
  if (!firestoreDb) {
    const res = initFirebase();
    return res.success && !!firestoreDb;
  }
  return true;
}

/**
 * 1. Upload Keranjang Belanja Aktif ke Firestore
 * Koleksi: `trolley_items`
 */
export async function syncCartToFirestore(cartItems) {
  if (!isFirebaseReady()) throw new Error('Firebase belum terkonfigurasi');
  
  const batch = writeBatch(firestoreDb);
  const cartCol = collection(firestoreDb, 'trolley_items');

  // Bersihkan dan masukkan ulang item aktif
  // Atau simpan ke satu dokumen aktif `active_cart`
  const activeCartDoc = doc(firestoreDb, 'active_cart', 'current');
  batch.set(activeCartDoc, {
    updatedAt: serverTimestamp(),
    itemCount: cartItems.length,
    items: cartItems
  });

  await batch.commit();
  return { success: true, count: cartItems.length };
}

/**
 * 2. Upload Riwayat Belanja ke Firestore
 * Koleksi: `shopping_history`
 */
export async function syncHistoryToFirestore(historyList) {
  if (!isFirebaseReady()) throw new Error('Firebase belum terkonfigurasi');

  const batch = writeBatch(firestoreDb);

  for (const item of historyList) {
    const docRef = doc(firestoreDb, 'shopping_history', item.id);
    batch.set(docRef, {
      ...item,
      syncedAt: serverTimestamp()
    });
  }

  await batch.commit();
  return { success: true, count: historyList.length };
}

/**
 * 3. Upload Database Patokan Harga ke Firestore
 * Koleksi: `price_database`
 */
export async function syncPriceDBToFirestore(priceDB) {
  if (!isFirebaseReady()) throw new Error('Firebase belum terkonfigurasi');

  const batch = writeBatch(firestoreDb);

  // Simpan kumpulan harga ke dokumen `catalog/all` dan individual docs
  const catalogDoc = doc(firestoreDb, 'price_database', 'all_items');
  batch.set(catalogDoc, {
    updatedAt: serverTimestamp(),
    items: priceDB
  });

  await batch.commit();
  return { success: true };
}

/**
 * 4. Upload Pengaturan Anggaran ke Firestore
 * Koleksi: `settings/budget`
 */
export async function syncBudgetToFirestore(budgetLimit) {
  if (!isFirebaseReady()) throw new Error('Firebase belum terkonfigurasi');

  const budgetDoc = doc(firestoreDb, 'settings', 'budget');
  await setDoc(budgetDoc, {
    budgetLimit: Number(budgetLimit),
    updatedAt: serverTimestamp()
  });

  return { success: true };
}

/**
 * SINKRONISASI LENGKAP SEMUA DATA KE FIRESTORE (Push All)
 */
export async function syncAllToFirestore(data) {
  if (!isFirebaseReady()) {
    throw new Error('Firebase belum terinisialisasi. Pastikan API Key telah diisi.');
  }

  const results = {};

  // Sync Cart
  if (data.cart) {
    results.cart = await syncCartToFirestore(data.cart);
  }

  // Sync History
  if (data.history) {
    results.history = await syncHistoryToFirestore(data.history);
  }

  // Sync Price DB
  if (data.priceDB) {
    results.priceDB = await syncPriceDBToFirestore(data.priceDB);
  }

  // Sync Budget
  if (data.budget) {
    results.budget = await syncBudgetToFirestore(data.budget);
  }

  return { success: true, results };
}

/**
 * TARIK SEMUA DATA DARI FIRESTORE (Pull All)
 */
export async function pullAllFromFirestore() {
  if (!isFirebaseReady()) {
    throw new Error('Firebase belum terinisialisasi.');
  }

  const pulled = {};

  // Pull Active Cart
  try {
    const cartSnapshot = await getDocs(collection(firestoreDb, 'active_cart'));
    cartSnapshot.forEach((docSnap) => {
      if (docSnap.id === 'current' && docSnap.data().items) {
        pulled.cart = docSnap.data().items;
      }
    });
  } catch (e) {
    console.warn('Gagal menarik troli dari firestore:', e);
  }

  // Pull History
  try {
    const histSnapshot = await getDocs(collection(firestoreDb, 'shopping_history'));
    const histList = [];
    histSnapshot.forEach((docSnap) => {
      histList.push({ id: docSnap.id, ...docSnap.data() });
    });
    if (histList.length > 0) {
      pulled.history = histList;
    }
  } catch (e) {
    console.warn('Gagal menarik riwayat dari firestore:', e);
  }

  // Pull Price DB
  try {
    const priceDoc = await getDocs(collection(firestoreDb, 'price_database'));
    priceDoc.forEach((docSnap) => {
      if (docSnap.id === 'all_items' && docSnap.data().items) {
        pulled.priceDB = docSnap.data().items;
      }
    });
  } catch (e) {
    console.warn('Gagal menarik database harga dari firestore:', e);
  }

  // Pull Budget Setting
  try {
    const budgetDoc = await getDocs(collection(firestoreDb, 'settings'));
    budgetDoc.forEach((docSnap) => {
      if (docSnap.id === 'budget' && docSnap.data().budgetLimit) {
        pulled.budget = docSnap.data().budgetLimit;
      }
    });
  } catch (e) {
    console.warn('Gagal menarik anggaran dari firestore:', e);
  }

  return pulled;
}
