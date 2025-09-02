import { body } from 'express-validator';

const updateUserValidation = [
  body('currentPassword')
    .optional()
    .isLength({ min: 8, max: 18 })
    .withMessage('پسورد حداقل ٨ کاراکتر و حداکثر ١٨ کارکتر باشد')
    .isString()
    .withMessage('پسورد الزامی است')
    .matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[{\]};:'",<.>/?\\|`~]).+$/)
    .withMessage('پسورد باید حداقل شامل یک حرف بزرگ، یک عدد و یک علامت خاص باشد')
    .trim()
    .bail(),

  body('newPassword')
    .optional()
    .isString()
    .withMessage('پسورد نامعتبر است')
    .matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[{\]};:'",<.>/?\\|`~]).+$/)
    .withMessage('پسورد باید حداقل شامل یک حرف بزرگ، یک عدد و یک علامت خاص باشد')
    .isLength({ min: 8, max: 18 })
    .withMessage('پسورد حداقل ٨ کاراکتر و حداکثر ١٨ کارکتر باشد')
    .bail()
    .trim(),

  body('name').optional().isString().withMessage('لطفا اسم معتبر وارد نمایید').isLength({ min: 6, max: 24 }).withMessage('نام و نام خانوادگی شما باید حداقل ٦ و حداکثر ٢٤ باشد').trim().bail(),

  body('about').isString().withMessage('توضیحات شما نامعتبر می‌باشد').isLength({ min: 32, max: 500 }).withMessage('توضیحات شما باید حداقل ۳۲ و حداکثر ۵۰۰ کاراکتر باشد').trim().bail(),

  body('birthday').isString().withMessage('لطفا تاریخ معتبر وارد نمایید').trim().bail(),

  body('education').isString().withMessage('لطفا میزان تحصیلات را معتبر وارد نمایید').trim().bail(),
];
