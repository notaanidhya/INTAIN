import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Upload,
  FileText,
  AlertCircle,
  ShieldCheck,
  Sliders,
  ShieldAlert,
  GitFork,
  Sun,
  Moon,
  TrendingUp,
  Fingerprint,
  Terminal
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useRole } from '../../context/RoleContext';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import type { UserRole } from '../../types';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  roles: UserRole[];
  badge?: number;
  isUrgentBadge?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const AppLayout = () => {
  const location = useLocation();
  const { role, setRole, roleName } = useRole();

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('intain_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('intain_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('intain_theme', 'light');
    }
  }, [isDarkMode]);

  const { data: summary } = useQuery({
    queryKey: ['summary'],
    queryFn: apiService.getSummary,
    refetchInterval: 10000
  });

  const { data: integrity } = useQuery({
    queryKey: ['ledgerIntegrity'],
    queryFn: apiService.verifyLedgerIntegrity,
    refetchInterval: 15000
  });

  const isLedgerValid = integrity?.isValid ?? true;

  // Grouped Navigation Structure
  const navSections: NavSection[] = [
    {
      title: 'OVERVIEW',
      items: [
        {
          name: 'Executive Overview',
          href: '/',
          icon: LayoutDashboard,
          roles: ['DATA_OPERATOR', 'REVIEWER', 'DATA_CONSUMER']
        },
      ],
    },
    {
      title: 'DATA',
      items: [
        {
          name: 'Multi-Source Ingestion',
          href: '/upload',
          icon: Upload,
          roles: ['DATA_OPERATOR']
        },
        {
          name: 'Loan Portfolio Records',
          href: '/loans',
          icon: FileText,
          roles: ['DATA_OPERATOR', 'REVIEWER', 'DATA_CONSUMER']
        },
        {
          name: 'Source Reconciliation',
          href: '/conflicts',
          icon: GitFork,
          roles: ['DATA_OPERATOR', 'REVIEWER'],
          badge: summary?.conflictedLoans,
          isUrgentBadge: false
        },
      ],
    },
    {
      title: 'REVIEW',
      items: [
        {
          name: 'Exception Queue & AI',
          href: '/exceptions',
          icon: AlertCircle,
          roles: ['DATA_OPERATOR', 'REVIEWER'],
          badge: summary?.openExceptions,
          isUrgentBadge: true
        },
        {
          name: 'Validation Rules Engine',
          href: '/rules',
          icon: Sliders,
          roles: ['REVIEWER', 'DATA_OPERATOR']
        },
      ],
    },
    {
      title: 'GOVERNANCE',
      items: [
        {
          name: 'Portfolio Analytics',
          href: '/analytics',
          icon: TrendingUp,
          roles: ['DATA_OPERATOR', 'REVIEWER', 'DATA_CONSUMER']
        },
        {
          name: 'Ledger & Traceability',
          href: '/ledger',
          icon: ShieldCheck,
          roles: ['DATA_CONSUMER', 'REVIEWER']
        },
      ],
    },
  ];

  // Flat list for header breadcrumb matching
  const allNavItems = navSections.flatMap(s => s.items);

  return (
    <div className="flex h-screen bg-bg-base text-text-primary font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-bg-surface border-r border-border flex flex-col shrink-0">
        {/* 1. Brand Row */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-border">
          <div className="flex items-center space-x-2.5">
            <div className="h-7 w-7 rounded bg-brand text-white flex items-center justify-center font-mono font-bold text-xs shadow-sm">
              CT
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-text-primary tracking-tight">CredoraTech</span>
                <span className="text-[10px] font-mono text-brand font-semibold px-1 py-0.2 rounded bg-brand-subtle border border-brand/25">TRUST OS</span>
              </div>
              <span className="block text-[9px] font-mono uppercase tracking-widest text-text-muted">Automated Verification</span>
            </div>
          </div>
        </div>

        {/* 2. Persona Switcher (Visually Demoted Control) */}
        <div className="px-3.5 py-2.5 border-b border-border bg-bg-surface-alt/40">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-text-muted flex items-center gap-1">
              <Terminal className="h-3 w-3 text-brand" /> Viewing as
            </label>
            <span className="text-[9px] font-mono text-text-muted">ROLE</span>
          </div>
          <select
            className="w-full h-7 text-xs rounded border border-border bg-bg-surface px-2 font-medium text-text-primary focus:ring-1 focus:ring-brand shadow-none cursor-pointer"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            <option value="DATA_OPERATOR">Data Operator (LOS Ingestion)</option>
            <option value="REVIEWER">QC Reviewer (AI Diagnostics)</option>
            <option value="DATA_CONSUMER">Data Consumer (Capital Markets)</option>
          </select>
        </div>

        {/* 3. Grouped Navigation Links */}
        <nav className="flex-1 px-2.5 py-3 space-y-4 overflow-y-auto">
          {navSections.map((section) => {
            const visibleItems = section.items.filter(item => item.roles.includes(role));
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-1">
                <div className="px-2 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-widest text-text-muted">
                  {section.title}
                </div>
                {visibleItems.map((item) => {
                  const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        "relative flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-medium transition-all duration-150 group",
                        isActive
                          ? "bg-brand-subtle text-brand font-semibold before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:bg-brand before:rounded-r"
                          : "text-text-secondary hover:bg-bg-surface-alt hover:text-text-primary"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <item.icon className={cn("h-3.5 w-3.5 transition-colors shrink-0", isActive ? "text-brand" : "text-text-muted group-hover:text-text-primary")} />
                        <span>{item.name}</span>
                      </div>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className={cn(
                          "text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border",
                          item.isUrgentBadge
                            ? "bg-critical/10 text-critical border-critical/30"
                            : "bg-bg-surface-alt text-text-secondary border-border"
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* 4. Cryptographic Ledger Anchor (Integrated into nav rhythm) */}
        <div className="p-3 border-t border-border bg-bg-surface text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted flex items-center gap-1">
              <Fingerprint className="h-3 w-3 text-brand" /> Ledger Anchor
            </span>
            {isLedgerValid ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-success bg-success/10 border border-success/20 px-1.5 py-0.2 rounded">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success"></span>
                </span>
                VERIFIED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-critical bg-critical/10 border border-critical/25 px-1.5 py-0.2 rounded animate-pulse">
                <ShieldAlert className="h-3 w-3" /> COMPROMISED
              </span>
            )}
          </div>
          <div className="text-[10px] font-mono text-text-muted truncate bg-bg-surface-alt px-1.5 py-0.5 rounded border border-border">
            ROOT: {summary?.ledgerHead?.merkleRoot ? `${summary.ledgerHead.merkleRoot.slice(0, 14)}...` : '00000000...'}
          </div>
        </div>

        {/* 5. Minimal Single-Line Footer */}
        <div className="py-2 px-3 border-t border-border text-[10px] font-mono text-text-muted flex justify-between items-center bg-bg-surface-alt/30">
          <span>INTAIN FINTECH</span>
          <span>BUILD 2026.08</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto flex flex-col bg-bg-base">
        {/* Header Bar */}
        <header className="h-14 border-b border-border bg-bg-surface/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono text-text-muted uppercase">Console</span>
            <span className="text-text-muted text-xs">/</span>
            <h1 className="text-xs font-semibold text-text-primary tracking-tight">
              {allNavItems.find(i => location.pathname === i.href || (i.href !== '/' && location.pathname.startsWith(i.href)))?.name || 'Loan Verification Engine'}
            </h1>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <button
              type="button"
              onClick={() => setIsDarkMode(prev => !prev)}
              className="p-1.5 rounded border border-border bg-bg-surface hover:bg-bg-surface-alt text-text-primary transition-colors cursor-pointer"
              title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {isDarkMode ? <Sun className="h-3.5 w-3.5 text-warning" /> : <Moon className="h-3.5 w-3.5 text-text-secondary" />}
            </button>

            <div className="flex items-center space-x-2 bg-bg-surface-alt px-2.5 py-1 rounded border border-border font-mono text-[11px]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand"></span>
              </span>
              <span className="text-text-muted">USER:</span>
              <strong className="text-text-primary font-semibold">{roleName}</strong>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6 max-w-7xl mx-auto w-full flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
