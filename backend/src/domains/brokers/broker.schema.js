const { z } = require('zod');

const listBrokersQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  popularOnly: z.enum(['true', 'false']).transform((v) => v === 'true').optional()
});

const createConnectionSchema = z.object({
  integrationId: z.string().uuid(),
  accountName: z.string().trim().min(1).max(64),
  externalAccountId: z.string().trim().max(180).optional(),
  metadata: z.record(z.any()).optional()
});

const updateConnectionSchema = z.object({
  accountName: z.string().trim().min(1).max(64).optional(),
  metadata: z.record(z.any()).optional()
});

module.exports = {
  listBrokersQuerySchema,
  createConnectionSchema,
  updateConnectionSchema
};

