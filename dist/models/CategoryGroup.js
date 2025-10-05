"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryGroup = void 0;
const mongoose_1 = require("mongoose");
const CategoryGroupSchema = new mongoose_1.Schema({
    key: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true, versionKey: false });
exports.CategoryGroup = (0, mongoose_1.model)('CategoryGroup', CategoryGroupSchema);
