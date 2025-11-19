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

function extractSafetyInsights(labelText: string, question: string) {
  const lowerLabel = labelText.toLowerCase();
  const lowerQuestion = question.toLowerCase();
  
  // Detect boxed warning
  const hasBoxedWarning = /boxed warning|black box|contraindicated/i.test(labelText);
  
  // Determine risk level based on question and label content
  let riskLevel: "low" | "moderate" | "high" | undefined;
  if (lowerQuestion.includes("warning") || lowerQuestion.includes("serious")) {
    if (hasBoxedWarning || /death|fatal|life-threatening/i.test(labelText)) {
      riskLevel = "high";
    } else if (/severe|serious|significant/i.test(labelText)) {
      riskLevel = "moderate";
    } else {
      riskLevel = "low";
    }
  }
  
  // Extract key contraindications (simplified)
  const contraindications: string[] = [];
  const contraMatch = labelText.match(/contraindications?:?\s*([^.]{20,200})/i);
  if (contraMatch) {
    contraindications.push(contraMatch[1].trim().substring(0, 100));
  }
  
  return {
    hasBoxedWarning,
    riskLevel,
    contraindications: contraindications.length > 0 ? contraindications : undefined,
  };
}

function generateFollowUpQuestions(question: string): string[] {
  const lowerQ = question.toLowerCase();
  
  if (lowerQ.includes("warning") || lowerQ.includes("precaution")) {
    return [
      "What are the most common side effects?",
      "What drug interactions should I know about?",
      "Who should not take this medication?"
    ];
  } else if (lowerQ.includes("side effect")) {
    return [
      "What are the most serious warnings?",
      "How common are these side effects?",
      "What should I do if I experience side effects?"
    ];
  } else if (lowerQ.includes("interaction")) {
    return [
      "What are the warnings for this drug?",
      "What should I avoid while taking this?",
      "How should I take this medication?"
    ];
  } else if (lowerQ.includes("used for") || lowerQ.includes("indication")) {
    return [
      "What are the dosage guidelines?",
      "How long does treatment typically last?",
      "What are the side effects?"
    ];
  }
  
  return [
    "What are the warnings for this drug?",
    "What are the common side effects?",
    "What is this medication used for?"
  ];
}

export async function queryLabel(
  label: DrugLabel,
  question: string
): Promise<QueryResponse> {
  const startTime = Date.now();
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
    
    // If not found in label, use general knowledge as fallback
    if (response.notFound) {
      console.log('Question not answered by label, using OpenAI general knowledge fallback');
      
      const generalSystemPrompt = `You are a knowledgeable pharmaceutical assistant. Answer questions about medications using your general medical knowledge.

Rules:
1. Provide accurate, evidence-based information
2. Write a clear, plain-language summary (120-160 words)
3. Acknowledge when answering from general knowledge vs. specific drug labels
4. Use accessible language for non-medical audiences
5. Be helpful but remind users to consult healthcare providers for personalized advice`;

      const generalUserPrompt = `Question about ${label.drugName}: ${question}

Please provide a helpful answer based on general pharmaceutical knowledge. Format as JSON:
{
  "summary": "plain language explanation in 120-160 words",
  "canAnswer": true
}

If you cannot provide a reliable answer, respond with:
{
  "summary": "I don't have enough reliable information to answer this question safely.",
  "canAnswer": false
}`;

      try {
        const generalCompletion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: generalSystemPrompt },
            { role: "user", content: generalUserPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.5,
          max_tokens: 800,
        });

        const generalResponse = JSON.parse(generalCompletion.choices[0].message.content || "{}");
        
        if (generalResponse.canAnswer) {
          const responseTime = (Date.now() - startTime) / 1000;
          return {
            evidence: [],
            summary: generalResponse.summary || "",
            labelId: label.labelId,
            drugName: label.drugName,
            disclaimer: "Educational only — not medical advice. Consult your healthcare provider.",
            notFound: false,
            sourceType: "general_knowledge" as const,
            provenance: {
              chunksSearched: chunks.length,
              relevantPassages: 0,
              model: "gpt-4o-mini",
              responseTime,
              fallbackUsed: true,
            },
            followUpQuestions: generateFollowUpQuestions(question),
          };
        }
      } catch (generalError) {
        console.error('Error using general knowledge fallback:', generalError);
      }
    }
    
    const responseTime = (Date.now() - startTime) / 1000;
    const safetyInsights = extractSafetyInsights(label.labelText, question);
    const followUpQuestions = generateFollowUpQuestions(question);
    
    return {
      evidence: response.notFound ? [] : (response.evidence || []),
      summary: response.notFound ? "" : (response.summary || ""),
      labelId: label.labelId,
      drugName: label.drugName,
      disclaimer: "Educational only — not medical advice. Consult your healthcare provider.",
      notFound: response.notFound || false,
      sourceType: response.notFound ? undefined : ("label" as const),
      safetyInsights: response.notFound ? undefined : safetyInsights,
      provenance: response.notFound ? undefined : {
        chunksSearched: chunks.length,
        relevantPassages: relevantChunks.length,
        model: "gpt-4o-mini",
        responseTime,
        fallbackUsed: false,
      },
      followUpQuestions,
    };
  } catch (error) {
    console.error('Error querying OpenAI:', error);
    throw new Error('Failed to generate response');
  }
}
