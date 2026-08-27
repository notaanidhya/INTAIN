import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '../components/ui';
import { Sparkles, Check, AlertCircle, Cpu } from 'lucide-react';

export const RulesManager = () => {
  const queryClient = useQueryClient();
  const [nlPrompt, setNlPrompt] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data: rules, isLoading } = useQuery({
    queryKey: ['rules'],
    queryFn: apiService.getRules
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => apiService.toggleRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rules'] });
    }
  });

  const generateRuleMutation = useMutation({
    mutationFn: (prompt: string) => apiService.generateRuleFromNl(prompt),
    onSuccess: (newRule) => {
      queryClient.invalidateQueries({ queryKey: ['rules'] });
      setFeedback(`Successfully created rule: "${newRule.name}" (${newRule.ruleCode})`);
      setNlPrompt('');
    },
    onError: (err: any) => {
      setFeedback(`Failed to generate rule: ${err.message}`);
    }
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (nlPrompt.trim()) {
      setFeedback(null);
      generateRuleMutation.mutate(nlPrompt.trim());
    }
  };

  const samplePrompts = [
    "Flag any loan where days_past_due > 90 but payment_status is 'CURRENT'",
    "Flag loans where current_balance > 800000 and credit_grade is 'D' or 'F'",
    "Ensure interest_rate is between 2.0% and 15.0%",
    "Require borrower_state to be a valid 2-letter postal code"
  ];

  if (isLoading) return <div className="animate-pulse p-8 font-mono text-xs text-text-muted">Loading validation rules engine...</div>;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Natural Language Rule Generator Bar */}
      <Card className="border border-border bg-bg-surface-alt/30 shadow-sm">
        <CardHeader className="p-4 pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cpu className="h-4 w-4 text-brand" />
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-brand font-semibold">
                  GEMINI 2.5 FLASH RULE COMPILER
                </span>
                <CardTitle className="text-xs font-semibold text-text-primary mt-0.5">
                  Natural Language Business Policy Synthesizer
                </CardTitle>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-2.5">
          <form onSubmit={handleGenerate} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Flag loans where current balance > 750,000 but income band is below 50k..."
              className="flex-1 h-8 rounded border border-border bg-bg-surface px-3 text-xs font-mono shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand text-text-primary"
              value={nlPrompt}
              onChange={(e) => setNlPrompt(e.target.value)}
            />
            <Button
              type="submit"
              size="sm"
              className="h-8 text-xs font-mono bg-brand text-white gap-1.5 shadow-sm"
              disabled={!nlPrompt.trim() || generateRuleMutation.isPending}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {generateRuleMutation.isPending ? 'COMPILING...' : 'Synthesize Rule'}
            </Button>
          </form>

          <div className="flex flex-wrap gap-1.5 items-center text-[11px] text-text-muted pt-0.5 font-mono">
            <span className="font-semibold text-[10px] uppercase tracking-wider">Example Invariants:</span>
            {samplePrompts.map((p, i) => (
              <button
                key={i}
                type="button"
                className="bg-bg-surface border border-border px-2 py-0.5 rounded hover:bg-bg-surface-alt transition text-text-primary text-[10px] cursor-pointer"
                onClick={() => setNlPrompt(p)}
              >
                {p.slice(0, 42)}...
              </button>
            ))}
          </div>

          {feedback && (
            <div className={`p-2.5 rounded text-xs font-mono flex items-center gap-2 border ${feedback.includes('Success') ? 'bg-success/10 text-success border-success/30' : 'bg-critical/10 text-critical border-critical/30'}`}>
              {feedback.includes('Success') ? <Check className="h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
              {feedback}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rules Table */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Deterministic Invariants</span>
              <CardTitle className="text-xs font-semibold text-text-primary">
                Active Validation Engine Policies ({rules?.length || 0} Invariants)
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              REAL-TIME EXECUTION
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left font-mono">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-muted bg-bg-surface-alt/30">
                  <th className="px-4 py-2.5">Rule Code</th>
                  <th className="px-4 py-2.5">Specification & Invariant Logic</th>
                  <th className="px-4 py-2.5">Target Field</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5">Severity</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                  <th className="px-4 py-2.5 text-right">Switch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rules?.map((rule) => (
                  <tr key={rule.id} className="hover:bg-bg-surface-alt/40 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-text-primary">
                      {rule.ruleCode}
                      {rule.isCustom && (
                        <Badge variant="outline" className="ml-2 text-[9px] bg-brand-subtle text-brand border-brand/25">
                          AI SYNTH
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-sans">
                      <div className="font-semibold text-text-primary text-xs">{rule.name}</div>
                      <div className="text-[11px] text-text-muted leading-snug">{rule.description}</div>
                    </td>
                    <td className="px-4 py-2.5 text-text-muted">
                      <Badge variant="outline" className="text-[10px]">{rule.field}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant="secondary" className="text-[10px]">
                        {rule.ruleType}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={rule.severity === 'CRITICAL' ? 'critical' : rule.severity === 'ERROR' ? 'critical' : 'warning'} className="text-[10px]">
                        {rule.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.2 rounded text-[10px] font-bold border ${rule.isActive ? 'bg-success/10 text-success border-success/30' : 'bg-bg-surface-alt text-text-muted border-border'}`}>
                        {rule.isActive ? 'ACTIVE' : 'MUTED'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-sans">
                      <Button
                        variant={rule.isActive ? 'outline' : 'default'}
                        size="sm"
                        className="h-6 text-[11px] px-2.5 font-mono"
                        onClick={() => toggleMutation.mutate(rule.id)}
                        disabled={toggleMutation.isPending}
                      >
                        {rule.isActive ? 'Mute' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
