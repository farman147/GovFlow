import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Server } from 'socket.io';
import { connectDatabase } from './config/db.js';
import { apiLimiter } from './middleware/rateLimitMiddleware.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import tokenRoutes from './routes/tokenRoutes.js';
import counterRoutes from './routes/counterRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import staffRoutes from './routes/staffRoutes.js';
import predictionRoutes from './routes/predictionRoutes.js';
import assistantRoutes from './routes/assistantRoutes.js';

const app = express();
const server = http.createServer(app);
const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (process.env.NODE_ENV === 'production') {
    const configuredOrigins = (process.env.CLIENT_URL || '').split(',').map((x) => x.trim()).filter(Boolean);
    return configuredOrigins.includes(origin);
  }
  // Allow any localhost, 127.0.0.1, IPv6 loopback, or private local network IP
  if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin)) {
    return true;
  }
  const configuredOrigins = (process.env.CLIENT_URL || 'http://localhost:3000,http://localhost:3003,http://localhost:3004,http://localhost:5173').split(',').map((x) => x.trim()).filter(Boolean);
  return configuredOrigins.includes(origin) || true;
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

const io = new Server(server, { cors: corsOptions });
app.set('io', io);

io.on('connection', (socket) => {
  socket.on('joinServiceQueue', (serviceId) => {
    if (typeof serviceId === 'string') socket.join(`service:${serviceId}`);
  });
  socket.on('leaveServiceQueue', (serviceId) => socket.leave(`service:${serviceId}`));
});

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors(corsOptions));
app.use(express.json({ limit: '50kb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api', apiLimiter);

app.get('/', (req, res) => res.json({ message: 'GovFlow backend is running' }));
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/counters', counterRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/assistant', assistantRoutes);

app.use(notFound);
app.use(errorHandler);

const start = async () => {
  try {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
    await connectDatabase();
    const port = process.env.PORT || 5000;
    server.listen(port, '0.0.0.0', () => console.log(`GovFlow listening on port ${port}`));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

start();
