/**
 * Utility functions for generating URL-safe slugs
 */

/**
 * Convert a name/title into a URL-friendly slug
 * @param text - Input string
 * @returns Clean slug string (e.g. "DevFlow Team" -> "devflow-team")
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-alphanumeric characters (except spaces and hyphens)
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, and consecutive hyphens with a single hyphen
    .replace(/^-+|-+$/g, ''); // Strip leading and trailing hyphens
}
