import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

const JOURNEY_STAGES = [
  'registered', 'stamped', 'station', 'boarded',
  'field-selected', 'quiz', 'analysed', 'result', 'roadmap', 'complete',
];

const profileSchema = new mongoose.Schema(
  {
    education: { type: String, trim: true, maxlength: 120, default: '' },
    // Optional. Career guidance is useful at any age, so this is never required
    // and never gates anything — it only sharpens the guidance when given.
    age: { type: Number, min: 13, max: 100, default: null },
    currentRole: { type: String, trim: true, maxlength: 120, default: '' },
    location: { type: String, trim: true, maxlength: 120, default: '' },
    skills: { type: [String], default: [] },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 80 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // Never named `password` anywhere in the codebase — the name itself is a guardrail.
    passwordHash: { type: String, required: true, select: false },
    passportNumber: { type: String, unique: true, index: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    profile: { type: profileSchema, default: () => ({}) },

    // Where the user got to in the cinematic journey, so a refresh resumes.
    journeyStage: { type: String, enum: JOURNEY_STAGES, default: 'registered' },
    selectedField: { type: mongoose.Schema.Types.ObjectId, ref: 'CareerField', default: null },
    latestResult: { type: mongoose.Schema.Types.ObjectId, ref: 'QuizResult', default: null },

    refreshTokenVersion: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.passwordHash;
        delete ret.refreshTokenVersion;
        delete ret.__v;
        return ret;
      },
    },
  }
);

/** Passport numbers read like a real document: PS-4KQ2-8317 */
function generatePassportNumber() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 — ambiguous in print
  const block = (n) =>
    Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  return `PS-${block(4)}-${block(4)}`;
}

userSchema.pre('validate', function assignPassportNumber(next) {
  if (!this.passportNumber) this.passportNumber = generatePassportNumber();
  next();
});

userSchema.statics.hashPassword = function hashPassword(plain) {
  return bcrypt.hash(plain, env.bcryptRounds);
};

userSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

export const JOURNEY_STAGE_LIST = JOURNEY_STAGES;
export default mongoose.model('User', userSchema);
