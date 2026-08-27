import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '../components/ui';
import {
  ArrowLeft,
  AlertTriangle,
  Check,
  X,
  Edit2,
  MessageSquare,
  Cpu,
  Clock,
  GitFork,
  Mic,
  MicOff,
  Volume2,
  ChevronDown,
  ChevronUp,
  Terminal,
  ShieldCheck
} from 'lucide-react';
import { useRole } from '../context/RoleContext';

export const ExceptionReview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { roleName } = useRole();

  const [manualValue, setManualValue] = useState('');
  const [reviewerComment, setReviewerComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showPromptInspector, setShowPromptInspector] = useState(false);

  // Voice Assistant State
  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const isSpeechSupported = typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const [aiResult, setAiResult] = useState<{
    reasoning_steps?: string[];
    latency_ms?: number;
    grounding_prompt?: string;
    model_name?: string;
  } | null>(null);

  const { data: exception, isLoading } = useQuery({
    queryKey: ['exception', id],
    queryFn: () => apiService.getExceptionById(id!)
  });

  const aiAssistMutation = useMutation({
    mutationFn: () => apiService.generateAiAssist(id!),
    onSuccess: (data) => {
      setAiResult(data);
      queryClient.invalidateQueries({ queryKey: ['exception', id] });
    }
  });

  const resolveMutation = useMutation({
    mutationFn: ({ action, newValue }: { action: 'ACCEPT_AI' | 'REJECT_AI' | 'MANUAL_EDIT', newValue?: string }) =>
      apiService.resolveException(id!, action, newValue, roleName, reviewerComment || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exception'] });
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loan'] });
      queryClient.invalidateQueries({ queryKey: ['recentAudit'] });
      navigate('/exceptions');
    }
  });

  // Setup Web Speech API (supported in Chrome/Edge; handled gracefully in Firefox)
  useEffect(() => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return;

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript.toLowerCase().trim();
        setVoiceFeedback(`Heard: "${transcript}"`);

        if (transcript.includes('analyze') || transcript.includes('ask ai') || transcript.includes('suggest')) {
          setVoiceFeedback('Voice Command: Running AI Analysis...');
          aiAssistMutation.mutate();
        } else if (transcript.includes('accept')) {
          setVoiceFeedback('Voice Command: Accepting AI Suggestion...');
          resolveMutation.mutate({ action: 'ACCEPT_AI' });
        } else if (transcript.includes('reject')) {
          setVoiceFeedback('Voice Command: Rejecting Exception...');
          resolveMutation.mutate({ action: 'REJECT_AI' });
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech Recognition notice:', e.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch {
      // Speech recognition not supported in current browser environment
      recognitionRef.current = null;
    }
  }, [aiAssistMutation, resolveMutation]);

  const toggleVoice = () => {
    if (!isSpeechSupported || !recognitionRef.current) {
      setVoiceFeedback('Voice Copilot requires Chrome or Edge (Web Speech API is not supported in Firefox). Use Action buttons below.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setVoiceFeedback(null);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setVoiceFeedback('Listening for voice commands ("Analyze", "Accept", "Reject")...');
      } catch (err) {
        console.warn(err);
        setVoiceFeedback('Microphone permission needed or already listening.');
      }
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-xs font-mono text-text-muted animate-pulse">Loading Exception Diagnostics...</div>;
  }

  if (!exception) {
    return <div className="p-8 text-center text-xs font-mono text-critical">Exception not found.</div>;
  }

  const isConflict = exception.issueType?.includes('Conflict') || exception.issueType?.includes('Servicer');

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Voice Status Pill */}
      {voiceFeedback && (
        <div className="bg-brand-subtle border border-brand/30 text-brand px-3 py-1.5 rounded text-xs font-mono flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <Volume2 className="h-3.5 w-3.5 animate-pulse text-brand shrink-0" />
            <span className="text-[11px]">{voiceFeedback}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-[10px] text-text-muted hover:text-text-primary"
            onClick={() => setVoiceFeedback(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/exceptions')}
            className="h-8 w-8 rounded"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted font-semibold">Triage</span>
              <span className="text-text-muted text-xs">/</span>
              <span className="text-xs font-mono text-brand font-semibold">{exception.loan?.loanId}</span>
              <span className="text-text-muted text-xs">/</span>
              <span className="text-xs font-mono font-medium text-text-primary">{exception.field}</span>
            </div>
            <h2 className="text-sm font-semibold tracking-tight text-text-primary mt-0.5">
              Anomaly Diagnostics & Gemini Root-Cause Verification
            </h2>
          </div>
        </div>

        {/* Action Controls & Voice Trigger */}
        <div className="flex items-center space-x-2 font-mono">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleVoice}
            className={`gap-1.5 h-7 text-xs ${isListening ? 'border-brand text-brand bg-brand-subtle animate-pulse' : ''}`}
            title={isSpeechSupported ? "Voice Commands: Say 'Analyze', 'Accept AI', or 'Reject'" : "Voice recognition is supported in Chrome & Edge (Firefox does not support Web Speech API)"}
          >
            {isListening ? (
              <>
                <Mic className="h-3 w-3 text-brand animate-bounce" />
                <span className="text-[11px] font-bold">Listening...</span>
              </>
            ) : (
              <>
                <MicOff className="h-3 w-3 text-brand" />
                <span className="text-[11px]">Voice Copilot</span>
              </>
            )}
          </Button>

          <Badge variant={
            exception.severity === 'CRITICAL' ? 'critical' :
            exception.severity === 'ERROR' ? 'critical' : 'warning'
          }>
            {exception.severity}
          </Badge>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Left Column: Defect Diagnostic & Loan Context */}
        <Card className="border border-border shadow-sm flex flex-col justify-between">
          <div>
            <CardHeader className="p-4 pb-2 border-b border-border">
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted font-semibold">Telemetric Context</span>
              <CardTitle className="text-xs font-semibold text-text-primary">
                Defect Diagnostic & Loan Payload
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="bg-critical/10 border border-critical/30 text-critical p-3 rounded text-xs font-mono leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold mb-0.5 text-[11px]">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  RULE INVARIANT BREACH
                </div>
                <div className="text-[11px] font-sans text-text-primary/90">{exception.issueType}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-bg-surface-alt p-2 rounded border border-border">
                  <span className="text-[10px] uppercase text-text-muted block">Borrower Entity</span>
                  <span className="font-semibold text-text-primary font-sans">{exception.loan?.borrowerName || 'N/A'}</span>
                </div>
                <div className="bg-bg-surface-alt p-2 rounded border border-border">
                  <span className="text-[10px] uppercase text-text-muted block">Target Field</span>
                  <Badge variant="outline" className="mt-0.5">{exception.field}</Badge>
                </div>
                <div className="bg-bg-surface-alt p-2 rounded border border-border">
                  <span className="text-[10px] uppercase text-text-muted block">Ingested Breach Value</span>
                  <span className="font-bold text-critical line-through bg-critical/10 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                    {exception.originalValue || '(null)'}
                  </span>
                </div>
                <div className="bg-bg-surface-alt p-2 rounded border border-border">
                  <span className="text-[10px] uppercase text-text-muted block">Original Principal</span>
                  <span className="font-bold text-text-primary">${exception.loan?.originalPrincipal?.toLocaleString()}</span>
                </div>
              </div>

              {/* If Servicer Conflict */}
              {isConflict && (
                <div className="p-3 bg-info/10 border border-info/30 rounded text-xs text-info space-y-1 font-mono">
                  <div className="font-bold flex items-center gap-1.5 text-[11px]">
                    <GitFork className="h-3.5 w-3.5" /> 2ND-SOURCE RECONCILIATION DISCREPANCY
                  </div>
                  <div className="text-[11px] font-sans text-text-primary/90">Origination tape differs from live Servicer cash report. Review AI reconciliation below.</div>
                </div>
              )}
            </CardContent>
          </div>

          {/* Reviewer Comment Note Box */}
          <div className="p-4 border-t border-border bg-bg-surface-alt/20 space-y-2">
            <label className="flex items-center text-[11px] font-mono font-semibold text-text-primary gap-1.5 uppercase">
              <MessageSquare className="h-3 w-3 text-text-muted" />
              Reviewer Resolution Note <span className="text-text-muted font-normal lowercase">(immutable audit log)</span>
            </label>
            <textarea
              className="w-full border border-border rounded px-2.5 py-1.5 text-xs font-mono bg-bg-surface text-text-primary resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand shadow-none"
              rows={2}
              value={reviewerComment}
              onChange={(e) => setReviewerComment(e.target.value)}
              placeholder="e.g. Verified with servicer ledger batch #4401..."
            />
          </div>
        </Card>

        {/* Right Column: AI Assistant */}
        <Card className="border border-border shadow-sm flex flex-col justify-between bg-bg-surface">
          <div>
            <CardHeader className="p-4 pb-2 border-b border-border bg-bg-surface-alt/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="h-3.5 w-3.5 text-brand" />
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                    Explainable AI Analyst (CredoraTech Copilot)
                  </CardTitle>
                </div>
                {exception.aiModel && (
                  <div className="flex items-center gap-1 text-[10px] text-text-muted font-mono bg-bg-surface px-2 py-0.5 rounded border border-border">
                    <Cpu className="h-3 w-3 text-brand" />
                    {exception.aiModel}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {!exception.aiExplanation ? (
                <div className="text-center space-y-3 py-8">
                  <p className="text-xs text-text-muted max-w-sm mx-auto">
                    Execute explainable AI analysis over full loan context, amortization math, and servicing history.
                  </p>
                  <Button
                    onClick={() => aiAssistMutation.mutate()}
                    disabled={aiAssistMutation.isPending}
                    className="w-full font-mono text-xs h-8"
                  >
                    {aiAssistMutation.isPending ? 'Generating AI Analysis...' : 'Execute AI Root-Cause Analysis'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {/* AI Explanation */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-brand font-semibold block">
                      Root Cause & Policy Analysis
                    </span>
                    <p className="text-xs leading-relaxed text-text-primary bg-bg-surface-alt p-2.5 rounded border border-border font-sans">
                      {exception.aiExplanation}
                    </p>
                  </div>

                  {/* Step-by-Step Reasoning Steps */}
                  {(aiResult?.reasoning_steps || []).length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted font-semibold block">
                        Chain-of-Thought Telemetry
                      </span>
                      <ol className="text-xs bg-bg-surface-alt border border-border rounded p-2.5 space-y-1 list-decimal list-inside text-text-secondary font-sans">
                        {aiResult!.reasoning_steps!.map((step, idx) => (
                          <li key={idx} className="leading-relaxed text-text-primary text-[11px]">
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Suggested Value & Confidence Bar */}
                  <div className="space-y-1.5 font-mono">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">AI Proposed Correction</span>
                      {exception.aiConfidence != null && (
                        <span className="text-[10px] font-bold text-success">
                          {Math.round(exception.aiConfidence * 100)}% Confidence
                        </span>
                      )}
                    </div>
                    <div className="bg-success/10 text-success p-2 rounded text-xs font-bold border border-success/20">
                      {exception.suggestedValue || 'N/A'}
                    </div>

                    {/* Confidence Progress Meter */}
                    {exception.aiConfidence != null && (
                      <div className="w-full bg-bg-surface-alt rounded h-1.5 overflow-hidden border border-border">
                        <div
                          className={`h-full transition-all duration-500 ${
                            exception.aiConfidence >= 0.90 ? 'bg-success' :
                            exception.aiConfidence >= 0.75 ? 'bg-warning' : 'bg-critical'
                          }`}
                          style={{ width: `${Math.round(exception.aiConfidence * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Section 9 Metadata Tag & Prompt Inspector Toggle */}
                  <div className="border-t border-border pt-2 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Version: {exception.aiPromptVersion || 'v2.1'}
                        {aiResult?.latency_ms ? ` (${aiResult.latency_ms}ms)` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPromptInspector(!showPromptInspector)}
                        className="flex items-center gap-1 text-[10px] font-semibold text-brand hover:underline cursor-pointer"
                      >
                        <Terminal className="h-3 w-3" />
                        {showPromptInspector ? 'Hide Prompt' : 'Inspect Grounding Prompt'}
                        {showPromptInspector ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    </div>

                    {/* Collapsible Section 9 Prompt & Grounding Inspector */}
                    {showPromptInspector && (
                      <div className="bg-bg-surface-alt text-text-primary rounded p-3 text-[11px] font-mono space-y-2 border border-border shadow-inner">
                        <div className="flex items-center justify-between text-[10px] text-text-muted border-b border-border pb-1">
                          <span className="flex items-center gap-1">
                            <Cpu className="h-3 w-3 text-brand" />
                            Model: <strong className="text-text-primary">{exception.aiModel || 'gemini-2.5-flash'}</strong>
                          </span>
                          <span className="text-warning text-[9px] flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" /> Section 9: Human Authority Required
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-text-muted uppercase tracking-wider block mb-1">
                            System Grounding Payload:
                          </span>
                          <pre className="whitespace-pre-wrap text-[10px] leading-relaxed max-h-40 overflow-y-auto text-text-secondary bg-bg-surface p-2 rounded border border-border">
                            {aiResult?.grounding_prompt || `You are a Senior Loan Quality Control Analyst and Auditor at CredoraTech FinTech.
Field failed: "${exception.field}"
Current invalid value: "${exception.originalValue}"
Issue description: "${exception.issueType}"

Full Loan Record Context:
${JSON.stringify(exception.loan || {}, null, 2)}`}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </div>

          {/* Resolution Action Footer */}
          {exception.aiExplanation && (
            <div className="p-4 border-t border-border bg-bg-surface-alt/30 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="bg-success hover:bg-success/90 text-white text-xs gap-1 font-mono h-8 shadow-sm"
                  onClick={() => resolveMutation.mutate({ action: 'ACCEPT_AI' })}
                  disabled={resolveMutation.isPending}
                >
                  <Check className="h-3.5 w-3.5" /> Accept Fix
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1 font-mono h-8 border-border"
                  onClick={() => resolveMutation.mutate({ action: 'REJECT_AI' })}
                  disabled={resolveMutation.isPending}
                >
                  <X className="h-3.5 w-3.5" /> Reject Fix
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-text-muted h-7 font-mono"
                onClick={() => {
                  setIsEditing(true);
                  setManualValue(exception.suggestedValue || exception.originalValue || '');
                }}
              >
                <Edit2 className="mr-1.5 h-3 w-3" /> Manual Override
              </Button>

              {isEditing && (
                <div className="p-2.5 bg-bg-surface border border-border rounded space-y-2 font-mono">
                  <span className="font-semibold text-[11px] block text-text-primary">Manual Value Entry</span>
                  <input
                    className="w-full border border-border p-1.5 rounded bg-bg-surface text-xs font-mono text-text-primary"
                    value={manualValue}
                    onChange={(e) => setManualValue(e.target.value)}
                    placeholder="Enter manual correction..."
                  />
                  <div className="flex space-x-2 justify-end pt-1">
                    <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs h-6 px-2.5"
                      onClick={() => resolveMutation.mutate({ action: 'MANUAL_EDIT', newValue: manualValue })}
                      disabled={resolveMutation.isPending || !manualValue.trim()}
                    >
                      Save & Commit
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
