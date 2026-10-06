import mongoose from 'mongoose';
import { generateConfirmationCode } from '../utils/generateToken.js';

const schema = new mongoose.Schema(
  {
    citizen: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'GovernmentService', required: true },
    applicantName: { type: String, trim: true },
    phone: { type: String, trim: true },
    notes: { type: String, trim: true },
    appointmentDate: { type: Date, required: true, index: true },
    appointmentTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    status: {
      type: String,
      enum: ['scheduled', 'checked_in', 'completed', 'cancelled', 'no_show'],
      default: 'scheduled'
    },
    confirmationCode: { type: String, unique: true, default: generateConfirmationCode },
    token: { type: mongoose.Schema.Types.ObjectId, ref: 'Token' }
  },
  { timestamps: true }
);

schema.index({ citizen: 1, appointmentDate: -1 });

export default mongoose.model('Appointment', schema);
