import mongoose from 'mongoose';
import { Schema } from 'mongoose';

const UserSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
    },
    education: {
      type: String,
    },
    birthday: {
      type: String,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    avatar: {
      type: String,
    },
    flag: {
      type: String,
      enum: ['none', 'sus', 'review', 'violation'],
      default: 'none',
    },
    about: {
      type: String,
    },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model('User', UserSchema);
