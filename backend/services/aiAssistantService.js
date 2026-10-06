import fs from 'fs/promises';
import GovernmentService from '../models/GovernmentService.js';
import Counter from '../models/Counter.js';
import Token from '../models/Token.js';
import User from '../models/User.js';
import { queueDate } from '../utils/generateToken.js';

const PREDICTION_FILE = new URL('../data/govflow_predictions.json', import.meta.url);

const formatHourLabel = (hourValue) => {
  const hour = Number(hourValue);
  if (!Number.isFinite(hour)) return 'Unknown time';
  const normalized = ((hour - 1) % 24) + 1;
  const suffix = normalized >= 12 && normalized < 24 ? 'PM' : 'AM';
  const displayed = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${displayed}:00 ${suffix}`;
};

const parseTftPredictions = async () => {
  try {
    const raw = await fs.readFile(PREDICTION_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error reading TFT predictions file:', error.message);
    return [];
  }
};

const getTftSummaryForService = (predictions, serviceCode) => {
  if (!predictions || !predictions.length || !serviceCode) return null;
  const cleanCode = String(serviceCode).toUpperCase().trim();
  const match = predictions.find(
    (p) => String(p.service_type).toUpperCase() === cleanCode ||
      (cleanCode === 'RTO' && p.service_type === 'DLR')
  );

  if (!match) return null;

  const hourly = Object.entries(match)
    .filter(([k]) => k.startsWith('hour_'))
    .map(([k, v]) => ({
      hourNum: Number(k.replace('hour_', '')),
      label: formatHourLabel(k.replace('hour_', '')),
      value: Number(Number(v).toFixed(2)),
    }))
    .sort((a, b) => a.hourNum - b.hourNum);

  if (!hourly.length) return null;

  // Active citizen intake hours (excluding closing hour):
  // For BIRTH (closing at 4:00 PM), intake is 9:00 AM - 3:00 PM (hours 9 to 15).
  // For INC (starting at 10:00 AM, closing at 5:00 PM), intake is 10:00 AM - 4:00 PM (hours 10 to 16).
  // For other standard services (closing at 5:00 PM), intake is 9:00 AM - 4:00 PM (hours 9 to 16).
  const startHour = cleanCode === 'INC' ? 10 : 9;
  const maxIntakeHour = cleanCode === 'BIRTH' ? 15 : 16;
  const closingHourLabel = cleanCode === 'BIRTH' ? '04:00 PM' : '05:00 PM';
  const intakeWindowLabel = `${formatHourLabel(startHour)} - ${formatHourLabel(maxIntakeHour)}`;

  const intakeHours = hourly.filter((item) => item.hourNum >= startHour && item.hourNum <= maxIntakeHour);
  const evalPool = intakeHours.length ? intakeHours : hourly;

  const peak = evalPool.reduce((best, item) => (item.value > best.value ? item : best), evalPool[0]);
  const low = evalPool.reduce((best, item) => (item.value < best.value ? item : best), evalPool[0]);
  const busyHours = evalPool.filter((item) => item.value >= peak.value * 0.85).map((item) => item.label);

  return {
    serviceType: match.service_type,
    peakHour: peak.label,
    peakDemandScore: peak.value,
    lowDemandHour: low.label,
    lowDemandScore: low.value,
    busyHoursList: busyHours.slice(0, 3).join(', '),
    recommendedVisitWindow: `${low.label} (intake window: ${intakeWindowLabel}, counters close at ${closingHourLabel})`,
    hourlyForecast: hourly,
    summary: `Based on the Temporal Fusion Transformer (TFT) model during citizen intake hours (${intakeWindowLabel}), peak demand is predicted around ${peak.label} (score: ${peak.value}), while the optimal low-congestion time to visit is around ${low.label} (score: ${low.value}) prior to daily counter closing at ${closingHourLabel}.`
  };
};

const matchServiceFromQuery = (query, services) => {
  if (!query || !services?.length) return null;
  const q = String(query).toLowerCase().trim();

  // 1. Direct service name match
  for (const s of services) {
    const name = s.name.toLowerCase();
    if (q.includes(name)) return s;
  }

  // 2. Direct code match with word boundaries
  for (const s of services) {
    const code = s.code.toLowerCase();
    const codeRegex = new RegExp(`\\b${code}\\b`, 'i');
    if (codeRegex.test(q)) return s;
  }

  // 3. Domain-specific keyword & alias matching with word boundaries
  // Driving License / RTO / DL
  if (
    /\b(driving|driver|license|licence|dl|dlr|rto|learners?|motor\s*vehicle)\b/i.test(q)
  ) {
    return services.find((s) => s.code === 'RTO') || null;
  }

  // Vehicle Registration / RC (exclude if driving license is mentioned)
  if (
    /\b(vehicle|car|bike|automobile|rc|registration|chassis|road\s*tax)\b/i.test(q) &&
    !/\b(driving|driver|license|licence|dl)\b/i.test(q)
  ) {
    return services.find((s) => s.code === 'VEH') || null;
  }

  // Birth Certificate
  if (
    /\b(birth|born|newborn|baby|child\s*certificate|certificate\s*of\s*birth)\b/i.test(q)
  ) {
    return services.find((s) => s.code === 'BIRTH') || null;
  }

  // Income Certificate
  if (
    /\b(income|salary|earnings|revenue\s*certificate|affidavit\s*income|caste\s*and\s*income)\b/i.test(q)
  ) {
    return services.find((s) => s.code === 'INC') || null;
  }

  // Land Record Request / Patta
  if (
    /\b(land|property|patta|survey|khata|deed|mutation|plot|real\s*estate)\b/i.test(q)
  ) {
    return services.find((s) => s.code === 'LAND') || null;
  }

  return null;
};

export const processAssistantQuery = async ({ query, serviceId = null, citizenId = null }) => {
  const cleanQuery = String(query || '').trim();
  if (!cleanQuery) {
    return {
      answer: "Hello! I am your **GovFlow Civic AI Assistant**. I can help you with required documents, fees, eligibility, live queues, staff contact emails, and **TFT 24-hour demand forecasts**. How can I help you today?",
      quickPrompts: [
        "What documents do I need for Driving License Renewal?",
        "What documents do I need for Vehicle Registration?",
        "When is the best time to visit RTO based on TFT?",
        "What is the email for Vehicle Registration?",
        "What is the fee for Income Certificate?"
      ]
    };
  }

  const date = queueDate();
  const [services, counters, todayTokens, allUsers, predictions] = await Promise.all([
    GovernmentService.find({ isActive: true }).lean(),
    Counter.find({ isActive: true }).populate('assignedStaff', 'name email role department').populate('services', 'name code').lean(),
    Token.find({ date }).lean(),
    User.find({}).select('name email role department').lean(),
    parseTftPredictions()
  ]);

  const allStaff = allUsers.filter((u) => u.role === 'staff' || u.role === 'admin');

  // Explicit user query intent takes precedence over context dropdown filter
  const queryMatchedService = matchServiceFromQuery(cleanQuery, services);

  let matchedService = null;
  if (queryMatchedService) {
    matchedService = queryMatchedService;
  } else if (serviceId) {
    matchedService = services.find((s) => String(s._id) === String(serviceId) || String(s.code).toUpperCase() === String(serviceId).toUpperCase()) || null;
  }

  const qLower = cleanQuery.toLowerCase();

  // TFT summary if service is identified
  const tftSummary = matchedService ? getTftSummaryForService(predictions, matchedService.code) : null;

  // Queue status if service is identified
  let liveQueue = null;
  let serviceCounters = [];
  if (matchedService) {
    const sTokens = todayTokens.filter((t) => String(t.service) === String(matchedService._id));
    const waitingTokens = sTokens.filter((t) => t.status === 'waiting');
    const inServiceTokens = sTokens.filter((t) => ['called', 'in_service'].includes(t.status));
    serviceCounters = counters.filter((c) => (c.services || []).some((s) => String(s._id || s) === String(matchedService._id)));
    const freeCounters = serviceCounters.filter((c) => c.status === 'available');

    const duration = Number(matchedService.averageServiceDuration || matchedService.averageServiceTime || 15);
    const operatingCount = Math.max(freeCounters.length + serviceCounters.filter((c) => c.status === 'busy').length, 1);
    const estWaitMinutes = Math.max(0, Math.ceil((waitingTokens.length * duration) / operatingCount));

    liveQueue = {
      waitingCount: waitingTokens.length,
      servingCount: inServiceTokens.length,
      availableCounters: freeCounters.length,
      totalCounters: serviceCounters.length,
      estimatedWaitMinutes: estWaitMinutes,
      status: waitingTokens.length === 0 ? 'Clear / No wait' : waitingTokens.length <= 3 ? 'Moderate' : 'Busy',
    };
  }

  // Find relevant staff / emails prioritized for this service
  let staffForService = [];
  if (matchedService) {
    const exactSeedEmail = `${matchedService.code.toLowerCase()}.staff@govflow.com`;
    const exactStaff = allStaff.find((st) => st.email.toLowerCase() === exactSeedEmail.toLowerCase());
    const counterStaff = serviceCounters.flatMap((c) => c.assignedStaff || []);
    const codeStaff = allStaff.filter((st) => st.email.toLowerCase().includes(matchedService.code.toLowerCase()));
    const deptStaff = allStaff.filter((staff) => staff.department && staff.department.toLowerCase() === matchedService.department.toLowerCase());

    const combined = [
      ...(exactStaff ? [exactStaff] : []),
      ...codeStaff,
      ...counterStaff,
      ...deptStaff
    ];

    staffForService = combined.filter((s, idx, arr) => arr.findIndex((x) => x.email.toLowerCase() === s.email.toLowerCase()) === idx);
  }

  // 1. Check for Contact / Email / Gmail queries
  const isEmailQuery = qLower.includes('email') || qLower.includes('gmail') || qLower.includes('contact') || qLower.includes('mail') || qLower.includes('officer') || qLower.includes('staff');
  if (isEmailQuery) {
    if (matchedService) {
      const primaryEmail = staffForService[0]?.email || `${matchedService.code.toLowerCase()}.staff@govflow.com`;
      const counterInfo = serviceCounters[0] || counters.find((c) => (c.services || []).some((s) => String(s._id || s) === String(matchedService._id)));

      return {
        answer: `### 📧 Contact & Officer Information for **${matchedService.name}**\n\n` +
          `- **Official Staff Email:** \`${primaryEmail}\`\n` +
          `- **Department:** ${matchedService.department}\n` +
          `- **Assigned Counter:** ${counterInfo ? `${counterInfo.name} (${counterInfo.counterNumber})` : 'Assigned Counter'}\n` +
          `- **Operating Hours:** ${matchedService.operatingHours || 'Monday - Friday: 09:00 AM - 05:00 PM'}\n\n` +
          `*You can reach out to the department staff directly or create a live queue ticket through the citizen portal.*`,
        service: matchedService,
        liveQueue,
        tftForecast: tftSummary,
        quickPrompts: [
          `What documents are required for ${matchedService.name}?`,
          `What is the fee for ${matchedService.name}?`,
          `When is the best time to visit ${matchedService.name}?`,
          "Take a queue token"
        ],
        action: {
          type: 'take_token',
          serviceId: matchedService._id,
          serviceName: matchedService.name
        }
      };
    } else {
      // General contact list
      const contactsList = services.map((s) => {
        const staff = allStaff.find((u) => u.email.startsWith(s.code.toLowerCase())) ||
          allStaff.find((u) => u.department === s.department && u.role === 'staff');
        const email = staff?.email || `${s.code.toLowerCase()}.staff@govflow.com`;
        return `| **${s.name}** (${s.code}) | ${s.department} | \`${email}\` |`;
      }).join('\n');

      return {
        answer: `### 🏛️ GovFlow Department & Staff Email Directory\n\n` +
          `| Service | Department | Staff Email |\n|---|---|---|\n` +
          `${contactsList}\n\n` +
          `- **General Admin:** \`admin@govflow.com\`\n\n` +
          `*Ask me about any specific service for required documents, fees, or live queue times!*`,
        quickPrompts: [
          "What is the email for Vehicle Registration?",
          "What is the email for Driving License Renewal?",
          "What is the email for Birth Certificate?",
          "What is the email for Land Record?"
        ]
      };
    }
  }

  // 2. Check for TFT / Prediction / Best Time / Congestion / Peak Hours queries
  const isTftQuery = qLower.includes('tft') || qLower.includes('predict') || qLower.includes('forecast') ||
    qLower.includes('best time') || qLower.includes('when should i visit') || qLower.includes('crowd') ||
    qLower.includes('peak') || qLower.includes('traffic') || qLower.includes('rush') || qLower.includes('least crowded') || qLower.includes('when to visit');

  if (isTftQuery) {
    if (matchedService && tftSummary) {
      return {
        answer: `### 🤖 Temporal Fusion Transformer (TFT) AI Demand Forecast\n\n` +
          `Analysis for **${matchedService.name} (${matchedService.code})**:\n\n` +
          `- 🟢 **Recommended Best Visit Window:** **${tftSummary.recommendedVisitWindow}**\n` +
          `- 🔴 **Predicted Peak Congestion:** **${tftSummary.peakHour}** (Demand score: \`${tftSummary.peakDemandScore}\`)\n` +
          `- 🕒 **Low Demand Hours:** ${tftSummary.lowDemandHour}\n` +
          `- 📊 **Current Live Queue Status:** ${liveQueue ? `${liveQueue.waitingCount} person(s) waiting, ~${liveQueue.estimatedWaitMinutes} min wait` : 'Normal'}\n\n` +
          `**TFT Insight:** ${tftSummary.summary}`,
        service: matchedService,
        tftForecast: tftSummary,
        liveQueue,
        quickPrompts: [
          `What documents are required for ${matchedService.name}?`,
          `What is the fee for ${matchedService.name}?`,
          "Check live counters",
          "Take a queue token"
        ],
        action: {
          type: 'take_token',
          serviceId: matchedService._id,
          serviceName: matchedService.name
        }
      };
    } else {
      // Comparison across all services
      const allForecasts = services.map((s) => {
        const fc = getTftSummaryForService(predictions, s.code);
        return `- **${s.name} (${s.code}):** Peak around **${fc?.peakHour || '11:00 AM'}**, optimal visit around **${fc?.lowDemandHour || '9:00 AM'}** (operating hours: 09:00 AM - 05:00 PM)`;
      }).join('\n');

      return {
        answer: `### 📈 24-Hour AI Demand Predictions (TFT Model)\n\n` +
          `Here is the latest Temporal Fusion Transformer (TFT) forecast overview across all public services:\n\n` +
          `${allForecasts}\n\n` +
          `💡 *Tip: For the quickest turnaround and minimal wait times, visit during the early morning hours (09:00 AM - 11:00 AM) and avoid late afternoon peak hours.*`,
        quickPrompts: [
          "When should I visit Vehicle Registration?",
          "When should I visit Driving License Renewal?",
          "When should I visit Birth Certificate?",
          "Live queue status"
        ]
      };
    }
  }

  // 3. Check for Required Documents queries
  const isDocQuery = qLower.includes('document') || qLower.includes('paper') || qLower.includes('proof') ||
    qLower.includes('form') || qLower.includes('what do i need') || qLower.includes('requirement') || qLower.includes('bring') || qLower.includes('need');

  if (isDocQuery) {
    if (matchedService) {
      const docs = matchedService.requiredDocuments || [];
      const docList = docs.length
        ? docs.map((d, i) => `${i + 1}. **${d}**`).join('\n')
        : 'No specific documents recorded in MongoDB.';

      return {
        answer: `### 📋 Required Documents for **${matchedService.name}**\n\n` +
          `Please prepare the following documents before visiting the counter:\n\n` +
          `${docList}\n\n` +
          `**Service Fee:** ${matchedService.fee || '₹0'}\n` +
          `**Operating Hours:** ${matchedService.operatingHours || '09:00 AM - 05:00 PM'}\n\n` +
          (tftSummary ? `💡 *AI Recommendation: ${tftSummary.summary}*` : ''),
        service: matchedService,
        tftForecast: tftSummary,
        liveQueue,
        quickPrompts: [
          `Who is eligible for ${matchedService.name}?`,
          `What is the fee for ${matchedService.name}?`,
          `When is the best time to visit based on TFT?`,
          "Take a queue token"
        ],
        action: {
          type: 'take_token',
          serviceId: matchedService._id,
          serviceName: matchedService.name
        }
      };
    } else {
      return {
        answer: `### 📋 Service Document Checklist\n\nPlease select which service you need documents for:\n\n` +
          services.map((s) => `- **${s.name}** (${s.requiredDocuments?.length || 0} documents required)`).join('\n') +
          `\n\n*Type the name of any service (e.g. "Vehicle Registration documents") to get the full list!*`,
        quickPrompts: [
          "Documents for Vehicle Registration",
          "Documents for Driving License Renewal",
          "Documents for Birth Certificate",
          "Documents for Income Certificate",
          "Documents for Land Record Request"
        ]
      };
    }
  }

  // 4. Check for Fee / Cost / Price queries
  const isFeeQuery = qLower.includes('fee') || qLower.includes('cost') || qLower.includes('price') ||
    qLower.includes('how much') || qLower.includes('charge') || qLower.includes('pay') || qLower.includes('tax') || qLower.includes('rupee') || qLower.includes('rs');

  if (isFeeQuery) {
    if (matchedService) {
      return {
        answer: `### 💳 Fee Details for **${matchedService.name}**\n\n` +
          `- **Official Fee:** **${matchedService.fee || 'Free of charge'}**\n` +
          `- **Department:** ${matchedService.department}\n` +
          `- **Expected Processing Time:** ~${matchedService.averageServiceDuration || matchedService.averageServiceTime || 15} minutes\n\n` +
          `*Fees can be paid at the assigned counter upon token verification.*`,
        service: matchedService,
        tftForecast: tftSummary,
        liveQueue,
        quickPrompts: [
          `What documents are required for ${matchedService.name}?`,
          `What is the staff email for ${matchedService.name}?`,
          `When is the best time to visit based on TFT?`,
          "Take a queue token"
        ],
        action: {
          type: 'take_token',
          serviceId: matchedService._id,
          serviceName: matchedService.name
        }
      };
    } else {
      const feeTable = services.map((s) => `| **${s.name}** | ${s.department} | ${s.fee || 'Free'} |`).join('\n');
      return {
        answer: `### 💳 Public Service Fee Schedule\n\n` +
          `| Service | Department | Official Fee |\n|---|---|---|\n` +
          `${feeTable}\n\n` +
          `*Ask me about any specific service for document checklists and queue wait times.*`,
        quickPrompts: [
          "Fee for Vehicle Registration",
          "Fee for Driving License",
          "Fee for Birth Certificate",
          "Fee for Income Certificate"
        ]
      };
    }
  }

  // 5. Check for Eligibility queries
  const isEligibilityQuery = qLower.includes('eligible') || qLower.includes('eligibility') ||
    qLower.includes('who can apply') || qLower.includes('qualification') || qLower.includes('criteria') || qLower.includes('age');

  if (isEligibilityQuery) {
    if (matchedService) {
      const elig = matchedService.eligibility || [];
      const eligList = elig.length
        ? elig.map((e, i) => `${i + 1}. **${e}**`).join('\n')
        : 'All resident citizens are eligible.';

      return {
        answer: `### 🎯 Eligibility Criteria for **${matchedService.name}**\n\n` +
          `${eligList}\n\n` +
          `**Required Documents:** ${matchedService.requiredDocuments?.length || 0} documents needed\n` +
          `**Department:** ${matchedService.department}`,
        service: matchedService,
        tftForecast: tftSummary,
        liveQueue,
        quickPrompts: [
          `What documents are required for ${matchedService.name}?`,
          `What is the fee for ${matchedService.name}?`,
          "Take a queue token"
        ],
        action: {
          type: 'take_token',
          serviceId: matchedService._id,
          serviceName: matchedService.name
        }
      };
    }
  }

  // 6. Check for Live Queue / Wait Time queries
  const isQueueQuery = qLower.includes('queue') || qLower.includes('wait') || qLower.includes('serving') ||
    qLower.includes('token') || qLower.includes('line') || qLower.includes('status') || qLower.includes('counter');

  if (isQueueQuery) {
    if (matchedService && liveQueue) {
      return {
        answer: `### ⏱️ Live Queue Status for **${matchedService.name}**\n\n` +
          `- **Current Queue Condition:** **${liveQueue.status}**\n` +
          `- **Citizens Waiting in Queue:** **${liveQueue.waitingCount}**\n` +
          `- **Estimated Wait Time:** **~${liveQueue.estimatedWaitMinutes} min**\n` +
          `- **Active Counters:** **${liveQueue.availableCounters} / ${liveQueue.totalCounters} available**\n\n` +
          (tftSummary ? `🤖 **TFT Forecast:** Optimal low-crowd window is around **${tftSummary.lowDemandHour}** (Peak at ${tftSummary.peakHour}).\n\n` : '') +
          `*You can take a digital queue ticket now to reserve your place in line.*`,
        service: matchedService,
        liveQueue,
        tftForecast: tftSummary,
        quickPrompts: [
          `Take a token for ${matchedService.name}`,
          `What documents are required for ${matchedService.name}?`,
          `What is the fee for ${matchedService.name}?`,
          `What is the staff email for ${matchedService.name}?`
        ],
        action: {
          type: 'take_token',
          serviceId: matchedService._id,
          serviceName: matchedService.name
        }
      };
    } else {
      const queueSummary = services.map((s) => {
        const sTokens = todayTokens.filter((t) => String(t.service) === String(s._id) && t.status === 'waiting');
        return `- **${s.name}:** ${sTokens.length} waiting`;
      }).join('\n');

      return {
        answer: `### ⏱️ Live Queue Overview Across All Services\n\n` +
          `${queueSummary}\n\n` +
          `*Ask me about any specific service to see live counter availability and TFT demand forecasts.*`,
        quickPrompts: [
          "Vehicle Registration live queue",
          "Driving License Renewal live queue",
          "Birth Certificate live queue",
          "Income Certificate live queue"
        ]
      };
    }
  }

  // 7. General service information if a specific service is matched
  if (matchedService) {
    const primaryEmail = staffForService[0]?.email || `${matchedService.code.toLowerCase()}.staff@govflow.com`;
    const docs = matchedService.requiredDocuments || [];
    const docList = docs.length
      ? docs.map((d, i) => `${i + 1}. **${d}**`).join('\n')
      : 'No specific documents recorded in database.';

    const elig = matchedService.eligibility || [];
    const eligList = elig.length
      ? elig.map((e, i) => `• ${e}`).join('\n')
      : 'All resident citizens.';

    return {
      answer: `### 🏛️ **${matchedService.name}** (${matchedService.code})\n\n` +
        `${matchedService.description || ''}\n\n` +
        `**Key Service Details:**\n` +
        `- **Department:** ${matchedService.department}\n` +
        `- **Staff Email:** \`${primaryEmail}\`\n` +
        `- **Official Fee:** ${matchedService.fee || '₹0'}\n` +
        `- **Operating Hours:** ${matchedService.operatingHours || '09:00 AM - 05:00 PM'}\n` +
        `- **Average Duration:** ~${matchedService.averageServiceDuration || 15} minutes\n\n` +
        `**Required Documents:**\n` +
        `${docList}\n\n` +
        `**Eligibility:**\n` +
        `${eligList}\n\n` +
        `**Live Queue:** ${liveQueue ? `${liveQueue.waitingCount} waiting (~${liveQueue.estimatedWaitMinutes} min wait)` : 'Available'}\n\n` +
        (tftSummary ? `🤖 **TFT 24-Hour Forecast:** ${tftSummary.summary}` : ''),
      service: matchedService,
      tftForecast: tftSummary,
      liveQueue,
      quickPrompts: [
        `What documents are required for ${matchedService.name}?`,
        `What is the fee for ${matchedService.name}?`,
        `What is the staff email for ${matchedService.name}?`,
        `When is the best time to visit based on TFT?`
      ],
      action: {
        type: 'take_token',
        serviceId: matchedService._id,
        serviceName: matchedService.name
      }
    };
  }

  // 8. General fallback greeting / directory
  const serviceList = services.map((s) => `- **${s.name}** (\`${s.code}\` - ${s.department})`).join('\n');
  return {
    answer: `### 🏛️ GovFlow Civic AI Assistant\n\n` +
      `I can help you with comprehensive information on government services, documents, fees, staff contacts, live queues, and **TFT 24-hour demand predictions**.\n\n` +
      `**Available Services in the System:**\n` +
      `${serviceList}\n\n` +
      `How can I assist you today?`,
    quickPrompts: [
      "What is the email for Vehicle Registration?",
      "What documents do I need for Driving License Renewal?",
      "When is the best time to visit based on TFT?",
      "Check live queue status",
      "What is the fee for Income Certificate?"
    ]
  };
};

export const getProactiveInsights = async () => {
  const date = queueDate();
  const [services, counters, todayTokens, predictions] = await Promise.all([
    GovernmentService.find({ isActive: true }).lean(),
    Counter.find({ isActive: true }).lean(),
    Token.find({ date }).lean(),
    parseTftPredictions()
  ]);

  const serviceInsights = services.map((service) => {
    const sTokens = todayTokens.filter((t) => String(t.service) === String(service._id));
    const waitingTokens = sTokens.filter((t) => t.status === 'waiting');
    const completedTokens = sTokens.filter((t) => t.status === 'completed');
    const sCounters = counters.filter((c) => (c.services || []).some((s) => String(s._id || s) === String(service._id)));
    const availableCounters = sCounters.filter((c) => c.status === 'available').length;

    const tft = getTftSummaryForService(predictions, service.code);
    const duration = Number(service.averageServiceDuration || 15);
    const estWait = Math.max(0, Math.ceil((waitingTokens.length * duration) / Math.max(availableCounters, 1)));

    return {
      serviceId: service._id,
      name: service.name,
      code: service.code,
      department: service.department,
      waitingCount: waitingTokens.length,
      completedCount: completedTokens.length,
      availableCounters,
      tftPeakHour: tft?.peakHour || '11:00 AM',
      tftLowDemandHour: tft?.lowDemandHour || '09:00 AM',
      recommendedVisitWindow: tft?.recommendedVisitWindow || 'Morning hours (09:00 AM - 11:00 AM)',
    };
  });

  // Find lowest wait service
  const lowestWait = [...serviceInsights].sort((a, b) => a.waitingCount - b.waitingCount)[0];

  return {
    timestamp: new Date().toISOString(),
    totalActiveServices: services.length,
    totalTokensToday: todayTokens.length,
    lowestWaitService: lowestWait,
    services: serviceInsights,
    summary: `Currently ${todayTokens.filter((t) => t.status === 'waiting').length} total citizens are waiting across all departments. Lowest wait service right now: ${lowestWait?.name || 'N/A'}.`
  };
};
