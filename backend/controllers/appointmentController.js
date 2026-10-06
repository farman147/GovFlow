import Appointment from '../models/Appointment.js';
import GovernmentService from '../models/GovernmentService.js';
import Token from '../models/Token.js';
import { ApiError, assert } from '../utils/apiError.js';
import * as queue from '../services/queueService.js';

const ok = (res, message, data, status = 200) =>
  res.status(status).json({ success: true, message, data });

export const create = async (req, res, next) => {
  try {
    const { serviceId, appointmentDate, appointmentTime, applicantName, phone, notes } = req.body;
    assert(serviceId && appointmentDate && appointmentTime, 'serviceId, appointmentDate and appointmentTime are required');

    const date = new Date(appointmentDate);
    assert(!Number.isNaN(+date) && date >= new Date(new Date().setHours(0, 0, 0, 0)), 'Appointment date must be today or later');

    const service = await GovernmentService.findById(serviceId);
    assert(service?.isActive, 'Active service not found', 404);

    const appointment = await Appointment.create({
      citizen: req.user._id,
      service: serviceId,
      applicantName: applicantName || req.user.name,
      phone: phone || req.user.phone || '',
      notes: notes || '',
      appointmentDate: date,
      appointmentTime
    });

    const populated = await Appointment.findById(appointment._id)
      .populate('service', 'name code department estimatedProcessingTime averageServiceDuration averageServiceTime fee operatingHours requiredDocuments')
      .populate('citizen', 'name email phone');

    ok(res, 'Appointment scheduled successfully', { appointment: populated }, 201);
  } catch (e) {
    next(e);
  }
};

export const mine = async (req, res, next) => {
  try {
    const appointments = await Appointment.find({ citizen: req.user._id })
      .populate('service', 'name code department estimatedProcessingTime averageServiceDuration averageServiceTime fee operatingHours requiredDocuments')
      .populate('citizen', 'name email phone')
      .populate('token', 'tokenNumber status estimatedWaitTime')
      .sort('-appointmentDate -createdAt');

    ok(res, 'Appointments retrieved', { appointments });
  } catch (e) {
    next(e);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('service')
      .populate('citizen', 'name email phone')
      .populate('token', 'tokenNumber status estimatedWaitTime');

    if (!appointment) throw new ApiError('Appointment not found', 404);
    if (req.user.role === 'citizen' && String(appointment.citizen._id || appointment.citizen) !== String(req.user._id)) {
      throw new ApiError('Not authorized', 403);
    }

    ok(res, 'Appointment retrieved', { appointment });
  } catch (e) {
    next(e);
  }
};

export const cancel = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    assert(appointment, 'Appointment not found', 404);
    assert(
      req.user.role === 'admin' ||
      req.user.role === 'staff' ||
      String(appointment.citizen) === String(req.user._id),
      'Not authorized',
      403
    );
    assert(appointment.status === 'scheduled', 'Only scheduled appointments can be cancelled', 409);

    appointment.status = 'cancelled';
    await appointment.save();

    ok(res, 'Appointment cancelled', { appointment });
  } catch (e) {
    next(e);
  }
};

export const checkIn = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('service')
      .populate('citizen', 'name email phone');

    assert(appointment, 'Appointment not found', 404);
    assert(
      req.user.role !== 'citizen' ||
      String(appointment.citizen._id || appointment.citizen) === String(req.user._id),
      'Not authorized',
      403
    );
    assert(appointment.status === 'scheduled', 'Appointment cannot be checked in (status: ' + appointment.status + ')', 409);

    const todayStr = new Date().toISOString().slice(0, 10);
    const apptDateStr = new Date(appointment.appointmentDate).toISOString().slice(0, 10);
    assert(apptDateStr === todayStr, 'Appointment can only be checked in on its scheduled date (' + apptDateStr + ')', 409);

    const token = await queue.generateNextTokenNumber(appointment.service, appointment.citizen, {
      appointment: appointment._id,
      priority: req.body?.priority || 'normal',
      notes: appointment.notes
    });

    appointment.status = 'checked_in';
    appointment.token = token._id;
    await appointment.save();

    req.app.get('io')?.to(`service:${appointment.service._id}`).emit('queueUpdated', {
      serviceId: String(appointment.service._id)
    });

    ok(res, 'Appointment checked in and token generated', { appointment, token });
  } catch (e) {
    next(e);
  }
};

export const complete = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('service', 'name code department estimatedProcessingTime averageServiceDuration averageServiceTime fee operatingHours requiredDocuments')
      .populate('citizen', 'name email phone');

    assert(appointment, 'Appointment not found', 404);
    assert(
      req.user.role === 'admin' ||
      req.user.role === 'staff' ||
      String(appointment.citizen._id || appointment.citizen) === String(req.user._id),
      'Not authorized',
      403
    );
    assert(
      appointment.status === 'checked_in' || appointment.status === 'scheduled' || appointment.status === 'completed',
      'Appointment cannot be completed from current status (' + appointment.status + ')',
      409
    );

    if (appointment.status !== 'completed') {
      appointment.status = 'completed';
      await appointment.save();

      if (appointment.token) {
        const token = await Token.findById(appointment.token);
        if (token && ['waiting', 'called', 'in_service'].includes(token.status)) {
          await queue.completeToken(token);
        }
      }
    }

    req.app.get('io')?.to(`service:${appointment.service?._id || appointment.service}`).emit('queueUpdated', {
      serviceId: String(appointment.service?._id || appointment.service)
    });

    ok(res, 'Appointment completed successfully', { appointment });
  } catch (e) {
    next(e);
  }
};
