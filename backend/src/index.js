require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Prediction endpoint
app.post('/api/predict', async (req, res) => {
  try {
    const { initData } = req.body;

    if (!initData) {
      return res.status(400).json({ error: 'initData is required' });
    }

    // Parse Telegram initData
    const userData = parseInitData(initData);

    if (!userData || !userData.id) {
      return res.status(400).json({ error: 'Invalid initData' });
    }

    const telegramId = BigInt(userData.id);
    const firstName = userData.first_name || null;

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { telegramId }
    });

    if (!user) {
      user = await prisma.user.create({
        data: { telegramId, firstName }
      });
    }

    // Check for existing prediction since start of today (Kyiv timezone)
    // Day resets at 00:00 Kyiv time, new post appears at 08:00 Kyiv time
    const now = new Date();

    // Get today's date in Kyiv timezone (YYYY-MM-DD format)
    const kyivDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Kyiv' });

    // Get UTC offset for Kyiv right now (handles DST automatically)
    const kyivNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }));
    const utcNow = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const offsetMs = kyivNow.getTime() - utcNow.getTime();

    // Calculate Kyiv midnight in UTC
    const [year, month, day] = kyivDateStr.split('-').map(Number);
    const kyivMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - offsetMs);

    const startOfTodayKyiv = kyivMidnight;

    const existingPrediction = await prisma.prediction.findFirst({
      where: {
        userId: user.id,
        createdAt: { gte: startOfTodayKyiv }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existingPrediction) {
      // Return cached prediction
      return res.json({
        prediction: existingPrediction.text,
        cached: true,
        createdAt: existingPrediction.createdAt
      });
    }

    // Generate new prediction via OpenRouter
    const predictionText = await generatePrediction(firstName);

    // Save to database
    const newPrediction = await prisma.prediction.create({
      data: {
        text: predictionText,
        userId: user.id
      }
    });

    res.json({
      prediction: newPrediction.text,
      cached: false,
      createdAt: newPrediction.createdAt
    });

  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ error: 'Failed to generate prediction' });
  }
});

// Parse Telegram initData
function parseInitData(initData) {
  try {
    const params = new URLSearchParams(initData);
    const userParam = params.get('user');

    if (userParam) {
      return JSON.parse(userParam);
    }
    return null;
  } catch (error) {
    console.error('Failed to parse initData:', error);
    return null;
  }
}

// Generate prediction using OpenRouter API
async function generatePrediction(firstName) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    // Fallback predictions if no API key
    return getRandomFallbackPrediction();
  }

  // System prompt - "Pharmacist-Mage" for ANC pharmacy brand
  const systemPrompt = `You are a quirky, positive "Pharmacist-Mage". Generate a short daily prediction in Ukrainian.

STRICT RULES:
1. Max 120 characters.
2. NEVER use "Сьогодні", "сьогоднішній", "today" - FORBIDDEN WORDS!
3. NEVER use "ти", "твій", "тобі" - use impersonal style.
4. No medicine, pills, vitamins mentions.

Good examples:
- "Зорі підказують: час для сміливих планів!"
- "Рівень удачі максимальний — всі двері відчинені."
- "Магія в повітрі! Лови момент."
- "Всесвіт шепоче: все складеться чудово."
- "Енергія зашкалює! Перешкоди зникають."
- "Час діяти — успіх чекає за рогом."`;

  const userPrompt = firstName
    ? `Generate a short daily prediction for ${firstName}. Max 150 characters.`
    : `Generate a short daily prediction. Max 150 characters.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
        'X-Title': 'Daily Prediction App'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 200,
        temperature: 0.8 // Creative as per spec
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || getRandomFallbackPrediction();

  } catch (error) {
    console.error('OpenRouter API error:', error);
    return getRandomFallbackPrediction();
  }
}

// Fallback predictions (matching new style - no "ти/твій", no "сьогодні")
function getRandomFallbackPrediction() {
  const predictions = [
    "Зорі підказують: саме час для сміливих планів та смачної кави.",
    "Рівень удачі максимальний: всі світлофори будуть зеленими.",
    "Рецепт дня: побільше посмішок і жодних зайвих турбот.",
    "Час повірити в диво та власні сили!",
    "Енергія просто зашкалює! Всі перешкоди долаються легко.",
    "Магія вже в повітрі — лови момент!",
    "Всесвіт шепоче: все складеться найкращим чином.",
    "Час діяти! Успіх вже чекає за рогом."
  ];

  return predictions[Math.floor(Math.random() * predictions.length)];
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
