import Counter from '../models/Counter.js';
import { ApiError, assert } from '../utils/apiError.js';

const ok = (res, message, data, status = 200) =>
  res.status(status).json({ success: true, message, data });

export const list = async (req, res, next) => {
  try {
    const query = req.user?.role === 'admin' && req.query.includeInactive === 'true'
      ? {}
      : { isActive: true };
    const counters = await Counter.find(query)
      .populate('services', 'name code department averageServiceTime')
      .populate('assignedStaff', 'name email role department')
      .populate('currentToken', 'tokenNumber status service');
    ok(res, 'Counters retrieved', { counters });
  } catch (e) {
    next(e);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const counter = await Counter.findById(req.params.id)
      .populate('services', 'name code department averageServiceTime')
      .populate('assignedStaff', 'name email role department')
      .populate('currentToken', 'tokenNumber status service');
    if (!counter) throw new ApiError('Counter not found', 404);
    ok(res, 'Counter retrieved', { counter });
  } catch (e) {
    next(e);
  }
};

export const create = async (req, res, next) => {
  try {
    const counter = await Counter.create(req.body);
    ok(res, 'Counter created', { counter }, 201);
  } catch (e) {
    next(e);
  }
};

export const update = async (req, res, next) => {
  try {
    const counter = await Counter.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!counter) throw new ApiError('Counter not found', 404);
    ok(res, 'Counter updated', { counter });
  } catch (e) {
    next(e);
  }
};

export const assign = async (req, res, next) => {
  try {
    const counter = await Counter.findById(req.params.id);
    assert(counter, 'Counter not found', 404);
    assert(Array.isArray(req.body.assignedStaff), 'assignedStaff must be an array');
    counter.assignedStaff = req.body.assignedStaff;
    await counter.save();
    ok(res, 'Staff assigned', { counter });
  } catch (e) {
    next(e);
  }
};

export const changeStatus = async (req, res, next) => {
  try {
    const counter = await Counter.findById(req.params.id);
    assert(counter, 'Counter not found', 404);

    const staffIds = (counter.assignedStaff || []).map((id) => String(id._id || id));
    const isAuthorized =
      req.user.role === 'admin' ||
      staffIds.includes(String(req.user._id)) ||
      counter.department === req.user.department;

    assert(isAuthorized, 'Counter is not assigned to you or your department', 403);
    assert(['available', 'busy', 'offline'].includes(req.body.status), 'Invalid counter status');

    counter.status = req.body.status;
    await counter.save();
    ok(res, 'Counter status updated', { counter });
  } catch (e) {
    next(e);
  }
};
