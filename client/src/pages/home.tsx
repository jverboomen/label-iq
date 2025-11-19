import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ChevronDown, ChevronRight, FileText, Sparkles, Shield, Clock, Database, Copy, Download, TrendingUp } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DrugIndexEntry, QueryResponse, ReadabilityScore } from "@shared/schema";

export default function HomePage() {
  const [selectedDrugId, setSelectedDrugId] = useState<string>("");
  const [question, setQuestion] = useState<string>("");
  const [showReadability, setShowReadability] = useState(false);
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch drug index for dropdown
  const { data: drugIndex, isLoading: loadingDrugs } = useQuery<DrugIndexEntry[]>({
    queryKey: ["/api/drugs"],
  });

  // Fetch readability scores
  const { data: readabilityScores } = useQuery<ReadabilityScore[]>({
    queryKey: ["/api/readability"],
  });

  // Query mutation
  const queryMutation = useMutation({
    mutationFn: async (data: { labelId: string; question: string }) => {
      console.log('API request starting:', data);
      const response = await apiRequest("POST", "/api/query", data);
      const result = await response.json();
      console.log('API response received:', result);
      return result;
    },
    onSuccess: (data: QueryResponse) => {
      console.log('Mutation onSuccess called with:', data);
      console.log('Response data structure:', JSON.stringify(data, null, 2));
      console.log('Evidence array:', data.evidence);
      console.log('Label ID:', data.labelId);
      console.log('Drug name:', data.drugName);
      setResponse(data);
      console.log('State updated, response now:', data);
    },
    onError: (error) => {
      console.error('Mutation error:', error);
      setResponse(null);
      setErrorMessage(
        error instanceof Error 
          ? `Failed to generate answer: ${error.message}` 
          : 'Failed to generate answer. Please try again.'
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted', { selectedDrugId, question: question.trim() });
    
    if (!selectedDrugId || question.trim().length < 10) {
      console.log('Validation failed', { selectedDrugId, questionLength: question.trim().length });
      return;
    }
    
    // Clear previous response and errors when starting new query
    setResponse(null);
    setErrorMessage(null);
    
    console.log('Triggering mutation...');
    queryMutation.mutate({
      labelId: selectedDrugId,
      question: question.trim(),
    });
  };

  const selectedDrug = drugIndex?.find(d => d.labelId === selectedDrugId);
  const isFormValid = selectedDrugId && question.trim().length >= 10;

  return (
    <div className="min-h-screen bg-background">
      {/* FDA-Style Header */}
      <header className="bg-primary">
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
      <div className="bg-accent border-b">
        <div className="max-w-4xl mx-auto px-6 py-6 md:px-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground" data-testid="text-app-title">
              Label iQ
            </h1>
            <p className="text-base text-foreground" data-testid="text-tagline">
              Ask Your Questions in Plain Language
            </p>
            <p className="text-sm text-muted-foreground" data-testid="text-subtitle">
              Evidence-Based Answers from Official FDA Labels
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8 md:px-8 md:py-12">
        <div className="space-y-6">
          {/* Drug Selector */}
          <div className="space-y-3">
            <Label htmlFor="drug-select" className="text-sm font-medium">
              Select Drug
            </Label>
            {loadingDrugs ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={selectedDrugId} onValueChange={setSelectedDrugId}>
                <SelectTrigger 
                  id="drug-select" 
                  className="w-full"
                  data-testid="select-drug"
                >
                  <SelectValue placeholder="Choose a prescription drug..." />
                </SelectTrigger>
                <SelectContent>
                  {drugIndex?.map((drug) => (
                    <SelectItem 
                      key={drug.labelId} 
                      value={drug.labelId}
                      data-testid={`option-drug-${drug.labelId}`}
                    >
                      {drug.drugName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Question Input */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <Label htmlFor="question-input" className="text-sm font-medium">
              Your Question
            </Label>
            <Textarea
              id="question-input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., What are the warnings for this drug?"
              rows={3}
              className="resize-none text-base"
              data-testid="input-question"
            />
            
            {/* Example Questions - Clinical Spotlight */}
            {!question && selectedDrugId && (
              <div className="space-y-2 py-2">
                <p className="text-xs font-medium text-muted-foreground">💡 Try these example questions:</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setQuestion("What are the most serious warnings and precautions?")}
                    className="px-3 py-1.5 text-xs rounded-full bg-primary/10 text-primary hover-elevate active-elevate-2 border border-primary/20"
                    data-testid="button-example-warnings"
                  >
                    ⚠️ Warnings & Precautions
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestion("What are the most common side effects?")}
                    className="px-3 py-1.5 text-xs rounded-full bg-primary/10 text-primary hover-elevate active-elevate-2 border border-primary/20"
                    data-testid="button-example-side-effects"
                  >
                    💊 Common Side Effects
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestion("What drug interactions should I know about?")}
                    className="px-3 py-1.5 text-xs rounded-full bg-primary/10 text-primary hover-elevate active-elevate-2 border border-primary/20"
                    data-testid="button-example-interactions"
                  >
                    🔄 Drug Interactions
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestion("What is this medication used for?")}
                    className="px-3 py-1.5 text-xs rounded-full bg-primary/10 text-primary hover-elevate active-elevate-2 border border-primary/20"
                    data-testid="button-example-indications"
                  >
                    ℹ️ What is it for?
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {question.length < 10 && question.length > 0 
                  ? `${10 - question.length} more characters required`
                  : question.length >= 10 
                  ? "Question ready"
                  : "Minimum 10 characters"}
              </p>
              <Button
                type="submit"
                disabled={!isFormValid || queryMutation.isPending}
                className="font-medium"
                data-testid="button-submit"
              >
                {queryMutation.isPending ? "Analyzing..." : "Ask the Label"}
              </Button>
            </div>
          </form>

          {/* Error Message */}
          {errorMessage && !queryMutation.isPending && (
            <div className="mt-12">
              <Card className="border-destructive">
                <CardContent className="p-6">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-destructive" data-testid="text-error">
                        {errorMessage}
                      </p>
                      <Button
                        onClick={() => {
                          setErrorMessage(null);
                          if (selectedDrugId && question.trim().length >= 10) {
                            queryMutation.mutate({
                              labelId: selectedDrugId,
                              question: question.trim(),
                            });
                          }
                        }}
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        data-testid="button-retry"
                      >
                        Try Again
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Response Panel */}
          {(response || queryMutation.isPending) && (
            <div className="space-y-8 mt-12">
              {queryMutation.isPending ? (
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </CardContent>
                </Card>
              ) : response?.notFound ? (
                <Card>
                  <CardContent className="p-6">
                    <p className="text-center text-muted-foreground" data-testid="text-no-answer">
                      Not stated in this label.
                    </p>
                  </CardContent>
                </Card>
              ) : response ? (
                <>
                  {/* Evidence Section */}
                  {response.evidence && response.evidence.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold" data-testid="text-evidence-header">
                          Evidence from FDA Label
                        </h2>
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                          <FileText className="h-3 w-3" />
                          <span>Verbatim from Label</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {response.evidence.map((quote, idx) => (
                          <blockquote
                            key={idx}
                            className="pl-4 border-l-4 border-primary italic text-base leading-relaxed"
                            data-testid={`text-quote-${idx}`}
                          >
                            {quote}
                          </blockquote>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-semibold" data-testid="text-summary-header">
                        Plain Language Summary
                      </h2>
                      {response.sourceType === "general_knowledge" ? (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200 rounded text-xs font-medium border border-amber-300 dark:border-amber-800">
                          <Sparkles className="h-3 w-3" />
                          <span>From OpenAI General Knowledge</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-accent text-accent-foreground rounded text-xs font-medium border">
                          <Sparkles className="h-3 w-3" />
                          <span>AI-Generated from Label</span>
                        </div>
                      )}
                    </div>
                    {response.sourceType === "general_knowledge" && (
                      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-3 rounded text-xs text-amber-900 dark:text-amber-200">
                        <strong>Note:</strong> This answer is based on OpenAI's general pharmaceutical knowledge, 
                        not from the specific FDA label for {response.drugName}. The label does not directly 
                        address this question.
                      </div>
                    )}
                    <p className="text-base leading-relaxed" data-testid="text-summary">
                      {response.summary}
                    </p>
                  </div>

                  {/* Citation */}
                  <div className="bg-muted px-3 py-2 rounded font-mono text-xs" data-testid="text-citation">
                    Source: {response.drugName} (Label ID: {response.labelId})
                  </div>

                  {/* Disclaimer */}
                  <div className="border-l-4 border-destructive px-4 py-3 bg-destructive/5" data-testid="text-disclaimer">
                    <div className="flex gap-3">
                      <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                      <p className="text-sm font-medium">
                        {response.disclaimer}
                      </p>
                    </div>
                  </div>

                  {/* Export/Share Actions */}
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const text = `${response.drugName}\n\nQuestion: ${question}\n\n${response.evidence.length > 0 ? 'Evidence:\n' + response.evidence.join('\n\n') + '\n\n' : ''}Summary:\n${response.summary}\n\nDisclaimer: ${response.disclaimer}`;
                        navigator.clipboard.writeText(text);
                      }}
                      className="gap-2"
                      data-testid="button-copy"
                    >
                      <Copy className="h-4 w-4" />
                      Copy Answer
                    </Button>
                  </div>

                  {/* Safety Insights Dashboard */}
                  {response.safetyInsights && (
                    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-900">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          Safety Insights
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {response.safetyInsights.hasBoxedWarning && (
                            <div className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-200 border border-red-300 dark:border-red-800 rounded-full text-xs font-medium flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Boxed Warning
                            </div>
                          )}
                          {response.safetyInsights.riskLevel && (
                            <div className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                              response.safetyInsights.riskLevel === 'high' 
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-200 border border-red-300 dark:border-red-800'
                                : response.safetyInsights.riskLevel === 'moderate'
                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                                : 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-200 border border-green-300 dark:border-green-800'
                            }`}>
                              <TrendingUp className="h-3 w-3" />
                              Risk: {response.safetyInsights.riskLevel.charAt(0).toUpperCase() + response.safetyInsights.riskLevel.slice(1)}
                            </div>
                          )}
                        </div>
                        {response.safetyInsights.contraindications && response.safetyInsights.contraindications.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            <strong>Key Contraindications:</strong> {response.safetyInsights.contraindications[0]}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Provenance Trail */}
                  {response.provenance && (
                    <Card className="bg-slate-50 dark:bg-slate-950/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Database className="h-4 w-4" />
                          How We Answered This
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <div className="space-y-1">
                            <p className="text-muted-foreground">Sections Searched</p>
                            <p className="font-semibold text-base">{response.provenance.chunksSearched}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-muted-foreground">Relevant Passages</p>
                            <p className="font-semibold text-base">{response.provenance.relevantPassages}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-muted-foreground">AI Model</p>
                            <p className="font-semibold text-sm font-mono">{response.provenance.model}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Response Time
                            </p>
                            <p className="font-semibold text-base">{response.provenance.responseTime.toFixed(2)}s</p>
                          </div>
                        </div>
                        {response.provenance.fallbackUsed && (
                          <div className="mt-3 pt-3 border-t text-xs text-amber-700 dark:text-amber-300">
                            ⚠️ General knowledge fallback used (label didn't directly address question)
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Follow-up Questions */}
                  {response.followUpQuestions && response.followUpQuestions.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Suggested Follow-up Questions
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {response.followUpQuestions.map((q, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setQuestion(q);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="px-4 py-2 text-sm bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 hover-elevate active-elevate-2 rounded-lg border border-blue-200 dark:border-blue-900 text-left"
                            data-testid={`button-followup-${idx}`}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}

          {/* Drug Information Section */}
          {selectedDrug && (
            <div className="mt-12 pt-12 border-t">
              <button
                onClick={() => setShowReadability(!showReadability)}
                className="flex items-center gap-2 w-full text-left hover-elevate active-elevate-2 p-3 rounded-lg"
                data-testid="button-toggle-drug-info"
              >
                {showReadability ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
                <h2 className="text-lg font-semibold">Drug Information & Label Snapshot</h2>
              </button>

              {showReadability && (
                <Card className="mt-6">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Drug Logo */}
                      {selectedDrug.logoPath && (
                        <div className="flex-shrink-0">
                          <img 
                            src={selectedDrug.logoPath} 
                            alt={`${selectedDrug.drugName} logo`}
                            className="h-16 w-auto object-contain"
                            data-testid="img-drug-logo"
                          />
                        </div>
                      )}
                      
                      {/* Drug Details */}
                      <div className="flex-1 space-y-4">
                        <div>
                          <h3 className="font-semibold text-lg mb-1" data-testid="text-drug-name">
                            {selectedDrug.drugName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Label ID: {selectedDrug.labelId} • Snapshot Date: {selectedDrug.snapshotDate}
                          </p>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              About This Label
                            </h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              This is an official FDA drug label containing prescribing information, 
                              warnings, contraindications, dosage guidelines, and clinical data. 
                              Use the question field above to ask specific questions about this medication 
                              in plain language.
                            </p>
                          </div>
                          
                          <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="text-xs text-muted-foreground">
                              <strong>Note:</strong> Label data is sourced directly from FDA databases. 
                              Answers combine verbatim excerpts from this label with AI-generated plain 
                              language summaries to help you understand complex medical information.
                            </p>
                          </div>

                          {/* Label Access Actions */}
                          <div className="flex flex-wrap gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="gap-2"
                              data-testid="button-view-fda"
                            >
                              <a
                                href={`https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=${encodeURIComponent(selectedDrug.drugName)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <FileText className="h-4 w-4" />
                                View Full Label on FDA.gov
                              </a>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="gap-2"
                              data-testid="button-download-label"
                            >
                              <a
                                href={`/api/download-label/${selectedDrug.labelId}`}
                                download
                              >
                                <Download className="h-4 w-4" />
                                Download Label Text
                              </a>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Medical Disclaimer Footer */}
      <footer className="border-t bg-destructive/10 mt-12">
        <div className="max-w-4xl mx-auto px-6 py-6 md:px-8">
          <div className="flex gap-3 items-start">
            <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-base font-semibold text-destructive mb-1" data-testid="text-footer-warning">
                This is NOT to be considered medical advice.
              </p>
              <p className="text-sm text-foreground" data-testid="text-footer-disclaimer">
                Please refer all questions to your physician.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
