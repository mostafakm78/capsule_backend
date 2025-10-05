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
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedCategories = seedCategories;
const Category_1 = require("./Category");
function seedCategories() {
    return __awaiter(this, void 0, void 0, function* () {
        const data = [
            { title: '🧠 دسته‌بندی‌های احساسی', items: ['خوشحال‌کننده', 'ناراحت‌کننده', 'هیجان‌انگیز', 'آرامش‌بخش', 'ترسناک', 'الهام‌بخش'] },
            { title: '📌 دسته‌بندی‌های موضوعی', items: ['خاطره شخصی', 'رویا', 'سفر', 'خانواده', 'دوستان', 'مدرسه / دانشگاه', 'عشق', 'کار', 'چالش‌ها'] },
            { title: '⏳ دسته‌بندی‌های زمانی', items: ['کودکی', 'نوجوانی', 'بزرگسالی'] },
        ];
        for (const g of data) {
            const group = yield Category_1.CategoryGroup.findOneAndUpdate({ title: g.title }, { $set: { title: g.title } }, { upsert: true, new: true });
            for (const title of g.items) {
                yield Category_1.CategoryItem.updateOne({ group: group._id, title }, { $setOnInsert: { group: group._id, title } }, { upsert: true });
            }
        }
        yield Category_1.CategoryItem.syncIndexes();
        yield Category_1.CategoryGroup.syncIndexes();
    });
}
