# Smart Grocery & Budget Safety Tracker (Mobile PWA)

Aplikasi Web Mobile PWA bergaya native app untuk siswa rantau yang berbelanja bulanan di supermarket sambil mendorong troli. Dilengkapi pelacak batas anggaran (*Safety Cap*), kalkulator diskon bertingkat, komparator harga real-time vs bulan lalu, dan sinkronisasi ke **Google Cloud Firestore**.

---

## 📱 Standar Mobile UI & Ergonomi
- **Format Layar**: Mobile UI khusus smartphone (maksimal lebar `430px`, centered di desktop).
- **Floating Bottom Navigation Bar**: Tab menu melayang dengan ikon Lucide (**Belanja**, **Riwayat**, **Anggaran**).
- **Ergonomi Troli**: Komponen input angka besar, tombol sentuh ramah jempol (tinggi minimal 48px), stepper kuantitas besar `[-]` & `[+]`, tanpa layout tabel desktop.
- **PWA Ready**: Dilengkapi `manifest.json`, Service Worker `sw.js` (offline caching), dan instruksi *Add to Home Screen*.

---

## 📋 Checklist Spesifikasi Kebutuhan Sistem (SRS)
- **F-01: Pencatatan Item Belanja Lengkap** — Nama, kategori, satuan (kg, liter, pcs, pack), kuantitas, harga satuan, dan quick chips rekomendasi anak rantau.
- **F-02: Perhitungan Kuantitas Otomatis** — Stepper Qty mengubah total baris dan total belanjaan secara instan & real-time.
- **F-03: Kalkulator Diskon Bertingkat** — Menghitung diskon tunggal (contoh: 25%) maupun bertumpuk (contoh: 50% + 20%) dengan rumus matematis akurat ($P \times (1 - d_1/100) \times (1 - d_2/100)$), serta diskon nominal Rp.
- **F-04: Komparator Harga Realtime vs Bulan Lalu** — Indikator seketika saat harga diinput:
  - 🔺 **Panah Merah Naik (↑)**: Jika harga naik dibanding bulan lalu.
  - 🔻 **Panah Hijau Turun (↓)**: Jika harga turun (promo).
  - ➖ **Tanda Setara (=)**: Jika harga stabil/sama.
  - ✨ **Item Baru**: Jika belum ada catatan bulan lalu.
- **F-05: Pengendali Anggaran (Safety Cap)** — Input batas maksimal dompet dengan indikator 4 level (Hijau Safe, Kuning Warning, Oranye Critical, dan Merah Menyala Pulsing Danger saat Over Budget).
- **F-06: Riwayat & Database Belanja** — Struk digital saat checkout, tersimpan ke riwayat bulanan, memperbarui database acuan harga untuk bulan berikutnya, serta fitur Export/Import JSON.

---

## 🔥 Integrasi Google Cloud Firestore (`groceriesmrrian`)

Aplikasi telah terhubung ke database Cloud Firestore proyek Anda:
**URL Konsol:** [Firebase Console Firestore groceriesmrrian](https://console.firebase.google.com/u/0/project/groceriesmrrian/firestore/databases/-default-/data)

### Struktur Koleksi di Firestore:
1. `active_cart/current`: Berisi daftar item yang saat ini ada di troli belanja beserta waktu update.
2. `shopping_history/{id}`: Dokumen transaksi belanja bulanan terdahulu lengkap dengan detail barang, total bayar kasir, dan penghematan diskon.
3. `price_database/all_items`: Database patokan harga supermarket untuk komparator bulan berikutnya.
4. `settings/budget`: Dokumen konfigurasi batas maksimal dompet belanja (*Safety Cap*).

### Cara Menghubungkan & Sinkronkan Data:
1. Buka [Firebase Console Project Settings](https://console.firebase.google.com/u/0/project/groceriesmrrian/settings/general).
2. Di bagian **General**, salin **Web API Key** (atau buat Web App jika belum ada untuk mendapatkan konfigurasi lengkap).
3. Pastikan **Firestore Security Rules** mengizinkan baca/tulis selama pengembangan:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
4. Di aplikasi Smart Grocery:
   - Klik tombol **Awan (☁️)** di header atas atau masuk ke tab **Anggaran** > **Cloud Firestore Sync**.
   - Tempelkan **Web API Key** (atau seluruh kode `firebaseConfig`).
   - Klik **Simpan Konfigurasi & Uji Koneksi** lalu **Sinkronkan Semua Data Sekarang**.
   - Data langsung terunggah ke Cloud Firestore di konsol Firebase Anda!