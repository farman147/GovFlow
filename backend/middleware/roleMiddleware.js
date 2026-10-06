import { ApiError } from '../utils/apiError.js';
export const authorize = (...roles) => (req, res, next) => roles.includes(req.user.role) ? next() : next(new ApiError('You are not authorized for this action', 403));
