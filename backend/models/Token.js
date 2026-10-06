import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  tokenNumber: { type: String, required: true }, sequence: { type: Number, required: true }, service: { type: mongoose.Schema.Types.ObjectId, ref: 'GovernmentService', required: true }, citizen: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true }, status: { type: String, enum: ['waiting','called','in_service','completed','skipped','cancelled'], default: 'waiting', index: true }, priority: { type: String, enum: ['normal','priority'], default: 'normal' },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' }, counter: { type: mongoose.Schema.Types.ObjectId, ref: 'Counter' }, issuedAt: { type: Date, default: Date.now }, calledAt: Date, serviceStartedAt: Date, completedAt: Date,
  estimatedWaitTime: { type: Number, default: 0 }, notes: { type: String, trim: true, maxlength: 1000 }
}, { timestamps: true });
schema.index({ service: 1, date: 1, sequence: 1 }, { unique: true });
schema.index({ service: 1, date: 1, status: 1, priority: 1, issuedAt: 1 });
schema.index({ citizen: 1, date: -1 });
export default mongoose.model('Token', schema);
