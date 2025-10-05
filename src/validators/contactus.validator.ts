import { body } from 'express-validator';

const toEnDigits = (s: string) => s.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - '۰'.charCodeAt(0))).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - '٠'.charCodeAt(0)));

const cleanPhone = (s: string) =>
  s
    .replace(/[\u200c\u200f\u200e\u202a-\u202e]/g, '')
    .replace(/[^\d+]/g, '');

const toE164IR = (v: string) => {
  let s = v;
  if (s.startsWith('0098')) s = s.slice(4);
  else if (s.startsWith('+98')) s = s.slice(3);
  else if (s.startsWith('98')) s = s.slice(2);
  else if (s.startsWith('0')) s = s.slice(1);
  return `+98${s}`;
};

const iranMobile = /^(?:0098|\+98|98|0)?9\d{9}$/;

export const contactUsValidation = [
  body('firstName').isString().withMessage('لطفا اسم معتبر وارد نمایید').isLength({ min: 3, max: 12 }).withMessage('نام شما باید حداقل ٣ و حداکثر ١٢ کاراکتر باشد').trim().bail(),

  body('lastName').isString().withMessage('لطفا اسم معتبر وارد نمایید').isLength({ min: 3, max: 12 }).withMessage('نام خانوادگی شما باید حداقل ٣ و حداکثر ١٢ کاراکتر باشد').trim().bail(),

  body('email').isEmail().withMessage('لطفاً ایمیل معتبر وارد کنید').bail().normalizeEmail(),

  body('number')
    .trim()
    .customSanitizer(toEnDigits)
    .customSanitizer(cleanPhone)
    .matches(iranMobile)
    .withMessage('شماره موبایل معتبر نیست')
    .customSanitizer(toE164IR)
    .bail(),

  body('title').isString().withMessage('عنوان شما نامعتبر می‌باشد').isLength({ min: 4, max: 16 }).withMessage('عنوان شما باید حداقل ۴ و حداکثر ۱۶ کاراکتر باشد').trim().bail(),

  body('description').isString().withMessage('توضیحات شما نامعتبر می‌باشد').isLength({ min: 32, max: 500 }).withMessage('توضیحات شما باید حداقل ۳۲ و حداکثر ۵۰۰ کاراکتر باشد').trim().bail(),
];
