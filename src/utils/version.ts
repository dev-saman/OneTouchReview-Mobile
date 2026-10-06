/**
 * Compares dotted numeric versions ("1.2.10" > "1.2.9"). Missing parts count as 0;
 * any non-numeric suffix on a part is ignored ("1.0.0-beta" → 1.0.0).
 * Returns -1, 0 or 1.
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const parse = (v: string) => v.trim().split('.').map((part) => parseInt(part, 10) || 0);
  const left = parse(a);
  const right = parse(b);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

/** Force update: the installed version is lower than min_app_version for this platform. */
export function isBelowMinimum(installed: string, minimum: string | null | undefined): boolean {
  if (!minimum) return false;
  return compareVersions(installed, minimum) < 0;
}
