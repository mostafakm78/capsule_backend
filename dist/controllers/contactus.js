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
exports.postContactForm = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const ContactUs_1 = __importDefault(require("../models/ContactUs"));
// Handle "Contact Us" submission
const postContactForm = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
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
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // STARTTLS
            auth: {
                user: 'mostafamf555@gmail.com', // TODO: use ENV
                pass: 'aeqy ocnx rfht jepm', // TODO: use ENV (App Password)
            },
        });
        // Compose email to admin
        const mailOptions = {
            from: email, // user email
            to: 'mostafamf555@gmail.com', // admin email
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
            console.log('Email sent:', info.response);
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
