import type { Express } from "express";
import { createServer, type Server } from "http";
import { promises as fs } from "fs";
import path from "path";
import { queryRequestSchema, chatRequestSchema, type DrugIndexEntry, type DrugLabel, type ReadabilityScore } from "@shared/schema";
import { queryLabel } from "./rag";
import { calculateReadability } from "./readability";
import { createDenodoClient } from "./denodo";
import { chatWithDenodoAI, isDenodoAIConfigured, type ChatMessage } from "./bedrock";

// Cache for labels and readability scores
let drugIndex: DrugIndexEntry[] | null = null;
let readabilityScores: ReadabilityScore[] | null = null;

// Initialize Denodo client (will be null if credentials not configured)
const denodoClient = createDenodoClient();

// Test Denodo connection on startup
if (denodoClient) {
  denodoClient.testConnection().then(success => {
    if (success) {
      console.log('✅ Connected to Denodo Agora successfully');
    } else {
      console.warn('⚠️ Denodo connection test failed, falling back to local files');
    }
  }).catch(error => {
    console.error('❌ Denodo connection error:', error);
  });
}

async function loadDrugIndexFromLocal(): Promise<DrugIndexEntry[]> {
  const indexPath = path.join(process.cwd(), 'data', 'drug-index.json');
  const content = await fs.readFile(indexPath, 'utf-8');
  return JSON.parse(content);
}

async function loadDrugIndex(): Promise<DrugIndexEntry[]> {
  if (drugIndex) return drugIndex;
  
  // Try Denodo first if available
  if (denodoClient) {
    try {
      console.log('[Data Source] Fetching drug index from Denodo Agora...');
      drugIndex = await denodoClient.getDrugIndex();
      console.log(`[Data Source] ✅ Loaded ${drugIndex.length} drugs from Denodo`);
      return drugIndex;
    } catch (error) {
      console.error('[Data Source] Error loading from Denodo, falling back to local files:', error);
    }
  }
  
  // Fallback to local files
  console.log('[Data Source] Using local drug index files');
  drugIndex = await loadDrugIndexFromLocal();
  return drugIndex;
}

async function loadLabelFromLocal(labelId: string): Promise<DrugLabel> {
  const index = await loadDrugIndexFromLocal();
  const drug = index.find(d => d.labelId === labelId);
  
  if (!drug) {
    throw new Error(`Drug with labelId ${labelId} not found`);
  }
  
  const labelPath = path.join(process.cwd(), 'data', 'labels', `${labelId}.txt`);
  const labelText = await fs.readFile(labelPath, 'utf-8');
  
  return {
    ...drug,
    labelText,
  };
}

async function loadLabel(labelId: string): Promise<DrugLabel> {
  // Try Denodo first if available
  if (denodoClient) {
    try {
      console.log(`[Data Source] Fetching label ${labelId} from Denodo Agora...`);
      const label = await denodoClient.getDrugLabel(labelId);
      console.log(`[Data Source] ✅ Loaded ${label.drugName} from Denodo`);
      return label;
    } catch (error) {
      console.error(`[Data Source] Error loading label ${labelId} from Denodo, falling back to local files:`, error);
    }
  }
  
  // Fallback to local files
  console.log(`[Data Source] Using local file for label ${labelId}`);
  return loadLabelFromLocal(labelId);
}

async function calculateAllReadability(): Promise<ReadabilityScore[]> {
  if (readabilityScores) return readabilityScores;
  
  const index = await loadDrugIndex();
  const scores: ReadabilityScore[] = [];
  
  for (const drug of index) {
    try {
      const label = await loadLabel(drug.labelId);
      const score = calculateReadability(
        label.labelId,
        label.drugName,
        label.labelText,
        label.snapshotDate
      );
      scores.push(score);
    } catch (error) {
      console.error(`Error calculating readability for ${drug.labelId}:`, error);
    }
  }
  
  readabilityScores = scores;
  return scores;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // GET /api/drugs - Return drug index for dropdown
  app.get("/api/drugs", async (req, res) => {
    try {
      const index = await loadDrugIndex();
      res.json(index);
    } catch (error) {
      console.error('Error loading drug index:', error);
      res.status(500).json({ error: 'Failed to load drug index' });
    }
  });

  // POST /api/query - Query a drug label using RAG
  app.post("/api/query", async (req, res) => {
    try {
      const validation = queryRequestSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }
      
      const { labelId, question } = validation.data;
      
      const label = await loadLabel(labelId);
      const response = await queryLabel(label, question);
      
      res.json(response);
    } catch (error) {
      console.error('Error processing query:', error);
      res.status(500).json({ error: 'Failed to process query' });
    }
  });

  // GET /api/readability - Return readability scores for all drugs
  app.get("/api/readability", async (req, res) => {
    try {
      const scores = await calculateAllReadability();
      res.json(scores);
    } catch (error) {
      console.error('Error calculating readability:', error);
      res.status(500).json({ error: 'Failed to calculate readability scores' });
    }
  });

  // GET /api/download-label/:labelId - Download label text file
  app.get("/api/download-label/:labelId", async (req, res) => {
    try {
      const { labelId } = req.params;
      const label = await loadLabel(labelId);
      
      const filename = `${label.drugName.replace(/[^a-z0-9]/gi, '_')}_Label.txt`;
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(label.labelText);
    } catch (error) {
      console.error('Error downloading label:', error);
      res.status(500).json({ error: 'Failed to download label' });
    }
  });

  // POST /api/chat - Chat with AI assistant using Denodo AI SDK (which uses AWS Bedrock)
  app.post("/api/chat", async (req, res) => {
    try {
      const validation = chatRequestSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }
      
      const { messages } = validation.data;

      // Check if Denodo AI SDK is configured
      if (!isDenodoAIConfigured()) {
        return res.status(503).json({ 
          error: 'Denodo AI SDK is not configured. Please set DENODO_AI_SDK_URL, DENODO_USERNAME, and DENODO_PASSWORD environment variables.' 
        });
      }

      // Get the last user message as the question
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      if (!lastUserMessage) {
        return res.status(400).json({ error: 'No user message found' });
      }

      // Call Denodo AI SDK with the question
      // Denodo AI SDK will use its configured Bedrock integration
      const response = await chatWithDenodoAI(
        lastUserMessage.content,
        "jl_verboomen" // Query against your Denodo database
      );
      
      res.json(response);
    } catch (error) {
      console.error('Error processing chat:', error);
      res.status(500).json({ error: 'Failed to process chat request' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
