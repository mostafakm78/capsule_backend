"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const ViolationSchema = new mongoose_1.Schema({
    lockUntil: { type: Date, default: null, index: true },
    strikes: { type: Number, default: 0 },
    lastSetAt: { type: Date, default: null },
}, { _id: false });
const ModerationSchema = new mongoose_1.Schema({
    violation: { type: ViolationSchema, default: {} },
}, { _id: false });
const UserSchema = new mongoose_1.Schema({
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
}, { timestamps: true, versionKey: false });
UserSchema.index({ 'moderation.violation.lockUntil': 1, flag: 1 });
UserSchema.set('toJSON', {
    transform: (_doc, ret) => {
        delete ret.refreshToken;
        return ret;
    },
});
UserSchema.methods.isOTPValid = function () {
    return this.otpExpiration && new Date() < this.otpExpiration;
};
exports.default = mongoose_1.default.model('User', UserSchema);
