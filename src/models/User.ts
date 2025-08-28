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
      select: false,
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
    refreshToken: {
      type: String,
      default: null,
      select: false,
      index: true,
    },
  },
  { timestamps: true, versionKey: false }
);

UserSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    delete ret.refreshToken;
    return ret;
  },
});

export default mongoose.model('User', UserSchema);
