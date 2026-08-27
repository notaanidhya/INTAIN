import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '../components/ui';
import { useNavigate } from 'react-router-dom';
import { Search, Download, ShieldCheck, Eye, Sparkles, X, Filter, Cpu } from 'lucide-react';
import type { Loan } from '../types';

const SAMPLE_QUERIES = [
  'Delinquent loans in California with DPD > 0',
  'High balance loans over $400,000',
  'Loans with interest rate > 6.5%',
  'Loans with multi-source servicer conflicts',
  'Verified certified loans in Texas'
];

export const LoansList = () => {
  const [search, setSearch] = useState('');
  const [nlQuery, setNlQuery] = useState('');
  const [activeNlResult, setActiveNlResult] = useState<{ query: string; explanation: string; loans: Loan[] } | null>(null);
  const [verificationFilter, setVerificationFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const navigate = useNavigate();

  const { data: defaultLoans, isLoading } = useQuery({
    queryKey: ['loans', verificationFilter, statusFilter],
    queryFn: () => apiService.getLoans({
      verificationStatus: verificationFilter,
      status: statusFilter
    }),
    enabled: !activeNlResult
  });

  const nlSearchMutation = useMutation({
    mutationFn: (queryText: string) => apiService.searchLoansNaturalLanguage(queryText),
    onSuccess: (data) => {
      setActiveNlResult({
        query: data.query,
        explanation: data.filter?.explanation || `Filtered by "${data.query}"`,
        loans: data.loans
      });
    }
  });

  const handleNlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlQuery.trim()) return;
    nlSearchMutation.mutate(nlQuery);
  };

  const handleClearNl = () => {
    setActiveNlResult(null);
    setNlQuery('');
  };

  if (isLoading && !activeNlResult) return <div className="animate-pulse p-8 font-mono text-xs text-text-muted">Loading asset ledger...</div>;

  const currentLoansList = activeNlResult ? activeNlResult.loans : (defaultLoans || []);

  const filteredLoans = currentLoansList.filter(loan => {
    const s = search.toLowerCase();
    const matchesSearch =
      loan.loanId.toLowerCase().includes(s) ||
      (loan.borrowerName || '').toLowerCase().includes(s) ||
      (loan.borrowerId || '').toLowerCase().includes(s);
    return matchesSearch;
  });

  // Export clean dataset for Data Consumers
  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(filteredLoans, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intain_loan_tape_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Natural Language Semantic Query Bar */}
      <Card className="border border-border bg-bg-surface-alt/30 shadow-sm">
        <CardContent className="p-4 space-y-2.5">
          <form onSubmit={handleNlSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Sparkles className="absolute left-3 top-2.5 h-3.5 w-3.5 text-brand" />
              <input
                type="text"
                placeholder="Query in natural language (e.g. 'Show me loans in CA with interest rate > 6% and delinquent DPD')..."
                className="w-full pl-8 pr-4 h-8 rounded border border-border bg-bg-surface text-xs font-mono shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand text-text-primary"
                value={nlQuery}
                onChange={(e) => setNlQuery(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              size="sm"
              className="text-xs gap-1.5 h-8 font-mono bg-brand text-white shadow-sm"
              disabled={nlSearchMutation.isPending || !nlQuery.trim()}
            >
              <Cpu className="h-3 w-3" />
              {nlSearchMutation.isPending ? 'PARSING...' : 'Semantic Query'}
            </Button>
            {activeNlResult && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs gap-1 h-8 font-mono"
                onClick={handleClearNl}
              >
                <X className="h-3 w-3" /> Clear Filter
              </Button>
            )}
          </form>

          {/* Quick Query Suggestions */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-text-muted pt-0.5 font-mono">
            <span className="font-semibold flex items-center gap-1 mr-1 text-[10px] uppercase tracking-wider">
              <Filter className="h-3 w-3" /> Suggestions:
            </span>
            {SAMPLE_QUERIES.map((q, idx) => (
              <button
                key={idx}
                type="button"
                className="px-2 py-0.5 rounded border border-border bg-bg-surface hover:bg-bg-surface-alt text-text-primary transition text-[10px] font-mono cursor-pointer"
                onClick={() => {
                  setNlQuery(q);
                  nlSearchMutation.mutate(q);
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Loan Register Table */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="p-4 pb-3 border-b border-border space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Master Registry</span>
              <CardTitle className="text-xs font-semibold text-text-primary">
                {activeNlResult ? `Semantic Result: "${activeNlResult.query}"` : 'Institutional Loan Assets Tape'} ({filteredLoans.length} Records)
              </CardTitle>
            </div>

            <div className="flex flex-wrap items-center gap-2 font-mono">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-text-muted" />
                <input
                  type="text"
                  placeholder="Filter by ID or Borrower..."
                  className="pl-8 pr-3 h-7 text-xs rounded border border-border bg-bg-surface w-48 shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand text-text-primary"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {!activeNlResult && (
                <>
                  <select
                    className="h-7 rounded border border-border bg-bg-surface px-2 text-xs shadow-none text-text-primary"
                    value={verificationFilter}
                    onChange={(e) => setVerificationFilter(e.target.value)}
                  >
                    <option value="ALL">All Certifications</option>
                    <option value="VERIFIED">Verified Clean</option>
                    <option value="EXCEPTIONS_FOUND">Exceptions Flagged</option>
                    <option value="PENDING">Pending Audit</option>
                  </select>

                  <select
                    className="h-7 rounded border border-border bg-bg-surface px-2 text-xs shadow-none text-text-primary"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="ALL">All Payment States</option>
                    <option value="CURRENT">Current</option>
                    <option value="30_DAYS_LATE">30 Days Late</option>
                    <option value="60_DAYS_LATE">60 Days Late</option>
                    <option value="90_PLUS_DAYS_LATE">90+ Days Late</option>
                    <option value="CLOSED">Closed / Paid Off</option>
                  </select>
                </>
              )}

              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleExportJson}
              >
                <Download className="h-3 w-3" /> Export JSON
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left font-mono">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-muted bg-bg-surface-alt/30">
                  <th className="px-3.5 py-2.5">Loan ID</th>
                  <th className="px-3.5 py-2.5">Borrower Entity</th>
                  <th className="px-3.5 py-2.5">Type</th>
                  <th className="px-3.5 py-2.5">Original Principal</th>
                  <th className="px-3.5 py-2.5">Current Balance</th>
                  <th className="px-3.5 py-2.5">Rate</th>
                  <th className="px-3.5 py-2.5">State</th>
                  <th className="px-3.5 py-2.5">Payment / DPD</th>
                  <th className="px-3.5 py-2.5">Docs</th>
                  <th className="px-3.5 py-2.5">Certification</th>
                  <th className="px-3.5 py-2.5 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLoans.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-8 text-text-muted">
                      No loan records match query criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLoans.map(loan => (
                    <tr key={loan.id} className="hover:bg-bg-surface-alt/40 transition-colors">
                      <td className="px-3.5 py-2 font-medium text-brand">
                        {loan.loanId}
                      </td>
                      <td className="px-3.5 py-2 font-sans font-medium text-text-primary">{loan.borrowerName || '-'}</td>
                      <td className="px-3.5 py-2 text-text-muted">{loan.loanType || 'CONV'}</td>
                      <td className="px-3.5 py-2 font-semibold text-text-primary">${loan.originalPrincipal?.toLocaleString()}</td>
                      <td className="px-3.5 py-2 font-semibold text-text-primary">${loan.currentBalance?.toLocaleString()}</td>
                      <td className="px-3.5 py-2">{loan.interestRate}%</td>
                      <td className="px-3.5 py-2 font-semibold">{loan.borrowerState || '-'}</td>
                      <td className="px-3.5 py-2">
                        <span>{loan.paymentStatus}</span>
                        {loan.daysPastDue > 0 && (
                          <span className="text-[10px] text-critical block">({loan.daysPastDue} DPD)</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2">
                        <Badge variant={loan.documentStatus === 'COMPLETE' ? 'success' : 'warning'} className="text-[10px] py-0">
                          {loan.documentStatus || 'COMPLETE'}
                        </Badge>
                      </td>
                      <td className="px-3.5 py-2">
                        <Badge variant={
                          loan.verificationStatus === 'VERIFIED' ? 'success' :
                          loan.verificationStatus === 'EXCEPTIONS_FOUND' ? 'critical' : 'default'
                        } className="text-[10px]">
                          {loan.verificationStatus === 'VERIFIED' && <ShieldCheck className="h-3 w-3 mr-1" />}
                          {loan.verificationStatus.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-3.5 py-2 text-right font-sans">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-2 text-text-secondary hover:text-text-primary"
                          onClick={() => navigate(`/loans/${loan.id}`)}
                        >
                          <Eye className="h-3 w-3 mr-1" /> View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
