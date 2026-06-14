import bcrypt from "bcrypt";
import { PrismaClient, Prisma } from "@prisma/client";

const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "demo12345";

const DEFAULT_EXPENSE_CATEGORIES = ["Продукты", "Транспорт", "Жилье", "Здоровье", "Связь", "Развлечения", "Прочее"];
const DEFAULT_SAVING_CATEGORIES = ["Резерв", "Накопления", "Вклад", "Крупная покупка", "Отпуск", "Прочее"];

const EXPENSE_COUNT = 1000;
const SAVING_COUNT = 500;
const MONTHS = 12;

// Комментарии добавляются примерно к четверти операций
const COMMENT_PROBABILITY = 0.25;

const EXPENSE_COMMENTS: Record<string, string[]> = {
  Продукты: ["Магнит", "Перекрёсток", "Вкусвилл", "Доставка из Самоката", "Базар"],
  Транспорт: ["Метро", "Такси", "Бензин", "Каршеринг", "Электричка"],
  Жилье: ["ЖКХ", "Аренда", "Интернет", "Ремонт", "Мебель"],
  Здоровье: ["Аптека", "Стоматолог", "Анализы", "Врач", "Витамины"],
  Связь: ["Мобильный", "Подписка YouTube Premium", "Хостинг", "VPN"],
  Развлечения: ["Кино", "Концерт", "Бар с друзьями", "Книги", "Steam"],
  Прочее: ["Подарок", "Налоги", "Подписка на сервис", "Канцелярия"]
};

const SAVING_COMMENTS: Record<string, string[]> = {
  Резерв: ["Финансовая подушка", "Резерв на чёрный день"],
  Накопления: ["Регулярное пополнение", "Бонус с зарплаты"],
  Вклад: ["Открытие вклада", "Пополнение вклада", "Капитализация"],
  "Крупная покупка": ["На технику", "На обучение", "На ремонт"],
  Отпуск: ["На море", "На отпуск зимой", "Авиабилеты"],
  Прочее: ["Цели", "На будущее"]
};

const prisma = new PrismaClient();

function pseudoRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("Seed нельзя запускать в production");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    console.log(`Демо-пользователь ${DEMO_EMAIL} уже существует. Seed пропущен.`);
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { email: DEMO_EMAIL, passwordHash }
    });
    await tx.category.createMany({
      data: [
        ...DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
          userId: created.id,
          name,
          type: "expense" as const
        })),
        ...DEFAULT_SAVING_CATEGORIES.map((name) => ({
          userId: created.id,
          name,
          type: "saving" as const
        }))
      ]
    });
    return created;
  });

  const expenseCategories = await prisma.category.findMany({
    where: { userId: user.id, type: "expense" }
  });
  const savingCategories = await prisma.category.findMany({
    where: { userId: user.id, type: "saving" }
  });

  const rand = pseudoRandom(42);
  const now = new Date();
  const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startDate = new Date(endDate);
  startDate.setUTCMonth(startDate.getUTCMonth() - (MONTHS - 1));
  startDate.setUTCDate(1);

  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  function pickComment(categoryName: string, pool: Record<string, string[]>): string | null {
    if (rand() > COMMENT_PROBABILITY) return null;
    const variants = pool[categoryName];
    if (!variants || variants.length === 0) return null;
    return variants[Math.floor(rand() * variants.length)]!;
  }

  const txs: Prisma.TransactionCreateManyInput[] = [];

  for (let i = 0; i < EXPENSE_COUNT; i += 1) {
    const dayOffset = Math.floor(rand() * (totalDays + 1));
    const date = new Date(startDate);
    date.setUTCDate(date.getUTCDate() + dayOffset);
    const amount = (100 + Math.floor(rand() * 4900)).toFixed(2);
    const cat = expenseCategories[Math.floor(rand() * expenseCategories.length)]!;
    const comment = pickComment(cat.name, EXPENSE_COMMENTS);
    txs.push({
      userId: user.id,
      categoryId: cat.id,
      type: "expense",
      amount,
      date,
      ...(comment ? { comment } : {})
    });
  }

  // Регулярные сбережения «по зарплате»: 5, 15 и 25 числа каждого месяца —
  // так в журнале всегда есть свежие сбережения, плюс реалистичный паттерн.
  const salaryDays = [5, 15, 25];
  for (let m = 0; m < MONTHS; m += 1) {
    const monthDate = new Date(startDate);
    monthDate.setUTCMonth(monthDate.getUTCMonth() + m);
    for (const day of salaryDays) {
      const date = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), day));
      if (date.getTime() < startDate.getTime() || date.getTime() > endDate.getTime()) {
        continue;
      }
      const amount = (3000 + Math.floor(rand() * 12000)).toFixed(2);
      const cat = savingCategories[Math.floor(rand() * savingCategories.length)]!;
      const comment = pickComment(cat.name, SAVING_COMMENTS);
      txs.push({
        userId: user.id,
        categoryId: cat.id,
        type: "saving",
        amount,
        date,
        ...(comment ? { comment } : {})
      });
    }
  }

  // Дополнительные сбережения, разбросанные равномерно — крупнее, реже
  const remainingSavings = SAVING_COUNT - MONTHS * salaryDays.length;
  for (let i = 0; i < remainingSavings; i += 1) {
    const dayOffset = Math.floor(rand() * (totalDays + 1));
    const date = new Date(startDate);
    date.setUTCDate(date.getUTCDate() + dayOffset);
    const amount = (5000 + Math.floor(rand() * 25000)).toFixed(2);
    const cat = savingCategories[Math.floor(rand() * savingCategories.length)]!;
    const comment = pickComment(cat.name, SAVING_COMMENTS);
    txs.push({
      userId: user.id,
      categoryId: cat.id,
      type: "saving",
      amount,
      date,
      ...(comment ? { comment } : {})
    });
  }

  await prisma.transaction.createMany({ data: txs });

  const withCommentCount = txs.filter((t) => t.comment != null).length;
  console.log(`Создан пользователь ${DEMO_EMAIL} (пароль ${DEMO_PASSWORD}):`);
  console.log(`  - ${EXPENSE_COUNT} операций расходов`);
  console.log(`  - ${SAVING_COUNT} операций сбережений`);
  console.log(`  - ${withCommentCount} операций с комментариями`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
