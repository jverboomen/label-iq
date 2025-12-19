import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Sparkles, Shield, Pill, LogOut, History, LogIn, Lock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Drug logo mapping (using public directory for production builds)
// Only includes 13 drugs that exist in the Denodo database
// Drug names must match database exactly (mixed case for some, uppercase for others)
const DRUG_LOGOS: Record<string, string> = {
  "Biktarvy": "/drug-logos/BIKTARVY_LOGO.svg",
  "ELIQUIS": "/drug-logos/ELIQUIS_LOGO.svg",
  "ENBREL": "/drug-logos/ENBREL_LOGO.svg",
  "ENTRESTO": "/drug-logos/ENTRESTO_LOGO.svg",
  "FARXIGA": "/drug-logos/FARXIGA_LOGO.svg",
  "HUMIRA": "/drug-logos/HUMIRA_LOGO.svg",
  "IBRANCE": "/drug-logos/IBRANCE_LOGO.svg",
  "Imbruvica": "/drug-logos/IMBRUVICA_LOGO.svg",
  "JAKAFI": "/drug-logos/JAKAFI_LOGO.svg",
  "JANUVIA": "/drug-logos/JANUVIA_LOGO.svg",
  "JARDIANCE": "/drug-logos/JARDIANCE_LOGO.svg",
  "Lantus": "/drug-logos/LANTUS_LOGO.svg",
  "Linzess": "/drug-logos/LINZESS_LOGO.svg",
};

// Simple Markdown to HTML converter for AI responses
function renderMarkdown(text: string): string {
  return text
    // Bold: **text** or __text__
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    // Italic: *text* or _text_
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Bullet points: • or - at start of line
    .replace(/^[•\-]\s+(.+)$/gm, '<li class="ml-4">$1</li>')
    // Numbered lists: 1. 2. etc at start of line
    .replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    // Line breaks
    .replace(/\n/g, '<br />');
}

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
  const [userRole, setUserRole] = useState<"judge" | "physician" | "patient">("patient");
  const [selectedDrug, setSelectedDrug] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");
  const SQL_PASSWORD = "denodo";
  
  // Role passwords for demo
  const ROLE_PASSWORDS: Record<string, string> = {
    patient: "patient",
    physician: "physician",
    judge: "judge",
  };

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
      
      // Check if this is a friendly user-facing message (not a technical error)
      const errorMsg = error instanceof Error ? error.message : '';
      const isFriendlyMessage = errorMsg.includes('healthcare professional') || 
                                 errorMsg.includes("couldn't find an answer") ||
                                 errorMsg.includes('try asking in a different way');
      
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: isFriendlyMessage 
          ? errorMsg  // Show the helpful message directly
          : `Failed to generate response: ${errorMsg || 'Please try again.'}`,
      };
      setChatMessages(prev => [...prev, errorMessage]);
    },
  });

  // Progressive loading status updates
  useEffect(() => {
    if (chatMutation.isPending) {
      setLoadingStatus("Analyzing your question...");
      
      const timer1 = setTimeout(() => {
        setLoadingStatus("Querying drug database...");
      }, 3000);
      
      const timer2 = setTimeout(() => {
        setLoadingStatus("Generating response...");
      }, 8000);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    } else {
      setLoadingStatus("");
    }
  }, [chatMutation.isPending]);

  const handleChatSend = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!chatInput.trim()) {
      return;
    }
    
    const originalInput = chatInput.trim();
    let apiContent = originalInput;
    
    // If a drug is selected and the message doesn't mention it, automatically append it for API
    if (selectedDrug && !originalInput.toLowerCase().includes(selectedDrug.toLowerCase())) {
      apiContent = `${originalInput} for ${selectedDrug}`;
    }
    
    // Message to display in UI (original user input)
    const userMessageDisplay: ChatMessage = {
      role: "user",
      content: originalInput,
    };
    
    // Clear input first
    setChatInput("");
    
    // Use functional updater to ensure we have the latest state
    // This guarantees we include any pending assistant messages
    setChatMessages(prev => {
      // Add the display message to chat
      const updatedMessages = [...prev, userMessageDisplay];
      
      // Create API messages with enhanced content for the last message
      const apiMessages = updatedMessages.map((msg, idx) => {
        if (idx === updatedMessages.length - 1 && msg.role === "user") {
          return { ...msg, content: apiContent };
        }
        return msg;
      });
      
      // Send enhanced messages to API
      chatMutation.mutate(apiMessages);
      return updatedMessages;
    });
  };
  
  const handleDrugSelect = (drugName: string) => {
    setSelectedDrug(drugName);
    
    // All drugs need specific questions - "Tell me about X" doesn't work with AI SDK
    // Using "What is X used for?" format for all drugs
    const drugQuestions: Record<string, string> = {
      // Original 9 drugs
      "ENTRESTO": "What is ENTRESTO used for?",
      "FARXIGA": "What is FARXIGA used for?",
      "JARDIANCE": "What is JARDIANCE used for?",
      "JANUVIA": "What is JANUVIA used for?",
      "JAKAFI": "What is JAKAFI used for?",
      "HUMIRA": "What is HUMIRA used for?",
      "IBRANCE": "What is IBRANCE used for?",
      "ELIQUIS": "What is ELIQUIS used for?",
      "Linzess": "What is Linzess used for?",
      // Previously missing 5 drugs
      "Biktarvy": "What is Biktarvy used for?",
      "ENBREL": "What is ENBREL used for?",
      "Imbruvica": "What is Imbruvica used for?",
      "Lantus": "What is Lantus used for?",
    };
    
    // Default to "What is X used for?" if drug not in list
    const question = drugQuestions[drugName] || `What is ${drugName} used for?`;
    setChatInput(question);
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    
    if (!username.trim()) {
      setAuthError("Please enter a username");
      return;
    }
    
    if (!password.trim()) {
      setAuthError("Please enter a password");
      return;
    }
    
    // Validate password for selected role
    const expectedPassword = ROLE_PASSWORDS[userRole];
    if (password !== expectedPassword) {
      setAuthError("Incorrect password for selected role");
      return;
    }
    
    setIsLoggedIn(true);
    setShowAuth(false);
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
      <div className="min-h-screen bg-background flex items-center justify-center py-8">
        <div className="w-full max-w-md space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="font-bold text-[#007CBA]">Label iQ</span>
              </CardTitle>
              <CardDescription>Drug Label AI Assistant</CardDescription>
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
                  <option value="patient">Patient (8 of 9 views)</option>
                  <option value="physician">Physician (All 9 views)</option>
                  <option value="judge">Judge (All 9 views + SQL)</option>
                </select>
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md">
                  <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-2">Hackathon Demo Credentials:</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center p-2 bg-white dark:bg-slate-800 rounded border">
                      <div className="font-medium text-gray-700 dark:text-gray-300">Patient</div>
                      <div className="text-gray-500 dark:text-gray-400">Patient / patient</div>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-slate-800 rounded border">
                      <div className="font-medium text-gray-700 dark:text-gray-300">Physician</div>
                      <div className="text-gray-500 dark:text-gray-400">Physician / physician</div>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-slate-800 rounded border">
                      <div className="font-medium text-gray-700 dark:text-gray-300">Judge</div>
                      <div className="text-gray-500 dark:text-gray-400">Judge / judge</div>
                    </div>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-2 text-center">SQL Query Password: <span className="font-mono font-semibold">denodo</span></p>
                </div>
              </div>
              {authError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400" data-testid="error-auth">
                  {authError}
                </div>
              )}
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

        {/* Technology Stack & Built By */}
        <div className="text-center space-y-4 px-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Powered by <span className="font-semibold">Denodo AI SDK</span> + <span className="font-semibold">AWS EC2</span> + <span className="font-semibold">AWS Bedrock</span> (Claude 3.5 Sonnet)
          </p>
          
          <div className="flex flex-col items-center gap-3">
            <div className="text-sm text-gray-600 dark:text-gray-400">Built by</div>
            <div className="px-6 py-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
              <img 
                src="/massive-insights-logo.jpg" 
                alt="Massive Insights" 
                className="h-12 w-auto object-contain"
                data-testid="img-massive-insights-logo-auth"
              />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              For Denodo Hackathon 2025
            </div>
          </div>
        </div>
      </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Query History Sidebar - Only for Judges */}
      {userRole === "judge" && (
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
      )}

      <div className="flex-1 flex flex-col">
        {/* App Header */}
        <header className="bg-[#007CBA] shadow-md flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-4">
            <span className="text-white text-xl font-bold" data-testid="text-header-logo">Label iQ</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white/20 px-3 py-1.5 rounded" data-testid="badge-user-role">
              <span className="text-white text-sm font-medium capitalize">{userRole}</span>
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
                Powered by Denodo AI SDK + AWS EC2 + AWS Bedrock (Claude 3.5 Sonnet)
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8 md:px-8 md:py-12">
          {!selectedDrug ? (
            /* Drug Selection Grid */
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="text-center space-y-3">
                <h2 className="text-2xl font-bold text-[#007CBA]">
                  Select a Medication
                </h2>
                <p className="text-muted-foreground">
                  Choose a drug to start asking questions about its label information
                </p>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3 max-w-4xl">
                {Object.entries(DRUG_LOGOS).map(([drugName, logoPath]) => (
                  <button
                    key={drugName}
                    onClick={() => handleDrugSelect(drugName)}
                    className="flex items-center justify-center p-4 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 hover-elevate active-elevate-2 transition-all"
                    data-testid={`button-drug-${drugName.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <img 
                      src={logoPath} 
                      alt={`${drugName} logo`}
                      className="h-16 w-auto object-contain"
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Chatbot Interface */
            <Card className="shadow-lg">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-[#007CBA]">Denodo</span>
                  <span className="text-muted-foreground">AI Assistant</span>
                  <div className="flex items-center gap-2 ml-auto">
                    {chatMessages.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setChatMessages([]);
                          setSelectedDrug(null);
                          setChatInput("");
                        }}
                        className="h-7 text-xs"
                        data-testid="button-new-chat"
                      >
                        Change Drug
                      </Button>
                    )}
                    {selectedDrug && (
                      <div className="flex items-center gap-2">
                        <img 
                          src={DRUG_LOGOS[selectedDrug]}
                          alt={`${selectedDrug} logo`}
                          className="h-8 w-auto object-contain"
                          data-testid="img-selected-drug-logo"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedDrug(null)}
                          className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900"
                          data-testid="button-clear-drug"
                        >
                          ×
                        </Button>
                      </div>
                    )}
                  </div>
                </CardTitle>
                {userRole === "patient" && (
                  <div className="mt-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm font-medium text-blue-800 dark:text-blue-200" data-testid="disclaimer-patient-access">
                    Patient View
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
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <p className="text-muted-foreground">
                        Ask your first question about {selectedDrug}
                      </p>
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
                      <div 
                        className="text-sm break-words prose prose-sm max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                      />
                      
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
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        <div className="h-2 w-2 bg-[#007CBA] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="h-2 w-2 bg-[#007CBA] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="h-2 w-2 bg-[#007CBA] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-sm text-muted-foreground">{loadingStatus}</span>
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
                placeholder="Ask your questions here"
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
            <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-700 space-y-1">
              <p className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5" />
                <strong>Note:</strong> This chatbot queries Denodo AI SDK, which uses AWS Bedrock (Claude 3.5 Sonnet) and Denodo Agora database.
              </p>
              <p className="flex items-center gap-2 text-[#007CBA]">
                <span>⏱️</span>
                <strong>Response Time:</strong> Complex queries may take 20-30 seconds as the AI searches the database and generates a response.
              </p>
            </div>
          </CardContent>
        </Card>
          )}
        
        {/* Technology Stack Footer */}
        <div className="mt-8 text-sm text-gray-600 dark:text-gray-400 text-center px-4">
          <p>Powered by <span className="font-semibold">Denodo AI SDK</span> + <span className="font-semibold">AWS EC2</span> + <span className="font-semibold">AWS Bedrock</span> (Claude 3.5 Sonnet)</p>
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
                <span className="block mt-1 text-blue-600 dark:text-blue-400">Hint: denodo</span>
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
