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

// Test Suite for UUID Generation
function runUUIDTests() {
  console.log('🧪 Starting UUID Generation Tests...\n');
  
  let passedTests = 0;
  let totalTests = 0;
  
  // Test 1: UUID Format Validation
  totalTests++;
  console.log('Test 1: UUID Format Validation');
  try {
    const uuid = generateUUID();
    const isValid = isValidUUID(uuid);
    
    if (isValid) {
      console.log(`✅ PASS - Generated UUID: ${uuid}`);
      console.log(`   Format matches UUID v4 pattern`);
      passedTests++;
    } else {
      console.log(`❌ FAIL - Invalid UUID format: ${uuid}`);
    }
  } catch (error) {
    console.log(`❌ FAIL - Error generating UUID: ${error.message}`);
  }
  console.log('');
  
  // Test 2: UUID Uniqueness
  totalTests++;
  console.log('Test 2: UUID Uniqueness (1000 generations)');
  try {
    const uuids = new Set();
    const numGenerations = 1000;
    
    for (let i = 0; i < numGenerations; i++) {
      const uuid = generateUUID();
      if (uuids.has(uuid)) {
        console.log(`❌ FAIL - Duplicate UUID found: ${uuid}`);
        return;
      }
      uuids.add(uuid);
    }
    
    console.log(`✅ PASS - Generated ${numGenerations} unique UUIDs`);
    console.log(`   Sample UUIDs:`);
    const samples = Array.from(uuids).slice(0, 5);
    samples.forEach((uuid, index) => {
      console.log(`   ${index + 1}. ${uuid}`);
    });
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL - Error in uniqueness test: ${error.message}`);
  }
  console.log('');
  
  // Test 3: UUID v4 Version Bit Validation
  totalTests++;
  console.log('Test 3: UUID v4 Version Bit Validation');
  try {
    const uuid = generateUUID();
    const versionChar = uuid.charAt(14); // 13th position (0-indexed) should be '4'
    
    if (versionChar === '4') {
      console.log(`✅ PASS - UUID version bit is correct: ${uuid}`);
      console.log(`   Version character at position 14: '${versionChar}'`);
      passedTests++;
    } else {
      console.log(`❌ FAIL - UUID version bit incorrect: ${uuid}`);
      console.log(`   Expected '4', got '${versionChar}'`);
    }
  } catch (error) {
    console.log(`❌ FAIL - Error in version bit test: ${error.message}`);
  }
  console.log('');
  
  // Test 4: UUID Variant Bit Validation
  totalTests++;
  console.log('Test 4: UUID Variant Bit Validation');
  try {
    const uuid = generateUUID();
    const variantChar = uuid.charAt(19); // 19th position should be 8, 9, a, or b
    const validVariants = ['8', '9', 'a', 'b', 'A', 'B'];
    
    if (validVariants.includes(variantChar)) {
      console.log(`✅ PASS - UUID variant bit is correct: ${uuid}`);
      console.log(`   Variant character at position 19: '${variantChar}'`);
      passedTests++;
    } else {
      console.log(`❌ FAIL - UUID variant bit incorrect: ${uuid}`);
      console.log(`   Expected one of [8,9,a,b], got '${variantChar}'`);
    }
  } catch (error) {
    console.log(`❌ FAIL - Error in variant bit test: ${error.message}`);
  }
  console.log('');
  
  // Test 5: Fallback UUID Generation
  totalTests++;
  console.log('Test 5: Fallback UUID Generation');
  try {
    const fallbackUuid = generateFallbackUUID();
    const isValid = isValidUUID(fallbackUuid);
    
    if (isValid) {
      console.log(`✅ PASS - Fallback UUID is valid: ${fallbackUuid}`);
      passedTests++;
    } else {
      console.log(`❌ FAIL - Fallback UUID is invalid: ${fallbackUuid}`);
    }
  } catch (error) {
    console.log(`❌ FAIL - Error in fallback test: ${error.message}`);
  }
  console.log('');
  
  // Test 6: Error Handling for Invalid Input
  totalTests++;
  console.log('Test 6: UUID Validation Error Handling');
  try {
    const testCases = [
      { input: null, expected: false, description: 'null input' },
      { input: undefined, expected: false, description: 'undefined input' },
      { input: '', expected: false, description: 'empty string' },
      { input: '123', expected: false, description: 'short string' },
      { input: 'not-a-uuid', expected: false, description: 'invalid format' },
      { input: '12345678-1234-1234-1234-123456789012', expected: false, description: 'wrong version' },
    ];
    
    let subTestsPassed = 0;
    testCases.forEach(testCase => {
      const result = isValidUUID(testCase.input);
      if (result === testCase.expected) {
        console.log(`   ✅ ${testCase.description}: ${testCase.input} -> ${result}`);
        subTestsPassed++;
      } else {
        console.log(`   ❌ ${testCase.description}: ${testCase.input} -> ${result} (expected ${testCase.expected})`);
      }
    });
    
    if (subTestsPassed === testCases.length) {
      console.log(`✅ PASS - All validation error handling tests passed (${subTestsPassed}/${testCases.length})`);
      passedTests++;
    } else {
      console.log(`❌ FAIL - Some validation tests failed (${subTestsPassed}/${testCases.length})`);
    }
  } catch (error) {
    console.log(`❌ FAIL - Error in validation test: ${error.message}`);
  }
  console.log('');
  
  // Test Summary
  console.log('📊 Test Summary');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All UUID generation tests passed!');
    return true;
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.');
    return false;
  }
}

// Export functions for use in other modules
module.exports = {
  generateUUID,
  generateFallbackUUID,
  isValidUUID,
  runUUIDTests
};

// Run tests if this file is executed directly
if (require.main === module) {
  runUUIDTests();
}