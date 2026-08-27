import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '../components/ui';
import { useNavigate } from 'react-router-dom';
import { Filter, RefreshCw, CheckCircle2, Check, X, Cpu } from 'lucide-react';
import { useRole } from '../context/RoleContext';

export const ExceptionsList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { roleName } = useRole();

  const [statusFilter, setStatusFilter] = useState<'OPEN' | 'RESOLVED_ACCEPTED' | 'ALL'>('OPEN');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [fieldFilter, setFieldFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: exceptions, isLoading, refetch: refetchExceptions } = useQuery({
    queryKey: ['exceptions', statusFilter, severityFilter, fieldFilter],
    queryFn: () => apiService.getExceptions({
      status: statusFilter,
      severity: severityFilter !== 'ALL' ? severityFilter : undefined,
      field: fieldFilter !== 'ALL' ? fieldFilter : undefined
    }),
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: batchSummary, isLoading: isSummaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['batchSummary'],
    queryFn: apiService.getBatchSummary,
    staleTime: 30000
  });

  const bulkMutation = useMutation({
    mutationFn: (action: 'ACCEPT_ALL_AI' | 'REJECT_ALL') =>
      apiService.bulkResolveExceptions(selectedIds, action, roleName),
    onSuccess: (data) => {
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['batchSummary'] });
      alert(`Successfully resolved ${data.resolvedCount} exceptions!`);
    }
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (!exceptions) return;
    if (selectedIds.length === exceptions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(exceptions.map(e => e.id));
    }
  };

  const uniqueFields = exceptions
    ? [...new Set(exceptions.map(e => e.field))].sort()
    : [];

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* AI Batch Summary Executive Banner */}
      <Card className="border border-border bg-bg-surface-alt/30 shadow-sm">
        <CardHeader className="p-4 pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cpu className="h-4 w-4 text-brand" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-brand font-semibold">
                GEMINI 2.5 FLASH PORTFOLIO ANOMALY SYNTHESIS
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { refetchSummary(); refetchExceptions(); }}
              disabled={isSummaryLoading}
              className="text-xs h-6 px-2 font-mono"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isSummaryLoading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-3">
          <p className="text-xs text-text-secondary leading-relaxed font-sans">
            {batchSummary?.summary || 'Analyzing active exception distribution across portfolio...'}
          </p>
        </CardContent>
      </Card>

      {/* Main Exceptions Table Card */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="p-4 space-y-3 border-b border-border">
          {/* Top Tabs: Status Switcher */}
          <div className="flex items-center justify-between">
            <div className="flex border border-border p-0.5 rounded bg-bg-surface-alt/50 gap-0.5">
              <button
                type="button"
                className={`text-xs font-mono px-3 py-1 rounded transition-all cursor-pointer ${
                  statusFilter === 'OPEN'
                    ? 'bg-bg-surface text-text-primary border border-border shadow-sm font-semibold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                onClick={() => { setStatusFilter('OPEN'); setSelectedIds([]); }}
              >
                Active Queue ({exceptions ? (statusFilter === 'OPEN' ? exceptions.length : '...') : 0})
              </button>
              <button
                type="button"
                className={`text-xs font-mono px-3 py-1 rounded transition-all cursor-pointer ${
                  statusFilter === 'RESOLVED_ACCEPTED'
                    ? 'bg-bg-surface text-text-primary border border-border shadow-sm font-semibold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                onClick={() => { setStatusFilter('RESOLVED_ACCEPTED'); setSelectedIds([]); }}
              >
                Resolved Audit Log
              </button>
              <button
                type="button"
                className={`text-xs font-mono px-3 py-1 rounded transition-all cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-bg-surface text-text-primary border border-border shadow-sm font-semibold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                onClick={() => { setStatusFilter('ALL'); setSelectedIds([]); }}
              >
                All Records
              </button>
            </div>

            {/* Bulk Action Controls */}
            {selectedIds.length > 0 && statusFilter === 'OPEN' && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-semibold text-text-muted">
                  {selectedIds.length} SELECTED:
                </span>
                <Button
                  size="sm"
                  className="bg-success hover:bg-success/90 text-white text-xs h-7 gap-1 font-mono shadow-sm"
                  onClick={() => bulkMutation.mutate('ACCEPT_ALL_AI')}
                  disabled={bulkMutation.isPending}
                >
                  <Check className="h-3 w-3" /> Accept AI Fixes
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 gap-1 font-mono"
                  onClick={() => bulkMutation.mutate('REJECT_ALL')}
                  disabled={bulkMutation.isPending}
                >
                  <X className="h-3 w-3" /> Reject
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Triage Queue</span>
              <CardTitle className="text-xs font-semibold text-text-primary">
                {statusFilter === 'OPEN' ? 'Open Validation Anomalies' : statusFilter === 'RESOLVED_ACCEPTED' ? 'Resolved Exceptions Ledger' : 'Complete Anomaly History'} ({exceptions?.length || 0})
              </CardTitle>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <Filter className="h-3 w-3 text-text-muted" />
              <select
                className="h-7 rounded border border-border bg-bg-surface px-2 py-0.5 text-xs font-mono shadow-none focus:ring-1 focus:ring-brand text-text-primary"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="ERROR">Error</option>
                <option value="WARNING">Warning</option>
              </select>
              <select
                className="h-7 rounded border border-border bg-bg-surface px-2 py-0.5 text-xs font-mono shadow-none focus:ring-1 focus:ring-brand text-text-primary"
                value={fieldFilter}
                onChange={(e) => setFieldFilter(e.target.value)}
              >
                <option value="ALL">All Fields</option>
                {uniqueFields.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border text-[10px] font-mono uppercase tracking-wider text-text-muted bg-bg-surface-alt/30">
                  {statusFilter === 'OPEN' && (
                    <th className="w-8 px-3 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={exceptions && exceptions.length > 0 && selectedIds.length === exceptions.length}
                        onChange={toggleSelectAll}
                        className="rounded cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="px-4 py-2.5">Loan ID</th>
                  <th className="px-4 py-2.5">Target Field</th>
                  <th className="px-4 py-2.5">Ingested Value</th>
                  <th className="px-4 py-2.5">Validation Invariant</th>
                  <th className="px-4 py-2.5">Severity</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-text-muted font-mono">
                      <RefreshCw className="h-4 w-4 animate-spin inline mr-2 text-brand" /> Loading Exceptions...
                    </td>
                  </tr>
                ) : !exceptions || exceptions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-text-muted font-mono">
                      {statusFilter === 'OPEN' ? (
                        <div className="flex flex-col items-center space-y-1.5">
                          <CheckCircle2 className="h-8 w-8 text-success" />
                          <span className="font-semibold text-text-primary">Zero Open Exceptions</span>
                          <span className="text-[11px] text-text-muted">All portfolio records are clean and certified.</span>
                        </div>
                      ) : (
                        'No records match current filter criteria.'
                      )}
                    </td>
                  </tr>
                ) : (
                  exceptions.map(exception => (
                    <tr
                      key={exception.id}
                      className={`hover:bg-bg-surface-alt/40 transition-colors font-mono ${
                        selectedIds.includes(exception.id) ? 'bg-brand-subtle' : ''
                      }`}
                    >
                      {statusFilter === 'OPEN' && (
                        <td className="px-3 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(exception.id)}
                            onChange={() => toggleSelect(exception.id)}
                            className="rounded cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="px-4 py-2.5 font-medium text-text-primary">{exception.loan?.loanId || 'N/A'}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className="text-[11px]">{exception.field}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-critical font-semibold max-w-[140px] truncate">
                        {exception.originalValue || '(null)'}
                      </td>
                      <td className="px-4 py-2.5 text-text-secondary font-sans text-xs max-w-[260px] truncate" title={exception.issueType}>
                        {exception.issueType}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={
                          exception.severity === 'CRITICAL' ? 'critical' :
                          exception.severity === 'ERROR' ? 'critical' : 'warning'
                        }>
                          {exception.severity}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={exception.status === 'OPEN' ? 'warning' : 'success'} className="text-[10px]">
                          {exception.status.replace('RESOLVED_', '')}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right font-sans">
                        <Button
                          variant="default"
                          size="sm"
                          className="gap-1.5 text-xs h-7"
                          onClick={() => navigate(`/exceptions/${exception.id}`)}
                        >
                          <Cpu className="h-3 w-3" /> {exception.status === 'OPEN' ? 'Review Anomaly' : 'View Fix'}
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
