/**
 * Lightweight local text embeddings for the RAG pipeline.
 *
 * Documents are embedded as L2-normalized hashed bag-of-words vectors
 * (the "hashing trick"). This is fully deterministic, dependency-free,
 * and runs offline in the browser — no API calls needed. It provides
 * honest lexical similarity ranking: documents sharing more (weighted)
 * terms with the query score higher under cosine similarity.
 */

export const EMBEDDING_DIM = 512;

/**
 * Common English stopwords, excluded from embeddings so that content
 * words drive similarity instead of function words like "is"/"of".
 */
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'but', 'by', 'did',
  'do', 'does', 'for', 'from', 'had', 'has', 'have', 'he', 'her', 'his',
  'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'me', 'my', 'no',
  'not', 'of', 'on', 'or', 'our', 'she', 'so', 'than', 'that', 'the',
  'their', 'them', 'then', 'these', 'they', 'this', 'those', 'to', 'up',
  'was', 'we', 'were', 'what', 'when', 'where', 'which', 'who', 'why',
  'will', 'with', 'you', 'your',
]);

/** Tokenize text into lowercase word tokens (unicode-aware), dropping stopwords. */
export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(
    (token) => token.length > 1 && !STOPWORDS.has(token)
  );
}

/**
 * FNV-1a 32-bit hash — small, fast, and stable across sessions,
 * used to map tokens to vector dimensions.
 */
export function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Embed text as an L2-normalized hashed term-frequency vector.
 * Sublinear TF scaling (1 + log(tf)) dampens very frequent terms.
 */
export function generateEmbedding(text: string, dim: number = EMBEDDING_DIM): number[] {
  const vector = new Array<number>(dim).fill(0);
  const counts = new Map<string, number>();

  for (const token of tokenize(text)) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  for (const [token, count] of counts) {
    const hash = fnv1a(token);
    const index = hash % dim;
    // Second hash bit decides sign, reducing collision bias
    const sign = (fnv1a(`${token}#sign`) & 1) === 0 ? 1 : -1;
    vector[index] += sign * (1 + Math.log(count));
  }

  // L2 normalization so cosine similarity reduces to a dot product
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < dim; i++) vector[i] /= norm;
  }
  return vector;
}

/** Async wrapper kept for API compatibility with future remote embedding backends. */
export async function generateEmbeddings(text: string): Promise<number[]> {
  return generateEmbedding(text);
}

/** True cosine similarity between two vectors. Returns 0 for zero vectors. */
export function computeSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Rank stored embeddings against a query embedding and return the top-K matches. */
export async function searchVectorStore(
  queryEmbedding: number[],
  documentEmbeddings: Array<{ id: string; embedding: number[] }>,
  topK: number = 3
): Promise<Array<{ id: string; score: number }>> {
  return documentEmbeddings
    .map((doc) => ({
      id: doc.id,
      score: computeSimilarity(queryEmbedding, doc.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export interface RetrievedChunk {
  /** Index into the original chunks array */
  index: number;
  text: string;
  score: number;
}

/**
 * One-call retrieval: embed the query and all chunks, return the topK
 * most similar chunks (highest cosine similarity first).
 */
export function retrieveRelevantChunks(
  query: string,
  chunks: string[],
  topK: number = 4
): RetrievedChunk[] {
  const queryEmbedding = generateEmbedding(query);
  return chunks
    .map((text, index) => ({
      index,
      text,
      score: computeSimilarity(queryEmbedding, generateEmbedding(text)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
