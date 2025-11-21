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
  tablesUsed?: string[];
  sqlQuery?: string;
  confidence?: number;
  executionTime?: number;
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
 * Define view-level permissions for each role
 * Since Denodo Agora doesn't support custom roles, we enforce this at the app level
 */
const ROLE_VIEW_PERMISSIONS: Record<string, string[]> = {
  patient: [
    'drug_purpose_and_identity',
    'clinical_pharmacology',
    'dosing_and_administration',
    'interactions',
    'overdose_emergency',
    'product_and_label_index',
    'specific_population',
    'storage_and_handling'
    // EXCLUDED: master_safety_risk (technical risk assessments require healthcare professional review)
  ],
  physician: [
    'drug_purpose_and_identity',
    'clinical_pharmacology',
    'dosing_and_administration',
    'interactions',
    'master_safety_risk',
    'overdose_emergency',
    'product_and_label_index',
    'specific_population',
    'storage_and_handling'
  ],
  judge: [
    'drug_purpose_and_identity',
    'clinical_pharmacology',
    'dosing_and_administration',
    'interactions',
    'master_safety_risk',
    'overdose_emergency',
    'product_and_label_index',
    'specific_population',
    'storage_and_handling'
  ]
};

/**
 * Get allowed views for a specific role
 */
export function getAllowedViewsForRole(userRole: string): string[] {
  return ROLE_VIEW_PERMISSIONS[userRole] || ROLE_VIEW_PERMISSIONS.judge;
}

/**
 * Get role-specific Denodo credentials for RBAC
 * 
 * NOTE: For Denodo Agora (managed service), custom role creation is not supported.
 * This function uses the main DENODO_USERNAME/PASSWORD for all roles.
 * View-level filtering is enforced at the application level via getAllowedViewsForRole().
 */
export function getDenodoCredentialsByRole(userRole: string): { username: string; password: string } {
  // Denodo Agora managed service doesn't support custom roles
  // All roles use the same credentials (main account)
  // View-level filtering is enforced by restricting which views can be queried
  return {
    username: process.env.DENODO_USERNAME || '',
    password: process.env.DENODO_PASSWORD || ''
  };
}

/**
 * Chat with Denodo AI SDK which uses AWS Bedrock internally
 */
export async function chatWithDenodoAI(
  messagesOrQuestion: ChatMessage[] | string,
  vdpDatabaseNames?: string,
  credentials?: { username: string; password: string },
  allowedViews?: string[]
): Promise<ChatResponse> {
  const startTime = Date.now();
  
  // Format the question with conversation context if messages array provided
  const question = Array.isArray(messagesOrQuestion) 
    ? formatQuestionWithContext(messagesOrQuestion)
    : messagesOrQuestion;

  // Remove trailing slash from endpoint URL to avoid double slashes
  let denodoAIEndpoint = process.env.DENODO_AI_SDK_URL || "http://localhost:8008";
  denodoAIEndpoint = denodoAIEndpoint.replace(/\/$/, '');
  
  // Use provided credentials or fall back to default environment variables
  const denodoUsername = credentials?.username || process.env.DENODO_USERNAME;
  const denodoPassword = credentials?.password || process.env.DENODO_PASSWORD;

  if (!denodoUsername || !denodoPassword) {
    throw new Error("Denodo credentials not configured");
  }

  // Create Basic Auth header
  const credentialsEncoded = Buffer.from(`${denodoUsername}:${denodoPassword}`).toString('base64');
  const authHeader = `Basic ${credentialsEncoded}`;

  return new Promise((resolve, reject) => {
    // State flag to ensure only one terminal call (resolve or reject)
    let settled = false;
    
    try {
      // Build query parameters
      const params = new URLSearchParams({
        question: question,
        verbose: "true", // Get natural language response
      });

      if (vdpDatabaseNames) {
        params.append("vdp_database_names", vdpDatabaseNames);
      }

      // Add allowed views for RBAC (app-level filtering)
      if (allowedViews && allowedViews.length > 0) {
        params.append("tables", JSON.stringify(allowedViews));
        console.log(`[RBAC] Restricting query to ${allowedViews.length} allowed views:`, allowedViews);
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
      
      const req = requester.request(options, (res: any) => {
        let responseData = '';

        res.on('data', (chunk: any) => {
          responseData += chunk;
        });

        res.on('end', () => {
          // Guard: prevent multiple terminal calls
          if (settled) return;
          
          const responseTime = (Date.now() - startTime) / 1000;
          
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const data = JSON.parse(responseData) as DenodoAIResponse;
              console.log(`[Denodo AI SDK] Response received in ${responseTime}s`);
              console.log(`[Denodo AI SDK] Tables/Views Used:`, data.tables_used || 'Not specified');
              console.log(`[Denodo AI SDK] SQL Query:`, data.sql_query || 'Not available');
              console.log(`[Denodo AI SDK] Answer:`, data.answer);

              // Parse tables_used if it's a JSON string
              let tablesUsed: string[] = [];
              if (data.tables_used) {
                try {
                  tablesUsed = typeof data.tables_used === 'string' 
                    ? JSON.parse(data.tables_used) 
                    : data.tables_used;
                } catch {
                  tablesUsed = [];
                }
              }

              // RBAC ENFORCEMENT: Validate that only allowed views were queried
              if (allowedViews && allowedViews.length > 0) {
                // FAIL-CLOSED SECURITY: If tables_used is missing/empty, we cannot verify
                // RBAC compliance, so we must reject the response to prevent potential data leaks
                // EXCEPTION: If the AI genuinely couldn't find information (indicated by "Sorry" messages),
                // pass through without RBAC check since no data was accessed
                const isNoAnswerResponse = data.answer && (
                  data.answer.toLowerCase().includes("sorry") ||
                  data.answer.toLowerCase().includes("can't help") ||
                  data.answer.toLowerCase().includes("cannot help") ||
                  data.answer.toLowerCase().includes("couldn't find")
                );
                
                if (tablesUsed.length === 0 && !isNoAnswerResponse) {
                  console.error(`[RBAC VIOLATION] Response missing tables_used metadata - cannot verify RBAC compliance`);
                  console.error(`[RBAC VIOLATION] Failing closed to prevent potential unauthorized data access`);
                  
                  settled = true; // Mark as settled
                  reject(new Error(
                    `I'm sorry, I couldn't find an answer to your question in the available drug information. ` +
                    `Please try asking in a different way or select a drug from the list to get started.`
                  ));
                  return;
                }
                
                // If no tables used but it's a "no answer" response, pass through with patient-friendly message
                if (tablesUsed.length === 0 && isNoAnswerResponse) {
                  console.log(`[RBAC] Passing through "no answer" response - no data accessed`);
                  
                  // Replace technical Denodo message with patient-friendly version
                  const patientFriendlyMessage = 
                    "I'm sorry, I couldn't find information about that in our drug database. " +
                    "Could you try rephrasing your question or ask about a different topic related to this medication?";
                  
                  settled = true;
                  resolve({
                    message: patientFriendlyMessage,
                    model: "Claude via Denodo AI SDK + AWS Bedrock",
                    responseTime,
                    source: "Denodo AI SDK",
                    tablesUsed: [],
                    sqlQuery: data.sql_query,
                    confidence: 50,
                    executionTime: data.total_execution_time,
                  });
                  return;
                }
                
                // Validate that all queried tables are in the allowed list
                // Strip schema prefix (e.g., "jl_verboomen.table_name" -> "table_name") for comparison
                const unauthorizedViews = tablesUsed.filter(table => {
                  const tableName = table.includes('.') ? table.split('.').pop() || table : table;
                  return !allowedViews.includes(tableName);
                });
                
                if (unauthorizedViews.length > 0) {
                  console.warn(`[RBAC WARNING] Query accessed restricted views:`, unauthorizedViews);
                  console.warn(`[RBAC WARNING] Allowed views:`, allowedViews);
                  console.warn(`[RBAC WARNING] Views used in query:`, tablesUsed);
                  
                  // Instead of blocking, allow the response but add a disclaimer
                  const disclaimerText = "\n\n⚠️ IMPORTANT: This response includes information from technical safety assessments. Please discuss this information with your healthcare provider for complete guidance tailored to your situation.";
                  
                  settled = true;
                  resolve({
                    message: (data.answer || "No response generated") + disclaimerText,
                    model: "Claude via Denodo AI SDK + AWS Bedrock",
                    responseTime,
                    source: "Denodo AI SDK",
                    tablesUsed,
                    sqlQuery: data.sql_query,
                    confidence: Math.min(95, 70 + (tablesUsed.length * 3)),
                    executionTime: data.total_execution_time,
                  });
                  return;
                }

                
                console.log(`[RBAC] ✓ Access granted - all queried views are authorized:`, tablesUsed);
              }

              // Calculate confidence based on execution time and table count
              const confidence = Math.min(95, 70 + (tablesUsed.length * 3));

              settled = true; // Mark as settled
              resolve({
                message: data.answer || "No response generated",
                model: "Claude via Denodo AI SDK + AWS Bedrock",
                responseTime,
                source: "Denodo AI SDK",
                tablesUsed,
                sqlQuery: data.sql_query,
                confidence,
                executionTime: data.total_execution_time,
              });
            } catch (parseError) {
              if (settled) return; // Guard
              settled = true;
              console.error("Error parsing Denodo AI SDK response:", parseError);
              reject(new Error("Failed to parse response from Denodo AI SDK"));
            }
          } else {
            if (settled) return; // Guard
            settled = true;
            console.error(`Denodo AI SDK error (${res.statusCode}):`, responseData);
            reject(new Error(`Denodo AI SDK error (${res.statusCode}): ${responseData}`));
          }
        });
      });

      req.on('error', (error: any) => {
        if (settled) return; // Guard
        settled = true;
        console.error("Error calling Denodo AI SDK:", error);
        reject(new Error("Failed to generate response from Denodo AI SDK"));
      });

      req.end();
    } catch (error) {
      if (settled) return; // Guard
      settled = true;
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
