/**
 * Safe localStorage helpers.
 *
 * Raw `localStorage` calls throw in several ordinary situations — a full
 * quota (documents with inlined content fill the ~5 MB budget quickly),
 * Safari private mode, or disabled site data. An unguarded `setItem` inside
 * a React effect turns any of those into a blank page, so every access here
 * is wrapped and reports failure as a value instead of an exception.
 */

/** Keys used by the app, kept in one place so pages can share libraries. */
export const STORAGE_KEYS = {
  ragDocuments: 'ragDocuments',
  ragChatHistory: 'ragChatHistory',
  fullRagDocuments: 'fullRagDocuments',
  fullRagChatHistory: 'fullRagChatHistory',
  chatMessages: 'chatMessages',
} as const;

export interface StorageWriteResult {
  ok: boolean;
  /** Why the write failed; undefined when `ok` is true. */
  reason?: 'quota' | 'unavailable';
  error?: unknown;
}

/** True when localStorage exists and is usable in this environment. */
export function isStorageAvailable(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    const probe = '__ptt_tbi_probe__';
    localStorage.setItem(probe, probe);
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/** Detect a quota error across browsers (name and legacy numeric codes differ). */
function isQuotaError(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false;
  return (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error.code === 22 ||
    error.code === 1014
  );
}

/**
 * Read and JSON-parse a key. Returns `fallback` when the key is missing,
 * unavailable, or holds corrupt JSON — corrupt entries never throw.
 */
export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`Failed to read "${key}" from localStorage:`, error);
    return fallback;
  }
}

/** JSON-serialize and store a value, reporting failure instead of throwing. */
export function writeJSON(key: string, value: unknown): StorageWriteResult {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (error) {
    console.error(`Failed to write "${key}" to localStorage:`, error);
    return {
      ok: false,
      reason: isQuotaError(error) ? 'quota' : 'unavailable',
      error,
    };
  }
}

/** Remove a key, ignoring unavailable storage. */
export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to remove "${key}" from localStorage:`, error);
  }
}

/**
 * Convert an ISO date string back into a Date.
 * Returns undefined for missing or unparseable values, so a corrupt
 * timestamp yields `undefined` rather than an `Invalid Date`.
 */
export function reviveDate(value: unknown): Date | undefined {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Same as `reviveDate` but always returns a Date, defaulting to the epoch-safe `new Date()`. */
export function reviveDateOr(value: unknown, fallback: Date = new Date()): Date {
  return reviveDate(value) ?? fallback;
}
