# 🧠 بک‌اند کپسول — API زمان‌نگهدار

> سرویس بک‌اند پروژه **کپسول**، اپلیکیشن نگهدارنده‌ی دیجیتال خاطرات که به کاربران امکان می‌دهد خاطرات خود را ذخیره کنند و زمان باز شدن آن‌ها را تعیین کنند.

---

[English](./README_BACKEND.md)

## ⚙️ معرفی کلی

این بک‌اند وظایف زیر را انجام می‌دهد:
- 🗂️ مدیریت داده‌های کپسول و کاربران
- 🖼️ آپلود تصاویر برای کاربران و کپسول‌ها (با استفاده از Multer)
- ⏳ زمان‌بندی و منطق باز شدن کپسول‌ها
- 🔐 احراز هویت کاربران با JWT
- 🌐 API RESTful با CORS فعال برای ارتباط با فرانت‌اند

---

## 🧰 تکنولوژی‌ها

- **TypeScript**
- **Express.js**
- **MongoDB (Mongoose)**
- **Multer**
- **jsonwebtoken**
- **CORS**

---

## 📁 ساختار پروژه

```
src/
 ├── Helper/          # توابع کمکی
 ├── controllers/     # منطق اصلی برای کپسول‌ها و کاربران
 ├── middlewares/     # میان‌افزارهای احراز هویت و آپلود
 ├── models/          # مدل‌های Mongoose
 ├── routes/          # مسیرهای API
 ├── types/           # تایپ‌های TypeScript
 ├── validators/      # اعتبارسنجی داده‌های ورودی
 └── server.ts         # نقطه‌ی شروع سرور
```

---

## 🚀 راه‌اندازی پروژه

### 1️⃣ کلون کردن پروژه

```bash
git clone https://github.com/mostafakm78/capsule_backend
cd capsule-backend
```

### 2️⃣ نصب وابستگی‌ها

```bash
npm install
```

### 3️⃣ ساخت فایل `.env`

```
PORT=8080
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret_key
JWT_REFRESH_SECRET=your_secret_key
```

### 4️⃣ اجرای سرور

```bash
npm run dev
```

سرور در آدرس زیر در دسترس خواهد بود:
[http://localhost:8080](http://localhost:8080)

---

## 📦 مسیرهای API

### 🔐 مسیرهای احراز هویت

| متد | مسیر | توضیح |
|------|-----------|--------|
| `POST` | `/api/auth/check` | بررسی وجود ایمیل |
| `POST` | `/api/auth/signup` | ثبت‌نام کاربر جدید |
| `POST` | `/api/auth/login` | ورود با ایمیل و پسورد |
| `POST` | `/api/auth/refresh` | تازه‌سازی توکن JWT |
| `POST` | `/api/auth/otp/send` | ارسال کد OTP برای ورود |
| `POST` | `/api/auth/otp/verify` | تایید کد OTP |
| `POST` | `/api/auth/logout` | خروج کاربر |

---

### 💫 مسیرهای کپسول

| متد | مسیر | توضیح |
|------|-----------|--------|
| `GET` | `/api/capsules/categories` | دریافت همه دسته‌بندی‌های کپسول |
| `GET` | `/api/capsules` | دریافت همه کپسول‌های کاربر |
| `POST` | `/api/capsules` | ایجاد یک کپسول جدید |
| `GET` | `/api/capsules/:id` | دریافت یک کپسول خاص |
| `DELETE` | `/api/capsules/:id` | حذف کپسول |
| `PATCH` | `/api/capsules/:id` | ویرایش اطلاعات کپسول |

---

### 👤 مسیرهای کاربر جاری (Me)

| متد | مسیر | توضیح |
|------|-----------|--------|
| `GET` | `/api/me` | دریافت اطلاعات کاربر فعلی |
| `PATCH` | `/api/me` | بروزرسانی اطلاعات کاربر |
| `GET` | `/api/me/notifications` | دریافت نوتیفیکیشن‌های کاربر |

---

### 🌍 مسیرهای عمومی (Public)

| متد | مسیر | توضیح |
|------|-----------|--------|
| `GET` | `/api/public/categories` | دریافت دسته‌بندی‌های عمومی |
| `POST` | `/api/public/contactus` | ارسال پیام از طریق فرم تماس |
| `GET` | `/api/public/capsules` | دریافت همه کپسول‌های عمومی |
| `GET` | `/api/public/capsules/:id` | دریافت یک کپسول عمومی |
| `GET` | `/api/public/usercapsules/:userId` | دریافت کپسول‌های کاربر خاص |

---

### 🛠️ مسیرهای ادمین (Admin)

| متد | مسیر | توضیح |
|------|-----------|--------|
| `GET` | `/api/admin/users` | دریافت همه کاربران برای ادمین |
| `GET` | `/api/admin/capsules` | دریافت همه کپسول‌ها برای ادمین |
| `GET` | `/api/admin/users/:id` | دریافت یک کاربر با کپسول‌هایش |
| `PATCH` | `/api/admin/users/:id` | ویرایش اطلاعات کاربر |
| `GET` | `/api/admin/:id/:capsuleId` | دریافت یک کپسول کاربر توسط ادمین |
| `PATCH` | `/api/admin/:id/:capsuleId` | ویرایش کپسول کاربر توسط ادمین |
| `GET` | `/api/admin/categories` | دریافت همه دسته‌بندی‌ها |
| `POST` | `/api/categories/:titleId` | ایجاد یک دسته‌بندی |
| `PATCH` | `/api/categories/:titleId/:itemId` | ویرایش یک دسته‌بندی |
| `DELETE` | `/api/categories/:titleId/:itemId` | حذف یک دسته‌بندی |
| `POST` | `/api/notification` | ایجاد نوتیفیکیشن |
| `DELETE` | `/api/notification/:notifId` | حذف نوتیفیکیشن |
| `POST` | `/api/images` | آپلود تصویر (Multer) |

---

## 🧩 برنامه‌های آینده

- [ ] اضافه کردن ایمیل نوتیفیکیشن برای باز شدن کپسول‌ها
- [ ] اضافه کردن لینک موقت برای عوض کردن پسورد
- [ ] دیپلوی پروژه روی Render یا Vercel

---

## 👨‍💻 توسعه‌دهنده

**مصطفی کمری**
توسعه‌دهنده فرانت‌اند و بک‌اند
[GitHub](https://github.com/mostafakm78)
