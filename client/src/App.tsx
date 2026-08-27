import { Routes, Route } from 'react-router-dom';
import { RoleProvider } from './context/RoleContext';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Dashboard } from './pages/Dashboard';
import { UploadData } from './pages/UploadData';
import { LoansList } from './pages/LoansList';
import { LoanDetails } from './pages/LoanDetails';
import { ExceptionsList } from './pages/ExceptionsList';
import { ExceptionReview } from './pages/ExceptionReview';
import { ConflictResolution } from './pages/ConflictResolution';
import { Analytics } from './pages/Analytics';
import { RulesManager } from './pages/RulesManager';
import { LedgerIntegrity } from './pages/LedgerIntegrity';

function App() {
  return (
    <ErrorBoundary>
      <RoleProvider>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="upload" element={<UploadData />} />
            <Route path="loans" element={<LoansList />} />
            <Route path="loans/:id" element={<LoanDetails />} />
            <Route path="exceptions" element={<ExceptionsList />} />
            <Route path="exceptions/:id" element={<ExceptionReview />} />
            <Route path="conflicts" element={<ConflictResolution />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="rules" element={<RulesManager />} />
            <Route path="ledger" element={<LedgerIntegrity />} />
          </Route>
        </Routes>
      </RoleProvider>
    </ErrorBoundary>
  );
}

export default App;
