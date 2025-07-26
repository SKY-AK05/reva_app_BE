const { v4: uuidv4 } = require('uuid');

/**
 * Generate a proper UUID v4 format
 * @returns {string} A valid UUID v4 string (e.g., "a1b2c3d4-e5f6-4789-a012-b3c4d5e6f789")
 */
function generateUUID() {
  try {
    const uuid = uuidv4();
    
    // Validate UUID format (UUID v4 regex pattern)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(uuid)) {
      throw new Error('Generated UUID does not match v4 format');
    }
    
    return uuid;
  } catch (error) {
    console.error('UUID generation error:', error);
    // Fallback: generate a manual UUID v4 if library fails
    return generateFallbackUUID();
  }
}

/**
 * Fallback UUID generation using crypto.randomBytes if available, or Math.random
 * @returns {string} A fallback UUID v4 string
 */
function generateFallbackUUID() {
  try {
    const crypto = require('crypto');
    const bytes = crypto.randomBytes(16);
    
    // Set version (4) and variant bits
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
    
    const hex = bytes.toString('hex');
    return [
      hex.substring(0, 8),
      hex.substring(8, 12),
      hex.substring(12, 16),
      hex.substring(16, 20),
      hex.substring(20, 32)
    ].join('-');
  } catch (cryptoError) {
    console.error('Crypto fallback failed, using Math.random fallback:', cryptoError);
    // Last resort: Math.random based UUID (less secure but functional)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
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

// Tool execution functions (updated versions)
function executeCreateTask(params) {
  const taskId = generateUUID();
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

function executeCreateReminder(params) {
  const reminderId = generateUUID();
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

function executeTrackExpenses(params) {
  const expenses = Array.isArray(params.expenses) ? params.expenses : [params];
  const expenseIds = expenses.map(() => generateUUID());

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
  const goalId = generateUUID();
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

function executeCreateJournalEntry(params) {
  const entryId = generateUUID();
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

// Test all tool functions
console.log('Testing Backend Tool Functions with UUID Generation...\n');

// Test 1: Create Task
console.log('Test 1: executeCreateTask');
const taskResult = executeCreateTask({
  description: 'Test task',
  priority: 'high',
  dueDate: '2024-01-15'
});
console.log(`Task ID: ${taskResult.actionMetadata.task_id}`);
console.log(`Valid UUID: ${isValidUUID(taskResult.actionMetadata.task_id)}`);
console.log(`Context ID matches: ${taskResult.contextItemId === taskResult.actionMetadata.task_id}`);

// Test 2: Create Reminder
console.log('\nTest 2: executeCreateReminder');
const reminderResult = executeCreateReminder({
  title: 'Test reminder',
  description: 'Test description',
  scheduledTime: '2024-01-15T10:00:00Z'
});
console.log(`Reminder ID: ${reminderResult.actionMetadata.reminder_id}`);
console.log(`Valid UUID: ${isValidUUID(reminderResult.actionMetadata.reminder_id)}`);
console.log(`Context ID matches: ${reminderResult.contextItemId === reminderResult.actionMetadata.reminder_id}`);

// Test 3: Track Expenses (single)
console.log('\nTest 3: executeTrackExpenses (single expense)');
const singleExpenseResult = executeTrackExpenses({
  item: 'Coffee',
  amount: 5.50,
  category: 'Food',
  date: '2024-01-15'
});
const singleExpenseId = singleExpenseResult.actionMetadata.expenses[0].expense_id;
console.log(`Single Expense ID: ${singleExpenseId}`);
console.log(`Valid UUID: ${isValidUUID(singleExpenseId)}`);

// Test 4: Track Expenses (multiple)
console.log('\nTest 4: executeTrackExpenses (multiple expenses)');
const multipleExpenseResult = executeTrackExpenses({
  expenses: [
    { item: 'Lunch', amount: 12.00, category: 'Food', date: '2024-01-15' },
    { item: 'Gas', amount: 45.00, category: 'Transport', date: '2024-01-15' },
    { item: 'Book', amount: 25.00, category: 'Education', date: '2024-01-15' }
  ]
});
console.log('Multiple Expense IDs:');
multipleExpenseResult.actionMetadata.expenses.forEach((expense, index) => {
  console.log(`  ${index + 1}. ${expense.expense_id} - Valid: ${isValidUUID(expense.expense_id)}`);
});

// Test uniqueness of multiple expense IDs
const expenseIds = multipleExpenseResult.actionMetadata.expenses.map(e => e.expense_id);
const uniqueExpenseIds = new Set(expenseIds);
console.log(`All expense IDs unique: ${expenseIds.length === uniqueExpenseIds.size}`);

// Test 5: Create Goal
console.log('\nTest 5: executeCreateGoal');
const goalResult = executeCreateGoal({
  title: 'Test goal',
  description: 'Test goal description',
  target: 100,
  progress: 25
});
console.log(`Goal ID: ${goalResult.actionMetadata.goal_id}`);
console.log(`Valid UUID: ${isValidUUID(goalResult.actionMetadata.goal_id)}`);
console.log(`Context ID matches: ${goalResult.contextItemId === goalResult.actionMetadata.goal_id}`);

// Test 6: Create Journal Entry
console.log('\nTest 6: executeCreateJournalEntry');
const journalResult = executeCreateJournalEntry({
  content: 'Test journal entry content',
  mood: 'happy'
});
console.log(`Journal Entry ID: ${journalResult.actionMetadata.entry_id}`);
console.log(`Valid UUID: ${isValidUUID(journalResult.actionMetadata.entry_id)}`);
console.log(`Context ID matches: ${journalResult.contextItemId === journalResult.actionMetadata.entry_id}`);

// Test 7: Verify all generated IDs are unique
console.log('\nTest 7: Overall Uniqueness Check');
const allIds = [
  taskResult.actionMetadata.task_id,
  reminderResult.actionMetadata.reminder_id,
  singleExpenseId,
  ...expenseIds,
  goalResult.actionMetadata.goal_id,
  journalResult.actionMetadata.entry_id
];

const uniqueIds = new Set(allIds);
console.log(`Generated ${allIds.length} IDs, ${uniqueIds.size} unique`);
console.log(`All IDs unique: ${allIds.length === uniqueIds.size ? 'PASS' : 'FAIL'}`);

// Test 8: Verify no timestamp-based IDs
console.log('\nTest 8: No Timestamp-based IDs Check');
const hasTimestampPattern = allIds.some(id => /^\d+$/.test(id) || id.includes('-' + Date.now()));
console.log(`No timestamp-based IDs found: ${!hasTimestampPattern ? 'PASS' : 'FAIL'}`);

console.log('\nBackend Tool Functions UUID Tests Complete!');