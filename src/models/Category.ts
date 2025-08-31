import { Schema, model } from 'mongoose';
import { ICategoryGroup, ICategoryItem } from '../types/types';

const CategoryGroupSchema = new Schema<ICategoryGroup>(
  {
    key: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

export const CategoryGroup = model('CategoryGroup', CategoryGroupSchema);

const CategoryItemSchema = new Schema<ICategoryItem>(
  {
    group: { type: Schema.Types.ObjectId, ref: 'CategoryGroup', required: true },
    key: { type: String, required: true },
    title: { type: String, required: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

CategoryItemSchema.index({ group: 1, key: 1 }, { unique: true });
export const CategoryItem = model('CategoryItem', CategoryItemSchema);
