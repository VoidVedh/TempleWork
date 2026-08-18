import React from 'react';
import { Calendar, User, ShieldCheck } from 'lucide-react';
import { formatTimestamp } from '../../utils/dateUtils';

export default function AuditList({ logs }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {!logs || logs.length === 0 ? (
        <div className="section-card devotional-empty-box">
          <span className="devotional-empty-icon">🛡️</span>
          <div className="devotional-empty-title">अद्याप कोणताही ऑडिट लॉग नोंदवलेला नाही</div>
          <div className="devotional-empty-desc">
            प्रणालीमध्ये होणाऱ्या सर्व नोंदी, पावत्या व बदल येथे अखंड सुरक्षितपणे नोंदवले जातील.
          </div>
        </div>
      ) : (
        logs.map((log) => (
          <div
            key={log.id}
            style={{
              backgroundColor: '#ffffff',
              border: '1.5px solid #ebdcd0',
              borderRadius: '12px',
              padding: '12px 14px',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    backgroundColor: '#fef08a',
                    color: '#854d0e',
                    fontSize: '10px',
                    fontWeight: 900,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontFamily: 'monospace'
                  }}
                >
                  {log.event_type}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b' }}>
                  <Calendar size={12} />
                  <span>{formatTimestamp(log.timestamp)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 800, color: '#334155' }}>
                <User size={12} color="#475569" />
                <span>{log.actor_name} [{log.actor_role}]</span>
              </div>
            </div>

            <div style={{ fontSize: '12.5px', color: '#0f172a', fontWeight: 700, lineHeight: 1.4 }}>
              {log.description}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
