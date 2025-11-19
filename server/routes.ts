import type { Express } from "express";
import { createServer, type Server } from "http";
import { promises as fs } from "fs";
import path from "path";
import { queryRequestSchema, type DrugIndexEntry, type DrugLabel, type ReadabilityScore } from "@shared/schema";
import { queryLabel } from "./rag";
import { calculateReadability } from "./readability";

// Cache for labels and readability scores
let drugIndex: DrugIndexEntry[] | null = null;
let readabilityScores: ReadabilityScore[] | null = null;

async function loadDrugIndex(): Promise<DrugIndexEntry[]> {
  if (drugIndex) return drugIndex;
  
  const indexPath = path.join(process.cwd(), 'data', 'drug-index.json');
  const content = await fs.readFile(indexPath, 'utf-8');
  drugIndex = JSON.parse(content);
  return drugIndex;
}

async function loadLabel(labelId: string): Promise<DrugLabel> {
  const index = await loadDrugIndex();
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

  const httpServer = createServer(app);

  return httpServer;
}
