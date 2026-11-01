import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 100 },
  restaurantName: { type: String, trim: true, default: '' },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['SUPERADMIN', 'ADMIN', 'CUSTOMER'], default: 'CUSTOMER' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  accountStatus: { type: String, enum: ['PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'SUSPENDED'], default: 'ACTIVE' }
}, { timestamps: true });

schema.index({ role: 1, accountStatus: 1 });

export default mongoose.model('User', schema);
