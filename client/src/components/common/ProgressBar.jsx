import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { formatIndianCurrency } from '../../utils/numberToWords';
import { useLanguage } from '../../context/LanguageContext';

export default function ProgressBar({
  totalExpenses,
  budgetTotal,
  usedPercentage,
  remainingPercentage
}) {
  const { t } = useLanguage();

  let barVariant = 'normal';
  if (usedPercentage > 85) barVariant = 'danger';
  else if (usedPercentage > 60) barVariant = 'warning';

  return (
    <div className="progress-card">
      <div className="progress-header">
        <div className="progress-title-wrap">
          <ShieldCheck size={18} color="#059669" />
          <span>{t('budgetProgressTitle')}</span>
        </div>
        <div className="progress-metrics-badge">
          {t('budgetLimit')} {usedPercentage}% {t('budgetUsed')} | {t('budgetRemaining')}: {remainingPercentage}%
        </div>
      </div>

      <div className="progress-track">
        <div
          className={`progress-bar-fill ${barVariant}`}
          style={{ width: `${Math.min(100, Math.max(0, usedPercentage))}%` }}
        ></div>
      </div>

      <div className="progress-footer">
        <span>₹ 0</span>
        <span>{t('totalCollectionLabel')} {formatIndianCurrency(totalExpenses)}</span>
        <span>{t('budgetCeilingLabel')} {formatIndianCurrency(budgetTotal)}</span>
      </div>
    </div>
  );
}
