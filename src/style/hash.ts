/**
 * Fast 32-bit FNV-1a deterministic string hashing algorithm
 */
export function hashString(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Generate a deterministic scope identifier for CSS blocks
 */
export function getScopeId(css: string, prefix = "v"): string {
  const hash = hashString(css.trim());
  return `${prefix}-${hash}`;
}
