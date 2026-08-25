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
    })
    .optional(),
});
