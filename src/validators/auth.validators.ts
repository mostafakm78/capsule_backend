import { body } from 'express-validator';
import User from '../models/User';

export const signupValidators = [
  body('email')
    .isEmail()
    .withMessage('لطفاً ایمیل معتبر وارد کنید')
    .bail()
    .normalizeEmail()
    .custom(async (value) => {
      const exists = await User.exists({ email: value.toLowerCase() });
      if (exists) throw new Error('این ایمیل قبلاً استفاده شده است');
      return true;
    }),
  body('password')
    .isString()
    .withMessage('پسورد نامعتبر است')
    .matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[{\]};:'",<.>/?\\|`~]).+$/)
    .withMessage('پسورد باید حداقل شامل یک حرف بزرگ، یک عدد و یک علامت خاص باشد')
    .isLength({ min: 8, max: 18 })
    .withMessage('پسورد حداقل ٨ کاراکتر و حداکثر ١٨ کارکتر باشد')
    .bail()
    .trim(),
];

export const loginValidators = [
  body('email').isEmail().withMessage('ایمیل معتبر نیست').bail().normalizeEmail(),
  body('password')
    .isLength({ min: 8, max: 18 })
    .withMessage('پسورد حداقل ٨ کاراکتر و حداکثر ١٨ کارکتر باشد')
    .isString()
    .withMessage('پسورد الزامی است')
    .matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[{\]};:'",<.>/?\\|`~]).+$/)
    .withMessage('پسورد باید حداقل شامل یک حرف بزرگ، یک عدد و یک علامت خاص باشد')
    .trim()
    .bail(),
];

export const otpSendValidators = [body('email').isEmail().withMessage('ایمیل معتبر نیست').bail().normalizeEmail()];

export const otpVerifyValidators = [body('email').isEmail().withMessage('ایمیل معتبر نیست').bail().normalizeEmail(), body('otp').isString().isLength({ min: 6, max: 6 }).withMessage('کد OTP نامعتبر است')];
