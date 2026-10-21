// Firebase & Cloud Firestore Integration Module for groceriesmrrian
// Direct Backend Real-Time onSnapshot Integration

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAo4plASM883EG8KIP30S5fX0gVgQRLenM",
  authDomain: "groceriesmrrian.firebaseapp.com",
  projectId: "groceriesmrrian",
  storageBucket: "groceriesmrrian.firebasestorage.app",
  messagingSenderId: "48991159633",
  appId: "1:48991159633:web:a04b23365de729e22eff70"
};

// Inisialisasi Firebase App & Firestore Singleton secara otomatis di backend
const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG);
const firestoreDb = getFirestore(firebaseApp);

export function getDb() {
  return firestoreDb;
}

/**
 * 1. REALTIME CART LISTENER (onSnapshot)
 * Mendengarkan perubahan barang di troli secara langsung dari perangkat manapun
 * @param {Function} callback - Menerima array items terbaru
 */
export function subscribeToCart(callback, onError = null) {
  const docRef = doc(firestoreDb, 'active_cart', 'current');
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.items)) {
        callback(data.items);
      }
    }
  }, (err) => {
    console.warn('onSnapshot active_cart error:', err);
    if (onError) onError(err);
  });
}

/**
 * Simpan seluruh daftar troli belanja ke Firestore (Real-Time Push)
 * @param {Array} items
 */
export async function saveCartToFirestore(items) {
  try {
    const docRef = doc(firestoreDb, 'active_cart', 'current');
    await setDoc(docRef, {
      updatedAt: serverTimestamp(),
      itemCount: items.length,
      items: items
    });
    return { success: true };
  } catch (err) {
    console.error('Gagal menyimpan troli ke Firestore:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 2. REALTIME BUDGET LISTENER (onSnapshot)
 * Mendengarkan perubahan batas dompet belanja (Safety Cap)
 * @param {Function} callback - Menerima nilai batas budget (number)
 */
export function subscribeToBudget(callback, onError = null) {
  const docRef = doc(firestoreDb, 'settings', 'budget');
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      if (data.budgetLimit !== undefined) {
        callback(Number(data.budgetLimit));
      }
    }
  }, (err) => {
    console.warn('onSnapshot settings/budget error:', err);
    if (onError) onError(err);
  });
}

/**
 * Simpan batas dompet belanja ke Firestore
 * @param {number} budgetLimit
 */
export async function saveBudgetToFirestore(budgetLimit) {
  try {
    const docRef = doc(firestoreDb, 'settings', 'budget');
    await setDoc(docRef, {
      budgetLimit: Number(budgetLimit),
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (err) {
    console.error('Gagal menyimpan batas budget ke Firestore:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 3. REALTIME HISTORY LISTENER (onSnapshot)
 * Mendengarkan daftar riwayat transaksi belanja kasir
 * @param {Function} callback - Menerima array histori transaksi terbaru
 */
export function subscribeToHistory(callback, onError = null) {
  const colRef = collection(firestoreDb, 'shopping_history');
  return onSnapshot(colRef, (snap) => {
    const list = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() });
    });
    // Urutkan transaksi dari yang terbaru
    list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    callback(list);
  }, (err) => {
    console.warn('onSnapshot shopping_history error:', err);
    if (onError) onError(err);
  });
}

/**
 * Simpan riwayat transaksi baru ke Firestore
 * @param {Object} entry
 */
export async function saveHistoryEntryToFirestore(entry) {
  try {
    const docRef = doc(firestoreDb, 'shopping_history', entry.id);
    await setDoc(docRef, {
      ...entry,
      syncedAt: serverTimestamp()
    });
    return { success: true };
  } catch (err) {
    console.error('Gagal menyimpan riwayat transaksi ke Firestore:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Hapus transaksi riwayat dari Firestore
 * @param {string} id
 */
export async function deleteHistoryFromFirestore(id) {
  try {
    const docRef = doc(firestoreDb, 'shopping_history', id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err) {
    console.error('Gagal menghapus riwayat dari Firestore:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 4. REALTIME PRICE DB LISTENER (onSnapshot)
 * Mendengarkan database patokan harga supermarket
 * @param {Function} callback - Menerima objek patokan harga { "beras ramos": { ... } }
 */
export function subscribeToPriceDB(callback, onError = null) {
  const docRef = doc(firestoreDb, 'price_database', 'all_items');
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      if (data.items) {
        callback(data.items);
      }
    }
  }, (err) => {
    console.warn('onSnapshot price_database error:', err);
    if (onError) onError(err);
  });
}

/**
 * Simpan database patokan harga ke Firestore
 * @param {Object} priceDB
 */
export async function savePriceDBToFirestore(priceDB) {
  try {
    const docRef = doc(firestoreDb, 'price_database', 'all_items');
    await setDoc(docRef, {
      updatedAt: serverTimestamp(),
      items: priceDB
    });
    return { success: true };
  } catch (err) {
    console.error('Gagal menyimpan database patokan harga ke Firestore:', err);
    return { success: false, error: err.message };
  }
}
