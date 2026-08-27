import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '../components/ui';
import {
  GitFork,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Cpu,
  Check,
  X,
  FileSpreadsheet,
  Scale
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';

export const ConflictResolution = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { roleName } = useRole();
  const [resolvingKey, setResolvingKey] = useState<string | null>(null);

  const { data: loans, isLoading } = useQuery({
    queryKey: ['conflictedLoans'],
    queryFn: () => apiService.getLoans({}),
    select: (allLoans) => allLoans.filter(l => l.hasConflicts)
  });

  const resolveConflictMutation = useMutation({
    async mutationFn({ loanId, field, chosenValue, note }: { loanId: string; field: string; chosenValue: any; note: string }) {
      return apiService.updateLoan(loanId, { [field]: chosenValue }, roleName, note);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conflictedLoans'] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      setResolvingKey(null);
    }
  });

  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs font-mono text-text-muted animate-pulse flex items-center justify-center gap-2">
        <GitFork className="h-4 w-4 animate-spin text-brand" /> LOADING MULTI-SOURCE RECONCILIATION DATA...
      </div>
    );
  }

  const totalConflicts = (loans || []).reduce((acc, loan) => {
    try {
      const confs = loan.conflictDetails ? JSON.parse(loan.conflictDetails) : [];
      return acc + confs.length;
    } catch {
      return acc;
    }
  }, 0);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="grid md:grid-cols-3 gap-5">
        <Card className="md:col-span-2 border border-info/30 bg-info/5 shadow-sm">
          <CardHeader className="p-4 pb-2 border-b border-info/20">
            <div className="flex items-center space-x-2">
              <GitFork className="h-4 w-4 text-info" />
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-info font-semibold">
                  Multi-Source Reconciliation Engine
                </span>
                <CardTitle className="text-xs font-semibold text-text-primary mt-0.5">
                  Secondary Servicer Feed vs. Primary Tape Lineage
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-3">
            <p className="text-xs text-text-secondary leading-relaxed font-sans">
              Automated reconciliation detects real-time cash payment discrepancies between static origination tapes and live servicing feeds.
              Review field discrepancies, inspect confidence levels, and commit authoritative data prior to final cryptographic certification.
            </p>
          </CardContent>
        </Card>

        {/* Quick Stats Card */}
        <Card className="border border-border shadow-sm flex flex-col justify-between">
          <CardHeader className="p-4 pb-1.5 border-b border-border">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-text-muted flex items-center justify-between">
              Reconciliation Summary
              <Scale className="h-3.5 w-3.5 text-brand" />
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-3 space-y-1.5 font-mono">
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-info">{loans?.length || 0}</span>
              <span className="text-xs text-text-muted">Affected Loans</span>
            </div>
            <div className="text-xs font-semibold text-text-primary">
              {totalConflicts} Active Field Discrepancies
            </div>
            <div className="text-[10px] text-text-muted pt-1 border-t border-border">
              Servicer cash priority applied automatically on balance & DPD.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conflicted Loans List */}
      <div className="space-y-4">
        {!loans || loans.length === 0 ? (
          <Card className="border border-border border-dashed">
            <CardContent className="py-14 text-center space-y-2.5 font-mono">
              <div className="p-2.5 bg-success/10 rounded w-10 h-10 flex items-center justify-center mx-auto text-success border border-success/20">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">Zero Source Conflicts Detected</div>
                <p className="text-xs text-text-muted max-w-md mx-auto mt-1 font-sans">
                  All origination tape attributes match the secondary servicing feeds. No field-level discrepancies require reconciliation.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-mono h-7"
                onClick={() => navigate('/upload')}
              >
                <FileSpreadsheet className="h-3 w-3 mr-1.5" /> Upload Servicer Update
              </Button>
            </CardContent>
          </Card>
        ) : (
          loans.map((loan) => {
            let conflicts: any[] = [];
            try {
              if (loan.conflictDetails) {
                conflicts = JSON.parse(loan.conflictDetails);
              }
            } catch {
              conflicts = [];
            }

            return (
              <Card key={loan.id} className="border border-border shadow-sm overflow-hidden">
                <CardHeader className="p-3.5 border-b border-border bg-bg-surface-alt/40">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 font-mono">
                      <Badge variant="info" className="text-[10px] gap-1 px-1.5 py-0.2">
                        <ShieldAlert className="h-3 w-3" />
                        {conflicts.length} DISCREPANCY
                      </Badge>
                      <span className="font-bold text-xs text-text-primary">{loan.loanId}</span>
                      <span className="text-xs text-text-muted">({loan.borrowerName})</span>
                      <span className="text-[11px] text-text-muted hidden sm:inline">&bull; Servicer: {loan.servicerName || 'Default'}</span>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs gap-1 h-6 px-2 font-mono"
                      onClick={() => navigate(`/loans/${loan.id}`)}
                    >
                      Audit Trail <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {conflicts.length === 0 ? (
                    <div className="p-4 text-xs font-mono text-text-muted">Conflict details recorded in exception queue.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left font-mono">
                        <thead>
                          <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-muted bg-bg-surface-alt/30">
                            <th className="py-2.5 px-4">Target Field</th>
                            <th className="py-2.5 px-3 text-brand">Origination Tape (Static)</th>
                            <th className="py-2.5 px-3 text-info">Servicer Feed (Real-Time)</th>
                            <th className="py-2.5 px-3">Domain Recommendation</th>
                            <th className="py-2.5 px-4 text-right">Commit Authority</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {conflicts.map((c, idx) => {
                            const actionKey = `${loan.id}-${c.field}`;
                            const isPending = resolveConflictMutation.isPending && resolvingKey === actionKey;

                            return (
                              <tr key={idx} className="hover:bg-bg-surface-alt/40 transition-colors">
                                <td className="py-2.5 px-4 font-semibold text-text-primary">
                                  {c.field}
                                </td>
                                <td className="py-2.5 px-3 text-brand font-medium">
                                  {String(c.tapeValue)}
                                </td>
                                <td className="py-2.5 px-3 text-info font-bold">
                                  {String(c.servicerValue)}
                                </td>
                                <td className="py-2.5 px-3 text-text-muted max-w-sm font-sans">
                                  <div className="font-semibold text-text-primary text-[11px] flex items-center gap-1.5 font-mono">
                                    <Cpu className="h-3 w-3 text-brand" />
                                    Recommendation: <span className="font-bold text-info">{String(c.recommendedValue)}</span>
                                    <Badge variant="outline" className="text-[10px] ml-auto">
                                      {Math.round((c.confidence || 0.9) * 100)}% Match
                                    </Badge>
                                  </div>
                                  <div className="text-[10px] text-text-muted mt-0.5 leading-relaxed">
                                    {c.reasoning}
                                  </div>
                                </td>
                                <td className="py-2.5 px-4 text-right space-x-1.5 whitespace-nowrap font-sans">
                                  <Button
                                    size="sm"
                                    className="h-6 text-[11px] bg-brand hover:bg-brand/90 text-white gap-1 font-mono shadow-sm"
                                    onClick={() => {
                                      setResolvingKey(actionKey);
                                      resolveConflictMutation.mutate({
                                        loanId: loan.id,
                                        field: c.field,
                                        chosenValue: c.servicerValue,
                                        note: `Accepted Servicer 2nd-source value (${c.servicerValue}) over tape (${c.tapeValue})`
                                      });
                                    }}
                                    disabled={isPending}
                                  >
                                    <Check className="h-3 w-3" /> Commit Servicer
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-[11px] gap-1 font-mono"
                                    onClick={() => {
                                      setResolvingKey(actionKey);
                                      resolveConflictMutation.mutate({
                                        loanId: loan.id,
                                        field: c.field,
                                        chosenValue: c.tapeValue,
                                        note: `Maintained Origination Tape value (${c.tapeValue}) as contractual truth`
                                      });
                                    }}
                                    disabled={isPending}
                                  >
                                    <X className="h-3 w-3" /> Keep Tape
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};