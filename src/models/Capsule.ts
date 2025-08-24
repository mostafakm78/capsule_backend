import mongoose from 'mongoose';
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
    },
    unlockAt: {
      type: Date,
    },
  },
  { _id: false }
);

AccessSchema.pre('validate', function (next) {
  if (this.lock === 'timed' && !this.unlockAt) {
    return next(new Error('unlockAt is required when lock is TIMED'));
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
    category: {
      type: String,
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
  { timestamps: true }
);

// postSchema.index({ 'access.unlockAt': 1 });

export default mongoose.model('Capusle', capsuleSchema);
