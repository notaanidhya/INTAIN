import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '../components/ui';
import {
  ArrowLeft,
  CheckCircle,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Edit3,
  Save,
  X,
  Fingerprint
} from 'lucide-react';
import { useRole } from '../context/RoleContext';

export const LoanDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { roleName } = useRole();

  const [isEditing, setIsEditing] = useState(false);
  const [comment, setComment] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({});

  const { data: loan, isLoading } = useQuery({
    queryKey: ['loan', id],
    queryFn: () => apiService.getLoanById(id!),
    refetchOnMount: true,
    staleTime: 0
  });

  useEffect(() => {
    if (loan) {
      setFormData({
        borrowerName: loan.borrowerName || '',
        originalPrincipal: loan.originalPrincipal || 0,
        currentBalance: loan.currentBalance || 0,
        interestRate: loan.interestRate || 0,
        termMonths: loan.termMonths || 360,
        borrowerState: loan.borrowerState || '',
        paymentStatus: loan.paymentStatus || 'CURRENT',
        daysPastDue: loan.daysPastDue || 0,
        documentStatus: loan.documentStatus || 'COMPLETE',
        servicerName: loan.servicerName || ''
      });
    }
  }, [loan]);

  const updateMutation = useMutation({
    mutationFn: (updates: Record<string, any>) =>
      apiService.updateLoan(id!, updates, roleName, comment || undefined),
    onSuccess: () => {
      setIsEditing(false);
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['loan', id] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
    }
  });

  const verifyMutation = useMutation({
    mutationFn: () => apiService.verifyLoan(id!, roleName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan', id] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['ledgerIntegrity'] });
    }
  });

  if (isLoading) return <div className="animate-pulse p-8 font-mono text-xs text-text-muted">Loading asset metadata...</div>;
  if (!loan) return <div className="p-8 font-mono text-xs text-critical">Loan not found</div>;

  const openExceptions = loan.exceptions?.filter(e => e.status === 'OPEN') || [];

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/loans')} className="h-8 w-8 rounded">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted font-semibold">Asset Register</span>
              <span className="text-text-muted text-xs">/</span>
              <span className="font-mono text-xs text-brand font-semibold">{loan.loanId}</span>
            </div>
            <h2 className="text-sm font-semibold tracking-tight text-text-primary mt-0.5">
              Loan Asset Profile & Lineage Proof
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono">
          <Badge variant={
            loan.verificationStatus === 'VERIFIED' ? 'success' :
            loan.verificationStatus === 'EXCEPTIONS_FOUND' ? 'critical' : 'default'
          }>
            {loan.verificationStatus === 'VERIFIED' && <ShieldCheck className="h-3 w-3 mr-1" />}
            {loan.verificationStatus.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Left Column: Loan Core Information or Edit Form */}
        <Card className="border border-border shadow-sm flex flex-col justify-between">
          <div>
            <CardHeader className="p-4 pb-2 border-b border-border">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted font-semibold">
                  Contractual Specifications
                </span>
                {loan.verificationStatus !== 'VERIFIED' && (
                  <Button
                    variant={isEditing ? 'outline' : 'secondary'}
                    size="sm"
                    className="h-6 text-xs px-2 gap-1 font-mono"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    {isEditing ? <><X className="h-3 w-3" /> Cancel</> : <><Edit3 className="h-3 w-3" /> Override Fields</>}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs font-mono">
              {isEditing ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateMutation.mutate({
                      borrowerName: formData.borrowerName,
                      originalPrincipal: Number(formData.originalPrincipal),
                      currentBalance: Number(formData.currentBalance),
                      interestRate: Number(formData.interestRate),
                      termMonths: Number(formData.termMonths),
                      borrowerState: formData.borrowerState.toUpperCase().trim(),
                      paymentStatus: formData.paymentStatus,
                      daysPastDue: Number(formData.daysPastDue),
                      documentStatus: formData.documentStatus,
                      servicerName: formData.servicerName
                    });
                  }}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] uppercase text-text-muted block mb-0.5">Borrower Entity</label>
                      <input
                        type="text"
                        className="w-full h-7 rounded border border-border px-2 text-xs bg-bg-surface text-text-primary font-mono"
                        value={formData.borrowerName || ''}
                        onChange={(e) => setFormData({ ...formData, borrowerName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-text-muted block mb-0.5">State (2-Letter)</label>
                      <input
                        type="text"
                        maxLength={2}
                        className="w-full h-7 rounded border border-border px-2 text-xs font-mono uppercase bg-bg-surface text-text-primary"
                        value={formData.borrowerState || ''}
                        onChange={(e) => setFormData({ ...formData, borrowerState: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-text-muted block mb-0.5">Original Principal ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full h-7 rounded border border-border px-2 text-xs bg-bg-surface text-text-primary font-mono"
                        value={formData.originalPrincipal || ''}
                        onChange={(e) => setFormData({ ...formData, originalPrincipal: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-text-muted block mb-0.5">Current Balance ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full h-7 rounded border border-border px-2 text-xs bg-bg-surface text-text-primary font-mono"
                        value={formData.currentBalance || ''}
                        onChange={(e) => setFormData({ ...formData, currentBalance: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-text-muted block mb-0.5">Interest Rate (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full h-7 rounded border border-border px-2 text-xs bg-bg-surface text-text-primary font-mono"
                        value={formData.interestRate || ''}
                        onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-text-muted block mb-0.5">Term (Months)</label>
                      <input
                        type="number"
                        className="w-full h-7 rounded border border-border px-2 text-xs bg-bg-surface text-text-primary font-mono"
                        value={formData.termMonths || ''}
                        onChange={(e) => setFormData({ ...formData, termMonths: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-text-muted block mb-0.5">Payment Status</label>
                      <select
                        className="w-full h-7 rounded border border-border px-2 text-xs bg-bg-surface text-text-primary font-mono"
                        value={formData.paymentStatus || 'CURRENT'}
                        onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                      >
                        <option value="CURRENT">CURRENT</option>
                        <option value="30_DAYS_LATE">30 DAYS LATE</option>
                        <option value="60_DAYS_LATE">60 DAYS LATE</option>
                        <option value="90_DAYS_LATE">90+ DAYS DELINQUENT</option>
                        <option value="DEFAULT">DEFAULT</option>
                        <option value="CLOSED">CLOSED</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-text-muted block mb-0.5">Days Past Due</label>
                      <input
                        type="number"
                        className="w-full h-7 rounded border border-border px-2 text-xs bg-bg-surface text-text-primary font-mono"
                        value={formData.daysPastDue ?? ''}
                        onChange={(e) => setFormData({ ...formData, daysPastDue: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-text-muted block mb-0.5">Document Vault Status</label>
                      <select
                        className="w-full h-7 rounded border border-border px-2 text-xs bg-bg-surface text-text-primary font-mono"
                        value={formData.documentStatus || 'COMPLETE'}
                        onChange={(e) => setFormData({ ...formData, documentStatus: e.target.value })}
                      >
                        <option value="COMPLETE">COMPLETE</option>
                        <option value="MISSING_NOTE">MISSING NOTE</option>
                        <option value="UNRECORDED_MORTGAGE">UNRECORDED MORTGAGE</option>
                        <option value="INCOMPLETE_CHAIN">INCOMPLETE CHAIN</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-text-muted block mb-0.5">Servicer Entity</label>
                      <input
                        type="text"
                        className="w-full h-7 rounded border border-border px-2 text-xs bg-bg-surface text-text-primary font-mono"
                        value={formData.servicerName || ''}
                        onChange={(e) => setFormData({ ...formData, servicerName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border space-y-2">
                    <label className="text-[10px] uppercase text-text-muted block">Audit Trail Note (Required for Override)</label>
                    <input
                      type="text"
                      className="w-full h-7 rounded border border-border px-2 text-xs bg-bg-surface text-text-primary font-mono"
                      placeholder="e.g. Verified deed with county recorder..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" className="gap-1 bg-brand text-white" disabled={updateMutation.isPending}>
                        <Save className="h-3.5 w-3.5" />
                        {updateMutation.isPending ? 'Saving...' : 'Save & Re-Validate'}
                      </Button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-bg-surface-alt p-2.5 rounded border border-border space-y-0.5">
                    <span className="text-[10px] uppercase text-text-muted block">Borrower Entity</span>
                    <span className="font-semibold text-text-primary font-sans">{loan.borrowerName}</span>
                    <span className="text-[10px] text-text-muted block">ID: {loan.borrowerId}</span>
                  </div>
                  <div className="bg-bg-surface-alt p-2.5 rounded border border-border space-y-0.5">
                    <span className="text-[10px] uppercase text-text-muted block">Loan Type & Purpose</span>
                    <span className="font-semibold text-text-primary">{loan.loanType}</span>
                    <span className="text-[10px] text-text-muted block">{loan.loanPurpose}</span>
                  </div>
                  <div className="bg-bg-surface-alt p-2.5 rounded border border-border space-y-0.5">
                    <span className="text-[10px] uppercase text-text-muted block">Original Principal</span>
                    <span className="font-bold text-text-primary text-sm">${loan.originalPrincipal?.toLocaleString()}</span>
                  </div>
                  <div className="bg-bg-surface-alt p-2.5 rounded border border-border space-y-0.5">
                    <span className="text-[10px] uppercase text-text-muted block">Current Unpaid Balance</span>
                    <span className="font-bold text-text-primary text-sm">${loan.currentBalance?.toLocaleString()}</span>
                  </div>
                  <div className="bg-bg-surface-alt p-2.5 rounded border border-border space-y-0.5">
                    <span className="text-[10px] uppercase text-text-muted block">Note Interest Rate</span>
                    <span className="font-semibold text-text-primary">{loan.interestRate}%</span>
                    <span className="text-[10px] text-text-muted block">{loan.termMonths} Months</span>
                  </div>
                  <div className="bg-bg-surface-alt p-2.5 rounded border border-border space-y-0.5">
                    <span className="text-[10px] uppercase text-text-muted block">Servicer Feed</span>
                    <span className="font-semibold text-text-primary">{loan.servicerName || 'Default'}</span>
                    <span className="text-[10px] text-text-muted block">{loan.paymentStatus} ({loan.daysPastDue} DPD)</span>
                  </div>
                </div>
              )}

              {/* Conflict Callout if present */}
              {loan.hasConflicts && (
                <div className="p-3 bg-info/10 border border-info/30 rounded text-xs space-y-1">
                  <div className="font-bold text-info flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> 2ND-SOURCE SERVICER DISCREPANCY ACTIVE
                  </div>
                  <p className="text-text-secondary font-sans text-[11px]">
                    Real-time servicing tape differs from initial LOS tape. Resolve field authority in Reconciliation Engine.
                  </p>
                </div>
              )}
            </CardContent>
          </div>
        </Card>

        {/* Right Column: Cryptographic Certification Card */}
        {loan.verificationStatus === 'VERIFIED' ? (
          <Card className="bg-success/5 border border-success/30 shadow-sm flex flex-col justify-between">
            <div>
              <CardHeader className="p-4 pb-2 border-b border-success/20">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-success" />
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-success">
                    Certified Cryptographic Record
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3 font-mono text-xs">
                <p className="text-text-secondary font-sans text-xs leading-relaxed">
                  This asset record has undergone rules-based validation and sign-off. Chained directly into the immutable SHA-256 ledger.
                </p>
                
                <div className="bg-bg-surface p-3 rounded border border-border space-y-2">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-text-muted font-bold block">
                      Deterministic Record Hash (SHA-256)
                    </span>
                    <code className="text-[11px] font-mono break-all text-brand block mt-0.5 font-bold">
                      {loan.recordHash}
                    </code>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-text-muted font-bold block">
                      Chained Parent Hash
                    </span>
                    <code className="text-[10px] font-mono break-all text-text-muted block mt-0.5">
                      {loan.previousRecordHash || '0000000000000000000000000000000000000000000000000000000000000000'}
                    </code>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-text-muted pt-1 border-t border-success/20">
                  <span>Signatory: <strong className="text-text-primary">{loan.verifiedBy}</strong></span>
                  <span>{loan.verifiedAt ? new Date(loan.verifiedAt).toLocaleString() : ''}</span>
                </div>
              </CardContent>
            </div>
          </Card>
        ) : (
          <Card className="border border-border shadow-sm flex flex-col justify-between">
            <div>
              <CardHeader className="p-4 pb-2 border-b border-border">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" /> Cryptographic Certification Gate
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {openExceptions.length > 0 ? (
                  <div className="space-y-3 font-mono">
                    <div className="p-3 bg-critical/10 border border-critical/30 text-critical rounded space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        CERTIFICATION BLOCKED ({openExceptions.length} OPEN ANOMALIES)
                      </div>
                      <div className="font-sans text-[11px] text-text-primary/90 leading-relaxed">
                        Resolve all exceptions in the Exception Queue before certifying this asset into the cryptographic ledger.
                      </div>
                    </div>
                    <Button className="w-full text-xs font-mono h-8" onClick={() => navigate('/exceptions')}>
                      Open Exception Queue
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 font-mono">
                    <div className="p-3 bg-success/10 border border-success/30 text-success rounded space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <CheckCircle className="h-3.5 w-3.5 shrink-0 text-success" />
                        READY FOR CRYPTOGRAPHIC CERTIFICATION
                      </div>
                      <div className="font-sans text-[11px] text-text-primary/90 leading-relaxed">
                        All domain validation rules passed. Ready to compute SHA-256 chained hash and append to ledger.
                      </div>
                    </div>
                    <Button
                      className="w-full text-xs font-mono h-8 bg-success hover:bg-success/90 text-white shadow-sm"
                      onClick={() => verifyMutation.mutate()}
                      disabled={verifyMutation.isPending}
                    >
                      <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                      {verifyMutation.isPending ? 'Computing Chained Hash...' : 'Certify & Seal Block'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </div>
          </Card>
        )}
      </div>

      {/* Audit Timeline */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="p-4 pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-brand" />
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-text-primary">
              Reverse Traceability Audit Trail
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-4 font-mono">
            {loan.auditLogs && loan.auditLogs.length > 0 ? (
              loan.auditLogs.map((log) => (
                <div key={log.id} className="relative pl-5 pb-4 border-l border-border last:pb-0 text-xs">
                  <div className="absolute w-2 h-2 bg-brand rounded-none -left-[4px] top-1"></div>
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-text-primary text-xs">{log.action.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-text-muted">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <span className="text-text-muted text-[11px]">Actor: <strong className="text-text-primary">{log.performedBy}</strong></span>

                    {log.field && (
                      <div className="mt-1 bg-bg-surface-alt p-2 rounded space-y-0.5 border border-border text-[11px]">
                        <div><span className="text-text-muted">Field:</span> <span className="font-semibold text-text-primary">{log.field}</span></div>
                        {log.oldValue && <div><span className="text-text-muted">Prior:</span> <span className="text-critical line-through">{log.oldValue}</span></div>}
                        {log.newValue && <div><span className="text-text-muted">Updated:</span> <span className="text-success font-semibold">{log.newValue}</span></div>}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-text-muted">No audit trail entries for this asset.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
