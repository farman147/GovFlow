import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  counterNumber: { type: String, required: true, unique: true, trim: true }, name: { type: String, required: true, trim: true }, department: { type: String, required: true, trim: true, index: true },
  services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'GovernmentService' }], assignedStaff: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['available','busy','offline'], default: 'available' }, currentToken: { type: mongoose.Schema.Types.ObjectId, ref: 'Token' }, isActive: { type: Boolean, default: true }
}, { timestamps: true });
export default mongoose.model('Counter', schema);
