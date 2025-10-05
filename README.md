# 🧠 Capsule Backend — Time Capsule API

> The backend service for **Capsule**, a digital time-keeper app that lets users store their memories and set a future date to reopen them.

---

[فارسی](./README.fa.md)

## ⚙️ Overview

This backend handles:
- 🗂️ Capsule and user data management
- 🖼️ Image upload for users and capsules (via Multer)
- ⏳ Capsule scheduling and timing logic
- 🔐 JWT-based authentication
- 🌐 CORS-enabled RESTful API for frontend communication

---

## 🧰 Tech Stack

- **TypeScript**
- **Express.js**
- **MongoDB (Mongoose)**
- **Multer**
- **jsonwebtoken**
- **CORS**

---

## 📁 Project Structure

```
src/
 ├── Helper/          # Helper functions
 ├── controllers/     # Business logic for capsules and users
 ├── middlewares/     # Authentication & upload middlewares
 ├── models/          # Mongoose models
 ├── routes/          # API routes
 ├── types/           # Typescript
 ├── validators/      # Validation data from req
 └── server.ts         # Main server entry point
```

---

## 🚀 Getting Started

### 1️⃣ Clone the repository

```bash
git clone https://github.com/mostafakm78/capsule_backend
cd capsule-backend
```

### 2️⃣ Install dependencies

```bash
npm install
```

### 3️⃣ Create `.env` file

```
PORT=8080
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret_key
JWT_REFRESH_SECRET=your_secret_key
```

### 4️⃣ Run the server

```bash
npm run dev
```

Server will start at: [http://localhost:8080](http://localhost:8080)

---

## 📦 API Endpoints

### 🔐 Auth Routes

| Method | Endpoint | Description |
|--------|-----------|-------------|
| `POST` | `/api/auth/check` | Validate email existence |
| `POST` | `/api/auth/signup` | Register a new user |
| `POST` | `/api/auth/login` | Login with email & password |
| `POST` | `/api/auth/refresh` | Refresh JWT access token |
| `POST` | `/api/auth/otp/send` | Send OTP for login |
| `POST` | `/api/auth/otp/verify` | Verify OTP code |
| `POST` | `/api/auth/logout` | Logout user |

---

### 💫 Capsule Routes

| Method | Endpoint | Description |
|--------|-----------|-------------|
| `GET` | `/api/capsules/categories` | Get all capsule categories |
| `GET` | `/api/capsules` | Get all user capsules |
| `POST` | `/api/capsules` | Create a new capsule |
| `GET` | `/api/capsules/:id` | Get single capsule by ID |
| `DELETE` | `/api/capsules/:id` | Delete a capsule |
| `PATCH` | `/api/capsules/:id` | Edit capsule data |

---

### 👤 Me Routes

| Method | Endpoint | Description |
|--------|-----------|-------------|
| `GET` | `/api/me` | Get current user info |
| `PATCH` | `/api/me` | Update user data |
| `GET` | `/api/me/notifications` | Get user notifications |

---

### 🌍 Public Routes

| Method | Endpoint | Description |
|--------|-----------|-------------|
| `GET` | `/api/public/categories` | Get all public categories |
| `POST` | `/api/public/contactus` | Send message via contact form |
| `GET` | `/api/public/capsules` | Get all public capsules |
| `GET` | `/api/public/capsules/:id` | Get public capsule by ID |
| `GET` | `/api/public/usercapsules/:userId` | Get capsules of a specific user |

---

### 🛠️ Admin Routes

| Method | Endpoint | Description |
|--------|-----------|-------------|
| `GET` | `/api/admin/users` | Get all users for admin |
| `GET` | `/api/admin/capsules` | Get all capsules for admin |
| `GET` | `/api/admin/users/:id` | Get single user with capsules |
| `PATCH` | `/api/admin/users/:id` | Edit user data |
| `GET` | `/api/admin/:id/:capsuleId` | Get user capsule by admin |
| `PATCH` | `/api/admin/:id/:capsuleId` | Edit user capsule by admin |
| `GET` | `/api/admin/categories` | Get all categories |
| `POST` | `/api/categories/:titleId` | Create a category |
| `PATCH` | `/api/categories/:titleId/:itemId` | Edit a category |
| `DELETE` | `/api/categories/:titleId/:itemId` | Delete a category |
| `POST` | `/api/notification` | Create a notification |
| `DELETE` | `/api/notification/:notifId` | Delete a notification |
| `POST` | `/api/images` | Upload image (via Multer) |

---

## 🧩 Future Plans

- [ ] Add email notifications for capsule release
- [ ] Add create link for reset password
- [ ] Deploy to cloud

---

## 🧩 Future Plans

- [ ] Add email notifications for capsule release
- [ ] Add create link for reset password
- [ ] Deploy to cloud

---

## 👨‍💻 Author

**Mostafa Kamari**
Frontend & Backend Developer
[GitHub](https://github.com/mostafakm78)
