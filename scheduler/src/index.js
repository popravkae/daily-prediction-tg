require('dotenv').config();
const cron = require('node-cron');
const fetch = require('node-fetch');

// Configuration
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID || '-1002959175149';
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://t.me/anc_pobajania_bot?startapp=daily';
const IMAGE_URL = process.env.IMAGE_URL || 'https://drive.google.com/uc?export=download&id=1-FeAzDErrhvYbfuFjNFAvFyCxOlGJ55W';
const PORT = process.env.PORT || 3000;

// Store for current message ID (in production, use Redis or database)
let currentMessageId = null;

// Telegram API base URL
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Log with Kyiv time
function logWithTime(message) {
  const kyivTime = new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' });
  console.log(`[${kyivTime}] ${message}`);
}

// Send photo with Mini App button to channel
async function publishDailyPost() {
  logWithTime('Starting daily post publication...');

  try {
    // First, delete previous post if exists
    if (currentMessageId) {
      await deletePost(currentMessageId);
    }

    const caption = `👋 <b>Пс-с, Всесвіт на лінії!</b>\n\nВсесвіт нагадує: ранок без магії — гроші на вітер 💸. Куля заряджена і чекає вашого дотику.\n\nТисніть кнопку, <b>потріть гарненько кулю</b> (як лампу джина) і ловіть свій знак долі 👇`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          {
            text: '🔮 Хочу передбачення!',
            url: MINI_APP_URL
          }
        ]
      ]
    };

    // Send photo with caption and button
    const response = await fetch(`${TELEGRAM_API}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHANNEL_ID,
        photo: IMAGE_URL,
        caption: caption,
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard
      })
    });

    const result = await response.json();

    if (result.ok) {
      currentMessageId = result.result.message_id;
      logWithTime(`Post published successfully! Message ID: ${currentMessageId}`);
      return { success: true, messageId: currentMessageId };
    } else {
      logWithTime(`Failed to publish post: ${JSON.stringify(result)}`);
      return { success: false, error: result };
    }

  } catch (error) {
    logWithTime(`Error publishing post: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Delete post from channel
async function deletePost(messageId) {
  if (!messageId) {
    logWithTime('No message ID to delete');
    return { success: false, error: 'No message ID' };
  }

  logWithTime(`Deleting message ${messageId}...`);

  try {
    const response = await fetch(`${TELEGRAM_API}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHANNEL_ID,
        message_id: messageId
      })
    });

    const result = await response.json();

    if (result.ok) {
      logWithTime(`Message ${messageId} deleted successfully`);
      currentMessageId = null;
      return { success: true };
    } else {
      logWithTime(`Failed to delete message: ${JSON.stringify(result)}`);
      return { success: false, error: result };
    }

  } catch (error) {
    logWithTime(`Error deleting message: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Schedule: Publish at 8:00 Kyiv time (6:00 UTC in winter, 5:00 UTC in summer)
// Using Europe/Kyiv timezone
cron.schedule('0 8 * * *', () => {
  logWithTime('Cron triggered: 8:00 AM Kyiv time - Publishing post');
  publishDailyPost();
}, {
  timezone: 'Europe/Kyiv'
});

// Schedule: Delete at 00:00 Kyiv time
cron.schedule('0 0 * * *', () => {
  logWithTime('Cron triggered: 00:00 Kyiv time - Deleting post');
  if (currentMessageId) {
    deletePost(currentMessageId);
  } else {
    logWithTime('No post to delete');
  }
}, {
  timezone: 'Europe/Kyiv'
});

// Express server for health checks and manual triggers
const express = require('express');
const app = express();

app.get('/health', (req, res) => {
  const kyivTime = new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' });
  res.json({
    status: 'ok',
    currentMessageId,
    serverTime: new Date().toISOString(),
    kyivTime,
    nextPublish: '08:00 Kyiv',
    nextDelete: '00:00 Kyiv'
  });
});

// Manual publish trigger (for testing)
app.post('/publish', async (req, res) => {
  logWithTime('Manual publish triggered');
  const result = await publishDailyPost();
  res.json(result);
});

// Manual delete trigger (for testing)
app.post('/delete', async (req, res) => {
  logWithTime('Manual delete triggered');
  const result = await deletePost(currentMessageId);
  res.json(result);
});

// Get current status
app.get('/status', (req, res) => {
  res.json({
    currentMessageId,
    channelId: CHANNEL_ID,
    miniAppUrl: MINI_APP_URL,
    schedules: {
      publish: '08:00 Europe/Kyiv',
      delete: '00:00 Europe/Kyiv'
    }
  });
});

app.listen(PORT, () => {
  logWithTime(`Scheduler server running on port ${PORT}`);
  logWithTime(`Channel ID: ${CHANNEL_ID}`);
  logWithTime(`Mini App URL: ${MINI_APP_URL}`);
  logWithTime('Cron jobs scheduled:');
  logWithTime('  - Publish: 08:00 Kyiv time');
  logWithTime('  - Delete: 00:00 Kyiv time');
});
