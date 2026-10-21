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

### Sinkronisasi Otomatis Real-Time (onSnapshot):
1. Seluruh kredensial Firebase telah ditanamkan langsung pada backend aplikasi (`src/firebase.js`).
2. Tidak perlu lagi memasukkan Web API Key atau membuka modal pengaturan secara manual.
3. Aplikasi secara otomatis mendengarkan perubahan data menggunakan **Firestore `onSnapshot`**:
   - Menambah, mengubah, atau menghapus barang di smartphone akan langsung terlihat seketika di laptop atau perangkat lain tanpa perlu refresh.
   - Perubahan batas anggaran (*Safety Cap*) tersinkronisasi secara real-time.
   - Transaksi yang diselesaikan (*checkout*) otomatis masuk ke riwayat dan memperbarui patokan harga bulan depan di seluruh perangkat.