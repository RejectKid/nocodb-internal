import { z } from 'zod';

const message = z.string().trim().min(1).max(512).optional();

export const internalValidationRuleSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('required'), message }),
  z.object({
    type: z.literal('minLength'),
    value: z.number().int().min(0).max(1_000_000),
    message,
  }),
  z.object({
    type: z.literal('maxLength'),
    value: z.number().int().min(0).max(1_000_000),
    message,
  }),
  z.object({
    type: z.literal('regex'),
    value: z.string().min(1).max(256),
    flags: z.enum(['', 'i', 'm', 'im']).optional(),
    message,
  }),
  z.object({ type: z.literal('min'), value: z.number(), message }),
  z.object({ type: z.literal('max'), value: z.number(), message }),
  z.object({ type: z.literal('integer'), message }),
  z.object({
    type: z.literal('decimalPrecision'),
    value: z.number().int().min(0).max(20),
    message,
  }),
  z.object({
    type: z.literal('earliestDate'),
    value: z.string().datetime(),
    message,
  }),
  z.object({
    type: z.literal('latestDate'),
    value: z.string().datetime(),
    message,
  }),
  z.object({
    type: z.literal('allowedValues'),
    value: z.array(z.union([z.string(), z.number(), z.boolean()])).max(1_000),
    message,
  }),
  z.object({
    type: z.literal('fileType'),
    value: z.array(z.string().min(1).max(255)).min(1).max(100),
    message,
  }),
  z.object({
    type: z.literal('fileSize'),
    value: z
      .number()
      .int()
      .positive()
      .max(10 * 1024 * 1024 * 1024),
    message,
  }),
  z.object({
    type: z.literal('maxAttachmentCount'),
    value: z.number().int().min(0).max(10_000),
    message,
  }),
]);

export const internalValidationRulesSchema = z
  .array(internalValidationRuleSchema)
  .max(50);

export type InternalValidationRule = z.infer<
  typeof internalValidationRuleSchema
>;

export interface InternalFieldValidationConfiguration {
  id: string;
  workspaceId: string;
  baseId: string;
  modelId: string;
  fieldKey: string;
  rules: InternalValidationRule[];
  revision: number;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface InternalValidationFailure {
  field: string;
  rule: InternalValidationRule['type'];
  message: string;
}
