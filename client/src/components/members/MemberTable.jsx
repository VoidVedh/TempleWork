import React from 'react';
import { Shield, Edit, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function MemberTable({ members, onEditMember, onDeleteMember }) {
  const { t } = useLanguage();

  return (
    <div className="section-card">
      <div className="section-header-row">
        <div className="section-title">
          <Shield size={18} color="#b45309" />
          <span>{t('memberDirectoryTitle')}</span>
        </div>
      </div>

      <div className="table-container">
        <table className="app-table">
          <thead>
            <tr>
              <th>{t('nameCol')}</th>
              <th>{t('loginIdCol')}</th>
              <th>{t('roleCol')}</th>
              <th>{t('receiptPermCol')}</th>
              <th>{t('expensePermCol')}</th>
              <th>{t('statusCol')}</th>
              <th>{t('actionsCol')}</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>{m.name}</div>
                  <div style={{ fontSize: '10.5px', color: '#64748b' }}>({m.name_mr || m.name})</div>
                  {m.is_protected_founder === 1 && (
                    <span
                      style={{
                        display: 'inline-block',
                        backgroundColor: '#ffe4e6',
                        color: '#be123c',
                        fontSize: '9px',
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: '9999px',
                        marginTop: '3px'
                      }}
                    >
                      {t('founderProtected')}
                    </span>
                  )}
                </td>

                <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                  +91 {m.mobile}
                </td>

                <td>
                  {m.role === 'ADMIN' ? (
                    <span style={{ backgroundColor: '#fef08a', color: '#854d0e', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>
                      {t('adminRoleBadge')}
                    </span>
                  ) : (
                    <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                      {t('memberRoleBadge')}
                    </span>
                  )}
                </td>

                <td>
                  {m.can_change_payment_status === 1 ? (
                    <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>
                      {t('allowedPerm')}
                    </span>
                  ) : (
                    <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                      {t('notAllowedPerm')}
                    </span>
                  )}
                </td>

                <td>
                  {m.can_manage_expenses === 1 ? (
                    <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>
                      {t('authGranted')}
                    </span>
                  ) : (
                    <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                      {t('authNone')}
                    </span>
                  )}
                </td>

                <td>
                  {m.is_active === 1 ? (
                    <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '9999px', fontSize: '10px', fontWeight: 800 }}>
                      {t('activeStatus')}
                    </span>
                  ) : (
                    <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '9999px', fontSize: '10px', fontWeight: 700 }}>
                      {t('inactiveStatus')}
                    </span>
                  )}
                </td>

                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      className="action-icon-btn"
                      onClick={() => onEditMember(m)}
                      title="संपादित करा (Edit)"
                    >
                      <Edit size={13} />
                    </button>
                    {m.is_protected_founder !== 1 && (
                      <button
                        className="action-icon-btn delete"
                        onClick={() => onDeleteMember(m)}
                        title="हटवा (Delete)"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
