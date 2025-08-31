import fs from 'fs';
import path from 'path';

/** Resolve images root reliably (build or src). Allow ENV override. */
const projectImages: string = path.resolve(__dirname, '../../images'); // compiled: dist/helper/.. -> dist/images
const cwdImages: string = path.join(process.cwd(), 'images');

export const IMAGES_ROOT: string = process.env.IMAGES_ROOT ?? (fs.existsSync(projectImages) ? projectImages : cwdImages);

/** Cross-platform startsWith */
function startsWithSafe(p: string, root: string): boolean {
  const pNorm: string = path.normalize(p);
  const rNorm: string = path.normalize(root.endsWith(path.sep) ? root : root + path.sep);
  return process.platform === 'win32' ? pNorm.toLowerCase().startsWith(rNorm.toLowerCase()) : pNorm.startsWith(rNorm);
}

/** Try to locate `/images/` segment inside an absolute path (fallback safety) */
function containsImagesSegment(absPath: string): boolean {
  const norm: string = path.normalize(absPath);
  const seg: string = path.sep + 'images' + path.sep;
  if (process.platform === 'win32') {
    return norm.toLowerCase().includes(seg.toLowerCase());
  }
  return norm.includes(seg);
}

/** Build candidate absolute paths from stored value (abs/web-like/relative). */
function buildCandidates(storedPath?: string | null): string[] {
  if (!storedPath) return [];
  const out: string[] = [];

  // 1) Absolute path as-is
  if (path.isAbsolute(storedPath)) {
    out.push(path.normalize(storedPath));
  }

  // 2) Web-like: "/images/..." or "images/..."
  const webLike: string = storedPath.replace(/\\/g, '/');
  const imagesPrefix: RegExp = /^\/?images\//i;
  if (imagesPrefix.test(webLike)) {
    const rel: string = webLike.replace(imagesPrefix, '');
    out.push(path.join(IMAGES_ROOT, rel));
  }

  // 3) Relative under images root (e.g., "avatar/..." or "capsules/...")
  out.push(path.join(IMAGES_ROOT, storedPath));

  // Unique + normalized
  const uniq: string[] = Array.from(new Set(out.map((p) => path.normalize(p))));
  return uniq;
}

/** Final guard: only allow deleting files inside the images folder */
function isInsideImages(absPath: string): boolean {
  return startsWithSafe(absPath, IMAGES_ROOT) || containsImagesSegment(absPath);
}

/** Public: resolve a stored path to absolute (for debugging/logging) */
export function resolveImageAbsolutePath(storedPath?: string | null): string | null {
  const candidates: string[] = buildCandidates(storedPath).filter(isInsideImages);
  return candidates[0] ?? null;
}

/** BULLETPROOF delete: tries multiple candidates; deletes first match; logs why if fails. */
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
      if (e?.code === 'ENOENT') continue; // try next candidate
      console.error('unlink fail:', abs, e?.code || e?.message || e);
    }
  }
  return false;
}

/** Optional: store compact relative paths in DB ("avatar/xxx.png" or "capsules/xxx.jpg") */
export function toImagesRelative(absPath: string): string {
  const rel: string = path.relative(IMAGES_ROOT, path.normalize(absPath));
  return rel.replace(/\\/g, '/');
}
