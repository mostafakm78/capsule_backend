"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.editCapsuleValidation = exports.createCapsuleValidation = void 0;
const express_validator_1 = require("express-validator");
const mongoose_1 = require("mongoose");
exports.createCapsuleValidation = [
    (0, express_validator_1.body)('title').isString().withMessage('عنوان شما نامعتبر می‌باشد').isLength({ min: 4, max: 16 }).withMessage('عنوان شما باید حداقل ۴ و حداکثر ۱۶ کاراکتر باشد').trim().bail(),
    (0, express_validator_1.body)('description').isString().withMessage('توضیحات شما نامعتبر می‌باشد').isLength({ min: 32, max: 500 }).withMessage('توضیحات شما باید حداقل ۳۲ و حداکثر ۵۰۰ کاراکتر باشد').trim().bail(),
    (0, express_validator_1.body)('categoryItem').custom((value) => {
        if (!value)
            throw new Error('دسته بندی شما الزامی میباشد');
        if (!mongoose_1.Types.ObjectId.isValid(value))
            throw new Error('شناسه دسته بندی شما نامعتبر میباشد');
        return true;
    }),
    (0, express_validator_1.body)('access')
        .customSanitizer((value) => {
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            }
            catch (error) {
                return value;
            }
        }
        return value;
    })
        .custom((access) => {
        if (!access)
            throw new Error('مشخص کردن نوع کپسول الزامی میباشد');
        if (typeof access !== 'object')
            throw new Error('فیلد کپسول باید یک شی باشد');
        const allowedVisibility = ['public', 'private'];
        const allowedLock = ['none', 'timed'];
        if (!allowedVisibility.includes(access.visibility)) {
            throw new Error('نوع کپسول نامعتبر میباشد ؛ عمومی یا خصوصی');
        }
        if (access.lock && !allowedLock.includes(access.lock)) {
            throw new Error('نوع کپسول خصوصی نامعتبر میباشد ؛ زمان دار یا معمولی');
        }
        if (access.visibility === 'public') {
            if (access.lock && access.lock !== 'none') {
                throw new Error('برای visibility=public فقط lock=none مجاز است');
            }
            if (access.unlockAt) {
                throw new Error('مقدار unlockAt نباید برای حالت عمومی ارسال شود');
            }
        }
        if (access.lock === 'timed') {
            if (access.visibility !== 'private') {
                throw new Error('timed lock فقط با private visibility مجاز است');
            }
            if (!access.unlockAt) {
                throw new Error('برای lock=timed مقدار unlockAt الزامی است');
            }
            const unlockDate = new Date(access.unlockAt);
            if (isNaN(unlockDate.getTime()) || unlockDate.getTime() <= Date.now()) {
                throw new Error('unlockAt باید تاریخ معتبر آینده باشد');
            }
        }
        return true;
    }),
    (0, express_validator_1.body)('color').optional().isString().withMessage('رنگ باید رشته باشد'),
    (0, express_validator_1.body)('extra').optional({ checkFalsy: true, nullable: true }).isString().withMessage('توضیحات اضافی شما نامعتبر می‌باشد').isLength({ min: 32, max: 500 }).withMessage('توضیحات اضافی شما باید حداقل ۳۲ و حداکثر ۵۰۰ کاراکتر باشد').trim().bail(),
];
exports.editCapsuleValidation = [
    (0, express_validator_1.body)('title').optional({ checkFalsy: true, nullable: true }).isString().withMessage('عنوان شما نامعتبر می‌باشد').isLength({ min: 4, max: 16 }).withMessage('عنوان شما باید حداقل ۴ و حداکثر ۱۶ کاراکتر باشد').trim().bail(),
    (0, express_validator_1.body)('description').optional({ checkFalsy: true, nullable: true }).isString().withMessage('توضیحات شما نامعتبر می‌باشد').isLength({ min: 32, max: 500 }).withMessage('توضیحات شما باید حداقل ۳۲ و حداکثر ۵۰۰ کاراکتر باشد').trim().bail(),
    // ویرایش categoryItem هم امن‌تر می‌شود
    (0, express_validator_1.body)('categoryItem')
        .optional({ checkFalsy: true, nullable: true })
        .custom((value) => {
        if (!mongoose_1.Types.ObjectId.isValid(value))
            throw new Error('شناسه دسته بندی شما نامعتبر میباشد');
        return true;
    }),
    (0, express_validator_1.body)('access')
        .optional({ checkFalsy: true, nullable: true })
        .customSanitizer((value) => {
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            }
            catch (_a) {
                return value;
            }
        }
        return value;
    })
        .custom((access) => {
        // اگر اصلاً نیامده (به‌خاطر optional) از این مرحله می‌گذرد
        if (access === undefined || access === null || access === '')
            return true;
        if (typeof access !== 'object')
            throw new Error('فیلد کپسول باید یک شی باشد');
        const allowedVisibility = ['public', 'private'];
        const allowedLock = ['none', 'timed'];
        if (access.visibility !== undefined && !allowedVisibility.includes(access.visibility)) {
            throw new Error('نوع کپسول نامعتبر میباشد ؛ عمومی یا خصوصی');
        }
        if (access.lock !== undefined && !allowedLock.includes(access.lock)) {
            throw new Error('نوع کپسول خصوصی نامعتبر میباشد ؛ زمان دار یا معمولی');
        }
        if (access.visibility === 'public') {
            if (access.lock && access.lock !== 'none')
                throw new Error('برای visibility=public فقط lock=none مجاز است');
            if (access.unlockAt)
                throw new Error('مقدار unlockAt نباید برای حالت عمومی ارسال شود');
        }
        // اگر lock یا visibility نیامده، کنترلر با وضعیت قبلی ادغام می‌کند
        if (access.lock === 'timed') {
            if (access.visibility && access.visibility !== 'private') {
                throw new Error('timed lock فقط با private visibility مجاز است');
            }
            if (!access.unlockAt)
                throw new Error('برای lock=timed مقدار unlockAt الزامی است');
            const d = new Date(access.unlockAt);
            if (isNaN(d.getTime()) || d.getTime() <= Date.now())
                throw new Error('unlockAt باید تاریخ معتبر آینده باشد');
        }
        return true;
    }),
    (0, express_validator_1.body)('color').optional({ checkFalsy: true, nullable: true }).isString().withMessage('رنگ باید رشته باشد'),
    (0, express_validator_1.body)('extra').optional({ checkFalsy: true, nullable: true }).isString().withMessage('توضیحات اضافی شما نامعتبر می‌باشد').isLength({ min: 32, max: 500 }).withMessage('توضیحات اضافی شما باید حداقل ۳۲ و حداکثر ۵۰۰ کاراکتر باشد').trim().bail(),
];
