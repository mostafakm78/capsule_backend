import { NextFunction, Request, Response } from 'express';
import { FormRequest } from '../types/todo';
import ContactUs from '../models/ContactUs';
import nodemailer from 'nodemailer';

export const postContactForm = async (req: Request<{}, {}, FormRequest>, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, email, number, title, description } = req.body;

    if (!firstName || !lastName || !email || !number || !title || !description) {
      return next({
        message: 'all fields are required',
        statusCode: 400,
      });
    }

    const newContactForm = await ContactUs.create({ firstName, lastName, email, number, title, description });

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'mostafamf555@gmail.com',
        pass: 'aeqy ocnx rfht jepm',
      },
    });

    const mailOptions = {
      from: email,
      to: 'mostafamf555@gmail.com',
      subject: 'پیام جدید از کاربران سایت کپسول',
      html: `
    <html lang="fa" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>سایت کپسول</title>
  </head>
  <body style="display: flex;direction: rtl ; flex-direction: column; width: 100%; min-height: 100vh; padding: 25px; justify-content: center; align-items: center; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif">
    <div style="padding: 20px; border-radius: 10px; border: 1px solid black">
      <h2 style="color: #65647c">کاربر سایت کپسول پیامی فرستاده</h2>
      <p style="color: #f7a5a5; border-top: 1px solid black; padding: 10px; display: flex; justify-content: space-between; align-items: center"><strong style="color: #65647c">اسم:</strong> ${firstName} ${lastName}</p>
      <p style="color: #f7a5a5; border-top: 1px solid black; padding: 10px; display: flex; justify-content: space-between; align-items: center"><strong style="color: #65647c">ایمیل:</strong> ${email}</p>
      <p style="color: #f7a5a5; border-top: 1px solid black; padding: 10px; display: flex; justify-content: space-between; align-items: center"><strong style="color: #65647c">شماره تماس:</strong> ${number}</p>
      <p style="color: #f7a5a5; border-top: 1px solid black; padding: 10px; display: flex; justify-content: space-between; align-items: center"><strong style="color: #65647c">عنوان:</strong> ${title}</p>
      <p style="color: #f7a5a5; border-top: 1px solid black; padding: 10px; display: flex; justify-content: space-between; align-items: center"><strong style="color: #65647c">توضیحات پیام:</strong> ${description}</p>
    </div>
  </body>
</html>
  `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error sending email', error);
        return next({
          message: 'Error sending email',
          statusCode: 500,
          data: error.message,
        });
      }
      console.log('Email sent : ' + info.response);
    });

    return res.status(200).json({ message: 'ContactUs Form created successfully', newContactForm });
  } catch (error: any) {
    return next({
      message: 'error in post form',
      statusCode: 500,
      data: error.message,
    });
  }
};
