/**
 * Denodo AI SDK Integration
 * Uses Denodo's AI SDK REST API which internally calls AWS Bedrock
 */

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
  natural_language_response?: string;
  execution_result?: any;
  vql_query?: string;
  used_tables?: string[];
  error?: string;
}

/**
 * Chat with Denodo AI SDK which uses AWS Bedrock internally
 */
export async function chatWithDenodoAI(
  question: string,
  vdpDatabaseNames?: string
): Promise<ChatResponse> {
  const startTime = Date.now();

  const denodoAIEndpoint = process.env.DENODO_AI_SDK_URL || "http://localhost:8008";
  const denodoUsername = process.env.DENODO_USERNAME;
  const denodoPassword = process.env.DENODO_PASSWORD;

  if (!denodoUsername || !denodoPassword) {
    throw new Error("Denodo credentials not configured");
  }

  // Create Basic Auth header
  const credentials = Buffer.from(`${denodoUsername}:${denodoPassword}`).toString('base64');
  const authHeader = `Basic ${credentials}`;

  try {
    // Build query parameters
    const params = new URLSearchParams({
      question: question,
      verbose: "true", // Get natural language response
    });

    if (vdpDatabaseNames) {
      params.append("vdp_database_names", vdpDatabaseNames);
    }

    const url = `${denodoAIEndpoint}/answerQuestion?${params.toString()}`;
    
    console.log(`[Denodo AI SDK] Querying: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Denodo AI SDK error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as DenodoAIResponse;
    const responseTime = (Date.now() - startTime) / 1000;

    console.log(`[Denodo AI SDK] Response received in ${responseTime}s`);

    return {
      message: data.natural_language_response || data.execution_result?.toString() || "No response generated",
      model: "Claude via Denodo AI SDK + AWS Bedrock",
      responseTime,
      source: "Denodo AI SDK",
    };
  } catch (error) {
    console.error("Error calling Denodo AI SDK:", error);
    throw new Error("Failed to generate response from Denodo AI SDK");
  }
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
    const response = await fetch(`${denodoAIEndpoint}/docs`);
    return response.ok;
  } catch (error) {
    console.error("[Denodo AI SDK] Connection test failed:", error);
    return false;
  }
}
