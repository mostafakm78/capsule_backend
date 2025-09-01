import fs from 'fs/promises';
import type { Request as ExpressRequest } from 'express';
import { deleteImageBulletproof, toImagesRelative } from './fileCleanup';

/**
 * Best-effort cleanup for uploaded file(s) on a request.
 * Works with both `req.file` and `req.files` (multer).
 */
export const removeUploaded = async (req: ExpressRequest): Promise<void> => {
  // Normalize to an array of Multer files
  const files: Express.Multer.File[] = ([] as Express.Multer.File[]).concat((req as any).file || []).concat(((req as any).files as Express.Multer.File[]) || []);

  for (const f of files) {
    if (!f?.path) continue; // skip if no path

    // Normalize Windows backslashes
    const abs: string = f.path.replace(/\\/g, '/');

    try {
      // Prefer app-level deletion (handles relative mapping, etc.)
      await deleteImageBulletproof(toImagesRelative(abs));
    } catch {
      // Fallback: try unlinking absolute path; ignore errors
      await fs.unlink(abs).catch(() => {});
    }
  }
};
