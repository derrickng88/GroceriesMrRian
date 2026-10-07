// Penyimpanan Data Terpusat & Model State

const STORAGE_KEYS = {
  CART: 'smart_grocery_cart_v1',
  BUDGET: 'smart_grocery_budget_v1',
  HISTORY: 'smart_grocery_history_v1',
  PRICE_DB: 'smart_grocery_price_db_v1',
  ACTIVE_PRESET: 'smart_grocery_preset_init_v1'
};

// Preset default patokan harga bulan lalu (Realistis untuk anak kos / rantau di supermarket)
export const DEFAULT_PRICE_DB = {
  "beras ramos 5kg": { name: "Beras Ramos 5kg", price: 72000, unit: "pack", category: "Bahan Pokok" },
  "telur ayam 1kg": { name: "Telur Ayam 1kg", price: 28000, unit: "kg", category: "Telur & Lauk" },
  "minyak goreng 2l": { name: "Minyak Goreng 2L", price: 37000, unit: "pack", category: "Bahan Pokok" },
  "indomie goreng": { name: "Indomie Goreng", price: 3100, unit: "pcs", category: "Mie & Instan" },
  "susu uht 1l": { name: "Susu UHT 1L", price: 19500, unit: "pcs", category: "Minuman & Susu" },
  "sabun cuci piring 780ml": { name: "Sabun Cuci Piring 780ml", price: 14500, unit: "pack", category: "Cuci & Pembersih" },
  "deterjen bubuk 800g": { name: "Deterjen Bubuk 800g", price: 22000, unit: "pack", category: "Cuci & Pembersih" },
  "sabun mandi cair 450ml": { name: "Sabun Mandi Cair 450ml", price: 25000, unit: "pack", category: "Sabun & Mandi" },
  "kopi sachet 1 renceng": { name: "Kopi Sachet 1 Renceng", price: 15000, unit: "pack", category: "Minuman & Susu" },
  "nugget ayam 500g": { name: "Nugget Ayam 500g", price: 45000, unit: "pack", category: "Telur & Lauk" },
  "pasta gigi 225g": { name: "Pasta Gigi 225g", price: 16500, unit: "pcs", category: "Sabun & Mandi" },
  "shampo botol 170ml": { name: "Shampo Botol 170ml", price: 24000, unit: "botol", category: "Sabun & Mandi" },
  "tepung terigu 1kg": { name: "Tepung Terigu 1kg", price: 13000, unit: "kg", category: "Bahan Pokok" },
  "kecap manis 520ml": { name: "Kecap Manis 520ml", price: 19000, unit: "pack", category: "Bumbu & Dapur" },
  "biskuit kaleng / snack": { name: "Biskuit Kaleng / Snack", price: 18000, unit: "pcs", category: "Camilan" }
};

// Item belanja awal realistis di troli saat mahasiswa belanja
export const DEFAULT_INITIAL_CART = [
  {
    id: 'cart-1',
    name: 'Beras Ramos 5kg',
    category: 'Bahan Pokok',
    unit: 'pack',
    price: 74000, // naik dibanding bulan lalu (72.000) -> panah merah naik
    qty: 1,
    discount: '',
    discountType: 'percent',
    note: 'Kebutuhan pokok kos 1 bulan'
  },
  {
    id: 'cart-2',
    name: 'Telur Ayam 1kg',
    category: 'Telur & Lauk',
    unit: 'kg',
    price: 26000, // turun dibanding bulan lalu (28.000) -> panah hijau turun (promo!)
    qty: 2,
    discount: '10', // diskon tunggal 10%
    discountType: 'percent',
    note: 'Sumber protein harian'
  },
  {
    id: 'cart-3',
    name: 'Minyak Goreng 2L',
    category: 'Bahan Pokok',
    unit: 'pack',
    price: 37000, // sama persis (37.000) -> stabil
    qty: 1,
    discount: '',
    discountType: 'percent',
    note: 'Untuk masak lauk kos'
  },
  {
    id: 'cart-4',
    name: 'Sabun Mandi Cair 450ml',
    category: 'Sabun & Mandi',
    unit: 'pack',
    price: 28000,
    qty: 1,
    discount: '50+20', // diskon bertingkat 50% + 20%!
    discountType: 'percent',
    note: 'Promo supermarket akhir pekan'
  },
  {
    id: 'cart-5',
    name: 'Indomie Goreng',
    category: 'Mie & Instan',
    unit: 'pcs',
    price: 3100, // stabil
    qty: 10,
    discount: '',
    discountType: 'percent',
    note: 'Stok darurat akhir bulan'
  }
];

// Riwayat belanja bulan lalu (September 2026) untuk verifikasi F-06
export const DEFAULT_INITIAL_HISTORY = [
  {
    id: 'hist-sep-2026',
    date: '2026-09-05T14:30:00.000Z',
    displayDate: '05 September 2026',
    title: 'Belanja Bulanan Kos - September 2026',
    budgetLimit: 500000,
    itemCount: 8,
    totalOriginal: 432000,
    totalDiscount: 36000,
    totalFinal: 396000,
    status: 'safe',
    items: [
      { name: 'Beras Ramos 5kg', category: 'Bahan Pokok', unit: 'pack', qty: 1, price: 72000, discount: '', finalUnitPrice: 72000, totalLine: 72000 },
      { name: 'Telur Ayam 1kg', category: 'Telur & Lauk', unit: 'kg', qty: 2, price: 28000, discount: '', finalUnitPrice: 28000, totalLine: 56000 },
      { name: 'Minyak Goreng 2L', category: 'Bahan Pokok', unit: 'pack', qty: 1, price: 37000, discount: '', finalUnitPrice: 37000, totalLine: 37000 },
      { name: 'Indomie Goreng', category: 'Mie & Instan', unit: 'pcs', qty: 20, price: 3100, discount: '', finalUnitPrice: 3100, totalLine: 62000 },
      { name: 'Susu UHT 1L', category: 'Minuman & Susu', unit: 'pcs', qty: 2, price: 19500, discount: '', finalUnitPrice: 19500, totalLine: 39000 },
      { name: 'Sabun Mandi Cair 450ml', category: 'Sabun & Mandi', unit: 'pack', qty: 1, price: 25000, discount: '', finalUnitPrice: 25000, totalLine: 25000 },
      { name: 'Deterjen Bubuk 800g', category: 'Cuci & Pembersih', unit: 'pack', qty: 1, price: 22000, discount: '', finalUnitPrice: 22000, totalLine: 22000 },
      { name: 'Nugget Ayam 500g', category: 'Telur & Lauk', unit: 'pack', qty: 2, price: 45000, discount: '', finalUnitPrice: 41500, totalLine: 83000 }
    ]
  }
];

// Kategori belanja umum
export const CATEGORIES = [
  { id: 'Bahan Pokok', label: 'Bahan Pokok & Sembako', icon: 'wheat', color: '#10b981' },
  { id: 'Telur & Lauk', label: 'Telur, Daging & Lauk', icon: 'egg', color: '#f59e0b' },
  { id: 'Sayur & Buah', label: 'Sayur & Buah', icon: 'apple', color: '#84cc16' },
  { id: 'Mie & Instan', label: 'Mie & Makanan Instan', icon: 'utensils', color: '#ef4444' },
  { id: 'Minuman & Susu', label: 'Minuman & Susu', icon: 'coffee', color: '#06b6d4' },
  { id: 'Sabun & Mandi', label: 'Sabun & Alat Mandi', icon: 'sparkles', color: '#8b5cf6' },
  { id: 'Cuci & Pembersih', label: 'Pembersih & Cuci', icon: 'shield', color: '#3b82f6' },
  { id: 'Bumbu & Dapur', label: 'Bumbu & Dapur', icon: 'flame', color: '#ec4899' },
  { id: 'Camilan', label: 'Camilan & Snack', icon: 'cookie', color: '#d97706' },
  { id: 'Lainnya', label: 'Kebutuhan Lainnya', icon: 'package', color: '#64748b' }
];

export const COMMON_UNITS = ['pcs', 'kg', 'liter', 'pack', 'dus', 'botol', 'kaleng', 'bungkus'];

// Normalisasi nama produk untuk pencocokan harga database
export function normalizeProductName(name) {
  if (!name) return '';
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

class StorageManager {
  constructor() {
    this.init();
  }

  init() {
    if (typeof localStorage === 'undefined') return;
    // Check if initial preset already seeded
    const hasInitialized = localStorage.getItem(STORAGE_KEYS.ACTIVE_PRESET);
    if (!hasInitialized) {
      this.saveCart(DEFAULT_INITIAL_CART);
      this.saveBudget(500000); // 500 ribu budget anak kos standar
      this.saveHistory(DEFAULT_INITIAL_HISTORY);
      this.savePriceDB(DEFAULT_PRICE_DB);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PRESET, 'true');
    }
  }

  getCart() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CART);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed reading cart:', e);
      return [];
    }
  }

  saveCart(cart) {
    try {
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
    } catch (e) {
      console.error('Failed saving cart:', e);
    }
  }

  getBudget() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BUDGET);
      return data ? Number(data) : 500000;
    } catch (e) {
      return 500000;
    }
  }

  saveBudget(budget) {
    try {
      localStorage.setItem(STORAGE_KEYS.BUDGET, budget.toString());
    } catch (e) {
      console.error('Failed saving budget:', e);
    }
  }

  getHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveHistory(history) {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch (e) {
      console.error('Failed saving history:', e);
    }
  }

  getPriceDB() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRICE_DB);
      return data ? JSON.parse(data) : { ...DEFAULT_PRICE_DB };
    } catch (e) {
      return { ...DEFAULT_PRICE_DB };
    }
  }

  savePriceDB(priceDb) {
    try {
      localStorage.setItem(STORAGE_KEYS.PRICE_DB, JSON.stringify(priceDb));
    } catch (e) {
      console.error('Failed saving price DB:', e);
    }
  }

  /**
   * Cari harga bulan lalu berdasarkan nama barang
   * @param {string} productName 
   * @returns {number|null}
   */
  getLastMonthPrice(productName) {
    if (!productName) return null;
    const key = normalizeProductName(productName);
    const db = this.getPriceDB();

    // Exact match
    if (db[key]) {
      return db[key].price;
    }

    // Substring match jika nama mirip (contoh: "Beras Ramos" cocok dengan "Beras Ramos 5kg")
    for (const [dbKey, item] of Object.entries(db)) {
      if (dbKey.includes(key) || key.includes(dbKey)) {
        return item.price;
      }
    }

    return null;
  }

  /**
   * Perbarui database patokan harga dari item keranjang yang baru dibeli
   * @param {Array} items 
   */
  updatePriceDBFromCart(items) {
    const db = this.getPriceDB();
    const nowIso = new Date().toISOString();

    items.forEach(item => {
      const key = normalizeProductName(item.name);
      if (key) {
        db[key] = {
          name: item.name,
          price: item.price,
          unit: item.unit || 'pcs',
          category: item.category || 'Lainnya',
          updatedAt: nowIso
        };
      }
    });

    this.savePriceDB(db);
  }

  // Reset data ke template default awal
  resetToDefaults() {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_PRESET);
    this.saveCart(DEFAULT_INITIAL_CART);
    this.saveBudget(500000);
    this.saveHistory(DEFAULT_INITIAL_HISTORY);
    this.savePriceDB(DEFAULT_PRICE_DB);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PRESET, 'true');
  }

  // Export data ke JSON string
  exportData() {
    return JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      cart: this.getCart(),
      budget: this.getBudget(),
      history: this.getHistory(),
      priceDB: this.getPriceDB()
    }, null, 2);
  }

  // Import data dari JSON string
  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.cart) this.saveCart(data.cart);
      if (data.budget) this.saveBudget(data.budget);
      if (data.history) this.saveHistory(data.history);
      if (data.priceDB) this.savePriceDB(data.priceDB);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

export const storage = new StorageManager();
