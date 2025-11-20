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

// Safety Insights Schema
export const safetyInsightsSchema = z.object({
  hasBoxedWarning: z.boolean(),
  riskLevel: z.enum(["low", "moderate", "high"]).optional(),
  contraindications: z.array(z.string()).optional(),
  readabilityGrade: z.string().optional(),
});

export type SafetyInsights = z.infer<typeof safetyInsightsSchema>;

// Provenance Trail Schema
export const provenanceSchema = z.object({
  chunksSearched: z.number(),
  relevantPassages: z.number(),
  model: z.string(),
  responseTime: z.number(), // in seconds
  fallbackUsed: z.boolean(),
});

export type Provenance = z.infer<typeof provenanceSchema>;

// Query Response Schema
export const queryResponseSchema = z.object({
  evidence: z.array(z.string()), // Verbatim quotes from FDA label
  summary: z.string(), // 120-160 word plain language summary
  labelId: z.string(),
  drugName: z.string(),
  disclaimer: z.string(),
  notFound: z.boolean().optional(), // True when no relevant text found
  sourceType: z.enum(["label", "general_knowledge"]).optional(), // Where the answer came from
  safetyInsights: safetyInsightsSchema.optional(),
  provenance: provenanceSchema.optional(),
  followUpQuestions: z.array(z.string()).optional(),
});

export type QueryResponse = z.infer<typeof queryResponseSchema>;

// Chat Message Schema
export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

// Chat Request Schema
export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

// Chat Response Schema with Metadata (Option 1, 3, 4)
export const chatResponseSchema = z.object({
  message: z.string(),
  model: z.string(),
  responseTime: z.number(),
  source: z.string(),
  tablesUsed: z.array(z.string()).optional(),
  sqlQuery: z.string().optional(),
  confidence: z.number().optional(),
  executionTime: z.number().optional(),
  timestamp: z.number().optional(),
});

export type ChatResponse = z.infer<typeof chatResponseSchema>;

// Query History Schema (Option 3)
export const queryHistorySchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  question: z.string(),
  answer: z.string(),
  tablesUsed: z.array(z.string()),
  confidence: z.number(),
  timestamp: z.number(),
});

export type QueryHistory = z.infer<typeof queryHistorySchema>;

// User Schema (Option 2 - Auth)
export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  password: z.string(),
});

export type User = z.infer<typeof userSchema>;

export const insertUserSchema = userSchema.omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
