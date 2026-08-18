import React from 'react';
import { Medal } from 'lucide-react';
import { formatIndianCurrency } from '../../utils/numberToWords';
import { useLanguage } from '../../context/LanguageContext';

export default function LeaderboardCard({ leaderboard }) {
  const { t } = useLanguage();

  return (
    <div className="section-card">
      <div className="section-header-row">
        <div className="section-title">
          <Medal size={18} color="#d97706" />
          <span>{t('leaderboardTitle')}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
        {leaderboard.map((item, index) => {
          const rank = index + 1;
          const isFirst = rank === 1;

          return (
            <div
              key={item.id}
              style={{
                backgroundColor: isFirst ? '#fffbeb' : '#ffffff',
                border: `1.5px solid ${isFirst ? '#fde68a' : '#e2e8f0'}`,
                borderRadius: '12px',
                padding: '12px 14px',
                boxShadow: isFirst ? '0 4px 6px -1px rgba(245, 158, 11, 0.1)' : 'var(--shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      backgroundColor: isFirst ? '#f59e0b' : '#94a3b8',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 900,
                      padding: '2px 8px',
                      borderRadius: '9999px'
                    }}
                  >
                    #{rank}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                    {item.name} {item.name_mr ? `(${item.name_mr})` : ''}
                  </span>
                </div>
                <span
                  style={{
                    backgroundColor: isFirst ? '#fef3c7' : '#f1f5f9',
                    color: isFirst ? '#92400e' : '#475569',
                    fontSize: '9.5px',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}
                >
                  {item.role === 'ADMIN' ? 'अध्यक्ष' : 'कार्यकारी'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b' }}>
                <div>
                  <span>{t('receiptsGivenLabel')} </span>
                  <strong style={{ color: '#0f172a' }}>{item.receipt_count} पावत्या</strong>
                </div>
                <div>
                  <span>{t('totalCollectionMember')} </span>
                  <strong style={{ color: '#059669', fontSize: '13px' }}>
                    {formatIndianCurrency(item.total_collected)}
                  </strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
