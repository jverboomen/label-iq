import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseCommandInput,
  Message as BedrockMessage,
} from "@aws-sdk/client-bedrock-runtime";

// Initialize Bedrock client
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-west-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  message: string;
  model: string;
  responseTime: number;
}

/**
 * Chat with Claude via AWS Bedrock
 */
export async function chatWithBedrock(
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<ChatResponse> {
  const startTime = Date.now();

  // Convert our message format to Bedrock format
  const bedrockMessages: BedrockMessage[] = messages.map((msg) => ({
    role: msg.role,
    content: [{ text: msg.content }],
  }));

  const params: ConverseCommandInput = {
    modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    messages: bedrockMessages,
    inferenceConfig: {
      maxTokens: 2048,
      temperature: 0.7,
    },
  };

  // Add system prompt if provided
  if (systemPrompt) {
    params.system = [{ text: systemPrompt }];
  }

  try {
    const command = new ConverseCommand(params);
    const response = await bedrockClient.send(command);

    const responseTime = (Date.now() - startTime) / 1000;

    // Extract text from response
    const content = response.output?.message?.content?.[0];
    const text = content && "text" in content ? content.text : "";

    return {
      message: text || "",
      model: "Claude 3.5 Sonnet (via AWS Bedrock)",
      responseTime,
    };
  } catch (error) {
    console.error("Error calling Bedrock:", error);
    throw new Error("Failed to generate response from Bedrock");
  }
}

/**
 * Check if AWS Bedrock credentials are configured
 */
export function isBedrockConfigured(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_REGION
  );
}
