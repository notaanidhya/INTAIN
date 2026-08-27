import React, { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '../components/ui';
import {
  Upload as UploadIcon,
  File,
  X,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Database,
  GitFork,
  FileCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';

export const UploadData = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'LOAN_TAPE' | 'SERVICER_UPDATE' | 'DOCUMENT_MANIFEST'>('LOAN_TAPE');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { roleName } = useRole();

  const { data: uploads } = useQuery({
    queryKey: ['uploads'],
    queryFn: apiService.getUploads
  });

  const uploadMutation = useMutation({
    mutationFn: (f: File) => apiService.uploadCsv(f, fileType, roleName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['uploads'] });
    }
  });

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
      }
    }
  };

  const handleUpload = () => {
    if (file) uploadMutation.mutate(file);
  };

  // Helper to generate instant synthetic demo CSVs for 1-click test
  const handleLoadSample = (type: 'LOAN_TAPE' | 'SERVICER_UPDATE' | 'DOCUMENT_MANIFEST') => {
    let csvContent = '';
    let fileName = '';

    if (type === 'LOAN_TAPE') {
      fileName = 'loan_tape_synthetic_sample.csv';
      csvContent = `loan_id,borrower_id,borrower_name,loan_type,origination_date,maturity_date,original_principal,current_balance,interest_rate,term_months,borrower_state,loan_purpose,credit_grade,employment_length,income_band,payment_status,days_past_due,servicer_name,last_payment_date,last_updated_at,document_status,source_system
LN-1001,BW-501,Alice Johnson,CONVENTIONAL,2024-01-15,2054-01-15,350000,342000,6.25,360,CA,PURCHASE,A,5 years,$100k-$150k,CURRENT,0,Wells Fargo Servicing,2024-08-01,2024-08-15,COMPLETE,ORIGINATION_LOS
LN-1002,BW-502,Robert Davis,FHA,2023-06-10,2053-06-10,280000,295000,5.85,360,TX,PURCHASE,B,3 years,$75k-$100k,CURRENT,0,PennyMac,2024-08-01,2024-08-15,COMPLETE,ORIGINATION_LOS
LN-1003,BW-503,Carlos Mendez,CONVENTIONAL,2024-03-20,2020-03-20,420000,415000,7.10,360,FL,REFINANCE,C,8 years,$100k-$150k,CURRENT,0,Chase Servicing,2024-08-01,2024-08-15,COMPLETE,ORIGINATION_LOS
LN-1004,BW-504,Emily Watson,VA,2023-11-05,2053-11-05,500000,490000,6.50,360,CALIFORNIA,PURCHASE,A,10+ years,$150k+,30_DAYS_LATE,0,Nationstar,2024-07-01,2024-08-15,COMPLETE,ORIGINATION_LOS
LN-1005,BW-505,David Kim,CONVENTIONAL,2024-02-01,2054-02-01,310000,305000,625,360,NY,PURCHASE,A,4 years,$75k-$100k,CURRENT,0,Wells Fargo Servicing,2024-08-01,2024-08-15,COMPLETE,ORIGINATION_LOS
LN-1006,BW-506,Sarah Miller,CONVENTIONAL,2023-09-15,2053-09-15,220000,-1500,6.75,360,IL,PURCHASE,B,6 years,$50k-$75k,CLOSED,0,PennyMac,2024-08-01,2024-08-15,COMPLETE,ORIGINATION_LOS
LN-1007,BW-507,Jon Doe,CONVENTIONAL,2024-04-10,2054-04-10,275000,270000,6.15,360,WA,PURCHASE,A,5 years,$75k-$100k,CURRENT,0,Chase Servicing,2024-08-01,2024-08-15,COMPLETE,ORIGINATION_LOS
LN-1008,BW-508,John Doe,CONVENTIONAL,2024-04-12,2054-04-12,275000,270000,6.15,360,WA,PURCHASE,A,5 years,$75k-$100k,CURRENT,0,Chase Servicing,2024-08-01,2024-08-15,COMPLETE,ORIGINATION_LOS`;
    } else if (type === 'SERVICER_UPDATE') {
      fileName = 'servicer_update_conflicts.csv';
      csvContent = `loan_id,current_balance,payment_status,days_past_due,interest_rate,last_payment_date,servicer_name
LN-1001,338500,30_DAYS_LATE,35,6.25,2024-08-10,Wells Fargo Servicing
LN-1002,276000,CURRENT,0,5.85,2024-08-12,PennyMac`;
    } else if (type === 'DOCUMENT_MANIFEST') {
      fileName = 'document_manifest_custodian.csv';
      csvContent = `loan_id,document_status,vault_location,custodian_note
LN-1001,COMPLETE,VAULT-A-12,Certified Promissory Note & Deed of Trust present
LN-1004,MISSING_NOTE,VAULT-B-04,Original promissory note unendorsed`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const sampleFile = new window.File([blob], fileName, { type: 'text/csv' });
    setFileType(type);
    setFile(sampleFile);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* File Ingestion Type Segmented Selector */}
      <div className="flex border border-border p-1 rounded bg-bg-surface-alt/50 gap-1">
        <button
          type="button"
          className={`flex-1 py-1.5 px-3 text-xs font-mono font-medium rounded flex items-center justify-center gap-2 transition-all cursor-pointer ${
            fileType === 'LOAN_TAPE'
              ? 'bg-bg-surface text-text-primary border border-border shadow-sm font-semibold'
              : 'text-text-muted hover:text-text-primary'
          }`}
          onClick={() => { setFileType('LOAN_TAPE'); setFile(null); }}
        >
          <FileSpreadsheet className="h-3.5 w-3.5 text-brand" /> Primary Tape (Origination)
        </button>
        <button
          type="button"
          className={`flex-1 py-1.5 px-3 text-xs font-mono font-medium rounded flex items-center justify-center gap-2 transition-all cursor-pointer ${
            fileType === 'SERVICER_UPDATE'
              ? 'bg-bg-surface text-text-primary border border-border shadow-sm font-semibold'
              : 'text-text-muted hover:text-text-primary'
          }`}
          onClick={() => { setFileType('SERVICER_UPDATE'); setFile(null); }}
        >
          <GitFork className="h-3.5 w-3.5 text-info" /> Servicer Cash Feed
        </button>
        <button
          type="button"
          className={`flex-1 py-1.5 px-3 text-xs font-mono font-medium rounded flex items-center justify-center gap-2 transition-all cursor-pointer ${
            fileType === 'DOCUMENT_MANIFEST'
              ? 'bg-bg-surface text-text-primary border border-border shadow-sm font-semibold'
              : 'text-text-muted hover:text-text-primary'
          }`}
          onClick={() => { setFileType('DOCUMENT_MANIFEST'); setFile(null); }}
        >
          <FileCheck className="h-3.5 w-3.5 text-success" /> Custodian Manifest
        </button>
      </div>

      {/* Main Upload Card */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="p-5 pb-3 border-b border-border">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-brand font-semibold">Stream Configuration</span>
              <CardTitle className="text-sm font-semibold text-text-primary mt-0.5">
                {fileType === 'LOAN_TAPE' && 'Ingest Primary Origination Loan Tape'}
                {fileType === 'SERVICER_UPDATE' && 'Ingest Secondary Servicer Cash Feed'}
                {fileType === 'DOCUMENT_MANIFEST' && 'Ingest Vault Custodial Inventory'}
              </CardTitle>
              <p className="text-[11px] text-text-muted mt-0.5">
                {fileType === 'LOAN_TAPE' && 'Normalizes 21 loan fields, executes dynamic validation rules, and checks fuzzy borrower duplicates.'}
                {fileType === 'SERVICER_UPDATE' && 'Performs second-source field comparison, generates discrepancy scores, and alerts on servicing conflicts.'}
                {fileType === 'DOCUMENT_MANIFEST' && 'Reconciles physical vault documentation status against ingested loan portfolios.'}
              </p>
            </div>
            {/* Quick Demo Pre-load Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleLoadSample(fileType)}
              className="text-xs font-mono h-7"
            >
              <Database className="h-3 w-3 mr-1.5 text-brand" />
              Load Sample
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {!uploadMutation.isSuccess ? (
            <div className="space-y-4">
              <div
                className={`border border-dashed rounded p-8 text-center transition-colors cursor-pointer ${
                  file ? 'border-brand bg-brand-subtle' : 'border-border hover:bg-bg-surface-alt/40'
                }`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFile(e.target.files[0]);
                    }
                  }}
                />

                {file ? (
                  <div className="flex flex-col items-center space-y-1.5">
                    <File className="h-8 w-8 text-brand" />
                    <span className="font-mono font-medium text-xs text-text-primary">{file.name}</span>
                    <span className="text-[10px] font-mono text-text-muted">{(file.size / 1024).toFixed(2)} KB</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="text-xs text-critical hover:text-critical/80 h-6 px-2"
                    >
                      <X className="h-3 w-3 mr-1" /> Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-1.5">
                    <UploadIcon className="h-8 w-8 text-text-muted" />
                    <span className="font-medium text-xs text-text-primary">Click or drag CSV tape file to ingest</span>
                    <span className="text-[10px] font-mono text-text-muted">Universal Header Auto-Mapper Active (Supports 50+ banking column aliases)</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5">
                <Button
                  onClick={handleUpload}
                  disabled={!file || uploadMutation.isPending}
                  className="font-mono text-xs bg-brand text-white"
                >
                  {uploadMutation.isPending ? 'Executing Pipeline...' : 'Execute Ingestion Pipeline'}
                </Button>
              </div>

              {uploadMutation.isError && (
                <div className="p-3 bg-critical/10 border border-critical/30 text-critical rounded flex items-center text-xs font-mono">
                  <AlertTriangle className="h-4 w-4 mr-2 shrink-0" />
                  Ingestion error: Ensure file format is valid CSV.
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 space-y-4 font-mono">
              <div className="flex justify-center">
                <CheckCircle2 className="h-10 w-10 text-success" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-widest text-success font-bold">PIPELINE EXECUTION COMPLETE</span>
                <h2 className="text-sm font-semibold text-text-primary mt-0.5">Records Normalized & Appended to Audit Ledger</h2>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                <div className="bg-bg-surface-alt border border-border p-3 rounded text-center">
                  <div className="text-[10px] text-text-muted uppercase">Total Ingested</div>
                  <div className="text-xl font-bold text-text-primary">{uploadMutation.data?.totalRecords || 0}</div>
                </div>
                <div className="bg-bg-surface-alt border border-border p-3 rounded text-center">
                  <div className="text-[10px] text-text-muted uppercase">Compliant</div>
                  <div className="text-xl font-bold text-success">{uploadMutation.data?.validRecords || 0}</div>
                </div>
                <div className="bg-bg-surface-alt border border-border p-3 rounded text-center">
                  <div className="text-[10px] text-text-muted uppercase">Exceptions</div>
                  <div className="text-xl font-bold text-critical">{uploadMutation.data?.exceptionRecords || 0}</div>
                </div>
              </div>

              <div className="pt-2 flex justify-center space-x-2.5">
                <Button onClick={() => navigate('/exceptions')} variant="default" size="sm">
                  Review Exception Queue
                </Button>
                <Button
                  onClick={() => { setFile(null); uploadMutation.reset(); }}
                  variant="outline"
                  size="sm"
                >
                  Upload Another File
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Lineage & History */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="p-4 pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted font-semibold">Lineage Audit</span>
            <span className="text-[10px] font-mono text-text-muted">REVERSE TRACEABILITY</span>
          </div>
          <CardTitle className="text-xs font-semibold text-text-primary">
            Ingestion Stream Log
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border text-[10px] font-mono uppercase tracking-wider text-text-muted bg-bg-surface-alt/30">
                  <th className="py-2.5 px-4">Filename</th>
                  <th className="py-2.5 px-3">Stream Type</th>
                  <th className="py-2.5 px-3">Operator</th>
                  <th className="py-2.5 px-3">Total</th>
                  <th className="py-2.5 px-3 text-success">Compliant</th>
                  <th className="py-2.5 px-3 text-critical">Exceptions</th>
                  <th className="py-2.5 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {uploads && uploads.length > 0 ? (
                  uploads.map((u) => (
                    <tr key={u.id} className="hover:bg-bg-surface-alt/40 transition-colors font-mono">
                      <td className="py-2.5 px-4 font-medium text-text-primary">{u.filename}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="text-[10px]">{u.fileType}</Badge>
                      </td>
                      <td className="py-2.5 px-3 text-text-muted text-[11px]">{u.uploadedBy}</td>
                      <td className="py-2.5 px-3 font-semibold text-text-primary">{u.totalRecords}</td>
                      <td className="py-2.5 px-3 text-success font-semibold">{u.validRecords}</td>
                      <td className="py-2.5 px-3 text-critical font-semibold">{u.exceptionRecords}</td>
                      <td className="py-2.5 px-4 text-right text-text-muted text-[11px]">{new Date(u.createdAt).toLocaleTimeString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-text-muted font-mono text-xs">
                      No ingestion streams recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
