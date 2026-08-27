import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '../components/ui';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Activity,
  ShieldCheck,
  ArrowRight,
  GitFork,
  Upload,
  RotateCcw,
  Download,
  Database,
  FileSpreadsheet,
  FileCheck,
  Cpu,
  Sliders
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { useRole } from '../context/RoleContext';
import { useNavigate } from 'react-router-dom';
import { useThemeTokens } from '../lib/theme';

export const Dashboard = () => {
  const { role, roleName } = useRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tokens, tooltipStyle } = useThemeTokens();

  const resetMutation = useMutation({
    mutationFn: () => apiService.resetDemoData(roleName),
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      alert(data.message);
    }
  });

  const { data: summary, isLoading, isError } = useQuery({
    queryKey: ['summary'],
    queryFn: apiService.getSummary,
    refetchInterval: 8000
  });

  const { data: uploads } = useQuery({
    queryKey: ['uploads'],
    queryFn: apiService.getUploads,
    refetchInterval: 10000
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['recentAudit'],
    queryFn: () => apiService.getAllAuditLogs(6)
  });

  const { data: batchAi } = useQuery({
    queryKey: ['batchSummary'],
    queryFn: apiService.getBatchSummary,
    enabled: role === 'REVIEWER',
    staleTime: 60000
  });

  const { data: integrity } = useQuery({
    queryKey: ['ledgerIntegrity'],
    queryFn: apiService.verifyLedgerIntegrity,
    enabled: role === 'DATA_CONSUMER',
    refetchInterval: 15000
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-muted text-sm flex items-center gap-2 font-mono">
          <Activity className="h-4 w-4 animate-spin text-brand" /> Loading Trust Pipeline Metrics...
        </div>
      </div>
    );
  }

  if (isError || !summary) {
    return <div className="text-critical p-4 bg-critical/10 border border-critical/20 rounded-lg text-xs font-mono">Failed to load dashboard metrics from backend.</div>;
  }

  const score = summary.dataQualityScore ?? 100;

  // Severity palette mapping for loan verification status
  const chartData = [
    { name: 'Certified Verified', value: summary.verifiedLoans, color: tokens.success },
    { name: 'Pending Review', value: tokens.brand, color: tokens.brand },
    { name: 'Exceptions Found', value: summary.exceptionLoans, color: tokens.critical }
  ];

  const statCards = [
    { title: 'Total Ingested Assets', value: summary.totalLoans.toLocaleString(), icon: FileText, color: 'text-brand' },
    { title: 'Certified Verified', value: summary.verifiedLoans.toLocaleString(), icon: CheckCircle2, color: 'text-success' },
    { title: 'Open Exception Items', value: summary.openExceptions.toLocaleString(), icon: AlertTriangle, color: 'text-critical' },
    { title: 'Reconciliation Conflicts', value: summary.conflictedLoans.toLocaleString(), icon: GitFork, color: 'text-info' },
  ];

  return (
    <div className="space-y-5">
      {/* Top Banner: Composite Data Quality Score & Persona Header */}
      <div className="grid md:grid-cols-3 gap-5">
        <Card className="md:col-span-1 border border-border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
                Governance Index
              </span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline space-x-1.5 font-mono">
              <span className="text-4xl font-black text-text-primary tracking-tight">{score}</span>
              <span className="text-sm text-text-muted font-semibold">/ 100.0</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-mono font-medium tracking-tight bg-bg-surface-alt">
              {score >= 90 ? (
                <span className="text-success font-semibold">INVESTMENT GRADE AAA</span>
              ) : score >= 75 ? (
                <span className="text-warning font-semibold">GRADE BBB (COVENANTS ACTIVE)</span>
              ) : (
                <span className="text-critical font-semibold">HIGH EXCEPTION DENSITY</span>
              )}
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed pt-1">
              Weighted automated trust index calculated across 15 validation invariants, compound amortization schedules, and servicer feeds.
            </p>
          </CardContent>
        </Card>

        {/* Persona Guidance Banner */}
        <Card className="md:col-span-2 border border-border shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] font-mono">
                WORKSPACE: {role}
              </Badge>
              <span className="text-[10px] font-mono text-text-muted">TRACEABLE TRUTH PIPELINE</span>
            </div>
            <CardTitle className="text-sm font-semibold tracking-tight mt-1 text-text-primary">
              {role === 'DATA_OPERATOR' && 'Data Ingestion & Multi-Source Tape Normalization'}
              {role === 'REVIEWER' && 'Quality Control & Explainable AI Resolution Console'}
              {role === 'DATA_CONSUMER' && 'Certified Asset Ledger & Institutional Governance'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-text-secondary leading-relaxed">
              {role === 'DATA_OPERATOR' && 'Ingest raw primary loan tapes, secondary servicer cash updates, and vault document manifests to trigger automated trust validation.'}
              {role === 'REVIEWER' && 'Inspect validation anomalies, amortization drifts, and cross-source discrepancies with explainable Gemini 2.5 Flash guidance.'}
              {role === 'DATA_CONSUMER' && 'Verify sequential SHA-256 hash chains, inspect Merkle tree anchors, and export cryptographic proof packages for secondary investors.'}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border">
              {role === 'DATA_OPERATOR' && (
                <>
                  <Button size="sm" onClick={() => navigate('/upload')} className="gap-1.5">
                    <Upload className="h-3 w-3" /> Ingest Loan Tape
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate('/loans')} className="gap-1.5">
                    Portfolio Records <ArrowRight className="h-3 w-3" />
                  </Button>
                </>
              )}
              {role === 'REVIEWER' && (
                <>
                  <Button size="sm" onClick={() => navigate('/exceptions')} className="gap-1.5">
                    <AlertTriangle className="h-3 w-3" /> Exception Queue ({summary.openExceptions})
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate('/conflicts')} className="gap-1.5">
                    <GitFork className="h-3 w-3" /> Servicer Discrepancies ({summary.conflictedLoans})
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate('/rules')} className="gap-1.5">
                    <Sliders className="h-3 w-3" /> Rules Engine
                  </Button>
                </>
              )}
              {role === 'DATA_CONSUMER' && (
                <>
                  <Button size="sm" onClick={() => navigate('/ledger')} className="gap-1.5">
                    <ShieldCheck className="h-3 w-3" /> Cryptographic Ledger
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate('/analytics')} className="gap-1.5">
                    Portfolio Analytics <ArrowRight className="h-3 w-3" />
                  </Button>
                  <a
                    href={apiService.getExportVerifiedLoansUrl()}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs border border-border rounded px-2.5 py-1 bg-bg-surface hover:bg-bg-surface-alt font-medium transition text-text-primary"
                  >
                    <Download className="h-3 w-3 text-brand" /> Proof JSON
                  </a>
                </>
              )}

              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-xs text-text-muted hover:text-critical ml-auto"
                onClick={() => {
                  if (window.confirm('Reset all transactional loan tapes, exceptions, and cryptographic states to clean genesis?')) {
                    resetMutation.mutate();
                  }
                }}
                disabled={resetMutation.isPending}
              >
                <RotateCcw className={`h-3 w-3 ${resetMutation.isPending ? 'animate-spin' : ''}`} />
                {resetMutation.isPending ? 'Resetting...' : 'Reset State'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* High-Density KPI Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, idx) => (
          <Card key={idx} className="border border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 p-4">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted font-semibold">{stat.title}</span>
              <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold font-mono text-text-primary tracking-tight">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ROLE-SPECIFIC WORKSPACE SECTION */}
      {role === 'DATA_OPERATOR' && (
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3 border-b border-border bg-bg-surface-alt/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-brand" />
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                  Ingestion Lineage & Stream History
                </CardTitle>
              </div>
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => navigate('/upload')}>
                <Upload className="h-3 w-3" /> New Ingestion
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-3 p-0">
            {uploads && uploads.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border text-[10px] font-mono uppercase tracking-wider text-text-muted bg-bg-surface-alt/30">
                      <th className="py-2.5 px-4">Source Tape File</th>
                      <th className="py-2.5 px-3">Stream Type</th>
                      <th className="py-2.5 px-3">Total Rows</th>
                      <th className="py-2.5 px-3">Compliant</th>
                      <th className="py-2.5 px-3">Exceptions</th>
                      <th className="py-2.5 px-3">Conflicts</th>
                      <th className="py-2.5 px-3">Operator</th>
                      <th className="py-2.5 px-4 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {uploads.slice(0, 5).map((u) => (
                      <tr key={u.id} className="hover:bg-bg-surface-alt/50 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-medium flex items-center gap-2 text-text-primary">
                          {u.fileType === 'LOAN_TAPE' && <FileSpreadsheet className="h-3.5 w-3.5 text-brand shrink-0" />}
                          {u.fileType === 'SERVICER_UPDATE' && <GitFork className="h-3.5 w-3.5 text-info shrink-0" />}
                          {u.fileType === 'DOCUMENT_MANIFEST' && <FileCheck className="h-3.5 w-3.5 text-success shrink-0" />}
                          <span className="truncate max-w-xs">{u.filename}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant="outline" className="text-[10px]">{u.fileType.replace('_', ' ')}</Badge>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-text-primary">{u.totalRecords}</td>
                        <td className="py-2.5 px-3 font-mono text-success font-semibold">{u.validRecords}</td>
                        <td className="py-2.5 px-3 font-mono text-critical font-semibold">{u.exceptionRecords}</td>
                        <td className="py-2.5 px-3 font-mono text-info font-semibold">{u.conflictRecords || 0}</td>
                        <td className="py-2.5 px-3 text-text-muted font-mono text-[11px]">{u.uploadedBy}</td>
                        <td className="py-2.5 px-4 text-right text-text-muted font-mono text-[11px]">{new Date(u.createdAt).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-xs font-mono text-text-muted py-8 text-center">
                No ingestion streams recorded. Upload a loan tape to start the automated trust pipeline.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {role === 'REVIEWER' && (
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3 border-b border-border bg-bg-surface-alt/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-brand" />
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                  Anomaly Diagnostics & Severity Matrix
                </CardTitle>
              </div>
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => navigate('/exceptions')}>
                Launch Exception Reviewer
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid md:grid-cols-3 gap-3 font-mono">
              <div className="p-3 bg-critical/5 border border-critical/20 rounded text-xs">
                <div className="text-critical flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Critical Blockers</span>
                  <span className="text-lg font-bold">{summary.criticalExceptions}</span>
                </div>
                <p className="text-[10px] text-text-muted font-sans mt-1">Direct blocks to cryptographic certification</p>
              </div>
              <div className="p-3 bg-warning/5 border border-warning/20 rounded text-xs">
                <div className="text-warning flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Standard Errors</span>
                  <span className="text-lg font-bold">{summary.errorExceptions}</span>
                </div>
                <p className="text-[10px] text-text-muted font-sans mt-1">Rule violations requiring reviewer signoff</p>
              </div>
              <div className="p-3 bg-info/5 border border-info/20 rounded text-xs">
                <div className="text-info flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Warnings & Stale Feeds</span>
                  <span className="text-lg font-bold">{summary.warningExceptions}</span>
                </div>
                <p className="text-[10px] text-text-muted font-sans mt-1">Informational and secondary-source notices</p>
              </div>
            </div>

            {batchAi?.summary && (
              <div className="p-3 bg-bg-surface-alt border border-border rounded text-xs space-y-1.5 font-mono">
                <div className="font-semibold text-brand flex items-center gap-1.5 text-[11px]">
                  <Cpu className="h-3.5 w-3.5" /> GEMINI 2.5 FLASH BATCH SYNTHESIS
                </div>
                <p className="text-text-secondary leading-relaxed text-[11px] font-sans">{batchAi.summary}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {role === 'DATA_CONSUMER' && (
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3 border-b border-border bg-bg-surface-alt/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-success" />
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                  Cryptographic Trust Center & Institutional Exports
                </CardTitle>
              </div>
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => navigate('/ledger')}>
                Blockchain Visualizer
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-bg-surface border border-border rounded space-y-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted block">
                  Current Merkle Root (Chained Trust Anchor)
                </span>
                <code className="text-[11px] font-mono text-brand break-all block font-bold bg-bg-surface-alt p-2 rounded border border-border">
                  {integrity?.merkleRoot || summary.ledgerHead.merkleRoot}
                </code>
                <span className="text-[11px] font-mono text-text-muted block pt-1">
                  STATUS: <strong className="text-success">{integrity?.isValid ? 'LEDGER CHAIN 100% INTACT' : 'CHAIN VERIFIED'}</strong>
                </span>
              </div>

              <div className="p-3.5 bg-bg-surface border border-border rounded space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted block">
                  Institutional Export Center
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    href={apiService.getExportVerifiedLoansUrl()}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs bg-brand text-white px-3 py-1.5 rounded font-mono font-medium hover:bg-brand/90 transition shadow-sm"
                  >
                    <Download className="h-3 w-3" /> Proof JSON
                  </a>
                  <a
                    href={apiService.getExportAuditTrailUrl()}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs border border-border bg-bg-surface px-3 py-1.5 rounded font-mono font-medium hover:bg-bg-surface-alt text-text-primary transition"
                  >
                    <Download className="h-3 w-3 text-text-muted" /> Audit CSV
                  </a>
                  <a
                    href={apiService.getExportExceptionsUrl()}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs border border-border bg-bg-surface px-3 py-1.5 rounded font-mono font-medium hover:bg-bg-surface-alt text-text-primary transition"
                  >
                    <Download className="h-3 w-3 text-text-muted" /> Exceptions CSV
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts & Pipeline Progress */}
      <div className="grid gap-5 md:grid-cols-7">
        {/* Donut Chart with Center Metric Label */}
        <Card className="md:col-span-4 border border-border shadow-sm">
          <CardHeader className="pb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Portfolio Distribution</span>
            <CardTitle className="text-xs font-semibold text-text-primary">Loan Verification Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="48%"
                  innerRadius={58}
                  outerRadius={86}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke={tokens.bgSurface} strokeWidth={2} />
                  ))}
                </Pie>
                {/* Center Label for Donut */}
                <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" fill={tokens.textPrimary} className="text-xl font-bold font-mono">
                  {summary.totalLoans.toLocaleString()}
                </text>
                <text x="50%" y="56%" textAnchor="middle" dominantBaseline="middle" fill={tokens.textMuted} className="text-[9px] font-mono uppercase tracking-widest">
                  TOTAL ASSETS
                </text>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  wrapperStyle={{
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: tokens.textSecondary,
                    paddingTop: '8px'
                  }}
                  iconType="square"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Verification Progress & Governance Stream */}
        <Card className="md:col-span-3 border border-border shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Assurance Velocity</span>
            <CardTitle className="text-xs font-semibold text-text-primary">Verification Throughput</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5 font-mono">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-text-muted">Certified Clean Records</span>
                <span className="font-bold text-text-primary">{summary.verifiedLoans} / {summary.totalLoans}</span>
              </div>
              <div className="w-full bg-bg-surface-alt rounded h-2 overflow-hidden border border-border">
                <div
                  className="bg-success h-full transition-all duration-500"
                  style={{ width: `${summary.totalLoans > 0 ? (summary.verifiedLoans / summary.totalLoans) * 100 : 0}%` }}
                />
              </div>
              <div className="text-[10px] text-text-muted text-right">
                {summary.totalLoans > 0 ? Math.round((summary.verifiedLoans / summary.totalLoans) * 100) : 0}% certified
              </div>
            </div>

            {/* Live Audit Timeline */}
            <div className="border-t border-border pt-3 space-y-2 font-mono">
              <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                Live Audit Stream
              </div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {auditLogs && auditLogs.length > 0 ? (
                  auditLogs.map((log) => (
                    <div key={log.id} className="text-[11px] flex items-center justify-between bg-bg-surface-alt px-2.5 py-1.5 rounded border border-border">
                      <div className="truncate mr-2">
                        <span className="font-semibold text-text-primary">{log.action}</span>
                        {log.loan && <span className="text-text-muted ml-1.5">({log.loan.loanId})</span>}
                      </div>
                      <span className="text-[10px] text-text-muted shrink-0">{log.performedBy}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-text-muted">No audit events recorded yet.</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
