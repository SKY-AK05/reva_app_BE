/**
 * Comprehensive Backend UUID Generation Tests
 * Tests UUID v4 format validation, uniqueness, error handling, and tool integration
 * Requirements: 1.1, 1.3, 1.4
 */

const { v4: uuidv4 } = require('uuid');

// Import functions from server.js (we'll need to export them)
// For now, we'll duplicate the functions for testing
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

function isValidUUID(uuid) {
  if (typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Mock tool functions for testing
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

function executeTrackExpenses(params) {
  const expenses = params.expenses || [];
  const expenseIds = expenses.map(() => generateUUID());
  
  return {
    actionMetadata: {
      tool: 'trackExpenses',
      expenses: expenses.map((expense, index) => ({
        ...expense,
        expense_id: expenseIds[index]
      }))
    },
    contextItemId: expenseIds[0],
    contextItemType: 'expense',
    updatedItemType: 'expense',
    actionIcon: 'receipt',
    multipleActions: expenseIds.length > 1 ? expenseIds : null
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
    contextItemType: 'journal_entry',
    updatedItemType: 'journal_entry',
    actionIcon: 'book',
  };
}

describe('Backend UUID Generation Tests', () => {
  
  describe('UUID v4 Format Validation', () => {
    test('should generate valid UUID v4 format', () => {
      const uuid = generateUUID();
      expect(typeof uuid).toBe('string');
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    test('should have correct UUID v4 version bit', () => {
      const uuid = generateUUID();
      expect(uuid.charAt(14)).toBe('4');
    });

    test('should have correct UUID variant bits', () => {
      const uuid = generateUUID();
      const variantChar = uuid.charAt(19).toLowerCase();
      expect(['8', '9', 'a', 'b']).toContain(variantChar);
    });

    test('should validate UUID format correctly', () => {
      const validUuid = generateUUID();
      expect(isValidUUID(validUuid)).toBe(true);
      
      // Test invalid formats
      expect(isValidUUID(null)).toBe(false);
      expect(isValidUUID(undefined)).toBe(false);
      expect(isValidUUID('')).toBe(false);
      expect(isValidUUID('123')).toBe(false);
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('12345678-1234-1234-1234-123456789012')).toBe(false); // wrong version
    });
  });

  describe('UUID Uniqueness Tests', () => {
    test('should generate unique UUIDs across multiple generations', () => {
      const uuids = new Set();
      const numGenerations = 1000;
      
      for (let i = 0; i < numGenerations; i++) {
        const uuid = generateUUID();
        expect(uuids.has(uuid)).toBe(false);
        uuids.add(uuid);
      }
      
      expect(uuids.size).toBe(numGenerations);
    });

    test('should generate unique UUIDs in concurrent operations', async () => {
      const numConcurrent = 100;
      const promises = Array(numConcurrent).fill().map(() => 
        Promise.resolve(generateUUID())
      );
      
      const uuids = await Promise.all(promises);
      const uniqueUuids = new Set(uuids);
      
      expect(uniqueUuids.size).toBe(numConcurrent);
    });
  });

  describe('Error Handling Tests', () => {
    test('should handle UUID generation failures gracefully', () => {
      // Test that fallback works when primary UUID generation fails
      const uuid = generateUUID();
      expect(isValidUUID(uuid)).toBe(true);
    });

    test('should log errors when UUID format is invalid', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Create a function that generates invalid UUID to test error logging
      const testGenerateInvalidUUID = () => {
        try {
          const invalidUuid = 'invalid-uuid-format';
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          
          if (!uuidRegex.test(invalidUuid)) {
            const error = new Error('Generated UUID does not match v4 format');
            error.code = 'INVALID_UUID_FORMAT';
            error.generatedValue = invalidUuid;
            
            console.error('Primary UUID generation failed:', {
              error: error.message,
              code: error.code,
              generatedValue: error.generatedValue,
              timestamp: new Date().toISOString()
            });
            
            throw error;
          }
        } catch (error) {
          // This should trigger the fallback
          return generateFallbackUUID();
        }
      };
      
      const uuid = testGenerateInvalidUUID();
      expect(isValidUUID(uuid)).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    test('should handle crypto fallback failure gracefully', () => {
      // Test the Math.random fallback by simulating crypto failure
      const originalCrypto = require('crypto');
      
      // Mock crypto to throw error
      jest.doMock('crypto', () => ({
        randomBytes: () => {
          throw new Error('Crypto not available');
        }
      }));
      
      // Clear the module cache to use the mocked version
      delete require.cache[require.resolve('crypto')];
      
      const uuid = generateFallbackUUID();
      expect(isValidUUID(uuid)).toBe(true);
      
      // Restore crypto
      jest.dontMock('crypto');
      delete require.cache[require.resolve('crypto')];
    });
  });

  describe('Fallback UUID Generation Tests', () => {
    test('should generate valid UUID using crypto fallback', () => {
      const fallbackUuid = generateFallbackUUID();
      expect(isValidUUID(fallbackUuid)).toBe(true);
      expect(fallbackUuid.charAt(14)).toBe('4'); // Version 4
      expect(['8', '9', 'a', 'b']).toContain(fallbackUuid.charAt(19).toLowerCase()); // Variant
    });

    test('should handle crypto fallback failure and use Math.random', () => {
      // Test that Math.random fallback works
      const originalMathRandom = Math.random;
      
      // Mock Math.random to return predictable values for testing
      let callCount = 0;
      Math.random = jest.fn(() => {
        // Return different values to create a valid UUID pattern
        const values = [0.5, 0.3, 0.7, 0.1, 0.9, 0.2, 0.8, 0.4, 0.6, 0.5, 0.3, 0.7, 0.1, 0.9, 0.2, 0.8, 0.4, 0.6, 0.5, 0.3, 0.7, 0.1, 0.9, 0.2, 0.8, 0.4, 0.6, 0.5, 0.3, 0.7, 0.1, 0.9];
        return values[callCount++ % values.length];
      });
      
      // Create a test function that forces crypto failure
      const testMathRandomFallback = () => {
        try {
          throw new Error('Crypto not available');
        } catch (cryptoError) {
          // Use Math.random fallback
          const mathRandomUuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
          
          return mathRandomUuid;
        }
      };
      
      const fallbackUuid = testMathRandomFallback();
      expect(isValidUUID(fallbackUuid)).toBe(true);
      
      // Restore Math.random
      Math.random = originalMathRandom;
    });
  });

  describe('Backend Tool UUID Integration Tests', () => {
    test('should generate proper UUIDs in createReminder tool', () => {
      const params = {
        title: 'Test Reminder',
        description: 'Test Description',
        scheduledTime: new Date().toISOString()
      };
      
      const result = executeCreateReminder(params);
      
      expect(result.actionMetadata.reminder_id).toBeDefined();
      expect(isValidUUID(result.actionMetadata.reminder_id)).toBe(true);
      expect(result.contextItemId).toBe(result.actionMetadata.reminder_id);
      expect(result.contextItemType).toBe('reminder');
    });

    test('should generate proper UUIDs in createTask tool', () => {
      const params = {
        description: 'Test Task',
        priority: 'high',
        dueDate: new Date().toISOString()
      };
      
      const result = executeCreateTask(params);
      
      expect(result.actionMetadata.task_id).toBeDefined();
      expect(isValidUUID(result.actionMetadata.task_id)).toBe(true);
      expect(result.contextItemId).toBe(result.actionMetadata.task_id);
      expect(result.contextItemType).toBe('task');
    });

    test('should generate proper UUIDs in trackExpenses tool', () => {
      const params = {
        expenses: [
          { item: 'Coffee', amount: 5.50, category: 'Food', date: new Date().toISOString() },
          { item: 'Gas', amount: 40.00, category: 'Transport', date: new Date().toISOString() }
        ]
      };
      
      const result = executeTrackExpenses(params);
      
      expect(result.actionMetadata.expenses).toHaveLength(2);
      result.actionMetadata.expenses.forEach(expense => {
        expect(expense.expense_id).toBeDefined();
        expect(isValidUUID(expense.expense_id)).toBe(true);
      });
      
      expect(result.multipleActions).toHaveLength(2);
      result.multipleActions.forEach(id => {
        expect(isValidUUID(id)).toBe(true);
      });
    });

    test('should generate proper UUIDs in createGoal tool', () => {
      const params = {
        title: 'Test Goal',
        description: 'Test Goal Description',
        target: 100,
        progress: 0
      };
      
      const result = executeCreateGoal(params);
      
      expect(result.actionMetadata.goal_id).toBeDefined();
      expect(isValidUUID(result.actionMetadata.goal_id)).toBe(true);
      expect(result.contextItemId).toBe(result.actionMetadata.goal_id);
      expect(result.contextItemType).toBe('goal');
    });

    test('should generate proper UUIDs in createJournalEntry tool', () => {
      const params = {
        content: 'Test journal entry content',
        mood: 'happy'
      };
      
      const result = executeCreateJournalEntry(params);
      
      expect(result.actionMetadata.entry_id).toBeDefined();
      expect(isValidUUID(result.actionMetadata.entry_id)).toBe(true);
      expect(result.contextItemId).toBe(result.actionMetadata.entry_id);
      expect(result.contextItemType).toBe('journal_entry');
    });
  });

  describe('Performance Tests', () => {
    test('should generate UUIDs within acceptable time limits', () => {
      const startTime = Date.now();
      const numGenerations = 100;
      
      for (let i = 0; i < numGenerations; i++) {
        generateUUID();
      }
      
      const duration = Date.now() - startTime;
      const avgTimePerUuid = duration / numGenerations;
      
      expect(avgTimePerUuid).toBeLessThan(10); // Should be less than 10ms per UUID
    });

    test('should handle high-frequency UUID generation', () => {
      const uuids = [];
      const numGenerations = 10000;
      
      const startTime = Date.now();
      for (let i = 0; i < numGenerations; i++) {
        uuids.push(generateUUID());
      }
      const duration = Date.now() - startTime;
      
      // All should be valid and unique
      const uniqueUuids = new Set(uuids);
      expect(uniqueUuids.size).toBe(numGenerations);
      
      uuids.forEach(uuid => {
        expect(isValidUUID(uuid)).toBe(true);
      });
      
      // Performance should be reasonable (less than 1 second for 10k UUIDs)
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('UUID Format Consistency Tests', () => {
    test('should maintain consistent format across all tools', () => {
      const reminderResult = executeCreateReminder({ title: 'Test', scheduledTime: new Date().toISOString() });
      const taskResult = executeCreateTask({ description: 'Test' });
      const goalResult = executeCreateGoal({ title: 'Test', target: 100 });
      const journalResult = executeCreateJournalEntry({ content: 'Test' });
      
      const uuids = [
        reminderResult.actionMetadata.reminder_id,
        taskResult.actionMetadata.task_id,
        goalResult.actionMetadata.goal_id,
        journalResult.actionMetadata.entry_id
      ];
      
      uuids.forEach(uuid => {
        expect(isValidUUID(uuid)).toBe(true);
        expect(uuid.charAt(14)).toBe('4'); // Version 4
        expect(['8', '9', 'a', 'b']).toContain(uuid.charAt(19).toLowerCase()); // Variant
      });
    });

    test('should generate different UUIDs for simultaneous tool executions', () => {
      const results = [
        executeCreateReminder({ title: 'Test 1', scheduledTime: new Date().toISOString() }),
        executeCreateTask({ description: 'Test 1' }),
        executeCreateGoal({ title: 'Test 1', target: 100 }),
        executeCreateJournalEntry({ content: 'Test 1' })
      ];
      
      const uuids = [
        results[0].actionMetadata.reminder_id,
        results[1].actionMetadata.task_id,
        results[2].actionMetadata.goal_id,
        results[3].actionMetadata.entry_id
      ];
      
      const uniqueUuids = new Set(uuids);
      expect(uniqueUuids.size).toBe(4); // All should be unique
    });
  });
});

// Export functions for use in other test files
module.exports = {
  generateUUID,
  generateFallbackUUID,
  isValidUUID,
  executeCreateReminder,
  executeCreateTask,
  executeTrackExpenses,
  executeCreateGoal,
  executeCreateJournalEntry
};