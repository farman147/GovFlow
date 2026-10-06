import assert from 'assert';

const BASE_URL = 'http://127.0.0.1:5000';

const jsonFetch = async (url, options = {}) => {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(`${BASE_URL}${url}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
};

async function runTests() {
  console.log('=== Starting GovFlow End-to-End Test Suite ===\n');

  // TEST 1 & 2: Health check
  console.log('[TEST 1 & 2] Backend Health Check');
  const health = await jsonFetch('/');
  assert.strictEqual(health.status, 200);
  assert.strictEqual(health.data.message, 'GovFlow backend is running');
  console.log('✔ Backend is running and reachable\n');

  // TEST 21: AI Prediction API - All predictions
  console.log('[TEST 21] GET /api/predictions');
  const allPreds = await jsonFetch('/api/predictions');
  assert.strictEqual(allPreds.status, 200);
  assert.strictEqual(allPreds.data.success, true);
  assert(Array.isArray(allPreds.data.data));
  assert.strictEqual(allPreds.data.data.length, 6);
  console.log(`✔ Retrieved ${allPreds.data.data.length} pre-trained TFT forecast rows`);
  console.log('Sample row service_type:', allPreds.data.data.map(p => p.service_type).join(', '));
  console.log('\n');

  // TEST 22: AI Prediction API - Single service (RTO, VEH, BIRTH, INC, LAND)
  console.log('[TEST 22] GET /api/predictions/RTO');
  const rtoPred = await jsonFetch('/api/predictions/RTO');
  assert.strictEqual(rtoPred.status, 200);
  assert.strictEqual(rtoPred.data.success, true);
  assert.strictEqual(rtoPred.data.data.service_type, 'RTO');
  assert(typeof rtoPred.data.data.hour_1 === 'number');
  assert(typeof rtoPred.data.data.hour_16 === 'number');
  console.log(`✔ RTO forecast retrieved: hour_1=${rtoPred.data.data.hour_1.toFixed(2)}, hour_16=${rtoPred.data.data.hour_16.toFixed(2)}\n`);

  // TEST 6: Admin Login
  console.log('[TEST 6] Admin Login');
  const adminLogin = await jsonFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@govflow.com', password: 'ChangeMe123!' })
  });
  assert.strictEqual(adminLogin.status, 200);
  assert.strictEqual(adminLogin.data.data.user.role, 'admin');
  const adminToken = adminLogin.data.data.token;
  console.log(`✔ Admin logged in: ${adminLogin.data.data.user.name} (${adminLogin.data.data.user.email})\n`);

  // TEST 5: Staff Login (Transport staff)
  console.log('[TEST 5] Staff Login (RTO Staff)');
  const staffLogin = await jsonFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'rto.staff@govflow.com', password: 'ChangeMe123!' })
  });
  assert.strictEqual(staffLogin.status, 200);
  assert.strictEqual(staffLogin.data.data.user.role, 'staff');
  assert.strictEqual(staffLogin.data.data.user.department, 'Transport');
  const staffToken = staffLogin.data.data.token;
  console.log(`✔ Staff logged in: ${staffLogin.data.data.user.name}, Department: ${staffLogin.data.data.user.department}\n`);

  // TEST 4: Citizen Register & Login
  console.log('[TEST 4] Citizen Register & Login');
  const testCitizenEmail = `citizen.test.${Date.now()}@example.com`;
  const citizenRegister = await jsonFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Priya Sharma',
      email: testCitizenEmail,
      password: 'Password123!',
      phone: '+91 9876543210'
    })
  });
  assert.strictEqual(citizenRegister.status, 201);
  assert.strictEqual(citizenRegister.data.data.user.role, 'citizen');
  const citizenToken = citizenRegister.data.data.token;
  const citizenId = citizenRegister.data.data.user._id;
  console.log(`✔ Citizen registered & logged in: ${citizenRegister.data.data.user.name} (${citizenRegister.data.data.user.email})\n`);

  // TEST 7: Services Load
  console.log('[TEST 7] GET /api/services');
  const servicesRes = await jsonFetch('/api/services', {
    headers: { Authorization: `Bearer ${citizenToken}` }
  });
  assert.strictEqual(servicesRes.status, 200);
  assert(Array.isArray(servicesRes.data.data.services));
  assert(servicesRes.data.data.services.length >= 5);
  const rtoService = servicesRes.data.data.services.find(s => s.code === 'RTO');
  const vehService = servicesRes.data.data.services.find(s => s.code === 'VEH');
  assert(rtoService, 'RTO service must exist');
  assert(vehService, 'VEH service must exist');
  console.log(`✔ Retrieved ${servicesRes.data.data.services.length} services: ${servicesRes.data.data.services.map(s => s.name).join(', ')}\n`);

  // TEST 8 & 23: Service Details & AI Assistant Details
  console.log('[TEST 8 & 23] GET /api/services/:id/details (AI Assistant)');
  const assistantRes = await jsonFetch(`/api/services/${rtoService._id}/details`, {
    headers: { Authorization: `Bearer ${citizenToken}` }
  });
  assert.strictEqual(assistantRes.status, 200);
  const assistantData = assistantRes.data.data;
  assert.strictEqual(assistantData.service.name, 'Driving License Renewal');
  assert.strictEqual(assistantData.service.department, 'Transport');
  assert(Array.isArray(assistantData.service.requiredDocuments));
  assert(assistantData.service.requiredDocuments.length > 0);
  assert(assistantData.ai.forecast);
  assert(assistantData.ai.recommendedVisitPeriod);
  console.log(`✔ Service Metadata: Department=${assistantData.service.department}, Fee=${assistantData.service.fee}`);
  console.log(`✔ Required Documents (${assistantData.service.requiredDocuments.length}): ${assistantData.service.requiredDocuments.slice(0, 2).join(', ')}...`);
  console.log(`✔ AI Forecast Summary: ${assistantData.ai.forecast.summary}`);
  console.log(`✔ AI Recommendation: ${assistantData.ai.recommendedVisitPeriod}\n`);

  // TEST 9: Generate Token
  console.log('[TEST 9] POST /api/tokens (Citizen takes token for RTO)');
  const tokenCreate = await jsonFetch('/api/tokens', {
    method: 'POST',
    headers: { Authorization: `Bearer ${citizenToken}` },
    body: JSON.stringify({
      serviceId: rtoService._id,
      priority: 'normal',
      notes: 'Renewal of 10-year LMVs license'
    })
  });
  if (tokenCreate.status !== 201) {
    console.error('Token create error payload:', tokenCreate.data);
  }
  assert.strictEqual(tokenCreate.status, 201);
  const createdToken = tokenCreate.data.data.token;
  assert(createdToken.tokenNumber.startsWith('RTO-'));
  assert.strictEqual(createdToken.status, 'waiting');
  console.log(`✔ Token created: ${createdToken.tokenNumber}, Status: ${createdToken.status}, Seq: ${createdToken.sequence}\n`);

  // TEST 10: Token in My Tokens
  console.log('[TEST 10] GET /api/tokens/my');
  const myTokensRes = await jsonFetch('/api/tokens/my', {
    headers: { Authorization: `Bearer ${citizenToken}` }
  });
  assert.strictEqual(myTokensRes.status, 200);
  const foundToken = myTokensRes.data.data.tokens.find(t => t._id === createdToken._id);
  assert(foundToken, 'Created token must be present in My Tokens list');
  assert.strictEqual(foundToken.service.department, 'Transport');
  console.log(`✔ Token found in My Tokens. Service: ${foundToken.service.name}, Department: ${foundToken.service.department}\n`);

  // TEST 11: Token Details & Queue Status
  console.log('[TEST 11] GET /api/tokens/:id and GET /api/tokens/:id/status');
  const tokenDetailsRes = await jsonFetch(`/api/tokens/${createdToken._id}`, {
    headers: { Authorization: `Bearer ${citizenToken}` }
  });
  assert.strictEqual(tokenDetailsRes.status, 200);
  const tokenDetails = tokenDetailsRes.data.data.token;
  assert.strictEqual(tokenDetails.tokenNumber, createdToken.tokenNumber);
  assert.strictEqual(tokenDetails.service.department, 'Transport');

  const tokenStatusRes = await jsonFetch(`/api/tokens/${createdToken._id}/status`, {
    headers: { Authorization: `Bearer ${citizenToken}` }
  });
  assert.strictEqual(tokenStatusRes.status, 200);
  const queueStatusData = tokenStatusRes.data.data.queue;
  assert.strictEqual(queueStatusData.tokenNumber, createdToken.tokenNumber);
  assert.strictEqual(queueStatusData.status, 'waiting');
  assert(typeof queueStatusData.peopleAhead === 'number');
  assert.strictEqual(queueStatusData.queuePosition, queueStatusData.peopleAhead + 1);
  assert(queueStatusData.counter !== null);
  console.log(`✔ Token details verified:`);
  console.log(`  - Token: ${queueStatusData.tokenNumber}`);
  console.log(`  - Department: ${queueStatusData.department}`);
  console.log(`  - Queue Position: #${queueStatusData.queuePosition} (${queueStatusData.peopleAhead} people ahead)`);
  console.log(`  - Estimated Wait: ${queueStatusData.estimatedWaitTime} min`);
  console.log(`  - Counter: ${queueStatusData.counter.counterNumber} (${queueStatusData.counter.name}) - Status: ${queueStatusData.counter.status}\n`);

  // TEST 12: Staff Queue
  console.log('[TEST 12] GET /api/staff/queue');
  const staffQueueRes = await jsonFetch('/api/staff/queue', {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert.strictEqual(staffQueueRes.status, 200);
  const staffQueueTokens = staffQueueRes.data.data.tokens;
  assert(staffQueueTokens.some(t => t._id === createdToken._id), 'Token must appear in staff queue');
  console.log(`✔ Staff queue retrieved with ${staffQueueTokens.length} assigned token(s)\n`);

  // TEST 13: Staff Calls Token
  console.log('[TEST 13] POST /api/tokens/:id/call (Staff calls token)');
  const callRes = await jsonFetch(`/api/tokens/${createdToken._id}/call`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({})
  });
  assert.strictEqual(callRes.status, 200);
  assert.strictEqual(callRes.data.data.token.status, 'called');
  assert(callRes.data.data.token.calledAt);
  console.log(`✔ Token ${createdToken.tokenNumber} called at counter. Status: ${callRes.data.data.token.status}\n`);

  // TEST 15: Staff Starts Service
  console.log('[TEST 15] POST /api/tokens/:id/start (Staff starts service)');
  const startRes = await jsonFetch(`/api/tokens/${createdToken._id}/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({})
  });
  assert.strictEqual(startRes.status, 200);
  assert.strictEqual(startRes.data.data.token.status, 'in_service');
  assert(startRes.data.data.token.serviceStartedAt);
  console.log(`✔ Token ${createdToken.tokenNumber} in service. Status: ${startRes.data.data.token.status}\n`);

  // TEST 16 & 17: Staff Completes Service & Citizen Page Reflects Change
  console.log('[TEST 16 & 17] POST /api/tokens/:id/complete (Staff completes service)');
  const completeRes = await jsonFetch(`/api/tokens/${createdToken._id}/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({})
  });
  assert.strictEqual(completeRes.status, 200);
  assert.strictEqual(completeRes.data.data.token.status, 'completed');
  assert(completeRes.data.data.token.completedAt);
  console.log(`✔ Token ${createdToken.tokenNumber} completed. Timestamps: calledAt=${completeRes.data.data.token.calledAt}, completedAt=${completeRes.data.data.token.completedAt}\n`);

  // Check citizen status update
  const updatedStatusRes = await jsonFetch(`/api/tokens/${createdToken._id}/status`, {
    headers: { Authorization: `Bearer ${citizenToken}` }
  });
  assert.strictEqual(updatedStatusRes.data.data.queue.status, 'completed');
  console.log(`✔ Citizen queue status updated to 'completed'\n`);

  // TEST 14: Skip Token Test (Create 2nd token and skip it)
  console.log('[TEST 14] Skip Token Flow');
  const token2Res = await jsonFetch('/api/tokens', {
    method: 'POST',
    headers: { Authorization: `Bearer ${citizenToken}` },
    body: JSON.stringify({ serviceId: rtoService._id, priority: 'normal' })
  });
  assert.strictEqual(token2Res.status, 201);
  const token2 = token2Res.data.data.token;

  const skipRes = await jsonFetch(`/api/tokens/${token2._id}/skip`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({})
  });
  assert.strictEqual(skipRes.status, 200);
  assert.strictEqual(skipRes.data.data.token.status, 'skipped');
  console.log(`✔ Token ${token2.tokenNumber} skipped successfully\n`);

  // Citizen Cancel Token Test
  console.log('Citizen Cancel Token Flow');
  const token3Res = await jsonFetch('/api/tokens', {
    method: 'POST',
    headers: { Authorization: `Bearer ${citizenToken}` },
    body: JSON.stringify({ serviceId: rtoService._id, priority: 'normal' })
  });
  assert.strictEqual(token3Res.status, 201);
  const token3 = token3Res.data.data.token;

  const cancelRes = await jsonFetch(`/api/tokens/${token3._id}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${citizenToken}` }
  });
  assert.strictEqual(cancelRes.status, 200);
  assert.strictEqual(cancelRes.data.data.token.status, 'cancelled');
  console.log(`✔ Token ${token3.tokenNumber} cancelled successfully by citizen\n`);

  // TEST 18: Appointments Flow
  console.log('[TEST 18] Appointments Flow');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const appointmentCreate = await jsonFetch('/api/appointments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${citizenToken}` },
    body: JSON.stringify({
      serviceId: rtoService._id,
      appointmentDate: tomorrow.toISOString(),
      appointmentTime: '11:00'
    })
  });
  assert.strictEqual(appointmentCreate.status, 201);
  const createdAppt = appointmentCreate.data.data.appointment;
  assert.strictEqual(createdAppt.status, 'scheduled');
  assert(createdAppt.confirmationCode);
  console.log(`✔ Appointment created: Code=${createdAppt.confirmationCode}, Date=${createdAppt.appointmentDate}, Time=${createdAppt.appointmentTime}`);

  const myAppts = await jsonFetch('/api/appointments/my', {
    headers: { Authorization: `Bearer ${citizenToken}` }
  });
  assert.strictEqual(myAppts.status, 200);
  assert(myAppts.data.data.appointments.some(a => a._id === createdAppt._id));
  console.log(`✔ Appointment found in citizen's appointment list\n`);

  // TEST 19: Admin Statistics
  console.log('[TEST 19] Admin Dashboard Statistics');
  const adminDash = await jsonFetch('/api/admin/dashboard', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(adminDash.status, 200);
  const stats = adminDash.data.data;
  assert(typeof stats.totalCitizens === 'number');
  assert(typeof stats.totalActiveServices === 'number');
  assert(typeof stats.totalTokensToday === 'number');
  assert(typeof stats.completedTokens === 'number');
  assert(stats.completedTokens >= 1);
  assert(Array.isArray(stats.busiestServices));
  console.log(`✔ Admin stats: Citizens=${stats.totalCitizens}, Services=${stats.totalActiveServices}, TokensToday=${stats.totalTokensToday}, Completed=${stats.completedTokens}, ActiveCounters=${stats.activeCounters}`);
  console.log(`✔ Busiest Services: ${stats.busiestServices.map(b => `${b.service} (${b.tokens})`).join(', ')}\n`);

  // TEST 20: Counters & Status Change
  console.log('[TEST 20] Counter Management');
  const countersRes = await jsonFetch('/api/counters', {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert.strictEqual(countersRes.status, 200);
  const counters = countersRes.data.data.counters;
  assert(counters.length >= 5);
  const c1 = counters.find(c => c.counterNumber === 'C-01');
  assert(c1, 'Counter C-01 must exist');

  const statusChangeRes = await jsonFetch(`/api/counters/${c1._id}/status`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ status: 'busy' })
  });
  assert.strictEqual(statusChangeRes.status, 200);
  assert.strictEqual(statusChangeRes.data.data.counter.status, 'busy');

  // Reset back to available
  await jsonFetch(`/api/counters/${c1._id}/status`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ status: 'available' })
  });
  console.log(`✔ Counter ${c1.counterNumber} status update verified\n`);

  // TEST 24: Multiple Different Services
  console.log('[TEST 24] Multiple Services Verification');
  for (const s of servicesRes.data.data.services.slice(0, 4)) {
    const details = await jsonFetch(`/api/services/${s._id}/details`, {
      headers: { Authorization: `Bearer ${citizenToken}` }
    });
    assert.strictEqual(details.status, 200);
    assert(details.data.data.service.name);
    assert(details.data.data.ai.forecast);
    console.log(`✔ Service verified: ${s.name} (${s.code}) - Forecast peak: ${details.data.data.ai.forecast.peakHour || 'N/A'}`);
  }

  console.log('\n=============================================');
  console.log('🎉 ALL 24 END-TO-END TESTS PASSED SUCCESSFULLY!');
  console.log('=============================================');
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
