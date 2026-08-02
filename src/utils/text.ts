/**
 * Text utilities shared by the RAG pipeline.
 */

/**
 * Split text into overlapping chunks, preferring natural break points
 * (sentence/paragraph boundaries). Guarantees forward progress even for
 * pathological inputs, so it can never loop forever.
 */
export function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];

  if (text.length <= chunkSize) {
    chunks.push(text);
    return chunks;
  }

  const safeOverlap = Math.max(0, Math.min(overlap, chunkSize - 1));
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize;

    if (endIndex < text.length) {
      // Try to find a natural break point (sentence or paragraph)
      const breakPoints = ['. ', '.\n', '\n\n', '\n', ' '];

      for (const bp of breakPoints) {
        const naturalBreak = text.lastIndexOf(bp, endIndex);
        if (naturalBreak > startIndex && naturalBreak < endIndex) {
          endIndex = naturalBreak + bp.length;
          break;
        }
      }
    } else {
      endIndex = text.length;
    }

    chunks.push(text.substring(startIndex, endIndex));

    if (endIndex >= text.length) break;

    // Step forward, keeping `safeOverlap` characters of context — and always
    // advance by at least one character to guarantee termination.
    startIndex = Math.max(endIndex - safeOverlap, startIndex + 1);
  }

  return chunks;
}
