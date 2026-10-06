import mongoose from 'mongoose';

export const connectDatabase = async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  mongoose.set('sanitizeFilter', true);
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
};
