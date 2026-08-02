import { describe, expect, it } from 'vitest';
import { chunkText } from './text';

describe('chunkText', () => {
  it('returns a single chunk for short text', () => {
    expect(chunkText('short text', 1000, 200)).toEqual(['short text']);
  });

  it('splits long text into multiple chunks no larger than chunkSize', () => {
    const sentence = 'The quick brown fox jumps over the lazy dog. ';
    const text = sentence.repeat(100); // ~4600 chars
    const chunks = chunkText(text, 500, 100);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(500);
    }
  });

  it('preserves all content across chunks (with overlap)', () => {
    const text = Array.from({ length: 200 }, (_, i) => `word${i}`).join(' ');
    const chunks = chunkText(text, 300, 50);

    // Every unique word must appear in at least one chunk
    const joined = chunks.join(' ');
    for (let i = 0; i < 200; i++) {
      expect(joined).toContain(`word${i}`);
    }
    // Final chunk must end exactly where the text ends
    expect(chunks[chunks.length - 1].endsWith(text.slice(-20))).toBe(true);
  });

  it('prefers sentence boundaries as break points', () => {
    const text = `First sentence here. ${'x'.repeat(50)}. Second part follows. ${'y'.repeat(80)}`;
    const chunks = chunkText(text, 80, 10);
    // The first chunk should end at a natural break, not mid-word
    expect(chunks[0].endsWith('. ') || chunks[0].endsWith(' ')).toBe(true);
  });

  it('terminates on pathological input with no break points', () => {
    const text = 'x'.repeat(5000); // no spaces or newlines at all
    const chunks = chunkText(text, 1000, 200);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join('').length).toBeGreaterThanOrEqual(5000);
  });

  it('terminates when overlap >= chunkSize (previously an infinite loop risk)', () => {
    const text = 'word '.repeat(500);
    const chunks = chunkText(text, 100, 100);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.length).toBeLessThan(text.length);
  });
});
