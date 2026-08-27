import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, Button } from '../components/ui';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid
} from 'recharts';
import {
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  GitFork,
  Download,
  DollarSign,
  PieChart as PieIcon,
  Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useThemeTokens } from '../lib/theme';

export const Analytics = () => {
  const navigate = useNavigate();
  const { tokens, tooltipStyle, categoricalPalette } = useThemeTokens();

  const { data: loans, isLoading: loansLoading } = useQuery({
    queryKey: ['loansAnalytics'],
    queryFn: () => apiService.getLoans({})
  });

  const { data: exceptions, isLoading: exLoading } = useQuery({
    queryKey: ['exceptionsAnalytics'],
    queryFn: () => apiService.getExceptions({ status: 'ALL' })
  });

  const { data: summary } = useQuery({
    queryKey: ['summary'],
    queryFn: apiService.getSummary
  });

  if (loansLoading || exLoading) {
    return (
      <div className="p-12 text-center text-xs font-mono text-text-muted animate-pulse flex items-center justify-center gap-2">
        <TrendingUp className="h-4 w-4 animate-spin text-brand" /> CALCULATING PORTFOLIO RISK METRICS...
      </div>
    );
  }

  const allLoans = loans || [];
  const allExceptions = exceptions || [];

  // 1. Capital Risk Calculations
  const totalPortfolioPrincipal = allLoans.reduce((sum, l) => sum + (l.originalPrincipal || 0), 0);
  const verifiedPrincipal = allLoans
    .filter(l => l.verificationStatus === 'VERIFIED')
    .reduce((sum, l) => sum + (l.originalPrincipal || 0), 0);
  const conflictedPrincipal = allLoans
    .filter(l => l.hasConflicts)
    .reduce((sum, l) => sum + (l.originalPrincipal || 0), 0);
  const exceptionPrincipal = allLoans
    .filter(l => l.verificationStatus === 'EXCEPTIONS_FOUND' || (l.exceptions && l.exceptions.length > 0))
    .reduce((sum, l) => sum + (l.originalPrincipal || 0), 0);

  // 2. State Defect Density Data (Non-Severity -> Categorical Palette)
  const stateCounts: Record<string, { state: string; loans: number; exceptions: number; volume: number }> = {};
  allLoans.forEach(l => {
    const st = l.borrowerState || 'UNKNOWN';
    if (!stateCounts[st]) {
      stateCounts[st] = { state: st, loans: 0, exceptions: 0, volume: 0 };
    }
    stateCounts[st].loans += 1;
    stateCounts[st].volume += (l.originalPrincipal || 0);
  });
  allExceptions.forEach(e => {
    const st = e.loan?.borrowerState || 'UNKNOWN';
    if (stateCounts[st]) {
      stateCounts[st].exceptions += 1;
    }
  });
  const stateChartData = Object.values(stateCounts)
    .sort((a, b) => b.loans - a.loans)
    .slice(0, 8);

  // 3. Credit Grade Distribution (Tranching Palette)
  const gradeColorMap: Record<string, string> = {
    A: tokens.success,
    B: tokens.brand,
    C: categoricalPalette[2],
    D: tokens.warning,
    F: tokens.critical
  };

  const gradeCounts: Record<string, { name: string; value: number; color: string }> = {};
  allLoans.forEach(l => {
    const g = l.creditGrade || 'B';
    if (!gradeCounts[g]) {
      gradeCounts[g] = { name: `Grade ${g}`, value: 0, color: gradeColorMap[g] || categoricalPalette[3] };
    }
    gradeCounts[g].value += 1;
  });
  const gradeChartData = Object.values(gradeCounts).sort((a, b) => a.name.localeCompare(b.name));

  // 4. Servicer Conflict Velocity Data (Non-Severity -> Categorical Palette)
  const servicerData: Record<string, { servicer: string; total: number; conflicts: number }> = {};
  allLoans.forEach(l => {
    const serv = l.servicerName || 'Default Servicer';
    if (!servicerData[serv]) {
      servicerData[serv] = { servicer: serv, total: 0, conflicts: 0 };
    }
    servicerData[serv].total += 1;
    if (l.hasConflicts) {
      servicerData[serv].conflicts += 1;
    }
  });
  const servicerChartData = Object.values(servicerData);

  // 5. Exception Severity Distribution (Strictly Semantic Severity Palette)
  const severityData = [
    { name: 'Critical', value: allExceptions.filter(e => e.severity === 'CRITICAL').length, color: tokens.critical },
    { name: 'Error', value: allExceptions.filter(e => e.severity === 'ERROR').length, color: tokens.warning },
    { name: 'Warning', value: allExceptions.filter(e => e.severity === 'WARNING').length, color: tokens.info }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-brand font-semibold">Portfolio Intelligence</span>
            <span className="text-text-muted text-xs">/</span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Actuarial Analytics</span>
          </div>
          <h2 className="text-sm font-semibold tracking-tight text-text-primary mt-0.5">
            Credit Concentration & Quantitative Defect Density
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={apiService.getExportVerifiedLoansUrl()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs border border-border rounded px-2.5 py-1 bg-bg-surface hover:bg-bg-surface-alt font-mono font-medium transition shadow-sm text-text-primary"
          >
            <Download className="h-3 w-3 text-brand" /> Proof JSON
          </a>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => navigate('/ledger')}
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Ledger Traceability
          </Button>
        </div>
      </div>

      {/* Hero Financial Exposure Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border shadow-sm">
          <CardHeader className="p-4 pb-1.5">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-text-muted flex items-center justify-between">
              Total Portfolio Principal
              <DollarSign className="h-3.5 w-3.5 text-brand" />
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1">
            <div className="text-2xl font-bold font-mono text-text-primary tracking-tight">
              ${(totalPortfolioPrincipal / 1_000_000).toFixed(2)}M
            </div>
            <p className="text-[10px] font-mono text-text-muted">
              {allLoans.length.toLocaleString()} total loan assets
            </p>
          </CardContent>
        </Card>

        <Card className="border border-success/30 bg-success/5 shadow-sm">
          <CardHeader className="p-4 pb-1.5">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-success flex items-center justify-between">
              Certified Principal
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1">
            <div className="text-2xl font-bold font-mono text-success tracking-tight">
              ${(verifiedPrincipal / 1_000_000).toFixed(2)}M
            </div>
            <p className="text-[10px] font-mono text-text-muted">
              {totalPortfolioPrincipal > 0 ? Math.round((verifiedPrincipal / totalPortfolioPrincipal) * 100) : 0}% chained to Genesis
            </p>
          </CardContent>
        </Card>

        <Card className="border border-critical/30 bg-critical/5 shadow-sm">
          <CardHeader className="p-4 pb-1.5">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-critical flex items-center justify-between">
              Principal at Anomaly Risk
              <AlertTriangle className="h-3.5 w-3.5 text-critical" />
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1">
            <div className="text-2xl font-bold font-mono text-critical tracking-tight">
              ${(exceptionPrincipal / 1_000_000).toFixed(2)}M
            </div>
            <p className="text-[10px] font-mono text-text-muted">
              {summary?.openExceptions || 0} Open validation exceptions
            </p>
          </CardContent>
        </Card>

        <Card className="border border-info/30 bg-info/5 shadow-sm">
          <CardHeader className="p-4 pb-1.5">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-info flex items-center justify-between">
              Servicer Conflict Value
              <GitFork className="h-3.5 w-3.5 text-info" />
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1">
            <div className="text-2xl font-bold font-mono text-info tracking-tight">
              ${(conflictedPrincipal / 1_000_000).toFixed(2)}M
            </div>
            <p className="text-[10px] font-mono text-text-muted">
              {summary?.conflictedLoans || 0} Secondary feed discrepancies
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: State Geographic Concentration & Defect Density (Categorical Palette, Non-Severity) */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="p-4 pb-2 border-b border-border">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Geographic Distribution</span>
              <Activity className="h-3.5 w-3.5 text-brand" />
            </div>
            <CardTitle className="text-xs font-semibold text-text-primary">
              State Exposure & Defect Concentration (Top Jurisdictions)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stateChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={tokens.border} vertical={false} />
                  <XAxis dataKey="state" stroke={tokens.borderStrong} tick={{ fontSize: 10, fontFamily: 'monospace', fill: tokens.textMuted }} />
                  <YAxis stroke={tokens.borderStrong} tick={{ fontSize: 10, fontFamily: 'monospace', fill: tokens.textMuted }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', color: tokens.textSecondary, paddingTop: '4px' }}
                    iconType="square"
                    iconSize={8}
                  />
                  <Bar dataKey="loans" name="Total Loans" fill={categoricalPalette[0]} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="exceptions" name="Defects" fill={categoricalPalette[2]} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: Credit Grade Portfolio Risk Distribution (Tranching Donut) */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="p-4 pb-2 border-b border-border">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Credit Tranching</span>
              <PieIcon className="h-3.5 w-3.5 text-brand" />
            </div>
            <CardTitle className="text-xs font-semibold text-text-primary">
              Credit Grade Composition (A to F Ratings)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-60 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gradeChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="48%"
                    outerRadius={75}
                    innerRadius={48}
                    paddingAngle={2}
                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                  >
                    {gradeChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke={tokens.bgSurface} strokeWidth={2} />
                    ))}
                  </Pie>
                  <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" fill={tokens.textPrimary} className="text-base font-bold font-mono">
                    {allLoans.length.toLocaleString()}
                  </text>
                  <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" fill={tokens.textMuted} className="text-[9px] font-mono uppercase tracking-widest">
                    RATED
                  </text>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Chart 3: Servicer Conflict Velocity (Categorical Palette, Non-Severity) */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="p-4 pb-2 border-b border-border">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Reconciliation Velocity</span>
              <GitFork className="h-3.5 w-3.5 text-info" />
            </div>
            <CardTitle className="text-xs font-semibold text-text-primary">
              Servicer Discrepancy Density
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={servicerChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={tokens.border} vertical={false} />
                  <XAxis dataKey="servicer" stroke={tokens.borderStrong} tick={{ fontSize: 10, fontFamily: 'monospace', fill: tokens.textMuted }} />
                  <YAxis stroke={tokens.borderStrong} tick={{ fontSize: 10, fontFamily: 'monospace', fill: tokens.textMuted }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', color: tokens.textSecondary, paddingTop: '4px' }}
                    iconType="square"
                    iconSize={8}
                  />
                  <Bar dataKey="total" name="Total Ingested" fill={categoricalPalette[0]} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="conflicts" name="Discrepancies" fill={categoricalPalette[1]} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Chart 4: Exception Severity Breakdown (Strict Semantic Severity) */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="p-4 pb-2 border-b border-border">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Quality Triage</span>
              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
            </div>
            <CardTitle className="text-xs font-semibold text-text-primary">
              Defect Severity Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-60 w-full flex items-center justify-center relative">
              {severityData.length === 0 ? (
                <div className="text-xs font-mono text-text-muted">No open defects. 100% compliant.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="48%"
                      outerRadius={75}
                      innerRadius={48}
                      paddingAngle={2}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke={tokens.bgSurface} strokeWidth={2} />
                      ))}
                    </Pie>
                    <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" fill={tokens.textPrimary} className="text-base font-bold font-mono">
                      {allExceptions.length.toLocaleString()}
                    </text>
                    <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" fill={tokens.textMuted} className="text-[9px] font-mono uppercase tracking-widest">
                      DEFECTS
                    </text>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', color: tokens.textSecondary, paddingTop: '4px' }}
                      iconType="square"
                      iconSize={8}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};