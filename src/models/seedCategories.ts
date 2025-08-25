import { CategoryGroup, CategoryItem } from "./Category";



export async function seedCategories() {
  const data = [
    { key: 'emotional', title: '🧠 دسته‌بندی‌های احساسی', items: ['خوشحال‌کننده', 'ناراحت‌کننده', 'هیجان‌انگیز', 'آرامش‌بخش', 'ترسناک', 'الهام‌بخش'] },
    { key: 'topical', title: '📌 دسته‌بندی‌های موضوعی', items: ['خاطره شخصی', 'رویا', 'سفر', 'خانواده', 'دوستان', 'مدرسه / دانشگاه', 'عشق', 'کار', 'چالش‌ها'] },
    { key: 'temporal', title: '⏳ دسته‌بندی‌های زمانی', items: ['کودکی', 'نوجوانی', 'بزرگسالی'] },
  ];

  for (const g of data) {
    const group = await CategoryGroup.findOneAndUpdate({ key: g.key }, { $set: { title: g.title, isActive: true } }, { upsert: true, new: true });
    let order = 0;
    for (const title of g.items) {
      const key = title.replace(/\s+/g, '-');
      await CategoryItem.updateOne({ group: group._id, key }, { $set: { title, order: order++, isActive: true } }, { upsert: true });
    }
  }
}
