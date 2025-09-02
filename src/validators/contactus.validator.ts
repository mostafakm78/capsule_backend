import { body } from 'express-validator';

const contactUsValidation = [
  body('firstName').isString().withMessage('لطفا اسم معتبر وارد نمایید').isLength({ min: 3, max: 12 }).withMessage('نام شما باید حداقل ٣ و حداکثر ١٢ کاراکتر باشد').trim().bail(),

  body('lastName').isString().withMessage('لطفا اسم معتبر وارد نمایید').isLength({ min: 3, max: 12 }).withMessage('نام خانوادگی شما باید حداقل ٣ و حداکثر ١٢ کاراکتر باشد').trim().bail(),

  body('email').isEmail().withMessage('لطفاً ایمیل معتبر وارد کنید').bail().normalizeEmail(),

  body('number')
    .isString()
    .withMessage('شماره موبایل باید رشته باشد')
    .matches(/^(?:\+?98|0098)?9\d{9}$/)
    .withMessage('شماره موبایل معتبر نیست')
    .trim()
    .bail(),

  body('title').isString().withMessage('عنوان شما نامعتبر می‌باشد').isLength({ min: 4, max: 16 }).withMessage('عنوان شما باید حداقل ۴ و حداکثر ۱۶ کاراکتر باشد').trim().bail(),

  body('description').isString().withMessage('توضیحات شما نامعتبر می‌باشد').isLength({ min: 32, max: 500 }).withMessage('توضیحات شما باید حداقل ۳۲ و حداکثر ۵۰۰ کاراکتر باشد').trim().bail(),
];
