"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryItem = void 0;
const CategoryItemSchema = new Schema({
    group: { type: Schema.Types.ObjectId, ref: 'CategoryGroup', required: true },
    key: { type: String, required: true }, // مثل: 'happy', 'sad', 'travel' (slug پایدار)
    title: { type: String, required: true }, // مثل: 'خوشحال‌کننده'
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true, versionKey: false });
CategoryItemSchema.index({ group: 1, key: 1 }, { unique: true });
exports.CategoryItem = model('CategoryItem', CategoryItemSchema);
