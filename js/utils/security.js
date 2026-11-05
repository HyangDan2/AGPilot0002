/**
 * HD2Lab Todo Master - Security & Sanitization Utilities
 */

/**
 * Generate a cryptographically strong unique ID with optional prefix.
 * @param {string} prefix
 * @returns {string}
 */
export function generateId(prefix = 'todo') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  const extra = Math.random().toString(36).substring(2, 6);
  return `${prefix}_${timestamp}_${randomPart}${extra}`;
}

/**
 * Escapes characters that have special meaning in HTML to prevent XSS.
 * @param {unknown} val
 * @returns {string}
 */
export function escapeHTML(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  const htmlEntities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '`': '&#96;',
    '/': '&#x2F;'
  };
  return str.replace(/[&<>"'`/]/g, char => htmlEntities[char] || char);
}

/**
 * Sanitizes user input text: trims, strips non-printable control characters (except newline/tab),
 * and caps at maxLength.
 * @param {unknown} val
 * @param {number} maxLength
 * @returns {string}
 */
export function sanitizeText(val, maxLength = 500) {
  if (typeof val !== 'string') return '';
  // Remove ASCII control characters 0x00-0x08, 0x0B-0x0C, 0x0E-0x1F, 0x7F
  const cleaned = val.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '').trim();
  if (cleaned.length > maxLength) {
    return cleaned.slice(0, maxLength);
  }
  return cleaned;
}

/**
 * Safely parse JSON without throwing exceptions.
 * @template T
 * @param {string} str
 * @param {T} fallback
 * @returns {any}
 */
export function safeJSONParse(str, fallback = null) {
  if (typeof str !== 'string' || !str.trim()) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}
