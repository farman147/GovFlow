import 'dotenv/config';
import { connectDatabase } from '../config/db.js';
import { processAssistantQuery, getProactiveInsights } from '../services/aiAssistantService.js';
import mongoose from 'mongoose';

const runTests = async () => {
  try {
    await connectDatabase();
    console.log('=== Testing AI Civic Assistant Engine ===\n');

    // Test 1: Email query for vehicle registration
    console.log('[TEST 1] Query: "what is the gmail for vehicle registration"');
    const res1 = await processAssistantQuery({ query: 'what is the gmail for vehicle registration' });
    console.log('✔ Result 1 Answer snippet:\n' + res1.answer.slice(0, 200) + '...\n');
    if (!res1.answer.includes('veh.staff@govflow.com')) {
      throw new Error('Test 1 failed: Expected veh.staff@govflow.com in answer');
    }

    // Test 2: Documents query for Driving License Renewal
    console.log('[TEST 2] Query: "what documents do I need for driving license renewal"');
    const res2 = await processAssistantQuery({ query: 'what documents do I need for driving license renewal' });
    console.log('✔ Result 2 Answer snippet:\n' + res2.answer.slice(0, 200) + '...\n');
    if (!res2.answer.toLowerCase().includes('form 9') && !res2.answer.toLowerCase().includes('identity')) {
      throw new Error('Test 2 failed: Expected documents list in answer');
    }

    // Test 3: TFT query for best visit time
    console.log('[TEST 3] Query: "when is the best time to visit RTO based on TFT"');
    const res3 = await processAssistantQuery({ query: 'when is the best time to visit RTO based on TFT' });
    console.log('✔ Result 3 Recommended window: ' + res3.tftForecast?.recommendedVisitWindow + '\n');
    if (!res3.tftForecast) {
      throw new Error('Test 3 failed: Expected tftForecast in response');
    }
    if (res3.tftForecast.lowDemandHour === '5:00 PM') {
      throw new Error('Test 3 failed: lowDemandHour should not recommend 5:00 PM closing time');
    }

    // Test 4: Fee query for Income Certificate
    console.log('[TEST 4] Query: "how much is the fee for income certificate"');
    const res4 = await processAssistantQuery({ query: 'how much is the fee for income certificate' });
    console.log('✔ Result 4 Answer snippet:\n' + res4.answer.slice(0, 200) + '...\n');
    if (!res4.answer.includes('30')) {
      throw new Error('Test 4 failed: Expected fee in answer');
    }

    // Test 5: Driving License query while serviceId is set to Birth Certificate
    console.log('[TEST 5] Query: "driving license" with serviceId set to Birth Certificate ID');
    const birthService = await mongoose.model('GovernmentService').findOne({ code: 'BIRTH' });
    const res5 = await processAssistantQuery({
      query: 'driving license',
      serviceId: birthService?._id
    });
    console.log('✔ Result 5 Matched Service: ' + res5.service?.name + ' (' + res5.service?.code + ')');
    if (res5.service?.code !== 'RTO') {
      throw new Error(`Test 5 failed: Expected RTO (Driving License), but got ${res5.service?.code}`);
    }
    if (!res5.answer.includes('Driving License') || res5.answer.includes('Birth Certificate')) {
      throw new Error('Test 5 failed: Answer contained Birth Certificate instead of Driving License Renewal');
    }

    // Test 6: Query "what documents do i need for driving license"
    console.log('[TEST 6] Query: "what documents do i need for driving license"');
    const res6 = await processAssistantQuery({ query: 'what documents do i need for driving license' });
    console.log('✔ Result 6 Matched Service: ' + res6.service?.name);
    if (res6.service?.code !== 'RTO') {
      throw new Error(`Test 6 failed: Expected RTO, got ${res6.service?.code}`);
    }

    // Test 7: Proactive Insights
    console.log('[TEST 7] Proactive Insights');
    const insights = await getProactiveInsights();
    console.log(`✔ Total active services: ${insights.totalActiveServices}, Summary: ${insights.summary}\n`);

    console.log('🎉 ALL AI ASSISTANT VERIFICATION TESTS PASSED!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  }
};

runTests();
