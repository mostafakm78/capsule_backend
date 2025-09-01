import fs from 'fs';
import path from 'path';

/** Resolve images root (prefers ENV, falls back to project/cwd). */
const projectImages: string = path.resolve(__dirname, '../../images'); // build: dist/helper/.. -> dist/images
const cwdImages: string = path.join(process.cwd(), 'images');

export const IMAGES_ROOT: string = (fs.existsSync(projectImages) ? projectImages : cwdImages);

/** Cross-platform startsWith for paths (case-insensitive on Windows). */
function startsWithSafe(p: string, root: string): boolean {
  const pNorm: string = path.normalize(p);
  const rNorm: string = path.normalize(root.endsWith(path.sep) ? root : root + path.sep);
  return process.platform === 'win32' ? pNorm.toLowerCase().startsWith(rNorm.toLowerCase()) : pNorm.startsWith(rNorm);
}

/** Detect if absolute path contains '/images/' segment (fallback safety). */
function containsImagesSegment(absPath: string): boolean {
  const norm: string = path.normalize(absPath);
  const seg: string = path.sep + 'images' + path.sep;
  if (process.platform === 'win32') {
    return norm.toLowerCase().includes(seg.toLowerCase());
  }
  return norm.includes(seg);
}

/** Build absolute path candidates from stored value (abs/web-like/relative). */
function buildCandidates(storedPath?: string | null): string[] {
  if (!storedPath) return [];
  const out: string[] = [];

  // 1) Absolute path as-is
  if (path.isAbsolute(storedPath)) {
    out.push(path.normalize(storedPath));
  }

  // 2) Web-like: '/images/...' or 'images/...'
  const webLike: string = storedPath.replace(/\\/g, '/');
  const imagesPrefix: RegExp = /^\/?images\//i;
  if (imagesPrefix.test(webLike)) {
    const rel: string = webLike.replace(imagesPrefix, '');
    out.push(path.join(IMAGES_ROOT, rel));
  }

  // 3) Relative under IMAGES_ROOT
  out.push(path.join(IMAGES_ROOT, storedPath));

  // Normalize & dedupe
  const uniq: string[] = Array.from(new Set(out.map((p) => path.normalize(p))));
  return uniq;
}

/** Guard: allow only paths inside images root (or with '/images/' segment). */
function isInsideImages(absPath: string): boolean {
  return startsWithSafe(absPath, IMAGES_ROOT) || containsImagesSegment(absPath);
}

/** Public: resolve stored path to absolute (first valid candidate or null). */
export function resolveImageAbsolutePath(storedPath?: string | null): string | null {
  const candidates: string[] = buildCandidates(storedPath).filter(isInsideImages);
  return candidates[0] ?? null;
}

/** Delete file robustly: try candidates; unlink first existing file; log failures. */
export async function deleteImageBulletproof(storedPath?: string | null): Promise<boolean> {
  const candidates: string[] = buildCandidates(storedPath).filter(isInsideImages);

  for (const abs of candidates) {
    try {
      const st: fs.Stats = await fs.promises.stat(abs);
      if (!st.isFile()) continue;
      await fs.promises.unlink(abs);
      return true;
    } catch (err: unknown) {
      const e = err as NodeJS.ErrnoException;
      if (e?.code === 'ENOENT') continue; // not found -> try next
      console.error('unlink fail:', abs, e?.code || e?.message || e);
    }
  }
  return false;
}

/** Convert absolute path under IMAGES_ROOT to compact relative ('avatar/x.png'). */
export function toImagesRelative(absPath: string): string {
  const rel: string = path.relative(IMAGES_ROOT, path.normalize(absPath));
  return rel.replace(/\\/g, '/');
}
