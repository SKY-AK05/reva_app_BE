const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

/**
 * Generate a proper UUID v4 format with comprehensive error handling
 * @returns {string} A valid UUID v4 string (e.g., "a1b2c3d4-e5f6-4789-a012-b3c4d5e6f789")
 * @throws {Error} If all UUID generation methods fail
 */
function generateUUID() {
  const startTime = Date.now();
  
  try {
    const uuid = uuidv4();
    
    // Validate UUID format (UUID v4 regex pattern)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(uuid)) {
      const error = new Error('Generated UUID does not match v4 format');
      error.code = 'INVALID_UUID_FORMAT';
      error.generatedValue = uuid;
      throw error;
    }
    
    // Log successful UUID generation for monitoring
    const duration = Date.now() - startTime;
    if (duration > 10) { // Log if generation takes more than 10ms
      console.warn(`UUID generation took ${duration}ms - potential performance issue`);
    }
    
    return uuid;
  } catch (error) {
    console.error('Primary UUID generation failed:', {
      error: error.message,
      code: error.code,
      generatedValue: error.generatedValue,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime
    });
    
    // Attempt fallback UUID generation
    try {
      const fallbackUuid = generateFallbackUUID();
      console.warn('Using fallback UUID generation:', {
        fallbackUuid,
        originalError: error.message,
        timestamp: new Date().toISOString()
      });
      return fallbackUuid;
    } catch (fallbackError) {
      // Log critical failure
      console.error('CRITICAL: All UUID generation methods failed:', {
        primaryError: error.message,
        fallbackError: fallbackError.message,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      });
      
      // Create structured error for upstream handling
      const criticalError = new Error('UUID generation system failure');
      criticalError.code = 'UUID_GENERATION_FAILURE';
      criticalError.primaryError = error.message;
      criticalError.fallbackError = fallbackError.message;
      criticalError.timestamp = new Date().toISOString();
      throw criticalError;
    }
  }
}

/**
 * Fallback UUID generation using crypto.randomBytes if available, or Math.random
 * @returns {string} A fallback UUID v4 string
 * @throws {Error} If all fallback methods fail
 */
function generateFallbackUUID() {
  const startTime = Date.now();
  
  try {
    const crypto = require('crypto');
    const bytes = crypto.randomBytes(16);
    
    // Set version (4) and variant bits
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
    
    const hex = bytes.toString('hex');
    const fallbackUuid = [
      hex.substring(0, 8),
      hex.substring(8, 12),
      hex.substring(12, 16),
      hex.substring(16, 20),
      hex.substring(20, 32)
    ].join('-');
    
    // Validate the fallback UUID
    if (!isValidUUID(fallbackUuid)) {
      throw new Error(`Crypto fallback generated invalid UUID: ${fallbackUuid}`);
    }
    
    console.info('Crypto fallback UUID generated successfully:', {
      uuid: fallbackUuid,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
    
    return fallbackUuid;
  } catch (cryptoError) {
    console.error('Crypto fallback failed:', {
      error: cryptoError.message,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
    
    try {
      // Last resort: Math.random based UUID (less secure but functional)
      const mathRandomUuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      
      // Validate the Math.random UUID
      if (!isValidUUID(mathRandomUuid)) {
        throw new Error(`Math.random fallback generated invalid UUID: ${mathRandomUuid}`);
      }
      
      console.warn('Using Math.random fallback UUID (less secure):', {
        uuid: mathRandomUuid,
        cryptoError: cryptoError.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      });
      
      return mathRandomUuid;
    } catch (mathError) {
      // Complete failure - throw comprehensive error
      const error = new Error('All UUID fallback methods failed');
      error.code = 'FALLBACK_UUID_FAILURE';
      error.cryptoError = cryptoError.message;
      error.mathError = mathError.message;
      error.duration = Date.now() - startTime;
      error.timestamp = new Date().toISOString();
      throw error;
    }
  }
}

/**
 * Validate if a string is a proper UUID v4 format
 * @param {string} uuid - The UUID string to validate
 * @returns {boolean} True if valid UUID v4, false otherwise
 */
function isValidUUID(uuid) {
  if (typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Create structured error response for tool execution failures
 * @param {string} toolName - Name of the tool that failed
 * @param {Error} error - The error that occurred
 * @param {Object} params - Parameters that were passed to the tool
 * @returns {Object} Structured error response
 */
function createToolErrorResponse(toolName, error, params = {}) {
  const errorResponse = {
    error: true,
    tool: toolName,
    message: getUserFriendlyErrorMessage(toolName, error),
    technicalDetails: {
      errorMessage: error.message,
      errorCode: error.code || 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString(),
      parameters: params,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    },
    suggestedAction: getSuggestedAction(toolName, error),
    retryable: isRetryableError(error)
  };

  // Log the error for monitoring
  console.error(`Tool execution error [${toolName}]:`, {
    error: error.message,
    code: error.code,
    params,
    timestamp: new Date().toISOString(),
    stack: error.stack
  });

  return errorResponse;
}

/**
 * Get user-friendly error message based on tool and error type
 * @param {string} toolName - Name of the tool
 * @param {Error} error - The error that occurred
 * @returns {string} User-friendly error message
 */
function getUserFriendlyErrorMessage(toolName, error) {
  // UUID-specific errors
  if (error.code === 'UUID_GENERATION_FAILURE') {
    return `Unable to create ${getEntityName(toolName)} due to system error. Please try again.`;
  }
  
  if (error.code === 'INVALID_UUID_FORMAT') {
    return `System error occurred while creating ${getEntityName(toolName)}. Please try again.`;
  }

  // Tool-specific errors
  switch (toolName) {
    case 'createReminder':
      return 'Unable to create reminder. Please check your input and try again.';
    case 'createTask':
      return 'Unable to create task. Please check your input and try again.';
    case 'trackExpenses':
      return 'Unable to track expenses. Please check your input and try again.';
    case 'createGoal':
      return 'Unable to create goal. Please check your input and try again.';
    case 'createJournalEntry':
      return 'Unable to create journal entry. Please check your input and try again.';
    case 'updateReminder':
      return 'Unable to update reminder. Please try again.';
    case 'updateTask':
      return 'Unable to update task. Please try again.';
    case 'updateGoal':
      return 'Unable to update goal. Please try again.';
    default:
      return 'An error occurred while processing your request. Please try again.';
  }
}

/**
 * Get suggested action for user based on tool and error
 * @param {string} toolName - Name of the tool
 * @param {Error} error - The error that occurred
 * @returns {string} Suggested action for the user
 */
function getSuggestedAction(toolName, error) {
  // UUID-specific suggestions
  if (error.code === 'UUID_GENERATION_FAILURE' || error.code === 'INVALID_UUID_FORMAT') {
    return `Try creating the ${getEntityName(toolName)} manually in the ${getManualSection(toolName)} section.`;
  }

  // General suggestions based on tool
  switch (toolName) {
    case 'createReminder':
      return 'Try creating the reminder manually in the Reminders section.';
    case 'createTask':
      return 'Try creating the task manually in the Tasks section.';
    case 'trackExpenses':
      return 'Try adding the expense manually in the Expenses section.';
    case 'createGoal':
      return 'Try creating the goal manually in the Goals section.';
    case 'createJournalEntry':
      return 'Try creating the journal entry manually in the Journal section.';
    case 'updateReminder':
      return 'Try updating the reminder manually in the Reminders section.';
    case 'updateTask':
      return 'Try updating the task manually in the Tasks section.';
    case 'updateGoal':
      return 'Try updating the goal manually in the Goals section.';
    default:
      return 'Please try the operation again or contact support if the issue persists.';
  }
}

/**
 * Get entity name for user-friendly messages
 * @param {string} toolName - Name of the tool
 * @returns {string} Entity name
 */
function getEntityName(toolName) {
  const entityMap = {
    'createReminder': 'reminder',
    'updateReminder': 'reminder',
    'createTask': 'task',
    'updateTask': 'task',
    'trackExpenses': 'expense',
    'createGoal': 'goal',
    'updateGoal': 'goal',
    'createJournalEntry': 'journal entry'
  };
  return entityMap[toolName] || 'item';
}

/**
 * Get manual section name for suggestions
 * @param {string} toolName - Name of the tool
 * @returns {string} Manual section name
 */
function getManualSection(toolName) {
  const sectionMap = {
    'createReminder': 'Reminders',
    'updateReminder': 'Reminders',
    'createTask': 'Tasks',
    'updateTask': 'Tasks',
    'trackExpenses': 'Expenses',
    'createGoal': 'Goals',
    'updateGoal': 'Goals',
    'createJournalEntry': 'Journal'
  };
  return sectionMap[toolName] || 'appropriate';
}

/**
 * Check if an error is retryable
 * @param {Error} error - The error to check
 * @returns {boolean} True if error is retryable
 */
function isRetryableError(error) {
  const retryableCodes = [
    'UUID_GENERATION_FAILURE',
    'NETWORK_ERROR',
    'TIMEOUT_ERROR',
    'TEMPORARY_FAILURE'
  ];
  return retryableCodes.includes(error.code) || error.message.includes('timeout');
}

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
    // Enhanced error logging
    const errorDetails = {
      message: err.message,
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      timestamp: new Date().toISOString(),
      chatInput: chatInput?.substring(0, 100) + '...', // Log first 100 chars for debugging
    };

    console.error('OpenRouter API error:', errorDetails);

    // Determine error type and response
    let userMessage = 'Sorry, I encountered an error processing your request. Please try again.';
    let statusCode = 500;
    let retryable = true;

    if (err.response?.status === 401) {
      userMessage = 'Authentication error. Please contact support.';
      statusCode = 401;
      retryable = false;
    } else if (err.response?.status === 429) {
      userMessage = 'Service is temporarily busy. Please try again in a moment.';
      statusCode = 429;
      retryable = true;
    } else if (err.response?.status >= 400 && err.response?.status < 500) {
      userMessage = 'Invalid request. Please try rephrasing your message.';
      statusCode = 400;
      retryable = false;
    } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      userMessage = 'Unable to connect to AI service. Please try again later.';
      statusCode = 503;
      retryable = true;
    }

    res.status(statusCode).json({
      error: 'AI API error',
      details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
      aiResponseText: userMessage,
      actionMetadata: null,
      contextItemId: null,
      contextItemType: null,
      updatedItemType: null,
      actionIcon: 'error',
      errorDetails: {
        retryable: retryable,
        errorCode: err.response?.status || err.code || 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString(),
        suggestedAction: retryable ? 'Please try again' : 'Please contact support if the issue persists'
      }
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

// Execute tool based on AI decision with comprehensive error handling
function executeToolIfNeeded(parsedResponse) {
  const toolName = parsedResponse.tool || parsedResponse.selectedTool;
  const toolParams = parsedResponse.toolParams || parsedResponse.parameters;

  // Validate tool execution prerequisites
  if (!toolName) {
    console.warn('Tool execution skipped: No tool name provided');
    return {};
  }

  if (!toolParams) {
    console.warn(`Tool execution skipped: No parameters provided for tool ${toolName}`);
    return {};
  }

  const executionStartTime = Date.now();
  
  try {
    console.info(`Executing tool: ${toolName}`, {
      tool: toolName,
      params: toolParams,
      timestamp: new Date().toISOString()
    });

    let result;
    switch (toolName) {
      case 'createTask':
        result = executeCreateTask(toolParams);
        break;
      case 'updateTask':
        result = executeUpdateTask(toolParams);
        break;
      case 'createReminder':
        result = executeCreateReminder(toolParams);
        break;
      case 'updateReminder':
        result = executeUpdateReminder(toolParams);
        break;
      case 'trackExpenses':
        result = executeTrackExpenses(toolParams);
        break;
      case 'createGoal':
        result = executeCreateGoal(toolParams);
        break;
      case 'updateGoal':
        result = executeUpdateGoal(toolParams);
        break;
      case 'createJournalEntry':
        result = executeCreateJournalEntry(toolParams);
        break;
      case 'generalChat':
        result = executeGeneralChat(toolParams);
        break;
      default:
        const unknownToolError = new Error(`Unknown tool: ${toolName}`);
        unknownToolError.code = 'UNKNOWN_TOOL';
        throw unknownToolError;
    }

    // Log successful execution
    const executionDuration = Date.now() - executionStartTime;
    console.info(`Tool executed successfully: ${toolName}`, {
      tool: toolName,
      duration: executionDuration,
      timestamp: new Date().toISOString()
    });

    return result;

  } catch (error) {
    const executionDuration = Date.now() - executionStartTime;
    
    // Create structured error response
    const errorResponse = createToolErrorResponse(toolName, error, toolParams);
    
    console.error(`Tool execution failed: ${toolName}`, {
      tool: toolName,
      error: error.message,
      code: error.code,
      duration: executionDuration,
      params: toolParams,
      timestamp: new Date().toISOString()
    });

    return {
      errorDetails: errorResponse
    };
  }
}

// Tool execution functions with comprehensive error handling
function executeCreateTask(params) {
  try {
    // Validate required parameters
    if (!params.description || typeof params.description !== 'string') {
      const error = new Error('Task description is required and must be a string');
      error.code = 'INVALID_PARAMETERS';
      throw error;
    }

    // Generate UUID with error handling
    const taskId = generateUUID();
    
    // Validate generated UUID
    if (!isValidUUID(taskId)) {
      const error = new Error('Generated task ID is invalid');
      error.code = 'INVALID_TASK_ID';
      throw error;
    }

    const result = {
      actionMetadata: {
        tool: 'createTask',
        description: params.description.trim(),
        priority: params.priority || 'medium',
        due_date: params.dueDate,
        task_id: taskId,
      },
      contextItemId: taskId,
      contextItemType: 'task',
      updatedItemType: 'task',
      actionIcon: 'task',
    };

    console.info('Task creation metadata generated:', {
      taskId,
      description: params.description.trim(),
      priority: params.priority || 'medium',
      timestamp: new Date().toISOString()
    });

    return result;
  } catch (error) {
    // Re-throw with additional context
    error.tool = 'createTask';
    error.params = params;
    throw error;
  }
}

function executeUpdateTask(params) {
  try {
    // Validate required parameters
    const taskId = params.taskId || params.id;
    if (!taskId || typeof taskId !== 'string') {
      const error = new Error('Task ID is required for updates');
      error.code = 'MISSING_TASK_ID';
      throw error;
    }

    // Validate task ID format
    if (!isValidUUID(taskId)) {
      const error = new Error('Invalid task ID format');
      error.code = 'INVALID_TASK_ID_FORMAT';
      throw error;
    }

    const updates = params.updates || params;
    if (!updates || typeof updates !== 'object') {
      const error = new Error('Update data is required');
      error.code = 'MISSING_UPDATE_DATA';
      throw error;
    }

    const result = {
      actionMetadata: {
        tool: 'updateTask',
        task_id: taskId,
        updates: updates,
      },
      contextItemId: taskId,
      contextItemType: 'task',
      updatedItemType: 'task',
      actionIcon: 'edit',
    };

    console.info('Task update metadata generated:', {
      taskId,
      updates,
      timestamp: new Date().toISOString()
    });

    return result;
  } catch (error) {
    error.tool = 'updateTask';
    error.params = params;
    throw error;
  }
}

function executeCreateReminder(params) {
  try {
    // Validate required parameters
    if (!params.title || typeof params.title !== 'string') {
      const error = new Error('Reminder title is required and must be a string');
      error.code = 'INVALID_PARAMETERS';
      throw error;
    }

    // Validate scheduled time if provided
    if (params.scheduledTime) {
      const scheduledDate = new Date(params.scheduledTime);
      if (isNaN(scheduledDate.getTime())) {
        const error = new Error('Invalid scheduled time format');
        error.code = 'INVALID_SCHEDULED_TIME';
        throw error;
      }
    }

    // Generate UUID with error handling
    const reminderId = generateUUID();
    
    // Validate generated UUID
    if (!isValidUUID(reminderId)) {
      const error = new Error('Generated reminder ID is invalid');
      error.code = 'INVALID_REMINDER_ID';
      throw error;
    }

    const result = {
      actionMetadata: {
        tool: 'createReminder',
        title: params.title.trim(),
        description: params.description ? params.description.trim() : null,
        scheduled_time: params.scheduledTime,
        reminder_id: reminderId,
      },
      contextItemId: reminderId,
      contextItemType: 'reminder',
      updatedItemType: 'reminder',
      actionIcon: 'notifications',
    };

    console.info('Reminder creation metadata generated:', {
      reminderId,
      title: params.title.trim(),
      scheduledTime: params.scheduledTime,
      timestamp: new Date().toISOString()
    });

    return result;
  } catch (error) {
    error.tool = 'createReminder';
    error.params = params;
    throw error;
  }
}

function executeUpdateReminder(params) {
  try {
    // Validate required parameters
    const reminderId = params.reminderId || params.id;
    if (!reminderId || typeof reminderId !== 'string') {
      const error = new Error('Reminder ID is required for updates');
      error.code = 'MISSING_REMINDER_ID';
      throw error;
    }

    // Validate reminder ID format
    if (!isValidUUID(reminderId)) {
      const error = new Error('Invalid reminder ID format');
      error.code = 'INVALID_REMINDER_ID_FORMAT';
      throw error;
    }

    const updates = params.updates || params;
    if (!updates || typeof updates !== 'object') {
      const error = new Error('Update data is required');
      error.code = 'MISSING_UPDATE_DATA';
      throw error;
    }

    // Validate scheduled time in updates if provided
    if (updates.scheduledTime) {
      const scheduledDate = new Date(updates.scheduledTime);
      if (isNaN(scheduledDate.getTime())) {
        const error = new Error('Invalid scheduled time format in updates');
        error.code = 'INVALID_SCHEDULED_TIME';
        throw error;
      }
    }

    const result = {
      actionMetadata: {
        tool: 'updateReminder',
        reminder_id: reminderId,
        updates: updates,
      },
      contextItemId: reminderId,
      contextItemType: 'reminder',
      updatedItemType: 'reminder',
      actionIcon: 'edit',
    };

    console.info('Reminder update metadata generated:', {
      reminderId,
      updates,
      timestamp: new Date().toISOString()
    });

    return result;
  } catch (error) {
    error.tool = 'updateReminder';
    error.params = params;
    throw error;
  }
}

function executeTrackExpenses(params) {
  try {
    // Normalize expenses to array
    const expenses = Array.isArray(params.expenses) ? params.expenses : [params];
    
    if (expenses.length === 0) {
      const error = new Error('At least one expense is required');
      error.code = 'NO_EXPENSES_PROVIDED';
      throw error;
    }

    // Validate each expense
    const validatedExpenses = [];
    const expenseIds = [];

    for (let i = 0; i < expenses.length; i++) {
      const expense = expenses[i];
      
      // Validate required fields
      if (!expense.item || typeof expense.item !== 'string') {
        const error = new Error(`Expense ${i + 1}: Item name is required and must be a string`);
        error.code = 'INVALID_EXPENSE_ITEM';
        throw error;
      }

      if (!expense.amount || typeof expense.amount !== 'number' || expense.amount <= 0) {
        const error = new Error(`Expense ${i + 1}: Amount must be a positive number`);
        error.code = 'INVALID_EXPENSE_AMOUNT';
        throw error;
      }

      // Generate UUID for each expense
      const expenseId = generateUUID();
      
      // Validate generated UUID
      if (!isValidUUID(expenseId)) {
        const error = new Error(`Generated expense ID ${i + 1} is invalid`);
        error.code = 'INVALID_EXPENSE_ID';
        throw error;
      }

      expenseIds.push(expenseId);
      validatedExpenses.push({
        ...expense,
        item: expense.item.trim(),
        expense_id: expenseId,
      });
    }

    const totalAmount = validatedExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    const result = {
      actionMetadata: {
        tool: 'trackExpenses',
        expenses: validatedExpenses,
        total_amount: totalAmount,
      },
      multipleActions: validatedExpenses.map((expense) => ({
        type: 'expense',
        id: expense.expense_id,
        data: expense,
      })),
      updatedItemType: 'expense',
      actionIcon: 'receipt',
    };

    console.info('Expense tracking metadata generated:', {
      expenseCount: validatedExpenses.length,
      totalAmount,
      expenseIds,
      timestamp: new Date().toISOString()
    });

    return result;
  } catch (error) {
    error.tool = 'trackExpenses';
    error.params = params;
    throw error;
  }
}

function executeCreateGoal(params) {
  try {
    // Validate required parameters
    if (!params.title || typeof params.title !== 'string') {
      const error = new Error('Goal title is required and must be a string');
      error.code = 'INVALID_PARAMETERS';
      throw error;
    }

    // Validate target if provided
    if (params.target !== undefined && (typeof params.target !== 'number' || params.target <= 0)) {
      const error = new Error('Goal target must be a positive number');
      error.code = 'INVALID_GOAL_TARGET';
      throw error;
    }

    // Validate progress if provided
    if (params.progress !== undefined && (typeof params.progress !== 'number' || params.progress < 0)) {
      const error = new Error('Goal progress must be a non-negative number');
      error.code = 'INVALID_GOAL_PROGRESS';
      throw error;
    }

    // Generate UUID with error handling
    const goalId = generateUUID();
    
    // Validate generated UUID
    if (!isValidUUID(goalId)) {
      const error = new Error('Generated goal ID is invalid');
      error.code = 'INVALID_GOAL_ID';
      throw error;
    }

    const result = {
      actionMetadata: {
        tool: 'createGoal',
        title: params.title.trim(),
        description: params.description ? params.description.trim() : null,
        target: params.target,
        progress: params.progress || 0,
        goal_id: goalId,
      },
      contextItemId: goalId,
      contextItemType: 'goal',
      updatedItemType: 'goal',
      actionIcon: 'flag',
    };

    console.info('Goal creation metadata generated:', {
      goalId,
      title: params.title.trim(),
      target: params.target,
      progress: params.progress || 0,
      timestamp: new Date().toISOString()
    });

    return result;
  } catch (error) {
    error.tool = 'createGoal';
    error.params = params;
    throw error;
  }
}

function executeUpdateGoal(params) {
  try {
    // Validate required parameters
    const goalId = params.goalId || params.id;
    if (!goalId || typeof goalId !== 'string') {
      const error = new Error('Goal ID is required for updates');
      error.code = 'MISSING_GOAL_ID';
      throw error;
    }

    // Validate goal ID format
    if (!isValidUUID(goalId)) {
      const error = new Error('Invalid goal ID format');
      error.code = 'INVALID_GOAL_ID_FORMAT';
      throw error;
    }

    const updates = params.updates || params;
    if (!updates || typeof updates !== 'object') {
      const error = new Error('Update data is required');
      error.code = 'MISSING_UPDATE_DATA';
      throw error;
    }

    // Validate target in updates if provided
    if (updates.target !== undefined && (typeof updates.target !== 'number' || updates.target <= 0)) {
      const error = new Error('Goal target must be a positive number');
      error.code = 'INVALID_GOAL_TARGET';
      throw error;
    }

    // Validate progress in updates if provided
    if (updates.progress !== undefined && (typeof updates.progress !== 'number' || updates.progress < 0)) {
      const error = new Error('Goal progress must be a non-negative number');
      error.code = 'INVALID_GOAL_PROGRESS';
      throw error;
    }

    const result = {
      actionMetadata: {
        tool: 'updateGoal',
        goal_id: goalId,
        updates: updates,
      },
      contextItemId: goalId,
      contextItemType: 'goal',
      updatedItemType: 'goal',
      actionIcon: 'edit',
    };

    console.info('Goal update metadata generated:', {
      goalId,
      updates,
      timestamp: new Date().toISOString()
    });

    return result;
  } catch (error) {
    error.tool = 'updateGoal';
    error.params = params;
    throw error;
  }
}

function executeCreateJournalEntry(params) {
  try {
    // Validate required parameters
    if (!params.content || typeof params.content !== 'string') {
      const error = new Error('Journal entry content is required and must be a string');
      error.code = 'INVALID_PARAMETERS';
      throw error;
    }

    // Validate mood if provided
    if (params.mood && typeof params.mood !== 'string') {
      const error = new Error('Journal entry mood must be a string');
      error.code = 'INVALID_MOOD_FORMAT';
      throw error;
    }

    // Generate UUID with error handling
    const entryId = generateUUID();
    
    // Validate generated UUID
    if (!isValidUUID(entryId)) {
      const error = new Error('Generated journal entry ID is invalid');
      error.code = 'INVALID_ENTRY_ID';
      throw error;
    }

    const result = {
      actionMetadata: {
        tool: 'createJournalEntry',
        content: params.content.trim(),
        mood: params.mood ? params.mood.trim() : null,
        entry_id: entryId,
      },
      contextItemId: entryId,
      contextItemType: 'journal',
      updatedItemType: 'journal',
      actionIcon: 'book',
    };

    console.info('Journal entry creation metadata generated:', {
      entryId,
      contentLength: params.content.trim().length,
      mood: params.mood,
      timestamp: new Date().toISOString()
    });

    return result;
  } catch (error) {
    error.tool = 'createJournalEntry';
    error.params = params;
    throw error;
  }
}

function executeGeneralChat(params) {
  try {
    // Validate parameters (general chat is more flexible)
    const tone = params.tone || 'neutral';
    const response = params.response || '';

    const result = {
      actionMetadata: {
        tool: 'generalChat',
        tone: tone,
        response: response,
      },
      actionIcon: 'chat',
    };

    console.info('General chat metadata generated:', {
      tone,
      responseLength: response.length,
      timestamp: new Date().toISOString()
    });

    return result;
  } catch (error) {
    error.tool = 'generalChat';
    error.params = params;
    throw error;
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Reva AI Agent Backend listening on port ${PORT}`);
}); 