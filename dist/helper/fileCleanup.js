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
exports.deleteImageBulletproof = deleteImageBulletproof;
exports.toImagesRelative = toImagesRelative;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/** Resolve images root (prefers ENV, falls back to project/cwd). */
const projectImages = path_1.default.resolve(__dirname, '../../images'); // build: dist/helper/.. -> dist/images
const cwdImages = path_1.default.join(process.cwd(), 'images');
exports.IMAGES_ROOT = (fs_1.default.existsSync(projectImages) ? projectImages : cwdImages);
/** Cross-platform startsWith for paths (case-insensitive on Windows). */
function startsWithSafe(p, root) {
    const pNorm = path_1.default.normalize(p);
    const rNorm = path_1.default.normalize(root.endsWith(path_1.default.sep) ? root : root + path_1.default.sep);
    return process.platform === 'win32' ? pNorm.toLowerCase().startsWith(rNorm.toLowerCase()) : pNorm.startsWith(rNorm);
}
/** Detect if absolute path contains '/images/' segment (fallback safety). */
function containsImagesSegment(absPath) {
    const norm = path_1.default.normalize(absPath);
    const seg = path_1.default.sep + 'images' + path_1.default.sep;
    if (process.platform === 'win32') {
        return norm.toLowerCase().includes(seg.toLowerCase());
    }
    return norm.includes(seg);
}
/** Build absolute path candidates from stored value (abs/web-like/relative). */
function buildCandidates(storedPath) {
    if (!storedPath)
        return [];
    const out = [];
    // 1) Absolute path as-is
    if (path_1.default.isAbsolute(storedPath)) {
        out.push(path_1.default.normalize(storedPath));
    }
    // 2) Web-like: '/images/...' or 'images/...'
    const webLike = storedPath.replace(/\\/g, '/');
    const imagesPrefix = /^\/?images\//i;
    if (imagesPrefix.test(webLike)) {
        const rel = webLike.replace(imagesPrefix, '');
        out.push(path_1.default.join(exports.IMAGES_ROOT, rel));
    }
    // 3) Relative under IMAGES_ROOT
    out.push(path_1.default.join(exports.IMAGES_ROOT, storedPath));
    // Normalize & dedupe
    const uniq = Array.from(new Set(out.map((p) => path_1.default.normalize(p))));
    return uniq;
}
/** Guard: allow only paths inside images root (or with '/images/' segment). */
function isInsideImages(absPath) {
    return startsWithSafe(absPath, exports.IMAGES_ROOT) || containsImagesSegment(absPath);
}
/** Public: resolve stored path to absolute (first valid candidate or null). */
function resolveImageAbsolutePath(storedPath) {
    var _a;
    const candidates = buildCandidates(storedPath).filter(isInsideImages);
    return (_a = candidates[0]) !== null && _a !== void 0 ? _a : null;
}
/** Delete file robustly: try candidates; unlink first existing file; log failures. */
function deleteImageBulletproof(storedPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const candidates = buildCandidates(storedPath).filter(isInsideImages);
        for (const abs of candidates) {
            try {
                const st = yield fs_1.default.promises.stat(abs);
                if (!st.isFile())
                    continue;
                yield fs_1.default.promises.unlink(abs);
                return true;
            }
            catch (err) {
                const e = err;
                if ((e === null || e === void 0 ? void 0 : e.code) === 'ENOENT')
                    continue; // not found -> try next
                console.error('unlink fail:', abs, (e === null || e === void 0 ? void 0 : e.code) || (e === null || e === void 0 ? void 0 : e.message) || e);
            }
        }
        return false;
    });
}
/** Convert absolute path under IMAGES_ROOT to compact relative ('avatar/x.png'). */
function toImagesRelative(absPath) {
    const rel = path_1.default.relative(exports.IMAGES_ROOT, path_1.default.normalize(absPath));
    return rel.replace(/\\/g, '/');
}
