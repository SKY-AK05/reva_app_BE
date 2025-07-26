const {
  testUuidGeneration,
  validateUuidFormat,
  stressTestUuidGeneration,
  createUuidTestSuite,
  runComprehensiveTest,
  monitorUuidGeneration,
} = require('./debug/uuid_debug_tools');

/**
 * Test script for UUID debug tools
 * Run with: node test_uuid_debug.js
 */

async function runAllTests() {
  console.log('🚀 Starting UUID Debug Tools Test Suite');
  console.log('=' .repeat(50));

  try {
    // Test 1: Basic UUID Generation
    console.log('\n📋 Test 1: Basic UUID Generation');
    const basicTest = testUuidGeneration(10);
    console.log(`Generated ${basicTest.generatedUuids.length} UUIDs`);
    console.log(`Uniqueness: ${basicTest.uniquenessTest.hasDuplicates ? 'FAILED' : 'PASSED'}`);
    console.log(`Average generation time: ${basicTest.performanceMetrics.averageGenerationTime.toFixed(2)}μs`);

    // Test 2: UUID Validation
    console.log('\n🔍 Test 2: UUID Validation');
    const testSuite = createUuidTestSuite();
    
    console.log('Testing valid UUIDs:');
    testSuite.validUuids.forEach(uuid => {
      const result = validateUuidFormat(uuid);
      console.log(`  ${uuid}: ${result.isValid ? '✅' : '❌'}`);
    });

    console.log('Testing invalid UUIDs:');
    testSuite.invalidUuids.forEach(uuid => {
      const result = validateUuidFormat(uuid);
      console.log(`  ${uuid}: ${result.isValid ? '❌ (should be invalid)' : '✅'}`);
    });

    // Test 3: Stress Test
    console.log('\n💪 Test 3: Stress Test');
    const stressTest = stressTestUuidGeneration(3, 100);
    console.log(`Generated ${stressTest.totalUuidsGenerated} UUIDs across ${stressTest.iterations} iterations`);
    console.log(`Global uniqueness rate: ${(stressTest.overallMetrics.globalUniquenessRate * 100).toFixed(2)}%`);
    console.log(`Error rate: ${(stressTest.overallMetrics.errorRate * 100).toFixed(4)}%`);

    // Test 4: Comprehensive Test
    console.log('\n🎯 Test 4: Comprehensive Test');
    const comprehensiveTest = runComprehensiveTest();
    console.log(`Overall health: ${comprehensiveTest.summary.overallHealth}`);
    console.log(`Validation accuracy: ${(comprehensiveTest.summary.validationTest.validationAccuracy * 100).toFixed(2)}%`);

    // Test 5: Real-time Monitoring (short duration for testing)
    console.log('\n⏱️  Test 5: Real-time Monitoring (10 seconds)');
    const monitoringResult = await monitorUuidGeneration(10, 1000);
    console.log(`Monitored for ${monitoringResult.duration} seconds`);
    console.log(`Total samples: ${monitoringResult.summary.totalSamples}`);
    console.log(`Total UUIDs generated: ${monitoringResult.summary.totalUuidsGenerated}`);
    console.log(`Average generation time: ${monitoringResult.summary.averageGenerationTime.toFixed(2)}μs`);

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run specific test based on command line argument
const testType = process.argv[2];

switch (testType) {
  case 'basic':
    console.log('Running basic UUID generation test...');
    const basicResult = testUuidGeneration(100);
    console.log(JSON.stringify(basicResult, null, 2));
    break;

  case 'validate':
    console.log('Running UUID validation test...');
    const testSuite = createUuidTestSuite();
    testSuite.validUuids.concat(testSuite.invalidUuids).forEach(uuid => {
      const result = validateUuidFormat(uuid);
      console.log(`${uuid}: ${result.isValid ? 'VALID' : 'INVALID'} - ${result.errors.join(', ')}`);
    });
    break;

  case 'stress':
    console.log('Running stress test...');
    const stressResult = stressTestUuidGeneration(5, 1000);
    console.log(JSON.stringify(stressResult, null, 2));
    break;

  case 'comprehensive':
    console.log('Running comprehensive test...');
    const comprehensiveResult = runComprehensiveTest();
    console.log(JSON.stringify(comprehensiveResult, null, 2));
    break;

  case 'monitor':
    console.log('Running monitoring test for 30 seconds...');
    monitorUuidGeneration(30, 2000).then(result => {
      console.log(JSON.stringify(result, null, 2));
    });
    break;

  default:
    console.log('Running all tests...');
    runAllTests();
}