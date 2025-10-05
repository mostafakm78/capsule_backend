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
exports.otpVerifyValidators = exports.otpSendValidators = exports.loginValidators = exports.signupValidators = exports.getEmailValidation = void 0;
const express_validator_1 = require("express-validator");
const User_1 = __importDefault(require("../models/User"));
exports.getEmailValidation = [(0, express_validator_1.body)('email').isEmail().withMessage('لطفاً ایمیل معتبر وارد کنید').bail().normalizeEmail()];
exports.signupValidators = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('لطفاً ایمیل معتبر وارد کنید')
        .bail()
        .normalizeEmail()
        .custom((value) => __awaiter(void 0, void 0, void 0, function* () {
        const exists = yield User_1.default.exists({ email: value.toLowerCase() });
        if (exists)
            throw new Error('این ایمیل قبلاً استفاده شده است');
        return true;
    })),
    (0, express_validator_1.body)('password')
        .isString()
        .withMessage('پسورد نامعتبر است')
        .matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[{\]};:'",<.>/?\\|`~]).+$/)
        .withMessage('پسورد باید حداقل شامل یک حرف بزرگ، یک عدد و یک علامت خاص باشد')
        .isLength({ min: 8, max: 18 })
        .withMessage('پسورد حداقل ٨ کاراکتر و حداکثر ١٨ کارکتر باشد')
        .bail()
        .trim(),
];
exports.loginValidators = [
    (0, express_validator_1.body)('email').isEmail().withMessage('ایمیل معتبر نیست').bail().normalizeEmail(),
    (0, express_validator_1.body)('password')
        .isLength({ min: 8, max: 18 })
        .withMessage('پسورد حداقل ٨ کاراکتر و حداکثر ١٨ کارکتر باشد')
        .isString()
        .withMessage('پسورد الزامی است')
        .matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[{\]};:'",<.>/?\\|`~]).+$/)
        .withMessage('پسورد باید حداقل شامل یک حرف بزرگ، یک عدد و یک علامت خاص باشد')
        .trim()
        .bail(),
];
exports.otpSendValidators = [(0, express_validator_1.body)('email').isEmail().withMessage('ایمیل معتبر نیست').bail().normalizeEmail()];
exports.otpVerifyValidators = [(0, express_validator_1.body)('email').isEmail().withMessage('ایمیل معتبر نیست').bail().normalizeEmail(), (0, express_validator_1.body)('otp').isString().isLength({ min: 6, max: 6 }).withMessage('کد OTP نامعتبر است')];
