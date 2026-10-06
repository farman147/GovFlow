import Appointment from '../models/Appointment.js';
import Counter from '../models/Counter.js';
import GovernmentService from '../models/GovernmentService.js';
import Token from '../models/Token.js';
import { queueDate } from '../utils/generateToken.js';

const ok = (res, message, data, status = 200) =>
  res.status(status).json({ success: true, message, data });

const getAssignedContext = async (user) => {
  let counters = await Counter.find({ assignedStaff: user._id, isActive: true })
    .populate('services', 'name code department averageServiceTime averageServiceDuration estimatedProcessingTime')
    .populate('assignedStaff', 'name email role department')
    .populate('currentToken', 'tokenNumber status service');

  if (!counters.length && user?.department) {
    const departmentCounters = await Counter.find({ department: user.department, isActive: true })
      .populate('services', 'name code department averageServiceTime averageServiceDuration estimatedProcessingTime')
      .populate('assignedStaff', 'name email role department')
      .populate('currentToken', 'tokenNumber status service');

    if (departmentCounters.length) {
      await Counter.updateMany(
        { _id: { $in: departmentCounters.map((counter) => counter._id) } },
        { $addToSet: { assignedStaff: user._id } }
      );

      counters = await Counter.find({ _id: { $in: departmentCounters.map((counter) => counter._id) }, isActive: true })
        .populate('services', 'name code department averageServiceTime averageServiceDuration estimatedProcessingTime')
        .populate('assignedStaff', 'name email role department')
        .populate('currentToken', 'tokenNumber status service');
    }
  }

  let serviceIds = [
    ...new Set(
      counters.flatMap((counter) =>
        (counter.services || []).map((service) => String(service._id || service))
      )
    )
  ];

  if (user?.department) {
    const deptServices = await GovernmentService.find({ department: user.department, isActive: true });
    deptServices.forEach((s) => serviceIds.push(String(s._id)));
    serviceIds = [...new Set(serviceIds)];
  }

  return { counters, serviceIds };
};

export const dashboard = async (req, res, next) => {
  try {
    const { counters, serviceIds } = await getAssignedContext(req.user);
    const date = queueDate();

    const [allTokensForDate, appointmentsBase] = await Promise.all([
      Token.find({ date })
        .populate('service', 'name code department')
        .populate('citizen', 'name email phone')
        .populate('counter', 'counterNumber name department status')
        .sort({ issuedAt: -1 }),
      Appointment.find({})
        .populate('service', 'name code department')
        .populate('citizen', 'name email phone')
        .populate('token', 'tokenNumber status')
        .sort({ appointmentDate: 1, appointmentTime: 1 })
    ]);

    const assignedTokens = allTokensForDate.filter((token) =>
      serviceIds.some((serviceId) => String(serviceId) === String(token.service?._id || token.service)) ||
      (req.user.department && token.service?.department === req.user.department)
    );

    const assignedAppointments = appointmentsBase.filter((appointment) => {
      const matchService = serviceIds.some((serviceId) => String(serviceId) === String(appointment.service?._id || appointment.service));
      const matchDept = req.user.department && appointment.service?.department === req.user.department;
      return matchService || matchDept;
    }).slice(0, 10);

    const summary = assignedTokens.reduce((acc, token) => {
      acc.total += 1;
      if (token.status === 'waiting') acc.waiting += 1;
      if (token.status === 'called') acc.called = (acc.called || 0) + 1;
      if (token.status === 'in_service') acc.serving += 1;
      if (token.status === 'completed') acc.completed += 1;
      if (token.status === 'cancelled') acc.cancelled += 1;
      if (token.status === 'skipped') acc.skipped = (acc.skipped || 0) + 1;
      return acc;
    }, { total: 0, waiting: 0, called: 0, serving: 0, completed: 0, cancelled: 0, skipped: 0 });

    const completedTokens = assignedTokens.filter((token) =>
      token.status === 'completed' && token.calledAt && token.serviceStartedAt && token.completedAt
    );

    const averageWaitingMs = completedTokens.length
      ? completedTokens.reduce((sum, token) => sum + (new Date(token.serviceStartedAt) - new Date(token.calledAt)), 0) / completedTokens.length
      : 0;

    const averageServiceMs = completedTokens.length
      ? completedTokens.reduce((sum, token) => sum + (new Date(token.completedAt) - new Date(token.serviceStartedAt)), 0) / completedTokens.length
      : 0;

    const statusBreakdown = assignedTokens.reduce((acc, token) => {
      acc[token.status] = (acc[token.status] || 0) + 1;
      return acc;
    }, {});

    const recentTokens = assignedTokens.slice(0, 8);

    ok(res, 'Staff dashboard retrieved', {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        department: req.user.department,
        phone: req.user.phone
      },
      counters,
      stats: {
        totalTokens: summary.total,
        waitingTokens: summary.waiting,
        currentlyServing: summary.serving + (summary.called || 0),
        completedTokens: summary.completed,
        cancelledTokens: summary.cancelled,
        averageWaitingTime: averageWaitingMs ? Math.round(averageWaitingMs / 60000) : 0,
        averageServiceTime: averageServiceMs ? Math.round(averageServiceMs / 60000) : 0
      },
      statusBreakdown,
      appointments: assignedAppointments,
      recentTokens
    });
  } catch (error) {
    next(error);
  }
};

export const queue = async (req, res, next) => {
  try {
    const { serviceIds } = await getAssignedContext(req.user);
    const date = queueDate();

    const tokens = await Token.find({ date })
      .populate('service', 'name code department averageServiceTime estimatedProcessingTime')
      .populate('citizen', 'name email phone')
      .populate('counter', 'counterNumber name department status')
      .sort({ issuedAt: 1 });

    const assignedTokens = tokens.filter((token) =>
      serviceIds.some((serviceId) => String(serviceId) === String(token.service?._id || token.service)) ||
      (req.user.department && token.service?.department === req.user.department)
    );

    ok(res, 'Staff queue retrieved', { tokens: assignedTokens });
  } catch (error) {
    next(error);
  }
};

export const appointments = async (req, res, next) => {
  try {
    const { serviceIds } = await getAssignedContext(req.user);

    const appointmentsBase = await Appointment.find({})
      .populate('service', 'name code department')
      .populate('citizen', 'name email phone')
      .populate('token', 'tokenNumber status')
      .sort({ appointmentDate: 1, appointmentTime: 1 });

    const appointments = appointmentsBase.filter((appointment) => {
      const matchService = serviceIds.some((serviceId) => String(serviceId) === String(appointment.service?._id || appointment.service));
      const matchDept = req.user.department && appointment.service?.department === req.user.department;
      return matchService || matchDept;
    });

    ok(res, 'Staff appointments retrieved', { appointments });
  } catch (error) {
    next(error);
  }
};

export const statistics = async (req, res, next) => {
  try {
    const { serviceIds } = await getAssignedContext(req.user);
    const date = queueDate();

    const tokens = await Token.find({ date }).populate('service', 'name code department');
    const assignedTokens = tokens.filter((token) =>
      serviceIds.some((serviceId) => String(serviceId) === String(token.service?._id || token.service))
    );

    const statusMap = assignedTokens.reduce((acc, token) => {
      acc[token.status] = (acc[token.status] || 0) + 1;
      return acc;
    }, {});

    const completedTokens = assignedTokens.filter((token) =>
      token.status === 'completed' && token.calledAt && token.serviceStartedAt && token.completedAt
    );

    const avgWaitMs = completedTokens.length
      ? completedTokens.reduce((sum, token) => sum + (new Date(token.serviceStartedAt) - new Date(token.calledAt)), 0) / completedTokens.length
      : 0;

    const avgServiceMs = completedTokens.length
      ? completedTokens.reduce((sum, token) => sum + (new Date(token.completedAt) - new Date(token.serviceStartedAt)), 0) / completedTokens.length
      : 0;

    ok(res, 'Staff statistics retrieved', {
      totalHandled: assignedTokens.length,
      awaiting: statusMap.waiting || 0,
      completed: statusMap.completed || 0,
      cancelled: statusMap.cancelled || 0,
      skipped: statusMap.skipped || 0,
      averageWaitingTime: avgWaitMs ? Math.round(avgWaitMs / 60000) : 0,
      averageServiceTime: avgServiceMs ? Math.round(avgServiceMs / 60000) : 0
    });
  } catch (error) {
    next(error);
  }
};

export const profile = async (req, res) => {
  ok(res, 'Staff profile retrieved', {
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      department: req.user.department
    }
  });
};

