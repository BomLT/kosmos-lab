import { useState, useEffect, useRef } from 'react';

// ── All localStorage keys used by Kosmos ──
const KOSMOS_KEYS = [
  { key: 'kosmos_orders', label: 'Order Requests', icon: '🛒', critical: true },
  {
    key: 'kosmos_consumables',
    label: 'Consumables',
    icon: '📦',
    critical: true,
  },
  { key: 'kosmos_chemicals', label: 'Chemicals', icon: '⚗️', critical: true },
  {
    key: 'kosmos_equipment',
    label: 'Equipment Inventory',
    icon: '🔧',
    critical: true,
  },
  {
    key: 'kosmos_training',
    label: 'Training Records',
    icon: '🎓',
    critical: true,
  },
  {
    key: 'kosmos_inspections',
    label: 'Lab Inspections',
    icon: '📋',
    critical: true,
  },
  {
    key: 'kosmos_bookings',
    label: 'Equipment Bookings',
    icon: '📅',
    critical: false,
  },
  { key: 'kosmos_waste_tags', label: 'Waste Tags', icon: '♻️', critical: true },
  { key: 'kosmos_users', label: 'Users', icon: '👥', critical: false },
  {
    key: 'kosmos_facility_access',
    label: 'Facility – Access Requests',
    icon: '🏢',
    critical: false,
  },
  {
    key: 'kosmos_facility_workorders',
    label: 'Facility – Work Orders',
    icon: '🏢',
    critical: false,
  },
  {
    key: 'kosmos_facility_eqinstalls',
    label: 'Facility – Equipment Installs',
    icon: '🏢',
    critical: false,
  },
  {
    key: 'kosmos_ehs_incidents',
    label: 'EHS – Incidents',
    icon: '⚠️',
    critical: true,
  },
  {
    key: 'kosmos_ehs_docs',
    label: 'EHS – Documents',
    icon: '📄',
    critical: false,
  },
  {
    key: 'kosmos_ehs_permits',
    label: 'EHS – Permits',
    icon: '📜',
    critical: false,
  },
  {
    key: 'kosmos_map_pages',
    label: 'Equipment Map',
    icon: '🗺️',
    critical: false,
  },
  { key: 'kosmos_logs', label: 'System Log', icon: '📝', critical: false },
];

function getModuleStats(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { hasData: false, count: 0, sizeKB: '0' };
    const parsed = JSON.parse(raw);
    const count = Array.isArray(parsed)
      ? parsed.length
      : typeof parsed === 'object'
      ? Object.keys(parsed).length
      : 1;
    return { hasData: true, count, sizeKB: (raw.length / 1024).toFixed(1) };
  } catch {
    return { hasData: false, count: 0, sizeKB: '0' };
  }
}

function getTotalSize() {
  let total = 0;
  KOSMOS_KEYS.forEach((k) => {
    const raw = localStorage.getItem(k.key);
    if (raw) total += raw.length;
  });
  return (total / 1024).toFixed(1);
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) +
    ' at ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );
}

function Toast({ toasts }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 28,
        right: 28,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            background:
              t.type === 'error'
                ? '#dc2626'
                : t.type === 'warning'
                ? '#d97706'
                : '#16a34a',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
            maxWidth: 340,
            animation: 'slideIn 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {t.type === 'error' ? '✗' : t.type === 'warning' ? '⚠' : '✓'} {t.msg}
        </div>
      ))}
    </div>
  );
}

export default function BackupManager() {
  const [tab, setTab] = useState('backup');
  const [stats, setStats] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [lastBackup, setLastBackup] = useState(
    () => localStorage.getItem('kosmos_last_backup_ts') || null
  );
  const [restorePreview, setRestorePreview] = useState(null);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreDone, setRestoreDone] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState(
    KOSMOS_KEYS.map((k) => k.key)
  );
  const fileRef = useRef(null);

  useEffect(() => {
    refreshStats();
  }, []);

  function refreshStats() {
    setStats(KOSMOS_KEYS.map((k) => ({ ...k, ...getModuleStats(k.key) })));
  }

  function toast(msg, type = 'success') {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      3500
    );
  }

  // ── EXPORT ──
  function exportBackup(keysToExport) {
    const snapshot = {
      version: '1.0',
      app: 'Kosmos Laboratory Management',
      exportedAt: new Date().toISOString(),
      exportedBy: 'Kosmos Backup Manager',
      modules: keysToExport.length,
      data: {},
    };
    keysToExport.forEach((key) => {
      try {
        const raw = localStorage.getItem(key);
        snapshot.data[key] = raw ? JSON.parse(raw) : [];
      } catch {
        snapshot.data[key] = [];
      }
    });
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `Kosmos_Backup_${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    const ts = new Date().toISOString();
    localStorage.setItem('kosmos_last_backup_ts', ts);
    setLastBackup(ts);
    toast('✅ Backup file downloaded! Save it to OneDrive or SharePoint.');
  }

  // ── READ FILE FOR RESTORE ──
  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setRestoreFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const snap = JSON.parse(ev.target.result);
        if (!snap.data) {
          toast('Invalid backup file — missing data.', 'error');
          return;
        }
        const preview = KOSMOS_KEYS.map((k) => ({
          ...k,
          inBackup: snap.data[k.key] !== undefined,
          backupCount: Array.isArray(snap.data[k.key])
            ? snap.data[k.key].length
            : 0,
          ...getModuleStats(k.key),
        }));
        setRestorePreview({
          snap,
          preview,
          exportedAt: snap.exportedAt,
          modules: snap.modules,
        });
        setRestoreDone(false);
      } catch (err) {
        toast('Could not read file: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function doRestore() {
    if (!restorePreview) return;
    setRestoring(true);
    setTimeout(() => {
      const { snap } = restorePreview;
      let count = 0;
      KOSMOS_KEYS.forEach((k) => {
        if (snap.data[k.key] !== undefined) {
          localStorage.setItem(k.key, JSON.stringify(snap.data[k.key]));
          count++;
        }
      });
      refreshStats();
      setRestoring(false);
      setRestoreDone(true);
      toast(
        `Restored ${count} modules. Refresh Kosmos to see changes.`,
        'success'
      );
    }, 800);
  }

  const totalKB = getTotalSize();
  const filledModules = stats.filter((s) => s.hasData).length;
  const daysSinceBackup = lastBackup
    ? Math.floor((Date.now() - new Date(lastBackup).getTime()) / 86400000)
    : null;
  const backupRisk =
    daysSinceBackup === null
      ? 'high'
      : daysSinceBackup > 7
      ? 'high'
      : daysSinceBackup > 2
      ? 'medium'
      : 'low';

  const riskColors = {
    low: { bg: '#dcfce7', border: '#86efac', text: '#15803d', dot: '#16a34a' },
    medium: {
      bg: '#fef3c7',
      border: '#fcd34d',
      text: '#92400e',
      dot: '#d97706',
    },
    high: { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b', dot: '#dc2626' },
  };
  const rc = riskColors[backupRisk];

  return (
    <div
      style={{
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        background: '#f0f2f8',
        minHeight: '100vh',
        padding: 28,
      }}
    >
      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateX(30px) } to { opacity:1; transform:translateX(0) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>

      {/* ── HEADER ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e2535 0%, #2d3a52 100%)',
          borderRadius: 18,
          padding: '24px 28px',
          marginBottom: 22,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          boxShadow: '0 8px 32px rgba(30,37,53,0.25)',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 5,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
              }}
            >
              🧪
            </div>
            <div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: '#fff',
                  letterSpacing: '-0.01em',
                }}
              >
                Kosmos Backup Manager
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.45)',
                  marginTop: 1,
                }}
              >
                Safe, portable data backup for your lab
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <Stat
            label="Modules with data"
            value={`${filledModules} / ${KOSMOS_KEYS.length}`}
          />
          <Stat label="Total stored" value={`${totalKB} KB`} />
          <Stat
            label="Last backup"
            value={
              daysSinceBackup === null
                ? 'Never'
                : daysSinceBackup === 0
                ? 'Today'
                : `${daysSinceBackup}d ago`
            }
            accent={
              backupRisk === 'high'
                ? '#f87171'
                : backupRisk === 'medium'
                ? '#fbbf24'
                : '#4ade80'
            }
          />
        </div>
      </div>

      {/* ── BACKUP RISK BANNER ── */}
      <div
        style={{
          background: rc.bg,
          border: `1px solid ${rc.border}`,
          borderRadius: 12,
          padding: '13px 18px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: rc.dot,
            flexShrink: 0,
            animation: backupRisk === 'high' ? 'pulse 1.5s infinite' : 'none',
          }}
        />
        <div style={{ fontSize: 13, color: rc.text, fontWeight: 600 }}>
          {backupRisk === 'high' &&
            (daysSinceBackup === null
              ? '⚠️ No backup has ever been made. Export your data now and save it to OneDrive or SharePoint.'
              : `⚠️ Last backup was ${daysSinceBackup} days ago. Consider exporting soon to protect your data.`)}
          {backupRisk === 'medium' &&
            `Last backup was ${daysSinceBackup} day${
              daysSinceBackup > 1 ? 's' : ''
            } ago — you're good, but consider a fresh export.`}
          {backupRisk === 'low' &&
            `✓ Backed up recently (${
              daysSinceBackup === 0
                ? 'today'
                : `${daysSinceBackup} day${daysSinceBackup > 1 ? 's' : ''} ago`
            }). Your data is protected.`}
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {[
          ['backup', '💾 Export Backup'],
          ['restore', '📥 Restore Backup'],
          ['guide', '📖 OneDrive / SharePoint Guide'],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              padding: '9px 18px',
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: tab === id ? '#1e2535' : '#fff',
              color: tab === id ? '#fff' : '#374151',
              boxShadow:
                tab === id
                  ? '0 4px 14px rgba(30,37,53,0.18)'
                  : '0 1px 4px rgba(0,0,0,0.07)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════
           TAB 1 — EXPORT BACKUP
         ══════════════════════════════════════════════ */}
      {tab === 'backup' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 340px',
            gap: 18,
            alignItems: 'start',
          }}
        >
          {/* Left: Module list */}
          <div
            style={{
              background: '#fff',
              borderRadius: 14,
              border: '1px solid #e5e9f0',
              overflow: 'hidden',
              boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>
                  Select modules to back up
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  {selectedKeys.length} of {KOSMOS_KEYS.length} selected
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setSelectedKeys(KOSMOS_KEYS.map((k) => k.key))}
                  style={smallBtn('#ede9fe', '#4f46e5')}
                >
                  All
                </button>
                <button
                  onClick={() =>
                    setSelectedKeys(
                      KOSMOS_KEYS.filter((k) => k.critical).map((k) => k.key)
                    )
                  }
                  style={smallBtn('#dcfce7', '#15803d')}
                >
                  Critical only
                </button>
                <button
                  onClick={() => setSelectedKeys([])}
                  style={smallBtn('#f3f4f6', '#6b7280')}
                >
                  None
                </button>
              </div>
            </div>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ background: '#f8f9fc' }}>
                  <th style={th}>✓</th>
                  <th style={{ ...th, textAlign: 'left' }}>Module</th>
                  <th style={th}>Records</th>
                  <th style={th}>Size</th>
                  <th style={th}>Priority</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s, i) => {
                  const checked = selectedKeys.includes(s.key);
                  return (
                    <tr
                      key={s.key}
                      onClick={() =>
                        setSelectedKeys((prev) =>
                          checked
                            ? prev.filter((k) => k !== s.key)
                            : [...prev, s.key]
                        )
                      }
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        background: checked
                          ? 'rgba(79,70,229,0.03)'
                          : i % 2 === 0
                          ? '#fff'
                          : '#fafafa',
                        cursor: 'pointer',
                      }}
                    >
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: 4,
                            border: `2px solid ${
                              checked ? '#4f46e5' : '#d1d5db'
                            }`,
                            background: checked ? '#4f46e5' : '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: 'auto',
                          }}
                        >
                          {checked && (
                            <span
                              style={{
                                color: '#fff',
                                fontSize: 10,
                                fontWeight: 800,
                              }}
                            >
                              ✓
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                        {s.icon} {s.label}
                      </td>
                      <td
                        style={{
                          padding: '10px 14px',
                          textAlign: 'center',
                          color: s.hasData ? '#374151' : '#d1d5db',
                        }}
                      >
                        {s.hasData ? s.count : '—'}
                      </td>
                      <td
                        style={{
                          padding: '10px 14px',
                          textAlign: 'center',
                          color: '#6b7280',
                        }}
                      >
                        {s.hasData ? s.sizeKB + ' KB' : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {s.critical ? (
                          <span
                            style={{
                              background: '#fee2e2',
                              color: '#dc2626',
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 99,
                            }}
                          >
                            CRITICAL
                          </span>
                        ) : (
                          <span
                            style={{
                              background: '#f3f4f6',
                              color: '#9ca3af',
                              fontSize: 10,
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 99,
                            }}
                          >
                            Standard
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Right: Action panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Export card */}
            <div
              style={{
                background: '#fff',
                borderRadius: 14,
                border: '1px solid #e5e9f0',
                padding: 22,
                boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
                💾 Export Backup File
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: '#6b7280',
                  lineHeight: 1.65,
                  marginBottom: 16,
                }}
              >
                Downloads a <strong>.json</strong> file with all your selected
                Kosmos data. Then manually save it to <strong>OneDrive</strong>{' '}
                or <strong>SharePoint</strong> for cloud backup.
              </p>
              <button
                onClick={() => exportBackup(selectedKeys)}
                disabled={selectedKeys.length === 0}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: 10,
                  border: 'none',
                  background:
                    selectedKeys.length === 0
                      ? '#e5e9f0'
                      : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  color: selectedKeys.length === 0 ? '#9ca3af' : '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: selectedKeys.length === 0 ? 'not-allowed' : 'pointer',
                  marginBottom: 8,
                }}
              >
                ⬇ Download Backup ({selectedKeys.length} modules)
              </button>
              <button
                onClick={() =>
                  exportBackup(
                    KOSMOS_KEYS.filter((k) => k.critical).map((k) => k.key)
                  )
                }
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: 10,
                  border: '1px solid #e5e9f0',
                  background: '#f8f9fc',
                  color: '#374151',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ⬇ Export Critical Only (7 modules)
              </button>
            </div>

            {/* OneDrive tip */}
            <div
              style={{
                background: 'linear-gradient(135deg, #dbeafe, #ede9fe)',
                border: '1px solid #c7d2fe',
                borderRadius: 14,
                padding: 18,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#1e40af',
                  marginBottom: 8,
                }}
              >
                💡 Where to save it
              </div>
              <ol
                style={{
                  fontSize: 12,
                  color: '#1e3a8a',
                  lineHeight: 2,
                  paddingLeft: 18,
                }}
              >
                <li>
                  Download the <strong>.json</strong> file above
                </li>
                <li>
                  Open <strong>OneDrive</strong> in your browser
                </li>
                <li>
                  Upload to a folder like{' '}
                  <code
                    style={{
                      background: 'rgba(255,255,255,0.6)',
                      padding: '1px 5px',
                      borderRadius: 4,
                    }}
                  >
                    Kosmos/Backups/
                  </code>
                </li>
                <li>
                  Or drag it into a <strong>SharePoint</strong> Document Library
                </li>
              </ol>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 11,
                  color: '#3730a3',
                  fontWeight: 600,
                }}
              >
                📅 Tip: Name files with dates — OneDrive keeps version history
                automatically.
              </div>
            </div>

            {/* Last backup info */}
            {lastBackup && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: 12,
                  padding: '12px 16px',
                  fontSize: 12,
                  color: '#15803d',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 2 }}>
                  ✓ Last export recorded
                </div>
                <div style={{ color: '#166534' }}>{formatDate(lastBackup)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
           TAB 2 — RESTORE
         ══════════════════════════════════════════════ */}
      {tab === 'restore' && (
        <div>
          {/* Drop zone */}
          {!restorePreview && (
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: '2px dashed #c7d2fe',
                borderRadius: 16,
                padding: '52px 32px',
                textAlign: 'center',
                background: '#fff',
                cursor: 'pointer',
                marginBottom: 18,
                transition: 'border-color 0.2s',
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#1e2535',
                  marginBottom: 6,
                }}
              >
                Click to select a Kosmos backup file
              </div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>
                Accepts <strong>.json</strong> files exported from Kosmos Backup
                Manager
              </div>
              <div style={{ marginTop: 14, fontSize: 12, color: '#9ca3af' }}>
                Or drag and drop a file from OneDrive / SharePoint
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>
          )}

          {restorePreview && !restoreDone && (
            <div>
              {/* Backup metadata */}
              <div
                style={{
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: 12,
                  padding: '14px 20px',
                  marginBottom: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <div>
                  <div
                    style={{ fontWeight: 700, fontSize: 14, color: '#0c4a6e' }}
                  >
                    📂 {restoreFile?.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#0369a1', marginTop: 3 }}>
                    Backed up on: {formatDate(restorePreview.exportedAt)} ·{' '}
                    {restorePreview.modules} modules
                  </div>
                </div>
                <button
                  onClick={() => {
                    setRestorePreview(null);
                    setRestoreFile(null);
                  }}
                  style={smallBtn('#e0f2fe', '#0369a1')}
                >
                  Choose different file
                </button>
              </div>

              {/* ⚠ Warning */}
              <div
                style={{
                  background: '#fef3c7',
                  border: '1px solid #fcd34d',
                  borderRadius: 12,
                  padding: '13px 18px',
                  marginBottom: 18,
                  display: 'flex',
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
                <div
                  style={{ fontSize: 12, color: '#92400e', lineHeight: 1.7 }}
                >
                  <strong>Restoring will overwrite current data</strong> for all
                  modules found in this backup. This cannot be undone. After
                  restoring, <strong>refresh the Kosmos app</strong> to see the
                  changes.
                </div>
              </div>

              {/* Preview table */}
              <div
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  border: '1px solid #e5e9f0',
                  overflow: 'hidden',
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid #f1f5f9',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  Preview — what will be restored
                </div>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr style={{ background: '#f8f9fc' }}>
                      <th style={{ ...th, textAlign: 'left' }}>Module</th>
                      <th style={th}>In Backup</th>
                      <th style={th}>Backup Records</th>
                      <th style={th}>Current Records</th>
                      <th style={th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {restorePreview.preview.map((m, i) => (
                      <tr
                        key={m.key}
                        style={{
                          borderBottom: '1px solid #f3f4f6',
                          background: i % 2 === 0 ? '#fff' : '#fafafa',
                        }}
                      >
                        <td style={{ padding: '10px 16px', fontWeight: 600 }}>
                          {m.icon} {m.label}
                        </td>
                        <td
                          style={{ padding: '10px 16px', textAlign: 'center' }}
                        >
                          {m.inBackup ? (
                            <span style={{ color: '#16a34a', fontWeight: 700 }}>
                              ✓ Yes
                            </span>
                          ) : (
                            <span style={{ color: '#d1d5db' }}>—</span>
                          )}
                        </td>
                        <td
                          style={{
                            padding: '10px 16px',
                            textAlign: 'center',
                            color: '#374151',
                          }}
                        >
                          {m.inBackup ? m.backupCount : '—'}
                        </td>
                        <td
                          style={{
                            padding: '10px 16px',
                            textAlign: 'center',
                            color: '#6b7280',
                          }}
                        >
                          {m.hasData ? m.count : '—'}
                        </td>
                        <td
                          style={{ padding: '10px 16px', textAlign: 'center' }}
                        >
                          {m.inBackup ? (
                            <span
                              style={{
                                background: '#fef3c7',
                                color: '#92400e',
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 99,
                              }}
                            >
                              OVERWRITE
                            </span>
                          ) : (
                            <span
                              style={{
                                background: '#f3f4f6',
                                color: '#9ca3af',
                                fontSize: 11,
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: 99,
                              }}
                            >
                              skip
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}
              >
                <button
                  onClick={() => {
                    setRestorePreview(null);
                    setRestoreFile(null);
                  }}
                  style={{
                    padding: '11px 24px',
                    borderRadius: 10,
                    border: '1px solid #e5e9f0',
                    background: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: '#374151',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={doRestore}
                  disabled={restoring}
                  style={{
                    padding: '11px 28px',
                    borderRadius: 10,
                    border: 'none',
                    background: restoring
                      ? '#6b7280'
                      : 'linear-gradient(135deg, #16a34a, #059669)',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: restoring ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {restoring ? (
                    <>
                      <span style={{ animation: 'pulse 0.8s infinite' }}>
                        ⏳
                      </span>{' '}
                      Restoring…
                    </>
                  ) : (
                    '✓ Restore Data'
                  )}
                </button>
              </div>
            </div>
          )}

          {restoreDone && (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: 16,
                padding: '40px 32px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 14 }}>✅</div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: '#15803d',
                  marginBottom: 8,
                }}
              >
                Data Restored Successfully!
              </div>
              <div style={{ fontSize: 14, color: '#166534', marginBottom: 24 }}>
                All modules from the backup have been loaded into your browser.
                Please refresh the Kosmos app to apply the restored data.
              </div>
              <div
                style={{ display: 'flex', gap: 12, justifyContent: 'center' }}
              >
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    padding: '11px 24px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#16a34a',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  🔄 Refresh App Now
                </button>
                <button
                  onClick={() => {
                    setRestorePreview(null);
                    setRestoreFile(null);
                    setRestoreDone(false);
                  }}
                  style={{
                    padding: '11px 24px',
                    borderRadius: 10,
                    border: '1px solid #e5e9f0',
                    background: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: '#374151',
                  }}
                >
                  Restore Another File
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
           TAB 3 — GUIDE
         ══════════════════════════════════════════════ */}
      {tab === 'guide' && (
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}
        >
          {/* OneDrive */}
          <GuideCard
            icon="☁️"
            title="Save to OneDrive"
            subtitle="Best for personal backup — syncs to the cloud automatically"
            color="#2563eb"
            bgColor="#dbeafe"
            steps={[
              'Click Export Backup in the Backup tab → a .json file downloads.',
              'Open OneDrive (onedrive.com or File Explorer on your laptop).',
              'Create a folder: OneDrive › Documents › Kosmos › Backups',
              'Move or copy the .json file into that folder.',
              'OneDrive syncs it automatically — accessible from any device.',
            ]}
            tip="💡 OneDrive keeps version history for 30–180 days. You can restore an older backup anytime."
          />

          {/* SharePoint */}
          <GuideCard
            icon="🏢"
            title="Save to SharePoint"
            subtitle="Best for team access — files live in your org's document library"
            color="#16a34a"
            bgColor="#dcfce7"
            steps={[
              'Click Export Backup → a .json file downloads.',
              "Go to your team's SharePoint site in the browser.",
              "Navigate to Documents (or create a 'Lab Tools' library).",
              'Click Upload → Files → select the .json backup file.',
              'Done — your backup is now on SharePoint.',
            ]}
            tip="💡 SharePoint keeps version history automatically. Right-click any file → Version History to restore a past version."
          />

          {/* Recovery instructions */}
          <div
            style={{
              background: '#fff',
              borderRadius: 14,
              border: '1px solid #e5e9f0',
              padding: 22,
              gridColumn: '1/3',
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
              📥 How to Restore if Data Gets Lost
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>
              Follow these steps to recover your Kosmos data from a backup
              stored on OneDrive or SharePoint.
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 12,
              }}
            >
              {[
                [
                  '1',
                  'Go to OneDrive or SharePoint',
                  'Find your Kosmos Backups folder and download the most recent .json file.',
                ],
                [
                  '2',
                  'Open Backup Manager',
                  'Open this Backup Manager tool in the same browser where Kosmos runs.',
                ],
                [
                  '3',
                  'Go to Restore tab',
                  "Click the 'Restore Backup' tab and select the downloaded .json file.",
                ],
                [
                  '4',
                  'Confirm & Refresh',
                  'Review the preview, click Restore, then refresh the Kosmos app.',
                ],
              ].map(([num, title, desc]) => (
                <div
                  key={num}
                  style={{
                    background: '#f8f9fc',
                    borderRadius: 10,
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: '#1e2535',
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 10,
                    }}
                  >
                    {num}
                  </div>
                  <div
                    style={{ fontSize: 13, fontWeight: 700, marginBottom: 5 }}
                  >
                    {title}
                  </div>
                  <div
                    style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}
                  >
                    {desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended schedule */}
          <div
            style={{
              background: 'linear-gradient(135deg, #1e2535, #374151)',
              borderRadius: 14,
              padding: 22,
              gridColumn: '1/3',
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#fff',
                marginBottom: 14,
              }}
            >
              📅 Recommended Backup Schedule
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
              }}
            >
              {[
                [
                  'After heavy data entry',
                  'Any time you add 10+ records — orders, chemicals, equipment entries',
                  '#4f46e5',
                ],
                [
                  'Every Friday before EOD',
                  'Weekly routine backup so you never lose more than a week of work',
                  '#16a34a',
                ],
                [
                  'Before browser updates',
                  'Chrome/Edge updates can occasionally clear storage in edge cases',
                  '#d97706',
                ],
              ].map(([title, desc, color]) => (
                <div
                  key={title}
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    borderRadius: 10,
                    padding: 16,
                    borderLeft: `3px solid ${color}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#fff',
                      marginBottom: 5,
                    }}
                  >
                    {title}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.55)',
                      lineHeight: 1.6,
                    }}
                  >
                    {desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Toast toasts={toasts} />
    </div>
  );
}

// ── Small helpers ──
function Stat({ label, value, accent }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: accent || '#fff' }}>
        {value}
      </div>
      <div
        style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}
      >
        {label}
      </div>
    </div>
  );
}

function GuideCard({ icon, title, subtitle, color, bgColor, steps, tip }) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 14,
        border: '1px solid #e5e9f0',
        padding: 22,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
          }}
        >
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>
            {subtitle}
          </div>
        </div>
      </div>
      <ol
        style={{
          paddingLeft: 18,
          fontSize: 12,
          color: '#374151',
          lineHeight: 2.1,
        }}
      >
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      {tip && (
        <div
          style={{
            marginTop: 14,
            background: bgColor,
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 11,
            color,
            fontWeight: 600,
            lineHeight: 1.6,
          }}
        >
          {tip}
        </div>
      )}
    </div>
  );
}

const th = {
  padding: '10px 14px',
  textAlign: 'center',
  fontWeight: 700,
  fontSize: 12,
  color: '#374151',
};
const smallBtn = (bg, color) => ({
  padding: '5px 12px',
  borderRadius: 7,
  border: 'none',
  background: bg,
  color,
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
});
