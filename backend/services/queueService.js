import Token from '../models/Token.js';
import Counter from '../models/Counter.js';
import GovernmentService from '../models/GovernmentService.js';
import Appointment from '../models/Appointment.js';
import { ApiError, assert } from '../utils/apiError.js';
import { queueDate } from '../utils/generateToken.js';

const order = { priority: 0, normal: 1 };

export const getWaitingQueue = async (service, date = new Date()) => {
  const serviceId = service?._id || service;
  const tokens = await Token.find({
    service: serviceId,
    date: queueDate(date),
    status: 'waiting'
  }).sort({ issuedAt: 1 });

  return tokens.sort((a, b) => (order[a.priority] ?? 1) - (order[b.priority] ?? 1) || a.issuedAt - b.issuedAt);
};

export const calculateEstimatedWait = (peopleAhead, service, activeCounterCount = 1) => {
  const serviceDuration = Number(
    service?.averageServiceDuration ??
    service?.averageServiceTime ??
    service?.estimatedProcessingTime ??
    10
  );
  if (!Number.isFinite(serviceDuration) || serviceDuration <= 0) return 0;
  const counterCount = Math.max(Number(activeCounterCount) || 1, 1);
  return Math.max(0, Math.ceil((peopleAhead * serviceDuration) / counterCount));
};

export const calculatePeopleAhead = async (token) => {
  const serviceId = token.service?._id || token.service;
  const waiting = await getWaitingQueue(serviceId, token.date);
  const tokenPriorityVal = order[token.priority] ?? 1;

  return waiting.filter((item) => {
    if (String(item._id) === String(token._id)) return false;
    const itemPriorityVal = order[item.priority] ?? 1;
    return itemPriorityVal < tokenPriorityVal || (itemPriorityVal === tokenPriorityVal && item.issuedAt < token.issuedAt);
  }).length;
};

export const generateNextTokenNumber = async (service, citizen, values = {}) => {
  const date = queueDate(values.date || new Date());
  const serviceId = service._id || service;

  const activeCounters = await Counter.find({
    services: serviceId,
    isActive: true
  }).select('status').lean();
  const activeCounterCount = activeCounters.filter((c) => c.status !== 'offline').length;

  for (let attempt = 0; attempt < 5; attempt++) {
    const latest = await Token.findOne({ service: serviceId, date })
      .sort({ sequence: -1 })
      .select('sequence')
      .lean();

    const sequence = (latest?.sequence || 0) + 1;
    const token = new Token({
      service: serviceId,
      citizen,
      date,
      sequence,
      tokenNumber: `${service.code}-${String(sequence).padStart(3, '0')}`,
      priority: values.priority || 'normal',
      appointment: values.appointment,
      notes: values.notes
    });

    const ahead = await calculatePeopleAhead(token);
    token.estimatedWaitTime = calculateEstimatedWait(ahead, service, activeCounterCount || 1);

    try {
      return await token.save();
    } catch (error) {
      if (error.code !== 11000 || attempt === 4) throw error;
    }
  }
};

export const getNextToken = async (serviceId, date = new Date()) =>
  (await getWaitingQueue(serviceId, date))[0] || null;

const transition = async (token, from, to, changes = {}) => {
  assert(from.includes(token.status), `Cannot change a ${token.status} token to ${to}`, 409);
  Object.assign(token, changes, { status: to });
  return token.save();
};

export const callNextToken = async (serviceId, counterId) => {
  const token = await getNextToken(serviceId);
  if (!token) throw new ApiError('No waiting tokens in this queue', 404);

  const counter = await Counter.findById(counterId);
  assert(counter, 'Counter not found', 404);
  assert(counter.status !== 'offline', 'Counter is offline', 409);

  const updated = await transition(token, ['waiting'], 'called', {
    counter: counterId,
    calledAt: new Date()
  });

  counter.currentToken = updated._id;
  counter.status = 'busy';
  await counter.save();

  return updated;
};

export const callToken = async (token, counterId) => {
  const counter = await Counter.findById(counterId);
  assert(counter, 'Counter not found', 404);
  assert(counter.status !== 'offline', 'Counter is offline', 409);

  const updated = await transition(token, ['waiting'], 'called', {
    counter: counterId,
    calledAt: new Date()
  });

  counter.currentToken = updated._id;
  counter.status = 'busy';
  await counter.save();

  return updated;
};

export const startToken = async (token) => {
  const updated = await transition(token, ['called'], 'in_service', {
    serviceStartedAt: new Date()
  });

  if (updated.counter) {
    await Counter.findByIdAndUpdate(updated.counter, {
      status: 'busy',
      currentToken: updated._id
    });
  }

  return updated;
};

export const completeToken = async (token) => {
  const changes = {
    completedAt: new Date()
  };
  if (!token.serviceStartedAt) {
    changes.serviceStartedAt = token.calledAt || new Date();
  }

  const updated = await transition(token, ['called', 'in_service'], 'completed', changes);

  if (updated.counter) {
    await Counter.findByIdAndUpdate(updated.counter, {
      status: 'available',
      $unset: { currentToken: 1 }
    });
  }

  if (updated.appointment) {
    await Appointment.findByIdAndUpdate(updated.appointment, { status: 'completed' });
  }

  return updated;
};

export const skipToken = async (token) => {
  const updated = await transition(token, ['waiting', 'called', 'in_service'], 'skipped');

  if (updated.counter) {
    await Counter.findByIdAndUpdate(updated.counter, {
      status: 'available',
      $unset: { currentToken: 1 }
    });
  }

  return updated;
};

export const queueStatus = async (token) => {
  const serviceId = token.service?._id || token.service;
  const service = await GovernmentService.findById(serviceId).select(
    'code name department averageServiceTime averageServiceDuration estimatedProcessingTime fee operatingHours requiredDocuments'
  );

  const waitingQueue = await getWaitingQueue(serviceId, token.date);
  const peopleAhead = token.status === 'waiting' ? await calculatePeopleAhead(token) : 0;
  const queuePosition = token.status === 'waiting' ? peopleAhead + 1 : 0;

  const todayTokens = await Token.find({
    service: serviceId,
    date: token.date
  })
    .sort({ calledAt: -1, issuedAt: -1 })
    .populate('counter', 'counterNumber status name department');

  const activeServing = todayTokens.find((t) => ['called', 'in_service'].includes(t.status)) || null;

  const activeCounters = await Counter.find({
    services: serviceId,
    isActive: true
  })
    .populate('assignedStaff', 'name email role department')
    .lean();

  const operatingCounters = activeCounters.filter((c) => c.status !== 'offline');

  let resolvedCounter = null;
  if (token.counter) {
    resolvedCounter = await Counter.findById(token.counter._id || token.counter)
      .select('counterNumber status name department assignedStaff currentToken')
      .populate('assignedStaff', 'name email department')
      .lean();
  } else if (activeServing?.counter) {
    resolvedCounter = await Counter.findById(activeServing.counter._id || activeServing.counter)
      .select('counterNumber status name department assignedStaff currentToken')
      .populate('assignedStaff', 'name email department')
      .lean();
  } else if (activeCounters.length > 0) {
    const availableCounter = activeCounters.find((c) => c.status === 'available') || activeCounters[0];
    resolvedCounter = availableCounter;
  }

  const estimatedWaitTime = token.status === 'waiting'
    ? calculateEstimatedWait(peopleAhead, service, operatingCounters.length || 1)
    : 0;

  return {
    tokenNumber: token.tokenNumber,
    status: token.status,
    priority: token.priority || 'normal',
    peopleAhead,
    queuePosition,
    waitingCount: waitingQueue.length,
    estimatedWaitTime,
    currentlyServing: activeServing?.tokenNumber || null,
    department: service?.department || null,
    service: service
      ? {
          _id: service._id,
          name: service.name,
          code: service.code,
          department: service.department,
          averageServiceTime: service.averageServiceTime,
          averageServiceDuration: service.averageServiceDuration,
          estimatedProcessingTime: service.estimatedProcessingTime,
          fee: service.fee,
          operatingHours: service.operatingHours
        }
      : null,
    counter: resolvedCounter
      ? {
          _id: resolvedCounter._id,
          counterNumber: resolvedCounter.counterNumber,
          status: resolvedCounter.status,
          name: resolvedCounter.name,
          department: resolvedCounter.department,
          assignedStaff: resolvedCounter.assignedStaff || []
        }
      : null,
    activeCounters: activeCounters.map((c) => ({
      _id: c._id,
      counterNumber: c.counterNumber,
      name: c.name,
      department: c.department,
      status: c.status,
      assignedStaff: c.assignedStaff || []
    }))
  };
};

