import { z } from 'zod';

const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address'));

// Matches supabase/config.toml minimum_password_length; bcrypt ignores bytes past 72.
const newPassword = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(72, 'Use at most 72 characters');

function withMatchingPasswords<T extends z.ZodType<{ password: string; confirmPassword: string }>>(
  schema: T,
) {
  return schema.refine((v) => v.password === v.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });
}

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
});

export const signUpSchema = withMatchingPasswords(
  z.object({ email, password: newPassword, confirmPassword: z.string() }),
);

export const newPasswordSchema = withMatchingPasswords(
  z.object({ password: newPassword, confirmPassword: z.string() }),
);

export const emailSchema = z.object({ email });

export const codeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code from the email'),
});
