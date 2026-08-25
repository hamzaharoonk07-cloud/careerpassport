import mongoose from 'mongoose';

/** The six train compartments. Small, stable, referenced everywhere. */
const careerFieldSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    icon: { type: String, required: true },           // lucide-style key, drawn as inline SVG
    tagline: { type: String, required: true, trim: true, maxlength: 90 },
    description: { type: String, required: true, trim: true, maxlength: 400 },
    accent: { type: String, required: true },          // hsl string for the compartment glow
    order: { type: Number, default: 0, index: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { transform: (d, r) => { delete r.__v; return r; } } }
);

export default mongoose.model('CareerField', careerFieldSchema);
