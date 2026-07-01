// Shared markers for injecting the real business-data snapshot directly into
// the message body. This is the ONLY channel the agent runtime reliably feeds
// into the model's context window (the AG-UI `context`/`state` fields are not
// injected by the platform runtime — verified by probe). The block is wrapped
// in sentinel markers so the UI can strip it and show only the user's question.

export const DATA_BLOCK_START = '<<<ZENITH_DATA_CONTEXT>>>';
export const DATA_BLOCK_END = '<<<END_ZENITH_DATA_CONTEXT>>>';

/**
 * Compose the wire message: a real-data snapshot block followed by the user's
 * actual question. The agent sees everything; the UI strips the block.
 */
export function composeWireMessage(snapshotText: string, userQuestion: string): string {
  return [
    DATA_BLOCK_START,
    snapshotText,
    DATA_BLOCK_END,
    '',
    userQuestion,
  ].join('\n');
}

/**
 * Remove the injected data block so chat bubbles show only the user's question.
 * Safe to call on any string (returns it unchanged if no block is present).
 */
export function stripDataBlock(text: string): string {
  if (!text || !text.includes(DATA_BLOCK_START)) return text;
  const escapedStart = DATA_BLOCK_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedEnd = DATA_BLOCK_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`${escapedStart}[\\s\\S]*?${escapedEnd}\\n*`, 'g');
  return text.replace(re, '').trim();
}

/** True when the message carries an injected business-data snapshot. */
export function hasDataBlock(text: string): boolean {
  return !!text && text.includes(DATA_BLOCK_START);
}

/**
 * Pull the snapshot's "Generated at: …" stamp out of an injected data block so
 * the UI can show exactly when the data was read. Returns undefined if not found.
 */
export function extractSnapshotTime(text: string): string | undefined {
  if (!hasDataBlock(text)) return undefined;
  const m = /Generated at:\s*([^\n(]+)/.exec(text);
  return m ? m[1].trim() : undefined;
}
