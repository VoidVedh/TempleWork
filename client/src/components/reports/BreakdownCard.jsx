import React from 'react';
import { formatIndianCurrency } from '../../utils/numberToWords';

export default function BreakdownCard({
  title,
  icon: Icon,
  items,
  type = 'category' // 'category' (red bar) | 'payment' (green bar)
}) {
  const isCategory = type === 'category';
  const barColor = isCategory ? '#be123c' : '#059669';

  return (
    <div className="section-card">
      <div className="section-header-row">
        <div className="section-title">
          {Icon && <Icon size={16} color={isCategory ? '#be123c' : '#059669'} />}
          <span>{title}</span>
        </div>
      </div>

      {!items || items.length === 0 ? (
        <div className="devotional-empty-box" style={{ padding: '20px 12px' }}>
          <span style={{ fontSize: '20px' }}>📊</span>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#64748b' }}>
            {isCategory ? 'अद्याप कोणत्याही खर्चाची नोंद नाही' : 'अद्याप कोणत्याही वर्गणी जमाची नोंद नाही'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {items.map((item, index) => {
            const label = item.category || item.payment_mode;
            const cleanLabel = label ? label.replace(/^[^\w\s]+/, '').trim() : 'इतर';
            const pct = item.percentage || 0;

            return (
              <div key={index}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800, marginBottom: '4px' }}>
                  <span style={{ color: '#1e293b' }}>{cleanLabel}</span>
                  <span style={{ color: isCategory ? '#be123c' : '#059669', fontFeatureSettings: 'tnum' }}>
                    {formatIndianCurrency(item.amount)} ({pct}%)
                  </span>
                </div>

                <div style={{ height: '7px', backgroundColor: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      backgroundColor: barColor,
                      width: `${Math.min(100, Math.max(2, pct))}%`,
                      borderRadius: '9999px',
                      transition: 'width 0.6s ease'
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
