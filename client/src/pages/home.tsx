import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ChevronDown, ChevronRight, FileText, Sparkles } from "lucide-react";
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
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold" data-testid="text-summary-header">
                        Plain Language Summary
                      </h2>
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-accent text-accent-foreground rounded text-xs font-medium border">
                        <Sparkles className="h-3 w-3" />
                        <span>AI-Generated</span>
                      </div>
                    </div>
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
                </>
              ) : null}
            </div>
          )}

          {/* Readability Scores Section */}
          <div className="mt-12 pt-12 border-t">
            <button
              onClick={() => setShowReadability(!showReadability)}
              className="flex items-center gap-2 w-full text-left hover-elevate active-elevate-2 p-3 rounded-lg"
              data-testid="button-toggle-readability"
            >
              {showReadability ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
              <h2 className="text-lg font-semibold">Label Readability Analysis</h2>
              <span className="text-sm text-muted-foreground ml-auto">
                {readabilityScores?.length || 0} drugs analyzed
              </span>
            </button>

            {showReadability && readabilityScores && (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Drug Name</th>
                      <th className="text-right p-3 font-medium">Flesch Score</th>
                      <th className="text-right p-3 font-medium">Grade Level</th>
                      <th className="text-right p-3 font-medium">SMOG</th>
                      <th className="text-right p-3 font-medium">Composite</th>
                      <th className="text-right p-3 font-medium">Words</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readabilityScores.map((score) => (
                      <tr 
                        key={score.labelId} 
                        className="border-b hover-elevate"
                        data-testid={`row-readability-${score.labelId}`}
                      >
                        <td className="p-3 font-medium">{score.drugName}</td>
                        <td className="p-3 text-right font-mono">{score.fleschReadingEase.toFixed(1)}</td>
                        <td className="p-3 text-right font-mono">{score.fleschKincaidGrade.toFixed(1)}</td>
                        <td className="p-3 text-right font-mono">{score.smog.toFixed(1)}</td>
                        <td className="p-3 text-right font-mono">{score.composite.toFixed(0)}</td>
                        <td className="p-3 text-right font-mono">{score.wordCount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
