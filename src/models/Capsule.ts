import mongoose from 'mongoose';
import { CategoryItem } from './Category';
import { ICapsule, ICapsuleAccess } from '../types/types';
const { Schema } = mongoose;

const AccessSchema = new Schema<ICapsuleAccess>(
  {
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
        validator: function (this: any, v: string) {
          if (this.visibility === 'public' && v === 'timed') return false;
          return true;
        },
        message: 'lock=timed is allowed only when visibility=private',
      },
    },
    unlockAt: {
      type: Date,
    },
  },
  { _id: false, versionKey: false }
);

AccessSchema.pre('validate', function (next) {
  if (this.visibility === 'public') {
    this.lock = 'none';
    this.unlockAt = undefined as any;
  }

  if (this.lock === 'timed') {
    if (this.visibility !== 'private') {
      return next(new Error('lock=timed is only valid with visibility=private'));
    }
    if (!this.unlockAt) {
      return next(new Error('unlockAt is required when lock is TIMED'));
    }
  } else {
    if (this.unlockAt) this.unlockAt = undefined as any;
  }

  next();
});

const capsuleSchema = new Schema<ICapsule>(
  {
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
  },
  { timestamps: true, versionKey: false }
);

capsuleSchema.pre('validate', async function (next) {
  if (!this.categoryItem) return next(new Error('categoryItem is required'));
  const exists = await CategoryItem.exists({ _id: this.categoryItem, isActive: true });
  if (!exists) return next(new Error('Invalid or inactive categoryItem'));
  next();
});

// postSchema.index({ 'access.unlockAt': 1 });

export default mongoose.model('Capusle', capsuleSchema);
