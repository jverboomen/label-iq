import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Database, Sparkles, Shield } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Drug logo mapping (using public directory for production builds)
const DRUG_LOGOS: Record<string, string> = {
  "BIKTARVY": "/drug-logos/BIKTARVY_LOGO.svg",
  "ELIQUIS": "/drug-logos/ELIQUIS_LOGO.svg",
  "ENBREL": "/drug-logos/ENBREL_LOGO.svg",
  "ENTRESTO": "/drug-logos/ENTRESTO_LOGO.svg",
  "FARXIGA": "/drug-logos/FARXIGA_LOGO.svg",
  "HUMIRA": "/drug-logos/HUMIRA_LOGO.svg",
  "IBRANCE": "/drug-logos/IBRANCE_LOGO.svg",
  "IMBRUVICA": "/drug-logos/IMBRUVICA_LOGO.svg",
  "JAKAFI": "/drug-logos/JAKAFI_LOGO.svg",
  "JANUVIA": "/drug-logos/JANUVIA_LOGO.svg",
  "JARDIANCE": "/drug-logos/JARDIANCE_LOGO.svg",
  "LANTUS": "/drug-logos/LANTUS_LOGO.svg",
  "LINZESS": "/drug-logos/LINZESS_LOGO.svg",
  "MOUNJARO": "/drug-logos/MOUNJARO_LOGO.svg",
  "MYRBETRIQ": "/drug-logos/MYRBETRIQ_LOGO.svg",
  "NOVOLOG": "/drug-logos/NOVOLOG_LOGO.svg",
  "OFEV": "/drug-logos/OFEV_LOGO.svg",
  "OZEMPIC": "/drug-logos/OZEMPIC_LOGO.svg",
  "REVLIMID": "/drug-logos/REVLIMID_LOGO.svg",
  "STELARA": "/drug-logos/STELARA_LOGO.svg",
  "SYMBICORT": "/drug-logos/SYMBICORT_LOGO.svg",
  "TRELEGY ELLIPTA": "/drug-logos/TRELEGY_ELLIPTA_LOGO.svg",
  "TRULICITY": "/drug-logos/TRULICITY_LOGO.svg",
  "XARELTO": "/drug-logos/XARELTO_LOGO.svg",
  "XTANDI": "/drug-logos/XTANDI_LOGO.svg",
};

// Function to detect drug names in message content
function detectDrugLogos(content: string): string[] {
  const detectedLogos = new Set<string>();
  const upperContent = content.toUpperCase();
  
  for (const [drugName, logoPath] of Object.entries(DRUG_LOGOS)) {
    if (upperContent.includes(drugName)) {
      detectedLogos.add(logoPath);
    }
  }
  
  return Array.from(detectedLogos);
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  model?: string;
  responseTime?: number;
  detectedLogos?: string[];
}

export default function HomePage() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>("");

  // Chatbot mutation
  const chatMutation = useMutation({
    mutationFn: async (messages: ChatMessage[]) => {
      const response = await apiRequest("POST", "/api/chat", { messages });
      const result = await response.json();
      return result;
    },
    onSuccess: (data: { message: string; model: string; responseTime: number; source: string }) => {
      const detectedLogos = detectDrugLogos(data.message);
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.message,
        model: data.model,
        responseTime: data.responseTime,
        detectedLogos: detectedLogos.length > 0 ? detectedLogos : undefined,
      };
      setChatMessages(prev => [...prev, assistantMessage]);
    },
    onError: (error) => {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: error instanceof Error 
          ? `Failed to generate response: ${error.message}` 
          : 'Failed to generate response. Please try again.',
      };
      setChatMessages(prev => [...prev, errorMessage]);
    },
  });

  const handleChatSend = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!chatInput.trim()) {
      return;
    }
    
    const userMessage: ChatMessage = {
      role: "user",
      content: chatInput.trim(),
    };
    
    // Clear input first
    setChatInput("");
    
    // Use functional updater to ensure we have the latest state
    // This guarantees we include any pending assistant messages
    setChatMessages(prev => {
      const nextMessages = [...prev, userMessage];
      // Send to API with the complete, up-to-date message history
      chatMutation.mutate(nextMessages);
      return nextMessages;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* FDA Official Header */}
      <header className="bg-[#007CBA] shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4 md:px-8">
          <div className="flex items-center gap-4">
            <img 
              src="/fda-logo-full.svg" 
              alt="U.S. Food and Drug Administration" 
              className="h-10 md:h-12"
              data-testid="img-fda-logo"
            />
          </div>
        </div>
      </header>
      
      {/* Sub-header with App Info */}
      <div className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-6 py-6 md:px-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-app-title">
              Label iQ
            </h1>
            <p className="text-lg text-gray-700 dark:text-gray-300" data-testid="text-tagline">
              Ask Your Questions in Plain Language
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="text-subtitle">
              Powered by Denodo AI SDK + AWS Bedrock
            </p>
          </div>
        </div>
      </div>

      {/* Main Content - Chatbot */}
      <main className="max-w-4xl mx-auto px-6 py-8 md:px-8 md:py-12">
        <Card className="shadow-lg">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <span className="font-bold text-[#00A3E0]">Denodo</span>
              <span className="text-muted-foreground">AI Assistant</span>
            </CardTitle>
            <CardDescription>
              Ask questions about FDA drug labels. Powered by AWS Bedrock Claude 3.5 Sonnet + Denodo Agora.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Chat Messages */}
            <div 
              className="h-96 overflow-y-auto border rounded-lg p-4 space-y-4 bg-gray-50 dark:bg-slate-900"
              data-testid="container-chat-messages"
            >
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <Database className="h-16 w-16 text-muted-foreground/40" />
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-muted-foreground">
                      Welcome to Denodo AI Assistant
                    </p>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Ask questions about FDA drug labels. Examples:
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center mt-3">
                      <button
                        onClick={() => setChatInput("What is SYMBICORT used for?")}
                        className="px-3 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover-elevate active-elevate-2"
                        data-testid="button-example-symbicort"
                      >
                        What is SYMBICORT?
                      </button>
                      <button
                        onClick={() => setChatInput("List all medications in the database")}
                        className="px-3 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover-elevate active-elevate-2"
                        data-testid="button-example-list"
                      >
                        List medications
                      </button>
                      <button
                        onClick={() => setChatInput("What are the side effects of LIPITOR?")}
                        className="px-3 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover-elevate active-elevate-2"
                        data-testid="button-example-lipitor"
                      >
                        LIPITOR side effects
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    data-testid={`message-${msg.role}-${idx}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2.5 ${
                        msg.role === "user"
                          ? "bg-[#007CBA] text-white"
                          : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                      
                      {/* Display detected drug logos */}
                      {msg.role === "assistant" && msg.detectedLogos && msg.detectedLogos.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <p className="text-xs text-muted-foreground mb-2">Referenced Medications:</p>
                          <div className="flex flex-wrap gap-3">
                            {msg.detectedLogos.map((logoPath, logoIdx) => (
                              <div
                                key={logoIdx}
                                className="p-2 bg-background rounded-md border hover-elevate"
                                data-testid={`img-drug-logo-${logoIdx}`}
                              >
                                <img
                                  src={logoPath}
                                  alt="Drug logo"
                                  className="h-8 w-auto object-contain"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {msg.role === "assistant" && msg.model && (
                        <div className="mt-2 pt-2 border-t border-border/50 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="font-mono">{msg.model}</span>
                          {msg.responseTime && (
                            <span>• {msg.responseTime.toFixed(1)}s</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              {chatMutation.isPending && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg px-4 py-3 bg-muted border">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleChatSend} className="flex gap-2">
              <Textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about FDA drug labels..."
                rows={2}
                className="flex-1 resize-none"
                data-testid="input-chat"
                disabled={chatMutation.isPending}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!chatInput.trim() || chatMutation.isPending}
                className="h-auto"
                data-testid="button-send"
              >
                {chatMutation.isPending ? (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>

            {/* Information Footer */}
            <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-700">
              <p className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5" />
                <strong>Note:</strong> This chatbot queries Denodo AI SDK, which uses AWS Bedrock (Claude 3.5 Sonnet) and Denodo Agora database.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Technology Stack Footer */}
        <div className="mt-8 text-sm text-gray-600 dark:text-gray-400 text-center px-4">
          <p>Powered by <span className="font-semibold">Denodo AI SDK</span> + <span className="font-semibold">AWS Bedrock</span></p>
        </div>

        {/* Built By Massive Insights */}
        <div className="mt-6 pb-8 flex flex-col items-center justify-center gap-3">
          <div className="text-sm text-gray-600 dark:text-gray-400">Built by</div>
          <div className="px-6 py-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
            <img 
              src="/massive-insights-logo.jpg" 
              alt="Massive Insights" 
              className="h-12 w-auto object-contain"
              data-testid="img-massive-insights-logo"
            />
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            For Denodo Hackathon 2025
          </div>
        </div>
      </main>
    </div>
  );
}
