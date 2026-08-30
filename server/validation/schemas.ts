import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const generateAppSchema = z.object({
  prompt: z
    .string()
    .min(1, 'Le prompt ne peut pas être vide')
    .max(500, 'Le prompt ne peut pas dépasser 500 caractères'),
  vibe: z.string().optional().default('Moderne'),
});

export const conversationMessageSchema = z.object({
  projectId: z
    .string()
    .min(1, 'Le projectId ne peut pas être vide'),
  prompt: z
    .string()
    .min(1, 'Le prompt ne peut pas être vide')
    .max(500, 'Le prompt ne peut pas dépasser 500 caractères'),
  vibe: z.string().optional().default('Moderne'),
  currentHtml: z.string().optional(),
  files: z
    .array(
      z.object({
        name: z.string(),
        type: z.string().optional(),
        content: z.string().optional(),
      })
    )
    .optional(),
  targetFile: z.string().optional(),
  confirmedByUser: z.boolean().optional(),
  rejectPlan: z.boolean().optional(),
  rollbackVersionId: z.string().optional(),
  elementTarget: z.any().optional(),
  preferredProvider: z.string().optional(),
});

export const iterateAppSchema = z.object({
  prompt: z
    .string()
    .min(1, 'Le prompt ne peut pas être vide')
    .max(500, 'Le prompt ne peut pas dépasser 500 caractères'),
  currentHtml: z.string().optional(),
  files: z.array(z.any()).optional(),
  targetFile: z.string().optional(),
  elementTarget: z.any().optional(),
});

/**
 * Express middleware to validate request bodies against Zod schemas
 */
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errorMessages = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return res.status(400).json({
        error: 'Validation échouée : les données fournies sont invalides',
        message: errorMessages.map((e) => e.message).join(', '),
        details: errorMessages,
      });
    }

    req.body = result.data;
    next();
  };
}
