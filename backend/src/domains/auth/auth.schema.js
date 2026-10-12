const { z } = require('zod');

const emailSchema = z.string().trim().email().toLowerCase();
const passwordSchema = z.string().min(8).max(128);
const phoneSchema = z.string().trim().regex(/^\+?[1-9]\d{7,14}$/).optional().nullable();

const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().max(80).optional().nullable(),
  phone: phoneSchema,
  preferred_currency: z.string().trim().length(3).optional()
});

const loginSchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1).max(128)
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema
});

const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().max(80).optional().nullable(),
  email: emailSchema.optional(),
  phone: phoneSchema,
  password: passwordSchema.optional(),
  preferred_currency: z.string().trim().length(3).optional()
});

const forgotPasswordSchema = z.object({
  email: emailSchema
});

const resetPasswordSchema = z.object({
  email: emailSchema,
  otp: z.string().trim().length(6),
  newPassword: passwordSchema
});

module.exports = {
  signupSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema
};
