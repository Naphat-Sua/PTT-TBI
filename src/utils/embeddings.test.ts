import { describe, expect, it } from 'vitest';
import {
  EMBEDDING_DIM,
  computeSimilarity,
  generateEmbedding,
  retrieveRelevantChunks,
  searchVectorStore,
  tokenize,
} from './embeddings';

describe('tokenize', () => {
  it('lowercases and splits on non-alphanumerics', () => {
    expect(tokenize('Hello, World! Oil-price data')).toEqual([
      'hello',
      'world',
      'oil',
      'price',
      'data',
    ]);
  });

  it('drops single-character tokens', () => {
    expect(tokenize('a b oil')).toEqual(['oil']);
  });

  it('returns empty array for empty input', () => {
    expect(tokenize('')).toEqual([]);
  });
});

describe('generateEmbedding', () => {
  it('is deterministic for the same input', () => {
    const a = generateEmbedding('WTI crude oil prices rose sharply');
    const b = generateEmbedding('WTI crude oil prices rose sharply');
    expect(a).toEqual(b);
  });

  it('produces vectors of the configured dimension', () => {
    expect(generateEmbedding('some text')).toHaveLength(EMBEDDING_DIM);
  });

  it('produces L2-normalized vectors', () => {
    const vector = generateEmbedding('normalize me please, embedding vector');
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    expect(norm).toBeCloseTo(1, 6);
  });

  it('returns a zero vector for empty text', () => {
    const vector = generateEmbedding('');
    expect(vector.every((v) => v === 0)).toBe(true);
  });
});

describe('computeSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const v = generateEmbedding('oil market analysis');
    expect(computeSimilarity(v, v)).toBeCloseTo(1, 6);
  });

  it('returns 0 for zero vectors', () => {
    const zero = new Array(EMBEDDING_DIM).fill(0);
    const v = generateEmbedding('anything');
    expect(computeSimilarity(zero, v)).toBe(0);
  });

  it('returns 0 for mismatched lengths', () => {
    expect(computeSimilarity([1, 0], [1, 0, 0])).toBe(0);
  });

  it('scores related texts higher than unrelated texts', () => {
    const query = generateEmbedding('crude oil price barrel WTI');
    const related = generateEmbedding('The WTI crude oil price per barrel increased');
    const unrelated = generateEmbedding('React components render user interfaces');
    expect(computeSimilarity(query, related)).toBeGreaterThan(
      computeSimilarity(query, unrelated)
    );
  });
});

describe('searchVectorStore', () => {
  it('returns the topK most similar documents, best first', async () => {
    const docs = [
      { id: 'oil', embedding: generateEmbedding('crude oil WTI barrel price market') },
      { id: 'ml', embedding: generateEmbedding('machine learning models training data') },
      { id: 'ui', embedding: generateEmbedding('user interface buttons and layout') },
    ];
    const query = generateEmbedding('oil price market');

    const results = await searchVectorStore(query, docs, 2);
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('oil');
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
  });
});

describe('retrieveRelevantChunks', () => {
  it('ranks the topically matching chunk first', () => {
    const chunks = [
      'Machine learning is a field of artificial intelligence.',
      'WTI crude oil prices fell to $64 per barrel in April.',
      'The user interface uses React and Tailwind CSS.',
    ];
    const results = retrieveRelevantChunks('What is the price of crude oil?', chunks, 2);
    expect(results).toHaveLength(2);
    expect(results[0].text).toContain('crude oil');
    expect(results[0].index).toBe(1);
  });

  it('caps results at topK', () => {
    const chunks = ['one text here', 'two text here', 'three text here', 'four text here'];
    expect(retrieveRelevantChunks('text', chunks, 2)).toHaveLength(2);
  });

  it('handles empty chunk lists', () => {
    expect(retrieveRelevantChunks('query', [], 3)).toEqual([]);
  });
});
