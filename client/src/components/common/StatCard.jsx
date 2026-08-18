import React from 'react';
import { formatIndianCurrency } from '../../utils/numberToWords';

export default function StatCard({
  title,
  amount,
  countText,
  highlightText,
  highlightColor = 'green',
  icon: Icon,
  iconColor = 'green',
  onClickLink,
  linkText
}) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        {Icon && (
          <div className={`stat-card-icon-box ${iconColor}`}>
            <Icon size={16} />
          </div>
        )}
      </div>

      <div className={`stat-card-amount ${iconColor}`}>
        {formatIndianCurrency(amount)}
      </div>

      <div className="stat-card-footer">
        <span>{countText}</span>
        {linkText && onClickLink ? (
          <button
            onClick={onClickLink}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              font: 'inherit',
              fontWeight: 700,
              textDecoration: 'underline'
            }}
          >
            {linkText}
          </button>
        ) : (
          highlightText && (
            <span className={`stat-highlight-tag ${highlightColor}`}>
              {highlightText}
            </span>
          )
        )}
      </div>
    </div>
  );
}
