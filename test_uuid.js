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

// Test UUID generation
console.log('Testing UUID Generation...\n');

// Test 1: Generate multiple UUIDs and verify format
console.log('Test 1: UUID Format Validation');
const testUUIDs = [];
for (let i = 0; i < 5; i++) {
  const uuid = generateUUID();
  testUUIDs.push(uuid);
  console.log(`UUID ${i + 1}: ${uuid} - Valid: ${isValidUUID(uuid)}`);
}

// Test 2: Verify uniqueness
console.log('\nTest 2: UUID Uniqueness');
const uniqueUUIDs = new Set(testUUIDs);
console.log(`Generated ${testUUIDs.length} UUIDs, ${uniqueUUIDs.size} unique - Uniqueness: ${testUUIDs.length === uniqueUUIDs.size ? 'PASS' : 'FAIL'}`);

// Test 3: Test fallback function
console.log('\nTest 3: Fallback UUID Generation');
const fallbackUUID = generateFallbackUUID();
console.log(`Fallback UUID: ${fallbackUUID} - Valid: ${isValidUUID(fallbackUUID)}`);

// Test 4: Performance test
console.log('\nTest 4: Performance Test');
const startTime = Date.now();
const performanceUUIDs = [];
for (let i = 0; i < 1000; i++) {
  performanceUUIDs.push(generateUUID());
}
const endTime = Date.now();
console.log(`Generated 1000 UUIDs in ${endTime - startTime}ms`);

// Test 5: Validate all generated UUIDs
console.log('\nTest 5: Batch Validation');
const allValid = performanceUUIDs.every(uuid => isValidUUID(uuid));
const allUnique = new Set(performanceUUIDs).size === performanceUUIDs.length;
console.log(`All 1000 UUIDs valid: ${allValid ? 'PASS' : 'FAIL'}`);
console.log(`All 1000 UUIDs unique: ${allUnique ? 'PASS' : 'FAIL'}`);

console.log('\nUUID Generation Tests Complete!');