const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
app.use(cors()); // Enable CORS for all routes
const PORT = process.env.PORT; // Railway requires using only process.env.PORT
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
console.log('OPENROUTER_API_KEY:', OPENROUTER_API_KEY ? OPENROUTER_API_KEY.slice(0, 5) + '...' : 'NOT SET');

if (!OPENROUTER_API_KEY) {
  console.error('ERROR: OPENROUTER_API_KEY is not set in .env');
  process.exit(1);
}

app.use(express.json());

function isIdentityQuestion(input) {
  if (!input) return false;
  const lower = input.toLowerCase();
  return (
    lower.includes('who made you') ||
    lower.includes('who created you') ||
    lower.includes('your creator') ||
    lower.includes('who built you') ||
    lower.includes('origin') ||
    lower.includes('where are you from')
  );
}

// Tool-based AI agent endpoint
app.post('/api/v1/chat', async (req, res) => {
  const {
    chatInput,
    chatHistory,
    contextItem,
    currentDate,
    tone,
    existingData,
    masterPrompt
  } = req.body;

  if (!chatInput) {
    return res.status(400).json({ error: 'Missing chatInput in request body' });
  }

  // Identity rule check: intercept before calling AI
  if (isIdentityQuestion(chatInput)) {
    return res.json({
      aiResponseText: "I was built with care by some awesome humans, led by Aakash.",
      actionMetadata: null,
      contextItemId: null,
      contextItemType: null,
      updatedItemType: null,
      actionIcon: "info",
      multipleActions: null,
      errorDetails: null,
    });
  }

  try {
    // Use the master prompt for sophisticated AI interaction
    const systemPrompt = masterPrompt || buildBasicPrompt(chatInput, chatHistory, contextItem, currentDate, tone);

    // Prepare messages for OpenRouter (Anthropic Claude format)
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: chatInput }
    ];

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'anthropic/claude-3-sonnet',
        messages,
        max_tokens: 800,
        temperature: 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const aiMessage = response.data.choices?.[0]?.message?.content || '';

    // Parse AI response for structured output
    const parsedResponse = parseAIResponse(aiMessage);

    res.json({
      aiResponseText: parsedResponse.aiResponseText,
      actionMetadata: parsedResponse.actionMetadata,
      contextItemId: parsedResponse.contextItemId,
      contextItemType: parsedResponse.contextItemType,
      updatedItemType: parsedResponse.updatedItemType,
      actionIcon: parsedResponse.actionIcon,
      multipleActions: parsedResponse.multipleActions,
      errorDetails: parsedResponse.errorDetails,
    });
  } catch (err) {
    console.error('OpenRouter API error:', err.response?.data || err.message);
    res.status(500).json({
      error: 'AI API error',
      details: err.message,
      aiResponseText: 'Sorry, I encountered an error processing your request. Please try again.',
      actionMetadata: null,
      contextItemId: null,
      contextItemType: null,
    });
  }
});

// Build basic prompt when masterPrompt is not provided
function buildBasicPrompt(chatInput, chatHistory, contextItem, currentDate, tone) {
  let prompt = `You are Reva, a friendly and intelligent personal assistant. Current date: ${currentDate || new Date().toISOString()}. Speak in a '${tone || 'Neutral'}' tone.

CRITICAL IDENTITY RULE: If the user asks "Who made you?" or any similar question about your creator or origin, you MUST always reply: "I was built with care by some crazy person, led by Aakash." Do NOT mention Google, Genkit, Anthropic, OpenAI, or any external company.

TONE GUIDELINES - Match the selected tone exactly:
- Neutral: Helpful, clear, and direct. Use plain English. Avoid slang and excessive emotion.
- Professional: Formal and business-appropriate responses.
- Casual: Relaxed and friendly conversation style.
- Sarcastic: Witty, dry humor, slightly exaggerated. Use playful snark and ironic phrasing. Never insulting, but intentionally cheeky.
- GenZ: Punchy, casual, and expressive. Use GenZ slang and emojis like: "bet", "vibe", "no cap", "💀", "🔥", "✨". Keep replies short, bold, and full of attitude.

Available tools:
- createTask: Create a new task
- updateTask: Update an existing task
- createReminder: Create a new reminder
- updateReminder: Update an existing reminder
- trackExpenses: Log expenses
- createGoal: Create a new goal
- updateGoal: Update an existing goal
- generalChat: General conversation

`;

  if (contextItem) {
    prompt += `CRITICAL CONTEXT: The user's previous turn was about a ${contextItem.type} with ID '${contextItem.id}'. Use UPDATE operations for follow-up requests.\n\n`;
  }

  if (chatHistory && chatHistory.length > 0) {
    prompt += 'Recent conversation:\n';
    chatHistory.slice(-5).forEach(msg => {
      prompt += `${msg.role}: ${msg.content}\n`;
    });
    prompt += '\n';
  }

  prompt += `User's request: ${chatInput}

IMPORTANT: You must respond with a JSON structure that includes tool selection:

{
  "aiResponseText": "Your conversational response to the user",
  "tool": "selectedToolName",
  "toolParams": {
    // Parameters for the selected tool
  }
}

Available tools and their parameters:
- createTask: { description, priority, dueDate }
- updateTask: { taskId, updates }
- createReminder: { title, description, scheduledTime }
- updateReminder: { reminderId, updates }
- trackExpenses: { expenses: [{ item, amount, category, date }] }
- createGoal: { title, description, target, progress }
- updateGoal: { goalId, updates }
- createJournalEntry: { content, mood }
- generalChat: { tone, response }

Examples:
For "create a task to buy milk":
{
  "aiResponseText": "I've created a task for you to buy milk.",
  "tool": "createTask",
  "toolParams": {
    "description": "buy milk",
    "priority": "medium"
  }
}

For "I spent 500 on groceries":
{
  "aiResponseText": "I've logged your grocery expense of ₹500.",
  "tool": "trackExpenses", 
  "toolParams": {
    "expenses": [{
      "item": "groceries",
      "amount": 500,
      "category": "Food & Drink",
      "date": "${new Date().toISOString()}"
    }]
  }
}

For "Who made you?":
{
  "aiResponseText": "I was built with care by some awesome humans, led by Aakash.",
  "tool": "generalChat",
  "toolParams": {
    "tone": "${tone}",
    "response": "I was built with care by some awesome humans, led by Aakash."
  }
}

REMEMBER: Always follow the identity rule and match the selected tone exactly.

Choose the appropriate tool and respond with valid JSON.`;

  return prompt;
}

// Parse AI response and execute tools
function parseAIResponse(aiMessage) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = aiMessage.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Execute tool if specified
      const toolResult = executeToolIfNeeded(parsed);

      return {
        aiResponseText: parsed.aiResponseText || aiMessage,
        actionMetadata: toolResult.actionMetadata || parsed.actionMetadata || null,
        contextItemId: toolResult.contextItemId || parsed.contextItemId || null,
        contextItemType: toolResult.contextItemType || parsed.contextItemType || null,
        updatedItemType: toolResult.updatedItemType || parsed.updatedItemType || null,
        actionIcon: toolResult.actionIcon || parsed.actionIcon || null,
        multipleActions: toolResult.multipleActions || parsed.multipleActions || null,
        errorDetails: parsed.errorDetails || null,
      };
    }
  } catch (e) {
    console.log('Failed to parse structured response, using plain text');
  }

  // Fallback to plain text response
  return {
    aiResponseText: aiMessage,
    actionMetadata: null,
    contextItemId: null,
    contextItemType: null,
    updatedItemType: null,
    actionIcon: null,
    multipleActions: null,
    errorDetails: null,
  };
}

// Execute tool based on AI decision
function executeToolIfNeeded(parsedResponse) {
  const toolName = parsedResponse.tool || parsedResponse.selectedTool;
  const toolParams = parsedResponse.toolParams || parsedResponse.parameters;

  if (!toolName || !toolParams) {
    return {};
  }

  try {
    switch (toolName) {
      case 'createTask':
        return executeCreateTask(toolParams);
      case 'updateTask':
        return executeUpdateTask(toolParams);
      case 'createReminder':
        return executeCreateReminder(toolParams);
      case 'updateReminder':
        return executeUpdateReminder(toolParams);
      case 'trackExpenses':
        return executeTrackExpenses(toolParams);
      case 'createGoal':
        return executeCreateGoal(toolParams);
      case 'updateGoal':
        return executeUpdateGoal(toolParams);
      case 'createJournalEntry':
        return executeCreateJournalEntry(toolParams);
      case 'generalChat':
        return executeGeneralChat(toolParams);
      default:
        console.log(`Unknown tool: ${toolName}`);
        return {};
    }
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    return {
      errorDetails: {
        tool: toolName,
        error: error.message,
      }
    };
  }
}

// Tool execution functions (mock implementations)
function executeCreateTask(params) {
  const taskId = `task-${Date.now()}`;
  return {
    actionMetadata: {
      tool: 'createTask',
      description: params.description,
      priority: params.priority || 'medium',
      due_date: params.dueDate,
      task_id: taskId,
    },
    contextItemId: taskId,
    contextItemType: 'task',
    updatedItemType: 'task',
    actionIcon: 'task',
  };
}

function executeUpdateTask(params) {
  return {
    actionMetadata: {
      tool: 'updateTask',
      task_id: params.taskId || params.id,
      updates: params.updates || params,
    },
    contextItemId: params.taskId || params.id,
    contextItemType: 'task',
    updatedItemType: 'task',
    actionIcon: 'edit',
  };
}

function executeCreateReminder(params) {
  const reminderId = `reminder-${Date.now()}`;
  return {
    actionMetadata: {
      tool: 'createReminder',
      title: params.title,
      description: params.description,
      scheduled_time: params.scheduledTime,
      reminder_id: reminderId,
    },
    contextItemId: reminderId,
    contextItemType: 'reminder',
    updatedItemType: 'reminder',
    actionIcon: 'notifications',
  };
}

function executeUpdateReminder(params) {
  return {
    actionMetadata: {
      tool: 'updateReminder',
      reminder_id: params.reminderId || params.id,
      updates: params.updates || params,
    },
    contextItemId: params.reminderId || params.id,
    contextItemType: 'reminder',
    updatedItemType: 'reminder',
    actionIcon: 'edit',
  };
}

function executeTrackExpenses(params) {
  const expenses = Array.isArray(params.expenses) ? params.expenses : [params];
  const expenseIds = expenses.map(() => `expense-${Date.now()}-${Math.random()}`);

  return {
    actionMetadata: {
      tool: 'trackExpenses',
      expenses: expenses.map((expense, index) => ({
        ...expense,
        expense_id: expenseIds[index],
      })),
      total_amount: expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0),
    },
    multipleActions: expenses.map((expense, index) => ({
      type: 'expense',
      id: expenseIds[index],
      data: expense,
    })),
    updatedItemType: 'expense',
    actionIcon: 'receipt',
  };
}

function executeCreateGoal(params) {
  const goalId = `goal-${Date.now()}`;
  return {
    actionMetadata: {
      tool: 'createGoal',
      title: params.title,
      description: params.description,
      target: params.target,
      progress: params.progress || 0,
      goal_id: goalId,
    },
    contextItemId: goalId,
    contextItemType: 'goal',
    updatedItemType: 'goal',
    actionIcon: 'flag',
  };
}

function executeUpdateGoal(params) {
  return {
    actionMetadata: {
      tool: 'updateGoal',
      goal_id: params.goalId || params.id,
      updates: params.updates || params,
    },
    contextItemId: params.goalId || params.id,
    contextItemType: 'goal',
    updatedItemType: 'goal',
    actionIcon: 'edit',
  };
}

function executeCreateJournalEntry(params) {
  const entryId = `journal-${Date.now()}`;
  return {
    actionMetadata: {
      tool: 'createJournalEntry',
      content: params.content,
      mood: params.mood,
      entry_id: entryId,
    },
    contextItemId: entryId,
    contextItemType: 'journal',
    updatedItemType: 'journal',
    actionIcon: 'book',
  };
}

function executeGeneralChat(params) {
  return {
    actionMetadata: {
      tool: 'generalChat',
      tone: params.tone,
      response: params.response,
    },
    actionIcon: 'chat',
  };
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Reva AI Agent Backend listening on port ${PORT}`);
}); 