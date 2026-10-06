import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, match: /^[A-Z0-9-]{2,12}$/ },
  department: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  requiredDocuments: [{ type: String, trim: true }],
  eligibility: [{ type: String, trim: true }],
  fee: { type: mongoose.Schema.Types.Mixed, default: null },
  operatingHours: { type: mongoose.Schema.Types.Mixed, default: null },
  estimatedProcessingTime: { type: Number, min: 1, default: 7 },
  averageServiceTime: { type: Number, min: 1, default: 7 },
  averageServiceDuration: { type: Number, min: 1 },
  isActive: { type: Boolean, default: true },
  availableCounters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Counter' }],
  assignedStaff: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });
export default mongoose.model('GovernmentService', schema);
