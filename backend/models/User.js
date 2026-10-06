import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^\S+@\S+\.\S+$/ },
  password: { type: String, required: true, minlength: 8, select: false },
  phone: { type: String, trim: true, maxlength: 25 },
  role: { type: String, enum: ['citizen', 'staff', 'admin'], default: 'citizen' },
  department: { type: String, trim: true, maxlength: 100 }
}, { timestamps: true });
schema.pre('save', async function () { if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12); });
schema.methods.matchesPassword = function (password) { return bcrypt.compare(password, this.password); };
export default mongoose.model('User', schema);
