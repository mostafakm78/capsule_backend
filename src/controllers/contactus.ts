import type { NextFunction, Request, Response } from 'express';
import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import ContactUs from '../models/ContactUs';

// Types from your shared file
import type { FormRequest, AppError, IContactUs } from '../types/types';

// Handle "Contact Us" submission
export const postContactForm = async (
  req: Request<Record<string, never>, unknown, FormRequest>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract required fields from body (FormRequest)
    const { firstName, lastName, email, number, title, description } = req.body;

    // Basic validation: all fields required
    if (!firstName || !lastName || !email || !number || !title || !description) {
      return next({
        message: 'All fields are required',
        statusCode: 400,
      } as AppError);
    }

    // Persist form entry to DB
    const newContactForm: IContactUs = await ContactUs.create({
      firstName,
      lastName,
      email,
      number,
      title,
      description,
    });

    // Configure Nodemailer (Gmail SMTP); move creds to ENV in production
    const transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // STARTTLS
      auth: {
        user: 'mostafamf555@gmail.com', // TODO: use ENV
        pass: 'aeqy ocnx rfht jepm',    // TODO: use ENV (App Password)
      },
    });

    // Compose email to admin
    const mailOptions: nodemailer.SendMailOptions = {
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
    transporter.sendMail(
      mailOptions,
      (error: Error | null, info: SMTPTransport.SentMessageInfo): void => {
        if (error) {
          console.log('Error sending email', error);
          return next({
            message: 'Failed to send email',
            statusCode: 500,
            data: (error as Error).message,
          } as AppError);
        }
        console.log('Email sent:', info.response);
      }
    );

    // Success response (201 Created) with saved entity
    res.status(201).json({ message: 'Contact form submitted', newContactForm });
  } catch (error: any) {
    // Unexpected server error
    return next({
      message: 'Internal error while submitting form',
      statusCode: 500,
      data: error?.message ?? error,
    } as AppError);
  }
};
