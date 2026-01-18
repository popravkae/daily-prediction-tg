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

    // Check for existing prediction within last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const existingPrediction = await prisma.prediction.findFirst({
      where: {
        userId: user.id,
        createdAt: { gte: twentyFourHoursAgo }
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

  // System prompt from spec - "Pharmacist-Mage" for ANC pharmacy brand
  const systemPrompt = `You are a quirky, positive, and slightly cynical "Pharmacist-Mage" for the ANC pharmacy brand.
Your task is to generate a Daily Prediction for the user.

constraints:
1. Language: Ukrainian.
2. Length: Max 150 characters (Very short and punchy).
3. Tone: Humorous, warm, neutral, slightly magical but grounded in reality.
4. Topics: Luck, Energy, Vitamins, Sleep, Nerves, Cats, Work-Life Balance.
5. RESTRICTIONS: No politics, no religion, no offensive content, no medical diagnoses.

Style Examples:
- "Зорі кажуть: сьогодні ідеальний день, щоб нічого не робити, але після роботи."
- "Твій рівень удачі сьогодні: 'Знайшов 50 гривень у зимовій куртці'."
- "Не приймай все близько до серця, приймай вітаміни."
- "Сьогодні ти магніт для успіху. І для котиків."
- "Енергія зашкалює! Можеш заряджати телефони поглядом."`;

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

// Fallback predictions
function getRandomFallbackPrediction() {
  const predictions = [
    "Зірки кажуть: сьогодні вітамін С - твій найкращий друг. І трохи сну не завадить!",
    "Магія підказує: випий води і посміхнись. Нерви заспокояться самі.",
    "Кристал бачить: сьогодні твоя удача в зеленому чаї та ранковій прогулянці.",
    "Провидіння шепоче: менше кави, більше обіймів. Так і живемо!",
    "Зелье дня: добра думка + вітамін D = успішний день.",
    "Карти таро радять: їж овочі та не забувай про друзів.",
    "Місяць віщує: сьогодні найкращі ліки - це сміх і свіже повітря.",
    "Аптечна магія: вітамін В12 та гарний настрій творять чудеса!"
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
