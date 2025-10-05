"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const NotificationSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: false,
    },
    text: {
        type: String,
        reauired: true,
    },
    type: {
        type: String,
        enum: ['message', 'alert', 'news', 'system'],
        required: true,
    },
}, { timestamps: true, versionKey: false });
exports.default = (0, mongoose_1.model)('Notification', NotificationSchema);
