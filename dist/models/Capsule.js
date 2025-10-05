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
const mongoose_1 = __importDefault(require("mongoose"));
const Category_1 = require("./Category");
const { Schema } = mongoose_1.default;
const AccessSchema = new Schema({
    visibility: {
        type: String,
        enum: ['public', 'private'],
        required: true,
        default: 'private',
    },
    lock: {
        type: String,
        enum: ['none', 'timed'],
        required: true,
        default: 'none',
        validate: {
            validator: function (v) {
                if (this.visibility === 'public' && v === 'timed')
                    return false;
                return true;
            },
            message: 'lock=timed is allowed only when visibility=private',
        },
    },
    unlockAt: {
        type: Date,
    },
}, { _id: false, versionKey: false });
AccessSchema.pre('validate', function (next) {
    if (this.visibility === 'public') {
        this.lock = 'none';
        this.unlockAt = undefined;
    }
    if (this.lock === 'timed') {
        if (this.visibility !== 'private') {
            return next(new Error('lock=timed is only valid with visibility=private'));
        }
        if (!this.unlockAt) {
            return next(new Error('unlockAt is required when lock is TIMED'));
        }
    }
    else {
        if (this.unlockAt)
            this.unlockAt = undefined;
    }
    next();
});
const capsuleSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    image: {
        type: String,
    },
    description: {
        type: String,
        required: true,
    },
    extra: {
        type: String,
    },
    color: {
        type: String,
    },
    categoryItem: {
        type: Schema.Types.ObjectId,
        ref: 'CategoryItem',
        required: true,
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    access: {
        type: AccessSchema,
        required: true,
        default: () => ({ visibility: 'private', lock: 'none' }),
    },
}, { timestamps: true, versionKey: false });
capsuleSchema.pre('validate', function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!this.categoryItem)
            return next(new Error('categoryItem is required'));
        const exists = yield Category_1.CategoryItem.exists({ _id: this.categoryItem });
        if (!exists)
            return next(new Error('Invalid categoryItem'));
        next();
    });
});
// postSchema.index({ 'access.unlockAt': 1 });
exports.default = mongoose_1.default.model('Capusle', capsuleSchema);
