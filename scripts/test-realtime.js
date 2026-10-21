// Test Real-Time Synchronization between two simulated devices (Phone vs Laptop)
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAo4plASM883EG8KIP30S5fX0gVgQRLenM",
  authDomain: "groceriesmrrian.firebaseapp.com",
  projectId: "groceriesmrrian",
  storageBucket: "groceriesmrrian.firebasestorage.app",
  messagingSenderId: "48991159633",
  appId: "1:48991159633:web:a04b23365de729e22eff70"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testRealtimeSync() {
  console.log('🔄 Memulai simulasi Real-Time onSnapshot (Device A [HP] -> Device B [Laptop])...\n');

  const testDocRef = doc(db, 'active_cart', 'current');
  const uniqueItemName = `Indomie Goreng Realtime ${Date.now()}`;

  // 1. Setup onSnapshot di Device B (Laptop)
  let receivedOnDeviceB = false;

  const unsubscribe = onSnapshot(testDocRef, (snapshot) => {
    if (!snapshot.exists()) return;
    const data = snapshot.data();
    console.log(`📱 [Device B / Laptop] onSnapshot menerima update! Total item: ${data.items?.length || 0}`);
    const found = data.items?.some(it => it.name === uniqueItemName);
    if (found) {
      console.log(`✨ [Device B / Laptop] Item baru "${uniqueItemName}" TERDETEKSI SECARA REAL-TIME!`);
      receivedOnDeviceB = true;
    }
  });

  // Tunggu 1 detik agar listener stabil
  await new Promise(r => setTimeout(r, 1000));

  // 2. Simulasikan Device A (HP) menambahkan barang ke troli
  console.log(`\n📲 [Device A / HP] Menambahkan barang baru: "${uniqueItemName}"...`);
  const newItem = {
    id: 'cart-' + Date.now(),
    name: uniqueItemName,
    category: 'Mie & Instan',
    unit: 'pcs',
    price: 3500,
    qty: 5,
    discount: '',
    discountType: 'percent',
    note: 'Uji sinkronisasi realtime hp ke laptop'
  };

  await setDoc(testDocRef, {
    updatedAt: serverTimestamp(),
    device: 'Phone-Test',
    items: [newItem]
  });

  // 3. Tunggu hingga onSnapshot di Device B terpanggil
  let waited = 0;
  while (!receivedOnDeviceB && waited < 10) {
    await new Promise(r => setTimeout(r, 500));
    waited++;
  }

  unsubscribe();

  if (receivedOnDeviceB) {
    console.log('\n🎉 SUKSES! onSnapshot berhasil merefleksikan penambahan barang secara instan antar perangkat!');
    process.exit(0);
  } else {
    console.error('\n❌ GAGAL: onSnapshot tidak menerima perubahan dalam waktu yang ditentukan.');
    process.exit(1);
  }
}

testRealtimeSync();
