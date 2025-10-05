"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryItem = exports.CategoryGroup = void 0;
const mongoose_1 = require("mongoose");
const CategoryGroupSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
}, { timestamps: true, versionKey: false });
exports.CategoryGroup = (0, mongoose_1.model)('CategoryGroup', CategoryGroupSchema);
const CategoryItemSchema = new mongoose_1.Schema({
    group: { type: mongoose_1.Schema.Types.ObjectId, ref: 'CategoryGroup', required: true, index: true },
    title: { type: String, required: true },
}, { timestamps: true, versionKey: false });
CategoryItemSchema.index({ group: 1, title: 1 }, { unique: true });
exports.CategoryItem = (0, mongoose_1.model)('CategoryItem', CategoryItemSchema);
