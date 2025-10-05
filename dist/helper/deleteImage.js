"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IMAGES_ROOT = void 0;
exports.resolveImageAbsolutePath = resolveImageAbsolutePath;
exports.deleteImageSafe = deleteImageSafe;
exports.toImagesRelative = toImagesRelative;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/** Must match your multer base: {root}/images/... */
exports.IMAGES_ROOT = path_1.default.join(process.cwd(), 'images');
/**
 * Normalize a stored path (absolute or relative) to an absolute path under IMAGES_ROOT.
 * Returns null if the normalized path would escape IMAGES_ROOT.
 */
function resolveImageAbsolutePath(storedPath) {
    if (!storedPath)
        return null;
    // If DB stored absolute path (your current behavior), keep it;
    // otherwise assume it's relative to IMAGES_ROOT.
    const abs = path_1.default.isAbsolute(storedPath) ? storedPath : path_1.default.join(exports.IMAGES_ROOT, storedPath);
    const normalized = path_1.default.normalize(abs);
    // Safety: only allow deleting inside images/ folder
    const rootWithSep = exports.IMAGES_ROOT.endsWith(path_1.default.sep) ? exports.IMAGES_ROOT : exports.IMAGES_ROOT + path_1.default.sep;
    if (!normalized.startsWith(rootWithSep)) {
        return null;
    }
    return normalized;
}
/**
 * Delete an image file safely if it exists.
 * @param storedPath - what you saved in DB (absolute from multer.path or relative like "avatar/xxx.png")
 * @param suppressErrors - if true, swallow non-ENOENT errors (default true)
 * @returns true if a file was deleted, false if it didn't exist / wasn't deletable
 */
function deleteImageSafe(storedPath_1) {
    return __awaiter(this, arguments, void 0, function* (storedPath, suppressErrors = true) {
        const abs = resolveImageAbsolutePath(storedPath);
        if (!abs)
            return false;
        try {
            // Ensure it's a file, not a directory
            const stat = yield fs_1.default.promises.stat(abs);
            if (!stat.isFile())
                return false;
            yield fs_1.default.promises.unlink(abs);
            return true;
        }
        catch (err) {
            if ((err === null || err === void 0 ? void 0 : err.code) === 'ENOENT')
                return false; // already removed
            if (suppressErrors) {
                console.error('deleteImageSafe error:', err);
                return false;
            }
            throw err;
        }
    });
}
/**
 * Optional helper: convert multer absolute path to a relative path under images/.
 * Useful if you prefer storing compact relative paths in DB.
 * Example: toImagesRelative(".../images/capsules/1693456-pic.jpg") -> "capsules/1693456-pic.jpg"
 */
function toImagesRelative(absPath) {
    const normalized = path_1.default.normalize(absPath);
    const rel = path_1.default.relative(exports.IMAGES_ROOT, normalized);
    return rel.replace(/\\/g, '/');
}
