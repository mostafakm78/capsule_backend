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
exports.getNotifications = exports.updateUser = exports.getUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importDefault(require("../models/User"));
const fileCleanup_1 = require("../helper/fileCleanup");
const remover_1 = require("../helper/remover");
const Notification_1 = __importDefault(require("../models/Notification"));
const express_validator_1 = require("express-validator");
/* ------------ GET /me ------------ */
/** Get the current authenticated user profile */
const getUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return next({ message: 'Authentication required', statusCode: 401 });
        }
        const user = yield User_1.default.findById(userId).lean();
        if (!user) {
            return next({ message: 'User not found', statusCode: 404 });
        }
        return res.status(200).json({ message: 'User found', user });
    }
    catch (error) {
        return next({ message: 'Failed to get user', data: (_b = error === null || error === void 0 ? void 0 : error.message) !== null && _b !== void 0 ? _b : error, statusCode: 500 });
    }
});
exports.getUser = getUser;
/* ------------ PATCH /me ------------ */
/** Update user profile or password */
const updateUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    function isFieldError(e) {
        return e.type === 'field';
    }
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const data = errors
            .array()
            .filter(isFieldError)
            .map((e) => ({
            field: e.path,
            message: e.msg,
        }));
        return next({
            message: 'Edit capsule validation faield',
            statusCode: 422,
            data: data,
        });
    }
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            yield (0, remover_1.removeUploaded)(req);
            return next({ message: 'Authentication required', statusCode: 401 });
        }
        const body = (_b = req.body) !== null && _b !== void 0 ? _b : {};
        const file = req.file;
        const wantsPasswordChange = typeof body.newPassword === 'string' || typeof body.currentPassword === 'string';
        if (wantsPasswordChange) {
            const currentPassword = String((_c = body.currentPassword) !== null && _c !== void 0 ? _c : '');
            const newPassword = String((_d = body.newPassword) !== null && _d !== void 0 ? _d : '');
            if (!currentPassword || !newPassword) {
                yield (0, remover_1.removeUploaded)(req);
                return next({
                    message: 'currentPassword and newPassword are required',
                    statusCode: 400,
                });
            }
            if (newPassword.length < 8) {
                yield (0, remover_1.removeUploaded)(req);
                return next({
                    message: 'newPassword must be at least 8 characters',
                    statusCode: 400,
                });
            }
            const userDoc = yield User_1.default.findById(userId).select('+password');
            if (!userDoc) {
                yield (0, remover_1.removeUploaded)(req);
                return next({ message: 'User not found', statusCode: 404 });
            }
            const ok = yield bcryptjs_1.default.compare(currentPassword, userDoc.password);
            if (!ok) {
                yield (0, remover_1.removeUploaded)(req);
                return next({ message: 'Current password is incorrect', statusCode: 400 });
            }
            const prevAvatar = userDoc.avatar;
            userDoc.password = yield bcryptjs_1.default.hash(newPassword, 12);
            if (body.name !== undefined)
                userDoc.name = String(body.name).trim();
            if (body.about !== undefined)
                userDoc.about = String(body.about).trim();
            if (body.birthday !== undefined)
                userDoc.birthday = body.birthday ? String(body.birthday) : undefined;
            if (body.education !== undefined)
                userDoc.education = String(body.education);
            if (body.removeImage === 'true') {
                userDoc.avatar = undefined;
            }
            else if (file === null || file === void 0 ? void 0 : file.path) {
                const normalized = file.path.replace(/\\/g, '/'); // normalize path
                userDoc.avatar = (0, fileCleanup_1.toImagesRelative)(normalized);
            }
            yield userDoc.save();
            if ((body.removeImage === 'true' || (file === null || file === void 0 ? void 0 : file.path)) && prevAvatar && prevAvatar !== userDoc.avatar) {
                yield (0, fileCleanup_1.deleteImageBulletproof)(prevAvatar);
            }
            const safe = userDoc.toObject();
            delete safe.password;
            return res.status(200).json({ message: 'Password updated', user: safe });
        }
        const userDoc = yield User_1.default.findById(userId);
        if (!userDoc) {
            yield (0, remover_1.removeUploaded)(req);
            return next({ message: 'User not found', statusCode: 404 });
        }
        const prevAvatar = userDoc.avatar;
        let touched = false;
        if (body.name !== undefined) {
            userDoc.name = String(body.name).trim();
            touched = true;
        }
        if (body.about !== undefined) {
            userDoc.about = String(body.about).trim();
            touched = true;
        }
        if (body.birthday !== undefined) {
            userDoc.birthday = body.birthday ? String(body.birthday) : undefined;
            touched = true;
        }
        if (body.education !== undefined) {
            userDoc.education = String(body.education);
            touched = true;
        }
        if (body.removeImage === 'true') {
            userDoc.avatar = undefined;
            touched = true;
        }
        else if (file === null || file === void 0 ? void 0 : file.path) {
            const normalized = file.path.replace(/\\/g, '/');
            userDoc.avatar = (0, fileCleanup_1.toImagesRelative)(normalized);
            touched = true;
        }
        if (!touched) {
            yield (0, remover_1.removeUploaded)(req);
            return res.status(200).json({ message: 'Nothing to update' });
        }
        yield userDoc.save();
        if (((file === null || file === void 0 ? void 0 : file.path) || body.removeImage === 'true') && prevAvatar && prevAvatar !== userDoc.avatar) {
            yield (0, fileCleanup_1.deleteImageBulletproof)(prevAvatar);
        }
        const safe = userDoc.toObject();
        delete safe.password;
        return res.status(200).json({ message: 'Profile updated', status: 200, user: safe });
    }
    catch (error) {
        yield (0, remover_1.removeUploaded)(req);
        if ((error === null || error === void 0 ? void 0 : error.code) === 11000 && ((_e = error === null || error === void 0 ? void 0 : error.keyPattern) === null || _e === void 0 ? void 0 : _e.email)) {
            return next({ message: 'Email is already in use', statusCode: 409 });
        }
        return next({
            message: 'Error updating user',
            statusCode: 500,
            data: (_f = error === null || error === void 0 ? void 0 : error.message) !== null && _f !== void 0 ? _f : error,
        });
    }
});
exports.updateUser = updateUser;
const getNotifications = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const AllNotif = yield Notification_1.default.find({}).sort({ createdAt: -1, _id: -1 }).lean();
        if (!AllNotif)
            return next({ message: 'Notifications not found', statusCode: 404 });
        if (AllNotif.length === 0) {
            return res.status(201).json({ message: 'No notifications', status: 201, notifications: [] });
        }
        res.status(200).json({ message: 'Notifications here', status: 200, AllNotif });
    }
    catch (error) {
        return next({
            message: 'Internal error while getting notifications',
            statusCode: 500,
            data: (_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error,
        });
    }
});
exports.getNotifications = getNotifications;
