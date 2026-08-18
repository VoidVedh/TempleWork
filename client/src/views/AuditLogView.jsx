import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Search, RefreshCw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { apiRequest } from '../utils/api';
import HeroBanner from '../components/layout/HeroBanner';
import AuditList from '../components/audit/AuditList';

export default function AuditLogView() {
  const { t } = useLanguage();

  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiRequest(`/audit-logs?search=${encodeURIComponent(search)}&limit=100`);
      setLogs(res.logs || []);
    } catch (err) {
      console.error('Fetch audit logs error:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleRefresh = async () => {
    setSyncing(true);
    await fetchAuditLogs();
    setTimeout(() => setSyncing(false), 300);
  };

  return (
    <div>
      {/* 1. Hero Banner (Slate / Navy) */}
      <HeroBanner
        theme="slate"
        tag="TAMPER-PROOF AUDIT LOGGING"
        title={t('auditTitle')}
        subtitle={t('auditSub')}
        actions={
          <button
            className="btn btn-gold"
            onClick={handleRefresh}
            id="btn-refresh-audit-logs"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            <span>{t('refreshBtn')}</span>
          </button>
        }
      />

      {/* 2. Search Filter Bar */}
      <div className="section-card" style={{ padding: '10px 14px', marginBottom: '14px' }}>
        <div className="input-wrapper">
          <span className="input-icon"><Search size={16} /></span>
          <input
            type="text"
            className="form-input"
            placeholder={t('searchAuditPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="input-search-audit"
          />
        </div>
      </div>

      {/* 3. Audit Logs Stream List */}
      <AuditList logs={logs} />
    </div>
  );
}
