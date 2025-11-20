/**
 * Denodo AI SDK Integration
 * Uses Denodo's AI SDK REST API which internally calls AWS Bedrock
 * 
 * Note: SSL certificate verification is disabled in server/index.ts
 * to support Denodo Agora instances with self-signed certificates.
 */

import https from 'https';

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  message: string;
  model: string;
  responseTime: number;
  source: string;
}

export interface DenodoAIResponse {
  answer?: string;
  sql_query?: string;
  query_explanation?: string;
  execution_result?: any;
  tables_used?: string;
  related_questions?: string[];
  tokens?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  sql_execution_time?: number;
  vector_store_search_time?: number;
  llm_time?: number;
  total_execution_time?: number;
  raw_graph?: string;
  error?: string;
}

/**
 * Format conversation context for Denodo AI SDK
 * Extracts drug/medication names from context and appends to current question
 */
function formatQuestionWithContext(messages: ChatMessage[]): string {
  if (messages.length === 1) {
    return messages[0].content;
  }
  
  const currentQuestion = messages[messages.length - 1].content;
  
  // Find the most recent user message before the current one
  const previousUserMessage = messages.length >= 3 
    ? messages[messages.length - 3]
    : null;
  
  // Extract drug/medication names from previous user question
  // Common patterns: "What is SYMBICORT", "Tell me about LIPITOR", etc.
  const drugNameMatch = previousUserMessage?.content.match(/\b([A-Z][A-Z]+)\b/);
  const drugName = drugNameMatch ? drugNameMatch[1] : null;
  
  // If current question doesn't mention a drug but previous conversation did,
  // append the drug name for context
  if (drugName && !currentQuestion.match(/\b([A-Z][A-Z]+)\b/)) {
    return `${currentQuestion} for ${drugName}`;
  }
  
  // Otherwise, just send the current question as-is
  return currentQuestion;
}

/**
 * Chat with Denodo AI SDK which uses AWS Bedrock internally
 */
export async function chatWithDenodoAI(
  messagesOrQuestion: ChatMessage[] | string,
  vdpDatabaseNames?: string
): Promise<ChatResponse> {
  const startTime = Date.now();
  
  // Format the question with conversation context if messages array provided
  const question = Array.isArray(messagesOrQuestion) 
    ? formatQuestionWithContext(messagesOrQuestion)
    : messagesOrQuestion;

  // Remove trailing slash from endpoint URL to avoid double slashes
  let denodoAIEndpoint = process.env.DENODO_AI_SDK_URL || "http://localhost:8008";
  denodoAIEndpoint = denodoAIEndpoint.replace(/\/$/, '');
  
  const denodoUsername = process.env.DENODO_USERNAME;
  const denodoPassword = process.env.DENODO_PASSWORD;

  if (!denodoUsername || !denodoPassword) {
    throw new Error("Denodo credentials not configured");
  }

  // Create Basic Auth header
  const credentials = Buffer.from(`${denodoUsername}:${denodoPassword}`).toString('base64');
  const authHeader = `Basic ${credentials}`;

  return new Promise((resolve, reject) => {
    try {
      // Build query parameters
      const params = new URLSearchParams({
        question: question,
        verbose: "true", // Get natural language response
      });

      if (vdpDatabaseNames) {
        params.append("vdp_database_names", vdpDatabaseNames);
      }

      const urlPath = `/answerQuestion?${params.toString()}`;
      const urlObj = new URL(denodoAIEndpoint);
      
      console.log(`[Denodo AI SDK] Querying: ${denodoAIEndpoint}${urlPath}`);

      // Configure request options with custom HTTPS agent for self-signed certs
      const options: https.RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlPath,
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
        },
        // Only set agent for HTTPS to handle self-signed certificates
        ...(urlObj.protocol === 'https:' ? {
          agent: new https.Agent({ rejectUnauthorized: false })
        } : {})
      };

      const requester = urlObj.protocol === 'https:' ? https : require('http');
      
      const req = requester.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          const responseTime = (Date.now() - startTime) / 1000;
          
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const data = JSON.parse(responseData) as DenodoAIResponse;
              console.log(`[Denodo AI SDK] Response received in ${responseTime}s`);
              console.log(`[Denodo AI SDK] Answer:`, data.answer);

              resolve({
                message: data.answer || "No response generated",
                model: "Claude via Denodo AI SDK + AWS Bedrock",
                responseTime,
                source: "Denodo AI SDK",
              });
            } catch (parseError) {
              console.error("Error parsing Denodo AI SDK response:", parseError);
              reject(new Error("Failed to parse response from Denodo AI SDK"));
            }
          } else {
            console.error(`Denodo AI SDK error (${res.statusCode}):`, responseData);
            reject(new Error(`Denodo AI SDK error (${res.statusCode}): ${responseData}`));
          }
        });
      });

      req.on('error', (error) => {
        console.error("Error calling Denodo AI SDK:", error);
        reject(new Error("Failed to generate response from Denodo AI SDK"));
      });

      req.end();
    } catch (error) {
      console.error("Error calling Denodo AI SDK:", error);
      reject(new Error("Failed to generate response from Denodo AI SDK"));
    }
  });
}

/**
 * Check if Denodo AI SDK is configured
 */
export function isDenodoAIConfigured(): boolean {
  const endpoint = process.env.DENODO_AI_SDK_URL;
  const username = process.env.DENODO_USERNAME;
  const password = process.env.DENODO_PASSWORD;
  
  return !!(username && password && endpoint);
}

/**
 * Test connection to Denodo AI SDK
 */
export async function testDenodoAIConnection(): Promise<boolean> {
  try {
    const denodoAIEndpoint = process.env.DENODO_AI_SDK_URL || "http://localhost:8008";
    const url = `${denodoAIEndpoint}/docs`;
    
    // Create HTTPS agent that ignores self-signed certificates
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
    
    const response = await fetch(url, {
      // @ts-ignore - Node.js fetch supports agent option
      agent: url.startsWith('https') ? httpsAgent : undefined,
    });
    return response.ok;
  } catch (error) {
    console.error("[Denodo AI SDK] Connection test failed:", error);
    return false;
  }
}
