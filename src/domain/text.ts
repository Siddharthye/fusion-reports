/**
 * Tiny text toolkit for semantic affinity. Deliberately NOT TF-IDF or
 * embeddings: incident reports are one or two sentences, so a stopword-filtered
 * token-set cosine gets within a whisker of heavier models at zero runtime cost
 * and — crucially for an emergency product — with output a human can audit.
 */

/**
 * Words carrying no incident-identifying signal. Includes emergency filler
 * ("help", "please") that appears in reports of EVERY category and would
 * otherwise create false similarity between unrelated events.
 */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
  'i', 'my', 'me', 'we', 'our', 'you', 'your', 'it', 'its', 'they', 'their',
  'this', 'that', 'these', 'those', 'there', 'here',
  'and', 'or', 'but', 'if', 'then', 'so', 'of', 'to', 'in', 'on', 'at', 'by',
  'for', 'with', 'from', 'into', 'out', 'up', 'down',
  'has', 'have', 'had', 'do', 'does', 'did', 'can', 'could', 'will', 'would', 'should',
  'just', 'now', 'very', 'really', 'some', 'someone', 'something',
  'please', 'help', 'need', 'needed', 'send',
])

/**
 * Unique, lowercased, stopword-free tokens of a report description.
 * Single letters survive on purpose — "Block C" must keep its "c".
 *
 * @example
 * tokenize('FIRE in Block C! please help')
 * // => ['fire', 'block', 'c']
 */
export function tokenize(text: string): string[] {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0 && !STOPWORDS.has(token))

  return [...new Set(tokens)]
}

/**
 * Cosine similarity over token SETS (presence, not frequency). Set semantics
 * make the score immune to a reporter repeating one word five times in panic.
 *
 * @example
 * tokenSetCosine(tokenize('fire in block c'), tokenize('block c is on fire'))
 * // => 1
 */
export function tokenSetCosine(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 || b.length === 0) return 0

  const setB = new Set(b)
  const overlap = a.filter((token) => setB.has(token)).length

  return overlap / Math.sqrt(a.length * b.length)
}
