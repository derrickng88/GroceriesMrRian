// Format Rupiah: 12500 -> "Rp 12.500"
export function formatRp(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Rp 0';
  const rounded = Math.round(amount);
  return 'Rp ' + rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Parse string rupiah to number: "Rp 12.500" -> 12500
export function parseRp(str) {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  const cleaned = str.toString().replace(/[^0-9]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
}

/**
 * F-03: Kalkulator Diskon Bertingkat & Tunggal
 * Mendukung:
 * - Diskon tunggal: "25" atau "25%"
 * - Diskon bertumpuk: "50+20", "50% + 20%", "30 + 10 + 5"
 * - Diskon nominal: jika discountType === 'nominal', misal Rp 5.000
 *
 * @param {number} unitPrice - Harga satuan awal (sebelum diskon)
 * @param {string|number} discountInput - Input teks diskon
 * @param {'percent'|'nominal'} discountType - Tipe diskon
 * @returns {Object} {
 *   originalUnitPrice: number,
 *   finalUnitPrice: number,
 *   discountPerUnit: number,
 *   effectivePercent: number,
 *   tiers: number[], // list tiers eg [50, 20]
 *   rawText: string,
 *   hasDiscount: boolean,
 *   formulaExplanation: string
 * }
 */
export function calculateDiscount(unitPrice, discountInput, discountType = 'percent') {
  const price = Math.max(0, Number(unitPrice) || 0);

  if (!price || !discountInput) {
    return {
      originalUnitPrice: price,
      finalUnitPrice: price,
      discountPerUnit: 0,
      effectivePercent: 0,
      tiers: [],
      rawText: '',
      hasDiscount: false,
      formulaExplanation: 'Tidak ada diskon'
    };
  }

  if (discountType === 'nominal') {
    const nominal = parseRp(discountInput);
    const cappedNominal = Math.min(price, nominal);
    const finalPrice = Math.max(0, price - cappedNominal);
    const effectivePercent = price > 0 ? (cappedNominal / price) * 100 : 0;
    return {
      originalUnitPrice: price,
      finalUnitPrice: finalPrice,
      discountPerUnit: cappedNominal,
      effectivePercent: Number(effectivePercent.toFixed(1)),
      tiers: [],
      rawText: formatRp(cappedNominal),
      hasDiscount: cappedNominal > 0,
      formulaExplanation: `Potongan langsung ${formatRp(cappedNominal)} per item`
    };
  }

  // Persentase (Bisa tunggal atau bertingkat: "50% + 20%" / "50+20")
  const str = discountInput.toString().trim();
  // Pisahkan angka berdasarkan tanda plus (+) atau spasi koma
  const rawParts = str.split(/[+]/).map(p => p.replace(/[^0-9.]/g, '').trim()).filter(Boolean);
  const tiers = rawParts.map(p => Math.min(100, Math.max(0, parseFloat(p) || 0))).filter(p => p > 0);

  if (tiers.length === 0) {
    return {
      originalUnitPrice: price,
      finalUnitPrice: price,
      discountPerUnit: 0,
      effectivePercent: 0,
      tiers: [],
      rawText: str,
      hasDiscount: false,
      formulaExplanation: 'Tidak ada diskon'
    };
  }

  // Hitung diskon bertumpuk secara matematis:
  // P_final = P * (1 - d1/100) * (1 - d2/100) * ...
  let currentMultiplier = 1;
  const stepExplanations = [];

  tiers.forEach((tier, idx) => {
    currentMultiplier *= (1 - tier / 100);
    stepExplanations.push(`${tier}%`);
  });

  const finalUnitPrice = Math.round(price * currentMultiplier);
  const discountPerUnit = price - finalUnitPrice;
  const effectivePercent = Number(((1 - currentMultiplier) * 100).toFixed(1));

  let formulaExplanation = '';
  if (tiers.length === 1) {
    formulaExplanation = `Diskon ${tiers[0]}% (-${formatRp(discountPerUnit)})`;
  } else {
    formulaExplanation = `Diskon bertingkat ${stepExplanations.join(' + ')} (Diskon Efektif: ${effectivePercent}%, Hemat ${formatRp(discountPerUnit)})`;
  }

  return {
    originalUnitPrice: price,
    finalUnitPrice,
    discountPerUnit,
    effectivePercent,
    tiers,
    rawText: stepExplanations.join(' + ') + '%',
    hasDiscount: discountPerUnit > 0,
    formulaExplanation
  };
}

/**
 * F-04: Komparator Harga Realtime vs Bulan Lalu
 * @param {number} currentPrice - Harga saat ini per unit
 * @param {number|null|undefined} lastMonthPrice - Harga bulan lalu per unit
 * @returns {Object}
 */
export function comparePrice(currentPrice, lastMonthPrice) {
  const current = Number(currentPrice) || 0;
  if (lastMonthPrice === undefined || lastMonthPrice === null || isNaN(lastMonthPrice) || lastMonthPrice <= 0) {
    return {
      status: 'new', // Belum ada riwayat
      symbol: '✨',
      diff: 0,
      diffPercent: 0,
      label: 'Item Baru',
      subText: 'Belum ada catatan harga bulan lalu',
      badgeClass: 'badge-new',
      arrowIcon: 'sparkles'
    };
  }

  const last = Number(lastMonthPrice);
  const diff = current - last;
  const diffPercent = Number(((diff / last) * 100).toFixed(1));

  if (diff > 0) {
    return {
      status: 'up', // Naik
      symbol: '↑',
      diff,
      diffPercent: Math.abs(diffPercent),
      label: `+${formatRp(diff)} (+${diffPercent}%)`,
      subText: `Lebih mahal dari bln lalu (${formatRp(last)})`,
      badgeClass: 'badge-up',
      arrowIcon: 'trending-up'
    };
  } else if (diff < 0) {
    return {
      status: 'down', // Turun / Promo
      symbol: '↓',
      diff,
      diffPercent: Math.abs(diffPercent),
      label: `-${formatRp(Math.abs(diff))} (-${Math.abs(diffPercent)}%)`,
      subText: `Lebih hemat dari bln lalu (${formatRp(last)}) - Promo!`,
      badgeClass: 'badge-down',
      arrowIcon: 'trending-down'
    };
  } else {
    return {
      status: 'equal', // Stabil / Sama
      symbol: '=',
      diff: 0,
      diffPercent: 0,
      label: 'Harga Stabil',
      subText: `Sama persis dengan bln lalu (${formatRp(last)})`,
      badgeClass: 'badge-equal',
      arrowIcon: 'minus'
    };
  }
}

/**
 * F-05: Pengendali Anggaran (Safety Cap) Status
 * @param {number} totalSpent - Total belanja saat ini
 * @param {number} budgetLimit - Batas maksimal dompet
 */
export function getBudgetStatus(totalSpent, budgetLimit) {
  const total = Math.max(0, Number(totalSpent) || 0);
  const limit = Math.max(1, Number(budgetLimit) || 1);
  const percentage = Number(((total / limit) * 100).toFixed(1));
  const remaining = limit - total;

  if (percentage >= 100) {
    return {
      status: 'danger',
      levelName: 'OVER BUDGET!',
      color: 'var(--color-danger)',
      percentage,
      clampedPercent: Math.min(100, percentage),
      remaining,
      isOver: true,
      message: `Bahaya! Belanja melampaui limit dompet sebesar ${formatRp(Math.abs(remaining))}. Hapus barang non-esensial!`,
      pillClass: 'budget-danger'
    };
  } else if (percentage >= 90) {
    return {
      status: 'critical',
      levelName: 'SIAP-SIAP REM (90%+)',
      color: 'var(--color-critical)',
      percentage,
      clampedPercent: percentage,
      remaining,
      isOver: false,
      message: `Tersisa ${formatRp(remaining)}. Segera seleksi troli sebelum tembus batas!`,
      pillClass: 'budget-critical'
    };
  } else if (percentage >= 70) {
    return {
      status: 'warning',
      levelName: 'WASPADA (70%+)',
      color: 'var(--color-warning)',
      percentage,
      clampedPercent: percentage,
      remaining,
      isOver: false,
      message: `Tersisa ${formatRp(remaining)}. Perhatikan barang tambahan berikutnya.`,
      pillClass: 'budget-warning'
    };
  } else {
    return {
      status: 'safe',
      levelName: 'ZONA AMAN',
      color: 'var(--color-success)',
      percentage,
      clampedPercent: percentage,
      remaining,
      isOver: false,
      message: `Dompet aman. Sisa saldo belanja: ${formatRp(remaining)}.`,
      pillClass: 'budget-safe'
    };
  }
}
