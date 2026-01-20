# Daily Prediction - Документация

## Описание проекта

**Daily Prediction** — Telegram Mini App "Пророцтво дня" для аптечного бренду ANC. Інтерактивна магічна куля з щоденними передбаченнями, згенерованими AI.

## Швидкі посилання

| Компонент | URL | Деплой |
|-----------|-----|--------|
| **Frontend** | https://daily-prediction.vercel.app | Vercel (автодеплой з GitHub) |
| **Backend** | https://backend-production-3436.up.railway.app | Railway |
| **Scheduler** | https://daily-prediction-scheduler-production.up.railway.app | Railway |
| **GitHub** | https://github.com/popravkae/daily-prediction-tg | - |
| **Mini App** | https://t.me/anc_pobajania_bot?startapp=daily | - |
| **Bot** | @anc_pobajania_bot | BotFather |

### Railway Dashboard
- Проект: https://railway.com/project/1aef6745-6355-4f0e-b179-9d2b3239c16e

## Архітектура

```
daily-prediction/
├── backend/                 # Node.js + Express + Prisma
│   ├── prisma/
│   │   └── schema.prisma   # Схема бази даних
│   ├── src/
│   │   └── index.js        # Головний сервер
│   ├── package.json
│   ├── Procfile            # Для Railway
│   └── railway.json        # Конфігурація Railway
│
├── frontend/               # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/
│   │   │   ├── InteractiveBackground.tsx  # Анімований фон
│   │   │   ├── MagicBall.tsx              # Магічна куля (CSS)
│   │   │   ├── Stand.tsx                  # Підставка (SVG)
│   │   │   ├── ScratchLayer.tsx           # Шар для стирання (Canvas)
│   │   │   ├── Loader.tsx                 # Завантажувач
│   │   │   ├── ShareButton.tsx            # Кнопка поширення
│   │   │   └── index.ts
│   │   ├── App.tsx         # Головний компонент
│   │   ├── main.tsx        # Точка входу
│   │   └── index.css       # Глобальні стилі
│   ├── package.json
│   └── vite.config.ts
│
├── scheduler/              # Node.js + Express + node-cron
│   ├── src/
│   │   └── index.js        # Cron-задачі та API
│   ├── package.json
│   └── railway.json        # Конфігурація Railway
│
├── bot/                    # Python + aiogram (опціонально)
│   └── bot.py              # Telegram бот
│
└── README.md
```

## Технології

### Backend
- **Node.js** + **Express** — веб-сервер
- **Prisma** — ORM для PostgreSQL
- **OpenRouter API** — генерація передбачень (GPT-4o-mini)

### Frontend
- **React 18** + **TypeScript** — UI фреймворк
- **Vite** — збірка
- **Tailwind CSS** — стилізація
- **Framer Motion** — анімації
- **canvas-confetti** — конфетті ефект
- **@telegram-apps/sdk** — Telegram Mini App SDK

### База даних
- **PostgreSQL** (Railway)

## Схема бази даних

```prisma
model User {
  id          String       @id @default(uuid())
  telegramId  BigInt       @unique
  firstName   String?
  predictions Prediction[]
  createdAt   DateTime     @default(now())
}

model Prediction {
  id        String   @id @default(uuid())
  text      String
  createdAt DateTime @default(now())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
}
```

## API Endpoints

### POST /api/predict
Отримати передбачення для користувача.

**Request:**
```json
{
  "initData": "telegram_init_data_string"
}
```

**Response:**
```json
{
  "prediction": "Зірки кажуть: сьогодні вітамін С - твій найкращий друг!",
  "cached": false,
  "createdAt": "2025-01-18T12:00:00.000Z"
}
```

**Логіка:**
- Парсить `initData` з Telegram WebApp
- Перевіряє чи є передбачення за останні 24 години
- Якщо є — повертає кешоване
- Якщо немає — генерує нове через OpenRouter API

### GET /health
Перевірка стану сервера.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-18T12:00:00.000Z"
}
```

## Змінні середовища

### Backend (.env)
```env
DATABASE_URL=postgresql://user:password@host:5432/database
OPENROUTER_API_KEY=sk-or-v1-xxx
PORT=3000
FRONTEND_URL=https://your-frontend.vercel.app
BOT_TOKEN=1234567890:AAxxxx
```

### Frontend (.env)
```env
VITE_API_URL=https://your-backend.railway.app
```

## Інфраструктура

### GitHub Repository
- URL: https://github.com/popravkae/daily-prediction-tg

### Railway (Backend + Scheduler + PostgreSQL)
- Dashboard: https://railway.com/project/1aef6745-6355-4f0e-b179-9d2b3239c16e
- Backend URL: https://backend-production-3436.up.railway.app
- Scheduler URL: https://daily-prediction-scheduler-production.up.railway.app
- База даних: PostgreSQL (автоматично створена)

### Vercel (Frontend)
- URL: https://daily-prediction.vercel.app

### Telegram
- Bot: @anc_pobajania_bot
- Bot Token: `7621065770:AAGcHj_IE416pP0fM1EcrZveXsSmVPeIgKc`
- Mini App URL: https://t.me/anc_pobajania_bot?startapp=daily

## Деплой

### Backend на Railway

1. Проект вже створено та пов'язано з GitHub
2. PostgreSQL база додана автоматично
3. Змінні середовища налаштовані:
   - `DATABASE_URL` — посилання на Postgres
   - `OPENROUTER_API_KEY` — ключ OpenRouter
   - `BOT_TOKEN` — токен Telegram бота
   - `PORT` — 3000
   - `FRONTEND_URL` — URL фронтенду

4. Для деплою з локальної папки:
```bash
cd backend
railway up --service daily-prediction-backend
```

### Scheduler на Railway

Scheduler публікує пости в канал щодня о 08:00 та видаляє о 00:00 (Київ).

1. Змінні середовища:
   - `BOT_TOKEN` — токен Telegram бота
   - `CHANNEL_ID` — ID каналу (за замовчуванням: `-1002959175149`)
   - `MINI_APP_URL` — посилання на Mini App (за замовчуванням: `https://t.me/anc_pobajania_bot?startapp=daily`)
   - `IMAGE_URL` — URL картинки для поста
   - `PORT` — 3000

2. Для деплою:
```bash
cd scheduler
railway up --service daily-prediction-scheduler
```

3. API endpoints:
   - `GET /health` — статус сервера
   - `GET /status` — поточний стан (message ID, URL, розклад)
   - `POST /publish` — вручну опублікувати пост
   - `POST /delete` — вручну видалити пост

4. Перевірка статусу:
```bash
curl https://daily-prediction-scheduler-production.up.railway.app/status
```

### Frontend на Vercel

1. Встановіть Vercel CLI:
```bash
npm install -g vercel
```

2. Задеплойте:
```bash
cd frontend
npm run build
vercel --prod
```

3. Встановіть змінну:
```
VITE_API_URL=https://backend-production-3436.up.railway.app
```

## Mini App посилання

### Типи посилань

| Тип | URL | Опис |
|-----|-----|------|
| **Main Mini App** | `https://t.me/anc_pobajania_bot?startapp=daily` | Головний Mini App, без повторних підтверджень |
| **Direct Link** | `https://t.me/anc_pobajania_bot/prediction` | Direct Link Mini App (питає підтвердження з inline кнопок) |
| **Deep Link (tg://)** | `tg://resolve?domain=anc_pobajania_bot&startapp=daily` | Альтернативний формат |

### Чому використовуємо Main Mini App (`?startapp=`)

При використанні Direct Link (`/prediction`) в inline кнопках каналу, Telegram **завжди** питає підтвердження користувача (це захист безпеки).

Main Mini App (`?startapp=`) використовує інший API метод (`messages.requestMainWebView`) і не потребує підтвердження після першої авторизації.

**Документація:** https://core.telegram.org/api/bots/webapps#main-mini-apps

## Функціонал додатку

### Фази роботи

1. **Loading** — завантаження передбачення з API
2. **Interactive** — користувач "стирає" туман з магічної кулі
3. **Revealed** — показ передбачення + конфетті + кнопка поширення

### Візуальні компоненти

Всі візуальні елементи реалізовані без растрових зображень:

- **MagicBall** — CSS градієнти, backdrop-blur, анімація пульсації
- **Stand** — SVG з золотими градієнтами та декоративними елементами
- **ScratchLayer** — Canvas з процедурним туманом, стирання через `globalCompositeOperation: 'destination-out'`
- **InteractiveBackground** — анімований mesh gradient + плаваючі частинки

### Telegram інтеграція

- Ініціалізація через `Telegram.WebApp.ready()`
- Розгортання на весь екран через `Telegram.WebApp.expand()`
- Хаптик фідбек при стиранні та розкритті
- Поширення через `Telegram.WebApp.shareUrl()`

## Telegram Bot

Токен бота зберігається в змінних середовища (`BOT_TOKEN`). Отримати новий токен можна через @BotFather.

Для налаштування Mini App:
1. Відкрийте @BotFather
2. Виберіть бота
3. `/setmenubutton` → встановіть URL Mini App
4. Або `/newapp` для створення окремого додатку

## Локальна розробка

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Відредагуйте .env

npx prisma db push
npm run dev
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
# Встановіть VITE_API_URL

npm run dev
```

## Проблеми та вирішення

### Railway деплой
Якщо виникають проблеми з nixpacks:
1. Використовуйте `railway up` з папки `backend/`
2. Або створіть окремий репозиторій тільки для backend

### CORS
Backend налаштований на прийом запитів з `FRONTEND_URL`. Переконайтесь що URL правильний.

### 24-годинний ліміт
Передбачення кешуються на 24 години для кожного користувача. Це реалізовано на рівні бази даних.
