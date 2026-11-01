import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  foodType: { type: String, enum: ['VEG', 'NON_VEG'], required: true },
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

schema.index({ restaurant: 1, foodType: 1 });
schema.index({ name: 1, restaurant: 1 }, { unique: true });

export default mongoose.model('FoodItem', schema);

