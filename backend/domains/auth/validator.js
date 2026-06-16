const { z } = require('zod');

const emailSchema = z
  .string()
  .trim()
  .min(3)
  .max(254)
  .email()
  .transform((value) => value.toLowerCase());

const nameSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[\p{L} .'-]+$/u, 'Name contains unsupported characters')
  .transform((value) => value.replace(/\s+/g, ' '));

const mobileSchema = z
  .union([
    z.literal(''),
    z.undefined(),
    z.null(),
    z.string().trim().regex(/^\+[1-9]\d{7,14}$/, 'Use E.164 format, for example +919876543210'),
  ])
  .transform((value) => {
    if (!value) return null;
    return String(value).trim();
  });

const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters long')
  .max(128, 'Password is too long');

const tokenSchema = z.string().trim().min(32).max(512);

const signupSchema = z
  .object({
    name: nameSchema.optional(),
    firstName: nameSchema.optional(),
    lastName: z.string().trim().max(80).optional().nullable(),
    email: emailSchema,
    mobile: mobileSchema.optional(),
    phone: mobileSchema.optional(),
    password: passwordSchema,
    confirmPassword: z.string().min(1),
    preferred_currency: z.string().trim().length(3).optional(),
  })
  .strict()
  .refine((value) => value.name || value.firstName, {
    message: 'Name is required',
    path: ['name'],
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
}).strict();

const emailOnlySchema = z.object({
  email: emailSchema,
}).strict();

const resetPasswordSchema = z
  .object({
    token: tokenSchema,
    password: passwordSchema.optional(),
    newPassword: passwordSchema.optional(),
    confirmPassword: z.string().min(1),
  })
  .strict()
  .refine((value) => (value.password || value.newPassword) === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1),
  })
  .strict()
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

function parseBody(schema, body) {
  const result = schema.safeParse(body);
  if (result.success) return { data: result.data };

  const firstIssue = result.error.issues[0];
  return {
    error: firstIssue?.message || 'Invalid request body',
    field: firstIssue?.path?.[0],
  };
}

module.exports = {
  changePasswordSchema,
  emailOnlySchema,
  loginSchema,
  parseBody,
  resetPasswordSchema,
  signupSchema,
  tokenSchema,
};
