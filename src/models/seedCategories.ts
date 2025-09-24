import { CategoryGroup, CategoryItem } from './Category';

export async function seedCategories() {
  const data = [
    { title: '🧠 دسته‌بندی‌های احساسی', items: ['خوشحال‌کننده', 'ناراحت‌کننده', 'هیجان‌انگیز', 'آرامش‌بخش', 'ترسناک', 'الهام‌بخش'] },
    { title: '📌 دسته‌بندی‌های موضوعی', items: ['خاطره شخصی', 'رویا', 'سفر', 'خانواده', 'دوستان', 'مدرسه / دانشگاه', 'عشق', 'کار', 'چالش‌ها'] },
    { title: '⏳ دسته‌بندی‌های زمانی', items: ['کودکی', 'نوجوانی', 'بزرگسالی'] },
  ];

  for (const g of data) {
    const group = await CategoryGroup.findOneAndUpdate(
      { title: g.title },
      { $set: { title: g.title } },
      { upsert: true, new: true }
    );

    for (const title of g.items) {
      await CategoryItem.updateOne(
        { group: group._id, title },
        { $setOnInsert: { group: group._id, title } },
        { upsert: true }
      );
    }
  }

  await CategoryItem.syncIndexes();
  await CategoryGroup.syncIndexes();
}
