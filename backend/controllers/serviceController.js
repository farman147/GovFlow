import mongoose from 'mongoose';
import fs from 'fs/promises';
import GovernmentService from '../models/GovernmentService.js';
import User from '../models/User.js';
import Token from '../models/Token.js';
import Counter from '../models/Counter.js';
import Appointment from '../models/Appointment.js';
import { ApiError } from '../utils/apiError.js';
import { isValidObjectId } from '../utils/isValidObjectId.js';
import { queueDate } from '../utils/generateToken.js';

const ok = (res, message, data, status = 200) => res.status(status).json({ success: true, message, data });

const formatHourLabel = (hourValue) => {
  const hour = Number(hourValue);
  if (!Number.isFinite(hour)) return 'Unknown time';
  const normalized = ((hour - 1) % 24) + 1;
  const suffix = normalized >= 12 && normalized < 24 ? 'PM' : 'AM';
  const displayed = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${displayed}:00 ${suffix}`;
};

const getQueueStatusLabel = (waitingCount, freeCounters) => {
  if (waitingCount === 0) return 'Low';
  if (waitingCount <= 3) return 'Moderate';
  if (waitingCount <= 7) return 'Busy';
  return 'High';
};

const normalizeReferenceId = (value) => {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';
  if (typeof value.toHexString === 'function') return value.toHexString();
  const nestedId = value._id ?? value.id;
  return nestedId && nestedId !== value ? normalizeReferenceId(nestedId) : '';
};

const buildPredictionSummary = (predictionRow) => {
  if (!predictionRow) {
    return {
      next24Hours: [],
      peakHour: null,
      peakDemand: null,
      lowDemandHour: null,
      busyPeriods: 'TFT demand trend unavailable for this service.',
      lowDemandPeriods: 'TFT demand trend unavailable for this service.',
      summary: 'TFT demand forecast is currently unavailable for this service.'
    };
  }

  const values = Object.entries(predictionRow)
    .filter(([key]) => key.startsWith('hour_'))
    .map(([key, value]) => ({ hour: Number(key.replace('hour_', '')), value: Number(value) }))
    .sort((a, b) => a.hour - b.hour);

  if (!values.length) {
    return {
      next24Hours: [],
      peakHour: null,
      peakDemand: null,
      lowDemandHour: null,
      busyPeriods: 'TFT demand trend unavailable for this service.',
      lowDemandPeriods: 'TFT demand trend unavailable for this service.',
      summary: 'TFT demand forecast is currently unavailable for this service.'
    };
  }

  // Evaluate citizen intake hours before closing time
  const serviceCode = String(predictionRow?.service_type || '').toUpperCase();
  const startHour = serviceCode === 'INC' ? 10 : 9;
  const maxIntakeHour = serviceCode === 'BIRTH' ? 15 : 16;
  const closingHourLabel = serviceCode === 'BIRTH' ? '04:00 PM' : '05:00 PM';
  const intakeWindowLabel = `${formatHourLabel(startHour)} - ${formatHourLabel(maxIntakeHour)}`;

  const intakeHours = values.filter((item) => item.hour >= startHour && item.hour <= maxIntakeHour);
  const evalPool = intakeHours.length ? intakeHours : values;

  const peak = evalPool.reduce((best, item) => (item.value > best.value ? item : best), evalPool[0]);
  const low = evalPool.reduce((best, item) => (item.value < best.value ? item : best), evalPool[0]);
  const busyPeriods = evalPool.filter((item) => item.value >= peak.value * 0.85).map((item) => formatHourLabel(item.hour));
  const lowPeriods = evalPool.filter((item) => item.value <= low.value * 1.25).map((item) => formatHourLabel(item.hour));

  return {
    next24Hours: values.map((item) => ({ hour: formatHourLabel(item.hour), value: Number(item.value.toFixed(2)) })),
    peakHour: formatHourLabel(peak.hour),
    peakDemand: Number(peak.value.toFixed(2)),
    lowDemandHour: formatHourLabel(low.hour),
    busyPeriods: busyPeriods.length ? busyPeriods.slice(0, 3).join(', ') : 'No sustained spike',
    lowDemandPeriods: lowPeriods.length ? lowPeriods.slice(0, 3).join(', ') : 'Standard hours',
    summary: `Demand peak forecasted around ${formatHourLabel(peak.hour)} (operating load: ${Number(peak.value.toFixed(2))}) with lowest operational demand expected around ${formatHourLabel(low.hour)} (load: ${Number(low.value.toFixed(2))}) during intake hours (${intakeWindowLabel}, counters close at ${closingHourLabel}).`
  };
};

export const list = async (req, res, next) => {
  try {
    const query = req.user?.role === 'admin' && req.query.includeInactive === 'true' ? {} : { isActive: true };
    let servicesQuery = GovernmentService.find(query).sort('name');
    if (req.user?.role === 'admin' && req.query.includeInactive === 'true') {
      servicesQuery = servicesQuery.populate('assignedStaff', 'name email role department');
    }
    ok(res, 'Services retrieved', { services: await servicesQuery });
  } catch (e) {
    next(e);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const isObjectId = isValidObjectId(req.params.id);
    const service = isObjectId
      ? await GovernmentService.findById(req.params.id)
      : await GovernmentService.findOne({ code: String(req.params.id).toUpperCase() });

    if (!service || (!service.isActive && req.user?.role !== 'admin')) throw new ApiError('Service not found', 404);
    ok(res, 'Service retrieved', { service });
  } catch (e) {
    next(e);
  }
};

export const getAssistantDetails = async (req, res, next) => {
  try {
    const isObjectId = isValidObjectId(req.params.id);
    const service = isObjectId
      ? await GovernmentService.findById(req.params.id)
      : await GovernmentService.findOne({ code: String(req.params.id).toUpperCase() });

    if (!service || (!service.isActive && req.user?.role !== 'admin')) {
      throw new ApiError('Service not found', 404);
    }

    const date = queueDate();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [counters, queueRecords, allAppointments, predictionFile] = await Promise.all([
      Counter.find({ services: service._id, isActive: true })
        .populate('services', 'name code department')
        .populate('assignedStaff', 'name email role department')
        .populate('currentToken', 'tokenNumber status service')
        .sort({ counterNumber: 1 }),
      Token.find({ service: service._id, date }).sort({ issuedAt: 1 }),
      Appointment.find({ service: service._id })
        .populate('citizen', 'name email')
        .sort({ appointmentDate: 1, appointmentTime: 1 }),
      fs.readFile(new URL('../data/govflow_predictions.json', import.meta.url), 'utf8')
    ]);

    const appointments = allAppointments.filter((appointment) => {
      if (!appointment.appointmentDate) return false;
      const appointmentDate = new Date(appointment.appointmentDate);
      return appointmentDate >= startOfDay && appointmentDate <= endOfDay;
    });

    const parsedPredictions = JSON.parse(predictionFile);
    const servicePrediction = parsedPredictions.find((entry) =>
      String(entry.service_type).toUpperCase() === String(service.code).toUpperCase()
    ) || null;
    const forecast = buildPredictionSummary(servicePrediction);

    const waitingTokens = queueRecords.filter((token) => token.status === 'waiting');
    const activeTokens = queueRecords.filter((token) => ['called', 'in_service'].includes(token.status));
    const currentServingToken = activeTokens.at(-1) || null;

    const availableCounterCount = counters.filter((counter) => counter.status === 'available').length;
    const busyCounterCount = counters.filter((counter) => counter.status === 'busy').length;
    const offlineCounterCount = counters.filter((counter) => counter.status === 'offline').length;
    const operatingCounterCount = Math.max(availableCounterCount + busyCounterCount, 1);

    const serviceDuration = Number(service.averageServiceDuration || service.averageServiceTime || service.estimatedProcessingTime || 15);
    const estimatedWaitMinutes = Math.max(0, Math.ceil((waitingTokens.length * serviceDuration) / operatingCounterCount));

    const missingFields = [];
    if (!service.description || !String(service.description).trim()) missingFields.push('description');
    if (!Array.isArray(service.requiredDocuments) || service.requiredDocuments.length === 0) missingFields.push('requiredDocuments');
    if (!Array.isArray(service.eligibility) || service.eligibility.length === 0) missingFields.push('eligibility');
    if (!service.fee) missingFields.push('fee');
    if (!service.operatingHours) missingFields.push('operatingHours');

    const queueStatus = getQueueStatusLabel(waitingTokens.length, availableCounterCount);

    let recommendationText = '';
    if (waitingTokens.length === 0) {
      recommendationText = `Current queue is clear with ${availableCounterCount} counter(s) available. Now is an optimal time to visit.`;
    } else if (forecast.lowDemandHour) {
      recommendationText = `Current queue is ${queueStatus.toLowerCase()} (${waitingTokens.length} waiting). Based on the TFT 24-hour forecast, demand is predicted to be lower around ${forecast.lowDemandHour}.`;
    } else {
      recommendationText = `Current queue has ${waitingTokens.length} person(s) waiting with ${availableCounterCount} free counter(s).`;
    }

    ok(res, 'Service assistant details retrieved', {
      service: {
        _id: service._id,
        name: service.name,
        code: service.code,
        department: service.department,
        description: service.description || 'No service description is currently recorded in MongoDB.',
        requiredDocuments: Array.isArray(service.requiredDocuments) ? service.requiredDocuments : [],
        eligibility: Array.isArray(service.eligibility) ? service.eligibility : [],
        fee: service.fee || null,
        operatingHours: service.operatingHours || null,
        estimatedProcessingTime: service.estimatedProcessingTime || null,
        averageServiceTime: service.averageServiceTime || null,
        averageServiceDuration: service.averageServiceDuration || service.averageServiceTime || service.estimatedProcessingTime || null,
        isActive: service.isActive,
        missingFields
      },
      queue: {
        waitingCount: waitingTokens.length,
        peopleWaiting: waitingTokens.length,
        currentlyServingToken: currentServingToken ? currentServingToken.tokenNumber : null,
        currentQueueStatus: queueStatus,
        estimatedWaitMinutes,
        activeCounterCount: counters.length,
        availableCounterCount,
        busyCounterCount,
        offlineCounterCount
      },
      counters: counters.map((counter) => ({
        _id: counter._id,
        counterNumber: counter.counterNumber,
        name: counter.name,
        department: counter.department,
        status: counter.status,
        currentToken: counter.currentToken ? {
          _id: counter.currentToken._id,
          tokenNumber: counter.currentToken.tokenNumber,
          status: counter.currentToken.status
        } : null,
        assignedStaff: (counter.assignedStaff || []).map((staff) => ({
          _id: staff._id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          department: staff.department
        }))
      })),
      appointments: appointments.map((appointment) => ({
        _id: appointment._id,
        citizen: appointment.citizen ? { _id: appointment.citizen._id, name: appointment.citizen.name, email: appointment.citizen.email } : null,
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
        status: appointment.status,
        confirmationCode: appointment.confirmationCode
      })),
      ai: {
        forecast,
        recommendedVisitPeriod: recommendationText,
        summary: `${service.name}\nCurrent status: ${queueStatus} queue (${waitingTokens.length} waiting, ${availableCounterCount} free counter(s)).\nAI forecast: ${forecast.summary}`
      }
    });
  } catch (e) {
    next(e);
  }
};

export const create = async (req, res, next) => {
  try {
    const incomingStaff = Array.isArray(req.body.assignedStaff) ? req.body.assignedStaff : [];
    const assignedStaff = [...new Set(incomingStaff.map(normalizeReferenceId))];
    if (assignedStaff.some((id) => !isValidObjectId(id))) {
      throw new ApiError('Assigned staff IDs must be valid scalar ObjectId strings', 400);
    }
    if (!assignedStaff.length) throw new ApiError('Assign at least one staff member before creating a service', 400);
    if (typeof req.body.name !== 'string' || typeof req.body.code !== 'string' || typeof req.body.department !== 'string') {
      throw new ApiError('Service name, code, and department must be strings', 400);
    }
    const validStaffCount = await User.countDocuments({ _id: { $in: assignedStaff }, role: 'staff' });
    if (validStaffCount !== assignedStaff.length) throw new ApiError('Every assigned account must be an existing staff member', 400);
    const newService = {
      _id: new mongoose.Types.ObjectId().toHexString(),
      name: req.body.name,
      code: req.body.code,
      department: req.body.department,
      description: req.body.description,
      requiredDocuments: Array.isArray(req.body.requiredDocuments) ? req.body.requiredDocuments : [],
      eligibility: Array.isArray(req.body.eligibility) ? req.body.eligibility : [],
      fee: req.body.fee ?? null,
      operatingHours: req.body.operatingHours ?? null,
      estimatedProcessingTime: req.body.estimatedProcessingTime,
      averageServiceTime: req.body.averageServiceTime,
      averageServiceDuration: req.body.averageServiceDuration,
      isActive: req.body.isActive,
      assignedStaff,
    };
    ok(res, 'Service created', { service: await GovernmentService.create(newService) }, 201);
  } catch (e) {
    next(e);
  }
};

export const update = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) throw new ApiError('Service ID must be a valid ObjectId string', 400);
    const updates = { ...req.body };
    delete updates._id;
    delete updates.id;
    if (updates.assignedStaff !== undefined) {
      const assignedStaff = [...new Set((Array.isArray(updates.assignedStaff) ? updates.assignedStaff : []).map(normalizeReferenceId))];
      if (assignedStaff.some((id) => !isValidObjectId(id))) {
        throw new ApiError('Assigned staff IDs must be valid scalar ObjectId strings', 400);
      }
      if (!assignedStaff.length) throw new ApiError('A service must have at least one assigned staff member', 400);
      const validStaffCount = await User.countDocuments({ _id: { $in: assignedStaff }, role: 'staff' });
      if (validStaffCount !== assignedStaff.length) throw new ApiError('Every assigned account must be an existing staff member', 400);
      updates.assignedStaff = assignedStaff;
    }
    const service = await GovernmentService.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!service) throw new ApiError('Service not found', 404);
    ok(res, 'Service updated', { service });
  } catch (e) {
    next(e);
  }
};

export const remove = async (req, res, next) => {
  try {
    const service = await GovernmentService.findById(req.params.id);
    if (!service) throw new ApiError('Service not found', 404);
    const hasTokens = await Token.exists({ service: service._id });
    if (hasTokens) {
      service.isActive = false;
      await service.save();
      return ok(res, 'Service deactivated because it has historical tokens', { service });
    }
    await service.deleteOne();
    ok(res, 'Service deleted', {});
  } catch (e) {
    next(e);
  }
};
