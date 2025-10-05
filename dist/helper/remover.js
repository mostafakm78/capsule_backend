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
exports.removeUploaded = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const fileCleanup_1 = require("./fileCleanup");
/**
 * Best-effort cleanup for uploaded file(s) on a request.
 * Works with both `req.file` and `req.files` (multer).
 */
const removeUploaded = (req) => __awaiter(void 0, void 0, void 0, function* () {
    // Normalize to an array of Multer files
    const files = [].concat(req.file || []).concat(req.files || []);
    for (const f of files) {
        if (!(f === null || f === void 0 ? void 0 : f.path))
            continue; // skip if no path
        // Normalize Windows backslashes
        const abs = f.path.replace(/\\/g, '/');
        try {
            // Prefer app-level deletion (handles relative mapping, etc.)
            yield (0, fileCleanup_1.deleteImageBulletproof)((0, fileCleanup_1.toImagesRelative)(abs));
        }
        catch (_a) {
            // Fallback: try unlinking absolute path; ignore errors
            yield promises_1.default.unlink(abs).catch(() => { });
        }
    }
});
exports.removeUploaded = removeUploaded;
