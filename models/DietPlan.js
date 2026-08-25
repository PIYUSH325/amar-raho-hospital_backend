const mongoose = require('mongoose');

const MealSchema = new mongoose.Schema({
  breakfast: { type: String, default: '' },
  lunch: { type: String, default: '' },
  snacks: { type: String, default: '' },
  dinner: { type: String, default: '' }
}, { _id: false });

const DietPlanSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  monday: { type: MealSchema, default: () => ({}) },
  tuesday: { type: MealSchema, default: () => ({}) },
  wednesday: { type: MealSchema, default: () => ({}) },
  thursday: { type: MealSchema, default: () => ({}) },
  friday: { type: MealSchema, default: () => ({}) },
  sunday: { type: MealSchema, default: () => ({}) },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DietPlan', DietPlanSchema);
