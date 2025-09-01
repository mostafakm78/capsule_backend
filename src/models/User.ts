import mongoose, { Schema, Types } from 'mongoose';
import { IModeration, IUser, IViolationMeta } from '../types/types';

const ViolationSchema = new Schema<IViolationMeta>(
  {
    lockUntil: { type: Date, default: null, index: true },
    strikes: { type: Number, default: 0 },
    lastSetAt: { type: Date, default: null },
  },
  { _id: false }
);

const ModerationSchema = new Schema<IModeration>(
  {
    violation: { type: ViolationSchema, default: {} },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    education: { type: String },
    birthday: { type: String },
    isBanned: { type: Boolean, default: false },
    avatar: { type: String },
    flag: {
      type: String,
      enum: ['none', 'sus', 'review', 'violation'],
      default: 'none',
      index: true,
    },
    moderation: { type: ModerationSchema, default: {} },
    about: { type: String },
    refreshToken: { type: String, default: null, select: false, index: true },
    OTP: { type: String, select: false },
    otpExpiration: { type: Date, default: null, select: false },
    otpRequestTime: { type: Date, default: null, select: false },
  },
  { timestamps: true, versionKey: false }
);

UserSchema.index({ 'moderation.violation.lockUntil': 1, flag: 1 });

UserSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    delete ret.refreshToken;
    return ret;
  },
});

UserSchema.methods.isOTPValid = function () {
  return this.otpExpiration && new Date() < this.otpExpiration;
};

export default mongoose.model('User', UserSchema);
