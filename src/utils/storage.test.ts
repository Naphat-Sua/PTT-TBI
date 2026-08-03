import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isStorageAvailable,
  readJSON,
  removeItem,
  reviveDate,
  reviveDateOr,
  writeJSON,
} from './storage';

/** Minimal in-memory localStorage stand-in. */
function installMockStorage(overrides: Partial<Storage> = {}) {
  const store = new Map<string, string>();
  const mock: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => void store.delete(key),
    setItem: (key: string, value: string) => void store.set(key, value),
    ...overrides,
  };
  vi.stubGlobal('localStorage', mock);
  return store;
}

/** A DOMException that browsers raise when the quota is exhausted. */
function quotaError() {
  return new DOMException('exceeded the quota', 'QuotaExceededError');
}

beforeEach(() => {
  installMockStorage();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('readJSON', () => {
  it('round-trips a stored value', () => {
    writeJSON('key', { a: 1, b: ['x'] });
    expect(readJSON('key', null)).toEqual({ a: 1, b: ['x'] });
  });

  it('returns the fallback for a missing key', () => {
    expect(readJSON('nope', 'fallback')).toBe('fallback');
  });

  it('returns the fallback for corrupt JSON instead of throwing', () => {
    localStorage.setItem('broken', '{not valid json');
    expect(readJSON('broken', [])).toEqual([]);
  });

  it('returns the fallback when storage throws', () => {
    installMockStorage({
      getItem: () => {
        throw new Error('storage disabled');
      },
    });
    expect(readJSON('any', 'fallback')).toBe('fallback');
  });
});

describe('writeJSON', () => {
  it('reports success for a normal write', () => {
    expect(writeJSON('key', { ok: true })).toEqual({ ok: true });
  });

  it('reports a quota failure instead of throwing', () => {
    installMockStorage({
      setItem: () => {
        throw quotaError();
      },
    });
    const result = writeJSON('key', { big: 'payload' });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('quota');
  });

  it('reports an unavailable failure for non-quota errors', () => {
    installMockStorage({
      setItem: () => {
        throw new Error('access denied');
      },
    });
    const result = writeJSON('key', {});
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('unavailable');
  });

  it('never throws even when storage is entirely missing', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(() => writeJSON('key', {})).not.toThrow();
    expect(writeJSON('key', {}).ok).toBe(false);
  });
});

describe('removeItem', () => {
  it('deletes a key', () => {
    writeJSON('key', 1);
    removeItem('key');
    expect(readJSON('key', 'gone')).toBe('gone');
  });

  it('swallows errors from unavailable storage', () => {
    installMockStorage({
      removeItem: () => {
        throw new Error('nope');
      },
    });
    expect(() => removeItem('key')).not.toThrow();
  });
});

describe('isStorageAvailable', () => {
  it('is true for working storage', () => {
    expect(isStorageAvailable()).toBe(true);
  });

  it('is false when writes throw', () => {
    installMockStorage({
      setItem: () => {
        throw quotaError();
      },
    });
    expect(isStorageAvailable()).toBe(false);
  });
});

describe('reviveDate', () => {
  it('parses ISO strings into Dates', () => {
    const date = reviveDate('2024-05-01T10:00:00.000Z');
    expect(date).toBeInstanceOf(Date);
    expect(date?.toISOString()).toBe('2024-05-01T10:00:00.000Z');
  });

  it('passes through valid Date instances', () => {
    const input = new Date('2024-01-01');
    expect(reviveDate(input)).toBe(input);
  });

  it('returns undefined for unparseable or missing values', () => {
    expect(reviveDate('not a date')).toBeUndefined();
    expect(reviveDate(undefined)).toBeUndefined();
    expect(reviveDate(null)).toBeUndefined();
    expect(reviveDate(new Date('garbage'))).toBeUndefined();
  });
});

describe('reviveDateOr', () => {
  it('falls back to the supplied default', () => {
    const fallback = new Date('2020-01-01');
    expect(reviveDateOr('nonsense', fallback)).toBe(fallback);
  });

  it('always returns a valid Date', () => {
    expect(Number.isNaN(reviveDateOr(undefined).getTime())).toBe(false);
  });
});
