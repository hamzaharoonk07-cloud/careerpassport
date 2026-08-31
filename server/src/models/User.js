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
    interests: { type: [String], default: [] },

    // Only meaningful for graduates and professionals; students leave it empty
    // rather than being asked to invent something.
    workExperience: {
      type: [
        {
          _id: false,
          title: { type: String, trim: true, maxlength: 120, default: '' },
          organisation: { type: String, trim: true, maxlength: 120, default: '' },
          years: { type: Number, min: 0, max: 60, default: null },
          summary: { type: String, trim: true, maxlength: 400, default: '' },
        },
      ],
      default: [],
    },

    /**
     * Uploaded files: what is on file, not the file itself.
     *
     * The bytes live in the `Upload` collection, keyed by account and kind.
     * These two pairs are the summary the passport page needs without
     * fetching a payload — `*Type` is the verified MIME type and doubles as
     * the "is there one?" flag, `*Name` is what the file was called and is
     * shown, never used to build a path.
     *
     * They were `resumeUrl` and `photoUrl` while uploads were files on disk.
     * Nothing is a URL any more, and a field that lies about what it holds
     * is how the next person writes a path-join against it.
     */
    resumeType: { type: String, trim: true, default: '' },
    resumeName: { type: String, trim: true, default: '' },

    photoType: { type: String, trim: true, default: '' },
    photoName: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

/**
 * What kind of traveller this is.
 *
 * Kept separate from `role`, which is the authorisation gate and only ever
 * holds 'user' or 'admin'. Merging the two would mean every permission check
 * had to know about students, and every new account type would be a chance to
 * accidentally widen access.
 */
export const ACCOUNT_TYPES = ['student', 'graduate', 'professional'];

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
    accountType: { type: String, enum: ACCOUNT_TYPES, default: 'student', index: true },
    profile: { type: profileSchema, default: () => ({}) },

    // Where the user got to in the cinematic journey, so a refresh resumes.
    journeyStage: { type: String, enum: JOURNEY_STAGES, default: 'registered' },
    selectedField: { type: mongoose.Schema.Types.ObjectId, ref: 'CareerField', default: null },
    latestResult: { type: mongoose.Schema.Types.ObjectId, ref: 'QuizResult', default: null },

    refreshTokenVersion: { type: Number, default: 0 },

    /**
     * Password reset.
     *
     * The code is stored hashed, never in plain text — a leaked database
     * should not hand over live reset codes. `attempts` caps guessing: six
     * digits is only a million combinations, which is nothing to a script.
     */
    passwordReset: {
      codeHash: { type: String, default: null, select: false },
      expiresAt: { type: Date, default: null, select: false },
      attempts: { type: Number, default: 0, select: false },
    },
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
