# Daily Prediction - Telegram Mini App

Telegram Mini App "Пророцтво дня" для аптечного бренду ANC. Інтерактивна магічна куля з щоденними передбаченнями.

## Структура проекту

```
daily-prediction/
├── backend/           # Node.js + Express + Prisma
│   ├── prisma/        # Prisma схема та міграції
│   ├── src/           # Серверний код
│   └── package.json
├── frontend/          # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/  # UI компоненти
│   │   └── App.tsx      # Головний компонент
│   └── package.json
└── README.md
```

## Встановлення

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Відредагуйте .env з вашими credentials

# Створіть таблиці в базі даних
npx prisma db push

# Запустіть сервер
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Відредагуйте VITE_API_URL

npm run dev
```

## Environment Variables

### Backend (.env)
```
DATABASE_URL="postgresql://user:password@host:5432/database"
OPENROUTER_API_KEY="your_openrouter_api_key"
PORT=3000
FRONTEND_URL="http://localhost:5173"
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3000
```

## Деплой на Railway

### Backend
1. Створіть новий проект на Railway
2. Підключіть репозиторій
3. Додайте PostgreSQL addon
4. Налаштуйте змінні середовища
5. Railway автоматично запустить через Procfile

### Frontend
1. Збілдіть проект: `npm run build`
2. Задеплойте dist/ на Vercel/Netlify

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

### GET /health
Перевірка стану сервера.

## Функціонал

1. **Фаза завантаження** - анімований лоадер
2. **Інтерактивна фаза** - користувач "стирає" туман з магічної кулі
3. **Розкриття** - конфетті та показ передбачення
4. **Шеринг** - можливість поділитись через Telegram

## Технології

- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express, Prisma, PostgreSQL
- **AI**: OpenRouter API (GPT-4o-mini)
- **Telegram**: @telegram-apps/sdk
