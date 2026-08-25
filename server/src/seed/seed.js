import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { connectDB, disconnectDB, isMemoryDB } from '../config/db.js';
import {
  User,
  CareerField,
  Career,
  QuizQuestion,
  QuizOption,
  QuizAnswer,
  QuizResult,
  SavedCareer,
} from '../models/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const readJson = async (file) => JSON.parse(await readFile(path.join(__dirname, file), 'utf8'));

/** The six canonical roadmap stages from the brief. Every career uses these titles. */
const ROADMAP_TITLES = ['Learn', 'Build Skills', 'Practice', 'Gain Experience', 'Apply', 'Grow'];

/**
 * Populates the database with fields, careers, the quiz bank and a demo account.
 *
 * Exported rather than run-only, because the in-memory development database
 * lives inside the API process — a separate `npm run seed` process would seed
 * its own throwaway instance. The server calls this on boot when it finds an
 * empty in-memory database.
 */
export async function seedDatabase({ log = console.log } = {}) {
  if (isMemoryDB()) {
    log('\n⚠  Seeding an IN-MEMORY database. It disappears when the server stops.');
    log('   Set MONGO_URI in server/.env to seed a persistent cluster.\n');
  }

  log('🧹  Clearing existing data…');
  await Promise.all([
    CareerField.deleteMany({}),
    Career.deleteMany({}),
    QuizQuestion.deleteMany({}),
    QuizOption.deleteMany({}),
    QuizAnswer.deleteMany({}),
    QuizResult.deleteMany({}),
    SavedCareer.deleteMany({}),
  ]);
  // Users are deliberately NOT wiped — re-seeding content should not delete accounts.

  // ── Career fields ────────────────────────────────────────────────
  const fieldData = await readJson('careerFields.json');
  const fields = await CareerField.insertMany(fieldData);
  const fieldBySlug = new Map(fields.map((f) => [f.slug, f._id]));
  log(`✅  ${fields.length} career fields`);

  // ── Careers ──────────────────────────────────────────────────────
  const careerData = [...(await readJson('careers.part1.json')), ...(await readJson('careers.part2.json'))];

  const careerDocs = careerData.map((c) => {
    const fieldId = fieldBySlug.get(c.field);
    if (!fieldId) throw new Error(`Career "${c.slug}" references unknown field "${c.field}"`);

    return {
      ...c,
      field: fieldId,
      // The seed stores six roadmap strings; the model wants {stage, title, detail}.
      roadmap: c.roadmap.map((detail, i) => ({ stage: i + 1, title: ROADMAP_TITLES[i], detail })),
    };
  });

  const careers = await Career.insertMany(careerDocs);
  log(`✅  ${careers.length} careers`);

  // ── Related careers: everything else in the same field ───────────
  const byField = new Map();
  for (const c of careers) {
    const key = String(c.field);
    if (!byField.has(key)) byField.set(key, []);
    byField.get(key).push(c);
  }
  await Promise.all(
    careers.map((c) => {
      const siblings = byField
        .get(String(c.field))
        .filter((s) => !s._id.equals(c._id))
        .slice(0, 4)
        .map((s) => s._id);
      return Career.updateOne({ _id: c._id }, { related: siblings });
    })
  );
  log('✅  related careers linked');

  // ── Quiz ─────────────────────────────────────────────────────────
  const questionData = await readJson('questions.json');
  let optionCount = 0;

  for (const q of questionData) {
    const question = await QuizQuestion.create({
      order: q.order,
      prompt: q.prompt,
      dimension: q.dimension,
      helper: q.helper || '',
      options: [],
    });

    const options = await QuizOption.insertMany(
      q.options.map((o, i) => ({
        question: question._id,
        key: o.key,
        label: o.label,
        order: i,
        fieldWeights: o.fieldWeights || {},
        riasec: o.riasec || {},
      }))
    );

    question.options = options.map((o) => o._id);
    await question.save();
    optionCount += options.length;
  }
  log(`✅  ${questionData.length} questions, ${optionCount} options`);

  // ── Demo account ─────────────────────────────────────────────────
  // Judges should never land on an empty state. This is a real account
  // with a real hashed password, created through the same path as any user.
  const demoEmail = 'demo@pathseeker.app';
  let demo = await User.findOne({ email: demoEmail });
  if (!demo) {
    demo = await User.create({
      name: 'Demo Traveller',
      email: demoEmail,
      passwordHash: await User.hashPassword('demo1234'),
      profile: { education: 'BS Computer Science', location: 'Karachi' },
    });
    log(`✅  demo account created — ${demoEmail} / demo1234`);
  } else {
    log(`ℹ️   demo account already exists — ${demoEmail}`);
  }

  // ── Admin account ────────────────────────────────────────────────
  // Without one, the admin panel exists but nobody can open it.
  const adminEmail = 'admin@pathseeker.app';
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({
      name: 'Pass Seeker Admin',
      email: adminEmail,
      passwordHash: await User.hashPassword('admin1234'),
      role: 'admin',
    });
    log(`✅  admin account created — ${adminEmail} / admin1234`);
  } else {
    if (admin.role !== 'admin') { admin.role = 'admin'; await admin.save(); }
    log(`ℹ️   admin account already exists — ${adminEmail}`);
  }

  // ── Summary ──────────────────────────────────────────────────────
  const withSalary = careers.filter((c) => c.salary?.entry != null).length;
  log('\n────────────────────────────────');
  log(`  fields            ${fields.length}`);
  log(`  careers           ${careers.length}  (${withSalary} with salary data, ${careers.length - withSalary} without)`);
  log(`  quiz questions    ${questionData.length}`);
  log(`  quiz options      ${optionCount}`);
  log(`  users preserved   ${await User.countDocuments()}`);
  log('────────────────────────────────\n');

  return { fields: fields.length, careers: careers.length, questions: questionData.length };
}

/** CLI entry: `npm run seed`. Connects, seeds, disconnects. */
const runDirectly = process.argv[1] && process.argv[1].endsWith('seed.js');
if (runDirectly) {
  try {
    await connectDB();
    await seedDatabase();
    await disconnectDB();
  } catch (err) {
    console.error('✖  Seed failed:', err);
    await disconnectDB().catch(() => {});
    process.exit(1);
  }
}
