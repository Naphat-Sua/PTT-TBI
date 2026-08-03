import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAllDocuments, loadDocuments, loadDocumentsWithContent } from './documentLibrary';
import { STORAGE_KEYS } from './storage';

function installMockStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => void store.delete(key),
    setItem: (key: string, value: string) => void store.set(key, value),
  } satisfies Storage);
  return store;
}

const doc = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name: `${id}.txt`,
  type: 'text/plain',
  size: 10,
  uploadedAt: '2024-05-01T10:00:00.000Z',
  content: `content of ${id}`,
  ...overrides,
});

let store: Map<string, string>;

beforeEach(() => {
  store = installMockStorage();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('loadDocuments', () => {
  it('revives uploadedAt into a Date', () => {
    store.set(STORAGE_KEYS.ragDocuments, JSON.stringify([doc('a')]));
    const [loaded] = loadDocuments(STORAGE_KEYS.ragDocuments);
    expect(loaded.uploadedAt).toBeInstanceOf(Date);
    expect(loaded.uploadedAt.toISOString()).toBe('2024-05-01T10:00:00.000Z');
  });

  it('leaves lastAccessed undefined when absent', () => {
    store.set(STORAGE_KEYS.ragDocuments, JSON.stringify([doc('a')]));
    expect(loadDocuments(STORAGE_KEYS.ragDocuments)[0].lastAccessed).toBeUndefined();
  });

  it('returns an empty array for a missing or corrupt library', () => {
    expect(loadDocuments(STORAGE_KEYS.ragDocuments)).toEqual([]);
    store.set(STORAGE_KEYS.ragDocuments, 'not json');
    expect(loadDocuments(STORAGE_KEYS.ragDocuments)).toEqual([]);
  });

  it('returns an empty array when the stored value is not an array', () => {
    store.set(STORAGE_KEYS.ragDocuments, JSON.stringify({ nope: true }));
    expect(loadDocuments(STORAGE_KEYS.ragDocuments)).toEqual([]);
  });
});

describe('loadAllDocuments', () => {
  it('merges both RAG libraries', () => {
    store.set(STORAGE_KEYS.ragDocuments, JSON.stringify([doc('a')]));
    store.set(STORAGE_KEYS.fullRagDocuments, JSON.stringify([doc('b')]));
    expect(loadAllDocuments().map((d) => d.id).sort()).toEqual(['a', 'b']);
  });

  it('de-duplicates documents present in both libraries', () => {
    store.set(STORAGE_KEYS.ragDocuments, JSON.stringify([doc('a'), doc('b')]));
    store.set(STORAGE_KEYS.fullRagDocuments, JSON.stringify([doc('a')]));
    expect(loadAllDocuments()).toHaveLength(2);
  });
});

describe('loadDocumentsWithContent', () => {
  it('keeps only documents carrying usable text', () => {
    store.set(
      STORAGE_KEYS.ragDocuments,
      JSON.stringify([
        doc('withText'),
        doc('empty', { content: '   ' }),
        doc('missing', { content: undefined }),
      ])
    );
    const result = loadDocumentsWithContent();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('withText');
  });

  it('returns an empty array when nothing has been uploaded', () => {
    expect(loadDocumentsWithContent()).toEqual([]);
  });
});
