import crypto from 'crypto';

/**
 * Normalize hero name
 * - Convert to lowercase
 * - Replace spaces with hyphens
 * - Remove special characters
 */
export function normalizeHeroName(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Normalize hero data
 * @param {Array} heroes - Raw hero data from parser
 * @returns {Array} Normalized hero data
 */
export function normalizeHeroData(heroes) {
  return heroes.map(hero => ({
    hero: normalizeHeroName(hero.name),
    pick_rate: hero.pickRate,
    win_rate: hero.winRate
  }));
}

/**
 * Sort heroes alphabetically by normalized name
 */
export function sortHeroes(heroes) {
  return [...heroes].sort((a, b) => a.hero.localeCompare(b.hero));
}

/**
 * Compute SHA-256 hash of hero data
 * Used for detecting changes in data
 */
export function computeHash(heroes) {
  const sorted = sortHeroes(heroes);
  const dataString = JSON.stringify(sorted);
  return crypto.createHash('sha256').update(dataString).digest('hex');
}

/**
 * Process raw hero data: normalize, sort, and compute hash
 */
export function processHeroData(rawHeroes) {
  const normalized = normalizeHeroData(rawHeroes);
  const sorted = sortHeroes(normalized);
  const hash = computeHash(normalized);

  return {
    heroes: sorted,
    hash
  };
}
