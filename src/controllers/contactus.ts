import type { NextFunction, Request, Response } from 'express';
import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import ContactUs from '../models/ContactUs';

// 👇 تایپ‌ها را از فایل types بیار
import type { FormRequest, AppError, IContactUs } from '../types/types';

// Controller to handle "Contact Us" form submissions
export const postContactForm = async (req: Request<Record<string, never>, unknown, FormRequest>, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Destructure fields from request body
    const { firstName, lastName, email, number, title, description } = req.body;

    // Validation: all fields must be provided
    if (!firstName || !lastName || !email || !number || !title || !description) {
      return next({
        message: 'all fields are required',
        statusCode: 400,
      } as AppError);
    }

    // Save the contact form submission to the database
    const newContactForm: IContactUs = await ContactUs.create({
      firstName,
      lastName,
      email,
      number,
      title,
      description,
    });

    // Configure Nodemailer transporter (using Gmail SMTP here)
    const transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // use STARTTLS
      auth: {
        user: 'mostafamf555@gmail.com', // TODO: move to environment variables
        pass: 'aeqy ocnx rfht jepm', // Gmail app password (move to ENV)
      },
    });

    // Email options: send the contact form content to the admin email
    const mailOptions: nodemailer.SendMailOptions = {
      from: email, // the user's email address
      to: 'mostafamf555@gmail.com', // admin/receiver email
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

    // Send the email using the transporter (callback style, with types)
    transporter.sendMail(mailOptions, (error: Error | null, info: SMTPTransport.SentMessageInfo) => {
      if (error) {
        console.log('Error sending email', error);
        return next({
          message: 'Error sending email',
          statusCode: 500,
          data: error.message,
        } as AppError);
      }
      console.log('Email sent : ' + info.response);
    });

    // Respond with success JSON and saved contact form entry
    res.status(200).json({ message: 'ContactUs Form created successfully', newContactForm });
  } catch (error: any) {
    // Handle unexpected errors
    return next({
      message: 'error in post form',
      statusCode: 500,
      data: error.message,
    } as AppError);
  }
};
