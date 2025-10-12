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
exports.getCategories = exports.getSingleCapsule = exports.getUserCapsules = exports.getCapsules = exports.postContactForm = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const ContactUs_1 = __importDefault(require("../models/ContactUs"));
const express_validator_1 = require("express-validator");
const Capsule_1 = __importDefault(require("../models/Capsule"));
const mongoose_1 = require("mongoose");
const remover_1 = require("../helper/remover");
const Category_1 = require("../models/Category");
function requiredEnv(name) {
    const v = process.env[name];
    if (!v)
        throw new Error(`Missing env: ${name}`);
    return v;
}
// Handle "Contact Us" submission
const postContactForm = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
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
        // Extract required fields from body (FormRequest)
        const { firstName, lastName, email, number, title, description } = req.body;
        // Basic validation: all fields required
        if (!firstName || !lastName || !email || !number || !title || !description) {
            return next({
                message: 'All fields are required',
                statusCode: 400,
            });
        }
        // Persist form entry to DB
        const newContactForm = yield ContactUs_1.default.create({
            firstName,
            lastName,
            email,
            number,
            title,
            description,
        });
        // Configure Nodemailer (Gmail SMTP); move creds to ENV in production
        const transporter = nodemailer_1.default.createTransport({
            host: requiredEnv('SMTP_HOST'),
            port: Number(requiredEnv('SMTP_PORT')),
            secure: false,
            auth: {
                user: requiredEnv('SMTP_USER'),
                pass: requiredEnv('SMTP_PASS'),
            },
        });
        // Compose email to admin
        const mailOptions = {
            from: email, // user email
            to: requiredEnv('CONTACT_TO'), // admin email
            subject: 'پیام جدید از کاربران سایت کپسول',
            html: `
    <html lang="fa" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>سایت کپسول</title>
      </head>
      <body
        style="
          display: flex;
          direction: rtl;
          flex-direction: column;
          width: 100%;
          min-height: 100vh;
          padding: 25px;
          justify-content: center;
          align-items: center;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          background-color: #f4f4f9;
        "
      >
        <div style="padding: 20px; border-radius: 10px; background-color: white; width: 100%; max-width: 600px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1)">
          <h2 style="color: #65647c; text-align: center">کاربر سایت کپسول پیامی فرستاده</h2>
          <div style="border-top: 1px solid #ddd; padding: 10px">
            <strong style="color: #65647c; display: inline-block; width: 120px">اسم:</strong>
            <p style="color: #f7a5a5; display: inline-block">${firstName} ${lastName}</p>
          </div>
          <div style="border-top: 1px solid #ddd; padding: 10px">
            <strong style="color: #65647c; display: inline-block; width: 120px">ایمیل:</strong>
            <p style="color: #f7a5a5; display: inline-block">${email}</p>
          </div>
          <div style="border-top: 1px solid #ddd; padding: 10px">
            <strong style="color: #65647c; display: inline-block; width: 120px">شماره تماس:</strong>
            <p style="color: #f7a5a5; display: inline-block">${number}</p>
          </div>
          <div style="border-top: 1px solid #ddd; padding: 10px">
            <strong style="color: #65647c; display: inline-block; width: 120px">عنوان:</strong>
            <p style="color: #f7a5a5; display: inline-block">${title}</p>
          </div>
          <div style="border-top: 1px solid #ddd; padding: 10px">
            <strong style="color: #65647c; display: inline-block; width: 120px">توضیحات پیام:</strong>
            <p style="color: #f7a5a5; display: inline-block">${description}</p>
          </div>
        </div>
      </body>
    </html>
      `,
        };
        // Send email (callback style); note: response is sent below regardless
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Error sending email', error);
                return next({
                    message: 'Failed to send email',
                    statusCode: 500,
                    data: error.message,
                });
            }
        });
        // Success response (201 Created) with saved entity
        res.status(201).json({ message: 'Contact form submitted', newContactForm });
    }
    catch (error) {
        // Unexpected server error
        return next({
            message: 'Internal error while submitting form',
            statusCode: 500,
            data: (_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error,
        });
    }
});
exports.postContactForm = postContactForm;
const getCapsules = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // pagination & filters from query
        const { page = '1', limit = '12', categoryItem, q, sort } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 12));
        // base filter: only owner documents
        const and = [];
        and.push({ 'access.visibility': 'public' });
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
const getUserCapsules = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.params) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            yield (0, remover_1.removeUploaded)(req);
            return next({ message: 'user not found', statusCode: 404 });
        }
        if (!(0, mongoose_1.isValidObjectId)(userId)) {
            yield (0, remover_1.removeUploaded)(req);
            return next({ message: 'Invalid user id', statusCode: 400 });
        }
        const { page = '1', limit = '6', categoryItem, q, sort } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 6));
        const and = [{ owner: new mongoose_1.Types.ObjectId(userId) }];
        and.push({ 'access.visibility': 'public' });
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
        const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const query = (q !== null && q !== void 0 ? q : '').trim();
        if (query) {
            const pattern = escapeRegExp(query);
            and.push({ $or: [{ title: { $regex: pattern, $options: 'i' } }, { description: { $regex: pattern, $options: 'i' } }] });
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
        if (typeof (error === null || error === void 0 ? void 0 : error.message) === 'string' && /24 character hex string/i.test(error.message)) {
            return next({ message: 'Invalid id format', statusCode: 400 });
        }
        return next({ message: 'Failed to get capsules', statusCode: 500, data: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.getUserCapsules = getUserCapsules;
/* ------------ GET /capsules/:id ------------ */
const getSingleCapsule = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const capsuleId = req.params.id;
        if (!mongoose_1.Types.ObjectId.isValid(capsuleId)) {
            return next({ message: 'Invalid capsule id', statusCode: 400 });
        }
        // fetch one by id & owner
        const capsule = yield Capsule_1.default.findOne({ _id: capsuleId }).populate('categoryItem owner').lean();
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
const getCategories = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categoryItems = yield Category_1.CategoryItem.find().populate({ path: 'group', select: 'title' }).lean();
        return res.status(200).json({ message: 'Categories found', status: 200, categoryItems });
    }
    catch (error) {
        return next({ message: 'Failed to get categories', statusCode: 500, data: error.message });
    }
});
exports.getCategories = getCategories;
