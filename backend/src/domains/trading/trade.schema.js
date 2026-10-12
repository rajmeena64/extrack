const { z } = require('zod');

const createTradeSchema = z.object({
  symbol: z.string().trim().min(1).max(64),
  side: z.enum(['BUY', 'SELL', 'buy', 'sell', 'long', 'short', 'LONG', 'SHORT']),
  quantity: z.number().positive(),
  entryPrice: z.number().positive(),
  exitPrice: z.number().positive().optional().nullable(),
  entryTimestamp: z.string().min(1),
  exitTimestamp: z.string().optional().nullable(),
  brokerConnectionId: z.string().uuid().optional().nullable(),
  stopLoss: z.number().positive().optional().nullable(),
  takeProfit: z.number().positive().optional().nullable(),
  totalCharges: z.number().min(0).optional(),
  pnlCurrency: z.string().length(3).optional(),
  productType: z.string().optional(),
  category: z.string().optional(),
  strategy: z.string().max(120).optional().nullable(),
  notes: z.string().optional().nullable(),
  uniqueId: z.string().max(120).optional()
});

const bulkTradeSchema = z.object({
  brokerConnectionId: z.string().uuid().optional().nullable(),
  trades: z.array(createTradeSchema).min(1).max(500)
});

const updateTradeSchema = z.object({
  entryPrice: z.number().positive().optional(),
  exitPrice: z.number().positive().optional().nullable(),
  quantity: z.number().positive().optional(),
  stopLoss: z.number().positive().optional().nullable(),
  takeProfit: z.number().positive().optional().nullable(),
  strategy: z.string().max(120).optional().nullable(),
  notes: z.string().optional().nullable(),
  totalCharges: z.number().min(0).optional()
});

const breakevenDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isBreakeven: z.boolean()
});

const updateNotesSchema = z.object({
  notes: z.string().nullable()
});

module.exports = {
  createTradeSchema,
  bulkTradeSchema,
  updateTradeSchema,
  breakevenDaySchema,
  updateNotesSchema
};
