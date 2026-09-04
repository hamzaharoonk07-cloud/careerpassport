import { z } from 'zod';

const email = z
  .string({ required_error: 'Email is required' })
  .trim()
  .toLowerCase()
  .email('That does not look like a valid email address');

/**
 * Password policy: length over character-class gymnastics.
 * Forcing a symbol and a digit produces "Password1!" — this asks for
 * something longer instead, which is genuinely harder to guess.
 */
const password = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long');

export const registerSchema = z
  .object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(2, 'Please enter your full name')
      .max(80, 'That name is too long'),
    email,
    password,
    confirmPassword: z.string({ required_error: 'Please confirm your password' }),
    // Passport details. Optional so a user is never blocked from registering,
    // but collected up front because the passport page has room for them.
    education: z.string().trim().max(120).optional().or(z.literal('')),
    age: z.coerce
      .number()
      .int('Age must be a whole number')
      .min(13, 'You must be at least 13')
      .max(100, 'Please enter a valid age')
      .optional()
      .nullable(),

    // Which of the three kinds of traveller this is. Defaulted rather than
    // required so an older client, or a request that omits it, still
    // registers — the account is simply treated as a student until they say
    // otherwise on their profile.
    accountType: z.enum(['student', 'graduate', 'professional']).default('student'),

    // The rest of the passport, asked for at the desk rather than left for
    // the visitor to find on their profile later. All optional, for the same
    // reason as education above: nothing here is worth blocking a
    // registration over.
    currentRole: z.string().trim().max(120).optional().or(z.literal('')),
    location: z.string().trim().max(120).optional().or(z.literal('')),

    // Sent as free text from the form and split on commas, the same way the
    // profile page does it, so the two entry points agree.
    skills: z.array(z.string().trim().min(1).max(60)).max(40).optional(),
    interests: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email,
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  profile: z
    .object({
      education: z.string().trim().max(120).optional(),
      currentRole: z.string().trim().max(120).optional(),
      age: z.coerce.number().int().min(13).max(100).optional().nullable(),
      location: z.string().trim().max(120).optional(),
      skills: z.array(z.string().trim().min(1).max(60)).max(40).optional(),
      interests: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
      workExperience: z
        .array(
          z.object({
            title: z.string().trim().max(120).optional().or(z.literal('')),
            organisation: z.string().trim().max(120).optional().or(z.literal('')),
            years: z.coerce.number().min(0).max(60).optional().nullable(),
            summary: z.string().trim().max(400).optional().or(z.literal('')),
          })
        )
        .max(10)
        .optional(),
    })
    .optional(),

  // Travellers can correct this later — someone who registered as a student
  // and has since graduated should not need a new account.
  accountType: z.enum(['student', 'graduate', 'professional']).optional(),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    email,
    code: z
      .string({ required_error: 'Enter the code from your email' })
      .trim()
      .regex(/^\d{6}$/, 'The code is six digits'),
    password,
    confirmPassword: z.string({ required_error: 'Please confirm your password' }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
