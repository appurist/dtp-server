import { join } from 'path';

/**
 * Expands a path that starts with ~/ to the user's home directory.
 * @param {string} path - The path to expand.
 * @returns {string} - The expanded path.
 */
export function expandPath(path) {
  if (path.startsWith('~/')) {
    return join(process.env.HOME || process.env.USERPROFILE, path.slice(2));
  }
  return path;
}
