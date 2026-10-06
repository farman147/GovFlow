import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApiError } from '../utils/apiError.js';

export const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new ApiError('Authentication required', 401);
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) throw new ApiError('User no longer exists', 401);
    req.user = user;
    next();
  } catch (error) {
    next(error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' ? new ApiError('Invalid or expired token', 401) : error);
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
      const user = await User.findById(payload.id);
      if (user) req.user = user;
    }
  } catch {
    // Ignore invalid tokens for optional authentication
  }
  next();
};
