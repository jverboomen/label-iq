import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Sparkles, Shield, Pill, LogOut, History, LogIn, Lock } from "lucide-react";
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
  tablesUsed?: string[];
  sqlQuery?: string;
  confidence?: number;
  timestamp?: number;
}

interface QueryHistoryItem {
  id: string;
  question: string;
  answer: string;
  confidence: number;
  timestamp: number;
}

export default function HomePage() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuth, setShowAuth] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([]);
  const [unlockedSqlQueries, setUnlockedSqlQueries] = useState<Record<number, boolean>>({});
  const [sqlPasswordModal, setSqlPasswordModal] = useState<{ open: boolean; messageIdx: number | null }>({ open: false, messageIdx: null });
  const [sqlPasswordInput, setSqlPasswordInput] = useState("");
  const [userRole, setUserRole] = useState<"judge" | "physician" | "patient">("judge");
  const SQL_PASSWORD = "denodo";

  // Chatbot mutation
  const chatMutation = useMutation({
    mutationFn: async (messages: ChatMessage[]) => {
      const response = await apiRequest("POST", "/api/chat", { messages, userRole });
      const result = await response.json();
      return result;
    },
    onSuccess: (data: { message: string; model: string; responseTime: number; source: string; tablesUsed?: string[]; sqlQuery?: string; confidence?: number }) => {
      const detectedLogos = detectDrugLogos(data.message);
      const now = Date.now();
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.message,
        model: data.model,
        responseTime: data.responseTime,
        detectedLogos: detectedLogos.length > 0 ? detectedLogos : undefined,
        tablesUsed: data.tablesUsed,
        sqlQuery: data.sqlQuery,
        confidence: data.confidence,
        timestamp: now,
      };
      setChatMessages(prev => [...prev, assistantMessage]);
      
      // Add to query history
      setQueryHistory(prev => [...prev, {
        id: Math.random().toString(36),
        question: chatMessages[chatMessages.length - 1]?.content || "",
        answer: data.message.substring(0, 100) + "...",
        confidence: data.confidence || 70,
        timestamp: now,
      }]);
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

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && password.trim() && userRole) {
      setIsLoggedIn(true);
      setShowAuth(false);
    }
  };

  const handleSqlPasswordSubmit = () => {
    const msgIdx = sqlPasswordModal.messageIdx;
    if (msgIdx !== null && sqlPasswordInput === SQL_PASSWORD) {
      setUnlockedSqlQueries(prev => ({ ...prev, [msgIdx]: true }));
      setSqlPasswordModal({ open: false, messageIdx: null });
      setSqlPasswordInput("");
    }
  };

  const openSqlPasswordModal = (msgIdx: number) => {
    setSqlPasswordModal({ open: true, messageIdx: msgIdx });
    setSqlPasswordInput("");
  };

  if (showAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="font-bold text-[#007CBA]">Label iQ</span>
            </CardTitle>
            <CardDescription>FDA Drug Label AI Assistant</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold text-[#007CBA] mb-2">
                {authMode === "login" ? "Sign In" : "Create Account"}
              </h2>
            </div>
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Username</label>
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800"
                  data-testid="input-username"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800"
                  data-testid="input-password"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Account Type</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as "judge" | "physician" | "patient")}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800"
                  data-testid="select-role"
                >
                  <option value="judge">Judge</option>
                  <option value="physician">Physician</option>
                  <option value="patient">Patient</option>
                </select>
              </div>
              <Button type="submit" className="w-full bg-[#007CBA] hover:bg-[#006399]" data-testid="button-auth-submit">
                {authMode === "login" ? "Sign In" : "Sign Up"}
              </Button>
            </form>
            <div className="text-center">
              <button 
                onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
                className="text-sm text-[#007CBA] hover:underline"
                data-testid="button-toggle-auth-mode"
              >
                {authMode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                setIsLoggedIn(true);
                setShowAuth(false);
              }}
              data-testid="button-demo"
            >
              Continue as Demo User
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Query History Sidebar */}
      <aside className="w-64 bg-gray-50 dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 overflow-y-auto">
        <div className="sticky top-0 bg-gray-50 dark:bg-slate-900 p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <History className="h-4 w-4 text-[#007CBA]" />
            <h2 className="text-sm font-semibold">Query History</h2>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-xs"
            onClick={() => {
              setChatMessages([]);
              setQueryHistory([]);
            }}
            data-testid="button-clear-history"
          >
            Clear History
          </Button>
        </div>
        <div className="p-4 space-y-2">
          {queryHistory.length === 0 ? (
            <p className="text-xs text-muted-foreground">No queries yet</p>
          ) : (
            queryHistory.slice().reverse().map(item => (
              <button
                key={item.id}
                onClick={() => {
                  const msg = chatMessages.find(m => m.timestamp === item.timestamp);
                  if (msg) {
                    setChatInput(msg.content);
                  }
                }}
                className="w-full text-left p-2 text-xs bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700 hover-elevate"
                data-testid={`button-history-${item.id}`}
              >
                <div className="font-medium truncate">{item.question.substring(0, 40)}</div>
                <div className="text-muted-foreground text-xs">
                  Confidence: {(item.confidence).toFixed(0)}%
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        {/* FDA Official Header */}
        <header className="bg-[#007CBA] shadow-md flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-4">
            <img 
              src="/fda-logo-full.svg" 
              alt="U.S. Food and Drug Administration" 
              className="h-10 md:h-12"
              data-testid="img-fda-logo"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded" data-testid="badge-user-role">
              <span className="text-white text-sm font-medium capitalize">{userRole}</span>
              {userRole === "judge" && <span className="text-white text-xs">(Full Access + SQL)</span>}
              {userRole === "physician" && <span className="text-white text-xs">(All 9 Views, No SQL)</span>}
              {userRole === "patient" && <span className="text-white text-xs">(8 of 9 Views, No SQL)</span>}
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setIsLoggedIn(false);
                setShowAuth(true);
                setUsername("");
                setPassword("");
              }}
              className="text-white hover:bg-[#006399]"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </header>
      
        {/* Sub-header with App Info */}
        <div className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
          <div className="max-w-4xl mx-auto px-6 py-6 md:px-8">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-[#007CBA]" data-testid="text-app-title">
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
        <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8 md:px-8 md:py-12">
        <Card className="shadow-lg">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <span className="font-bold text-[#007CBA]">Denodo</span>
              <span className="text-muted-foreground">AI Assistant</span>
            </CardTitle>
            <CardDescription>
              Ask questions about FDA drug labels. Powered by AWS Bedrock Claude 3.5 Sonnet + Denodo Agora.
            </CardDescription>
            {userRole === "patient" && (
              <div className="mt-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-800 dark:text-blue-200" data-testid="disclaimer-patient-access">
                <strong>Patient Access:</strong> You have access to 8 of 9 database views. The master_safety_risk view (containing detailed safety data requiring clinical interpretation) is restricted to healthcare professionals.
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Chat Messages */}
            <div 
              className="h-96 overflow-y-auto border rounded-lg p-4 space-y-4 bg-gray-50 dark:bg-slate-900"
              data-testid="container-chat-messages"
            >
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <Pill className="h-16 w-16 text-muted-foreground/50" />
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-muted-foreground">
                      Welcome to Denodo AI Assistant
                    </p>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Ask questions about FDA drug labels. Examples:
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center mt-3">
                      <button
                        onClick={() => setChatInput("Tell me about LIPITOR and its uses")}
                        className="px-3 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover-elevate active-elevate-2"
                        data-testid="button-example-lipitor"
                      >
                        LIPITOR information
                      </button>
                      <button
                        onClick={() => setChatInput("What are the side effects of JANUVIA?")}
                        className="px-3 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover-elevate active-elevate-2"
                        data-testid="button-example-januvia"
                      >
                        JANUVIA side effects
                      </button>
                      <button
                        onClick={() => setChatInput("How should HUMIRA be stored and handled?")}
                        className="px-3 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover-elevate active-elevate-2"
                        data-testid="button-example-humira"
                      >
                        HUMIRA storage
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
                      
                      {/* Display metadata and data quality */}
                      {msg.role === "assistant" && (
                        <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                          {/* Confidence Badge */}
                          {msg.confidence !== undefined && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-[#007CBA]">Confidence:</span>
                              <div className="px-2 py-1 bg-[#007CBA]/10 text-[#007CBA] rounded text-xs font-medium">
                                {msg.confidence.toFixed(0)}%
                              </div>
                            </div>
                          )}
                          
                          {/* Tables Used */}
                          {msg.tablesUsed && msg.tablesUsed.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1 font-semibold">Data Sources:</p>
                              <div className="flex flex-wrap gap-1">
                                {msg.tablesUsed.map((table, idx) => {
                                  const tableName = table.split('.').pop() || table;
                                  return (
                                    <span key={idx} className="px-2 py-0.5 bg-gray-200 dark:bg-slate-700 rounded text-xs">
                                      {tableName}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          
                          {/* SQL Query with Password Protection - Only for Judge role */}
                          {msg.sqlQuery && userRole === "judge" && (
                            <div>
                              {unlockedSqlQueries[idx] ? (
                                <details className="text-xs" open>
                                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-semibold">
                                    SQL Query (Unlocked)
                                  </summary>
                                  <pre className="mt-1 p-2 bg-gray-100 dark:bg-slate-800 rounded text-xs overflow-x-auto font-mono">
                                    {msg.sqlQuery}
                                  </pre>
                                </details>
                              ) : (
                                <button
                                  onClick={() => openSqlPasswordModal(idx)}
                                  className="inline-flex items-center gap-1.5 text-[#007CBA] hover:text-[#006399] font-semibold text-xs hover:underline"
                                  data-testid={`button-unlock-sql-${idx}`}
                                >
                                  <Lock className="h-3.5 w-3.5" />
                                  View SQL Query
                                </button>
                              )}
                            </div>
                          )}
                          
                          {/* Model and response time */}
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span className="font-mono">{msg.model}</span>
                            {msg.responseTime && (
                              <span>• {msg.responseTime.toFixed(1)}s</span>
                            )}
                          </div>
                        </div>
                      )}
                      
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

        {/* SQL Password Dialog */}
        <Dialog open={sqlPasswordModal.open} onOpenChange={(open) => setSqlPasswordModal({ ...sqlPasswordModal, open })}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-[#007CBA]" />
                View SQL Query
              </DialogTitle>
              <DialogDescription>
                Enter the password to view the underlying SQL query used by Denodo AI SDK.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                type="password"
                placeholder="Enter password"
                value={sqlPasswordInput}
                onChange={(e) => setSqlPasswordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSqlPasswordSubmit();
                }}
                data-testid="input-sql-password"
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setSqlPasswordModal({ open: false, messageIdx: null })}
                data-testid="button-cancel-sql"
              >
                Cancel
              </Button>
              <Button
                className="bg-[#007CBA] hover:bg-[#006399]"
                onClick={handleSqlPasswordSubmit}
                data-testid="button-submit-sql-password"
              >
                Unlock
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
