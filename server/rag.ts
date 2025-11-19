import OpenAI from "openai";
import type { DrugLabel, QueryResponse } from "@shared/schema";

// Using Replit's AI Integrations service for OpenAI access (no API key required, billed to credits)
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

interface LabelChunk {
  text: string;
  startIndex: number;
  endIndex: number;
}

function chunkText(text: string, chunkSize: number = 1500, overlap: number = 200): LabelChunk[] {
  const chunks: LabelChunk[] = [];
  let startIndex = 0;
  
  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + chunkSize, text.length);
    const chunkText = text.substring(startIndex, endIndex);
    
    chunks.push({
      text: chunkText,
      startIndex,
      endIndex,
    });
    
    startIndex += chunkSize - overlap;
  }
  
  return chunks;
}

function findRelevantChunks(
  chunks: LabelChunk[],
  question: string,
  topK: number = 5
): LabelChunk[] {
  // Extract keywords from question
  const questionLower = question.toLowerCase();
  const keywords = questionLower
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3);
  
  // Score chunks based on keyword presence
  const scoredChunks = chunks.map(chunk => {
    const chunkLower = chunk.text.toLowerCase();
    let score = 0;
    
    keywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const matches = chunkLower.match(regex);
      if (matches) {
        score += matches.length * keyword.length;
      }
    });
    
    // Boost score for chunks containing key sections
    const sectionBoosts = [
      { pattern: /warnings|precautions/i, boost: 50 },
      { pattern: /contraindications/i, boost: 50 },
      { pattern: /adverse reactions|side effects/i, boost: 40 },
      { pattern: /drug interactions/i, boost: 40 },
      { pattern: /dosage|administration/i, boost: 30 },
      { pattern: /indications|usage/i, boost: 30 },
    ];
    
    sectionBoosts.forEach(({ pattern, boost }) => {
      if (pattern.test(chunk.text)) {
        score += boost;
      }
    });
    
    return { chunk, score };
  });
  
  scoredChunks.sort((a, b) => b.score - a.score);
  
  return scoredChunks.slice(0, topK).map(s => s.chunk);
}

export async function queryLabel(
  label: DrugLabel,
  question: string
): Promise<QueryResponse> {
  const chunks = chunkText(label.labelText);
  const relevantChunks = findRelevantChunks(chunks, question);
  
  const context = relevantChunks.map(c => c.text).join('\n\n---\n\n');
  
  const systemPrompt = `You are an expert FDA drug label analyst. Your task is to answer questions about prescription medications using ONLY information from the official FDA label provided.

Rules:
1. Extract 1-3 verbatim quotes from the label that directly address the question
2. Write a plain-language summary (120-160 words) explaining the answer
3. If the label doesn't contain relevant information, set notFound to true
4. Be precise and cite exact text when making claims
5. Use clear, accessible language in the summary
6. Only include information explicitly stated in the provided text`;

  const userPrompt = `Question: ${question}

FDA Label Context:
${context}

Please provide your response in the following JSON format:
{
  "evidence": ["quote 1", "quote 2"],
  "summary": "plain language explanation in 120-160 words",
  "notFound": false
}

If the label doesn't address the question, respond with:
{
  "evidence": [],
  "summary": "",
  "notFound": true
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1000,
    });

    const response = JSON.parse(completion.choices[0].message.content || "{}");
    
    return {
      evidence: response.notFound ? [] : (response.evidence || []),
      summary: response.notFound ? "" : (response.summary || ""),
      labelId: label.labelId,
      drugName: label.drugName,
      disclaimer: "Educational only — not medical advice. Consult your healthcare provider.",
      notFound: response.notFound || false,
    };
  } catch (error) {
    console.error('Error querying OpenAI:', error);
    throw new Error('Failed to generate response');
  }
}
