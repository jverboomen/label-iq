import { z } from "zod";

// Drug Label Schema
export const drugLabelSchema = z.object({
  labelId: z.string(),
  drugName: z.string(),
  snapshotDate: z.string(),
  labelText: z.string(),
});

export type DrugLabel = z.infer<typeof drugLabelSchema>;

// Drug Index Entry (for dropdown)
export const drugIndexEntrySchema = z.object({
  labelId: z.string(),
  drugName: z.string(),
  snapshotDate: z.string(),
  logoPath: z.string().optional(),
});

export type DrugIndexEntry = z.infer<typeof drugIndexEntrySchema>;

// Readability Score Schema
export const readabilityScoreSchema = z.object({
  labelId: z.string(),
  drugName: z.string(),
  fleschReadingEase: z.number(),
  fleschKincaidGrade: z.number(),
  smog: z.number(),
  composite: z.number(), // 0-100 composite score
  wordCount: z.number(),
  snapshotDate: z.string(),
});

export type ReadabilityScore = z.infer<typeof readabilityScoreSchema>;

// Query Request Schema
export const queryRequestSchema = z.object({
  labelId: z.string(),
  question: z.string().min(10, "Question must be at least 10 characters"),
});

export type QueryRequest = z.infer<typeof queryRequestSchema>;

// Query Response Schema
export const queryResponseSchema = z.object({
  evidence: z.array(z.string()), // Verbatim quotes from FDA label
  summary: z.string(), // 120-160 word plain language summary
  labelId: z.string(),
  drugName: z.string(),
  disclaimer: z.string(),
  notFound: z.boolean().optional(), // True when no relevant text found
});

export type QueryResponse = z.infer<typeof queryResponseSchema>;
