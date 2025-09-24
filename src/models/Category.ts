import { Schema, model } from 'mongoose';
import { ICategoryGroup, ICategoryItem } from '../types/types';

const CategoryGroupSchema = new Schema<ICategoryGroup>(
  {
    title: { type: String, required: true },
  },
  { timestamps: true, versionKey: false }
);

export const CategoryGroup = model('CategoryGroup', CategoryGroupSchema);

const CategoryItemSchema = new Schema<ICategoryItem>(
  {
    group: { type: Schema.Types.ObjectId, ref: 'CategoryGroup', required: true, index: true },
    title: { type: String, required: true },
  },
  { timestamps: true, versionKey: false }
);

CategoryItemSchema.index({ group: 1, title: 1 }, { unique: true });
export const CategoryItem = model('CategoryItem', CategoryItemSchema);
