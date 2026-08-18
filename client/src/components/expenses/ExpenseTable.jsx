import React from 'react';
import { Printer, Trash2, Shield, Paperclip } from 'lucide-react';
import { formatIndianCurrency } from '../../utils/numberToWords';
import { formatDate } from '../../utils/dateUtils';
import { useLanguage } from '../../context/LanguageContext';

export default function ExpenseTable({
  expenses,
  totalCount,
  totalAmount,
  onPrintVoucher,
  onDeleteExpense
}) {
  const { t } = useLanguage();

  return (
    <div className="table-container">
      <table className="app-table">
        <thead>
          <tr>
            <th>{t('voucherNoCol')}</th>
            <th>{t('expenseTitleCol')}</th>
            <th>{t('paidToCol')}</th>
            <th>{t('authCol')}</th>
            <th>{t('payMethodCol')}</th>
            <th>{t('dateCol')}</th>
            <th>{t('amountCol')}</th>
            <th>{t('actionCol')}</th>
          </tr>
        </thead>
        <tbody>
          {expenses.length === 0 ? (
            <tr>
              <td colSpan="8" style={{ padding: '30px 16px', textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                  <span style={{ fontSize: '26px' }}>🚩</span>
                  <strong style={{ fontSize: '13.5px', color: '#7f1d1d' }}>अद्याप कोणताही खर्च नोंदवलेला नाही</strong>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>नवीन खर्च नोंदवण्यासाठी '+ Record New Expense' बटनावर क्लिक करा.</span>
                </div>
              </td>
            </tr>
          ) : (
            expenses.map((exp) => (
              <tr key={exp.id}>
                <td>
                  <span className="voucher-code">{exp.voucher_no}</span>
                </td>
                <td>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>{exp.title}</div>
                  <span className="category-chip">
                    {exp.category ? exp.category.split('(')[0] : 'इतर'}
                  </span>
                  {exp.bill_attachment_url && (
                    <a
                      href={exp.bill_attachment_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ marginLeft: '4px', color: '#0284c7' }}
                      title="बिल फोटो पहा (View Attachment)"
                    >
                      <Paperclip size={12} />
                    </a>
                  )}
                </td>
                <td style={{ fontWeight: 700 }}>{exp.paid_to}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#475569' }}>
                    <Shield size={12} color="#059669" />
                    <span>{exp.authorized_by}</span>
                  </div>
                </td>
                <td>
                  <span style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                    {exp.payment_method.replace(/^[^\w\s]+/, '').trim() || exp.payment_method}
                  </span>
                </td>
                <td style={{ fontSize: '11px', color: '#64748b' }}>{formatDate(exp.expense_date)}</td>
                <td style={{ color: '#be123c', fontWeight: 900, fontSize: '13px' }}>
                  {formatIndianCurrency(exp.amount)}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      className="action-icon-btn"
                      onClick={() => onPrintVoucher(exp)}
                      title={t('printVoucher')}
                    >
                      <Printer size={13} />
                    </button>
                    <button
                      className="action-icon-btn delete"
                      onClick={() => onDeleteExpense(exp)}
                      title={t('deleteExpense')}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="table-summary-bar">
        <span>{t('totalExpCount')} {totalCount}</span>
        <span style={{ color: '#be123c' }}>{t('totalExpAmount')} {formatIndianCurrency(totalAmount)}</span>
      </div>
    </div>
  );
}
