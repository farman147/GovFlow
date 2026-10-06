import jwt from 'jsonwebtoken'; import User from '../models/User.js'; import { ApiError, assert } from '../utils/apiError.js';
const respond = (res, status, message, data) => res.status(status).json({ success: true, message, data });
const sign = user => jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
const publicUser = user => ({
  _id: user._id,
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  department: user.department,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
export const register = async (req, res, next) => { try { const { name, email, password, phone, role, department } = req.body; assert(name && email && password, 'Name, email and password are required'); assert(password.length >= 8, 'Password must contain at least 8 characters');
  const requestedRole = role || 'citizen'; if (requestedRole !== 'citizen' && req.user?.role !== 'admin') throw new ApiError('Only admins can create staff or admin accounts', 403); const user = await User.create({ name, email, password, phone, role: requestedRole, department }); respond(res, 201, 'Account created', { user: publicUser(user), token: sign(user) }); } catch(e) { next(e); } };
export const login = async (req, res, next) => { try { const { email, password } = req.body; assert(email && password, 'Email and password are required'); const user = await User.findOne({ email: email.toLowerCase() }).select('+password'); if (!user || !(await user.matchesPassword(password))) throw new ApiError('Invalid email or password', 401); respond(res, 200, 'Login successful', { user: publicUser(user), token: sign(user) }); } catch(e) { next(e); } };
export const me = async (req, res) => respond(res, 200, 'User retrieved', { user: publicUser(req.user) });
export const updateProfile = async (req, res, next) => { try { const allowed = ['name','phone']; for (const key of allowed) if (req.body[key] !== undefined) req.user[key] = req.body[key]; await req.user.save(); respond(res, 200, 'Profile updated', { user: publicUser(req.user) }); } catch(e) { next(e); } };
