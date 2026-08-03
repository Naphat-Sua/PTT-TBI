/**
 * Shared access to the document libraries persisted by the RAG pages.
 *
 * TBIRAG and FullRAG each own a localStorage library; ChatTBU's RAG mode
 * reads both so "answer from my documents" uses the documents the user
 * actually uploaded rather than a private copy of its own.
 */

import { Document } from '@/types';
import { STORAGE_KEYS, readJSON, reviveDate, reviveDateOr } from '@/utils/storage';

/** Shape of a Document once it has been through JSON round-tripping. */
type SerializedDocument = Omit<Document, 'uploadedAt' | 'lastAccessed'> & {
  uploadedAt?: string;
  lastAccessed?: string;
};

/** Restore Date fields on a document loaded from storage. */
export function reviveDocument(doc: SerializedDocument): Document {
  return {
    ...doc,
    uploadedAt: reviveDateOr(doc.uploadedAt),
    lastAccessed: reviveDate(doc.lastAccessed),
  };
}

/** Read one library, tolerating missing or corrupt entries. */
export function loadDocuments(key: string): Document[] {
  const raw = readJSON<SerializedDocument[]>(key, []);
  if (!Array.isArray(raw)) return [];
  return raw.map(reviveDocument);
}

/**
 * All documents the user has uploaded across the RAG pages, de-duplicated
 * by id (the same document can exist in both libraries).
 */
export function loadAllDocuments(): Document[] {
  const combined = [
    ...loadDocuments(STORAGE_KEYS.ragDocuments),
    ...loadDocuments(STORAGE_KEYS.fullRagDocuments),
  ];

  const byId = new Map<string, Document>();
  for (const doc of combined) {
    if (doc && typeof doc.id === 'string' && !byId.has(doc.id)) {
      byId.set(doc.id, doc);
    }
  }
  return [...byId.values()];
}

/** Documents that actually carry text content usable as RAG context. */
export function loadDocumentsWithContent(): Document[] {
  return loadAllDocuments().filter(
    (doc) => typeof doc.content === 'string' && doc.content.trim().length > 0
  );
}
