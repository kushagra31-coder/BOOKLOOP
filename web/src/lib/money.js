/**
 * Money formatting & conversion utilities.
 * Rule: Money is always stored as integer paise and displayed as Indian Rupees (₹).
 */

/**
 * Converts integer paise to rupees (e.g., 42000 paise -> 420).
 * @param {number} paise
 * @returns {number}
 */
export function paiseToRupees(paise) {
  if (typeof paise !== 'number' || isNaN(paise)) return 0;
  return paise / 100;
}

/**
 * Converts rupees (number or string) to integer paise (e.g., 420 -> 42000).
 * Uses Math.round to avoid floating point precision issues.
 * @param {number|string} rupees
 * @returns {number}
 */
export function rupeesToPaise(rupees) {
  const num = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (typeof num !== 'number' || isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Formats integer paise into a human-readable rupee string (e.g., ₹420).
 * Omits trailing .00 for whole amounts.
 * @param {number} paise
 * @param {object} options
 * @param {boolean} options.showSymbol - whether to include '₹'
 * @returns {string}
 */
export function formatPaise(paise, { showSymbol = true } = {}) {
  if (typeof paise !== 'number' || isNaN(paise)) return showSymbol ? '₹0' : '0';
  const rupees = paise / 100;
  const formatted = rupees % 1 === 0
    ? rupees.toLocaleString('en-IN')
    : rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return showSymbol ? `₹${formatted}` : formatted;
}

