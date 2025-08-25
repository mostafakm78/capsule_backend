import mongoose from 'mongoose';
import { CategoryItem } from './Category';
const { Schema } = mongoose;

const AccessSchema = new Schema(
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
          if (this.visibility === 'private' && v === 'timed') return false;
          return true;
        },
        message: 'lock=timed is not allowed when visibility=private',
      },
    },
    unlockAt: {
      type: Date,
    },
  },
  { _id: false, versionKey: false }
);

AccessSchema.pre('validate', function (next) {
  if (this.lock === 'timed' && !this.unlockAt) {
    return next(new Error('unlockAt is required when lock is TIMED'));
  }
  if (this.visibility === 'private' && this.lock !== 'none') {
    return next(new Error('when visibility=private, lock must be "none"'));
  }
  next();
});

const capsuleSchema = new Schema(
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
