import { z } from 'zod';

export const createTodoSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional()
});

export const updateTodoSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.union([z.literal('pending'), z.literal('done')]).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional().nullable()
});

export const listQuerySchema = z.object({
  q: z.string().optional(),
  status: z.union([z.literal('pending'), z.literal('done')]).optional(),
  priority: z.coerce.number().int().min(1).max(3).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'dueDate', 'priority']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional()
});
