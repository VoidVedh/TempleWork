import React, { useState, useEffect } from 'react';
import { UserPlus, Check } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { apiRequest } from '../../utils/api';
import Modal from '../common/Modal';

export default function AddMemberModal({ isOpen, onClose, editingMember, onMemberSaved }) {
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [nameMr, setNameMr] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [canChangePaymentStatus, setCanChangePaymentStatus] = useState(false);
  const [canManageExpenses, setCanManageExpenses] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingMember) {
      setName(editingMember.name || '');
      setNameMr(editingMember.name_mr || '');
      setMobile(editingMember.mobile || '');
      setPassword('');
      setRole(editingMember.role || 'MEMBER');
      setCanChangePaymentStatus(!!editingMember.can_change_payment_status);
      setCanManageExpenses(!!editingMember.can_manage_expenses);
      setIsActive(editingMember.is_active !== undefined ? !!editingMember.is_active : true);
    } else {
      setName('');
      setNameMr('');
      setMobile('');
      setPassword('');
      setRole('MEMBER');
      setCanChangePaymentStatus(false);
      setCanManageExpenses(false);
      setIsActive(true);
    }
    setError('');
  }, [editingMember, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !mobile) {
      setError('नाव आणि मोबाईल नंबर आवश्यक आहेत.');
      return;
    }

    if (!editingMember && !password) {
      setError('नवीन सदस्यासाठी पासवर्ड आवश्यक आहे.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const payload = {
        name,
        name_mr: nameMr || name,
        mobile,
        password: password || undefined,
        role,
        can_change_payment_status: canChangePaymentStatus,
        can_manage_expenses: canManageExpenses,
        is_active: isActive
      };

      let res;
      if (editingMember) {
        res = await apiRequest(`/members/${editingMember.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        res = await apiRequest('/members', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      if (onMemberSaved) {
        onMemberSaved(res.member);
      }
      onClose();
    } catch (err) {
      console.error('Save member error:', err);
      setError(err.message || 'सदस्य सेव्ह करताना त्रुटी आली.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingMember ? 'सदस्य माहिती संपादित करा' : t('addMemberTitle')}
      icon={UserPlus}
      maxWidth="480px"
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '8px 12px', borderRadius: '8px', fontSize: '11.5px', marginBottom: '12px', fontWeight: 700 }}>
            {error}
          </div>
        )}

        {/* 1. Name */}
        <div className="form-group">
          <label className="form-label">
            {t('memberNameField')} <span className="required-star">*</span>
          </label>
          <input
            type="text"
            className="form-input no-icon"
            placeholder="उदा. शुभम पाटील"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            id="input-member-name"
          />
        </div>

        {/* 2. Mobile */}
        <div className="form-group">
          <label className="form-label">
            {t('memberMobileField')} <span className="required-star">*</span>
          </label>
          <input
            type="tel"
            maxLength={10}
            className="form-input no-icon"
            placeholder="8862043198"
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
            disabled={!!editingMember}
            required
            id="input-member-mobile"
          />
        </div>

        {/* 3. Password */}
        <div className="form-group">
          <label className="form-label">
            {t('memberPasswordField')} {editingMember ? '(बदलायचा असल्यास टाका)' : <span className="required-star">*</span>}
          </label>
          <input
            type="text"
            className="form-input no-icon"
            placeholder={editingMember ? 'नवीन पासवर्ड टाका...' : '123456'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!editingMember}
            id="input-member-password"
          />
        </div>

        {/* 4. Role */}
        <div className="form-group">
          <label className="form-label">{t('roleField')}</label>
          <select
            className="form-select no-icon"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            id="select-member-role"
          >
            <option value="MEMBER">👤 कार्यकर्ता (Karyakarta)</option>
            <option value="ADMIN">👑 मुख्य अध्यक्ष (Admin)</option>
          </select>
        </div>

        {/* 5. Permission Checkboxes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={canChangePaymentStatus}
              onChange={(e) => setCanChangePaymentStatus(e.target.checked)}
              id="chk-perm-status"
            />
            <span>{t('permReceiptStatus')}</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={canManageExpenses}
              onChange={(e) => setCanManageExpenses(e.target.checked)}
              id="chk-perm-expenses"
            />
            <span>{t('permExpenseManage')}</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              id="chk-perm-active"
            />
            <span>{t('permActiveAccount')}</span>
          </label>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
          <button
            type="button"
            className="btn btn-outline-white"
            style={{ color: '#475569', borderColor: '#cbd5e1' }}
            onClick={onClose}
          >
            {t('cancelBtn')}
          </button>
          <button
            type="submit"
            className="btn btn-gold"
            disabled={submitting}
            id="btn-save-member"
          >
            <Check size={16} />
            <span>{submitting ? 'जतन होत आहे...' : t('saveMemberBtn')}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
