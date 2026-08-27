import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '../components/ui';
import { ShieldCheck, ShieldAlert, RefreshCw, AlertTriangle, Database, Lock, Download, CheckCircle2, Fingerprint } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const LedgerIntegrity = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [tamperMessage, setTamperMessage] = useState<string | null>(null);

  const { data: summary } = useQuery({
    queryKey: ['summary'],
    queryFn: apiService.getSummary
  });

  const { data: verifiedLoans } = useQuery({
    queryKey: ['verifiedLoansList'],
    queryFn: () => apiService.getLoans({ verificationStatus: 'VERIFIED' })
  });

  const { data: integrityResult, refetch, isFetching } = useQuery({
    queryKey: ['ledgerIntegrity'],
    queryFn: apiService.verifyLedgerIntegrity
  });

  const tamperMutation = useMutation({
    mutationFn: apiService.tamperTest,
    onSuccess: (data) => {
      setTamperMessage(data.message);
      queryClient.invalidateQueries({ queryKey: ['ledgerIntegrity'] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['verifiedLoansList'] });
      refetch();
    },
    onError: (err: any) => {
      setTamperMessage(`Tamper test failed: ${err.message}`);
    }
  });

  const isChainValid = integrityResult?.isValid ?? true;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Integrity Status Hero */}
      <Card className={isChainValid ? 'border border-success/30 bg-success/5 shadow-sm' : 'border border-critical/30 bg-critical/10 shadow-sm'}>
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              {isChainValid ? (
                <div className="p-2.5 bg-success/10 rounded text-success border border-success/20">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              ) : (
                <div className="p-2.5 bg-critical/20 rounded text-critical border border-critical/30 animate-pulse">
                  <ShieldAlert className="h-6 w-6" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted font-semibold">Cryptographic Invariant</span>
                  <span className="text-text-muted text-xs">/</span>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-success font-bold">SHA-256 Chained</span>
                </div>
                <CardTitle className="text-sm font-semibold text-text-primary mt-0.5">
                  {isChainValid ? 'Cryptographic Ledger Integrity: VERIFIED & UNBROKEN' : 'CRITICAL ALERT: Unauthorized Database Tampering Detected'}
                </CardTitle>
                <p className="text-xs text-text-secondary mt-0.5 font-sans">
                  {isChainValid
                    ? 'All certified loan records form a deterministic, SHA-256 parent-hash chained immutable ledger.'
                    : 'The hash chain is broken. One or more verified rows in the database have been modified post-certification.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 font-mono">
              <a
                href={apiService.getExportVerifiedLoansUrl()}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs border border-border rounded px-2.5 py-1 bg-bg-surface hover:bg-bg-surface-alt font-medium transition shadow-sm text-text-primary"
              >
                <Download className="h-3 w-3 text-brand" /> Proof JSON
              </a>
              <a
                href={apiService.getExportAuditTrailUrl()}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs border border-border rounded px-2.5 py-1 bg-bg-surface hover:bg-bg-surface-alt font-medium transition shadow-sm text-text-muted"
              >
                <Download className="h-3 w-3 text-text-muted" /> Audit CSV
              </a>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="gap-1.5 text-xs h-7"
              >
                <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
                Re-Verify
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-3">
          <div className="grid md:grid-cols-3 gap-3 font-mono">
            <div className="bg-bg-surface p-3 rounded border border-border">
              <div className="text-[10px] text-text-muted uppercase font-semibold">Total Verified Records</div>
              <div className="text-xl font-bold text-text-primary mt-0.5">{integrityResult?.totalRecordsChecked ?? summary?.verifiedLoans ?? 0}</div>
            </div>
            <div className="bg-bg-surface p-3 rounded border border-border md:col-span-2">
              <div className="text-[10px] text-text-muted uppercase font-semibold">Current Batch Merkle Root</div>
              <code className="text-[11px] font-mono break-all text-brand block mt-0.5 font-bold">
                {integrityResult?.merkleRoot || summary?.ledgerHead?.merkleRoot || 'N/A'}
              </code>
            </div>
          </div>

          {!isChainValid && integrityResult && (
            <div className="p-3 bg-critical/10 border border-critical/30 text-critical rounded space-y-1.5 font-mono text-xs">
              <div className="font-bold flex items-center gap-1.5 text-[11px]">
                <AlertTriangle className="h-4 w-4" />
                TAMPER EVIDENCE DIAGNOSTIC: COMPROMISED NODE IDENTIFIED
              </div>
              <div className="text-xs">
                <strong>Broken Loan ID:</strong> <span className="font-bold underline">{integrityResult.brokenLoanId || 'Unknown'}</span>
              </div>
              <div className="text-[10px] space-y-0.5 bg-bg-surface p-2 rounded border border-critical/20">
                <div>EXPECTED HASH: {integrityResult.expectedHash}</div>
                <div>STORED DB HASH: {integrityResult.storedHash}</div>
              </div>
              <div className="text-[11px] font-sans opacity-90">{integrityResult.message}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Demo Tamper Simulator Card */}
      <Card className="border border-warning/30 bg-warning/5 shadow-sm">
        <CardHeader className="p-4 pb-2 border-b border-warning/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Lock className="h-4 w-4 text-warning" />
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-warning font-semibold">
                  Live Tamper Proof Simulator
                </span>
                <CardTitle className="text-xs font-semibold text-text-primary mt-0.5">
                  Institutional Verification Diagnostic (O(n) Chain Traversal)
                </CardTitle>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <p className="text-xs text-text-secondary leading-relaxed font-sans">
            Simulate an unauthorized direct SQL database mutation on a certified loan asset without going through the audit pipeline.
            The cryptographic validator immediately catches the byte-level drift and red-alerts the exact compromised block.
          </p>

          <div className="flex items-center gap-2 font-mono">
            <Button
              variant="destructive"
              size="sm"
              className="text-xs h-7 gap-1.5"
              onClick={() => tamperMutation.mutate()}
              disabled={tamperMutation.isPending || (summary?.verifiedLoans || 0) === 0}
            >
              <Database className="h-3 w-3" />
              Simulate DB Mutation
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 gap-1.5"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-3 w-3" />
              Re-Verify Chain
            </Button>
          </div>

          {tamperMessage && (
            <div className="p-2.5 bg-bg-surface border border-border rounded text-[11px] font-mono text-text-primary">
              {tamperMessage}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cryptographic Hash Chaining Mechanism Explanation */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="p-4 pb-2 border-b border-border">
          <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted font-semibold">Mathematical Specification</span>
          <CardTitle className="text-xs font-semibold text-text-primary">
            Chained Hash Cryptography Lifecycle
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-2 text-xs text-text-secondary font-sans leading-relaxed">
          <p>
            1. <strong className="text-text-primary">Deterministic Serialization:</strong> Every verified loan is transformed into sorted-key canonical JSON.
          </p>
          <p>
            2. <strong className="text-text-primary">Sequential Chaining:</strong> Each record incorporates the cryptographic hash of the preceding certified asset, anchoring back to the Genesis block.
          </p>
          <div className="p-2.5 bg-bg-surface-alt rounded font-mono text-[11px] text-text-primary border border-border">
            {'record_hash[i] = SHA256(canonical_json(loan[i]) + "|PREV:" + record_hash[i-1])'}
          </div>
          <p>
            3. <strong className="text-text-primary">Merkle Root Rollup:</strong> All verified block hashes roll up into a 32-byte top-level Merkle tree anchor exposed via <code>GET /summary</code>.
          </p>
        </CardContent>
      </Card>

      {/* Visual Cryptographic Hash Chain Explorer */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="p-4 pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fingerprint className="h-4 w-4 text-brand" />
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                Cryptographic Block Ledger Explorer
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              GENESIS TO HEAD
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-3 font-mono">
            {/* Genesis Anchor Block */}
            <div className="p-3 bg-bg-surface-alt border border-border rounded flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded bg-brand-subtle text-brand flex items-center justify-center font-bold text-xs border border-brand/25">
                  0
                </div>
                <div>
                  <div className="font-bold text-xs flex items-center gap-2 text-text-primary">
                    GENESIS ANCHOR BLOCK
                    <Badge variant="outline" className="text-[9px]">Base Zero</Badge>
                  </div>
                  <code className="text-[10px] text-text-muted break-all">
                    0000000000000000000000000000000000000000000000000000000000000000
                  </code>
                </div>
              </div>
              <Badge variant="secondary" className="text-[10px]">ANCHOR</Badge>
            </div>

            {/* Chained Blocks List */}
            {(!verifiedLoans || verifiedLoans.length === 0) ? (
              <div className="p-8 text-center border border-border border-dashed rounded text-xs text-text-muted">
                No certified records chained yet. Complete QC exception review to grow the cryptographic ledger.
              </div>
            ) : (
              verifiedLoans.map((loan, idx) => (
                <div key={loan.id} className="relative">
                  {/* Chaining Indicator */}
                  <div className="flex justify-center my-1">
                    <div className="flex items-center gap-1 text-[9px] text-brand font-semibold bg-brand-subtle px-2 py-0.2 rounded border border-brand/20">
                      <span>&darr; SHA256(canonical + prev_hash)</span>
                    </div>
                  </div>

                  <div className="p-3.5 border border-border rounded bg-bg-surface hover:border-brand/40 transition-colors shadow-sm space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-brand-subtle text-brand border border-brand/25 font-bold px-1.5 py-0.2 rounded text-[10px]">
                          BLOCK #{idx + 1}
                        </span>
                        <span className="font-bold text-xs text-text-primary">{loan.loanId}</span>
                        <span className="text-xs text-text-muted">({loan.borrowerName})</span>
                        <span className="text-xs font-semibold text-text-primary">${loan.originalPrincipal?.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="success" className="text-[10px]">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Certified: {loan.verifiedBy || 'Reviewer'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] px-2 text-brand"
                          onClick={() => navigate(`/loans/${loan.id}`)}
                        >
                          Audit Details &rarr;
                        </Button>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-2.5 bg-bg-surface-alt p-2.5 rounded border border-border text-[10px]">
                      <div>
                        <span className="text-[9px] text-text-muted uppercase font-bold block">Current Block Hash</span>
                        <code className="text-brand font-bold break-all block mt-0.5">
                          {loan.recordHash}
                        </code>
                      </div>
                      <div>
                        <span className="text-[9px] text-text-muted uppercase font-bold block">Chained Parent Hash</span>
                        <code className="text-text-muted break-all block mt-0.5">
                          {loan.previousRecordHash || '0000000000000000000000000000000000000000000000000000000000000000'}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
