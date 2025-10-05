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
exports.getCategories = exports.editCapsule = exports.deleteCapsule = exports.getSingleCapsule = exports.createCapsule = exports.getCapsules = void 0;
const Capsule_1 = __importDefault(require("../models/Capsule"));
const mongoose_1 = require("mongoose");
const fileCleanup_1 = require("../helper/fileCleanup");
const remover_1 = require("../helper/remover");
const User_1 = __importDefault(require("../models/User"));
const express_validator_1 = require("express-validator");
const Category_1 = require("../models/Category");
/* ------------ GET /capsules ------------ */
const getCapsules = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // current user id
        if (!userId) {
            yield (0, remover_1.removeUploaded)(req);
            return next({ message: 'Authentication required', statusCode: 401 });
        }
        // pagination & filters from query
        const { page = '1', limit = '10', visibility, lock, unlockOnly, categoryItem, q, sort } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
        const now = new Date();
        // base filter: only owner documents
        const and = [{ owner: new mongoose_1.Types.ObjectId(userId) }];
        // visibility filter
        if (visibility === 'public' || visibility === 'private') {
            and.push({ 'access.visibility': visibility });
        }
        // lock filter
        if (lock === 'none' || lock === 'timed') {
            and.push({ 'access.lock': lock });
        }
        // unlocked only (no lock or timed unlock reached)
        if (unlockOnly === 'true') {
            and.push({
                $or: [{ 'access.lock': 'none' }, { $and: [{ 'access.lock': 'timed' }, { 'access.unlockAt': { $lte: now } }] }],
            });
        }
        // categoryItem filter (comma-separated ids)
        if (categoryItem) {
            const ids = String(categoryItem)
                .split(',')
                .map((s) => s.trim())
                .filter(mongoose_1.Types.ObjectId.isValid)
                .map((id) => new mongoose_1.Types.ObjectId(id));
            if (ids.length === 0)
                return res.status(400).json({ message: 'Invalid categoryItem id(s)' });
            and.push({ categoryItem: { $in: ids } });
        }
        // text search on title/description (escaped regex)
        const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const query = (q !== null && q !== void 0 ? q : '').trim();
        if (query) {
            const pattern = escapeRegExp(query);
            and.push({
                $or: [{ title: { $regex: pattern, $options: 'i' } }, { description: { $regex: pattern, $options: 'i' } }],
            });
        }
        // combine filters
        const where = and.length === 1 ? and[0] : { $and: and };
        // sort (newest default)
        const s = (sort || '').toLowerCase();
        const dir = s === 'oldest' ? 1 : -1;
        const sortObj = { createdAt: dir };
        // query & count in parallel
        const [items, total] = yield Promise.all([
            Capsule_1.default.find(where)
                .sort(sortObj)
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .populate('owner')
                .lean(),
            Capsule_1.default.countDocuments(where),
        ]);
        return res.status(200).json({
            items,
            pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
            sort: dir === -1 ? 'newest' : 'oldest',
            filters: where,
        });
    }
    catch (error) {
        return next({ message: 'Failed to get capsules', statusCode: 500, data: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.getCapsules = getCapsules;
/* ------------ POST /capsules ------------ */
const createCapsule = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
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
            message: 'create capsule validation faield',
            statusCode: 422,
            data: data,
        });
    }
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { title, description } = req.body;
        let { access, categoryItem } = req.body;
        if (!userId) {
            yield (0, remover_1.removeUploaded)(req);
            return next({ message: 'Authentication required', statusCode: 401 });
        }
        const user = yield User_1.default.findById(userId);
        if (!user)
            return next({ message: 'user not found', statusCode: 404 });
        // basic required fields
        if (!title || !description || !access || !categoryItem) {
            yield (0, remover_1.removeUploaded)(req);
            return next({
                message: 'title, description, categoryItem and access are required',
                statusCode: 400,
            });
        }
        // categoryItem validation
        if (!mongoose_1.Types.ObjectId.isValid(categoryItem)) {
            yield (0, remover_1.removeUploaded)(req);
            return next({ message: 'Invalid categoryItem id', statusCode: 400 });
        }
        const cat = yield Category_1.CategoryItem.findById(categoryItem).lean();
        if (!cat) {
            yield (0, remover_1.removeUploaded)(req);
            return next({ message: 'Invalid categoryItem', statusCode: 400 });
        }
        // parse access if string (multipart)
        if (typeof access === 'string') {
            try {
                access = JSON.parse(access);
            }
            catch (_j) {
                yield (0, remover_1.removeUploaded)(req);
                return next({ message: 'Invalid access JSON', statusCode: 400 });
            }
        }
        // allowlist for access fields
        const allowedVisibility = ['public', 'private'];
        const allowedLock = ['none', 'timed'];
        const normalizedAccess = Object.assign(Object.assign(Object.assign({}, ((access === null || access === void 0 ? void 0 : access.visibility) !== undefined ? { visibility: access.visibility } : {})), ((access === null || access === void 0 ? void 0 : access.lock) !== undefined ? { lock: access.lock } : {})), ((access === null || access === void 0 ? void 0 : access.unlockAt) !== undefined ? { unlockAt: access.unlockAt } : {}));
        // validate access.visibility
        if (normalizedAccess.visibility && !allowedVisibility.includes(normalizedAccess.visibility)) {
            yield (0, remover_1.removeUploaded)(req);
            return next({ message: 'Invalid access.visibility', statusCode: 400 });
        }
        // validate access.lock
        if (normalizedAccess.lock && !allowedLock.includes(normalizedAccess.lock)) {
            yield (0, remover_1.removeUploaded)(req);
            return next({ message: 'Invalid access.lock', statusCode: 400 });
        }
        // public -> no timed lock
        if (normalizedAccess.visibility === 'public') {
            normalizedAccess.lock = 'none';
            delete normalizedAccess.unlockAt;
        }
        // timed lock constraints
        if (normalizedAccess.lock === 'timed') {
            if (normalizedAccess.visibility !== 'private') {
                yield (0, remover_1.removeUploaded)(req);
                return next({ message: 'timed lock is only allowed with private visibility', statusCode: 400 });
            }
            if (!normalizedAccess.unlockAt) {
                yield (0, remover_1.removeUploaded)(req);
                return next({ message: 'unlockAt is required when lock is timed', statusCode: 400 });
            }
            const unlockDate = new Date(normalizedAccess.unlockAt);
            if (isNaN(unlockDate.getTime()) || unlockDate.getTime() <= Date.now()) {
                yield (0, remover_1.removeUploaded)(req);
                return next({ message: 'unlockAt must be a valid future date', statusCode: 400 });
            }
            normalizedAccess.unlockAt = unlockDate;
        }
        // build document
        const doc = Object.assign(Object.assign(Object.assign({ title,
            description, categoryItem: new mongoose_1.Types.ObjectId(categoryItem), owner: new mongoose_1.Types.ObjectId(userId) }, (Object.keys(normalizedAccess).length && { access: normalizedAccess })), (req.body.color !== undefined && { color: req.body.color })), (req.body.extra !== undefined && { extra: req.body.extra }));
        // store image relative path if uploaded
        if ((_b = req.file) === null || _b === void 0 ? void 0 : _b.path) {
            const normalized = req.file.path.replace(/\\/g, '/');
            doc.image = (0, fileCleanup_1.toImagesRelative)(normalized);
        }
        const FLAG_LIMIT_REVIEW = 5;
        const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
        const AUTO_INIT_LOCK_FOR_VIOLATION = true;
        const flag = ((_c = user.flag) !== null && _c !== void 0 ? _c : 'none');
        if (flag === 'violation') {
            const now = new Date();
            let lockUntil = (_f = (_e = (_d = user === null || user === void 0 ? void 0 : user.moderation) === null || _d === void 0 ? void 0 : _d.violation) === null || _e === void 0 ? void 0 : _e.lockUntil) !== null && _f !== void 0 ? _f : null;
            if (!lockUntil && AUTO_INIT_LOCK_FOR_VIOLATION) {
                lockUntil = new Date(now.getTime() + WINDOW_MS);
                yield User_1.default.updateOne({ _id: user._id }, { $set: { 'moderation.violation.lockUntil': lockUntil } });
            }
            if (lockUntil && lockUntil > now) {
                yield (0, remover_1.removeUploaded)(req);
                return res.status(403).json({
                    message: 'You are temporarily blocked from creating capsules due to violation.',
                    capsule: null,
                    meta: { userFlag: flag, lockUntil },
                });
            }
        }
        if (flag === 'review') {
            const since = new Date(Date.now() - WINDOW_MS);
            const createdCount = yield Capsule_1.default.countDocuments({
                owner: user._id,
                createdAt: { $gte: since },
            });
            if (createdCount >= FLAG_LIMIT_REVIEW) {
                yield (0, remover_1.removeUploaded)(req);
                return res.status(429).json({
                    message: 'Weekly creation limit reached for review-flagged users.',
                    capsule: null,
                    meta: { userFlag: flag, window: '7d', limit: FLAG_LIMIT_REVIEW, used: createdCount },
                });
            }
        }
        let message = 'Capsule created successfully';
        if (flag === 'sus') {
            res.set('X-Moderation-Warning', 'Your account is under soft monitoring (flag: sus).');
            message = 'Capsule created (soft monitored).';
        }
        if (flag === 'review') {
            message = 'Capsule created (review account; weekly limit applies).';
        }
        const newCapsule = yield Capsule_1.default.create(doc);
        return res.status(201).json({
            message,
            status: 201,
            capsule: newCapsule,
            meta: { userFlag: user.flag, moderation: (_g = doc.moderation) !== null && _g !== void 0 ? _g : null },
        });
    }
    catch (error) {
        // cleanup uploaded file on error
        try {
            if ((error === null || error === void 0 ? void 0 : error.name) === 'ValidationError' || error) {
                if ((_h = req.file) === null || _h === void 0 ? void 0 : _h.path) {
                    const normalized = req.file.path.replace(/\\/g, '/');
                    yield (0, fileCleanup_1.deleteImageBulletproof)((0, fileCleanup_1.toImagesRelative)(normalized));
                }
            }
        }
        catch (_k) { }
        return next({ message: 'Failed to create capsule', statusCode: 500, data: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.createCapsule = createCapsule;
/* ------------ GET /capsules/:id ------------ */
const getSingleCapsule = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const capsuleId = req.params.id;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId)
            return next({ message: 'Authentication required', statusCode: 401 });
        if (!mongoose_1.Types.ObjectId.isValid(capsuleId)) {
            return next({ message: 'Invalid capsule id', statusCode: 400 });
        }
        // fetch one by id & owner
        const capsule = yield Capsule_1.default.findOne({ _id: capsuleId, owner: userId }).populate('categoryItem').lean();
        if (!capsule) {
            return next({ message: 'Capsule not found', statusCode: 404 });
        }
        return res.status(200).json({ message: 'Capsule found', capsule });
    }
    catch (error) {
        return next({ message: 'Failed to get capsule', statusCode: 500, data: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.getSingleCapsule = getSingleCapsule;
/* ------------ DELETE /capsules/:id ------------ */
const deleteCapsule = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const capsuleId = req.params.id;
        if (!userId)
            return next({ message: 'Authentication required', statusCode: 401 });
        if (!mongoose_1.Types.ObjectId.isValid(capsuleId)) {
            return next({ message: 'Invalid capsule id', statusCode: 400 });
        }
        // find first (to get image path), then delete
        const existing = yield Capsule_1.default.findOne({ _id: capsuleId, owner: userId }).select('image').lean();
        if (!existing) {
            return next({ message: 'Capsule not found', statusCode: 404 });
        }
        yield Capsule_1.default.deleteOne({ _id: capsuleId, owner: userId });
        // delete image file after DB delete
        if (existing.image) {
            yield (0, fileCleanup_1.deleteImageBulletproof)(existing.image);
        }
        return res.status(200).json({ message: 'Capsule deleted', status: 200 });
    }
    catch (error) {
        return next({ message: 'Failed to delete capsule', statusCode: 500, data: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.deleteCapsule = deleteCapsule;
/* ------------ PATCH /capsules/:id ------------ */
const editCapsule = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
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
        const capsuleId = req.params.id;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            yield (0, remover_1.removeUploaded)(req);
            return next({ message: 'Authentication required', statusCode: 401 });
        }
        if (!mongoose_1.Types.ObjectId.isValid(capsuleId)) {
            yield (0, remover_1.removeUploaded)(req);
            return next({ message: 'Invalid capsule id', statusCode: 400 });
        }
        // parse access when sent as JSON string (multipart)
        if (req.body.access === '') {
            delete req.body.access;
        }
        if (typeof req.body.access === 'string') {
            try {
                req.body.access = JSON.parse(req.body.access);
            }
            catch (_m) { }
        }
        // fetch existing to know previous image path & access state
        const existing = yield Capsule_1.default.findOne({ _id: capsuleId, owner: userId }).select('image access').lean();
        if (!existing) {
            yield (0, remover_1.removeUploaded)(req);
            return next({ message: 'Capsule not found', statusCode: 404 });
        }
        const prevImage = existing.image;
        // check timed lock active state
        const isTimedLocked = ((_b = existing.access) === null || _b === void 0 ? void 0 : _b.visibility) === 'private' && ((_c = existing.access) === null || _c === void 0 ? void 0 : _c.lock) === 'timed' && ((_d = existing.access) === null || _d === void 0 ? void 0 : _d.unlockAt) && new Date(existing.access.unlockAt).getTime() > Date.now();
        // map of allowed fields (simple updates)
        const allowed = ['title', 'description', 'extra', 'color', 'categoryItem'];
        const updates = {};
        let touched = false;
        // assign allowed fields
        for (const key of allowed) {
            const val = req.body[key];
            if (val !== undefined) {
                updates[key] = key === 'categoryItem' && mongoose_1.Types.ObjectId.isValid(val) ? new mongoose_1.Types.ObjectId(val) : val;
                touched = true;
            }
        }
        // upload new image (store relative)
        if ((_e = req.file) === null || _e === void 0 ? void 0 : _e.path) {
            const normalized = req.file.path.replace(/\\/g, '/');
            updates.image = (0, fileCleanup_1.toImagesRelative)(normalized);
            touched = true;
        }
        // remove image request via flags
        const removeImageRequested = req.body.image === '' || req.body.removeImage === 'true';
        if (removeImageRequested) {
            updates.image = undefined; // will translate to $unset
            touched = true;
        }
        // access object updates (visibility/lock/unlockAt)
        const access = req.body.access;
        if (access && typeof access === 'object') {
            // forbid access changes while timed lock active
            if (isTimedLocked) {
                return next({
                    message: 'Access is locked (timed). You cannot change access until unlockAt.',
                    statusCode: 400,
                });
            }
            // validate & set visibility
            if (access.visibility !== undefined) {
                if (access.visibility !== 'public' && access.visibility !== 'private') {
                    yield (0, remover_1.removeUploaded)(req);
                    return next({ message: 'Invalid access.visibility', statusCode: 400 });
                }
                updates['access.visibility'] = access.visibility;
                touched = true;
            }
            // public -> force no lock/unlockAt
            if (access.visibility === 'public') {
                updates['access.lock'] = 'none';
                updates['access.unlockAt'] = undefined;
                touched = true;
            }
            else if (access.visibility === 'private' || access.visibility === undefined) {
                // lock field
                if (access.lock !== undefined) {
                    if (access.lock !== 'none' && access.lock !== 'timed') {
                        yield (0, remover_1.removeUploaded)(req);
                        return next({ message: 'Invalid access.lock', statusCode: 400 });
                    }
                    updates['access.lock'] = access.lock;
                    touched = true;
                }
                // resolve next state using incoming or existing
                const nextLock = (_f = access.lock) !== null && _f !== void 0 ? _f : (_g = existing.access) === null || _g === void 0 ? void 0 : _g.lock;
                const nextVisibility = (_h = access.visibility) !== null && _h !== void 0 ? _h : (_j = existing.access) === null || _j === void 0 ? void 0 : _j.visibility;
                // timed lock requires future unlockAt
                if (nextVisibility === 'private' && nextLock === 'timed') {
                    const unlockAt = access.unlockAt !== undefined ? new Date(access.unlockAt) : (_k = existing.access) === null || _k === void 0 ? void 0 : _k.unlockAt;
                    if (!unlockAt || isNaN(new Date(unlockAt).getTime())) {
                        yield (0, remover_1.removeUploaded)(req);
                        return next({
                            message: 'unlockAt is required and must be a valid date when lock=timed',
                            statusCode: 400,
                        });
                    }
                    if (new Date(unlockAt).getTime() <= Date.now()) {
                        yield (0, remover_1.removeUploaded)(req);
                        return next({
                            message: 'unlockAt must be in the future for lock=timed',
                            statusCode: 400,
                        });
                    }
                    updates['access.unlockAt'] = unlockAt;
                    touched = true;
                }
                else if (nextLock === 'none') {
                    updates['access.unlockAt'] = undefined;
                    touched = true;
                }
            }
        }
        // no changes -> early return
        if (!touched) {
            return res.status(200).json({ message: 'Nothing to update' });
        }
        // build $set / $unset payloads
        const $set = {};
        const $unset = {};
        for (const [k, v] of Object.entries(updates)) {
            if (v === undefined)
                $unset[k] = '';
            else
                $set[k] = v;
        }
        const updateOps = {};
        if (Object.keys($set).length)
            updateOps.$set = $set;
        if (Object.keys($unset).length)
            updateOps.$unset = $unset;
        // apply update with validation
        const capsule = yield Capsule_1.default.findOneAndUpdate({ _id: capsuleId, owner: userId }, updateOps, { new: true, runValidators: true, context: 'query' });
        if (!capsule) {
            yield (0, remover_1.removeUploaded)(req);
            return next({ message: 'Capsule not found', statusCode: 404 });
        }
        // delete previous file if removed/replaced
        if (removeImageRequested && prevImage) {
            yield (0, fileCleanup_1.deleteImageBulletproof)(prevImage);
        }
        else if (((_l = req.file) === null || _l === void 0 ? void 0 : _l.path) && prevImage && prevImage !== capsule.image) {
            yield (0, fileCleanup_1.deleteImageBulletproof)(prevImage);
        }
        return res.status(200).json({ message: 'Capsule updated', status: 200, capsule });
    }
    catch (error) {
        yield (0, remover_1.removeUploaded)(req);
        return next({ message: 'Failed to update capsule', statusCode: 500, data: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.editCapsule = editCapsule;
const getCategories = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId)
            return next({ message: 'Authentication required', statusCode: 401 });
        const categoryItems = yield Category_1.CategoryItem.find().populate({ path: 'group', select: 'title' }).lean();
        return res.status(200).json({ message: 'Categories found', status: 200, categoryItems });
    }
    catch (error) {
        return next({ message: 'Failed to get categories', statusCode: 500, data: error.message });
    }
});
exports.getCategories = getCategories;
