import { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import BackupManager from './BackupManager';

// ── Root shell — switches between Kosmos app and Backup Manager ──
// Both share the same localStorage origin so backup/restore works seamlessly.
function Root() {
  const [view, setView] = useState('app'); // 'app' | 'backup'

  return (
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
      {/* Floating launcher button — visible on all pages */}
      <button
        onClick={() => setView(view === 'backup' ? 'app' : 'backup')}
        title={view === 'backup' ? 'Back to Kosmos' : 'Open Backup Manager'}
        style={{
          position: 'fixed',
          bottom: 20,
          left: 20,
          zIndex: 99999,
          background: view === 'backup' ? '#4f46e5' : '#1e2535',
          color: '#fff',
          border: 'none',
          borderRadius: 12,
          padding: '9px 16px',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          fontFamily: "'Segoe UI', system-ui, sans-serif",
        }}
      >
        {view === 'backup' ? '🧪 Back to Kosmos' : '💾 Backup Manager'}
      </button>

      {/* Render active view */}
      <div
        style={{ display: view === 'app' ? 'block' : 'none', height: '100vh' }}
      >
        <App />
      </div>
      <div
        style={{
          display: view === 'backup' ? 'block' : 'none',
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        <BackupManager />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
