const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error('ERROR: OPENROUTER_API_KEY is not set in .env');
  process.exit(1);
}

app.use(express.json());

app.post('/api/v1/chat', async (req, res) => {
  const { message, history, context_item } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Missing message in request body' });
  }

  // Prepare messages for OpenRouter (Anthropic Claude format)
  const messages = [];
  if (Array.isArray(history)) {
    for (const msg of history) {
      if (msg.role && msg.content) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
  }
  messages.push({ role: 'user', content: message });

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'anthropic/claude-3-sonnet',
        messages,
        ...(context_item ? { context_item } : {}),
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const aiMessage = response.data.choices?.[0]?.message?.content || '';
    res.json({
      aiResponseText: aiMessage,
      actionMetadata: null,
      contextItemId: null,
      contextItemType: null,
    });
  } catch (err) {
    console.error('OpenRouter API error:', err.response?.data || err.message);
    res.status(500).json({ error: 'AI API error', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend AI proxy listening on port ${PORT}`);
}); 