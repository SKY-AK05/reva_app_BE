const { v4: uuidv4 } = require('uuid');

/**
 * Backend UUID Debug Tools
 * Comprehensive utilities for testing and validating UUID generation
 */

/**
 * Test UUID generation performance and validation
 * @param {number} count - Number of UUIDs to generate
 * @returns {Object} Test results with performance metrics
 */
function testUuidGeneration(count = 1000) {
  const startTime = Date.now();
  const results = {
    testStartTime: new Date().toISOString(),
    requestedCount: count,
    generatedUuids: [],
    validationResults: [],
    uniquenessTest: {},
    performanceMetrics: {},
    errors: [],
  };

  try {
    const generatedUuids = [];
    const generationTimes = [];

    // Generate UUIDs and measure performance
    for (let i = 0; i < count; i++) {
      const genStart = process.hrtime.bigint();
      const uuid = uuidv4();
      const genEnd = process.hrtime.bigint();

      generatedUuids.push(uuid);
      generationTimes.push(Number(genEnd - genStart) / 1000); // Convert to microseconds

      // Validate each UUID
      const validation = validateUuidFormat(uuid);
      results.validationResults.push({
        uuid,
        isValid: validation.isValid,
        details: validation,
        generationTime: Number(genEnd - genStart) / 1000,
      });
    }

    results.generatedUuids = generatedUuids;

    // Test uniqueness
    const uniqueUuids = new Set(generatedUuids);
    results.uniquenessTest = {
      totalGenerated: generatedUuids.length,
      uniqueCount: uniqueUuids.size,
      hasDuplicates: uniqueUuids.size !== generatedUuids.length,
      duplicates: generatedUuids.length - uniqueUuids.size,
    };

    // Performance metrics
    const totalTime = Date.now() - startTime;
    results.performanceMetrics = {
      totalDuration: totalTime,
      averageGenerationTime: generationTimes.reduce((a, b) => a + b, 0) / generationTimes.length,
      minGenerationTime: Math.min(...generationTimes),
      maxGenerationTime: Math.max(...generationTimes),
      uuidsPerSecond: Math.round((count / totalTime) * 1000),
      uuidsPerMicrosecond: count / generationTimes.reduce((a, b) => a + b, 0),
    };

    console.log(`UUID generation test completed: ${count} UUIDs in ${totalTime}ms`);

  } catch (error) {
    results.errors.push(`UUID generation test failed: ${error.message}`);
    console.error('UUID generation test failed:', error);
  }

  return results;
}

/**
 * Validate UUID format according to v4 specification
 * @param {string} uuid - The UUID string to validate
 * @returns {Object} Validation result with detailed analysis
 */
function validateUuidFormat(uuid) {
  const result = {
    uuid,
    isValid: false,
    format: {},
    errors: [],
  };

  try {
    // Basic type and length check
    if (typeof uuid !== 'string') {
      result.errors.push(`Invalid type: ${typeof uuid} (expected string)`);
      return result;
    }

    if (uuid.length !== 36) {
      result.errors.push(`Invalid length: ${uuid.length} (expected 36)`);
      return result;
    }

    // Check hyphen positions
    const expectedHyphens = [8, 13, 18, 23];
    for (let i = 0; i < expectedHyphens.length; i++) {
      if (uuid[expectedHyphens[i]] !== '-') {
        result.errors.push(`Missing hyphen at position ${expectedHyphens[i]}`);
        return result;
      }
    }

    // Split into components
    const parts = uuid.split('-');
    if (parts.length !== 5) {
      result.errors.push(`Invalid number of parts: ${parts.length} (expected 5)`);
      return result;
    }

    // Check part lengths
    const expectedLengths = [8, 4, 4, 4, 12];
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].length !== expectedLengths[i]) {
        result.errors.push(`Part ${i + 1} has invalid length: ${parts[i].length} (expected ${expectedLengths[i]})`);
        return result;
      }
    }

    // Check hex characters
    const hexRegex = /^[0-9a-fA-F]+$/;
    for (let i = 0; i < parts.length; i++) {
      if (!hexRegex.test(parts[i])) {
        result.errors.push(`Part ${i + 1} contains non-hex characters: ${parts[i]}`);
        return result;
      }
    }

    // Check version (should be 4)
    const versionChar = parts[2][0];
    if (versionChar !== '4') {
      result.errors.push(`Invalid version: ${versionChar} (expected 4)`);
      return result;
    }

    // Check variant (first char of 4th part should be 8, 9, a, or b)
    const variantChar = parts[3][0].toLowerCase();
    if (!['8', '9', 'a', 'b'].includes(variantChar)) {
      result.errors.push(`Invalid variant: ${variantChar} (expected 8, 9, a, or b)`);
      return result;
    }

    // If we get here, it's valid
    result.isValid = true;
    result.format = {
      timeLow: parts[0],
      timeMid: parts[1],
      timeHiAndVersion: parts[2],
      clockSeqHiAndReserved: parts[3],
      node: parts[4],
      version: versionChar,
      variant: variantChar,
    };

  } catch (error) {
    result.errors.push(`Validation error: ${error.message}`);
  }

  return result;
}

/**
 * Test UUID generation under stress conditions
 * @param {number} iterations - Number of stress test iterations
 * @param {number} batchSize - Number of UUIDs per batch
 * @returns {Object} Stress test results
 */
function stressTestUuidGeneration(iterations = 10, batchSize = 1000) {
  const results = {
    testStartTime: new Date().toISOString(),
    iterations,
    batchSize,
    totalUuidsGenerated: 0,
    batchResults: [],
    overallMetrics: {},
    errors: [],
  };

  try {
    const allGenerationTimes = [];
    const allUuids = new Set();
    let totalErrors = 0;

    for (let i = 0; i < iterations; i++) {
      const batchStart = Date.now();
      const batchResult = testUuidGeneration(batchSize);
      const batchEnd = Date.now();

      // Collect UUIDs for global uniqueness test
      batchResult.generatedUuids.forEach(uuid => allUuids.add(uuid));

      // Collect generation times
      allGenerationTimes.push(...batchResult.validationResults.map(r => r.generationTime));

      // Track errors
      totalErrors += batchResult.errors.length;

      results.batchResults.push({
        iteration: i + 1,
        batchDuration: batchEnd - batchStart,
        uniquenessInBatch: batchResult.uniquenessTest,
        performanceMetrics: batchResult.performanceMetrics,
        errorCount: batchResult.errors.length,
      });
    }

    results.totalUuidsGenerated = iterations * batchSize;

    // Overall metrics
    results.overallMetrics = {
      totalUnique: allUuids.size,
      globalUniquenessRate: allUuids.size / results.totalUuidsGenerated,
      averageGenerationTime: allGenerationTimes.reduce((a, b) => a + b, 0) / allGenerationTimes.length,
      minGenerationTime: Math.min(...allGenerationTimes),
      maxGenerationTime: Math.max(...allGenerationTimes),
      totalErrors: totalErrors,
      errorRate: totalErrors / results.totalUuidsGenerated,
    };

    console.log(`Stress test completed: ${results.totalUuidsGenerated} UUIDs across ${iterations} iterations`);

  } catch (error) {
    results.errors.push(`Stress test failed: ${error.message}`);
    console.error('UUID stress test failed:', error);
  }

  return results;
}

/**
 * Create comprehensive test suite with known good and bad UUIDs
 * @returns {Object} Test suite data
 */
function createUuidTestSuite() {
  return {
    validUuids: [
      'a1b2c3d4-e5f6-4789-a012-b3c4d5e6f789',
      '12345678-1234-4567-8901-123456789012',
      'ffffffff-ffff-4fff-bfff-ffffffffffff',
      '00000000-0000-4000-8000-000000000000',
      '550e8400-e29b-41d4-a716-446655440000',
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
      '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
    ],
    invalidUuids: [
      '1753374370671', // Old timestamp format
      'not-a-uuid',
      'a1b2c3d4-e5f6-3789-a012-b3c4d5e6f789', // Wrong version (3 instead of 4)
      'a1b2c3d4-e5f6-4789-7012-b3c4d5e6f789', // Wrong variant (7 instead of 8-b)
      'a1b2c3d4-e5f6-4789-a012-b3c4d5e6f78', // Too short
      'a1b2c3d4-e5f6-4789-a012-b3c4d5e6f7890', // Too long
      'a1b2c3d4e5f6-4789-a012-b3c4d5e6f789', // Missing hyphen
      'g1b2c3d4-e5f6-4789-a012-b3c4d5e6f789', // Invalid hex character
      'a1b2c3d4-e5f6-4789-a012-b3c4d5e6f789-extra', // Extra characters
      '', // Empty string
      null, // Null value
      undefined, // Undefined value
      123456789, // Number instead of string
    ],
    testFunctions: {
      validateFormat: 'validateUuidFormat',
      testGeneration: 'testUuidGeneration',
      stressTest: 'stressTestUuidGeneration',
    },
  };
}

/**
 * Run comprehensive UUID test suite
 * @returns {Object} Complete test results
 */
function runComprehensiveTest() {
  const results = {
    testStartTime: new Date().toISOString(),
    generationTests: {},
    validationTests: {},
    stressTests: {},
    summary: {},
  };

  try {
    console.log('Starting comprehensive UUID test suite...');

    // Run generation tests
    console.log('Running generation tests...');
    results.generationTests = testUuidGeneration(100);

    // Run validation tests
    console.log('Running validation tests...');
    const testSuite = createUuidTestSuite();
    const validationResults = {
      validUuidTests: [],
      invalidUuidTests: [],
    };

    testSuite.validUuids.forEach(uuid => {
      validationResults.validUuidTests.push(validateUuidFormat(uuid));
    });

    testSuite.invalidUuids.forEach(uuid => {
      validationResults.invalidUuidTests.push(validateUuidFormat(uuid));
    });

    results.validationTests = validationResults;

    // Run stress tests
    console.log('Running stress tests...');
    results.stressTests = stressTestUuidGeneration(5, 500);

    // Generate summary
    const validUuidsCorrect = validationResults.validUuidTests.filter(test => test.isValid).length;
    const invalidUuidsRejected = validationResults.invalidUuidTests.filter(test => !test.isValid).length;

    results.summary = {
      testCompletedAt: new Date().toISOString(),
      generationTest: {
        tested: true,
        uniqueness: results.generationTests.uniquenessTest,
        performance: results.generationTests.performanceMetrics,
      },
      validationTest: {
        validUuidsTestedCorrectly: validUuidsCorrect,
        totalValidUuids: testSuite.validUuids.length,
        invalidUuidsRejectedCorrectly: invalidUuidsRejected,
        totalInvalidUuids: testSuite.invalidUuids.length,
        validationAccuracy: (validUuidsCorrect + invalidUuidsRejected) / (testSuite.validUuids.length + testSuite.invalidUuids.length),
      },
      stressTest: {
        tested: true,
        totalGenerated: results.stressTests.totalUuidsGenerated,
        globalUniqueness: results.stressTests.overallMetrics.globalUniquenessRate,
        errorRate: results.stressTests.overallMetrics.errorRate,
      },
      overallHealth: calculateOverallHealth(results),
    };

    console.log('Comprehensive UUID test completed successfully');

  } catch (error) {
    results.error = `Comprehensive test failed: ${error.message}`;
    console.error('Comprehensive UUID test failed:', error);
  }

  return results;
}

/**
 * Calculate overall health score based on test results
 * @param {Object} results - Test results
 * @returns {string} Health status
 */
function calculateOverallHealth(results) {
  try {
    const generationHealthy = results.generationTests.uniquenessTest.hasDuplicates === false;
    const validationHealthy = results.validationTests.validUuidTests.every(test => test.isValid) &&
                             results.validationTests.invalidUuidTests.every(test => !test.isValid);
    const stressHealthy = results.stressTests.overallMetrics.globalUniquenessRate > 0.99 &&
                         results.stressTests.overallMetrics.errorRate < 0.01;

    if (generationHealthy && validationHealthy && stressHealthy) {
      return 'HEALTHY';
    } else if (generationHealthy && validationHealthy) {
      return 'DEGRADED';
    } else {
      return 'UNHEALTHY';
    }
  } catch (error) {
    return 'UNKNOWN';
  }
}

/**
 * Monitor UUID generation in real-time
 * @param {number} duration - Duration in seconds
 * @param {number} interval - Interval in milliseconds
 * @returns {Object} Monitoring results
 */
function monitorUuidGeneration(duration = 60, interval = 1000) {
  return new Promise((resolve) => {
    const results = {
      monitoringStartTime: new Date().toISOString(),
      duration,
      interval,
      samples: [],
      summary: {},
    };

    const startTime = Date.now();
    const endTime = startTime + (duration * 1000);

    const monitor = setInterval(() => {
      const currentTime = Date.now();
      
      if (currentTime >= endTime) {
        clearInterval(monitor);
        
        // Calculate summary
        const allGenerationTimes = results.samples.flatMap(sample => sample.generationTimes);
        results.summary = {
          totalSamples: results.samples.length,
          totalUuidsGenerated: results.samples.reduce((sum, sample) => sum + sample.count, 0),
          averageGenerationTime: allGenerationTimes.reduce((a, b) => a + b, 0) / allGenerationTimes.length,
          minGenerationTime: Math.min(...allGenerationTimes),
          maxGenerationTime: Math.max(...allGenerationTimes),
          monitoringCompletedAt: new Date().toISOString(),
        };
        
        resolve(results);
        return;
      }

      // Generate sample batch
      const sampleSize = 10;
      const sampleStart = process.hrtime.bigint();
      const sample = {
        timestamp: new Date().toISOString(),
        count: sampleSize,
        generationTimes: [],
        allValid: true,
      };

      for (let i = 0; i < sampleSize; i++) {
        const genStart = process.hrtime.bigint();
        const uuid = uuidv4();
        const genEnd = process.hrtime.bigint();
        
        sample.generationTimes.push(Number(genEnd - genStart) / 1000);
        
        if (!validateUuidFormat(uuid).isValid) {
          sample.allValid = false;
        }
      }

      const sampleEnd = process.hrtime.bigint();
      sample.totalSampleTime = Number(sampleEnd - sampleStart) / 1000;
      
      results.samples.push(sample);
    }, interval);
  });
}

module.exports = {
  testUuidGeneration,
  validateUuidFormat,
  stressTestUuidGeneration,
  createUuidTestSuite,
  runComprehensiveTest,
  monitorUuidGeneration,
  calculateOverallHealth,
};