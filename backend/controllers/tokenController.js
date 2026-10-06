import Token from '../models/Token.js';
import GovernmentService from '../models/GovernmentService.js';
import Counter from '../models/Counter.js';
import { ApiError, assert } from '../utils/apiError.js';
import { isValidObjectId } from '../utils/isValidObjectId.js';
import * as queue from '../services/queueService.js';

const ok = (res, message, data, status = 200) =>
  res.status(status).json({
    success: true,
    message,
    data
  });

const emit = (req, event, token) => {
  const room = `service:${token.service?._id || token.service}`;

  req.app.get('io')?.to(room).emit(event, { token });

  req.app
    .get('io')
    ?.to(room)
    .emit('queueUpdated', {
      serviceId: String(token.service?._id || token.service)
    });
};

const load = async (id) =>
  Token.findById(id)
    .populate('service', 'name code department averageServiceTime averageServiceDuration estimatedProcessingTime fee operatingHours requiredDocuments')
    .populate('citizen', 'name email phone')
    .populate({
      path: 'counter',
      select: 'name counterNumber department status currentToken assignedStaff',
      populate: { path: 'assignedStaff', select: 'name email role department' }
    });


// ==================== COUNTER ACCESS ====================

const ensureCounterAccess = async (req, counterId, serviceId = null) => {
  let counter = null;

  if (counterId && isValidObjectId(counterId)) {
    counter = await Counter.findById(counterId).populate('assignedStaff');
  }

  if (!counter) {
    // Try to find counter assigned directly to staff
    let foundCounters = await Counter.find({ assignedStaff: req.user._id, isActive: true }).populate('assignedStaff');

    // If none found directly, try finding by department
    if (!foundCounters.length && req.user.department) {
      foundCounters = await Counter.find({ department: req.user.department, isActive: true }).populate('assignedStaff');
      if (foundCounters.length) {
        await Counter.updateMany(
          { _id: { $in: foundCounters.map((c) => c._id) } },
          { $addToSet: { assignedStaff: req.user._id } }
        );
      }
    }

    if (serviceId && foundCounters.length) {
      const match = foundCounters.find((c) =>
        (c.services || []).some((s) => String(s._id || s) === String(serviceId))
      );
      counter = match || foundCounters[0];
    } else {
      counter = foundCounters[0] || null;
    }
  }

  assert(counter, 'No available counter found for this staff member or department', 404);

  const staffIds = (counter.assignedStaff || []).map((staff) =>
    String(staff._id || staff)
  );
  const userId = String(req.user._id);

  const isAuthorized =
    req.user.role === 'admin' ||
    staffIds.includes(userId) ||
    counter.department === req.user.department;

  assert(isAuthorized, 'Counter is not assigned to you or your department', 403);

  // Link staff if not already linked
  if (!staffIds.includes(userId) && req.user.role === 'staff') {
    await Counter.findByIdAndUpdate(counter._id, { $addToSet: { assignedStaff: req.user._id } });
  }

  return counter;
};


// ==================== CREATE TOKEN ====================

export const create = async (req, res, next) => {
  try {
    const { serviceId, priority, notes } = req.body;

    assert(serviceId, 'serviceId is required');

    const service = await GovernmentService.findById(serviceId);

    if (!service || !service.isActive) {
      throw new ApiError('Active service not found', 404);
    }

    const token = await queue.generateNextTokenNumber(
      service,
      req.user._id,
      {
        priority,
        notes
      }
    );

    emit(req, 'queueUpdated', token);

    ok(res, 'Token generated', { token }, 201);
  } catch (e) {
    next(e);
  }
};


// ==================== MY TOKENS ====================

export const mine = async (req, res, next) => {
  try {
    const tokens = await Token.find({
      citizen: req.user._id
    })
      .populate('service', 'name code department averageServiceTime averageServiceDuration estimatedProcessingTime')
      .populate('counter', 'name counterNumber department status')
      .sort('-issuedAt');

    ok(res, 'Tokens retrieved', { tokens });
  } catch (e) {
    next(e);
  }
};


// ==================== GET ONE TOKEN ====================

export const getOne = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw new ApiError('Invalid resource ID', 400);
    }

    const token = await load(req.params.id);

    if (!token) {
      throw new ApiError('Token not found', 404);
    }

    if (
      req.user.role === 'citizen' &&
      String(token.citizen?._id || token.citizen) !== String(req.user._id)
    ) {
      throw new ApiError('Not authorized', 403);
    }

    ok(res, 'Token retrieved', { token });
  } catch (e) {
    next(e);
  }
};


// ==================== TOKEN STATUS ====================

export const status = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw new ApiError('Invalid resource ID', 400);
    }

    const token = await load(req.params.id);

    if (!token) {
      throw new ApiError('Token not found', 404);
    }

    if (
      req.user.role === 'citizen' &&
      String(token.citizen?._id || token.citizen) !== String(req.user._id)
    ) {
      throw new ApiError('Not authorized', 403);
    }

    ok(res, 'Queue status retrieved', {
      queue: await queue.queueStatus(token)
    });
  } catch (e) {
    next(e);
  }
};


// ==================== SERVICE QUEUE ====================

export const serviceQueue = async (req, res, next) => {
  try {
    const service = await GovernmentService.findById(
      req.params.serviceId
    );

    if (!service) {
      throw new ApiError('Service not found', 404);
    }

    const tokens = await queue.getWaitingQueue(service._id);
    await Promise.all(tokens.map((token) => token.populate('citizen', 'name email phone')));
    ok(res, 'Queue retrieved', { tokens });
  } catch (e) {
    next(e);
  }
};


// ==================== CALL TOKEN ====================

export const call = async (req, res, next) => {
  try {
    const token = await load(req.params.id);
    assert(token, 'Token not found', 404);

    const counter = await ensureCounterAccess(
      req,
      req.body.counterId,
      token.service?._id || token.service
    );

    const updated = await queue.callToken(
      token,
      counter._id
    );

    emit(req, 'tokenCalled', updated);

    ok(res, 'Token called', {
      token: updated
    });
  } catch (e) {
    next(e);
  }
};


// ==================== CALL NEXT TOKEN ====================

export const callNext = async (req, res, next) => {
  try {
    const counter = await ensureCounterAccess(
      req,
      req.body.counterId,
      req.params.serviceId
    );

    const token = await queue.callNextToken(
      req.params.serviceId,
      counter._id
    );

    emit(req, 'tokenCalled', token);

    ok(res, 'Next token called', {
      token
    });
  } catch (e) {
    next(e);
  }
};


// ==================== START / COMPLETE / SKIP ====================

const action = (fn, event, label) =>
  async (req, res, next) => {
    try {
      let token = await load(req.params.id);

      if (!token) {
        throw new ApiError('Token not found', 404);
      }

      if (req.user.role === 'staff') {
        if (token.counter) {
          const counter = await Counter.findById(token.counter._id || token.counter);
          const staffIds = (counter?.assignedStaff || []).map((id) =>
            String(id._id || id)
          );
          const isAssigned =
            staffIds.includes(String(req.user._id)) ||
            counter?.department === req.user.department;

          assert(isAssigned, 'Counter is not assigned to you or your department', 403);
        } else {
          const serviceDept = token.service?.department;
          const isDeptAuthorized =
            !serviceDept ||
            !req.user.department ||
            serviceDept === req.user.department;

          assert(isDeptAuthorized, 'Token does not belong to your department', 403);
        }
      }

      token = await fn(token);

      emit(req, event, token);

      ok(res, label, { token });
    } catch (e) {
      next(e);
    }
  };

export const start = action(
  queue.startToken,
  'tokenStarted',
  'Service started'
);

export const complete = action(
  queue.completeToken,
  'tokenCompleted',
  'Token completed'
);

export const skip = action(
  queue.skipToken,
  'tokenSkipped',
  'Token skipped'
);


// ==================== CANCEL TOKEN ====================

export const cancel = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw new ApiError('Invalid resource ID', 400);
    }

    const token = await Token.findById(req.params.id);

    if (!token) {
      throw new ApiError('Token not found', 404);
    }

    assert(
      req.user.role === 'admin' ||
      String(token.citizen) === String(req.user._id),
      'Not authorized',
      403
    );

    assert(
      token.status === 'waiting',
      'Only waiting tokens can be cancelled',
      409
    );

    token.status = 'cancelled';

    await token.save();

    emit(req, 'queueUpdated', token);

    ok(res, 'Token cancelled', { token });
  } catch (e) {
    next(e);
  }
};
