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
exports.deleteNotification = exports.createNotification = exports.deleteCategory = exports.editCategory = exports.createCategory = exports.getCategories = exports.editSingleUserCapsule = exports.editSingleUser = exports.getSingleUserCapsule = exports.getSingleUserWithCapsules = exports.getCapsules = exports.getUsers = void 0;
const mongoose_1 = require("mongoose");
const User_1 = __importDefault(require("../models/User"));
const Capsule_1 = __importDefault(require("../models/Capsule"));
const Category_1 = require("../models/Category");
const Notification_1 = __importDefault(require("../models/Notification"));
const fileCleanup_1 = require("../helper/fileCleanup");
/* ------------------- Controllers ------------------- */
// List users (admin only)
const getUsers = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
        if (!userId)
            return next({ message: 'Authentication required', statusCode: 401 });
        if (userRole !== 'admin')
            return next({ message: 'Admin only', statusCode: 403 });
        const { page = '1', limit = '50', flag, banned, sort, q } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
        const and = [];
        if (typeof flag !== 'undefined') {
            const allowedFlags = ['none', 'sus', 'review', 'violation'];
            if (!allowedFlags.includes(flag)) {
                return next({ message: 'Invalid flag value', statusCode: 400 });
            }
            and.push({ flag: flag });
        }
        if (typeof banned !== 'undefined') {
            if (banned !== 'true' && banned !== 'false') {
                return next({ message: 'Invalid banned value (use true | false)', statusCode: 400 });
            }
            and.push({ isBanned: banned === 'true' });
        }
        const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const query = (q !== null && q !== void 0 ? q : '').trim();
        if (query) {
            const pattern = escapeRegExp(query);
            and.push({
                $or: [{ name: { $regex: pattern, $options: 'i' } }, { username: { $regex: pattern, $options: 'i' } }, { email: { $regex: pattern, $options: 'i' } }],
            });
        }
        const where = and.length === 0 ? {} : and.length === 1 ? and[0] : { $and: and };
        const s = (sort || '').toLowerCase();
        const sortObj = { createdAt: s === 'oldest' ? 1 : -1 };
        const [items, total] = yield Promise.all([
            User_1.default.find(where)
                .select('-password')
                .sort(sortObj)
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .lean(),
            User_1.default.countDocuments(where),
        ]);
        return res.status(200).json({
            items,
            status: 200,
            pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
            sort: sortObj.createdAt === -1 ? 'newest' : 'oldest',
            filters: where,
        });
    }
    catch (error) {
        return next({ message: 'Failed to get users', statusCode: 500, data: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.getUsers = getUsers;
const getCapsules = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userRole = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
        if (userRole !== 'admin') {
            return next({ message: 'Admin only', statusCode: 403 });
        }
        // pagination & filters from query
        const { page = '1', limit = '15', visibility, lock, unlockOnly, categoryItem, q, sort } = req.query;
        const pageNum = Math.max(1, parseInt(page, 15) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
        const now = new Date();
        const and = [];
        // visibility filter
        if (visibility === 'public' || visibility === 'private') {
            and.push({ 'access.visibility': visibility });
        }
        // lock filter
        if (lock === 'none' || lock === 'timed') {
            and.push({ 'access.lock': lock });
        }
        // unlocked only
        if (unlockOnly === 'true') {
            and.push({
                $or: [{ 'access.lock': 'none' }, { $and: [{ 'access.lock': 'timed' }, { 'access.unlockAt': { $lte: now } }] }],
            });
        }
        // categoryItem filter
        if (categoryItem) {
            const ids = String(categoryItem)
                .split(',')
                .map((s) => s.trim())
                .filter(mongoose_1.Types.ObjectId.isValid)
                .map((id) => new mongoose_1.Types.ObjectId(id));
            if (ids.length === 0) {
                return res.status(400).json({ message: 'Invalid categoryItem id(s)' });
            }
            and.push({ categoryItem: { $in: ids } });
        }
        // text search
        const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const query = (q !== null && q !== void 0 ? q : '').trim();
        if (query) {
            const pattern = escapeRegExp(query);
            and.push({
                $or: [{ title: { $regex: pattern, $options: 'i' } }, { description: { $regex: pattern, $options: 'i' } }],
            });
        }
        const where = and.length === 0 ? {} : and.length === 1 ? and[0] : { $and: and };
        // sort
        const s = (sort || '').toLowerCase();
        const dir = s === 'oldest' ? 1 : -1;
        const sortObj = { createdAt: dir };
        // query
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
// Get a user + their capsules (admin only)
const getSingleUserWithCapsules = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
        const singleUserId = req.params.id;
        if (!userId)
            return next({ message: 'Authentication required', statusCode: 401 });
        if (userRole !== 'admin')
            return next({ message: 'Admin only', statusCode: 403 });
        if (!singleUserId)
            return next({ message: 'User not found', statusCode: 404 });
        if (!mongoose_1.Types.ObjectId.isValid(singleUserId))
            return next({ message: 'Invalid user id', statusCode: 400 });
        const user = yield User_1.default.findById(singleUserId).lean();
        if (!user)
            return next({ message: 'User not found', statusCode: 404 });
        const { page = '1', limit = '10', visibility, lock, unlockOnly, categoryItem, q, sort } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
        const now = new Date();
        const and = [{ owner: new mongoose_1.Types.ObjectId(singleUserId) }];
        if (visibility === 'public' || visibility === 'private') {
            and.push({ 'access.visibility': visibility });
        }
        if (lock === 'none' || lock === 'timed') {
            and.push({ 'access.lock': lock });
        }
        if (unlockOnly === 'true') {
            and.push({
                $or: [{ 'access.lock': 'none' }, { $and: [{ 'access.lock': 'timed' }, { 'access.unlockAt': { $lte: now } }] }],
            });
        }
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
        const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const query = (q !== null && q !== void 0 ? q : '').trim();
        if (query) {
            const pattern = escapeRegExp(query);
            and.push({
                $or: [{ title: { $regex: pattern, $options: 'i' } }, { description: { $regex: pattern, $options: 'i' } }],
            });
        }
        const where = and.length === 1 ? and[0] : { $and: and };
        const s = (sort || '').toLowerCase();
        const dir = s === 'oldest' ? 1 : -1;
        const sortObj = { createdAt: dir };
        const [items, total] = yield Promise.all([
            Capsule_1.default.find(where)
                .sort(sortObj)
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .lean(),
            Capsule_1.default.countDocuments(where),
        ]);
        return res.status(200).json({
            message: 'User found',
            status: 200,
            user,
            capsules: {
                items,
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum),
                sort: s === 'oldest' ? 'oldest' : 'newest',
            },
        });
    }
    catch (error) {
        return next({ message: 'Failed to get user', statusCode: 500, data: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.getSingleUserWithCapsules = getSingleUserWithCapsules;
// Get one capsule of a user (admin only)
const getSingleUserCapsule = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
        const { id: singleUserId, capsuleId } = req.params;
        if (!userId)
            return next({ message: 'Authentication required', statusCode: 401 });
        if (userRole !== 'admin')
            return next({ message: 'Admin only', statusCode: 403 });
        if (!singleUserId)
            return next({ message: 'User not found', statusCode: 404 });
        if (!capsuleId)
            return next({ message: 'Capsule not found', statusCode: 404 });
        if (!mongoose_1.Types.ObjectId.isValid(singleUserId) || !mongoose_1.Types.ObjectId.isValid(capsuleId)) {
            return next({ message: 'Invalid id', statusCode: 400 });
        }
        const singleCapsule = yield Capsule_1.default.findOne({ _id: capsuleId, owner: singleUserId }).populate('owner').lean();
        if (!singleCapsule)
            return next({ message: 'Capsule not found', statusCode: 404 });
        return res.status(200).json({ message: 'Capsule found', singleCapsule });
    }
    catch (error) {
        return next({ message: 'Failed to get user', statusCode: 500, data: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.getSingleUserCapsule = getSingleUserCapsule;
// Edit user fields (admin only)
const editSingleUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
        const singleUserId = req.params.id;
        if (!userId)
            return next({ message: 'Authentication required', statusCode: 401 });
        if (userRole !== 'admin')
            return next({ message: 'Admin only', statusCode: 403 });
        if (!singleUserId)
            return next({ message: 'User not found', statusCode: 404 });
        if (!mongoose_1.Types.ObjectId.isValid(singleUserId))
            return next({ message: 'Invalid user id', statusCode: 400 });
        const body = req.body;
        const update = {};
        let touched = false;
        if (body.role !== undefined) {
            if (body.role === 'admin' || body.role === 'user')
                update.role = body.role;
            else
                return next({ message: 'Role must be admin | user', statusCode: 400 });
            touched = true;
        }
        if (body.isBanned !== undefined) {
            if (typeof body.isBanned === 'boolean')
                update.isBanned = body.isBanned;
            else
                return next({ message: 'isBanned must be boolean', statusCode: 400 });
            touched = true;
        }
        if (body.flag !== undefined) {
            const ok = ['sus', 'none', 'violation', 'review'];
            if (ok.includes(body.flag))
                update.flag = body.flag;
            else
                return next({ message: 'Flag must be none | sus | violation | review', statusCode: 400 });
            touched = true;
        }
        if (!touched)
            return res.status(200).json({ message: 'Nothing to update' });
        const updateUser = yield User_1.default.findByIdAndUpdate(singleUserId, { $set: update }, { new: true, runValidators: true });
        if (!updateUser)
            return next({ message: 'User not found', statusCode: 404 });
        return res.status(200).json({ message: 'Profile updated', status: 200, user: updateUser });
    }
    catch (error) {
        return next({ message: 'Failed to update user', statusCode: 500, data: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.editSingleUser = editSingleUser;
// Edit a user's capsule (admin only)
const editSingleUserCapsule = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
        const { id: singleUserId, capsuleId } = req.params;
        if (!userId)
            return next({ message: 'Authentication required', statusCode: 401 });
        if (userRole !== 'admin')
            return next({ message: 'Admin only', statusCode: 403 });
        if (!mongoose_1.Types.ObjectId.isValid(singleUserId) || !mongoose_1.Types.ObjectId.isValid(capsuleId)) {
            return next({ message: 'Invalid id', statusCode: 400 });
        }
        if (req.body.access === '')
            delete req.body.access;
        if (typeof req.body.access === 'string') {
            try {
                req.body.access = JSON.parse(req.body.access);
            }
            catch (_p) { }
        }
        const existing = yield Capsule_1.default.findOne({ _id: capsuleId, owner: singleUserId }).select('image access').lean();
        if (!existing)
            return next({ message: 'Capsule not found', statusCode: 404 });
        const prevImage = existing.image;
        const isTimedLocked = ((_c = existing.access) === null || _c === void 0 ? void 0 : _c.visibility) === 'private' && ((_d = existing.access) === null || _d === void 0 ? void 0 : _d.lock) === 'timed' && !!((_e = existing.access) === null || _e === void 0 ? void 0 : _e.unlockAt) && new Date(existing.access.unlockAt).getTime() > Date.now();
        const allowedKeys = ['title', 'image', 'description', 'extra', 'color', 'categoryItem'];
        const updates = {};
        let touched = false;
        for (const key of allowedKeys) {
            const val = req.body[key];
            if (val !== undefined) {
                updates[key] = key === 'categoryItem' && mongoose_1.Types.ObjectId.isValid(val) ? new mongoose_1.Types.ObjectId(val) : val;
                touched = true;
            }
        }
        if ((_f = req.file) === null || _f === void 0 ? void 0 : _f.path) {
            const normalized = req.file.path.replace(/\\/g, '/');
            updates.image = (0, fileCleanup_1.toImagesRelative)(normalized);
            touched = true;
        }
        const removeImageRequested = req.body.image === '' || req.body.removeImage === 'true' || req.body.removeImage === true;
        if (removeImageRequested && !((_g = req.file) === null || _g === void 0 ? void 0 : _g.path)) {
            updates.image = undefined;
            touched = true;
        }
        const access = req.body.access;
        if (access && typeof access === 'object') {
            if (isTimedLocked) {
                return next({
                    message: 'Access is locked (timed). You cannot change access until unlockAt.',
                    statusCode: 400,
                });
            }
            if (access.visibility !== undefined) {
                if (access.visibility !== 'public' && access.visibility !== 'private') {
                    return next({ message: 'Invalid access.visibility', statusCode: 400 });
                }
                updates['access.visibility'] = access.visibility;
                touched = true;
            }
            if (access.visibility === 'public') {
                updates['access.lock'] = 'none';
                updates['access.unlockAt'] = undefined;
                touched = true;
            }
            else if (access.visibility === 'private' || access.visibility === undefined) {
                if (access.lock !== undefined) {
                    if (access.lock !== 'none' && access.lock !== 'timed') {
                        return next({ message: 'Invalid access.lock', statusCode: 400 });
                    }
                    updates['access.lock'] = access.lock;
                    touched = true;
                }
                const nextLock = (_h = access.lock) !== null && _h !== void 0 ? _h : (_j = existing.access) === null || _j === void 0 ? void 0 : _j.lock;
                const nextVisibility = (_k = access.visibility) !== null && _k !== void 0 ? _k : (_l = existing.access) === null || _l === void 0 ? void 0 : _l.visibility;
                if (nextVisibility === 'private' && nextLock === 'timed') {
                    const unlockAt = access.unlockAt !== undefined ? new Date(access.unlockAt) : (_m = existing.access) === null || _m === void 0 ? void 0 : _m.unlockAt;
                    if (!unlockAt || isNaN(unlockAt.getTime())) {
                        return next({
                            message: 'unlockAt is required and must be a valid date when lock=timed',
                            statusCode: 400,
                        });
                    }
                    if (unlockAt.getTime() <= Date.now()) {
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
        if (!touched)
            return res.status(200).json({ message: 'Nothing to update' });
        const $set = {};
        const $unset = {};
        for (const [k, v] of Object.entries(updates)) {
            if (v === undefined)
                $unset[k] = '';
            else
                $set[k] = v;
        }
        if (updates['access.lock'] === 'none' || updates['access.visibility'] === 'public') {
            $unset['access.unlockAt'] = '';
            delete $set['access.unlockAt'];
        }
        const updateOps = {};
        if (Object.keys($set).length)
            updateOps.$set = $set;
        if (Object.keys($unset).length)
            updateOps.$unset = $unset;
        const capsule = yield Capsule_1.default.findOneAndUpdate({ _id: capsuleId, owner: singleUserId }, updateOps, { new: true, runValidators: true, context: 'query' });
        if (!capsule)
            return next({ message: 'Capsule not found', statusCode: 404 });
        try {
            if (removeImageRequested && prevImage) {
                yield (0, fileCleanup_1.deleteImageBulletproof)(prevImage);
            }
            else if (((_o = req.file) === null || _o === void 0 ? void 0 : _o.path) && prevImage && prevImage !== capsule.image) {
                yield (0, fileCleanup_1.deleteImageBulletproof)(prevImage);
            }
        }
        catch (_q) { }
        return res.status(200).json({ message: 'User capsule updated', capsule });
    }
    catch (error) {
        return next({ message: 'Failed to update user capsule', statusCode: 500, data: error.message });
    }
});
exports.editSingleUserCapsule = editSingleUserCapsule;
// Get all categories (admin only) — same shape as user version
const getCategories = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
        if (!userId) {
            return next({ message: 'Authentication required', statusCode: 401 });
        }
        if (userRole !== 'admin') {
            return next({ message: 'Admin only', statusCode: 403 });
        }
        const categoryItems = yield Category_1.CategoryItem.find()
            .populate({ path: 'group', select: 'title' })
            .sort({ createdAt: 1 }) // اختیاری: مرتب‌سازی پایدار
            .lean();
        return res.status(200).json({
            message: 'Categories found',
            status: 200,
            categoryItems,
        });
    }
    catch (error) {
        return next({
            message: 'Failed to get categories',
            statusCode: 500,
            data: error.message,
        });
    }
});
exports.getCategories = getCategories;
// Create a category item (admin only)
const createCategory = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
        const { categoryItem } = req.body;
        const { titleId: categoryTitleId } = req.params;
        if (!userId)
            return next({ message: 'Authentication required', statusCode: 401 });
        if (userRole !== 'admin')
            return next({ message: 'Admin only', statusCode: 403 });
        if (!categoryTitleId)
            return next({ message: 'Category title is required', statusCode: 400 });
        if (!mongoose_1.Types.ObjectId.isValid(categoryTitleId)) {
            return next({ message: 'Invalid category title id', statusCode: 400 });
        }
        const normalizedTitle = (categoryItem !== null && categoryItem !== void 0 ? categoryItem : '').trim();
        if (!normalizedTitle) {
            return next({ message: 'Category item is required', statusCode: 400 });
        }
        const categoryGroup = yield Category_1.CategoryGroup.findById(categoryTitleId);
        if (!categoryGroup) {
            return next({ message: 'Category title not found', statusCode: 404 });
        }
        // اتکا به ایندکس یکتا + هندل خطای 11000 برای اتمیک بودن
        const doc = yield Category_1.CategoryItem.create({
            title: normalizedTitle,
            group: categoryTitleId,
        });
        return res.status(201).json({ message: 'Category item created successfully', categoryItem: doc });
    }
    catch (error) {
        if ((error === null || error === void 0 ? void 0 : error.code) === 11000) {
            return next({ message: 'Category item already exists', statusCode: 409 });
        }
        return next({ message: 'Failed to create category', statusCode: 500, data: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.createCategory = createCategory;
// Edit a category item (admin only)
const editCategory = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
        const { categoryItem } = req.body;
        const { itemId: categoryItemId, titleId: categoryTitleId } = req.params;
        if (!userId)
            return next({ message: 'Authentication required', statusCode: 401 });
        if (userRole !== 'admin')
            return next({ message: 'Admin only', statusCode: 403 });
        if (!categoryTitleId)
            return next({ message: 'Category title is required', statusCode: 400 });
        if (!categoryItemId)
            return next({ message: 'Category item is required', statusCode: 400 });
        if (!mongoose_1.Types.ObjectId.isValid(categoryTitleId) || !mongoose_1.Types.ObjectId.isValid(categoryItemId)) {
            return next({ message: 'Invalid id', statusCode: 400 });
        }
        const normalizedTitle = (categoryItem !== null && categoryItem !== void 0 ? categoryItem : '').trim();
        if (!normalizedTitle) {
            return next({ message: 'Category item is required', statusCode: 400 });
        }
        const categoryGroup = yield Category_1.CategoryGroup.findById(categoryTitleId);
        if (!categoryGroup)
            return next({ message: 'Category title not found', statusCode: 404 });
        const updated = yield Category_1.CategoryItem.findOneAndUpdate({ _id: categoryItemId, group: categoryTitleId }, { $set: { title: normalizedTitle } }, { runValidators: true, new: true, context: 'query' });
        if (!updated)
            return next({ message: 'Category item not found', statusCode: 404 });
        return res.status(200).json({ message: 'Category item updated successfully', categoryItem: updated });
    }
    catch (error) {
        if ((error === null || error === void 0 ? void 0 : error.code) === 11000) {
            // برخورد با موردی که عنوان جدید در همان گروه از قبل وجود دارد
            return next({ message: 'Category item already exists', statusCode: 409 });
        }
        return next({ message: 'Failed to update categories', statusCode: 500, data: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.editCategory = editCategory;
// Delete a category item (admin only) — تغییری نیاز ندارد، فقط پیام خطا را یک‌دست می‌کنیم
const deleteCategory = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
        const { itemId: categoryItemId, titleId: categoryTitleId } = req.params;
        if (!userId)
            return next({ message: 'Authentication required', statusCode: 401 });
        if (userRole !== 'admin')
            return next({ message: 'Admin only', statusCode: 403 });
        if (!categoryTitleId)
            return next({ message: 'Category title is required', statusCode: 400 });
        if (!categoryItemId)
            return next({ message: 'Category item is required', statusCode: 400 });
        if (!mongoose_1.Types.ObjectId.isValid(categoryTitleId) || !mongoose_1.Types.ObjectId.isValid(categoryItemId)) {
            return next({ message: 'Invalid id', statusCode: 400 });
        }
        const categoryGroup = yield Category_1.CategoryGroup.findById(categoryTitleId);
        if (!categoryGroup)
            return next({ message: 'Category title not found', statusCode: 404 });
        const deleted = yield Category_1.CategoryItem.findOneAndDelete({ _id: categoryItemId, group: categoryTitleId });
        if (!deleted)
            return next({ message: 'Category item not found', statusCode: 404 });
        return res.status(200).json({ message: 'Category item deleted successfully' });
    }
    catch (error) {
        return next({ message: 'Failed to delete categories', statusCode: 500, data: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.deleteCategory = deleteCategory;
// Create a notification for users with a flag (admin only)
const createNotification = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
        const { text, type, title } = req.body;
        if (!userId)
            return next({ message: 'Authentication required', statusCode: 401 });
        if (userRole !== 'admin')
            return next({ message: 'Admin only', statusCode: 403 });
        if (!text || !text.trim())
            return next({ message: 'Text is required', statusCode: 400 });
        if (!type || !type.trim())
            return next({ message: 'type is required', statusCode: 400 });
        const finalTitle = title !== null && title !== void 0 ? title : 'پیام جدید';
        const newNotification = yield Notification_1.default.create({ text, title: finalTitle, type });
        return res.status(201).json({ message: 'Notification created successfully', newNotification });
    }
    catch (error) {
        return next({ message: 'Failed to create notification', statusCode: 500, data: error.message });
    }
});
exports.createNotification = createNotification;
// Delete a notification (admin only)
const deleteNotification = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { notifId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
        if (!userId)
            return next({ message: 'Authentication required', statusCode: 401 });
        if (userRole !== 'admin')
            return next({ message: 'Admin only', statusCode: 403 });
        if (!mongoose_1.Types.ObjectId.isValid(notifId)) {
            return next({ message: 'Invalid notification id', statusCode: 400 });
        }
        const deleted = yield Notification_1.default.findByIdAndDelete(notifId);
        if (!deleted)
            return next({ message: 'Notification not found', statusCode: 404 });
        return res.status(200).json({ message: 'Notification deleted successfully' });
    }
    catch (error) {
        return next({ message: 'Failed to delete notification', statusCode: 500, data: error.message });
    }
});
exports.deleteNotification = deleteNotification;
