import { createIcons, icons } from 'lucide';
import { formatRp, parseRp, calculateDiscount, comparePrice, getBudgetStatus } from './math.js';
import { storage, CATEGORIES, COMMON_UNITS, normalizeProductName } from './storage.js';
import { 
  getSavedFirebaseConfig, 
  saveFirebaseConfig, 
  initFirebase, 
  isFirebaseReady, 
  syncAllToFirestore, 
  pullAllFromFirestore,
  DEFAULT_PROJECT_ID 
} from './firebase.js';

// Application State
const state = {
  cart: [],
  budgetLimit: 500000,
  history: [],
  priceDB: {},
  currentTab: 'view-shopping',
  editingItemId: null,
  deferredPwaPrompt: null
};

// ==========================================================================
// INITIALIZATION
// ==========================================================================

function initApp() {
  // Load state from local storage
  state.cart = storage.getCart();
  state.budgetLimit = storage.getBudget();
  state.history = storage.getHistory();
  state.priceDB = storage.getPriceDB();

  // Setup DOM Event Listeners
  setupNavigation();
  setupHeaderControls();
  setupCartEvents();
  setupItemModal();
  setupCheckoutModal();
  setupBudgetView();
  setupFirebaseControls();
  setupPwa();
  startLiveClock();

  // Render All Views
  renderAll();

  // Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('PWA ServiceWorker registered with scope:', reg.scope);
      }).catch((err) => {
        console.warn('PWA ServiceWorker registration failed:', err);
      });
    });
  }
}

// Refresh Lucide Icons whenever DOM updates
function refreshIcons() {
  createIcons({ icons });
}

// ==========================================================================
// RENDERERS
// ==========================================================================

function renderAll() {
  renderSafetyBudgetHeader();
  renderCartList();
  renderHistoryList();
  renderDbItemsList();
  refreshIcons();
}

/**
 * F-05: Render Sticky Header Safety Cap Budget Bar
 */
function renderSafetyBudgetHeader() {
  let totalOriginal = 0;
  let totalFinal = 0;
  let totalSavings = 0;

  state.cart.forEach(item => {
    const qty = Number(item.qty) || 1;
    const price = Number(item.price) || 0;
    const disc = calculateDiscount(price, item.discount, item.discountType);
    totalOriginal += price * qty;
    totalFinal += disc.finalUnitPrice * qty;
    totalSavings += disc.discountPerUnit * qty;
  });

  const budgetStatus = getBudgetStatus(totalFinal, state.budgetLimit);

  // Update DOM Elements
  const headerTotalSpent = document.getElementById('headerTotalSpent');
  const headerRemainingAmount = document.getElementById('headerRemainingAmount');
  const headerBudgetPercent = document.getElementById('headerBudgetPercent');
  const headerBudgetCapDisplay = document.getElementById('headerBudgetCapDisplay');
  const budgetProgressFill = document.getElementById('budgetProgressFill');
  const safetyBadge = document.getElementById('safetyBadge');
  const safetyBadgeText = document.getElementById('safetyBadgeText');
  const safetyAdviceText = document.getElementById('safetyAdviceText');
  const safetyCapCard = document.getElementById('safetyCapCard');
  const cartTotalItemsCount = document.getElementById('cartTotalItemsCount');
  const bottomNavBadge = document.getElementById('bottomNavBadge');
  const cartSavingsSummary = document.getElementById('cartSavingsSummary');
  const cartTotalSavingsText = document.getElementById('cartTotalSavingsText');

  headerTotalSpent.textContent = formatRp(totalFinal);
  headerBudgetCapDisplay.textContent = `Batas: ${formatRp(state.budgetLimit)}`;
  headerBudgetPercent.textContent = `${budgetStatus.percentage}%`;

  if (budgetStatus.remaining >= 0) {
    headerRemainingAmount.textContent = `Sisa Dompet: ${formatRp(budgetStatus.remaining)}`;
  } else {
    headerRemainingAmount.textContent = `LEBIH LIMIT: ${formatRp(Math.abs(budgetStatus.remaining))}`;
  }

  // Progress Bar
  budgetProgressFill.style.width = `${budgetStatus.clampedPercent}%`;
  budgetProgressFill.className = `progress-fill ${budgetStatus.status}`;

  // Card Alert Classes (Pulsing Red on Over-budget)
  safetyCapCard.className = `safety-cap-card budget-${budgetStatus.status}`;
  safetyBadge.className = `safety-badge ${budgetStatus.status}`;
  safetyBadgeText.textContent = budgetStatus.levelName;
  safetyAdviceText.className = `safety-alert-text ${budgetStatus.status}`;
  safetyAdviceText.textContent = budgetStatus.message;

  // Cart Counts
  const totalItemCount = state.cart.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
  cartTotalItemsCount.textContent = `${totalItemCount} Item (${state.cart.length} Jenis)`;

  // Bottom Nav Badge
  if (state.cart.length > 0) {
    bottomNavBadge.style.display = 'block';
    bottomNavBadge.textContent = state.cart.length;
  } else {
    bottomNavBadge.style.display = 'none';
  }

  // Savings Badge
  if (totalSavings > 0) {
    cartSavingsSummary.style.display = 'flex';
    cartTotalSavingsText.textContent = `Hemat ${formatRp(totalSavings)}`;
  } else {
    cartSavingsSummary.style.display = 'none';
  }

  // Trigger Haptic on Over-Budget (if supported)
  if (budgetStatus.isOver && 'vibrate' in navigator) {
    navigator.vibrate([100, 50, 100]);
  }
}

/**
 * F-01, F-02, F-03, F-04: Render Cart Items in Mobile Card Layout
 */
function renderCartList() {
  const container = document.getElementById('cartItemsContainer');
  const emptyCartBox = document.getElementById('emptyCartBox');
  const cartActionBar = document.getElementById('cartActionBar');
  const cartCountSummary = document.getElementById('cartCountSummary');

  if (state.cart.length === 0) {
    container.innerHTML = '';
    emptyCartBox.style.display = 'block';
    cartActionBar.style.display = 'none';
    cartCountSummary.textContent = 'Troli: 0 Produk';
    return;
  }

  emptyCartBox.style.display = 'none';
  cartActionBar.style.display = 'flex';
  cartCountSummary.textContent = `Troli: ${state.cart.length} Produk`;

  container.innerHTML = state.cart.map(item => {
    const qty = Number(item.qty) || 1;
    const price = Number(item.price) || 0;
    const disc = calculateDiscount(price, item.discount, item.discountType);
    const subtotal = disc.finalUnitPrice * qty;

    // F-04: Komparator Harga vs Bulan Lalu
    const lastPrice = storage.getLastMonthPrice(item.name);
    const comp = comparePrice(price, lastPrice);

    return `
      <article class="cart-item-card" data-id="${item.id}">
        <!-- Header: Nama + Kategori + Satuan -->
        <div class="item-card-header">
          <div class="item-name-group">
            <h3 class="item-name">${escapeHtml(item.name)}</h3>
            <div class="item-tags">
              <span class="category-badge">${escapeHtml(item.category || 'Lainnya')}</span>
              <span class="unit-badge">${escapeHtml(item.unit || 'pcs')}</span>
              ${item.note ? `<span style="font-size:0.68rem; color:var(--text-muted); font-style:italic;">"${escapeHtml(item.note)}"</span>` : ''}
            </div>
          </div>
          
          <!-- F-04: Realtime Comparator Pill -->
          <div class="comparator-pill ${comp.badgeClass}" title="${comp.subText}">
            <i data-lucide="${comp.arrowIcon}"></i>
            <span>${comp.label}</span>
          </div>
        </div>

        <!-- Baris Harga Satuan & Harga Diskon -->
        <div class="item-price-row">
          <div class="unit-price-box">
            ${disc.hasDiscount ? `<span class="original-price-strikethrough">${formatRp(price)}</span>` : ''}
            <span class="final-unit-price">${formatRp(disc.finalUnitPrice)}</span>
            <span class="price-unit-label">/ ${escapeHtml(item.unit || 'pcs')}</span>
          </div>
        </div>

        <!-- F-03: Tiered Discount Breakdown Box -->
        ${disc.hasDiscount ? `
          <div class="discount-breakdown-box">
            <div class="discount-text">
              <i data-lucide="tag" style="width:12px; height:12px;"></i>
              <span>${disc.formulaExplanation}</span>
            </div>
            <span class="discount-saved-amt">Hemat ${formatRp(disc.discountPerUnit * qty)}</span>
          </div>
        ` : ''}

        <!-- Footer: Stepper (F-02) + Subtotal + Tombol Aksi -->
        <div class="item-card-bottom">
          <div class="stepper-container">
            <button type="button" class="stepper-btn btn-step-minus" data-id="${item.id}" aria-label="Kurangi Jumlah">
              <i data-lucide="minus"></i>
            </button>
            <input type="number" class="stepper-value-input item-qty-input" data-id="${item.id}" value="${qty}" min="1" step="1">
            <button type="button" class="stepper-btn btn-step-plus" data-id="${item.id}" aria-label="Tambah Jumlah">
              <i data-lucide="plus"></i>
            </button>
          </div>

          <div class="item-subtotal-group">
            <span class="subtotal-label">Total Baris</span>
            <span class="subtotal-amount">${formatRp(subtotal)}</span>
          </div>

          <div class="item-action-btns">
            <button class="action-mini-btn btn-edit-item" data-id="${item.id}" title="Edit Barang">
              <i data-lucide="edit-2" style="width:15px; height:15px;"></i>
            </button>
            <button class="action-mini-btn btn-delete btn-delete-item" data-id="${item.id}" title="Hapus Barang">
              <i data-lucide="trash-2" style="width:15px; height:15px;"></i>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

/**
 * F-06: Render Tab Riwayat Belanja
 */
function renderHistoryList() {
  const container = document.getElementById('historyListContainer');
  const statsTotalSpent = document.getElementById('statsTotalSpent');
  const statsTotalSaved = document.getElementById('statsTotalSaved');

  const history = state.history;
  let allSpent = 0;
  let allSaved = 0;

  history.forEach(h => {
    allSpent += Number(h.totalFinal) || 0;
    allSaved += Number(h.totalDiscount) || 0;
  });

  statsTotalSpent.textContent = formatRp(allSpent);
  statsTotalSaved.textContent = formatRp(allSaved);

  if (history.length === 0) {
    container.innerHTML = `
      <div class="empty-cart-state">
        <i data-lucide="history" class="empty-cart-icon"></i>
        <h3 style="font-size:1.05rem; font-weight:700; color:#fff;">Belum Ada Riwayat Belanja</h3>
        <p style="font-size:0.8rem; margin-top:4px;">Setelah berbelanja, selesaikan belanja untuk menyimpan transaksi ke sini.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = history.map(item => {
    const itemsRows = (item.items || []).map(it => `
      <tr>
        <td class="name">${escapeHtml(it.name)}</td>
        <td class="qty">${it.qty} ${escapeHtml(it.unit || 'pcs')}</td>
        <td class="price">${formatRp(it.totalLine || (it.price * it.qty))}</td>
      </tr>
    `).join('');

    return `
      <div class="history-card" data-hist-id="${item.id}">
        <div class="history-card-header" data-toggle-hist="${item.id}">
          <div>
            <div class="history-date">${item.displayDate || new Date(item.date).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</div>
            <div class="history-title">${escapeHtml(item.title || 'Belanja Bulanan')}</div>
            <div class="history-items-count">${item.itemCount || (item.items ? item.items.length : 0)} Barang • Hemat ${formatRp(item.totalDiscount || 0)}</div>
          </div>
          <div>
            <div class="history-amount">${formatRp(item.totalFinal)}</div>
            <div style="font-size:0.7rem; color:var(--text-muted); text-align:right;">Lihat Detail ▼</div>
          </div>
        </div>

        <div class="history-card-body" id="histBody-${item.id}">
          <table class="history-items-table">
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div class="history-actions">
            <button class="btn-secondary-sm btn-use-as-baseline" data-hist-id="${item.id}">
              <i data-lucide="bookmark-check" style="width:14px; height:14px;"></i> Pakai sbg Patokan Harga
            </button>
            <button class="btn-secondary-sm btn-delete-history" data-hist-id="${item.id}" style="color:var(--color-danger); flex:0 0 36px; padding:0;">
              <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * F-04 / F-06: Render Reference Price Database Items
 */
function renderDbItemsList(searchQuery = '') {
  const container = document.getElementById('dbItemsListContainer');
  const db = state.priceDB;
  const entries = Object.entries(db);

  const filtered = entries.filter(([key, val]) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    return key.includes(q) || (val.name && val.name.toLowerCase().includes(q));
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:16px; color:var(--text-muted); font-size:0.82rem;">
        Tidak ada data patokan yang sesuai pencarian.
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(([key, item]) => `
    <div class="db-item-row">
      <div>
        <div class="db-item-name">${escapeHtml(item.name || key)}</div>
        <div class="db-item-meta">${escapeHtml(item.category || 'Umum')} • Satuan: ${escapeHtml(item.unit || 'pcs')}</div>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <span class="db-item-price">${formatRp(item.price)}</span>
        <button class="action-mini-btn btn-delete-db-item" data-key="${key}" title="Hapus Patokan" style="width:28px; height:28px;">
          <i data-lucide="trash-2" style="width:13px; height:13px; color:var(--color-danger);"></i>
        </button>
      </div>
    </div>
  `).join('');
}

// ==========================================================================
// NAVIGATION & TABS
// ==========================================================================

function setupNavigation() {
  const navButtons = document.querySelectorAll('.nav-tab-btn');
  const views = document.querySelectorAll('.view-section');
  const fab = document.getElementById('fabQuickAdd');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetViewId = btn.getAttribute('data-tab');
      state.currentTab = targetViewId;

      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      views.forEach(view => {
        if (view.id === targetViewId) {
          view.classList.add('active');
        } else {
          view.classList.remove('active');
        }
      });

      // Show FAB only on Shopping tab
      if (targetViewId === 'view-shopping') {
        fab.style.display = 'flex';
      } else {
        fab.style.display = 'none';
      }

      refreshIcons();
    });
  });
}

// Header & Budget Modal Controls
function setupHeaderControls() {
  const btnOpenBudgetModal = document.getElementById('btnOpenBudgetModal');
  const btnQuickEditBudget = document.getElementById('btnQuickEditBudget');
  const budgetModalBackdrop = document.getElementById('budgetModalBackdrop');
  const btnCloseBudgetModal = document.getElementById('btnCloseBudgetModal');
  const btnSaveModalBudget = document.getElementById('btnSaveModalBudget');
  const inputModalBudget = document.getElementById('inputModalBudget');

  const openBudgetModal = () => {
    inputModalBudget.value = state.budgetLimit;
    budgetModalBackdrop.classList.add('active');
  };

  btnOpenBudgetModal.addEventListener('click', openBudgetModal);
  btnQuickEditBudget.addEventListener('click', openBudgetModal);

  btnCloseBudgetModal.addEventListener('click', () => {
    budgetModalBackdrop.classList.remove('active');
  });

  btnSaveModalBudget.addEventListener('click', () => {
    const val = Number(inputModalBudget.value);
    if (val > 0) {
      state.budgetLimit = val;
      storage.saveBudget(val);
      renderSafetyBudgetHeader();
      budgetModalBackdrop.classList.remove('active');
      showToast('Batas anggaran berhasil diperbarui!', 'success');
    }
  });

  // Preset chips in modal
  budgetModalBackdrop.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const preset = chip.getAttribute('data-preset');
      if (preset) {
        inputModalBudget.value = preset;
      }
    });
  });

  // Help / PWA Info Modal
  document.getElementById('btnHelpPwa').addEventListener('click', () => {
    showToast('Aplikasi PWA Siap! Tambahkan ke Home Screen untuk mode offline.', 'success');
  });
}

// ==========================================================================
// CART INTERACTIONS (F-01, F-02, F-06)
// ==========================================================================

function setupCartEvents() {
  const container = document.getElementById('cartItemsContainer');

  // Delegated events for Cart Items: Stepper buttons, delete, edit
  container.addEventListener('click', (e) => {
    const stepPlus = e.target.closest('.btn-step-plus');
    const stepMinus = e.target.closest('.btn-step-minus');
    const deleteBtn = e.target.closest('.btn-delete-item');
    const editBtn = e.target.closest('.btn-edit-item');

    if (stepPlus) {
      const id = stepPlus.getAttribute('data-id');
      updateCartItemQty(id, 1);
    } else if (stepMinus) {
      const id = stepMinus.getAttribute('data-id');
      updateCartItemQty(id, -1);
    } else if (deleteBtn) {
      const id = deleteBtn.getAttribute('data-id');
      deleteCartItem(id);
    } else if (editBtn) {
      const id = editBtn.getAttribute('data-id');
      openEditItemModal(id);
    }
  });

  // Direct quantity input change
  container.addEventListener('change', (e) => {
    if (e.target.classList.contains('item-qty-input')) {
      const id = e.target.getAttribute('data-id');
      const val = Math.max(1, parseInt(e.target.value, 10) || 1);
      setCartItemQty(id, val);
    }
  });

  // Empty cart button
  document.getElementById('btnClearCart').addEventListener('click', () => {
    if (confirm('Kosongkan semua barang di troli?')) {
      state.cart = [];
      storage.saveCart(state.cart);
      renderAll();
      showToast('Troli telah dikosongkan.', 'warning');
    }
  });

  // Add first button on empty state
  document.getElementById('btnEmptyAdd').addEventListener('click', () => {
    openAddItemModal();
  });

  // FAB button
  document.getElementById('fabQuickAdd').addEventListener('click', () => {
    openAddItemModal();
  });
}

function updateCartItemQty(id, delta) {
  const item = state.cart.find(it => it.id === id);
  if (!item) return;
  const newQty = (Number(item.qty) || 1) + delta;
  if (newQty <= 0) {
    deleteCartItem(id);
  } else {
    item.qty = newQty;
    storage.saveCart(state.cart);
    renderAll();
  }
}

function setCartItemQty(id, exactQty) {
  const item = state.cart.find(it => it.id === id);
  if (!item) return;
  item.qty = Math.max(1, exactQty);
  storage.saveCart(state.cart);
  renderAll();
}

function deleteCartItem(id) {
  state.cart = state.cart.filter(it => it.id !== id);
  storage.saveCart(state.cart);
  renderAll();
  showToast('Barang dihapus dari troli', 'warning');
}

// ==========================================================================
// ITEM MODAL: ADD & EDIT (F-01, F-02, F-03, F-04)
// ==========================================================================

function setupItemModal() {
  const modalBackdrop = document.getElementById('itemModalBackdrop');
  const btnClose = document.getElementById('btnCloseItemModal');
  const itemForm = document.getElementById('itemForm');

  const inputName = document.getElementById('inputItemName');
  const inputPrice = document.getElementById('inputItemPrice');
  const inputQty = document.getElementById('inputItemQty');
  const inputDiscount = document.getElementById('inputItemDiscount');
  const selectDiscountType = document.getElementById('selectDiscountType');
  const inputCategory = document.getElementById('inputItemCategory');
  const inputUnit = document.getElementById('inputItemUnit');
  const inputNote = document.getElementById('inputItemNote');
  const editItemId = document.getElementById('editItemId');

  const modalQtyMinus = document.getElementById('modalQtyMinus');
  const modalQtyPlus = document.getElementById('modalQtyPlus');

  // Render Category Selector Pills
  const catSelector = document.getElementById('categoryPillSelector');
  catSelector.innerHTML = CATEGORIES.map(cat => `
    <span class="pill-option ${cat.id === 'Bahan Pokok' ? 'selected' : ''}" data-cat="${cat.id}">
      ${cat.label}
    </span>
  `).join('');

  catSelector.addEventListener('click', (e) => {
    const pill = e.target.closest('.pill-option');
    if (pill) {
      catSelector.querySelectorAll('.pill-option').forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
      inputCategory.value = pill.getAttribute('data-cat');
    }
  });

  // Unit Selector Pills
  const unitSelector = document.getElementById('unitPillSelector');
  unitSelector.addEventListener('click', (e) => {
    const pill = e.target.closest('.pill-option');
    if (pill) {
      unitSelector.querySelectorAll('.pill-option').forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
      inputUnit.value = pill.getAttribute('data-unit');
      updateModalLiveCalculations();
    }
  });

  // Quick Preset Chips click
  document.querySelectorAll('.quick-suggest-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      inputName.value = chip.getAttribute('data-name');
      const cat = chip.getAttribute('data-cat');
      const unit = chip.getAttribute('data-unit');
      const price = chip.getAttribute('data-price');

      if (cat) {
        inputCategory.value = cat;
        catSelector.querySelectorAll('.pill-option').forEach(p => {
          p.classList.toggle('selected', p.getAttribute('data-cat') === cat);
        });
      }
      if (unit) {
        inputUnit.value = unit;
        unitSelector.querySelectorAll('.pill-option').forEach(p => {
          p.classList.toggle('selected', p.getAttribute('data-unit') === unit);
        });
      }
      if (price && !inputPrice.value) {
        inputPrice.value = price;
      }
      updateModalLiveCalculations();
    });
  });

  // Steppers in Modal
  modalQtyMinus.addEventListener('click', () => {
    const curr = Math.max(1, parseInt(inputQty.value, 10) || 1);
    if (curr > 1) {
      inputQty.value = curr - 1;
      updateModalLiveCalculations();
    }
  });
  modalQtyPlus.addEventListener('click', () => {
    const curr = Math.max(1, parseInt(inputQty.value, 10) || 1);
    inputQty.value = curr + 1;
    updateModalLiveCalculations();
  });

  // Quick discount buttons in modal
  document.querySelectorAll('.btn-discount-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const disc = btn.getAttribute('data-disc');
      inputDiscount.value = disc;
      selectDiscountType.value = 'percent';
      updateModalLiveCalculations();
    });
  });

  // Live input events for Realtime Calculation (F-02, F-03, F-04)
  inputName.addEventListener('input', updateModalLiveCalculations);
  inputPrice.addEventListener('input', updateModalLiveCalculations);
  inputQty.addEventListener('input', updateModalLiveCalculations);
  inputDiscount.addEventListener('input', updateModalLiveCalculations);
  selectDiscountType.addEventListener('change', updateModalLiveCalculations);

  // Close modal
  btnClose.addEventListener('click', () => {
    modalBackdrop.classList.remove('active');
  });

  // Form Submit
  itemForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = inputName.value.trim();
    const price = Number(inputPrice.value) || 0;
    const qty = Math.max(1, parseInt(inputQty.value, 10) || 1);
    const discount = inputDiscount.value.trim();
    const discountType = selectDiscountType.value;
    const category = inputCategory.value || 'Lainnya';
    const unit = inputUnit.value || 'pcs';
    const note = inputNote.value.trim();

    if (!name || price <= 0) {
      showToast('Mohon masukkan nama produk dan harga yang valid.', 'warning');
      return;
    }

    if (state.editingItemId) {
      // Update existing item
      const item = state.cart.find(it => it.id === state.editingItemId);
      if (item) {
        item.name = name;
        item.price = price;
        item.qty = qty;
        item.discount = discount;
        item.discountType = discountType;
        item.category = category;
        item.unit = unit;
        item.note = note;
      }
      showToast('Barang belanja berhasil diperbarui!', 'success');
    } else {
      // Add new item
      const newItem = {
        id: 'cart-' + Date.now(),
        name,
        price,
        qty,
        discount,
        discountType,
        category,
        unit,
        note
      };
      state.cart.push(newItem);
      showToast(`"${name}" masuk ke troli!`, 'success');
    }

    storage.saveCart(state.cart);
    renderAll();
    modalBackdrop.classList.remove('active');
  });
}

function openAddItemModal() {
  state.editingItemId = null;
  document.getElementById('itemModalTitle').textContent = 'Tambah Barang Belanja';
  document.getElementById('btnSubmitItemText').textContent = 'Masukkan ke Troli Belanja';
  document.getElementById('editItemId').value = '';
  document.getElementById('itemForm').reset();
  document.getElementById('inputItemQty').value = '1';
  document.getElementById('inputItemCategory').value = 'Bahan Pokok';
  document.getElementById('inputItemUnit').value = 'pcs';

  // Reset category selectors
  const catSelector = document.getElementById('categoryPillSelector');
  catSelector.querySelectorAll('.pill-option').forEach(p => {
    p.classList.toggle('selected', p.getAttribute('data-cat') === 'Bahan Pokok');
  });

  const unitSelector = document.getElementById('unitPillSelector');
  unitSelector.querySelectorAll('.pill-option').forEach(p => {
    p.classList.toggle('selected', p.getAttribute('data-unit') === 'pcs');
  });

  updateModalLiveCalculations();
  document.getElementById('itemModalBackdrop').classList.add('active');
  document.getElementById('inputItemName').focus();
  refreshIcons();
}

function openEditItemModal(id) {
  const item = state.cart.find(it => it.id === id);
  if (!item) return;

  state.editingItemId = id;
  document.getElementById('itemModalTitle').textContent = 'Edit Barang Belanja';
  document.getElementById('btnSubmitItemText').textContent = 'Simpan Perubahan';
  document.getElementById('editItemId').value = id;

  document.getElementById('inputItemName').value = item.name;
  document.getElementById('inputItemPrice').value = item.price;
  document.getElementById('inputItemQty').value = item.qty;
  document.getElementById('inputItemDiscount').value = item.discount || '';
  document.getElementById('selectDiscountType').value = item.discountType || 'percent';
  document.getElementById('inputItemCategory').value = item.category || 'Bahan Pokok';
  document.getElementById('inputItemUnit').value = item.unit || 'pcs';
  document.getElementById('inputItemNote').value = item.note || '';

  // Select pill options
  const catSelector = document.getElementById('categoryPillSelector');
  catSelector.querySelectorAll('.pill-option').forEach(p => {
    p.classList.toggle('selected', p.getAttribute('data-cat') === item.category);
  });

  const unitSelector = document.getElementById('unitPillSelector');
  unitSelector.querySelectorAll('.pill-option').forEach(p => {
    p.classList.toggle('selected', p.getAttribute('data-unit') === item.unit);
  });

  updateModalLiveCalculations();
  document.getElementById('itemModalBackdrop').classList.add('active');
  refreshIcons();
}

/**
 * Live updates for Modal: F-02 (Qty calculation), F-03 (Discount calculation), F-04 (Price comparison)
 */
function updateModalLiveCalculations() {
  const name = document.getElementById('inputItemName').value.trim();
  const price = Number(document.getElementById('inputItemPrice').value) || 0;
  const qty = Math.max(1, parseInt(document.getElementById('inputItemQty').value, 10) || 1);
  const discount = document.getElementById('inputItemDiscount').value.trim();
  const discountType = document.getElementById('selectDiscountType').value;
  const unit = document.getElementById('inputItemUnit').value || 'pcs';

  // F-03: Kalkulator Diskon
  const disc = calculateDiscount(price, discount, discountType);
  const discountCalcPreview = document.getElementById('discountCalcPreview');
  if (disc.hasDiscount) {
    discountCalcPreview.innerHTML = `
      ✓ ${disc.formulaExplanation}<br>
      Harga Bersih Satuan: <strong>${formatRp(disc.finalUnitPrice)}</strong> (Hemat ${formatRp(disc.discountPerUnit * qty)})
    `;
  } else {
    discountCalcPreview.textContent = `Tanpa diskon. Harga bersih: ${formatRp(price)} / ${unit}`;
  }

  // F-04: Komparator Harga Realtime vs Bulan Lalu
  const lastPrice = storage.getLastMonthPrice(name);
  const comp = comparePrice(price, lastPrice);
  const modalComparatorText = document.getElementById('modalComparatorText');
  const modalComparatorBadge = document.getElementById('modalComparatorBadge');
  const modalComparatorBadgeText = document.getElementById('modalComparatorBadgeText');

  modalComparatorText.textContent = comp.subText;
  modalComparatorBadge.className = `comparator-pill ${comp.badgeClass}`;
  modalComparatorBadgeText.textContent = comp.label;

  // F-02: Total Baris Item
  const totalLine = disc.finalUnitPrice * qty;
  document.getElementById('modalRowFormula').textContent = `${qty} ${unit} × ${formatRp(disc.finalUnitPrice)}`;
  document.getElementById('modalRowSubtotal').textContent = formatRp(totalLine);

  refreshIcons();
}

// ==========================================================================
// CHECKOUT & DIGITAL RECEIPT (F-06)
// ==========================================================================

function setupCheckoutModal() {
  const btnCheckout = document.getElementById('btnCheckout');
  const checkoutBackdrop = document.getElementById('checkoutModalBackdrop');
  const btnClose = document.getElementById('btnCloseCheckoutModal');
  const btnConfirmSaveReceipt = document.getElementById('btnConfirmSaveReceipt');

  btnCheckout.addEventListener('click', () => {
    if (state.cart.length === 0) {
      showToast('Troli masih kosong!', 'warning');
      return;
    }
    openCheckoutReceipt();
  });

  btnClose.addEventListener('click', () => {
    checkoutBackdrop.classList.remove('active');
  });

  btnConfirmSaveReceipt.addEventListener('click', () => {
    saveCheckoutToHistory();
    checkoutBackdrop.classList.remove('active');
  });
}

function openCheckoutReceipt() {
  const container = document.getElementById('receiptItemsContainer');
  const receiptDateString = document.getElementById('receiptDateString');
  const receiptOriginalTotal = document.getElementById('receiptOriginalTotal');
  const receiptTotalSavings = document.getElementById('receiptTotalSavings');
  const receiptGrandTotal = document.getElementById('receiptGrandTotal');
  const receiptBudgetVerdict = document.getElementById('receiptBudgetVerdict');

  const now = new Date();
  receiptDateString.textContent = now.toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  let originalSum = 0;
  let finalSum = 0;
  let savingsSum = 0;

  container.innerHTML = state.cart.map(item => {
    const qty = Number(item.qty) || 1;
    const price = Number(item.price) || 0;
    const disc = calculateDiscount(price, item.discount, item.discountType);
    const lineTotal = disc.finalUnitPrice * qty;

    originalSum += price * qty;
    finalSum += lineTotal;
    savingsSum += disc.discountPerUnit * qty;

    return `
      <div class="receipt-item-row">
        <span>${escapeHtml(item.name)} (${qty}x)</span>
        <span>${formatRp(lineTotal)}</span>
      </div>
    `;
  }).join('');

  receiptOriginalTotal.textContent = formatRp(originalSum);
  receiptTotalSavings.textContent = `- ${formatRp(savingsSum)}`;
  receiptGrandTotal.textContent = formatRp(finalSum);

  const budgetStatus = getBudgetStatus(finalSum, state.budgetLimit);
  if (budgetStatus.isOver) {
    receiptBudgetVerdict.innerHTML = `<span style="color:#ef4444; font-weight:bold;">⚠️ Status: OVER BUDGET! Melebihi limit ${formatRp(Math.abs(budgetStatus.remaining))}</span>`;
  } else {
    receiptBudgetVerdict.innerHTML = `<span style="color:#059669; font-weight:bold;">✓ Status: ${budgetStatus.levelName} (Sisa ${formatRp(budgetStatus.remaining)})</span>`;
  }

  document.getElementById('checkoutModalBackdrop').classList.add('active');
  refreshIcons();
}

function saveCheckoutToHistory() {
  let originalSum = 0;
  let finalSum = 0;
  let savingsSum = 0;

  const itemsDetail = state.cart.map(item => {
    const qty = Number(item.qty) || 1;
    const price = Number(item.price) || 0;
    const disc = calculateDiscount(price, item.discount, item.discountType);
    const totalLine = disc.finalUnitPrice * qty;
    originalSum += price * qty;
    finalSum += totalLine;
    savingsSum += disc.discountPerUnit * qty;

    return {
      name: item.name,
      category: item.category,
      unit: item.unit,
      qty,
      price,
      discount: item.discount,
      finalUnitPrice: disc.finalUnitPrice,
      totalLine
    };
  });

  const now = new Date();
  const monthName = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const receiptTitle = `Belanja Bulanan Kos - ${monthName}`;

  const historyEntry = {
    id: 'hist-' + Date.now(),
    date: now.toISOString(),
    displayDate: now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
    title: receiptTitle,
    budgetLimit: state.budgetLimit,
    itemCount: state.cart.length,
    totalOriginal: originalSum,
    totalDiscount: savingsSum,
    totalFinal: finalSum,
    status: finalSum <= state.budgetLimit ? 'safe' : 'danger',
    items: itemsDetail
  };

  // Add to history
  state.history.unshift(historyEntry);
  storage.saveHistory(state.history);

  // F-06: Automatically update database patokan harga for next month
  storage.updatePriceDBFromCart(state.cart);
  state.priceDB = storage.getPriceDB();

  // Clear cart
  state.cart = [];
  storage.saveCart(state.cart);

  renderAll();
  showToast('Belanja selesai disimpan & patokan harga diperbarui!', 'success');

  // Auto-sync to Firebase Cloud Firestore if configured
  if (isFirebaseReady()) {
    syncAllToFirestore({
      cart: state.cart,
      history: state.history,
      priceDB: state.priceDB,
      budget: state.budgetLimit
    }).then(() => {
      showToast('☁️ Data belanja berhasil disinkronkan ke Cloud Firestore!', 'success');
      updateCloudStatusBadge('connected');
    }).catch(err => {
      console.warn('Background sync failed:', err);
    });
  }
}

// ==========================================================================
// HISTORY ACTIONS (F-06)
// ==========================================================================

document.getElementById('historyListContainer').addEventListener('click', (e) => {
  // Toggle accordion card details
  const header = e.target.closest('.history-card-header');
  if (header) {
    const histId = header.getAttribute('data-toggle-hist');
    const body = document.getElementById(`histBody-${histId}`);
    if (body) {
      body.classList.toggle('open');
    }
    return;
  }

  // Set as baseline button
  const baselineBtn = e.target.closest('.btn-use-as-baseline');
  if (baselineBtn) {
    const histId = baselineBtn.getAttribute('data-hist-id');
    const entry = state.history.find(h => h.id === histId);
    if (entry && entry.items) {
      storage.updatePriceDBFromCart(entry.items);
      state.priceDB = storage.getPriceDB();
      renderAll();
      showToast(`Harga dari transaksi "${entry.title}" dijadikan patokan komparator!`, 'success');
    }
    return;
  }

  // Delete history item
  const delBtn = e.target.closest('.btn-delete-history');
  if (delBtn) {
    const histId = delBtn.getAttribute('data-hist-id');
    if (confirm('Hapus transaksi riwayat ini?')) {
      state.history = state.history.filter(h => h.id !== histId);
      storage.saveHistory(state.history);
      renderAll();
      showToast('Riwayat dihapus.', 'warning');
    }
  }
});

// ==========================================================================
// TAB 3: ANGGARAN & DATABASE CONFIGURATION (F-05 & F-06)
// ==========================================================================

function setupBudgetView() {
  const inputBudgetSetting = document.getElementById('inputBudgetSetting');
  const btnSaveBudgetSetting = document.getElementById('btnSaveBudgetSetting');
  const inputSearchDb = document.getElementById('inputSearchDb');
  const btnAddNewDbItem = document.getElementById('btnAddNewDbItem');

  inputBudgetSetting.value = state.budgetLimit;

  // Save budget from tab
  btnSaveBudgetSetting.addEventListener('click', () => {
    const val = Number(inputBudgetSetting.value);
    if (val > 0) {
      state.budgetLimit = val;
      storage.saveBudget(val);
      renderSafetyBudgetHeader();
      showToast(`Batas dompet berhasil disetel ke ${formatRp(val)}!`, 'success');
    }
  });

  // Budget preset chips in tab
  document.querySelectorAll('#view-budget .preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const preset = chip.getAttribute('data-preset');
      if (preset) {
        inputBudgetSetting.value = preset;
      }
    });
  });

  // Search DB items
  inputSearchDb.addEventListener('input', (e) => {
    renderDbItemsList(e.target.value);
    refreshIcons();
  });

  // Delete DB item
  document.getElementById('dbItemsListContainer').addEventListener('click', (e) => {
    const delBtn = e.target.closest('.btn-delete-db-item');
    if (delBtn) {
      const key = delBtn.getAttribute('data-key');
      const db = storage.getPriceDB();
      delete db[key];
      storage.savePriceDB(db);
      state.priceDB = db;
      renderDbItemsList(inputSearchDb.value);
      renderSafetyBudgetHeader();
      renderCartList();
      refreshIcons();
      showToast('Patokan harga dihapus.', 'warning');
    }
  });

  // Add new DB item Modal
  const dbModalBackdrop = document.getElementById('dbItemModalBackdrop');
  const btnCloseDbModal = document.getElementById('btnCloseDbItemModal');
  const dbItemForm = document.getElementById('dbItemForm');

  btnAddNewDbItem.addEventListener('click', () => {
    dbItemForm.reset();
    dbModalBackdrop.classList.add('active');
  });

  btnCloseDbModal.addEventListener('click', () => {
    dbModalBackdrop.classList.remove('active');
  });

  dbItemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('inputDbName').value.trim();
    const price = Number(document.getElementById('inputDbPrice').value);
    const unit = document.getElementById('inputDbUnit').value.trim() || 'pcs';

    if (name && price > 0) {
      const db = storage.getPriceDB();
      const key = normalizeProductName(name);
      db[key] = {
        name,
        price,
        unit,
        category: 'Umum',
        updatedAt: new Date().toISOString()
      };
      storage.savePriceDB(db);
      state.priceDB = db;
      renderDbItemsList();
      renderCartList();
      dbModalBackdrop.classList.remove('active');
      showToast(`Patokan harga "${name}" disimpan!`, 'success');
    }
  });

  // Export Data JSON
  document.getElementById('btnExportData').addEventListener('click', () => {
    const jsonStr = storage.exportData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart_grocery_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Cadangan data berhasil diunduh!', 'success');
  });

  // Import Data JSON
  const fileImportInput = document.getElementById('fileImportInput');
  document.getElementById('btnImportTrigger').addEventListener('click', () => {
    fileImportInput.click();
  });

  fileImportInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = storage.importData(event.target.result);
      if (result.success) {
        state.cart = storage.getCart();
        state.budgetLimit = storage.getBudget();
        state.history = storage.getHistory();
        state.priceDB = storage.getPriceDB();
        renderAll();
        showToast('Data berhasil dipulihkan (Restore)!', 'success');
      } else {
        showToast('Gagal memulihkan file: ' + result.error, 'danger');
      }
    };
    reader.readAsText(file);
  });

  // Reset to Demo Defaults
  document.getElementById('btnResetDefaults').addEventListener('click', () => {
    if (confirm('Kembalikan semua data ke contoh bawaan anak rantau?')) {
      storage.resetToDefaults();
      state.cart = storage.getCart();
      state.budgetLimit = storage.getBudget();
      state.history = storage.getHistory();
      state.priceDB = storage.getPriceDB();
      renderAll();
      showToast('Data dikembalikan ke pengaturan demo awal.', 'success');
    }
  });
}

// ==========================================================================
// FIREBASE CLOUD FIRESTORE SYNC (groceriesmrrian)
// ==========================================================================

function updateCloudStatusBadge(status = 'default') {
  const badge = document.getElementById('cloudStatusBadge');
  if (!badge) return;

  if (status === 'connected') {
    badge.className = 'cloud-status-badge connected';
    badge.textContent = 'Cloud Terhubung ✓';
  } else if (status === 'syncing') {
    badge.className = 'cloud-status-badge syncing';
    badge.textContent = 'Menyinkronkan...';
  } else if (status === 'error') {
    badge.className = 'cloud-status-badge error';
    badge.textContent = 'Koneksi Gagal';
  } else {
    const isReady = isFirebaseReady();
    if (isReady) {
      badge.className = 'cloud-status-badge connected';
      badge.textContent = 'Cloud Terhubung ✓';
    } else {
      badge.className = 'cloud-status-badge';
      badge.textContent = 'Perlu Setup Kunci';
    }
  }
}

function setupFirebaseControls() {
  const btnOpenHeader = document.getElementById('btnOpenFirebaseModal');
  const btnConfig = document.getElementById('btnConfigFirebase');
  const modalBackdrop = document.getElementById('firebaseModalBackdrop');
  const btnClose = document.getElementById('btnCloseFirebaseModal');
  const form = document.getElementById('firebaseConfigForm');
  const inputApiKey = document.getElementById('inputFbApiKey');
  const inputAppId = document.getElementById('inputFbAppId');
  const inputRaw = document.getElementById('inputFbRawConfig');
  const btnSync = document.getElementById('btnSyncToCloud');
  const btnPull = document.getElementById('btnPullFromCloud');
  const btnQuickUpload = document.getElementById('btnQuickUploadAllFirestore');

  // Pre-fill existing config
  const currentConfig = getSavedFirebaseConfig();
  if (currentConfig) {
    if (currentConfig.apiKey) inputApiKey.value = currentConfig.apiKey;
    if (currentConfig.appId) inputAppId.value = currentConfig.appId;
  }

  // Open modal
  const openModal = () => {
    modalBackdrop.classList.add('active');
    refreshIcons();
  };
  if (btnOpenHeader) btnOpenHeader.addEventListener('click', openModal);
  if (btnConfig) btnConfig.addEventListener('click', openModal);

  // Close modal
  if (btnClose) {
    btnClose.addEventListener('click', () => {
      modalBackdrop.classList.remove('active');
    });
  }

  // Handle Form Submit
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      let apiKey = inputApiKey.value.trim();
      let appId = inputAppId.value.trim();
      const rawText = inputRaw.value.trim();

      // Check if user pasted raw config object
      if (rawText) {
        const apiKeyMatch = rawText.match(/apiKey:\s*["']([^"']+)["']/);
        const appIdMatch = rawText.match(/appId:\s*["']([^"']+)["']/);
        if (apiKeyMatch && apiKeyMatch[1]) apiKey = apiKeyMatch[1];
        if (appIdMatch && appIdMatch[1]) appId = appIdMatch[1];
      }

      if (!apiKey) {
        showToast('Mohon masukkan Web API Key dari Project Settings Firebase Anda.', 'warning');
        return;
      }

      const newConfig = {
        projectId: DEFAULT_PROJECT_ID,
        authDomain: `${DEFAULT_PROJECT_ID}.firebaseapp.com`,
        storageBucket: `${DEFAULT_PROJECT_ID}.firebasestorage.app`,
        apiKey,
        appId
      };

      const result = saveFirebaseConfig(newConfig);
      if (result.success) {
        showToast('Konfigurasi Firebase disimpan! Menguji koneksi...', 'success');
        updateCloudStatusBadge('syncing');

        // Test connection by pushing current state
        try {
          await syncAllToFirestore({
            cart: state.cart,
            history: state.history,
            priceDB: state.priceDB,
            budget: state.budgetLimit
          });
          updateCloudStatusBadge('connected');
          showToast('✓ Berhasil terhubung ke Cloud Firestore groceriesmrrian!', 'success');
          modalBackdrop.classList.remove('active');
        } catch (err) {
          console.error('Firestore connection test error:', err);
          updateCloudStatusBadge('error');
          showToast('Koneksi gagal: ' + (err.message || 'Periksa aturan Firestore Security Rules'), 'danger');
        }
      } else {
        showToast('Gagal inisialisasi: ' + result.error, 'danger');
      }
    });
  }

  // Sync / Push button
  const triggerSync = async () => {
    if (!isFirebaseReady()) {
      showToast('Firebase belum terkonfigurasi. Buka pengaturan kunci.', 'warning');
      openModal();
      return;
    }

    updateCloudStatusBadge('syncing');
    showToast('Mengunggah data ke Firestore...', 'warning');

    try {
      await syncAllToFirestore({
        cart: state.cart,
        history: state.history,
        priceDB: state.priceDB,
        budget: state.budgetLimit
      });
      updateCloudStatusBadge('connected');
      showToast('✓ Data berhasil masuk ke Cloud Firestore groceriesmrrian!', 'success');
    } catch (err) {
      console.error('Sync failed:', err);
      updateCloudStatusBadge('error');
      showToast('Gagal sinkronisasi: ' + err.message, 'danger');
    }
  };

  if (btnSync) btnSync.addEventListener('click', triggerSync);
  if (btnQuickUpload) btnQuickUpload.addEventListener('click', triggerSync);

  // Pull button
  if (btnPull) {
    btnPull.addEventListener('click', async () => {
      if (!isFirebaseReady()) {
        showToast('Firebase belum terkonfigurasi.', 'warning');
        openModal();
        return;
      }

      updateCloudStatusBadge('syncing');
      showToast('Mengambil data dari Firestore...', 'warning');

      try {
        const cloudData = await pullAllFromFirestore();
        if (cloudData.cart) {
          state.cart = cloudData.cart;
          storage.saveCart(state.cart);
        }
        if (cloudData.history) {
          state.history = cloudData.history;
          storage.saveHistory(state.history);
        }
        if (cloudData.priceDB) {
          state.priceDB = cloudData.priceDB;
          storage.savePriceDB(state.priceDB);
        }
        if (cloudData.budget) {
          state.budgetLimit = cloudData.budget;
          storage.saveBudget(state.budgetLimit);
        }

        renderAll();
        updateCloudStatusBadge('connected');
        showToast('✓ Data dari Cloud Firestore berhasil ditarik ke aplikasi!', 'success');
      } catch (err) {
        console.error('Pull failed:', err);
        updateCloudStatusBadge('error');
        showToast('Gagal menarik data: ' + err.message, 'danger');
      }
    });
  }

  // Initial badge check
  updateCloudStatusBadge();
}

// ==========================================================================
// PWA INSTALLATION & UTILS
// ==========================================================================

function setupPwa() {
  const pwaBanner = document.getElementById('pwaInstallBanner');
  const btnInstall = document.getElementById('btnInstallPwa');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    state.deferredPwaPrompt = e;
    pwaBanner.style.display = 'flex';
  });

  btnInstall.addEventListener('click', async () => {
    if (!state.deferredPwaPrompt) {
      showToast('Buka menu browser dan pilih "Add to Home screen" / "Install"', 'warning');
      return;
    }
    state.deferredPwaPrompt.prompt();
    const { outcome } = await state.deferredPwaPrompt.userChoice;
    if (outcome === 'accepted') {
      pwaBanner.style.display = 'none';
      showToast('Aplikasi berhasil dipasang ke beranda!', 'success');
    }
    state.deferredPwaPrompt = null;
  });
}

function startLiveClock() {
  const clockEl = document.getElementById('liveClock');
  const update = () => {
    const d = new Date();
    clockEl.textContent = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
  };
  update();
  setInterval(update, 10000);
}

// Toast System
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast-msg ${type}`;

  const iconName = type === 'success' ? 'check-circle' : type === 'warning' ? 'alert-triangle' : 'alert-circle';
  toast.innerHTML = `
    <i data-lucide="${iconName}" style="width:18px; height:18px; flex-shrink:0;"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  refreshIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initApp);
