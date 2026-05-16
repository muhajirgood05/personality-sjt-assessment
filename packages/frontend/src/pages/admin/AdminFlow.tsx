/**
 * Admin Flow orchestrator.
 * Wires together: Dashboard → Session Creation → Candidate Monitoring → Reports → Export.
 * The AdminDashboard handles its own internal navigation (overview, create-session,
 * candidates, analytics, anti-faking). This component adds report viewing and PDF download
 * on top, plus the navigation bar with logout.
 *
 * Validates: Requirements 12.1, 11.6
 */

import { useState, useCallback } from 'react';
import { AdminDashboard } from './AdminDashboard.js';
import { ReportViewerPage } from './ReportViewerPage.js';
import './admin.css';

type AdminFlowView =
  | { type: 'dashboard' }
  | { type: 'report-viewer'; candidateId: string };

export interface AdminFlowProps {
  onLogout?: () => void;
}

/**
 * Orchestrates the complete admin flow:
 * 1. Dashboard (overview, session creation, candidate monitoring, analytics, anti-faking)
 * 2. Report Viewer (individual candidate report with PDF download)
 *
 * The dashboard internally handles navigation between its sub-views.
 * The AdminFlow adds report viewing capability and the top-level nav bar.
 */
export function AdminFlow({ onLogout }: AdminFlowProps) {
  const [currentView, setCurrentView] = useState<AdminFlowView>({ type: 'dashboard' });

  const navigateToReport = useCallback((candidateId: string) => {
    setCurrentView({ type: 'report-viewer', candidateId });
  }, []);

  const navigateToDashboard = useCallback(() => {
    setCurrentView({ type: 'dashboard' });
  }, []);

  return (
    <div className="admin-flow" data-testid="admin-flow">
      <nav className="admin-flow__nav">
        <span className="admin-flow__brand">Assessment Platform — Admin</span>
        <div className="admin-flow__nav-actions">
          {currentView.type === 'report-viewer' && (
            <button
              className="admin-flow__logout"
              onClick={navigateToDashboard}
              data-testid="back-to-dashboard-btn"
            >
              ← Dashboard
            </button>
          )}
          <button className="admin-flow__logout" onClick={onLogout} data-testid="logout-btn">
            Keluar
          </button>
        </div>
      </nav>

      <main className="admin-flow__content">
        {currentView.type === 'dashboard' && (
          <AdminDashboard onViewReport={navigateToReport} />
        )}

        {currentView.type === 'report-viewer' && (
          <ReportViewerPage
            candidateId={currentView.candidateId}
            onBack={navigateToDashboard}
          />
        )}
      </main>
    </div>
  );
}

export default AdminFlow;
