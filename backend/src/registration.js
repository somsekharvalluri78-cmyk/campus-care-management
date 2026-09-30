import { z } from 'zod';

export const studentRegistrationSchema = z.object({
  studentId: z.string().trim().min(3).max(80).regex(/^[A-Za-z0-9-]+$/, 'Student ID can contain only letters, numbers, and hyphens.').transform((value) => value.toUpperCase()),
  fullName: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(128).regex(/[a-z]/, 'Password must include a lowercase letter.').regex(/[A-Z]/, 'Password must include an uppercase letter.').regex(/[0-9]/, 'Password must include a number.'),
  departmentId: z.coerce.number().int().positive(),
  year: z.coerce.number().int().min(1).max(8),
  section: z.string().trim().min(1).max(20),
  phone: z.string().trim().max(30).optional().default(''),
});