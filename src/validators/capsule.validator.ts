import { body } from 'express-validator';
import { Types } from 'mongoose';

export const createCapsuleValidation = [
  body('title').isString().withMessage('عنوان شما نامعتبر می‌باشد').isLength({ min: 4, max: 16 }).withMessage('عنوان شما باید حداقل ۴ و حداکثر ۱۶ کاراکتر باشد').trim().bail(),

  body('description').isString().withMessage('توضیحات شما نامعتبر می‌باشد').isLength({ min: 32, max: 500 }).withMessage('توضیحات شما باید حداقل ۳۲ و حداکثر ۵۰۰ کاراکتر باشد').trim().bail(),

  body('categoryItem').custom((value) => {
    if (!value) throw new Error('دسته بندی شما الزامی میباشد');
    if (!Types.ObjectId.isValid(value)) throw new Error('شناسه دسته بندی شما نامعتبر میباشد');
    return true;
  }),

  body('access')
    .customSanitizer((value) => {
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (error) {
          return value;
        }
      }
      return value;
    })
    .custom((access) => {
      if (!access) throw new Error('مشخص کردن نوع کپسول الزامی میباشد');
      if (typeof access !== 'object') throw new Error('فیلد کپسول باید یک شی باشد');

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

  body('color').optional().isString().withMessage('رنگ باید رشته باشد'),

  body('extra').optional().isString().withMessage('توضیحات اضافی شما نامعتبر می‌باشد').isLength({ min: 32, max: 500 }).withMessage('توضیحات اضافی شما باید حداقل ۳۲ و حداکثر ۵۰۰ کاراکتر باشد').trim().bail(),
];

export const editCapsuleValidation = [
  body('title').optional().isString().withMessage('عنوان شما نامعتبر می‌باشد').isLength({ min: 4, max: 16 }).withMessage('عنوان شما باید حداقل ۴ و حداکثر ۱۶ کاراکتر باشد').trim().bail(),

  body('description').optional().isString().withMessage('توضیحات شما نامعتبر می‌باشد').isLength({ min: 32, max: 500 }).withMessage('توضیحات شما باید حداقل ۳۲ و حداکثر ۵۰۰ کاراکتر باشد').trim().bail(),

  body('access')
    .optional()
    .customSanitizer((value) => {
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (error) {
          return value;
        }
      }
      return value;
    })
    .custom((access) => {
      if (!access) throw new Error('مشخص کردن نوع کپسول الزامی میباشد');
      if (typeof access !== 'object') throw new Error('فیلد کپسول باید یک شی باشد');

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

  body('color').optional().isString().withMessage('رنگ باید رشته باشد'),

  body('extra').optional().isString().withMessage('توضیحات اضافی شما نامعتبر می‌باشد').isLength({ min: 32, max: 500 }).withMessage('توضیحات اضافی شما باید حداقل ۳۲ و حداکثر ۵۰۰ کاراکتر باشد').trim().bail(),
];
