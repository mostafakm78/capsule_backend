import fs from 'fs/promises';
import type { Request as ExpressRequest } from 'express';
import { deleteImageBulletproof, toImagesRelative } from './fileCleanup';

export const removeUploaded = async (req: ExpressRequest) => {
  const files = ([] as Express.Multer.File[])
    .concat((req as any).file || [])
    .concat(((req as any).files as Express.Multer.File[]) || []);

  for (const f of files) {
    if (!f?.path) continue;
    const abs = f.path.replace(/\\/g, '/');
    try {
      await deleteImageBulletproof(toImagesRelative(abs));
    } catch {
      await fs.unlink(abs).catch(() => {});
    }
  }
};
